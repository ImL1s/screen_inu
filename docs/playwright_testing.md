# Testing Screen Inu with Playwright

Playwright E2E tests for the Tauri application using CDP (Chrome DevTools Protocol) to connect to the WebView2 instance.

## Current Test Coverage (13 Tests)

| Category | Test | Description |
|----------|------|-------------|
| **Basic App** | should load main interface | App root renders |
| **Basic App** | should display app title | SCREEN INU title visible |
| **OCR Feature** | should display main capture area | Main capture button area |
| **OCR Feature** | clipboard API available | Copy functionality support |
| **OCR Feature** | Tauri API available | OCR backend accessible |
| **Settings Modal** | open and close | Modal toggle works |
| **Settings Modal** | Data Management | Export/Import buttons exist |
| **Settings Modal** | Storage Location | Custom data location UI ✨ |
| **Settings Modal** | OCR Engine selection | Engine dropdown exists |
| **Settings Modal** | Clear History button | Clear button exists |
| **History Feature** | history button accessible | History drawer trigger |
| **Integration** | main content area | Main layout correct |
| **Integration** | language selector | Language dropdown exists |

## Setup

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## File Structure

```
app/
├── e2e/
│   ├── playwright/
│   │   └── app.spec.ts   # Playwright tests
│   ├── specs/            # WebdriverIO tests (legacy)
│   └── wdio.conf.js
├── playwright.config.ts
└── .github/workflows/e2e.yml
```

## Run Tests

```bash
npx playwright test              # Run all tests
npx playwright test --reporter=line  # With line output
npx playwright show-report       # View HTML report
```

## Configuration (`playwright.config.ts`)

Key settings:
- `testDir: './e2e/playwright'` - Isolated from WebDriverIO
- `webServer.command: 'npm run tauri dev'` - Auto-launch app
- `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222"` - Enable CDP

## Writing New Tests

When adding UI/UX features, add corresponding E2E tests:

```typescript
test('should display new feature UI', async () => {
    // 1. Ensure clean state
    await page.keyboard.press('Escape');
    
    // 2. Navigate/interact
    await openSettings();
    
    // 3. Assert visibility
    const newFeature = page.getByText(/new feature/i);
    await expect(newFeature).toBeVisible();
    
    // 4. Cleanup
    await closeSettings();
});
```

## CI/CD

Tests run automatically on push/PR via `.github/workflows/e2e.yml` on Windows.
