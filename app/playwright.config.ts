import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/playwright',
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false, // Tauri runs as a single instance usually
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Avoid launching multiple app instances
    reporter: 'html',
    use: {
        actionTimeout: 0,
        trace: 'on-first-retry',
    },

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run tauri dev',
        url: 'http://localhost:1420', // We don't visit this, but Playwright waits for it
        reuseExistingServer: !process.env.CI,
        timeout: 300 * 1000,
        env: {
            // CRITICAL: This enables CDP on port 9222 for Tauri's WebView2
            WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222"
        }
    },
});
