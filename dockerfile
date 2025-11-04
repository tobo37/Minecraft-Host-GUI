# Multi-stage Dockerfile for Bun + Java application

# Stage 1: Build the Bun project
FROM oven/bun:1.1.34-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code and build files
COPY src/ ./src/
COPY build.ts ./
COPY tsconfig.json ./
COPY components.json ./
COPY styles/ ./styles/

# Build the application
RUN bun run build

# Stage 2: Create runtime image with Java and Bun
FROM openjdk:21-jdk-slim

# Install Node.js and other dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules

# Copy server files if they exist
COPY server/ ./server/

# Create a startup script
RUN echo '#!/bin/bash\n\
echo "Starting Bun application..."\n\
exec bun start' > /app/start.sh && chmod +x /app/start.sh

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the Bun application
CMD ["/app/start.sh"]