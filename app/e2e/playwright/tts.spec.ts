import { test, expect, chromium, Browser, Page, BrowserContext } from '@playwright/test';

// Shared browser instance
let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
    test.setTimeout(300000); // 5 min setup timeout
    console.log('[Setup] Connecting to Tauri app via CDP...');
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
        throw new Error('Failed to connect to Tauri app via CDP');
    }

    context = browser.contexts()[0];
    const pages = context.pages();

    // Select correct page
    page = pages.find(p => p.url().includes('localhost') || p.url().includes('tauri://') || p.url().includes('index.html')) || pages[0];

    if (!page) {
        page = await context.waitForEvent('page');
    }

    console.log(`[Setup] Selected page: "${await page.title()}"`);
});

test.afterAll(async () => {
    await browser?.close();
});

test.beforeEach(async () => {
    // Clean up modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
});

test.describe('TTS Feature', () => {
    test('should verify TTS button visibility via history item load', async () => {
        // 1. Inject Mock History Item
        console.log('[Test] Injecting mock history item...');
        await page.evaluate(() => {
            const mockItem = {
                id: 'tts-test-item',
                text: 'Hello World. This is a test.',
                lang: 'eng',
                timestamp: Date.now()
            };
            // Key from utils/history.ts
            localStorage.setItem('ocr_history', JSON.stringify([mockItem]));
        });

        // 2. Open History Drawer
        await page.reload();
        await page.waitForTimeout(1000);

        // Clicking the "Bone Stash" / History button
        console.log('[Test] Opening History Drawer...');

        // The button has a Bone icon
        const historyBtn = page.locator('button:has(svg.lucide-bone), button[title*="BONE"], button[title*="骨頭"]');

        await expect(historyBtn.first()).toBeVisible({ timeout: 5000 });
        await historyBtn.first().click();

        await page.waitForTimeout(500);

        // 3. Click the history item
        console.log('[Test] Clicking history item...');
        const historyItem = page.getByText('Hello World. This is a test.');
        await expect(historyItem).toBeVisible({ timeout: 5000 });
        await historyItem.click();

        // 4. Verify Result View & TTS Button
        console.log('[Test] Verifying TTS button...');
        await page.screenshot({ path: 'e2e-tts-result-view.png' });

        // Use SVG icon selector for robustness: Volume2 (normal) or VolumeX (muted/active?)
        // In our code: isSpeaking ? VolumeX : Volume2
        const speakerButton = page.locator('button:has(svg.lucide-volume-2), button:has(svg.lucide-volume-x)');
        await expect(speakerButton).toBeVisible({ timeout: 10000 });

        // 5. Verify Click Interaction (Start/Stop)
        console.log('[Test] Clicking Speak...');
        await speakerButton.click();

        // Check if icon changed to Stop (VolumeX) and bg became orange
        await page.waitForTimeout(500);
        await expect(speakerButton).toHaveClass(/bg-\[#ff6b35\]/); // Orange bg when active

        console.log('[Test] Clicking Stop...');
        await speakerButton.click();
        await page.waitForTimeout(500);
        await expect(speakerButton).not.toHaveClass(/bg-\[#ff6b35\]/); // White bg (or hover) when inactive
    });
});
