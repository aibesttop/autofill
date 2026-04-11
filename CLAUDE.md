# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a Chrome extension for AI-powered browser automation. It's organized as a monorepo with two distinct codebases:

1. **Root directory** - Legacy "autofill" extension (v2.1.0, older Vite-based setup)
2. **`demo/extension`** - Active development area using WXT framework and @page-agent packages (v1.5.7)

**Focus your work on `demo/extension`** - this is where new features and active development happen.

## Active Development: demo/extension

### Build Commands

```bash
cd demo/extension

# Development mode with hot module reload
npm run dev

# Production build
npm run build:ext

# Create distribution zip
npm run zip

# Install dependencies (required after git clone)
npm install
```

### Architecture Overview

The extension is built on **WXT** (Web Extension Tools) framework and integrates with **@page-agent** monorepo packages. The system enables AI agents to control multiple browser tabs for complex automation tasks.

#### Core Components

**Entry Points** (in `demo/extension/src/entrypoints/`):
- `background.ts` - Service worker handling message routing, tab management, and authentication
- `content.ts` - Content script that injects page controller and exposes agent API to web pages
- `main-world.ts` - Main-world script that provides `window.PAGE_AGENT_EXT` public API
- `sidepanel/` - React-based side panel UI

**Agent System** (in `demo/extension/src/agent/`):
- `MultiPageAgent.ts` - Core agent class extending `PageAgentCore` from `@page-agent/core`
- `TabsController.ts` - Manages browser tabs (open, close, switch, grouping)
- `RemotePageController.ts` - Communicates with page controllers across tabs via background service worker
- `tabTools.ts` - Custom tools for tab operations (open_new_tab, switch_to_tab, close_tab)
- `system_prompt.md` - Agent system prompt template

#### Message Flow Architecture

```
Web Page (window.PAGE_AGENT_EXT)
    ↓ postMessage
Content Script (isolated world)
    ↓ chrome.runtime.sendMessage
Background Service Worker
    ↓ chrome.tabs.scripting.executeScript
Page Controller (injected into target tab)
    ↓ DOM operations
Web Page Content
```

#### Key Design Patterns

**Message Types** (handled by background):
- `TAB_CONTROL` - Tab operations (get_active_tab, open_new_tab, close_tab, etc.)
- `PAGE_CONTROL` - Page automation commands (get_browser_state, click, type, etc.)
- `TAB_CHANGE` - Tab lifecycle events (created, updated, removed)

**Token-Based Authorization**:
- Extension generates unique auth token on install: `PageAgentExtUserAuthToken`
- Pages must store matching token in localStorage to access `window.PAGE_AGENT_EXT`
- Content script validates tokens before exposing agent API

**Multi-Tab Coordination**:
- Tabs are grouped automatically when agent opens new tabs
- TabsController tracks tab metadata (id, url, title, status)
- Current tab ID is stored in `chrome.storage.local` for cross-context access
- Agent waits for tab loading before executing operations

### Monorepo Package Dependencies

The extension imports from sibling @page-agent packages (via tsconfig path mappings):

```typescript
import { PageAgentCore } from '@page-agent/core'
import type { BrowserState } from '@page-agent/page-controller'
// etc.
```

These packages are located at:
- `demo/llms` - LLM integration layer
- `demo/page-controller` - Page automation primitives
- `demo/core` - Core agent logic
- `demo/ui` - Shared React components

**Important**: When working with this codebase, changes may need to be coordinated across these packages.

### Extension Configuration

**WXT Config** (`demo/extension/wxt.config.js`):
- Uses `@wxt-dev/module-react` for React support
- Tailwind CSS v4 via Vite plugin
- Chrome profile persistence in `.wxt/chrome-data`
- Manifest V3 with side panel support
- Permissions: tabs, tabGroups, sidePanel, storage, host_permissions: <all_urls>

**TypeScript Config** (`demo/extension/tsconfig.json`):
- Extends WXT's base tsconfig
- Path aliases: `@/*` maps to `demo/extension/src/*`
- Project references to @page-agent packages

### Public API

Web pages can integrate with the extension after setting auth token:

```typescript
localStorage.setItem('PageAgentExtUserAuthToken', 'your-token')

await window.PAGE_AGENT_EXT.execute('Click the login button', {
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-4o',
  onStatusChange: (status) => console.log(status),
  onActivity: (activity) => console.log(activity),
})
```

See `demo/extension/docs/extension_api.md` for full API documentation.

### Debugging

**Service Worker Logs**:
1. Open `chrome://extensions/`
2. Find "Page Agent" extension
3. Click "Service worker" link to open DevTools
4. Filter by prefixes: `[Background]`, `[TabsController]`, `[RemotePageController]`

**Content Script Logs**:
1. Open DevTools on any webpage where content script is injected
2. Filter by: `[Content]`, `[PageController]`

**Side Panel React DevTools**:
1. Open side panel (click extension icon)
2. Use React DevTools browser extension for component inspection

### Common Tasks

**Adding a new tab tool**:
1. Define tool in `demo/extension/src/agent/tabTools.ts` with Zod schema
2. Add to `createTabTools()` return object
3. Tool is automatically available to agent

**Modifying agent system prompt**:
- Edit `demo/extension/src/agent/system_prompt.md`
- Language is auto-detected based on browser locale (en-US or zh-CN)

**Adding background message handlers**:
- Add handler in `demo/extension/src/agent/RemotePageController.background.ts` or `TabsController.background.ts`
- Register in `demo/extension/src/entrypoints/background.ts`

### File Structure Highlights

```
demo/extension/
├── src/
│   ├── agent/                    # Agent system
│   │   ├── MultiPageAgent.ts     # Core agent class
│   │   ├── TabsController.ts     # Tab management
│   │   ├── RemotePageController.*  # Page control RPC
│   │   ├── tabTools.ts           # Tab control tools
│   │   └── system_prompt.md      # Agent instructions
│   ├── entrypoints/
│   │   ├── background.ts         # Service worker
│   │   ├── content.ts            # Content script
│   │   ├── main-world.ts         # Public API injection
│   │   └── sidepanel/            # React UI
│   ├── components/               # Shared React components
│   └── lib/                      # Utilities (db.ts for IndexedDB)
├── wxt.config.js                 # WXT configuration
└── package.json                  # v1.5.7
```

## Legacy Code (Root Directory)

The root directory contains older "autofill" extension code (v2.1.0) built with plain Vite. This code is not actively maintained. Focus new development on `demo/extension`.

## Development Notes

- **Framework**: WXT (modern Chrome extension framework)
- **UI**: React 19 with Tailwind CSS 4
- **Build**: Vite with HMR in dev mode
- **Type Safety**: TypeScript strict mode with Zod v4 for runtime validation
- **State Management**: Chrome storage API + IndexedDB (via idb package)
- **Agent Runtime**: Anthropic Claude API via @page-agent/llms

When making changes:
1. Check if changes affect sibling @page-agent packages
2. Test in both content script and side panel contexts
3. Verify message passing between contexts (page → content → background)
4. Ensure tab state updates propagate correctly via storage events
