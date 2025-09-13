#!/bin/bash

# SSL Setup Script with Certbot
# Usage: ./setup-ssl.sh your-domain.com your-email@domain.com

set -e

DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"your-email@domain.com"}

echo "Setting up SSL for domain: $DOMAIN"
echo "Email: $EMAIL"

# Create necessary directories
mkdir -p docker/certbot/conf
mkdir -p docker/certbot/www
mkdir -p docker/nginx/logs

# Update domain in nginx config
sed -i "s/your-domain.com/$DOMAIN/g" docker/nginx/conf.d/utmify.conf
sed -i "s/your-email@domain.com/$EMAIL/g" docker-compose.prod.yml

# Start nginx without SSL first
echo "Starting Nginx without SSL..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
echo "Waiting for Nginx to be ready..."
sleep 10

# Get SSL certificate
echo "Obtaining SSL certificate..."
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d $DOMAIN \
  -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo "SSL certificate obtained successfully!"
    
    # Restart nginx with SSL
    echo "Restarting Nginx with SSL..."
    docker-compose -f docker-compose.prod.yml restart nginx
    
    # Setup auto-renewal
    echo "Setting up auto-renewal..."
    
    # Create renewal script
    cat > scripts/renew-ssl.sh << EOF
#!/bin/bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
EOF
    
    chmod +x scripts/renew-ssl.sh
    
    # Add to crontab (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 12 * * * /path/to/your/project/scripts/renew-ssl.sh") | crontab -
    (crontab -l 2>/dev/null; echo "0 0 * * * /path/to/your/project/scripts/renew-ssl.sh") | crontab -
    
    echo "SSL setup completed successfully!"
    echo "Auto-renewal has been configured to run twice daily."
    echo "Your site should now be accessible at https://$DOMAIN"
else
    echo "Failed to obtain SSL certificate. Please check your domain configuration."
    exit 1
fi

# Test SSL configuration
echo "Testing SSL configuration..."
sleep 5
curl -I https://$DOMAIN || echo "SSL test failed - please check your configuration"

echo "SSL setup script completed!"