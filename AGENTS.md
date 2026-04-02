<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repo quickstart for Codex

- Install dependencies: `npm install`
- Run app locally: `npm run dev` (default URL: `http://127.0.0.1:3000`)
- Run unit tests: `npm test`
- Run lint: `npm run lint`
- Build production bundle: `npm run build`
- Run Playwright E2E tests: `npm run test:e2e`
- Install Playwright Chromium browser when network allows: `npm run test:e2e:install`

## Browser testing expectations

- Use Playwright browser tests to verify UI changes whenever feasible.
- Capture screenshots for key states (initial load, validation errors, successful analysis/results) when the environment supports it.
- If screenshot or browser installation is blocked by environment/network policy, still run the rest of the test stack and report the limitation clearly.
