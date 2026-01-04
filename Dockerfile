FROM nginx:alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy your HTML and assets
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80
