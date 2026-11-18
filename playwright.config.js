// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Every acceptance criterion names the viewport it applies to ("WHILE the
 * viewport is narrower than 768px..."), so each test sets its own width with
 * page.setViewportSize(). Viewport projects would instead run every test at
 * every width, and a range-specific rule would fail in the other two ranges.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',

  // Playwright defaults to half the CPU count (4 here). Four headless Chromium
  // instances saturate this 6 GB WSL box and tests fail on timeout rather than
  // on behaviour. Two workers run the suite in ~35s with no flakiness.
  workers: 2,

  webServer: [
    {
      // Served from the repository root, not frontend/: the pages reference
      // ../imagens/, which would 404 under a frontend-rooted server.
      //
      // ThreadingHTTPServer rather than `python3 -m http.server`: the latter is
      // single-threaded, so parallel workers queue behind each other and tests
      // time out waiting for a page that is merely stuck in line.
      command: `python3 -c "from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler as H; ThreadingHTTPServer(('127.0.0.1', 8080), H).serve_forever()"`,
      url: 'http://127.0.0.1:8080/frontend/login.html',
      reuseExistingServer: !process.env.CI,
    },
    {
      // Mock API (AD-008). Same data file as `npm run api`, so a dev server
      // already on port 3000 is reused and serves the same catalogue.
      // preparar.js creates the git-ignored db.json from the seed when missing.
      command: 'node mock/preparar.js && npx json-server mock/db.json --port 3000 --host 127.0.0.1',
      url: 'http://127.0.0.1:3000/presets',
      reuseExistingServer: !process.env.CI,
    },
    {
      // Spring Boot API for registration and login (etapa06-front-spring-auth).
      // Users live in memory and are shared by every test, so tests that register
      // must use unique e-mails. The secret below is for tests only; real runs read
      // CORSINO_JWT_SECRET from the environment. The first start compiles the
      // project, hence the long timeout.
      command: 'cd backend && ./mvnw -q spring-boot:run',
      port: 8081,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { CORSINO_JWT_SECRET: 'test-only-secret-for-playwright-0123456789' },
    },
  ],

  use: {
    ...devices['Desktop Chrome'],
    // Trailing slash matters: it makes page.goto('login.html') resolve inside
    // frontend/ instead of at the server root.
    baseURL: 'http://127.0.0.1:8080/frontend/',
    // Desktop default; tests that assert a narrower range override it.
    viewport: { width: 1440, height: 900 },
  },
});
