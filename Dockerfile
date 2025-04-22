# Stage 1: Build the static site
FROM node:23-slim AS builder
ARG SITE_BASE
ENV VITE_SITE_BASE=$SITE_BASE
ARG GA_TRACKING_ID
ENV VITE_GA_TRACKING_ID=$GA_TRACKING_ID

# Install git and build dependencies
RUN apt-get update && apt-get install -y \
    make g++ python3 python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy source package into image
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install 

# Copy source code into image
COPY . .

# Build
RUN npm run build

# Stage 2: Serve static site with nginx
FROM nginx:alpine

# Remove default nginx static files and copy in our own
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 and use nginx as entrypoint
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
