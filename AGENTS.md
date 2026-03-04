# AGENTS.md - Agentic Coding Guidelines for electron-temu

## Project Overview
- **Type**: Electron + Vue 2 desktop application (Temu seller tool)
- **Main entry**: `main.js` (Electron), `src/main.js` (Vue renderer)
- **Backend**: Express server in Electron main process (`background/`)

---

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start Electron app in dev mode |
| `npm run serve` | Run Vue dev server only |
| `npm run inspect` | Start with debugging port 9229 |
| `npm run build` | Build Vue frontend (outputs to dist/) |
| `npm run package` | Package Electron app (outputs to out/) |
| `npm run make` | Create Windows installer |
| `npm run lint` | Run ESLint on Vue/JS files |

> **Testing**: No test framework configured. Do not add tests unless explicitly requested.

---

## Code Style

### Language & Framework
- JavaScript (ES6+), no TypeScript
- Vue 2 with Options API (NOT Composition API)
- Vuex for state management

### ESLint
- Extends: `plugin:vue/essential`, `eslint:recommended`
- Parser: `@babel/eslint-parser`
- Disabled: `vue/multi-word-component-names`, `no-unused-vars`, `no-unreachable`

### Imports
```javascript
// Background (Node main) - use module-alias
require('~express/init')
require('~/model')

// Frontend (Vue) - use @ alias
import store from '@/store'
```
- `~` = `background/`, `@` = `src/`

### Naming
- Files: camelCase (JS), PascalCase (Vue components)
- Variables/Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase
- Vuex modules: lowercase, namespaced

### Formatting
- 2 spaces indentation, no semicolons, single quotes
- Prefer const/let over var
- Use arrow functions for callbacks, destructure objects

### Vue Components
- Options API with `mapState`/`mapActions` from vuex
- Props should have type definitions
- Use `this.$emit` for parent communication

---

## Error Handling

### Express Routes
```javascript
async function handler(req, res, next) {
  try {
    const result = await someAsyncOperation()
    res.json({ code: 0, data: result })
  } catch (error) {
    next(error)
  }
}
```

### IPC Handlers
```javascript
customIpc.handle('channel:name', async (args) => {
  try {
    return await operation()
  } catch (error) {
    return { error: error.message }
  }
})
```

- Wrap async operations in try/catch
- Use `Promise.all` for parallel operations

---

## Backend Express Patterns

### Structure
- Handlers: `background/express/controllers/`
- Routes: `background/express/api/`
- Middleware: `background/express/middleware/`

### Response Format
```javascript
{ code: 0, message: 'success', data: result }
// Error: { code: 1, message: 'error message' }
```

### Database
- Sequelize ORM with SQLite3
- Models: `background/model/`, DB: `background/model/temu/db.js`

---

## Project Structure
```
electron-temu/
├── main.js           # Electron main entry
├── preload.js        # Preload script
├── src/              # Vue renderer (frontend)
│   ├── components/  # Vue components
│   ├── views/       # Page components
│   ├── router/      # Vue Router
│   ├── store/       # Vuex store
│   └── service/     # API services
├── background/      # Express backend
│   ├── express/    # Routes, controllers, middleware
│   ├── model/      # Sequelize models
│   ├── store/      # App state
│   └── utils/      # Backend utilities
└── public/         # Static assets
```

---

## Common Patterns

### IPC Communication
```javascript
// Main process
const { customIpc } = require('~/utils/event')
customIpc.handle('channel:name', async (args) => { /* ... */ })

// Renderer
window.electronAPI.invoke('channel:name', args)
```

### HTTP Requests (main process)
```javascript
const response = await axios({ url, method, data, headers })
```

### Vuex Store Module
```javascript
export default {
  namespaced: true,
  state: {},
  mutations: {},
  actions: {
    asyncAction({ commit }, payload) { /* ... */ }
  },
  getters: {}
}
```

---

## Dependencies (avoid adding new ones)
- **Frontend**: vue, vue-router, vuex
- **Backend**: express, sequelize, sqlite3, axios, lodash, dayjs
- **Electron**: electron, electron-forge
- **Build**: @vue/cli-service, @babel/core

---

## Important Notes
- Electron app with Vue 2 renderer + Express backend in main process
- Security relaxed for dev (CORS disabled, web security off)
- Acts as proxy for Temu seller operations
- No test framework - do not add tests without explicit request
