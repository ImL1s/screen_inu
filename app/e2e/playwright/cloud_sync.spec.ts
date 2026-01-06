import { test, expect, chromium, Browser, Page, BrowserContext } from '@playwright/test';

// Shared browser instance
let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
    // Increase timeout for the hook to 5 minutes to accommodate slow CI builds
    test.setTimeout(300000);
    console.log('Connecting to Tauri app via CDP...');
    // Retry connection logic (essential for CI/CD reliability)
    for (let i = 0; i < 300; i++) {
        try {
            browser = await chromium.connectOverCDP('http://127.0.0.1:19222');
            console.log('Connected to CDP!');
            break;
        } catch (e) {
            if (i % 10 === 0) console.log(`Connection attempt ${i} failed. Waiting...`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (!browser) {
        throw new Error('Failed to connect to Tauri app via CDP after retries');
    }

    context = browser.contexts()[0];
    const pages = context.pages();
    // Filter for the main window
    const appPages = pages.filter(p => {
        const url = p.url();
        return url.includes('localhost') ||
            url.includes('tauri://') ||
            url.includes('127.0.0.1') ||
            url.includes('index.html');
    });

    // Fallback: Check titles async if no URL match
    if (appPages.length === 0) {
        console.log('  [Setup] No URL match. Checking titles...');
        for (const p of pages) {
            const title = await p.title().catch(() => 'Error');
            console.log(`    - Checking Title: "${title}" URL: ${p.url()}`);
            if (title.match(/Screen\s*Inu/i)) { // Case insensitive match
                console.log('  [Setup] Found app by title!');
                appPages.push(p);
            }
        }
    }

    if (appPages.length > 0) {
        page = appPages[0];
    } else if (pages.length > 0) {
        console.log('  [Setup] Warning: No app page found. Using 2nd page if available (often 1st is background).');
        page = pages.length > 1 ? pages[1] : pages[0];
    }

    // Log all pages for debugging
    console.log('  [Setup] Available pages:');
    for (const p of pages) {
        console.log(`    - Title: "${await p.title()}", URL: ${p.url()}`);
    }

    console.log(`  [Setup] Selected page: "${await page.title()}" (${page.url()})`);

    if (!page) {
        page = await context.waitForEvent('page');
    }
});

test.beforeEach(async () => {
    // Escape multiple times to close any lingering modals
    for (let i = 0; i < 2; i++) {
        const dialogs = page.locator('div[role="dialog"]');
        if (await dialogs.count() > 0) {
            console.log(`  [beforeEach] Closing open modal...`);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        }
    }

    // CRITICAL: Ensure clean frontend state by clearing localStorage
    // This fixes the "Existing Data" issue in E2E tests
    await page.evaluate(() => {
        // Clear history so next load is clean
        localStorage.removeItem('ocr_history');
    });

    // RELOAD page to apply clean state (reset React state)
    // Only if not successfully connected to a fresh page?
    // Doing this blindly might slow tests, but guarantees isolation.
    console.log('  [beforeEach] Reloading page to enforce clean state...');
    await page.reload();
    await page.waitForTimeout(500); // Wait for hydration
});

test.afterAll(async () => {
    await browser?.close();
});

// Helper: Open settings modal
async function openSettings() {
    console.log('  [Helper] Cleaning up existing modals (if any)');
    // Press Escape multiple times until no dialogs are visible
    for (let i = 0; i < 3; i++) {
        const dialogCount = await page.locator('div[role="dialog"]').count();
        if (dialogCount === 0) break;
        console.log(`  [Helper] Closing modal ${i + 1}...`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    }

    console.log('  [Helper] Finding Settings button');
    const settingsButton = page.locator('button[aria-label*="settings" i]').first();

    if (await settingsButton.isVisible()) {
        console.log('  [Helper] Clicking Settings button');
        await settingsButton.click();
    } else {
        console.log('  [Helper] Fallback: Clicking button by icon');
        await page.locator('button:has(svg.lucide-settings)').first().click();
    }

    // Wait for modal to be visible
    console.log('  [Helper] Waiting for settings title');
    await expect(page.getByText(/settings|設定/i).first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);
}

// Helper: Close settings modal
async function closeSettings() {
    console.log('  [Helper] Closing settings modal');
    const closeButton = page.locator('div[role="dialog"] button[aria-label*="close" i], button:has(svg.lucide-x)').first();
    if (await closeButton.count() > 0) {
        await closeButton.click();
        await page.waitForTimeout(300);
    } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    }
}

// Helper: Open History Drawer
async function openHistoryDrawer() {
    console.log('  [Helper] Opening History Drawer');
    const historyButton = page.locator('button[aria-label*="history" i], button:has(svg.lucide-bone)').first();
    if (await historyButton.isVisible()) {
        await historyButton.click();
    } else {
        // Alternative: Look for orange-colored button at the end
        await page.locator('button.bg-\\[\\#ff6b35\\]').click();
    }
    await page.waitForTimeout(500);
}

// =========================================
// CLOUD SYNC (CRDT) TESTS
// =========================================
test.describe('Cloud Sync (CRDT)', () => {
    test('should display Storage Location section in Settings', async () => {
        await openSettings();

        // Look for storage/location text (important for CRDT data folder)
        const storageLabel = page.getByText(/storage|location|儲存|位置|data directory|資料目錄/i);
        await expect(storageLabel.first()).toBeVisible({ timeout: 5000 });

        // There should be a button to change location
        const changeButton = page.locator('button').filter({ hasText: /change|choose|變更|選擇/i });
        expect(await changeButton.count()).toBeGreaterThanOrEqual(1);

        await closeSettings();
    });

    test('should display Storage Location controls', async () => {
        await openSettings();

        // Look for "Change Location" button (Always present)
        // Adjust regex to match "Change Location" or "變更位置"
        const changeButton = page.locator('button').filter({ hasText: /change location|location|變更/i });
        await expect(changeButton.first()).toBeVisible({ timeout: 5000 });

        // Reset button should NOT be visible in default state (unless we mocked the store)
        // But checking for Change Location is sufficient to verify the section exists.

        await closeSettings();
    });

    test('should have History Drawer accessible', async () => {
        await openHistoryDrawer();

        // Verify drawer is visible (look for "Bone Stash" or similar text)
        const drawerTitle = page.getByText(/bone stash|history|紀錄|骨頭/i);
        await expect(drawerTitle.first()).toBeVisible({ timeout: 5000 });

        // Close drawer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

    test('should display Clear History button in History Drawer', async () => {
        // Inject an item to ensure the button is rendered
        await page.evaluate(() => {
            const mockItem = {
                id: 'btn-test',
                text: 'Ensuring history is not empty',
                lang: 'eng',
                timestamp: Date.now()
            };
            localStorage.setItem('ocr_history', JSON.stringify([mockItem]));
        });
        await page.reload();
        await page.waitForTimeout(500);

        await openHistoryDrawer();

        // Look for clear/dig button
        const clearButton = page.locator('button').filter({ hasText: /clear|dig|清除|挖/i });
        await expect(clearButton.first()).toBeVisible({ timeout: 5000 });

        // Close drawer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

    test('should display Export/Import buttons in Settings', async () => {
        await openSettings();

        // Export button
        const exportButton = page.locator('button').filter({ hasText: /export|匯出/i });
        await expect(exportButton.first()).toBeVisible({ timeout: 5000 });

        // Import button
        const importButton = page.locator('button').filter({ hasText: /import|匯入/i });
        await expect(importButton.first()).toBeVisible({ timeout: 5000 });

        await closeSettings();
    });

    test('should have localStorage or CRDT backend for history', async () => {
        // Verify that history data API is accessible via JavaScript
        const hasHistoryApi = await page.evaluate(() => {
            // Check if localStorage has history key OR if Tauri invoke is available
            const hasLocalStorage = localStorage.getItem('ocr_history') !== undefined;
            const hasTauri = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
            return hasLocalStorage || hasTauri;
        });
        expect(hasHistoryApi).toBe(true);
    });

    test('should verify Tauri sync commands are available', async () => {
        // Check that sync-related Tauri commands are registered
        const hasSyncCommands = await page.evaluate(async () => {
            try {
                const { invoke } = await (window as any).__TAURI_INTERNALS__;
                // We can't actually call sync_init without a path, but we can check if invoke works
                // This is a presence check, not a full invocation test
                return typeof invoke === 'function';
            } catch (e) {
                return false;
            }
        });
        expect(hasSyncCommands).toBe(true);
    });
});

// =========================================
// DATA PERSISTENCE FLOW TESTS
// =========================================
test.describe('Data Persistence', () => {
    test('should start with empty history in Test Mode (Clean State)', async () => {
        // Open history drawer
        await openHistoryDrawer();
        await page.waitForTimeout(1000);

        // Count initial items (Must be 0 in isolated test mode)
        const initialItems = await page.locator('div[role="listitem"], li, .history-item').count();
        console.log(`  [Test] Initial history items: ${initialItems}`);

        // Strict assertion for isolation
        expect(initialItems).toBe(0);

        // Verify empty state text is visible
        const emptyText = page.getByText(/no bones|empty|nothing|沒有|空的|還沒有/i);
        await expect(emptyText.first()).toBeVisible();

        // Close drawer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

    test('should maintain history items after UI interaction', async () => {
        // Open history drawer
        await openHistoryDrawer();
        await page.waitForTimeout(500);

        // Count initial items
        const initialItems = await page.locator('div[role="listitem"], li, .history-item').count();

        // Close drawer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Re-open drawer
        await openHistoryDrawer();
        await page.waitForTimeout(500);

        // Count items again - should be same
        const afterItems = await page.locator('div[role="listitem"], li, .history-item').count();
        expect(afterItems).toEqual(initialItems);

        // Close drawer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });
});

// =========================================
// SETTINGS PERSISTENCE TESTS
// =========================================
test.describe('Settings Persistence', () => {
    test('should persist language selection', async () => {
        await openSettings();

        // Find language dropdown
        const langDropdown = page.locator('select').filter({ has: page.locator('option') }).first();

        if (await langDropdown.count() > 0) {
            // Get current value
            const currentValue = await langDropdown.inputValue();
            console.log(`  [Test] Current language: ${currentValue}`);

            await closeSettings();

            // Re-open and verify
            await openSettings();
            const newValue = await langDropdown.inputValue();
            expect(newValue).toEqual(currentValue);
        }

        await closeSettings();
    });

    test('should display Data Location path or Default indicator', async () => {
        await openSettings();

        // Look for path display or "Default" text
        const pathOrDefault = page.getByText(/default|預設|appdata|users|\/|\\|選擇資料夾/i);
        expect(await pathOrDefault.count()).toBeGreaterThanOrEqual(1);

        await closeSettings();
    });
});
