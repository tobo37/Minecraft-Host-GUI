---
inclusion: always
---

# Product Overview

This is a Minecraft Server Management Interface - a modern web application for managing Minecraft servers through an intuitive web UI.

## Core Features

- Server lifecycle management (start, stop, monitor)
- Real-time server log viewing with syntax highlighting
- Configuration file editing through web interface
- Multi-project support (manage multiple server instances)
- Drag & drop ZIP file upload for server files
- Persistent data storage (survives container restarts)
- Multi-language support (German and English)

## Target Deployment

- Containerized deployment with Docker
- Persistent volumes for server data (`/app/server`)
- Exposed ports: 3000 (web UI), 25565 (Minecraft server)
- Designed for both local development and production container environments
