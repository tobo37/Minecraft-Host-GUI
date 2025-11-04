#!/bin/bash

# Minecraft Server Starter Script
SERVER_DIR="./minecraft-server"
SERVER_JAR="server.jar"
MEMORY="2G"

# Create server directory if it doesn't exist
mkdir -p "$SERVER_DIR"
cd "$SERVER_DIR"

# Check if server jar exists
if [ ! -f "$SERVER_JAR" ]; then
    echo "Server JAR not found. Please download a Minecraft server JAR file and place it as '$SERVER_JAR' in the minecraft-server directory."
    echo "You can download it from: https://www.minecraft.net/en-us/download/server"
    exit 1
fi

# Accept EULA if not already done
if [ ! -f "eula.txt" ]; then
    echo "eula=true" > eula.txt
    echo "EULA accepted automatically."
fi

# Start the server
echo "Starting Minecraft server with ${MEMORY} memory..."
java -Xmx${MEMORY} -Xms${MEMORY} -jar ${SERVER_JAR} nogui