import type { Page, TestInfo } from '@playwright/test';

export async function captureStateScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  if (process.env.PW_CAPTURE_SCREENSHOTS === '0') {
    return;
  }

  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, {
    path,
    contentType: 'image/png',
  });
}
