// End-to-end checks of the technical prototype, run against the production
// build served under /Geometry-of-love/ (the GitHub Pages subpath).
// Set SHOTS_DIR=<dir> to also save screenshots of each stage.
import { expect, test, type Locator, type Page } from '@playwright/test';

async function shot(page: Page, name: string) {
  const dir = process.env.SHOTS_DIR;
  if (dir) await page.screenshot({ path: `${dir}/${test.info().project.name}-${name}.png` });
}

/** Clicks the dialogue until `target` appears (each click finishes typing or advances). */
async function advanceUntil(page: Page, target: Locator, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await target.isVisible()) return;
    await page.getByTestId('dialogue').click();
  }
  await expect(target).toBeVisible();
}

function trackAssetErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('full prototype loop: dialogue → choice → mandatory mini-game → episode → branch → ending', async ({ page }) => {
  const errors = trackAssetErrors(page);
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await expect(page.getByTestId('continue')).toBeDisabled();
  await shot(page, '01-title');

  await page.getByTestId('new-game').click();
  await expect(page.getByTestId('dialogue')).toContainText('ТЕХНИЧЕСКИЙ ПРОТОТИП');
  await page.getByTestId('dialogue').click(); // finish typing
  await page.getByTestId('dialogue').click(); // next line
  await expect(page.locator('.sprite-sheet')).toBeVisible();
  await page.getByTestId('dialogue').click();
  await shot(page, '02-melody');

  // Real sprite sheet actually loaded (not just referenced).
  const loaded = await page.locator('.sprite-sheet').evaluate(async (node) => {
    const url = getComputedStyle(node).backgroundImage.slice(5, -2);
    const img = new Image();
    img.src = url;
    await img.decode();
    return { url, w: img.naturalWidth };
  });
  expect(loaded.url).toContain('/Geometry-of-love/assets/melody-sheet');
  expect(loaded.w).toBeGreaterThan(2000);

  const choices = page.locator('.choices');
  await advanceUntil(page, choices);
  await expect(page.getByRole('button', { name: /Недоступный вариант/ })).toBeDisabled();
  await shot(page, '03-choice');
  await page.getByRole('button', { name: /Поддержать разговор/ }).click();

  // Mandatory geometry mini-game.
  const episode = page.getByTestId('episode');
  await advanceUntil(page, episode);
  await shot(page, '04-quiz-intro');
  await page.getByRole('button', { name: 'Начать' }).click();
  await page.getByLabel('Ответ').fill('100');
  await page.getByRole('button', { name: 'Проверить' }).click();
  await expect(page.locator('.quiz-feedback')).toHaveText(/Неверно/);
  await shot(page, '05-quiz-wrong');
  await page.getByLabel('Ответ').fill('180');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '70°' }).click();
  await page.getByRole('button', { name: 'Проверить' }).click();

  // Reality space, then the left/right interactive episode.
  await expect(page.locator('#app')).toHaveAttribute('data-space', 'reality');
  await page.getByTestId('dialogue').click();
  await shot(page, '06-reality');
  await advanceUntil(page, episode);
  await page.getByRole('button', { name: 'Начать' }).click();
  await page.keyboard.down('ArrowRight');
  await expect(episode).toBeHidden({ timeout: 15_000 });
  await page.keyboard.up('ArrowRight');

  // Code space and the branch chosen by the relationship variable.
  await expect(page.locator('#app')).toHaveAttribute('data-space', 'code');
  await advanceUntil(page, page.getByTestId('dialogue').getByText(/1 или больше/));
  await page.getByTestId('dialogue').click();
  await shot(page, '07-code');
  await advanceUntil(page, page.getByTestId('ending'));
  await expect(page.getByTestId('ending')).toContainText('Тестовый прогон завершён');
  await shot(page, '08-ending');

  await page.getByRole('button', { name: 'В главное меню' }).click();
  await expect(page.getByTestId('continue')).toBeEnabled(); // autosave exists
  expect(errors).toEqual([]);
});

test('opening the backlog or menu does not advance the story', async ({ page }) => {
  await page.getByTestId('new-game').click();
  const dialogue = page.getByTestId('dialogue');
  await dialogue.click();
  const text = await dialogue.locator('.dialogue-text').textContent();
  await page.keyboard.press('KeyL');
  await expect(page.getByRole('dialog', { name: 'Журнал' })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await shot(page, '09-backlog');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Меню' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogue.locator('.dialogue-text')).toHaveText(text ?? '');
});

test('manual save survives a page reload and loads the same line', async ({ page }) => {
  await page.getByTestId('new-game').click();
  const dialogue = page.getByTestId('dialogue');
  for (let i = 0; i < 6; i++) await dialogue.click();
  await dialogue.click();
  const text = await dialogue.locator('.dialogue-text').textContent();

  await page.getByTestId('tool-save').click();
  await page.locator('[data-slot="slot-1"]').getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.locator('[data-slot="slot-1"]')).toHaveAttribute('data-status', 'ok');
  await shot(page, '10-save');

  await page.reload();
  await page.getByTestId('load').click();
  await page.locator('[data-slot="slot-1"]').getByRole('button', { name: 'Загрузить' }).click();
  await dialogue.click(); // finish typing
  await expect(dialogue.locator('.dialogue-text')).toHaveText(text ?? '');
  await expect(page.locator('.sprite-sheet')).toBeVisible();
});

test('corrupted save is reported, not loaded', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('gol:save:slot-2', '{oops'));
  await page.getByTestId('load').click();
  await expect(page.locator('[data-slot="slot-2"]')).toContainText('Повреждённое сохранение');
  await expect(page.locator('[data-slot="slot-2"]').getByRole('button', { name: 'Загрузить' })).toHaveCount(0);
});

test('settings persist across reloads', async ({ page }) => {
  await page.getByTestId('settings').click();
  await page.getByLabel('Пропуск').selectOption('all');
  await page.getByLabel('Уменьшить движение').check();
  await shot(page, '11-settings');
  await page.reload();
  await page.getByTestId('settings').click();
  await expect(page.getByLabel('Пропуск')).toHaveValue('all');
  await expect(page.getByLabel('Уменьшить движение')).toBeChecked();
});
