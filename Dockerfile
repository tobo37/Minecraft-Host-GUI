# Dockerfile for Bun + Jabba Java Management
FROM debian:bookworm-slim

# Install dependencies for Bun, Jabba, and server operations
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Install Jabba
RUN curl -sL https://github.com/shyiko/jabba/raw/master/install.sh | bash
ENV JABBA_HOME="/root/.jabba"
ENV PATH="$JABBA_HOME/bin:$PATH"

# Install OpenJDK 17 as default Java version
RUN bash -c "source ~/.jabba/jabba.sh && jabba install openjdk@1.17.0 && jabba alias default openjdk@1.17.0"

# Set working directory
WORKDIR /app

# Copy package files for dependency caching
COPY package.json .
COPY bun.lock .

# Install Bun dependencies
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Expose ports for web UI and Minecraft server
EXPOSE 3000 25565

# Set environment variables
ENV NODE_ENV=production

# Start the application with Jabba environment loaded
CMD ["bash", "-c", "source ~/.jabba/jabba.sh && jabba use default && bun run start"]