# TiltCheck Landing Page - Static Nginx Container
FROM nginx:alpine

# Copy static files to nginx html directory
COPY apps/web/ /usr/share/nginx/html/

# Expose port 80 (internal to docker network)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
