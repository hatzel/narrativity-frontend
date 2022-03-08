FROM nginx
COPY dist/* /usr/share/nginx/html/
COPY htpasswd /etc/nginx/htpasswd
COPY nginx.conf /etc/nginx/templates/default.conf.template
