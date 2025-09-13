-- Stored Procedures for Metrics Calculations
-- This file contains optimized PostgreSQL stored procedures for complex metrics calculations

-- Function to calculate comprehensive KPI metrics for a given date range and campaigns
CREATE OR REPLACE FUNCTION calculate_kpi_metrics(
    p_organization_id UUID,
    p_campaign_ids UUID[] DEFAULT NULL,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    revenue DECIMAL(15,2),
    ad_spend DECIMAL(15,2),
    impressions BIGINT,
    clicks BIGINT,
    conversions BIGINT,
    roas DECIMAL(10,4),
    roi DECIMAL(10,4),
    cpc DECIMAL(10,4),
    cpm DECIMAL(10,4),
    cac DECIMAL(10,4),
    ctr DECIMAL(10,4),
    conversion_rate DECIMAL(10,4),
    arpu DECIMAL(10,4),
    ltv DECIMAL(10,4),
    margin DECIMAL(10,4),
    profit DECIMAL(15,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    target_campaign_ids UUID[];
    metrics_record RECORD;
BEGIN
    -- Get campaign IDs if not provided
    IF p_campaign_ids IS NULL OR array_length(p_campaign_ids, 1) = 0 THEN
        SELECT array_agg(c.id) INTO target_campaign_ids
        FROM "Campaign" c
        WHERE c."organizationId" = p_organization_id;
    ELSE
        target_campaign_ids := p_campaign_ids;
    END IF;

    -- Return empty metrics if no campaigns found
    IF target_campaign_ids IS NULL OR array_length(target_campaign_ids, 1) = 0 THEN
        RETURN QUERY SELECT 
            0::DECIMAL(15,2), 0::DECIMAL(15,2), 0::BIGINT, 0::BIGINT, 0::BIGINT,
            0::DECIMAL(10,4), 0::DECIMAL(10,4), 0::DECIMAL(10,4), 0::DECIMAL(10,4), 0::DECIMAL(10,4),
            0::DECIMAL(10,4), 0::DECIMAL(10,4), 0::DECIMAL(10,4), 0::DECIMAL(10,4), 0::DECIMAL(10,4),
            0::DECIMAL(15,2);
        RETURN;
    END IF;

    -- Aggregate metrics from daily data
    SELECT 
        COALESCE(SUM(md.revenue), 0) as total_revenue,
        COALESCE(SUM(md."adSpend"), 0) as total_ad_spend,
        COALESCE(SUM(md.impressions), 0) as total_impressions,
        COALESCE(SUM(md.clicks), 0) as total_clicks,
        COALESCE(SUM(md.conversions), 0) as total_conversions
    INTO metrics_record
    FROM "MetricsDaily" md
    WHERE md."campaignId" = ANY(target_campaign_ids)
        AND md.date >= p_start_date
        AND md.date <= p_end_date;

    -- Calculate derived metrics with safe division
    RETURN QUERY SELECT 
        metrics_record.total_revenue,
        metrics_record.total_ad_spend,
        metrics_record.total_impressions,
        metrics_record.total_clicks,
        metrics_record.total_conversions,
        -- ROAS (Return on Ad Spend)
        CASE WHEN metrics_record.total_ad_spend > 0 
             THEN (metrics_record.total_revenue / metrics_record.total_ad_spend) * 100 
             ELSE 0 END::DECIMAL(10,4),
        -- ROI (Return on Investment)
        CASE WHEN metrics_record.total_ad_spend > 0 
             THEN ((metrics_record.total_revenue - metrics_record.total_ad_spend) / metrics_record.total_ad_spend) * 100 
             ELSE 0 END::DECIMAL(10,4),
        -- CPC (Cost Per Click)
        CASE WHEN metrics_record.total_clicks > 0 
             THEN metrics_record.total_ad_spend / metrics_record.total_clicks 
             ELSE 0 END::DECIMAL(10,4),
        -- CPM (Cost Per Mille)
        CASE WHEN metrics_record.total_impressions > 0 
             THEN (metrics_record.total_ad_spend / metrics_record.total_impressions) * 1000 
             ELSE 0 END::DECIMAL(10,4),
        -- CAC (Customer Acquisition Cost)
        CASE WHEN metrics_record.total_conversions > 0 
             THEN metrics_record.total_ad_spend / metrics_record.total_conversions 
             ELSE 0 END::DECIMAL(10,4),
        -- CTR (Click Through Rate)
        CASE WHEN metrics_record.total_impressions > 0 
             THEN (metrics_record.total_clicks::DECIMAL / metrics_record.total_impressions) * 100 
             ELSE 0 END::DECIMAL(10,4),
        -- Conversion Rate
        CASE WHEN metrics_record.total_clicks > 0 
             THEN (metrics_record.total_conversions::DECIMAL / metrics_record.total_clicks) * 100 
             ELSE 0 END::DECIMAL(10,4),
        -- ARPU (Average Revenue Per User)
        CASE WHEN metrics_record.total_conversions > 0 
             THEN metrics_record.total_revenue / metrics_record.total_conversions 
             ELSE 0 END::DECIMAL(10,4),
        -- LTV (Lifetime Value) - simplified as 2.5x ARPU
        CASE WHEN metrics_record.total_conversions > 0 
             THEN (metrics_record.total_revenue / metrics_record.total_conversions) * 2.5 
             ELSE 0 END::DECIMAL(10,4),
        -- Margin
        CASE WHEN metrics_record.total_revenue > 0 
             THEN ((metrics_record.total_revenue - metrics_record.total_ad_spend) / metrics_record.total_revenue) * 100 
             ELSE 0 END::DECIMAL(10,4),
        -- Profit
        (metrics_record.total_revenue - metrics_record.total_ad_spend)::DECIMAL(15,2);
END;
$$;

-- Function to get top performing campaigns by revenue
CREATE OR REPLACE FUNCTION get_top_campaigns(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name VARCHAR,
    revenue DECIMAL(15,2),
    ad_spend DECIMAL(15,2),
    roas DECIMAL(10,4),
    conversions BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        COALESCE(SUM(md.revenue), 0) as total_revenue,
        COALESCE(SUM(md."adSpend"), 0) as total_ad_spend,
        CASE WHEN SUM(md."adSpend") > 0 
             THEN (SUM(md.revenue) / SUM(md."adSpend")) * 100 
             ELSE 0 END::DECIMAL(10,4) as campaign_roas,
        COALESCE(SUM(md.conversions), 0) as total_conversions
    FROM "Campaign" c
    LEFT JOIN "MetricsDaily" md ON c.id = md."campaignId" 
        AND md.date >= p_start_date 
        AND md.date <= p_end_date
    WHERE c."organizationId" = p_organization_id
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
    LIMIT p_limit;
END;
$$;

-- Function to calculate funnel conversion rates
CREATE OR REPLACE FUNCTION calculate_funnel_metrics(
    p_campaign_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    stage_name VARCHAR,
    stage_order INTEGER,
    users BIGINT,
    conversion_rate DECIMAL(10,4),
    dropoff_rate DECIMAL(10,4)
)
LANGUAGE plpgsql
AS $$
DECLARE
    prev_users BIGINT := 0;
    stage_record RECORD;
BEGIN
    -- Get funnel stages ordered by stage order
    FOR stage_record IN
        SELECT 
            fs."stageName",
            fs."stageOrder",
            SUM(fs.users) as total_users
        FROM "FunnelStage" fs
        WHERE fs."campaignId" = p_campaign_id
            AND fs.date >= p_start_date
            AND fs.date <= p_end_date
        GROUP BY fs."stageName", fs."stageOrder"
        ORDER BY fs."stageOrder"
    LOOP
        RETURN QUERY SELECT 
            stage_record."stageName",
            stage_record."stageOrder",
            stage_record.total_users,
            CASE 
                WHEN stage_record."stageOrder" = 1 THEN 100::DECIMAL(10,4)
                WHEN prev_users > 0 THEN (stage_record.total_users::DECIMAL / prev_users) * 100
                ELSE 0::DECIMAL(10,4)
            END as conv_rate,
            CASE 
                WHEN stage_record."stageOrder" = 1 THEN 0::DECIMAL(10,4)
                WHEN prev_users > 0 THEN 100 - ((stage_record.total_users::DECIMAL / prev_users) * 100)
                ELSE 100::DECIMAL(10,4)
            END as drop_rate;
        
        prev_users := stage_record.total_users;
    END LOOP;
END;
$$;

-- Function to aggregate hourly metrics into daily metrics
CREATE OR REPLACE FUNCTION aggregate_hourly_to_daily(
    p_target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    processed_count INTEGER := 0;
BEGIN
    -- Insert or update daily metrics from hourly data
    INSERT INTO "MetricsDaily" (
        "campaignId",
        date,
        impressions,
        clicks,
        conversions,
        revenue,
        "adSpend",
        "createdAt",
        "updatedAt"
    )
    SELECT 
        mh."campaignId",
        p_target_date,
        SUM(mh.impressions),
        SUM(mh.clicks),
        SUM(mh.conversions),
        SUM(mh.revenue),
        SUM(mh."adSpend"),
        NOW(),
        NOW()
    FROM "MetricsHourly" mh
    WHERE DATE(mh.hour) = p_target_date
    GROUP BY mh."campaignId"
    ON CONFLICT ("campaignId", date)
    DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        conversions = EXCLUDED.conversions,
        revenue = EXCLUDED.revenue,
        "adSpend" = EXCLUDED."adSpend",
        "updatedAt" = NOW();
    
    GET DIAGNOSTICS processed_count = ROW_COUNT;
    
    RETURN processed_count;
END;
$$;

-- Function to clean old metrics data
CREATE OR REPLACE FUNCTION cleanup_old_metrics(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '1 day' * p_retention_days;
    
    -- Delete old hourly metrics (keep only last 7 days)
    DELETE FROM "MetricsHourly" 
    WHERE DATE(hour) < CURRENT_DATE - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old conversion events (keep based on retention policy)
    DELETE FROM "ConversionEvent" 
    WHERE DATE("createdAt") < cutoff_date;
    
    -- Delete old funnel stages (keep based on retention policy)
    DELETE FROM "FunnelStage" 
    WHERE date < cutoff_date;
    
    RETURN deleted_count;
END;
$$;

-- Function to calculate real-time dashboard metrics
CREATE OR REPLACE FUNCTION get_realtime_dashboard(
    p_organization_id UUID,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_impressions BIGINT,
    total_clicks BIGINT,
    total_conversions BIGINT,
    total_revenue DECIMAL(15,2),
    total_ad_spend DECIMAL(15,2),
    avg_ctr DECIMAL(10,4),
    avg_conversion_rate DECIMAL(10,4),
    current_roas DECIMAL(10,4)
)
LANGUAGE plpgsql
AS $$
DECLARE
    cutoff_time TIMESTAMP;
BEGIN
    cutoff_time := NOW() - INTERVAL '1 hour' * p_hours_back;
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(mh.impressions), 0) as impressions,
        COALESCE(SUM(mh.clicks), 0) as clicks,
        COALESCE(SUM(mh.conversions), 0) as conversions,
        COALESCE(SUM(mh.revenue), 0) as revenue,
        COALESCE(SUM(mh."adSpend"), 0) as ad_spend,
        CASE WHEN SUM(mh.impressions) > 0 
             THEN (SUM(mh.clicks)::DECIMAL / SUM(mh.impressions)) * 100 
             ELSE 0 END::DECIMAL(10,4) as ctr,
        CASE WHEN SUM(mh.clicks) > 0 
             THEN (SUM(mh.conversions)::DECIMAL / SUM(mh.clicks)) * 100 
             ELSE 0 END::DECIMAL(10,4) as conv_rate,
        CASE WHEN SUM(mh."adSpend") > 0 
             THEN (SUM(mh.revenue) / SUM(mh."adSpend")) * 100 
             ELSE 0 END::DECIMAL(10,4) as roas
    FROM "MetricsHourly" mh
    JOIN "Campaign" c ON mh."campaignId" = c.id
    WHERE c."organizationId" = p_organization_id
        AND mh.hour >= cutoff_time;
END;
$$;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_daily_campaign_date 
    ON "MetricsDaily" ("campaignId", date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_hourly_campaign_hour 
    ON "MetricsHourly" ("campaignId", hour);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversion_event_campaign_created 
    ON "ConversionEvent" ("campaignId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnel_stage_campaign_date 
    ON "FunnelStage" ("campaignId", date);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_kpi_metrics TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_top_campaigns TO PUBLIC;
GRANT EXECUTE ON FUNCTION calculate_funnel_metrics TO PUBLIC;
GRANT EXECUTE ON FUNCTION aggregate_hourly_to_daily TO PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_metrics TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_realtime_dashboard TO PUBLIC;