# Dockerfile for Tetris AI Game Frontend
# Multi-architecture support (ARM/X86) via nginx:alpine base image

FROM nginx:alpine

# Set labels for the image
LABEL maintainer="Tetris AI Game"
LABEL description="HTML5 Tetris game with AI auto-play mode"
LABEL version="1.0"

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy static files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY src/ /usr/share/nginx/html/src/

# Create custom nginx configuration for SPA support
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
