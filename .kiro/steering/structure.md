---
inclusion: always
---

# Project Structure

## Directory Organization

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── WelcomePage.tsx
│   │   ├── ProjectSelection.tsx
│   │   ├── ServerManagement.tsx
│   │   └── ConfigurationManagement.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useLanguage.ts
│   ├── lib/                # Utilities and helpers
│   │   ├── i18n.ts        # Internationalization
│   │   └── utils.ts       # Utility functions (cn helper)
│   ├── services/           # Backend service layer
│   │   ├── types.ts       # TypeScript type definitions
│   │   ├── serverService.ts
│   │   ├── serverFileService.ts
│   │   └── configService.ts
│   ├── App.tsx            # Main application component
│   ├── frontend.tsx       # Frontend entry point
│   ├── index.ts           # Backend server entry point
│   ├── index.html         # HTML template
│   └── index.css          # Global styles
├── server/                # Persistent server data (mounted volume)
├── serverfiles/           # Uploaded server ZIP files
├── styles/
│   └── globals.css        # Tailwind CSS configuration
├── build.ts               # Custom build script
├── Dockerfile             # Container configuration
└── components.json        # shadcn/ui configuration
```

## Architecture Patterns

### Frontend-Backend Split

- **Backend**: `src/index.ts` - Bun server with route-based API handlers
- **Frontend**: `src/frontend.tsx` - React application entry point
- **Shared Types**: `src/services/types.ts` - Type definitions used across frontend/backend

### Component Organization

- **Page Components**: Top-level views (WelcomePage, ProjectSelection, ServerManagement)
- **UI Components**: Reusable shadcn/ui components in `src/components/ui/`
- **Service Layer**: API interaction logic isolated in `src/services/`

### State Management

- App-level state managed in `App.tsx` with useState
- State flow: `loading` → `welcome` → `projects` → `server`
- No external state management library (React built-in hooks only)

### API Routes

All API endpoints follow the pattern `/api/{resource}/{action}`:

- `/api/servers` - List servers
- `/api/serverfiles` - Manage server files
- `/api/config/*` - Configuration management
- `/api/server/*` - Server lifecycle operations

### Path Aliases

Use `@/` prefix for imports from `src/`:

```typescript
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
```

## Persistent Data

- `server/` - Minecraft server instances (Docker volume mount)
- `serverfiles/` - Uploaded ZIP files for server creation
