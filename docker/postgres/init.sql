-- Configurações iniciais do PostgreSQL para Utmify
-- Este arquivo é executado automaticamente na inicialização do container

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Configurar timezone padrão
SET timezone = 'UTC';

-- Criar tipos ENUM
CREATE TYPE user_role_enum AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE plan_type_enum AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE campaign_platform_enum AS ENUM ('google_ads', 'facebook_ads', 'linkedin_ads', 'twitter_ads', 'tiktok_ads', 'snapchat_ads');
CREATE TYPE campaign_status_enum AS ENUM ('active', 'paused', 'ended', 'draft');
CREATE TYPE budget_type_enum AS ENUM ('daily', 'lifetime');
CREATE TYPE sync_status_enum AS ENUM ('pending', 'syncing', 'completed', 'failed');
CREATE TYPE webhook_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');

-- Configurar Row Level Security (RLS) para multi-tenancy
ALTER DATABASE utmify SET row_security = on;

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Comentário de inicialização
COMMENT ON DATABASE utmify IS 'Utmify SaaS - Marketing Analytics Platform Database';