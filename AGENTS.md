# Repository Guidelines

## Project Structure & Module Organization

This application manages Minecraft servers using Bun, React 19, TypeScript, and Tailwind CSS 4.

- `src/index.ts` defines the Bun HTTP server and API routes; `src/frontend.tsx` and `src/App.tsx` initialize the UI.
- `src/components/` contains feature components; `server/` holds server-management components and `ui/` contains shared UI primitives.
- `src/hooks/` contains React hooks. `src/services/` handles server processes, files, configuration, metadata, and Java management.
- `src/lib/` contains utilities and German/English translations. Styles live in `src/index.css` and `styles/globals.css`.
- `server/` stores runtime server data; `serverfiles/` stores uploaded archives. Neither is a source or test-fixture directory.
- `scripts/test-environment.ts` launches container validation; `docs/` contains feature documentation. Generated assets go to `dist/`.

## Build, Test, and Development Commands

Run commands from the repository root. Install Bun; running Minecraft servers also requires a compatible Java version (Java 21 is documented).

- `bun install --frozen-lockfile`: install dependencies from `bun.lock` without changing it.
- `bun run dev`: start the application with hot reload at `http://localhost:3000`.
- `bun run build`: bundle frontend assets using `build.ts` and the Tailwind plugin.
- `bun run start`: run the Bun server in production mode.
- `bun run test:environment`: install dependencies, build, and launch the Compose environment, preferring Podman over Docker. Stop with `Ctrl+C`.
- `docker compose -f docker-compose.test.yml down`: remove the test containers and network; substitute `podman` when appropriate.

## Coding Style & Naming Conventions

Follow existing two-space indentation, double quotes, and semicolons. Keep TypeScript strict and use explicit interfaces or types for component props and service contracts. Use PascalCase for React components, `useCamelCase` for hooks, and camelCase for functions and service filenames. Use the `@/` alias for imports under `src/`. Add localized UI text to `src/lib/i18n.ts` for both languages. No formatter or linter is configured; avoid unrelated reformatting.

## Testing Guidelines

No automated unit-test framework, test naming convention, or coverage threshold is configured. The environment command is a build-and-run smoke check. For changes, build and manually verify affected workflows, including upload, creation, start/stop, logs, and configuration as relevant. Record verification steps and platform details in the PR.

## Commit & Pull Request Guidelines

Follow the observed scoped Conventional Commit pattern, such as `feat(server-management): Add start-file selection`. Keep commits focused. PRs should explain behavior changes, link relevant issues, list verification results, and include screenshots for UI changes. Never commit secrets, uploaded archives, generated builds, or runtime worlds.
