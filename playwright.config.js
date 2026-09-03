// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * The three projects are the three viewport ranges the spec defines: below
 * 768px, 768-1023px, and 1024px up. Every test runs once per range, so a rule
 * that only holds on one screen size fails the other two.
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
    // Trailing slash matters: it makes page.goto('login.html') resolve inside
    // frontend/ instead of at the server root.
    baseURL: 'http://127.0.0.1:8080/frontend/',
  },

  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
