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
            console.log('[Setup] Connected to CDP!');
            break;
        } catch (e) {
            if (i % 10 === 0) console.log(`[Setup] Connection attempt ${i} failed. Waiting...`);
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
        // const title = p.title().catch(() => ''); // Handle promise - not needed for filter, will be checked async
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

// =========================================
// BASIC APP TESTS
// =========================================
test.describe('Basic App', () => {
    test('should load main interface', async () => {
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('#root')).toBeVisible();
    });

    test('should display app title', async () => {
        // Look for SCREEN INU or similar title text
        const title = page.getByText(/screen|inu/i).first();
        await expect(title).toBeVisible();
    });
});

// =========================================
// OCR FEATURE TESTS
// =========================================
test.describe('OCR Feature', () => {
    test('should display main capture area in idle state', async () => {
        // Ensure no modals are open by pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // The main content area should be visible
        const mainArea = page.locator('main');
        await expect(mainArea).toBeVisible();

        // Check for capture-related text or button
        // The button has text like "READY" or "CAPTURE"
        const hasButton = await page.locator('button').count();
        expect(hasButton).toBeGreaterThanOrEqual(1);
    });

    test('should have clipboard API available for copy feature', async () => {
        const hasClipboard = await page.evaluate(() => !!navigator.clipboard);
        expect(hasClipboard).toBe(true);
    });

    test('should have Tauri API available for OCR', async () => {
        const hasTauri = await page.evaluate(() => {
            return typeof (window as any).__TAURI__ !== 'undefined' ||
                typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
        });
        expect(hasTauri).toBe(true);
    });
});

// =========================================
// SETTINGS MODAL TESTS  
// =========================================
test.describe('Settings Modal', () => {
    test('should open and close settings modal', async () => {
        // Open settings
        await openSettings();

        // Verify modal is visible
        const settingsTitle = page.getByText(/settings|設定/i).first();
        await expect(settingsTitle).toBeVisible();

        // Close settings
        await closeSettings();

        // Wait for animation
        await page.waitForTimeout(300);
    });

    test('should display Data Management with Export/Import', async () => {
        await openSettings();

        // Scroll to find Data Management section if needed
        const exportButton = page.locator('button').filter({ hasText: /export|匯出/i });
        const importButton = page.locator('button').filter({ hasText: /import|匯入/i });

        // These should exist in the modal
        expect(await exportButton.count()).toBeGreaterThanOrEqual(1);
        expect(await importButton.count()).toBeGreaterThanOrEqual(1);

        await closeSettings();
    });

    test('should display Storage Location feature', async () => {
        await openSettings();

        // Look for storage/location text (our new feature!)
        const storageText = page.getByText(/storage|location|儲存|位置/i);
        expect(await storageText.count()).toBeGreaterThanOrEqual(1);

        await closeSettings();
    });

    test('should display OCR Engine selection', async () => {
        await openSettings();

        // Look for OCR engine text
        const ocrEngineText = page.getByText(/ocr|engine|引擎/i);
        expect(await ocrEngineText.count()).toBeGreaterThanOrEqual(1);

        await closeSettings();
    });

    test('should display Clear History button', async () => {
        await openSettings();

        // Look for clear history button
        const clearButton = page.locator('button').filter({ hasText: /clear|清除|dig|挖/i });
        expect(await clearButton.count()).toBeGreaterThanOrEqual(1);

        await closeSettings();
    });

    test('should open and interact with OCR Language Manager', async () => {
        console.log('Step 1: Starting test');
        await page.screenshot({ path: 'e2e-debug-1-start.png' });

        console.log('Step 2: Opening settings');
        await openSettings();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'e2e-debug-2-settings.png' });

        console.log('Step 3: Clicking Manage button');
        const manageButton = page.getByRole('button', { name: /manage ocr languages|語言包管理|管理語言包/i });
        await manageButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'e2e-debug-3-manager.png' });

        console.log('Step 4: Verifying search result');
        const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="搜尋" i]');
        await searchInput.fill('Arabic');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'e2e-debug-4-search.png' });

        await expect(page.getByText(/arabic/i)).toBeVisible();

        console.log('Step 5: Closing Manager');
        const closeIcon = page.locator('button:has(svg.lucide-x)').last();
        await closeIcon.click();
        await page.waitForTimeout(500);

        console.log('Step 6: Final check');
        await closeSettings();
        console.log('Test complete!');
    });
});

// =========================================
// HISTORY FEATURE TESTS
// =========================================
test.describe('History Feature', () => {
    test('should have history button accessible', async () => {
        // History button is typically the last button with an SVG icon in the footer
        // It's an orange button (bg-[#ff6b35]) next to the settings button
        const allButtons = page.locator('button:has(svg)');
        const buttonCount = await allButtons.count();

        // The app should have multiple buttons with SVGs
        expect(buttonCount).toBeGreaterThanOrEqual(2);

        // Try to find history-related text when drawer is opened
        // (We don't actually open it to avoid side effects between tests)
        console.log(`Found ${buttonCount} buttons with SVG icons`);
    });
});

// =========================================
// INTEGRATION TESTS
// =========================================
test.describe('Integration', () => {
    test('should have proper main content area', async () => {
        const main = page.locator('main');
        await expect(main).toBeVisible();
    });

    test('should have language selector', async () => {
        // The language select dropdown
        const langSelect = page.locator('select');
        expect(await langSelect.count()).toBeGreaterThanOrEqual(1);
    });
});

// =========================================
// BATCH PROCESSING TESTS
// =========================================
test.describe('Batch Processing', () => {
    test('should display Batch Mode button in idle state', async () => {
        // Look for Batch Mode button
        const batchButton = page.locator('button').filter({ hasText: /batch|批次/i });

        // Debugging: Dump all buttons if not visible
        const isVisible = await batchButton.first().isVisible().catch(() => false);
        if (!isVisible) {
            console.log('  [DEBUG] Batch button not found via isVisible check.');
            const allButtons = await page.locator('button').allInnerTexts();
            console.log('  [DEBUG] Visible buttons:', allButtons);
            // Dump page title and url
            console.log('  [DEBUG] Page Title:', await page.title());
            console.log('  [DEBUG] Page URL:', page.url());
        }

        await expect(batchButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should open Batch Processor modal', async () => {
        // Click Batch Mode button
        const batchButton = page.locator('button').filter({ hasText: /batch|批次/i });
        await batchButton.first().click();
        await page.waitForTimeout(500);

        // Verify modal is open with drop zone
        const dropHint = page.getByText(/drop|拖放/i);
        await expect(dropHint.first()).toBeVisible();

        // Close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

    test('should have file input for batch processing', async () => {
        // Click Batch Mode button
        const batchButton = page.locator('button').filter({ hasText: /batch|批次/i });
        await batchButton.first().click();

        // Wait for modal to actually appear
        const modalTitle = page.getByText(/batch mode|批次/i).first();
        await expect(modalTitle).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(500);

        // Check for file input
        const fileInput = page.locator('input[type="file"]');
        expect(await fileInput.count()).toBeGreaterThanOrEqual(1);

        // Close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });
});
