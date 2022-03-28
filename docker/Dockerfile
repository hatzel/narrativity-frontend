FROM nginx
COPY dist/* /usr/share/nginx/html/
# Ugh this one is needed for the licenses file
COPY dist/dist/* /usr/share/nginx/html/dist/
COPY nginx.conf /etc/nginx/templates/default.conf.template
