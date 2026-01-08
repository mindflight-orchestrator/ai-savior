# Playwright Tests for Chrome Extension

This directory contains end-to-end tests for the AI Saver Chrome Extension using Playwright.

## Prerequisites

1. **Build the extension first**:
   ```bash
   npm run build
   ```
   This creates the `chrome_extension/dist` folder that Playwright will load.

2. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see the browser)
```bash
npm run test:headed
```

### Debug tests
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/popup.spec.ts
```

### Run tests in a specific browser
```bash
npx playwright test --project=chromium-extension
```

## Test Structure

- `extension-loading.spec.ts` - Tests that the extension loads correctly
- `popup.spec.ts` - Tests the popup UI and functionality
- `content-script.spec.ts` - Tests content script injection and extraction
- `storage.spec.ts` - Tests IndexedDB and chrome.storage operations
- `helpers/extension-helpers.ts` - Utility functions for working with extensions

## Important Notes

### Headless Mode
**Chrome extensions do NOT work in headless mode**. The Playwright config sets `headless: false` automatically. If you see tests failing, make sure you're not forcing headless mode.

### Extension Loading
The extension is loaded via Chrome's `--load-extension` flag. The path is automatically resolved to `chrome_extension/dist`.

### Service Workers
Testing service workers is tricky because they're isolated. The helper functions provide utilities to:
- Get the extension ID
- Access the popup page
- Execute code in service worker context (limited)

### Content Scripts
Content scripts are tested by:
1. Navigating to a target page (e.g., chat.openai.com)
2. Waiting for the script to inject
3. Verifying it can access the DOM and communicate with the service worker

## Writing New Tests

### Example: Testing a new feature

```typescript
import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup } from './helpers/extension-helpers';
import path from 'path';

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const extensionPath = path.resolve(__dirname, '../chrome_extension/dist');
  
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  
  extensionId = await getExtensionId(context);
});

test.afterAll(async () => {
  await context.close();
});

test('My new feature works', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  // Your test code here
  await popup.close();
});
```

## Debugging Tips

1. **Use `test:debug`** to step through tests
2. **Add `await page.pause()`** in your test to inspect the page
3. **Use `test:ui`** for an interactive test runner
4. **Check screenshots** in `test-results/` after failures
5. **Check traces** with `npx playwright show-trace trace.zip`

## Limitations

- **Service Worker Testing**: Limited - service workers are isolated and hard to test directly
- **Extension Pages**: Some extension pages (like `chrome://extensions`) can't be navigated to
- **Real Websites**: Tests that hit real websites (like chat.openai.com) may be flaky due to:
  - Rate limiting
  - Authentication requirements
  - Dynamic content
  - Network issues

## CI/CD Integration

For CI/CD, you'll need to:
1. Build the extension: `npm run build`
2. Install Playwright browsers: `npx playwright install --with-deps chromium`
3. Run tests: `npm test`

Example GitHub Actions workflow:
```yaml
- name: Install dependencies
  run: npm ci

- name: Build extension
  run: npm run build

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run tests
  run: npm test
```
