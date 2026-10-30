import type { Page } from '@playwright/test';

/**
 * Drives a fresh StoryRuntime (dev server modules) to the step where the line
 * containing `text` is shown in `scene`, taking choice options matching
 * `prefer` (else the first), and stores it as the autosave; then «Продолжить».
 */
export async function jumpTo(page: Page, scene: string, text: string, prefer: string[] = []) {
  await page.evaluate(
    async ({ scene, text, prefer }) => {
      const { StoryRuntime } = await import('/src/core/runtime.ts' as string);
      const { story } = await import('/src/content/index.ts' as string);
      const { SAVE_SCHEMA } = await import('/src/core/saves.ts' as string);
      const rt = new StoryRuntime(story);
      let p = rt.present();
      for (let i = 0; i < 20000; i++) {
        const pos = rt.state.position;
        if (pos.scene === scene && p.kind === 'line' && p.text.includes(text)) break;
        if (p.kind === 'line' || p.kind === 'card') p = rt.advance();
        else if (p.kind === 'choice') {
          const opts = p.options.filter((o: { enabled: boolean }) => o.enabled);
          const want = opts.find((o: { text: string }) => prefer.some((w) => o.text.includes(w))) ?? opts[0];
          p = rt.choose(want.id);
        } else if (p.kind === 'episode') p = rt.completeEpisode();
        else if (p.kind === 'cutscene') p = rt.completeCutscene();
        else throw new Error('jumpTo: reached ' + p.kind);
      }
      const data = { schema: SAVE_SCHEMA, savedAt: new Date().toISOString(), playTimeMs: 0, sceneTitle: scene, chapter: null, state: rt.state, backlog: [] };
      localStorage.setItem('gol:save:auto', JSON.stringify(data));
    },
    { scene, text, prefer },
  );
  await page.reload();
  await page.getByTestId('intro-gate').waitFor();
  await page.keyboard.press('Enter');
  await page.getByTestId('intro-skip').click();
  await page.getByTestId('continue').click();
  await page.getByTestId('dialogue').waitFor();
}
