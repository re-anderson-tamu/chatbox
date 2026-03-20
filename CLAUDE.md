# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Project

A fork of [Chatbox](https://github.com/chatboxai/chatbox) customized for Texas A&M Natural Resources Institute. It is an Electron + React desktop AI chat client supporting multiple LLM providers (OpenAI, Claude, Gemini, Azure, etc.), MCP tool integration, and RAG via a knowledge base.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Electron app in development mode
pnpm build            # Build all processes (main, preload, renderer)
pnpm package          # Build + create installer for current platform
pnpm build:web        # Build web-only version

pnpm lint             # Lint with Biome
pnpm lint:fix         # Auto-fix lint issues
pnpm check            # TypeScript type check (tsc --noEmit)
pnpm format           # Format with Biome

pnpm test             # Run unit tests (Vitest)
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
```

## Architecture

This is a standard Electron three-process app:

- **`src/main/`** — Node.js main process. Handles window management, IPC handlers, file system, auto-update, MCP stdio transport, and knowledge base initialization.
- **`src/preload/`** — Security bridge. Exposes `window.electronAPI` to the renderer via `contextBridge`.
- **`src/renderer/`** — React 18 UI. Contains all pages, components, state, and hooks.
- **`src/shared/`** — Types, constants, and utilities shared between main and renderer.

## Renderer Internals

- **Routing:** TanStack Router v1 with file-based routes in `src/renderer/routes/`
- **State:** Jotai atoms in `src/renderer/stores/atoms/`; chat/session logic in `src/renderer/stores/chatStore.ts`
- **UI:** Mantine 7 component library + Tailwind CSS
- **AI calls:** Vercel AI SDK (`ai` package) with `@ai-sdk/*` provider packages

## Build Targets

Set environment variables to target different platforms:
- Desktop (default): `pnpm dev` / `pnpm build`
- Web: `CHATBOX_BUILD_PLATFORM=web pnpm build:web`
- Mobile: `CHATBOX_BUILD_TARGET=mobile_app CHATBOX_BUILD_PLATFORM=ios|android`

## Tooling

- Package manager: **pnpm** (do not use npm or yarn)
- Linter/formatter: **Biome** (not ESLint/Prettier — the `.eslintrc.js` is legacy)
- Build tool: **electron-vite** wrapping Vite
- Tests: **Vitest** — test files live alongside source or in `test/`
