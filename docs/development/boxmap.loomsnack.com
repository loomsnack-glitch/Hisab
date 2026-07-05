root@vps3294120:~# cat /etc/nginx/sites-available/boxmap.loomsnack.com
server {
    server_name boxmap.loomsnack.com;

    root /var/www/boxmap.loomsnack.com/frontend;
    index index.html;

    # Handle API without forcing trailing slash
    location ^~ /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl http2; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/loomsnack.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/loomsnack.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = boxmap.loomsnack.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name boxmap.loomsnack.com;
    return 404; # managed by Certbot


}