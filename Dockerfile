# Use the official lightweight Node.js 20 image.
# https://hub.docker.com/_/node
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
RUN npm ci

# Copy local code to the container image.
COPY . .

# Build the application
RUN npm run build

# Use a lighter image for the runtime
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
# Bind to all interfaces for Docker/Cloud Run
ENV HOST=0.0.0.0
# Google Cloud Run injects the PORT environment variable
ENV PORT=3000

# Copy the build output from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.production.js ./server.production.js

# Run the web service on container startup.
CMD [ "node", "server.production.js" ]
