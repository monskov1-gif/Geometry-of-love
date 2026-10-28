// End-to-end checks of the whole game, run against the e2e build served
// under /Geometry-of-love/ (the GitHub Pages subpath). The e2e build differs
// from production only by window.__golTest.winEpisode(), used for the two
// real-time mini-games (platformer, chase) whose rules are unit-tested.
// Set SHOTS_DIR=<dir> to also save screenshots of each stage.
import { expect, test, type Page } from '@playwright/test';

async function shot(page: Page, name: string) {
  const dir = process.env.SHOTS_DIR;
  if (dir) await page.screenshot({ path: `${dir}/${test.info().project.name}-${name}.png` });
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
  return errors;
}

type Stop = 'choice' | 'episode' | 'ending';

/** Melody poses measured during the current test (see advance()). */
let poses = new Set<string>();

/**
 * Clicks through dialogue until a choice, an episode or an ending appears.
 * On the way, every visible sprite must keep its source proportions
 * (regression: sprites were once squashed on phones).
 */
async function advance(page: Page): Promise<Stop> {
  const dialogue = page.getByTestId('dialogue');
  for (let i = 0; i < 400; i++) {
    if (await page.getByTestId('ending').isVisible()) return 'ending';
    if (await page.getByTestId('episode').isVisible()) return 'episode';
    if (await page.locator('.choices').isVisible()) return 'choice';
    {
      // Story effects (chapter 14 distortion, erasing) deform sprites on purpose; skip them.
      for (const m of await page.locator('.cast-slot:not([data-fx="distorted"]):not([data-fx="erasing"]) .sprite-sheet').evaluateAll((ns) =>
        ns.map((n) => {
          const r = n.getBoundingClientRect();
          return { ratio: r.width / r.height, expected: Number((n as HTMLElement).dataset.frameRatio), width: r.width, bg: (n as HTMLElement).style.backgroundPosition };
        }),
      )) {
        poses.add(m.bg);
        expect(Math.abs(m.ratio - m.expected) / m.expected, `pose ${m.bg}`).toBeLessThan(0.01);
        expect(m.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      }
    }
    if (await dialogue.isVisible()) await dialogue.click();
    else await page.waitForTimeout(50);
  }
  throw new Error('advance(): nothing blocking reached after 400 clicks');
}

async function choose(page: Page, name: RegExp | string) {
  expect(await advance(page)).toBe('choice');
  await page.locator('.choices').getByRole('button', { name }).click();
}

async function startEpisode(page: Page, title: string) {
  expect(await advance(page)).toBe('episode');
  await expect(page.getByTestId('episode').getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Начать' }).click();
}

/** Real-time mini-games: confirmed success through the e2e-only hook. */
async function winByHook(page: Page, title: string) {
  await startEpisode(page, title);
  await page.evaluate(() => (window as unknown as { __golTest: { winEpisode(): void } }).__golTest.winEpisode());
  await expect(page.getByTestId('episode')).toBeHidden();
}

async function solveQuiz(page: Page, answers: (string | { choice: string })[]) {
  const episode = page.getByTestId('episode');
  for (let i = 0; i < 5 && (await episode.getByRole('button', { name: /Далее|К задачам/ }).isVisible()); i++) {
    await episode.getByRole('button', { name: /Далее|К задачам/ }).click();
  }
  for (const a of answers) {
    if (typeof a === 'string') await episode.getByLabel('Ответ', { exact: true }).fill(a);
    else await episode.getByRole('button', { name: a.choice, exact: true }).click();
    await episode.getByRole('button', { name: 'Проверить' }).click();
    await expect(episode.locator('.quiz-feedback')).toHaveText(/Правильно/);
    // Wait until the next task (or the end of the episode) replaces this one.
    await expect
      .poll(async () => (await episode.isVisible()) && /Правильно/.test((await episode.locator('.quiz-feedback').textContent()) ?? ''))
      .toBe(false);
  }
}

test.beforeEach(async ({ page }) => {
  poses = new Set();
  await page.goto('./');
  // Instant text so tests click through quickly; everything else default.
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('gol:settings', JSON.stringify({ textSpeed: 0 }));
  });
  await page.reload();
});

test('ending 1 «Самоучка»: refuse to install the app', async ({ page }) => {
  const errors = trackErrors(page);
  await expect(page.getByTestId('continue')).toBeDisabled();
  await shot(page, '00-title');
  await page.getByTestId('new-game').click();
  await expect(page.locator('#app')).toHaveAttribute('data-space', 'reality');
  await page.getByTestId('dialogue').click();
  await shot(page, '01-reality');
  await choose(page, /Удалить установщик/);
  expect(await advance(page)).toBe('ending');
  await expect(page.getByTestId('ending')).toContainText('Самоучка');
  await page.getByRole('button', { name: 'В главное меню' }).click();
  await expect(page.getByTestId('title-screen')).toContainText('Открыто концовок: 1');
  expect(errors).toEqual([]);
});

test('ending 3 «За пределами экрана»: the whole story with every mini-game', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  await page.getByTestId('new-game').click();
  await choose(page, /Установить/);

  // Chapter 2 — app onboarding: short articles + very easy tasks, played for real.
  await expect(page.locator('#app')).toHaveAttribute('data-space', 'app');
  await startEpisode(page, 'Геометрические задачи');
  await shot(page, '02-app-lesson');
  await solveQuiz(page, ['90', { choice: '3' }, '8']);
  await choose(page, /честно/);
  await shot(page, '03-choice');
  await choose(page, /Ты права/);

  // Chapter 3: pulled into the screen. Chapter 4: Mini-game 1.
  await winByHook(page, 'Выход');

  // Chapter 5: Mini-game 2 — three real tasks, then the impossible one.
  await startEpisode(page, 'Геометрические задачи');
  const quiz = page.getByTestId('episode');
  await solveQuiz(page, [{ choice: '70°' }, '20', { choice: 'Да' }]);
  await quiz.getByLabel('Ответ', { exact: true }).fill('-20');
  await quiz.getByRole('button', { name: 'Проверить' }).click();
  await expect(quiz.locator('.quiz-feedback')).toHaveText(/Неверно/);
  await quiz.getByRole('button', { name: /условие противоречиво/ }).click();
  await quiz.getByRole('button', { name: 'Отказаться решать' }).click();
  await expect(quiz.getByText('ТЫ НЕДОСТАТОЧНО СТАРАЕШЬСЯ').first()).toBeVisible();
  await expect(quiz.locator('.quiz-history li.is-rewritten')).toHaveCount(3);
  await shot(page, '04-lockdown');
  await expect(quiz).toBeHidden({ timeout: 10_000 });

  await winByHook(page, 'Интерактивный эпизод'); // escape to the Sandbox

  // Chapter 6 hub: everyone in the Sandbox; chapter 7 hub: the archive.
  await expect(page.locator('#app')).toHaveAttribute('data-space', 'game');
  for (const who of [/калькулятору/, /линейке/, /циркулю/, /ластикам/]) await choose(page, who);
  await shot(page, '05-sandbox');
  await choose(page, /записи/);
  await choose(page, /Калькулятора/);

  // Chapter 9: the erasure and the key choice.
  await choose(page, /Ты не любишь меня/);
  await page.getByTestId('tool-backlog').click();
  // The erased Eraser's name is gone from the whole interface, his old lines included.
  await expect(page.getByRole('dialog', { name: 'Журнал' }).locator('.backlog-speaker', { hasText: '▒▒▒▒▒' }).first()).toBeVisible();
  await shot(page, '06-backlog-erased');
  await page.keyboard.press('Escape');

  // Chapter 10: through the door.
  await winByHook(page, 'Интерактивный эпизод');

  // Chapter 11: Mini-game 3, played for real: walk, measure, anchor B, 9 divisions, cross.
  await startEpisode(page, 'Предел измерения');
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('.bridge-panel')).toBeVisible();
  await page.keyboard.up('ArrowRight');
  await shot(page, '07-ruler');
  await page.getByLabel('Точка опоры').selectOption('B');
  await page.getByLabel('Длина Линейки, делений').fill('9');
  await page.getByRole('button', { name: 'Перекинуть Линейку' }).click();
  await page.keyboard.down('ArrowRight');
  await expect(page.getByTestId('episode')).toBeHidden({ timeout: 15_000 });
  await page.keyboard.up('ArrowRight');

  // Chapter 13: Mini-game 4, played for real.
  await startEpisode(page, 'Системные файлы');
  const files = page.getByTestId('episode');
  await files.getByRole('listitem').filter({ hasText: 'core.sys' }).click();
  await files.locator('[data-link="l3"]').click();
  await expect(files.locator('.episode-caption')).toHaveText(/Стой!/); // vital link refused
  await files.getByRole('listitem').filter({ hasText: 'user_07.usr' }).click();
  await expect(files.locator('.files-info')).toContainText('Владелец: Дамео');
  await shot(page, '08-files');
  await files.locator('[data-link="l1"]').click();
  await files.locator('[data-link="l2"]').click();
  await expect(files).toBeHidden({ timeout: 10_000 });

  // Chapters 14–15: Mini-game 5, both phases.
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'E');
  await page.getByTestId('dialogue').click();
  await shot(page, '09-collapse');
  await winByHook(page, 'Погоня');
  await winByHook(page, 'Погоня');

  // Epilogue.
  expect(await advance(page)).toBe('ending');
  await expect(page.getByTestId('ending')).toContainText('За пределами экрана');
  await shot(page, '10-ending');
  await page.getByRole('button', { name: 'В главное меню' }).click();
  await expect(page.getByTestId('continue')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('ending 2 «Мой любимый ученик»: stay with Melody; all four sprite poses keep their proportions', async ({ page }) => {
  test.setTimeout(180_000);
  await page.getByTestId('new-game').click();
  await choose(page, /Установить/);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['90', { choice: '3' }, '8']);
  await choose(page, /Отшутиться/);
  await choose(page, /Ревнуешь/);
  await winByHook(page, 'Выход');
  await winByHook(page, 'Геометрические задачи'); // played for real in the ending-3 test
  await winByHook(page, 'Интерактивный эпизод');
  for (const who of [/ластикам/, /циркулю/, /линейке/, /калькулятору/, /Расспросить/, /записи/]) await choose(page, who);
  await choose(page, /Я тебе верю/);
  expect(await advance(page)).toBe('ending');
  await expect(page.getByTestId('ending')).toContainText('Мой любимый ученик');
  expect(poses.size).toBe(4);
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
  const text = await dialogue.locator('.dialogue-text').textContent();
  await page.getByTestId('tool-save').click();
  await page.locator('[data-slot="slot-1"]').getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.locator('[data-slot="slot-1"]')).toHaveAttribute('data-status', 'ok');
  await expect(page.locator('[data-slot="slot-1"]')).toContainText('Глава 1');
  await shot(page, '11-save');
  await page.reload();
  await page.getByTestId('load').click();
  await page.locator('[data-slot="slot-1"]').getByRole('button', { name: 'Загрузить' }).click();
  await expect(dialogue.locator('.dialogue-text')).toHaveText(text ?? '');
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
  await page.reload();
  await page.getByTestId('settings').click();
  await expect(page.getByLabel('Пропуск')).toHaveValue('all');
  await expect(page.getByLabel('Уменьшить движение')).toBeChecked();
});
