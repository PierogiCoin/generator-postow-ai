#!/bin/sh

# Set default PORT if not provided
export PORT=${PORT:-80}

# Replace PORT variable in nginx config template
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Test nginx configuration
nginx -t

# Start nginx
exec nginx -g 'daemon off;'
