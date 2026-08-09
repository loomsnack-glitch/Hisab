server {
    server_name ganatri.loomsnack.com;

    root /var/www/ganatri.loomsnack.com/frontend;
    index index.html;

    client_max_body_size 50M;

    location ^~ /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /version.json {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate" always;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/ganatri.loomsnack.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ganatri.loomsnack.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = ganatri.loomsnack.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name ganatri.loomsnack.com;
    return 404;
}
