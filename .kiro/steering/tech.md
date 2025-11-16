---
inclusion: always
---

# Technology Stack

## Runtime & Build System

- **Runtime**: Bun (v1.1.34+)
- **Build Tool**: Custom build script (`build.ts`) using Bun's native bundler
- **Package Manager**: Bun

## Frontend Stack

- **Framework**: React 19
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **UI Components**: shadcn/ui (New York style)
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge, class-variance-authority

## Backend

- **Server**: Bun native HTTP server
- **API**: RESTful endpoints with route-based handlers
- **File Operations**: Native Bun file system APIs

## Development Configuration

- **Module System**: ESNext with `module: "Preserve"`
- **Module Resolution**: Bundler mode
- **JSX**: React JSX transform
- **Path Aliases**: `@/*` maps to `./src/*`
- **Strict TypeScript**: Enabled with additional safety checks

## Common Commands

```bash
# Install dependencies
bun install

# Development server (with hot reload)
bun dev

# Production server
bun start

# Build for production
bun run build

# Code quality
bun lint              # Check for linting errors
bun lint:fix          # Auto-fix linting errors

# Docker build
docker build -t minecraft-server-manager .

# Docker run with persistent data
docker run -d --name minecraft-manager -p 3000:3000 -p 25565:25565 -v $(pwd)/server:/app/server minecraft-server-manager
```

## Code Quality Tools

- **ESLint**: Configured with TypeScript, React, and React Hooks plugins
- **Rules**: Enforces max file size (300 lines), max function size (50 lines), complexity limits
- **Auto-fix**: Many issues can be automatically fixed with `bun lint:fix`

## Key Dependencies

- `@radix-ui/*`: Accessible UI primitives
- `lucide-react`: Icon library
- `bun-plugin-tailwind`: Tailwind CSS integration for Bun
- `tw-animate-css`: Animation utilities for Tailwind
