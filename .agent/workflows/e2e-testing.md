---
description: E2E testing workflow for UI/UX features
---

# E2E Testing for UI/UX Features

**Rule: All new UI/UX features MUST have corresponding Playwright E2E tests.**

## When to Write E2E Tests

Write E2E tests for any feature that:
- Adds new UI components (buttons, modals, drawers)
- Modifies user interaction flows
- Adds new settings or configuration options
- Changes visual layout or navigation

## How to Add Tests

1. Open `app/e2e/playwright/app.spec.ts`

2. Add test in the appropriate `test.describe` block:
   - `Basic App` - Core app loading/display
   - `OCR Feature` - Capture, copy, translate
   - `Settings Modal` - Any settings-related UI
   - `History Feature` - History drawer functionality
   - `Integration` - Cross-component tests

3. Follow the pattern:
```typescript
test('should display [feature name]', async () => {
    // Cleanup state
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Navigate/interact
    await openSettings(); // if needed
    
    // Assert
    const element = page.getByText(/feature text/i);
    await expect(element).toBeVisible();
    
    // Cleanup
    await closeSettings(); // if needed
});
```

// turbo
4. Run tests locally:
```bash
cd app
npx playwright test --reporter=line
```

5. Verify all tests pass before committing.

## Test Naming Convention

- `should display [feature]` - Visibility tests
- `should open/close [component]` - Toggle tests
- `should have [capability]` - Feature availability tests

## CI/CD

Tests run automatically on GitHub Actions (Windows). See `.github/workflows/e2e.yml`.
