root@vps3294120:~# cat /etc/nginx/sites-available/loomsnack.com
server {
    server_name loomsnack.com www.loomsnack.com;

    root /var/www/loomsnack.com;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/loomsnack.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/loomsnack.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot


}
server {
    if ($host = www.loomsnack.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    if ($host = loomsnack.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name loomsnack.com www.loomsnack.com;
    return 404; # managed by Certbot




}