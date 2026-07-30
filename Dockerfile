# Use the official lightweight Node.js 20 image.
# https://hub.docker.com/_/node
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
RUN npm ci

# Copy local code to the container image.
COPY . .

# Build-time variables: VITE_ prefixed vars are inlined into the client
# bundle by Vite during `npm run build`, so they must be available here,
# not just at container runtime. Pass them in via --build-arg (Cloud Build
# substitutions or a local `docker build --build-arg ...`).
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

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

# No .env is copied into the image on purpose: server-side runtime secrets
# (e.g. RESEND_API_KEY) must be configured directly on the Cloud Run
# service (env var or Secret Manager), not baked into the image.
# server.production.js already reads straight from process.env.

# Run the web service on container startup.
CMD [ "node", "server.production.js" ]
