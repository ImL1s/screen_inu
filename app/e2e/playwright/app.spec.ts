import { test, expect, chromium, Browser, Page, BrowserContext } from '@playwright/test';

// Shared browser instance
let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
    console.log('Connecting to Tauri app via CDP...');
    // Retry connection logic (essential for CI/CD reliability)
    // CI machines can be slow to compile/launch the app
    for (let i = 0; i < 300; i++) {
        try {
            browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
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
    console.log(`Found ${pages.length} pages`);

    page = pages[0];

    if (!page) {
        page = await context.waitForEvent('page');
    }
});

test.afterAll(async () => {
    await browser?.close();
});

// Helper: Open settings modal
async function openSettings() {
    const settingsTitle = page.getByText(/settings|設定/i).first();
    // If already open, don't click again
    if (await settingsTitle.isVisible()) {
        return;
    }

    // Try multiple approaches to find settings button
    const settingsButton = page.locator('button').filter({ has: page.locator('svg.lucide-settings') });
    if (await settingsButton.count() > 0) {
        // force: true helps if a backdrop is still in the process of fading out
        await settingsButton.first().click({ force: true });
    } else {
        // Fallback: look for button with Settings icon by structure
        await page.locator('button:has(svg)').nth(-2).click({ force: true });
    }

    // Wait for modal to appear
    await expect(settingsTitle).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500); // Wait for animation
}

// Helper: Close settings modal
async function closeSettings() {
    const closeButton = page.locator('[aria-label="Close settings"]');
    if (await closeButton.count() > 0) {
        await closeButton.click({ force: true });
        // Wait for modal to be gone
        const settingsTitle = page.getByText(/settings|設定/i).first();
        await expect(settingsTitle).not.toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(500); // Wait for animation
    } else {
        // Fallback: use Escape key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
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
    test.beforeEach(async () => {
        // Ensure clean state (no modals open) before each test
        // This prevents "intercepts pointer events" errors if a previous test failed to close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

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
