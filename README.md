# Pragati AI

Pragati is a Student Study OS foundation with a React/Vite client and a minimal Express API.

## Requirements

- Node.js 20+
- npm

## Setup

```bash
npm install
```

Copy the environment examples when needed:

```bash
copy client\\.env.example client\\.env
copy server\\.env.example server\\.env
```

## Run

Start both workspaces:

```bash
npm run dev
```

The client runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.
The health check is available at `http://localhost:5000/api/health`.

## Checks

```bash
npm run build
npm run lint
```

This setup intentionally contains only the marketing skeleton and health endpoint. Auth, dashboard, study vault, roadmap, AI mentor, database, and AI calls are not included.
