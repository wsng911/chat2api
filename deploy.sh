#!/bin/bash
set -e

mkdir -p /home/chat2api/data && cd /home/chat2api

cat > config.json << 'EOF'
{
  "auth-key": "890214",
  "refresh_account_interval_minute": 60,
  "image_retention_days": 7,
  "auto_remove_invalid_accounts": true,
  "auto_remove_rate_limited_accounts": false,
  "proxy": "",
  "base_url": ""
}
EOF

cat > docker-compose.yml << 'EOF'
services:
  chat2api:
    image: wsng911/chat2api:latest
    container_name: chat2api
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
    networks:
      - nginx_network
    volumes:
      - ./data:/app/data
      - ./config.json:/app/config.json
    environment:
      TZ: Asia/Shanghai

networks:
  nginx_network:
    external: true
EOF

docker network create nginx_network 2>/dev/null || true
docker rm -f chat2api 2>/dev/null || true
docker pull wsng911/chat2api:latest
docker compose up -d --force-recreate
docker inspect chat2api --format '{{.Created}}'
docker inspect chat2api --format '{{.Image}}'
