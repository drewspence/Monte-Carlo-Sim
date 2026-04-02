# Monte Carlo Sim (Historical Analysis Mode)

This app runs rolling historical retirement withdrawal analysis (no random Monte Carlo draws).

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open `http://127.0.0.1:3000`.

## Scripts

- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - ESLint checks
- `npm test` - Vitest unit tests
- `npm run test:e2e` - Playwright end-to-end tests (headless)
- `npm run test:e2e:headed` - Playwright in headed mode
- `npm run test:e2e:debug` - Playwright debug mode
- `npm run test:e2e:install` - install Playwright Chromium browser

## Playwright notes

- The Playwright config starts the local app automatically on `http://127.0.0.1:3000` when no external base URL is provided.
- Browser artifacts are saved under `test-results/playwright`.
- Tests capture screenshots for key states by default. Set `PW_CAPTURE_SCREENSHOTS=0` to disable explicit screenshot capture.
