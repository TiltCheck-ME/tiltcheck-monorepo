FROM nginx:alpine

# Copy static files
COPY apps/web/ /usr/share/nginx/html/

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
