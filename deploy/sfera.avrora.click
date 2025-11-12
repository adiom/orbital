# nginx конфигурация для sfera.avrora.click
# Файл для /etc/nginx/sites-available/sfera.avrora.click
# 
# Примечание: 
# - Используются прямые адреса (127.0.0.1:4000, 127.0.0.1:4001) вместо upstream
# - ssl_protocols и ssl_ciphers должны быть определены в основном nginx.conf
#   на уровне http блока, чтобы избежать конфликтов
# - Убедитесь, что в основном nginx.conf добавлены:
#   proxy_headers_hash_max_size 1024;
#   proxy_headers_hash_bucket_size 128;

# HTTP -> HTTPS редирект
server {
    listen 80;
    listen [::]:80;
    server_name sfera.avrora.click;

    # Перенаправление на HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sfera.avrora.click;

    # SSL сертификаты Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/sfera.avrora.click/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sfera.avrora.click/privkey.pem;

    # SSL настройки (ssl_protocols и ssl_ciphers должны быть определены 
    # в основном nginx.conf на уровне http блока, чтобы избежать конфликтов)
    # Если нужно переопределить для этого сервера, раскомментируйте:
    # ssl_protocols TLSv1.2 TLSv1.3;
    # ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Отключаем SSL stapling, если OCSP responder отсутствует
    ssl_stapling off;

    # Безопасность заголовки
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Общие прокси настройки (определены один раз на уровне server)
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_http_version 1.1;

    # Кеширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Connection "";
    }

    # Next.js _next файлы
    location /_next/static/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Connection "";
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket прокси
    location /ws {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket таймауты
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # API endpoints с rate limiting
    location /api/ {
        # Ограничение для API
        limit_req zone=api burst=20 nodelay;

        # Особые ограничения для аутентификации
        location ~ ^/api/auth {
            limit_req zone=auth burst=5 nodelay;
        }

        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Connection "";
    }

    # Health check для WebSocket сервера
    location /ws-health {
        proxy_pass http://127.0.0.1:4001/health;
        proxy_set_header Connection "";
        access_log off;
    }

    # Основной прокси для всех остальных запросов
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Connection "";

        # Для Next.js PPR (Partial Prerendering)
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Обработка ошибок
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
