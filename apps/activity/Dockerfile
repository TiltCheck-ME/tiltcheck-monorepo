# TiltCheck Activity - Production HUD Host
FROM nginx:alpine

# Copy the pre-built 'dist' folder from your local machine to the container
# We build locally to ensure zero-drift and avoid cloud resource timeouts.
COPY apps/activity/dist /usr/share/nginx/html

# Custom nginx config to handle SPA routing & Discord's specific security headers
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
        add_header X-Frame-Options "ALLOWALL"; \
        add_header Access-Control-Allow-Origin "*"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
