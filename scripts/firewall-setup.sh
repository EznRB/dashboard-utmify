#!/bin/bash

# Utmify Firewall Setup Script
# This script configures UFW (Uncomplicated Firewall) for production deployment

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

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    log "Installing UFW..."
    apt-get update
    apt-get install -y ufw
fi

# Configuration variables
SSH_PORT=${SSH_PORT:-22}
HTTP_PORT=${HTTP_PORT:-80}
HTTPS_PORT=${HTTPS_PORT:-443}
API_PORT=${API_PORT:-3001}
WEB_PORT=${WEB_PORT:-3000}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
REDIS_PORT=${REDIS_PORT:-6379}
PROMETHEUS_PORT=${PROMETHEUS_PORT:-9090}
GRAFANA_PORT=${GRAFANA_PORT:-3030}
ALERTMANAGER_PORT=${ALERTMANAGER_PORT:-9093}
JAEGER_PORT=${JAEGER_PORT:-16686}

# Trusted IP ranges (customize these for your needs)
TRUSTED_IPS=(
    "10.0.0.0/8"        # Private network
    "172.16.0.0/12"     # Private network
    "192.168.0.0/16"    # Private network
)

# Office/Admin IP addresses (add your office/admin IPs here)
ADMIN_IPS=(
    # "203.0.113.0/24"  # Example: Office network
    # "198.51.100.50"   # Example: Admin home IP
)

# Monitoring service IPs (add monitoring service IPs here)
MONITORING_IPS=(
    # "185.199.108.0/22" # Example: GitHub Actions
    # "140.82.112.0/20"  # Example: GitHub
)

log "Starting UFW firewall configuration for Utmify..."

# Reset UFW to defaults
log "Resetting UFW to defaults..."
ufw --force reset

# Set default policies
log "Setting default policies..."
ufw default deny incoming
ufw default allow outgoing
ufw default deny forward

# Allow loopback
log "Allowing loopback traffic..."
ufw allow in on lo
ufw allow out on lo

# Allow SSH (be careful with this!)
log "Allowing SSH on port $SSH_PORT..."
ufw allow $SSH_PORT/tcp comment 'SSH'

# Allow HTTP and HTTPS
log "Allowing HTTP and HTTPS traffic..."
ufw allow $HTTP_PORT/tcp comment 'HTTP'
ufw allow $HTTPS_PORT/tcp comment 'HTTPS'

# Allow specific application ports from anywhere (public access)
log "Allowing public application ports..."
# Web application (if running standalone)
if [[ "$WEB_PORT" != "80" && "$WEB_PORT" != "443" ]]; then
    ufw allow $WEB_PORT/tcp comment 'Web App'
fi

# API (if running standalone and not behind reverse proxy)
if [[ "$API_PORT" != "80" && "$API_PORT" != "443" ]]; then
    ufw allow $API_PORT/tcp comment 'API'
fi

# Allow database access from trusted networks only
log "Configuring database access..."
for ip in "${TRUSTED_IPS[@]}"; do
    ufw allow from $ip to any port $POSTGRES_PORT proto tcp comment "PostgreSQL from $ip"
    ufw allow from $ip to any port $REDIS_PORT proto tcp comment "Redis from $ip"
done

# Allow monitoring ports from admin IPs
if [[ ${#ADMIN_IPS[@]} -gt 0 ]]; then
    log "Configuring monitoring access for admin IPs..."
    for ip in "${ADMIN_IPS[@]}"; do
        ufw allow from $ip to any port $PROMETHEUS_PORT proto tcp comment "Prometheus from $ip"
        ufw allow from $ip to any port $GRAFANA_PORT proto tcp comment "Grafana from $ip"
        ufw allow from $ip to any port $ALERTMANAGER_PORT proto tcp comment "Alertmanager from $ip"
        ufw allow from $ip to any port $JAEGER_PORT proto tcp comment "Jaeger from $ip"
    done
else
    warn "No admin IPs configured. Monitoring ports will be accessible from anywhere."
    ufw allow $PROMETHEUS_PORT/tcp comment 'Prometheus'
    ufw allow $GRAFANA_PORT/tcp comment 'Grafana'
    ufw allow $ALERTMANAGER_PORT/tcp comment 'Alertmanager'
    ufw allow $JAEGER_PORT/tcp comment 'Jaeger'
fi

# Allow monitoring service access
if [[ ${#MONITORING_IPS[@]} -gt 0 ]]; then
    log "Configuring access for external monitoring services..."
    for ip in "${MONITORING_IPS[@]}"; do
        ufw allow from $ip to any port $HTTP_PORT proto tcp comment "Monitoring HTTP from $ip"
        ufw allow from $ip to any port $HTTPS_PORT proto tcp comment "Monitoring HTTPS from $ip"
    done
fi

# Allow common monitoring and health check ports
log "Configuring health check and monitoring ports..."
ufw allow 9100/tcp comment 'Node Exporter'
ufw allow 9187/tcp comment 'PostgreSQL Exporter'
ufw allow 9121/tcp comment 'Redis Exporter'
ufw allow 9113/tcp comment 'Nginx Exporter'
ufw allow 8080/tcp comment 'cAdvisor'
ufw allow 9115/tcp comment 'Blackbox Exporter'
ufw allow 3100/tcp comment 'Loki'
ufw allow 9080/tcp comment 'Promtail'

# Allow Docker Swarm ports (if using Docker Swarm)
if command -v docker &> /dev/null && docker info 2>/dev/null | grep -q "Swarm: active"; then
    log "Configuring Docker Swarm ports..."
    ufw allow 2377/tcp comment 'Docker Swarm Management'
    ufw allow 7946/tcp comment 'Docker Swarm Node Communication'
    ufw allow 7946/udp comment 'Docker Swarm Node Communication'
    ufw allow 4789/udp comment 'Docker Swarm Overlay Network'
fi

# Rate limiting rules
log "Configuring rate limiting rules..."
# Limit SSH connections
ufw limit $SSH_PORT/tcp comment 'SSH Rate Limit'

# Limit HTTP connections (basic DDoS protection)
ufw limit $HTTP_PORT/tcp comment 'HTTP Rate Limit'
ufw limit $HTTPS_PORT/tcp comment 'HTTPS Rate Limit'

# Block common attack ports
log "Blocking common attack ports..."
ATTACK_PORTS=(21 23 25 53 110 135 139 143 445 993 995 1433 1521 3306 3389 5432 5900 6379)
for port in "${ATTACK_PORTS[@]}"; do
    # Only block if not in our allowed ports
    if [[ ! " $SSH_PORT $HTTP_PORT $HTTPS_PORT $API_PORT $WEB_PORT $POSTGRES_PORT $REDIS_PORT " =~ " $port " ]]; then
        ufw deny $port comment "Block attack port $port"
    fi
done

# Block known malicious IP ranges (you can add more)
log "Blocking known malicious IP ranges..."
MALICIOUS_IPS=(
    "0.0.0.0/8"         # Invalid range
    "127.0.0.0/8"       # Loopback (except from lo interface)
    "169.254.0.0/16"    # Link-local
    "224.0.0.0/4"       # Multicast
    "240.0.0.0/4"       # Reserved
)

for ip in "${MALICIOUS_IPS[@]}"; do
    if [[ "$ip" != "127.0.0.0/8" ]]; then  # Don't block loopback completely
        ufw deny from $ip comment "Block malicious range $ip"
    fi
done

# Advanced rules for application security
log "Configuring advanced security rules..."

# Allow ICMP (ping) but limit it
ufw allow in proto icmp from any comment 'ICMP'

# Allow NTP (time synchronization)
ufw allow out 123/udp comment 'NTP'

# Allow DNS
ufw allow out 53/udp comment 'DNS UDP'
ufw allow out 53/tcp comment 'DNS TCP'

# Allow SMTP for email notifications (if needed)
if [[ "${ALLOW_SMTP:-false}" == "true" ]]; then
    ufw allow out 25/tcp comment 'SMTP'
    ufw allow out 587/tcp comment 'SMTP Submission'
    ufw allow out 465/tcp comment 'SMTPS'
fi

# Create custom chains for application-specific rules
log "Creating custom iptables rules..."

# Create a custom chain for rate limiting
iptables -N UTMIFY_RATE_LIMIT 2>/dev/null || true
iptables -F UTMIFY_RATE_LIMIT

# Rate limit new connections to web ports
iptables -A UTMIFY_RATE_LIMIT -p tcp --dport $HTTP_PORT -m state --state NEW -m recent --set --name HTTP_LIMIT
iptables -A UTMIFY_RATE_LIMIT -p tcp --dport $HTTP_PORT -m state --state NEW -m recent --update --seconds 60 --hitcount 20 --name HTTP_LIMIT -j DROP
iptables -A UTMIFY_RATE_LIMIT -p tcp --dport $HTTPS_PORT -m state --state NEW -m recent --set --name HTTPS_LIMIT
iptables -A UTMIFY_RATE_LIMIT -p tcp --dport $HTTPS_PORT -m state --state NEW -m recent --update --seconds 60 --hitcount 20 --name HTTPS_LIMIT -j DROP

# Insert the custom chain into the INPUT chain
iptables -I INPUT -j UTMIFY_RATE_LIMIT

# Create a custom chain for blocking suspicious traffic
iptables -N UTMIFY_SECURITY 2>/dev/null || true
iptables -F UTMIFY_SECURITY

# Block packets with invalid flags
iptables -A UTMIFY_SECURITY -p tcp --tcp-flags ALL NONE -j DROP
iptables -A UTMIFY_SECURITY -p tcp --tcp-flags ALL ALL -j DROP
iptables -A UTMIFY_SECURITY -p tcp --tcp-flags ALL FIN,URG,PSH -j DROP
iptables -A UTMIFY_SECURITY -p tcp --tcp-flags ALL SYN,RST,ACK,FIN,URG -j DROP
iptables -A UTMIFY_SECURITY -p tcp --tcp-flags SYN,RST SYN,RST -j DROP
iptables -A UTMIFY_SECURITY -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP

# Insert the security chain into the INPUT chain
iptables -I INPUT -j UTMIFY_SECURITY

# Save iptables rules
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
fi

# Configure fail2ban integration
log "Configuring fail2ban integration..."
if command -v fail2ban-client &> /dev/null; then
    # Create custom fail2ban jail for Utmify
    cat > /etc/fail2ban/jail.d/utmify.conf << EOF
[utmify-auth]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = utmify-auth
logpath = /var/log/utmify/api/auth.log
maxretry = 5
bantime = 3600
findtime = 600
action = iptables-multiport[name=utmify-auth, port="$HTTP_PORT,$HTTPS_PORT", protocol=tcp]

[utmify-api]
enabled = true
port = $API_PORT
protocol = tcp
filter = utmify-api
logpath = /var/log/utmify/api/access.log
maxretry = 50
bantime = 1800
findtime = 300
action = iptables-multiport[name=utmify-api, port="$API_PORT", protocol=tcp]

[nginx-limit-req]
enabled = true
port = $HTTP_PORT,$HTTPS_PORT
protocol = tcp
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
findtime = 600
action = iptables-multiport[name=nginx-limit-req, port="$HTTP_PORT,$HTTPS_PORT", protocol=tcp]
EOF

    # Create custom filters
    mkdir -p /etc/fail2ban/filter.d
    
    cat > /etc/fail2ban/filter.d/utmify-auth.conf << EOF
[Definition]
failregex = ^.*"ip":"<HOST>".*"event":"AUTH_FAILED".*$
            ^.*"ip":"<HOST>".*"event":"SUSPICIOUS_REQUEST".*$
            ^.*"ip":"<HOST>".*"event":"RATE_LIMIT_EXCEEDED".*$
ignoreregex =
EOF

    cat > /etc/fail2ban/filter.d/utmify-api.conf << EOF
[Definition]
failregex = ^.*"ip":"<HOST>".*"status":(4[0-9]{2}|5[0-9]{2}).*$
ignoreregex = ^.*"ip":"<HOST>".*"status":(200|201|204|301|302|304).*$
EOF

    # Restart fail2ban
    systemctl restart fail2ban || warn "Failed to restart fail2ban"
else
    warn "fail2ban not installed. Consider installing it for additional security."
fi

# Enable UFW
log "Enabling UFW..."
ufw --force enable

# Display UFW status
log "UFW Status:"
ufw status verbose

# Create firewall management script
log "Creating firewall management script..."
cat > /usr/local/bin/utmify-firewall << 'EOF'
#!/bin/bash

# Utmify Firewall Management Script

case "$1" in
    status)
        echo "UFW Status:"
        ufw status verbose
        echo ""
        echo "Active connections:"
        ss -tuln
        ;;
    block)
        if [[ -z "$2" ]]; then
            echo "Usage: $0 block <ip_address>"
            exit 1
        fi
        ufw deny from $2
        echo "Blocked IP: $2"
        ;;
    unblock)
        if [[ -z "$2" ]]; then
            echo "Usage: $0 unblock <ip_address>"
            exit 1
        fi
        ufw delete deny from $2
        echo "Unblocked IP: $2"
        ;;
    logs)
        echo "Recent UFW logs:"
        tail -n 50 /var/log/ufw.log | grep -E "(BLOCK|ALLOW|DENY)"
        ;;
    stats)
        echo "Firewall statistics:"
        iptables -L -n -v | head -20
        ;;
    backup)
        echo "Backing up firewall rules..."
        ufw status verbose > "/tmp/ufw-backup-$(date +%Y%m%d-%H%M%S).txt"
        iptables-save > "/tmp/iptables-backup-$(date +%Y%m%d-%H%M%S).rules"
        echo "Backup saved to /tmp/"
        ;;
    *)
        echo "Usage: $0 {status|block|unblock|logs|stats|backup}"
        echo ""
        echo "Commands:"
        echo "  status   - Show firewall status and active connections"
        echo "  block    - Block an IP address"
        echo "  unblock  - Unblock an IP address"
        echo "  logs     - Show recent firewall logs"
        echo "  stats    - Show firewall statistics"
        echo "  backup   - Backup current firewall rules"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/utmify-firewall

# Create systemd service for firewall persistence
log "Creating systemd service for firewall persistence..."
cat > /etc/systemd/system/utmify-firewall.service << EOF
[Unit]
Description=Utmify Firewall Rules
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/utmify-firewall-restore
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Create firewall restore script
cat > /usr/local/bin/utmify-firewall-restore << 'EOF'
#!/bin/bash
# Restore custom iptables rules on boot
if [[ -f /etc/iptables/rules.v4 ]]; then
    iptables-restore < /etc/iptables/rules.v4
fi
EOF

chmod +x /usr/local/bin/utmify-firewall-restore
systemctl enable utmify-firewall.service

# Create monitoring script
log "Creating firewall monitoring script..."
cat > /usr/local/bin/utmify-firewall-monitor << 'EOF'
#!/bin/bash

# Monitor firewall for suspicious activity
LOG_FILE="/var/log/utmify/firewall-monitor.log"
ALERT_THRESHOLD=100

mkdir -p "$(dirname "$LOG_FILE")"

while true; do
    # Count blocked connections in the last minute
    BLOCKED_COUNT=$(grep "$(date -d '1 minute ago' '+%b %d %H:%M')" /var/log/ufw.log 2>/dev/null | grep "\[UFW BLOCK\]" | wc -l)
    
    if [[ $BLOCKED_COUNT -gt $ALERT_THRESHOLD ]]; then
        echo "$(date): HIGH ALERT - $BLOCKED_COUNT blocked connections in the last minute" >> "$LOG_FILE"
        
        # Send alert (customize this for your notification system)
        if command -v mail &> /dev/null; then
            echo "High number of blocked connections detected: $BLOCKED_COUNT" | mail -s "Utmify Firewall Alert" admin@utmify.com
        fi
    fi
    
    sleep 60
done
EOF

chmod +x /usr/local/bin/utmify-firewall-monitor

# Create systemd service for monitoring
cat > /etc/systemd/system/utmify-firewall-monitor.service << EOF
[Unit]
Description=Utmify Firewall Monitor
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/utmify-firewall-monitor
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl enable utmify-firewall-monitor.service
systemctl start utmify-firewall-monitor.service

log "Firewall configuration completed successfully!"
log "Management commands:"
log "  - utmify-firewall status    # Check firewall status"
log "  - utmify-firewall block IP  # Block an IP address"
log "  - utmify-firewall logs      # View recent logs"
log "  - ufw status verbose        # Detailed UFW status"

info "IMPORTANT: Make sure you can still access the server via SSH before disconnecting!"
info "If you get locked out, you may need console access to fix the firewall rules."

# Test SSH connectivity
log "Testing SSH connectivity..."
if ss -tuln | grep -q ":$SSH_PORT "; then
    log "SSH port $SSH_PORT is listening - you should be able to reconnect"
else
    warn "SSH port $SSH_PORT is not listening - you may have connectivity issues!"
fi

log "Firewall setup complete. Please test your connectivity before disconnecting."