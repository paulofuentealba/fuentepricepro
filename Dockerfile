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
# Google Cloud Run injects the PORT environment variable
ENV PORT=8080

# Copy the build output from the builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Run the web service on container startup.
# TanStack Start / Nitro outputs a standard Node server to .output/server/index.mjs
CMD [ "node", ".output/server/index.mjs" ]
