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
  const width = page.viewportSize()!.width;
  for (let i = 0; i < 3000; i++) {
    // one round trip per step: the 3D scenes make every browser call slow on a software rasteriser
    const st = await page.evaluate(() => {
      const shown = (sel: string) => {
        const n = document.querySelector(sel) as HTMLElement | null;
        if (!n) return false;
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden';
      };
      // Story effects (chapter 14 distortion, erasing) deform sprites on purpose; skip them.
      const sprites = [...document.querySelectorAll('.cast-slot:not([data-fx="distorted"]):not([data-fx="erasing"]) .sprite-sheet')].map((n) => {
        const r = n.getBoundingClientRect();
        return { ratio: r.width / r.height, expected: Number((n as HTMLElement).dataset.frameRatio), width: r.width, height: r.height, bg: (n as HTMLElement).style.backgroundPosition };
      });
      return {
        ending: shown('[data-testid="ending"]'),
        episode: shown('[data-testid="episode"]'),
        choice: shown('.choices'),
        card: shown('[data-testid="chapter-card"]'),
        // the skip button stays in the DOM after a scene; only a playing scene's button counts
        skip: shown('.cutscene-layer.is-playing [data-testid="cutscene-skip"]'),
        dialogue: shown('[data-testid="dialogue"]'),
        sprites,
      };
    });
    if (st.ending) return 'ending';
    if (st.episode) return 'episode';
    if (st.choice) return 'choice';
    for (const m of st.sprites) {
      if (!m.height) continue; // portraits hidden while their character is silent (3D scenes)
      poses.add(m.bg);
      expect(Math.abs(m.ratio - m.expected) / m.expected, `pose ${m.bg}`).toBeLessThan(0.01);
      expect(m.width).toBeLessThanOrEqual(width);
    }
    // Chapter cards wait for a click; cutscenes are skipped (their own test watches one through).
    if (st.card) await page.getByTestId('chapter-card').click();
    else if (st.skip) {
      // the scene may end on its own between the check and the click: the next step re-reads the state
      await page.getByTestId('cutscene-skip').click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(100);
    }
    // the line may end (and the band hide) between the check and the click: the next step re-reads the state
    else if (st.dialogue) await page.getByTestId('dialogue').click({ timeout: 5_000 }).catch(() => undefined);
    else await page.waitForTimeout(50);
  }
  throw new Error('advance(): nothing blocking reached after 3000 steps');
}

/** Advances to the choice that offers `name` (smaller choices on the way take their first option). */
async function choose(page: Page, name: RegExp | string) {
  for (let i = 0; i < 30; i++) {
    expect(await advance(page)).toBe('choice');
    const wanted = page.locator('.choices').getByRole('button', { name });
    if (await wanted.count()) {
      await wanted.click();
      return;
    }
    await page.locator('.choices button:not(:disabled)').first().click();
  }
  throw new Error(`choose(): no choice offering ${name}`);
}

async function startEpisode(page: Page, title: string) {
  // smaller choices on the way to the episode take their first option
  for (let i = 0; i < 10 && (await advance(page)) === 'choice'; i++) await page.locator('.choices button:not(:disabled)').first().click();
  await expect(page.getByTestId('episode')).toBeVisible();
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
  // read without auto-waiting: after the last task the episode is gone
  const progress = () => page.evaluate(() => document.querySelector('[data-testid="episode"] .quiz-progress')?.textContent ?? null);
  // DOM clicks: on a software rasteriser a pointer click can land between frames and be lost
  const press = (name: string) => episode.getByRole('button', { name, exact: true }).evaluate((b) => (b as HTMLButtonElement).click());
  for (const a of answers) {
    const before = await progress();
    await expect(async () => {
      if (typeof a === 'string') await episode.getByLabel('Ответ', { exact: true }).fill(a);
      else await press(a.choice);
      await press('Проверить');
      await expect(episode.locator('.quiz-feedback')).toHaveText(/Правильно/, { timeout: 8_000 });
    }).toPass({ timeout: 40_000 });
    // Wait until the next task replaces this one, or the episode closes after its last task.
    await expect.poll(async () => (await progress()) !== before, { timeout: 30_000 }).toBe(true);
  }
}

/** The story opens on the volume card and the chapter card; click through to the first line. */
async function passCards(page: Page) {
  for (let i = 0; i < 4 && (await page.getByTestId('chapter-card').isVisible().catch(() => false)); i++) {
    await page.getByTestId('chapter-card').click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('dialogue')).toBeVisible();
}

/** Opening logo: one key starts it (and unlocks audio), the next one skips it. */
async function passIntro(page: Page) {
  await expect(page.getByTestId('intro-gate')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.getByTestId('intro-skip').click();
  await expect(page.getByTestId('new-game')).toBeFocused();
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
  await passIntro(page);
});

test('ending 1 «Самоучка»: refuse to install the app', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = trackErrors(page);
  await expect(page.getByTestId('continue')).toBeDisabled();
  await shot(page, '00-title');
  await page.getByTestId('new-game').click();
  await expect(page.locator('#app')).toHaveAttribute('data-space', 'reality');
  await expect(page.getByTestId('chapter-card')).toContainText('За экраном');
  await shot(page, '01-volume-card');
  await choose(page, /Удалить установщик/);
  expect(await advance(page)).toBe('ending');
  await expect(page.getByTestId('ending')).toContainText('Самоучка');
  await page.getByRole('button', { name: 'В главное меню' }).click();
  await expect(page.getByTestId('title-screen')).toContainText('Открыто концовок: 1');
  expect(errors).toEqual([]);
});

test('ending 3 «За пределами экрана»: the whole story with every mini-game', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = trackErrors(page);
  await page.getByTestId('new-game').click();
  await choose(page, /Установить/);

  // Chapter 2 — app onboarding: short articles + very easy tasks, played for real.
  await startEpisode(page, 'Геометрические задачи');
  await expect(page.locator('#app')).toHaveAttribute('data-space', 'app');
  await shot(page, '02-app-lesson');
  await solveQuiz(page, ['90', { choice: '3' }, '8']);
  // The second and third evenings with Melody: isosceles triangles, areas.
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['70', '50', { choice: 'Углы при основании' }, '12']);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['18', '20', '7', '32', '84']);
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
  test.setTimeout(900_000);
  await page.getByTestId('new-game').click();
  await choose(page, /Установить/);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['90', { choice: '3' }, '8']);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['70', '50', { choice: 'Углы при основании' }, '12']);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['18', '20', '7', '32', '84']);
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
  await expect(page.getByTestId('chapter-card')).toBeVisible();
  await passCards(page);
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

test('a long backlog keeps its close button on screen and closes with it', async ({ page }) => {
  await page.getByTestId('new-game').click();
  await passCards(page);
  const dialogue = page.getByTestId('dialogue');
  for (let i = 0; i < 14; i++) await dialogue.click();
  await page.getByRole('button', { name: 'Журнал' }).click();
  const close = page.getByRole('dialog', { name: 'Журнал' }).getByRole('button', { name: 'Закрыть' });
  const box = await close.boundingBox();
  // regression: a long backlog grew past the screen and pushed its × above the top edge
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await close.click();
  await expect(page.getByRole('dialog', { name: 'Журнал' })).toBeHidden();
});

test('manual save survives a page reload and loads the same line', async ({ page }) => {
  await page.getByTestId('new-game').click();
  await expect(page.getByTestId('chapter-card')).toBeVisible();
  await passCards(page);
  const dialogue = page.getByTestId('dialogue');
  for (let i = 0; i < 6; i++) await dialogue.click();
  const text = await dialogue.locator('.dialogue-text').textContent();
  await page.getByTestId('tool-save').click();
  await page.locator('[data-slot="slot-1"]').getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.locator('[data-slot="slot-1"]')).toHaveAttribute('data-status', 'ok');
  await expect(page.locator('[data-slot="slot-1"]')).toContainText('Глава 1');
  await shot(page, '11-save');
  await page.reload();
  await passIntro(page);
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
  // Reduced motion: the logo is shown finished, no intro to sit through.
  await expect(page.getByTestId('intro-gate')).toHaveCount(0);
  await page.getByTestId('settings').click();
  await expect(page.getByLabel('Пропуск')).toHaveValue('all');
  await expect(page.getByLabel('Уменьшить движение')).toBeChecked();
});

test('opening logo plays to the end by itself and is not replayed on return', async ({ page }) => {
  const errors = trackErrors(page);
  await page.reload();
  await expect(page.getByTestId('intro-gate')).toBeVisible();
  await expect(page.getByTestId('new-game')).not.toBeFocused();
  await page.mouse.click(10, 10);
  await expect(page.getByTestId('intro-gate')).toHaveCount(0);
  await expect(page.getByTestId('new-game')).toBeFocused({ timeout: 15_000 });
  await shot(page, 'logo-final');
  await page.getByTestId('new-game').click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Главное меню', exact: true }).click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await expect(page.getByTestId('intro-gate')).toHaveCount(0);
  expect(errors).toEqual([]);
});
