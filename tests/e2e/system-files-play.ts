// Plays mini-game 4 «Системные файлы» for real through the interface: a wrong
// cut first (the stage restarts), then all four stages. Stage 3 locks are
// opened by solving the Calculator's examples shown on screen.
import { expect, type Page } from '@playwright/test';

const answer = (text: string) => {
  const m = /^(\d+) ([+−×]) (\d+)/.exec(text);
  if (!m) throw new Error(`unexpected lock example: ${text}`);
  const [a, b] = [Number(m[1]), Number(m[3])];
  return m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b;
};

export async function playSystemFiles(page: Page, shot: (name: string) => Promise<void>) {
  const ep = page.getByTestId('episode');
  const select = (id: string) => ep.locator(`[data-node="${id}"]`).click();
  const cut = async (from: string, link: string) => {
    await select(from);
    await ep.locator(`button[data-link="${link}"]`).click();
  };
  const caption = ep.locator('.episode-caption');

  // Stage 1: mark the link files that hang on user_07 (a decoy mark restarts the stage).
  await select('u07');
  await expect(ep.locator('.files-info')).toContainText('Владелец: Дамео');
  await select('journal');
  await ep.getByRole('button', { name: /Пометить/ }).click();
  await ep.getByRole('button', { name: /Проверить метки/ }).click();
  await expect(caption).toHaveText(/чужих помечено: 1/);
  for (const id of ['avatar', 'session', 'profile', 'index']) {
    await select(id);
    await ep.getByRole('button', { name: /Пометить/ }).click();
  }
  await shot('08-files-1');
  await ep.getByRole('button', { name: /Проверить метки/ }).click();
  await expect(ep.getByText('Этап 2 из 4')).toBeVisible();

  // Stage 2: an order mistake is refused, a cut of a shared file's link restarts the stage.
  await cut('profile', 'o3');
  await expect(caption).toHaveText(/Ошибка порядка 1/);
  await cut('cache', 'o6');
  await expect(caption).toHaveText(/user_03\.usr/);
  for (const [f, l] of [['u07', 'o1'], ['u07', 'o2'], ['profile', 'o3'], ['journal', 'o4'], ['journal', 'o5'], ['index', 'o7'], ['profile', 'o8'], ['session', 'o9']]) await cut(f!, l!);
  await expect(ep.getByText('Этап 3 из 4')).toBeVisible();

  // Stage 3: cut in order; open every lock with the examples' answers.
  const plan = [['u07', 'n1'], ['u07', 'n2'], ['u07', 'n3'], ['profile', 'n4'], ['progress', 'n5'], ['sync', 'n6'], ['progress', 'n7'], ['avatar', 'n9']] as const;
  let locks = 0;
  for (let guard = 0; guard < 80 && (await ep.getByText('Этап 3 из 4').isVisible()); guard++) {
    if (await ep.locator('.files-lock').isVisible()) {
      if (!locks++) await shot('08-files-3-lock');
      for (const t of await ep.locator('.files-lock-problems li').allTextContents()) await ep.getByRole('button', { name: `Цифра ${answer(t)}` }).click();
      continue;
    }
    for (const [f, l] of plan) {
      await select(f);
      const button = ep.locator(`button[data-link="${l}"]`);
      if (await button.count()) {
        await button.click();
        break;
      }
    }
  }
  expect(locks).toBe(3);
  await expect(ep.getByText('Этап 4 из 4')).toBeVisible();

  // Stage 4: three cuts at the narrow places leave no path to world.map.
  await cut('cache', 's11');
  await ep.getByRole('button', { name: 'Трассировка' }).click();
  await expect(caption).toHaveText(/Путь ещё есть/);
  await shot('08-files-4');
  await cut('journal', 's12');
  await cut('avatar', 's15');
  await expect(ep).toBeHidden({ timeout: 10_000 });
}
