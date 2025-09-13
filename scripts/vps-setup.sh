#!/bin/bash

# VPS Setup Script for Ubuntu 22.04
# This script sets up the complete production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting VPS Setup for Utmify...${NC}"

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo -e "${YELLOW}Installing essential packages...${NC}"
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Node.js 18
echo -e "${YELLOW}Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
echo -e "${YELLOW}Installing pnpm...${NC}"
npm install -g pnpm@8.15.0

# Install PM2
echo -e "${YELLOW}Installing PM2...${NC}"
npm install -g pm2

# Install Docker
echo -e "${YELLOW}Installing Docker...${NC}"
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
echo -e "${YELLOW}Installing Docker Compose...${NC}"
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Install PostgreSQL 15
echo -e "${YELLOW}Installing PostgreSQL 15...${NC}"
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# Install Redis
echo -e "${YELLOW}Installing Redis...${NC}"
sudo apt install -y redis-server

# Configure PostgreSQL
echo -e "${YELLOW}Configuring PostgreSQL...${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE utmify;
CREATE USER utmify WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE utmify TO utmify;
ALTER USER utmify CREATEDB;
\q
EOF

# Configure Redis
echo -e "${YELLOW}Configuring Redis...${NC}"
sudo sed -i 's/# requirepass foobared/requirepass your-redis-password/' /etc/redis/redis.conf
sudo sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Configure Firewall
echo -e "${YELLOW}Configuring UFW Firewall...${NC}"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Configure Fail2Ban
echo -e "${YELLOW}Configuring Fail2Ban...${NC}"
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Create fail2ban nginx configuration
sudo tee /etc/fail2ban/jail.d/nginx.conf > /dev/null << EOF
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
EOF

sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Create application directory
echo -e "${YELLOW}Creating application directory...${NC}"
sudo mkdir -p /opt/utmify
sudo chown $USER:$USER /opt/utmify

# Create environment file template
echo -e "${YELLOW}Creating environment file template...${NC}"
cat > /opt/utmify/.env.production << EOF
# Database
DATABASE_URL="postgresql://utmify:your-secure-password@localhost:5432/utmify"
POSTGRES_DB=utmify
POSTGRES_USER=utmify
POSTGRES_PASSWORD=your-secure-password

# Redis
REDIS_URL="redis://:your-redis-password@localhost:6379"
REDIS_PASSWORD=your-redis-password

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="https://your-domain.com"
JWT_SECRET="your-jwt-secret-here"

# API Keys
STRIPE_SECRET_KEY="sk_live_..."
GOOGLE_ADS_DEVELOPER_TOKEN="your-google-ads-token"
META_ACCESS_TOKEN="your-meta-access-token"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
GOOGLE_ANALYTICS_ID="GA-XXXXXXXXX"

# Domain
DOMAIN_NAME="your-domain.com"
EOF

# Create PM2 ecosystem file
echo -e "${YELLOW}Creating PM2 ecosystem file...${NC}"
cat > /opt/utmify/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'utmify-web',
      script: 'apps/web/server.js',
      cwd: '/opt/utmify',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '/opt/utmify/.env.production',
      error_file: '/var/log/pm2/utmify-web-error.log',
      out_file: '/var/log/pm2/utmify-web-out.log',
      log_file: '/var/log/pm2/utmify-web.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'utmify-api',
      script: 'apps/api/dist/index.js',
      cwd: '/opt/utmify',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      env_file: '/opt/utmify/.env.production',
      error_file: '/var/log/pm2/utmify-api-error.log',
      out_file: '/var/log/pm2/utmify-api-out.log',
      log_file: '/var/log/pm2/utmify-api.log',
      time: true,
      max_memory_restart: '512M'
    }
  ]
};
EOF

# Create log directories
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Configure Nginx
echo -e "${YELLOW}Configuring Nginx...${NC}"
sudo rm -f /etc/nginx/sites-enabled/default

# Create Nginx configuration for Utmify
sudo tee /etc/nginx/sites-available/utmify << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;

# Upstream servers
upstream web_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream api_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    server_tokens off;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all HTTP requests to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    server_tokens off;

    # SSL configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Auth endpoints with stricter rate limiting
    location ~ ^/(api/auth|api/login|api/register) {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://web_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main web application
    location / {
        proxy_pass http://web_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/utmify /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Start and enable services
echo -e "${YELLOW}Starting and enabling services...${NC}"
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Setup PM2 startup
pm2 startup
echo -e "${YELLOW}Please run the command shown above to setup PM2 startup${NC}"

# Create deployment script
echo -e "${YELLOW}Creating deployment script...${NC}"
cat > /opt/utmify/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma client
cd packages/database && pnpm prisma generate && cd ../..

# Run migrations
cd packages/database && pnpm prisma migrate deploy && cd ../..

# Build applications
pnpm build

# Restart PM2 processes
pm2 reload ecosystem.config.js

echo "Deployment completed successfully!"
EOF

chmod +x /opt/utmify/deploy.sh

echo -e "${GREEN}VPS Setup completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update /opt/utmify/.env.production with your actual values"
echo "2. Replace 'your-domain.com' in /etc/nginx/sites-available/utmify with your actual domain"
echo "3. Run: sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
echo "4. Clone your repository to /opt/utmify"
echo "5. Run the deployment script: /opt/utmify/deploy.sh"
echo "6. Start PM2 processes: pm2 start /opt/utmify/ecosystem.config.js"
echo "7. Save PM2 configuration: pm2 save"

echo -e "${GREEN}Setup script completed!${NC}"