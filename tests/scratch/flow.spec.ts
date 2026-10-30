import { expect, test, type Page } from '@playwright/test';

const OUT = process.env.SHOTS_DIR ?? '/tmp/claude-0/-home-user-Geometry-of-love/063c37d6-fe58-5a9d-9f04-074753b6e57f/scratchpad/shots';

type Stop = 'choice' | 'episode' | 'ending' | 'cutscene';

async function state(page: Page) {
  return page.evaluate(() => {
    const shown = (sel: string) => {
      const n = document.querySelector(sel) as HTMLElement | null;
      if (!n) return false;
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden';
    };
    return {
      ending: shown('[data-testid="ending"]'),
      episode: shown('[data-testid="episode"]'),
      choice: shown('.choices'),
      card: shown('[data-testid="chapter-card"]'),
      cutscene: shown('.cutscene-layer.is-playing'),
      dialogue: shown('[data-testid="dialogue"]'),
      text: document.querySelector('[data-testid="dialogue"]')?.textContent?.slice(0, 80) ?? '',
    };
  });
}

/** Clicks through until something blocking appears (cutscenes stop it too, unless `skipCutscenes`). */
export async function advance(page: Page, opts: { stopAtText?: string; skipCutscenes?: boolean } = {}): Promise<Stop | 'text'> {
  for (let i = 0; i < 3000; i++) {
    const st = await state(page);
    if (st.ending) return 'ending';
    if (st.episode) return 'episode';
    if (st.choice) return 'choice';
    if (st.cutscene) {
      if (!opts.skipCutscenes) return 'cutscene';
      await page.getByTestId('cutscene-skip').click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(100);
      continue;
    }
    if (opts.stopAtText && st.text.includes(opts.stopAtText)) return 'text';
    if (st.card) await page.getByTestId('chapter-card').click().catch(() => undefined);
    else if (st.dialogue) await page.getByTestId('dialogue').click({ timeout: 5_000 }).catch(() => undefined);
    else await page.waitForTimeout(50);
  }
  throw new Error('nothing reached');
}

export async function pick(page: Page, name: RegExp) {
  for (let i = 0; i < 30; i++) {
    const s = await advance(page, { skipCutscenes: true });
    expect(s).toBe('choice');
    const wanted = page.locator('.choices').getByRole('button', { name });
    if (await wanted.count()) return wanted.click();
    await page.locator('.choices button:not(:disabled)').first().click();
  }
}

export async function startEpisode(page: Page, title: string) {
  for (let i = 0; i < 10 && (await advance(page, { skipCutscenes: true })) === 'choice'; i++) await page.locator('.choices button:not(:disabled)').first().click();
  await expect(page.getByTestId('episode').getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Начать' }).click();
}

export async function solveQuiz(page: Page, answers: (string | { choice: string })[]) {
  const episode = page.getByTestId('episode');
  for (let i = 0; i < 5 && (await episode.getByRole('button', { name: /Далее|К задачам/ }).isVisible()); i++) {
    await episode.getByRole('button', { name: /Далее|К задачам/ }).click();
  }
  const progress = () => page.evaluate(() => document.querySelector('[data-testid="episode"] .quiz-progress')?.textContent ?? null);
  const press = (name: string) => episode.getByRole('button', { name, exact: true }).evaluate((b) => (b as HTMLButtonElement).click());
  for (const a of answers) {
    const before = await progress();
    await expect(async () => {
      if (typeof a === 'string') await episode.getByLabel('Ответ', { exact: true }).fill(a);
      else await press(a.choice);
      await press('Проверить');
      await expect(episode.locator('.quiz-feedback')).toHaveText(/Правильно/, { timeout: 8_000 });
    }).toPass({ timeout: 40_000 });
    await expect.poll(async () => (await progress()) !== before, { timeout: 30_000 }).toBe(true);
  }
}

export async function winByHook(page: Page, title: string) {
  await startEpisode(page, title);
  await page.evaluate(() => (window as unknown as { __golTest: { winEpisode(): void } }).__golTest.winEpisode());
  await expect(page.getByTestId('episode')).toBeHidden();
}

/** What is on screen during a cutscene. */
export async function probe(page: Page) {
  return page.evaluate(() => {
    const w = document.querySelector('.world-view') as HTMLElement | null;
    const stage = document.querySelector('.stage') as HTMLElement | null;
    const app = document.getElementById('app');
    const r = w?.getBoundingClientRect();
    return {
      worldConnected: !!w?.isConnected,
      worldParent: w?.parentElement?.className ?? null,
      worldRect: r ? [Math.round(r.width), Math.round(r.height)] : null,
      stageMode: stage?.dataset.mode,
      space: app?.dataset.space,
      caption: document.querySelector('.cs-caption')?.textContent ?? '',
    };
  });
}

export async function film(page: Page, name: string, seconds: number, every = 1) {
  const log: string[] = [];
  const t0 = Date.now();
  for (let i = 0; (Date.now() - t0) / 1000 < seconds; i++) {
    const t = ((Date.now() - t0) / 1000).toFixed(1);
    const p = await probe(page);
    log.push(`${t}s ${JSON.stringify(p)}`);
    await page.screenshot({ path: `${OUT}/${test.info().project.name}-${name}-${String(i).padStart(2, '0')}-${t}s.png` });
    if (!(await page.locator('.cutscene-layer.is-playing').isVisible())) {
      log.push(`${t}s cutscene over`);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/${test.info().project.name}-${name}-after.png` });
      break;
    }
    await page.waitForTimeout(every * 1000);
  }
  console.log(`[${name}]\n` + log.join('\n'));
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('gol:settings', JSON.stringify({ textSpeed: 0 }));
  });
  await page.reload();
  await page.getByTestId('intro-gate').waitFor();
  await page.keyboard.press('Enter');
  await page.getByTestId('intro-skip').click();
});

test('real flow to the pull-in', async ({ page }) => {
  await page.getByTestId('new-game').click();
  await pick(page, /Установить/);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['90', { choice: '3' }, '8']);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['70', '50', { choice: 'Углы при основании' }, '12']);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['18', '20', '7', '32', '84']);
  await startEpisode(page, 'Геометрические задачи');
  await solveQuiz(page, ['3.5', '6', '1.5', '8', { choice: 'Гипербола' }, '4/3']);
  await pick(page, /честно/);
  await pick(page, /Ты права/);
  // chapter 3 up to the cutscene
  for (let i = 0; i < 10; i++) {
    const s = await advance(page, { stopAtText: 'Дамео тянется к мышке' });
    if (s === 'choice') await page.locator('.choices button:not(:disabled)').first().click();
    else break;
  }
  console.log('before', JSON.stringify(await probe(page)));
  await page.screenshot({ path: `${OUT}/${test.info().project.name}-pullin-before.png` });
  await page.getByTestId('dialogue').click();
  await expect(page.locator('.cutscene-layer.is-playing')).toBeVisible({ timeout: 10_000 });
  await film(page, 'pullin', 40, 0.8);
  // save a quick save here for later reuse
  const saves = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
  console.log('SAVES', JSON.stringify(Object.keys(saves)));
});

test('pull-in quick', async ({ page }) => {
  const { jumpTo } = await import('./jump');
  await jumpTo(page, 'ch03', 'Дамео тянется к мышке');
  await page.screenshot({ path: `${OUT}/${test.info().project.name}-q-pullin-before.png` });
  await page.getByTestId('dialogue').click();
  await expect(page.locator('.cutscene-layer.is-playing')).toBeVisible({ timeout: 10_000 });
  await film(page, 'q-pullin', 45, 0.5);
});
