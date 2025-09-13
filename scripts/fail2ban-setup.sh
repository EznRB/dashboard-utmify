#!/bin/bash

# Utmify Fail2Ban Setup Script
# This script configures fail2ban for comprehensive protection against brute force attacks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

# Configuration variables
SSH_PORT=${SSH_PORT:-22}
HTTP_PORT=${HTTP_PORT:-80}
HTTPS_PORT=${HTTPS_PORT:-443}
API_PORT=${API_PORT:-3001}
WEB_PORT=${WEB_PORT:-3000}

# Email configuration for notifications
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@utmify.com"}
SMTP_HOST=${SMTP_HOST:-"localhost"}
SMTP_PORT=${SMTP_PORT:-"587"}
SMTP_USER=${SMTP_USER:-""}
SMTP_PASS=${SMTP_PASS:-""}

# Ban settings
DEFAULT_BAN_TIME=${DEFAULT_BAN_TIME:-"3600"}     # 1 hour
DEFAULT_FIND_TIME=${DEFAULT_FIND_TIME:-"600"}    # 10 minutes
DEFAULT_MAX_RETRY=${DEFAULT_MAX_RETRY:-"5"}       # 5 attempts

log "Starting Fail2Ban setup for Utmify..."

# Install fail2ban if not present
if ! command -v fail2ban-server &> /dev/null; then
    log "Installing fail2ban..."
    apt-get update
    apt-get install -y fail2ban
fi

# Create log directories
log "Creating log directories..."
mkdir -p /var/log/utmify/api
mkdir -p /var/log/utmify/web
mkdir -p /var/log/utmify/auth
mkdir -p /var/log/utmify/security
mkdir -p /var/log/fail2ban

# Set proper permissions
chown -R www-data:www-data /var/log/utmify
chmod -R 755 /var/log/utmify

# Backup original configuration
if [[ -f /etc/fail2ban/jail.conf ]]; then
    cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.conf.backup.$(date +%Y%m%d)
fi

# Create main jail configuration
log "Creating main jail configuration..."
cat > /etc/fail2ban/jail.local << EOF
# Utmify Fail2Ban Configuration
# Generated on $(date)

[DEFAULT]
# Ban settings
bantime = $DEFAULT_BAN_TIME
findtime = $DEFAULT_FIND_TIME
maxretry = $DEFAULT_MAX_RETRY

# Backend for log file monitoring
backend = auto

# Email notifications
destemail = $ADMIN_EMAIL
sender = fail2ban@utmify.com
mta = sendmail
action = %(action_mwl)s

# Ignore local IPs
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

# Log level
loglevel = INFO
logtarget = /var/log/fail2ban/fail2ban.log

# Database backend (optional)
# dbfile = /var/lib/fail2ban/fail2ban.sqlite3
# dbpurgeage = 86400

#
# SSH Protection
#
[sshd]
enabled = true
port = $SSH_PORT
protocol = tcp
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
findtime = 600

[sshd-ddos]
enabled = true
port = $SSH_PORT
protocol = tcp
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 2
bantime = 7200
findtime = 120

#
# HTTP/HTTPS Protection
#
[nginx-http-auth]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
findtime = 600

[nginx-limit-req]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 1800
findtime = 300

[nginx-badbots]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
findtime = 3600

[nginx-noscript]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 86400
findtime = 3600

[nginx-noproxy]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = nginx-noproxy
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
findtime = 3600

#
# Utmify Application Protection
#
[utmify-auth]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT,$API_PORT
protocol = tcp
filter = utmify-auth
logpath = /var/log/utmify/auth/auth.log
maxretry = 5
bantime = 3600
findtime = 600
action = %(action_mwl)s

[utmify-api-abuse]
enabled = true
port = $API_PORT
protocol = tcp
filter = utmify-api-abuse
logpath = /var/log/utmify/api/access.log
maxretry = 50
bantime = 1800
findtime = 300

[utmify-registration-spam]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT,$API_PORT
protocol = tcp
filter = utmify-registration-spam
logpath = /var/log/utmify/auth/registration.log
maxretry = 3
bantime = 7200
findtime = 3600

[utmify-password-reset-abuse]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT,$API_PORT
protocol = tcp
filter = utmify-password-reset
logpath = /var/log/utmify/auth/password-reset.log
maxretry = 3
bantime = 3600
findtime = 3600

[utmify-suspicious-activity]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT,$API_PORT
protocol = tcp
filter = utmify-suspicious
logpath = /var/log/utmify/security/suspicious.log
maxretry = 1
bantime = 86400
findtime = 300

#
# Database Protection
#
[postgresql]
enabled = false
port = 5432
protocol = tcp
filter = postgresql
logpath = /var/log/postgresql/postgresql-*.log
maxretry = 3
bantime = 3600
findtime = 600

#
# Additional Security
#
[recidive]
enabled = true
filter = recidive
logpath = /var/log/fail2ban/fail2ban.log
action = %(action_mwl)s
bantime = 604800  # 1 week
findtime = 86400  # 1 day
maxretry = 5

[apache-shellshock]
enabled = false
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = apache-shellshock
logpath = /var/log/nginx/access.log
maxretry = 1
bantime = 86400
findtime = 3600
EOF

# Create custom filters
log "Creating custom filters..."

# Utmify authentication filter
cat > /etc/fail2ban/filter.d/utmify-auth.conf << 'EOF'
# Fail2Ban filter for Utmify authentication failures
[Definition]
failregex = ^.*"ip":"<HOST>".*"event":"AUTH_FAILED".*$
            ^.*"ip":"<HOST>".*"event":"LOGIN_FAILED".*$
            ^.*"ip":"<HOST>".*"event":"INVALID_TOKEN".*$
            ^.*"ip":"<HOST>".*"event":"BRUTE_FORCE_ATTEMPT".*$
            ^.*"ip":"<HOST>".*"status":401.*"path":"/auth/.*$
            ^.*"ip":"<HOST>".*"status":403.*"path":"/auth/.*$

ignoreregex = ^.*"ip":"<HOST>".*"event":"AUTH_SUCCESS".*$
              ^.*"ip":"<HOST>".*"status":200.*"path":"/auth/.*$
EOF

# Utmify API abuse filter
cat > /etc/fail2ban/filter.d/utmify-api-abuse.conf << 'EOF'
# Fail2Ban filter for Utmify API abuse
[Definition]
failregex = ^.*"ip":"<HOST>".*"status":(4[0-9]{2}|5[0-9]{2}).*"path":"/api/.*$
            ^.*"ip":"<HOST>".*"event":"RATE_LIMIT_EXCEEDED".*$
            ^.*"ip":"<HOST>".*"event":"API_ABUSE".*$
            ^.*"ip":"<HOST>".*"event":"INVALID_API_KEY".*$

ignoreregex = ^.*"ip":"<HOST>".*"status":(200|201|204|301|302|304).*$
              ^.*"ip":"<HOST>".*"path":"/api/health".*$
              ^.*"ip":"<HOST>".*"path":"/api/status".*$
EOF

# Utmify registration spam filter
cat > /etc/fail2ban/filter.d/utmify-registration-spam.conf << 'EOF'
# Fail2Ban filter for Utmify registration spam
[Definition]
failregex = ^.*"ip":"<HOST>".*"event":"REGISTRATION_SPAM".*$
            ^.*"ip":"<HOST>".*"event":"MULTIPLE_REGISTRATIONS".*$
            ^.*"ip":"<HOST>".*"event":"FAKE_EMAIL_REGISTRATION".*$
            ^.*"ip":"<HOST>".*"path":"/auth/register".*"status":429.*$

ignoreregex = ^.*"ip":"<HOST>".*"event":"REGISTRATION_SUCCESS".*$
EOF

# Utmify password reset abuse filter
cat > /etc/fail2ban/filter.d/utmify-password-reset.conf << 'EOF'
# Fail2Ban filter for Utmify password reset abuse
[Definition]
failregex = ^.*"ip":"<HOST>".*"event":"PASSWORD_RESET_ABUSE".*$
            ^.*"ip":"<HOST>".*"event":"MULTIPLE_RESET_REQUESTS".*$
            ^.*"ip":"<HOST>".*"path":"/auth/password/reset".*"status":429.*$
            ^.*"ip":"<HOST>".*"path":"/auth/forgot-password".*"status":429.*$

ignoreregex = ^.*"ip":"<HOST>".*"event":"PASSWORD_RESET_SUCCESS".*$
EOF

# Utmify suspicious activity filter
cat > /etc/fail2ban/filter.d/utmify-suspicious.conf << 'EOF'
# Fail2Ban filter for Utmify suspicious activities
[Definition]
failregex = ^.*"ip":"<HOST>".*"event":"SUSPICIOUS_REQUEST".*$
            ^.*"ip":"<HOST>".*"event":"SQL_INJECTION_ATTEMPT".*$
            ^.*"ip":"<HOST>".*"event":"XSS_ATTEMPT".*$
            ^.*"ip":"<HOST>".*"event":"PATH_TRAVERSAL_ATTEMPT".*$
            ^.*"ip":"<HOST>".*"event":"MALICIOUS_USER_AGENT".*$
            ^.*"ip":"<HOST>".*"event":"SCANNER_DETECTED".*$
            ^.*"ip":"<HOST>".*"event":"BOT_DETECTED".*$

ignoreregex =
EOF

# Enhanced nginx badbots filter
cat > /etc/fail2ban/filter.d/nginx-badbots.conf << 'EOF'
# Fail2Ban filter for nginx bad bots
[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*HTTP.*" (404|444) .*".*".*"(.*bot.*|.*crawler.*|.*spider.*|.*scraper.*|.*scanner.*|.*harvester.*|.*extractor.*|.*copier.*|.*collector.*|.*ripper.*|.*sucker.*|.*ninja.*|.*clshttp.*|.*emailcollector.*|.*emailsiphon.*|.*emailwolf.*|.*extractorpro.*|.*fairad.*|.*flaming.*|.*frontpage.*|.*getright.*|.*getweb.*|.*go-ahead-got.*|.*go!zilla.*|.*grab.*|.*grafula.*|.*harvest.*|.*hloader.*|.*hmview.*|.*httplib.*|.*httrack.*|.*ia_archiver.*|.*internetdownloadmanager.*|.*internetexplorer.*|.*jetcar.*|.*larbin.*|.*leechftp.*|.*libwww.*|.*linkextractorpro.*|.*linkscan.*|.*linkwalker.*|.*lwp-trivial.*|.*mata.hari.*|.*midown.*|.*mister.pix.*|.*navroad.*|.*nearsite.*|.*netants.*|.*netspider.*|.*net.vampire.*|.*netzip.*|.*octopus.*|.*offline.explorer.*|.*pagegrabber.*|.*papa.foto.*|.*pavuk.*|.*pcbrowser.*|.*reget.*|.*repomonkey.*|.*rma.*|.*sitesnagger.*|.*smartdownload.*|.*superbot.*|.*superhttp.*|.*surfbot.*|.*thenomad.*|.*totalhtmlconverter.*|.*turingos.*|.*turnit.*|.*vampire.*|.*vci.*|.*voideye.*|.*webauto.*|.*webbandit.*|.*webcapture.*|.*webcopier.*|.*webenhancer.*|.*webfetch.*|.*webgo.*|.*webleacher.*|.*webmasterworldforumbot.*|.*webreaper.*|.*websauger.*|.*website.quester.*|.*webstripper.*|.*webwhacker.*|.*webzip.*|.*wget.*|.*widow.*|.*wwwoffle.*|.*xaldon.*|.*xxxyy.*|.*yamanalab-robot.*|.*yandex.*|.*zeus.*|.*zyborg.*)"$
            ^<HOST> -.*"(GET|POST|HEAD).*HTTP.*" (200|301|302) .*".*".*"(.*sqlmap.*|.*nikto.*|.*nessus.*|.*openvas.*|.*vega.*|.*burp.*|.*w3af.*|.*acunetix.*|.*netsparker.*|.*skipfish.*|.*dirb.*|.*dirbuster.*|.*gobuster.*|.*wfuzz.*|.*ffuf.*|.*hydra.*|.*medusa.*|.*brutespray.*|.*patator.*|.*thc-hydra.*|.*john.*|.*hashcat.*|.*aircrack.*|.*metasploit.*|.*msfconsole.*|.*exploit.*|.*payload.*|.*shell.*|.*backdoor.*|.*trojan.*|.*virus.*|.*malware.*|.*ransomware.*)"$

ignoreregex =
EOF

# Create custom actions
log "Creating custom actions..."

# Slack notification action
cat > /etc/fail2ban/action.d/slack-notify.conf << 'EOF'
# Fail2Ban Slack notification action
[Definition]
actionstart = 
actionstop = 
actioncheck = 
actionban = curl -X POST -H 'Content-type: application/json' --data '{"text":"🚨 **Fail2Ban Alert** 🚨\n**Host:** `<ip>`\n**Jail:** `<name>`\n**Action:** Banned\n**Time:** `<time>`\n**Failures:** `<failures>`"}' <slack_webhook_url>
actionunban = curl -X POST -H 'Content-type: application/json' --data '{"text":"✅ **Fail2Ban Alert** ✅\n**Host:** `<ip>`\n**Jail:** `<name>`\n**Action:** Unbanned\n**Time:** `<time>`"}' <slack_webhook_url>

[Init]
slack_webhook_url = https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EOF

# Discord notification action
cat > /etc/fail2ban/action.d/discord-notify.conf << 'EOF'
# Fail2Ban Discord notification action
[Definition]
actionstart = 
actionstop = 
actioncheck = 
actionban = curl -H "Content-Type: application/json" -X POST -d '{"content":"🚨 **Fail2Ban Alert** 🚨\n**Host:** `<ip>`\n**Jail:** `<name>`\n**Action:** Banned\n**Time:** `<time>`\n**Failures:** `<failures>`"}' <discord_webhook_url>
actionunban = curl -H "Content-Type: application/json" -X POST -d '{"content":"✅ **Fail2Ban Alert** ✅\n**Host:** `<ip>`\n**Jail:** `<name>`\n**Action:** Unbanned\n**Time:** `<time>`"}' <discord_webhook_url>

[Init]
discord_webhook_url = https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
EOF

# Telegram notification action
cat > /etc/fail2ban/action.d/telegram-notify.conf << 'EOF'
# Fail2Ban Telegram notification action
[Definition]
actionstart = 
actionstop = 
actioncheck = 
actionban = curl -s -X POST "https://api.telegram.org/bot<bot_token>/sendMessage" -d "chat_id=<chat_id>&text=🚨 Fail2Ban Alert 🚨%0AHost: <ip>%0AJail: <name>%0AAction: Banned%0ATime: <time>%0AFailures: <failures>"
actionunban = curl -s -X POST "https://api.telegram.org/bot<bot_token>/sendMessage" -d "chat_id=<chat_id>&text=✅ Fail2Ban Alert ✅%0AHost: <ip>%0AJail: <name>%0AAction: Unbanned%0ATime: <time>"

[Init]
bot_token = YOUR_BOT_TOKEN
chat_id = YOUR_CHAT_ID
EOF

# Create fail2ban management script
log "Creating fail2ban management script..."
cat > /usr/local/bin/utmify-fail2ban << 'EOF'
#!/bin/bash

# Utmify Fail2Ban Management Script

case "$1" in
    status)
        echo "Fail2Ban Status:"
        fail2ban-client status
        echo ""
        echo "Active jails:"
        for jail in $(fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list://g' | sed 's/,//g'); do
            echo "=== $jail ==="
            fail2ban-client status $jail
            echo ""
        done
        ;;
    ban)
        if [[ -z "$2" || -z "$3" ]]; then
            echo "Usage: $0 ban <jail> <ip_address>"
            exit 1
        fi
        fail2ban-client set $2 banip $3
        echo "Banned IP $3 in jail $2"
        ;;
    unban)
        if [[ -z "$2" || -z "$3" ]]; then
            echo "Usage: $0 unban <jail> <ip_address>"
            exit 1
        fi
        fail2ban-client set $2 unbanip $3
        echo "Unbanned IP $3 from jail $2"
        ;;
    unban-all)
        if [[ -z "$2" ]]; then
            echo "Usage: $0 unban-all <ip_address>"
            exit 1
        fi
        for jail in $(fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list://g' | sed 's/,//g'); do
            fail2ban-client set $jail unbanip $2 2>/dev/null || true
        done
        echo "Unbanned IP $2 from all jails"
        ;;
    logs)
        echo "Recent fail2ban logs:"
        tail -n 50 /var/log/fail2ban/fail2ban.log
        ;;
    stats)
        echo "Fail2Ban Statistics:"
        echo "Total bans today: $(grep "$(date +%Y-%m-%d)" /var/log/fail2ban/fail2ban.log | grep -c "Ban")"
        echo "Total unbans today: $(grep "$(date +%Y-%m-%d)" /var/log/fail2ban/fail2ban.log | grep -c "Unban")"
        echo ""
        echo "Top banned IPs today:"
        grep "$(date +%Y-%m-%d)" /var/log/fail2ban/fail2ban.log | grep "Ban" | awk '{print $NF}' | sort | uniq -c | sort -nr | head -10
        ;;
    test)
        echo "Testing fail2ban configuration..."
        fail2ban-client -t
        echo "Configuration test completed."
        ;;
    reload)
        echo "Reloading fail2ban..."
        systemctl reload fail2ban
        echo "Fail2ban reloaded."
        ;;
    restart)
        echo "Restarting fail2ban..."
        systemctl restart fail2ban
        echo "Fail2ban restarted."
        ;;
    whitelist)
        if [[ -z "$2" ]]; then
            echo "Usage: $0 whitelist <ip_address>"
            exit 1
        fi
        # Add IP to ignore list in jail.local
        sed -i "/^ignoreip = /s/$/ $2/" /etc/fail2ban/jail.local
        systemctl reload fail2ban
        echo "Added $2 to whitelist and reloaded fail2ban"
        ;;
    *)
        echo "Usage: $0 {status|ban|unban|unban-all|logs|stats|test|reload|restart|whitelist}"
        echo ""
        echo "Commands:"
        echo "  status           - Show fail2ban and jail status"
        echo "  ban <jail> <ip>  - Ban an IP in a specific jail"
        echo "  unban <jail> <ip>- Unban an IP from a specific jail"
        echo "  unban-all <ip>   - Unban an IP from all jails"
        echo "  logs             - Show recent fail2ban logs"
        echo "  stats            - Show ban/unban statistics"
        echo "  test             - Test configuration"
        echo "  reload           - Reload fail2ban"
        echo "  restart          - Restart fail2ban"
        echo "  whitelist <ip>   - Add IP to whitelist"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/utmify-fail2ban

# Create log rotation configuration
log "Creating log rotation configuration..."
cat > /etc/logrotate.d/utmify-fail2ban << 'EOF'
/var/log/fail2ban/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 root adm
    postrotate
        systemctl reload fail2ban > /dev/null 2>&1 || true
    endscript
}

/var/log/utmify/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
        systemctl reload utmify-api > /dev/null 2>&1 || true
    endscript
}
EOF

# Create monitoring script
log "Creating fail2ban monitoring script..."
cat > /usr/local/bin/utmify-fail2ban-monitor << 'EOF'
#!/bin/bash

# Monitor fail2ban for high activity and send alerts
LOG_FILE="/var/log/utmify/security/fail2ban-monitor.log"
ALERT_THRESHOLD=20
CHECK_INTERVAL=300  # 5 minutes

mkdir -p "$(dirname "$LOG_FILE")"

while true; do
    # Count bans in the last 5 minutes
    BAN_COUNT=$(grep "$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M')" /var/log/fail2ban/fail2ban.log 2>/dev/null | grep "Ban" | wc -l)
    
    if [[ $BAN_COUNT -gt $ALERT_THRESHOLD ]]; then
        echo "$(date): HIGH ALERT - $BAN_COUNT bans in the last 5 minutes" >> "$LOG_FILE"
        
        # Get top attacking IPs
        TOP_IPS=$(grep "$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M')" /var/log/fail2ban/fail2ban.log 2>/dev/null | grep "Ban" | awk '{print $NF}' | sort | uniq -c | sort -nr | head -5)
        
        # Send alert (customize this for your notification system)
        if command -v mail &> /dev/null; then
            echo "High number of fail2ban bans detected: $BAN_COUNT\n\nTop attacking IPs:\n$TOP_IPS" | mail -s "Utmify Fail2Ban Alert" admin@utmify.com
        fi
        
        # Log to syslog
        logger -t utmify-fail2ban "HIGH ALERT: $BAN_COUNT bans in 5 minutes"
    fi
    
    sleep $CHECK_INTERVAL
done
EOF

chmod +x /usr/local/bin/utmify-fail2ban-monitor

# Create systemd service for monitoring
cat > /etc/systemd/system/utmify-fail2ban-monitor.service << EOF
[Unit]
Description=Utmify Fail2Ban Monitor
After=fail2ban.service
Requires=fail2ban.service

[Service]
Type=simple
ExecStart=/usr/local/bin/utmify-fail2ban-monitor
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

# Test configuration
log "Testing fail2ban configuration..."
fail2ban-client -t

if [[ $? -eq 0 ]]; then
    log "Configuration test passed!"
else
    error "Configuration test failed! Please check the configuration."
fi

# Enable and start services
log "Enabling and starting services..."
systemctl daemon-reload
systemctl enable fail2ban
systemctl restart fail2ban
systemctl enable utmify-fail2ban-monitor
systemctl start utmify-fail2ban-monitor

# Wait a moment for services to start
sleep 5

# Check service status
if systemctl is-active --quiet fail2ban; then
    log "Fail2ban is running successfully"
else
    error "Fail2ban failed to start"
fi

if systemctl is-active --quiet utmify-fail2ban-monitor; then
    log "Fail2ban monitor is running successfully"
else
    warn "Fail2ban monitor failed to start"
fi

# Display status
log "Fail2Ban setup completed successfully!"
log "Management commands:"
log "  - utmify-fail2ban status     # Check status"
log "  - utmify-fail2ban logs       # View recent logs"
log "  - utmify-fail2ban stats      # View statistics"
log "  - utmify-fail2ban ban <jail> <ip>    # Ban an IP"
log "  - utmify-fail2ban unban <jail> <ip>  # Unban an IP"

info "Current fail2ban status:"
fail2ban-client status

log "Setup complete. Monitor logs at /var/log/fail2ban/fail2ban.log"
log "Application logs should be configured to write to /var/log/utmify/ directories"