FROM nginx
COPY dist/*.css /usr/share/nginx/html/
COPY dist/*.js /usr/share/nginx/html/
COPY dist/index.html /usr/share/nginx/html/
COPY htpasswd /etc/nginx/htpasswd
COPY nginx.conf /etc/nginx/templates/default.conf.template
