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

  webServer: {
    // Served from the repository root, not frontend/: the pages reference
    // ../imagens/, which would 404 under a frontend-rooted server.
    command: 'python3 -m http.server 8080',
    url: 'http://127.0.0.1:8080/frontend/login.html',
    reuseExistingServer: !process.env.CI,
  },

  use: {
    ...devices['Desktop Chrome'],
    // Trailing slash matters: it makes page.goto('login.html') resolve inside
    // frontend/ instead of at the server root.
    baseURL: 'http://127.0.0.1:8080/frontend/',
    // Desktop default; tests that assert a narrower range override it.
    viewport: { width: 1440, height: 900 },
  },
});
