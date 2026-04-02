import { expect, test } from '@playwright/test';
import { captureStateScreenshot } from './helpers';

const runButtonName = /run historical analysis/i;

test('homepage loads and renders primary inputs', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /historical inputs/i })).toBeVisible();
  await expect(page.getByLabel(/starting portfolio balance/i)).toBeVisible();
  await expect(page.getByLabel(/analysis period/i)).toBeVisible();
  await expect(page.getByLabel(/annual withdrawal/i)).toBeVisible();
  await expect(page.getByLabel(/user inflation/i)).toBeVisible();
  await expect(page.getByLabel(/annual fees drag/i)).toBeVisible();
  await expect(page.getByLabel(/u.s. stocks/i)).toBeVisible();
  await expect(page.getByLabel(/u.s. bonds/i)).toBeVisible();
  await expect(page.getByRole('button', { name: runButtonName })).toBeEnabled();

  await captureStateScreenshot(page, testInfo, 'initial-page-loaded');
});

test('invalid allocations show validation and prevent analysis run', async ({ page }, testInfo) => {
  await page.goto('/');

  await page.getByLabel(/u.s. stocks/i).fill('70');
  await page.getByLabel(/u.s. bonds/i).fill('20');

  await expect(page.getByText(/must equal exactly 100%/i)).toBeVisible();
  await expect(page.getByRole('button', { name: runButtonName })).toBeDisabled();

  await captureStateScreenshot(page, testInfo, 'validation-error-state');
});

test('valid analysis run updates results and renders charts', async ({ page }, testInfo) => {
  await page.goto('/');

  await page.getByLabel(/analysis period/i).selectOption('25');
  await page.getByLabel(/annual withdrawal/i).fill('55000');
  await page.getByLabel(/annual fees drag/i).fill('0.35');
  await page.getByLabel(/u.s. stocks/i).fill('65');
  await page.getByLabel(/u.s. bonds/i).fill('35');

  await page.getByRole('button', { name: runButtonName }).click();

  await expect(page.getByText(/25-year windows from 1928-2024/i)).toBeVisible();
  await expect(page.getByText(/success rate/i)).toBeVisible();
  await expect(page.getByText(/depletion rate/i)).toBeVisible();
  await expect(page.getByText(/median ending value/i)).toBeVisible();
  await expect(page.getByTestId('results-section')).toBeVisible();
  await expect(page.getByTestId('path-chart-svg')).toBeVisible();
  await expect(page.getByTestId('ending-histogram-card')).toBeVisible();

  await captureStateScreenshot(page, testInfo, 'successful-analysis');
  await captureStateScreenshot(page, testInfo, 'chart-state');
});

test('supports switching retirement horizon values', async ({ page }) => {
  await page.goto('/');

  const horizon = page.getByLabel(/analysis period/i);

  await horizon.selectOption('20');
  await page.getByRole('button', { name: runButtonName }).click();
  await expect(page.getByText(/20-year windows from 1928-2024/i)).toBeVisible();

  await horizon.selectOption('30');
  await page.getByRole('button', { name: runButtonName }).click();
  await expect(page.getByText(/30-year windows from 1928-2024/i)).toBeVisible();
});

test('unsustainable withdrawal edge case still renders output without crashing', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel(/annual withdrawal/i).fill('500000');
  await page.getByRole('button', { name: runButtonName }).click();

  await expect(page.getByText(/depletion rate/i)).toBeVisible();
  await expect(page.getByText(/median depletion year/i)).toBeVisible();
  await expect(page.getByTestId('path-chart-svg')).toBeVisible();
  await expect(page.getByTestId('ending-histogram-card')).toBeVisible();
});

test('aggressive withdrawal scenario displays low success rate', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel(/annual withdrawal/i).fill('80000');
  await page.getByLabel(/u.s. stocks/i).fill('60');
  await page.getByLabel(/u.s. bonds/i).fill('40');
  await page.getByRole('button', { name: runButtonName }).click();

  const successValue = await page
    .locator('article', { hasText: /success rate/i })
    .locator('p')
    .nth(1)
    .innerText();

  const successRate = Number.parseFloat(successValue.replace('%', '').trim());
  expect(successRate).toBeLessThanOrEqual(25);
});


test('can switch to historical bootstrap mode and render bootstrap results', async ({ page }, testInfo) => {
  await page.goto('/');

  await page.getByLabel(/simulation mode/i).selectOption('historicalBootstrap');
  await page.getByLabel(/number of simulations/i).fill('600');
  await page.getByLabel(/analysis period/i).selectOption('20');
  await page.getByLabel(/annual withdrawal/i).fill('50000');
  await page.getByRole('button', { name: /run bootstrap simulation/i }).click();

  await expect(page.getByRole('heading', { name: /historical bootstrap results/i })).toBeVisible();
  await expect(page.getByText(/randomized monthly draws with replacement/i)).toBeVisible();
  await expect(page.getByText(/p10 ending value/i)).toBeVisible();
  await expect(page.getByText(/p50 ending value/i)).toBeVisible();
  await expect(page.getByText(/p90 ending value/i)).toBeVisible();
  await expect(page.getByTestId('path-chart-svg')).toBeVisible();
  await expect(page.getByTestId('ending-histogram-card')).toBeVisible();

  await captureStateScreenshot(page, testInfo, 'bootstrap-results');
});
