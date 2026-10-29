// Dev-only bench for 3D locations (not in the production build):
//   /world.html?loc=dameo-room&state=night&variant=app&shot=desk&cast=dameo:center,satsuki:right&speaker=dameo
// window.__ready turns true after a few frames (for screenshot scripts).
import { World3D } from '../src/world/world';
import type { Emotion } from '../src/render/sprites';

const q = new URLSearchParams(location.search);
const world = new World3D();
document.getElementById('host')!.append(world.root);
world.show(q.get('loc') ?? 'dameo-room', q.get('state'), q.get('variant'));
const cast = (q.get('cast') ?? 'dameo:center').split(',').filter(Boolean).map((s) => {
  const [id, mark, emotion] = s.split(':');
  return { id: id!, mark: mark ?? 'center', emotion: (emotion ?? 'neutral') as Emotion };
});
world.setCast(cast);
if (q.get('shot')) void world.setShot(q.get('shot')!, 0);
world.setSpeaker(q.get('speaker'));
if (q.get('walk')) {
  const [id, x] = q.get('walk')!.split(':');
  void world.actor(id!)?.moveTo(Number(x), -0.6);
}
let n = 0;
const wait = () => (++n > 8 ? ((window as unknown as { __ready: boolean }).__ready = true) : requestAnimationFrame(wait));
requestAnimationFrame(wait);
Object.assign(window, { __world: world });

// ?episode=chase&mode=run — runs a 3D episode directly (dev only).
import { episodes } from '../src/episodes/registry';
if (q.get('episode')) {
  const host = document.getElementById('host')!;
  const root = document.createElement('div');
  root.className = 'episode-stage';
  root.style.cssText = 'position:absolute;inset:0';
  host.replaceChildren(root);
  const def = episodes[q.get('episode')!]!;
  const inst = def.create({ root, params: { mode: q.get('mode') ?? 'run' }, reduceMotion: false });
  void inst.run().then((r) => ((window as unknown as { __result: unknown }).__result = r));
  Object.assign(window, { __episode: inst });
}

// ?cutscene=pulled-in — plays a cutscene on the bench (dev only).
import { CutsceneLayer } from '../src/ui/cutscene-host';
import { AudioEngine } from '../src/audio/engine';
if (q.get('cutscene')) {
  const host = document.getElementById('host')!;
  const layer = new CutsceneLayer(host, new AudioEngine(), () => {});
  host.append(layer.root);
  const run = layer.play(q.get('cutscene')!, world, false);
  void run.done.then(() => ((window as unknown as { __done: boolean }).__done = true));
}
