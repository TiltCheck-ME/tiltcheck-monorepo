#!/bin/bash
# TiltCheck SSL Setup Script
# Run this on the VPS host

DOMAIN="tiltcheck.me"
EMAIL="jme@tiltcheck.me" # Replace with actual email

echo "🔒 Starting SSL setup for $DOMAIN and subdomains..."

# 1. Create challenge directory
mkdir -p /home/jme/certbot

# 2. Run Certbot
sudo certbot certonly --webroot -w /home/jme/certbot \
  -d $DOMAIN \
  -d www.$DOMAIN \
  -d api.$DOMAIN \
  -d dashboard.$DOMAIN \
  -d justthetip.$DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email

echo "✅ Certificates generated!"
echo "Now update nginx.conf to point to /etc/letsencrypt/live/$DOMAIN/ and restart the proxy."
