FROM nginx:1.27-alpine

RUN apk add --no-cache openssl && \
		mkdir -p /etc/ssl/localcerts && \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout /etc/ssl/localcerts/selfsigned.key \
			-out /etc/ssl/localcerts/selfsigned.crt \
			-subj "/CN=tiltcheck.me" && \
		rm -f /etc/nginx/conf.d/default.conf

COPY services/reverse-proxy/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
