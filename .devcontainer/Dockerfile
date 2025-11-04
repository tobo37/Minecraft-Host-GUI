FROM mcr.microsoft.com/devcontainers/java:1-21-bullseye

# Install additional tools for Minecraft server management
RUN apt-get update && apt-get install -y \
    screen \
    htop \
    curl \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Create minecraft server directory
RUN mkdir -p /workspace/minecraft-server
WORKDIR /workspace

# Set Java memory options for Minecraft
ENV JAVA_OPTS="-Xmx2G -Xms1G"