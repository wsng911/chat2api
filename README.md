# chat2api

ChatGPT Token 管理与图片生成工具，支持 OpenAI 兼容 API 中转。

## 功能

- Token 管理：支持导入 Access Token / Session JSON / CPA JSON，自动刷新状态和额度
- 图片生成：兼容 `POST /v1/images/generations`、`POST /v1/images/edits`
- 画笔编辑：支持在生成图片上涂抹选区后进行局部编辑
- OpenAI 兼容接口：`/v1/models`、`/v1/chat/completions`、`/v1/images/generations`、`/v1/images/edits`

## 快速部署

```bash
mkdir -p /home/chat2api/data && cd /home/chat2api

cat > config.json << 'EOF'
{
  "auth-key": "your_password",
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
    image: mrlees2026/chat2api:latest
    container_name: chat2api
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./config.json:/app/config.json
    ports:
      - "3000:80"
EOF

docker compose up -d
```

## API 使用

所有接口需要请求头：
```
Authorization: Bearer <auth-key>
```
