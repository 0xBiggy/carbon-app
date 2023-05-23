import { test, expect } from '@playwright/test';

test('Create strategy snapshot', async ({ page }) => {
  await page.goto(
    'http://localhost:3000/strategies/create?base=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&quote=0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C&strategyType=recurring&strategySettings=limit'
  );
  await page.getByRole('button', { name: 'Accept All Cookies' }).click();

  await expect(page).toHaveScreenshot('strategy-create.png');
});