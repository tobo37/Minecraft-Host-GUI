# Multi-stage Dockerfile for Bun + Java application
FROM eclipse-temurin:24

# Install Node.js and other dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Setze das Arbeitsverzeichnis
WORKDIR /app

# --- HIER IST DIE KORREKTUR ---
# Kopiere zuerst die Paketdateien für das Caching
COPY package.json .
COPY bun.lock .

# Installiere die Bun-Abhängigkeiten
RUN bun install --frozen-lockfile
# -----------------------------

# Kopiere den Rest des Codes
COPY . .

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the Bun application
CMD ["bun","run","start"]