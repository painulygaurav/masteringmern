# Vite Project Setup — Quick Notes

## What is Vite?

A fast build tool/dev server for frontend projects. It serves your code instantly during development (no bundling every file upfront) and bundles everything efficiently for production using Rollup under the hood. It replaced older, slower setups like Create React App.

## What each prompt means

- **install create-vite@9.2.1** — npm needs to download the scaffolding tool itself (since you don't have it installed) before it can generate your project. One-time download, cached after.
- **Select framework: React** — which UI library's starter template to use (React vs Vue, Svelte, etc.). Just picks the template files.
- **Select a variant: JavaScript** — plain `.jsx` files vs `.tsx` (TypeScript). You chose plain JS, so no type-checking, just regular JavaScript syntax.
- **Which linter to use? eslint** — a code-quality tool that flags likely bugs/style issues (unused vars, missing deps in hooks, etc.) as you write code. Doesn't affect how the app runs.

## What happens after

Vite generates a folder (`first-app/`) with a minimal React app already wired up. Then you run:

\```
cd first-app
npm install
npm run dev
\```

`npm install` pulls in React and Vite's dependencies; `npm run dev` starts the local dev server (usually `http://localhost:5173`).
