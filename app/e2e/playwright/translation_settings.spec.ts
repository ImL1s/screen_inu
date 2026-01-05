import { test, expect } from '@playwright/test';
import { Settings } from 'lucide-react';

const openSettings = async (page: any) => {
    // Assuming a settings button exists or using keyboard shortcut if implemented in web view
    // For now, let's assume we can trigger it or it's accessible.
    // Actually, in previous tests (app.spec.ts), we might have a helper.
    // Let's rely on finding the settings button by aria-label or icon.
    await page.getByRole('button', { name: 'settings' }).first().click(); // Open settings
};

test.describe('Translation Settings', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:1420');
    });

    test('should toggle translation engine', async ({ page }) => {
        // Open Settings
        await page.waitForTimeout(1000); // Wait for app load
        // Mock the settings button interaction - wait, how to open settings in main app?
        // In App.tsx: <button onClick={() => setShowSettings(true)} ... > <Settings ... /> </button>
        // It's usually in the footer or header.
        await page.getByRole('button', { name: /settings/i }).click();

        // Enable Translation (if not enabled)
        // Check if translation section is visible.
        // If "Enable Translation" toggle is off, turn it on.
        const enableToggle = page.getByRole('switch', { name: /enable translation/i });
        if (await enableToggle.getAttribute('aria-checked') === 'false') {
            await enableToggle.click();
        }

        // Verify Translation Engine section appears
        await expect(page.getByText('Translation Engine')).toBeVisible();

        const offlineBtn = page.getByRole('button', { name: /offline/i });
        const onlineBtn = page.getByRole('button', { name: /online/i });

        // Click Offline (Local AI)
        await offlineBtn.click();

        // Active button has bg-[#00ff88]
        await expect(offlineBtn).toHaveClass(/bg-\[#00ff88\]/);

        // Click Online
        await onlineBtn.click();
        await expect(onlineBtn).toHaveClass(/bg-\[#00ff88\]/);
    });

    test('should open translation model manager', async ({ page }) => {
        await page.locator('button:has(svg.lucide-settings)').click();

        const enableToggle = page.getByRole('switch', { name: /enable translation/i });
        if (await enableToggle.getAttribute('aria-checked') === 'false') {
            await enableToggle.click();
        }

        // Click "Manage Models"
        await page.getByRole('button', { name: /manage models/i }).click();

        // Verify Modal Opens using ID
        await expect(page.locator('#model-manager-title')).toBeVisible();

        // Close Model Manager
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(page.locator('#model-manager-title')).not.toBeVisible();
    });

    test('should perform online translation and display result', async ({ page }) => {
        // 1. Mock the translation API (LibreTranslate)
        await page.route('https://libretranslate.com/translate', async route => {
            const json = { translatedText: 'MOCK_TRANSLATION_RESULT' };
            await route.fulfill({ json });
        });

        // 2. Inject mock OCR result into localStorage
        // Inject mock OCR result into localStorage
        const mockHistory = [
            {
                id: '123',
                text: 'HELLO DOGE',
                timestamp: Date.now(),
                lang: 'en'
            }
        ];
        await page.addInitScript(mockHistory => {
            window.localStorage.setItem('ocr_history', JSON.stringify(mockHistory));
        }, mockHistory);

        await page.goto('http://localhost:1420');

        // 1. Open history
        const historyBtn = page.getByRole('button', { name: /bone/i }).first(); // Bone icon button
        await historyBtn.click();

        // 2. Select the item
        const historyItem = page.getByText('HELLO DOGE');
        await expect(historyItem).toBeVisible({ timeout: 10000 });
        await historyItem.click();

        // 3. Mock translation response
        await page.route('**/translate', async route => {
            const json = { translatedText: 'HELLO DOGE TRANSLATED' };
            await route.fulfill({ json });
        });

        // 4. Click Translate
        const translateBtn = page.getByRole('button', { name: /translate/i }).first();
        await translateBtn.click();

        // Wait for the main result area to show the text
        await expect(page.locator('#result-display')).toContainText('HELLO DOGE TRANSLATED', { timeout: 15000 });

        // 5. Verify Result
        await expect(page.getByText('HELLO DOGE TRANSLATED')).toBeVisible({ timeout: 15000 });
    });
});
