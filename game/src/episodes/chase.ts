// Mini-game No. 5 «Погоня» (chapters 14–15), staged in 3D: the collapsing world
// seen from the side, Dameo running right on his own, Melody — the size of a
// house, smiling — dragging herself after him on two long arms. The player
// jumps over blocks and formulas and ducks under lines of code; each hit lets
// her close in; if she reaches him the run restarts (failure → retry).
// `mode: 'car'` is the last ride on the Calculator car with its rainbow trail.
// Rules and numbers: chase-logic.ts (unit-tested for fairness and winnability).
import * as THREE from 'three';
import { el } from '../ui/dom';
import { getWorld } from '../world/instance';
import { MelodyMonster } from '../world/melody-monster';
import { buildCourse, CONFIGS, obstacleBox, startState, stepChase, type Obstacle } from './chase-logic';
import { createControls, startLoop } from './kit';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export { buildCourse, CONFIGS, hits, obstacleBox, stepRunner, AIR_TIME } from './chase-logic';

const LANE_Z = -0.1;

const TAUNTS_RUN = [
  'Помнишь, как ты впервые решил задачу без ошибок? Я так тобой гордилась.',
  'Я могу сделать мир, где Сацуки ответит тебе взаимностью. Останься.',
  'Неблагодарный! Там ты снова будешь один.',
  'Сацуки никогда бы тебя не выбрала. Никакая геометрия не помогла бы.',
  'Ты не имеешь права бросить единственную, кто тебя замечал!',
];
const TAUNTS_CAR = ['Калькулятор: Держись крепче! Я всё рассчитал!', 'Мелоди пытается перекрыть дорогу…', 'Калькулятор: Почти выход!'];

function label(text: string, w: number, h: number, bg: string, fg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = Math.round(w * 80);
  c.height = Math.round(h * 80);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = fg;
  ctx.font = `${Math.round(c.height * 0.45)}px Tiny5, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Meshes for the course: pastel blocks, floating lines of code, formula signs. */
function obstacleMeshes(course: Obstacle[]): THREE.Group {
  const g = new THREE.Group();
  const codeTex = label('while(stay){love();}', 2.4, 0.42, '#06140c', '#39ff88');
  const formulaTex = label('Σ∠ > 180°', 0.75, 0.85, '#ffc9f6', '#c41e2a');
  for (const o of course) {
    const b = obstacleBox(o.kind);
    const w = b.w;
    const h = b.y1 - b.y0;
    let m: THREE.Mesh;
    if (o.kind === 'block') m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.9), new THREE.MeshLambertMaterial({ color: 0xb78cff, emissive: 0x2a1a3a }));
    else if (o.kind === 'code') m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), new THREE.MeshBasicMaterial({ map: codeTex, toneMapped: false }));
    else m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), new THREE.MeshLambertMaterial({ map: formulaTex, emissive: 0x3a1020 }));
    m.position.set(o.x + w / 2, b.y0 + h / 2, LANE_Z);
    g.add(m);
  }
  return g;
}

/** The Calculator turned into a little car: a grey body, LCD face, four wheels, a rainbow trail. */
function calculatorCar(): { group: THREE.Group; trail: THREE.Mesh; update(x: number, t: number): void } {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.8), new THREE.MeshLambertMaterial({ color: 0x8a8e98, emissive: 0x1a1c20 }));
  body.position.y = 0.45;
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22), new THREE.MeshBasicMaterial({ color: 0x9fe8b0, toneMapped: false }));
  lcd.position.set(0.71, 0.5, 0);
  lcd.rotation.y = Math.PI / 2;
  group.add(body, lcd);
  const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1e });
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [
    [-0.45, 0.42],
    [0.45, 0.42],
    [-0.45, -0.42],
    [0.45, -0.42],
  ] as const) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.18, z);
    wheels.push(w);
    group.add(w);
  }
  const colours = [0xff6cc5, 0xf8d048, 0x8ad86a, 0x55c9f5, 0xb78cff];
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 10;
  const ctx = c.getContext('2d')!;
  colours.forEach((col, i) => {
    ctx.fillStyle = `#${col.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, i * 2, 4, 2);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  return {
    group,
    trail,
    update(x, t) {
      group.position.set(x, 0, LANE_Z);
      for (const w of wheels) w.rotation.y = t * 20;
      trail.position.set(x - 8.6, 0.42, LANE_Z - 0.05);
      (trail.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(t * 9) * 0.15;
    },
  };
}

export const chase: EpisodeDefinition = {
  id: 'chase',
  kind: 'minigame',
  title: 'Погоня',
  instructions:
    'Дамео бежит сам. ↑ / W / Пробел — прыжок через блоки и формулы, ↓ / S — пригнуться под строками кода. На телефоне: джойстик вверх или кнопка ▲ — прыжок, вниз или ▼ — пригнуться. Каждое столкновение приближает Мелоди. Если она догонит, погоня начнётся сначала.',
  create({ root, params, reduceMotion }) {
    const mode = params.mode === 'car' ? 'car' : 'run';
    const config = CONFIGS[mode];
    const course = buildCourse(config);
    const taunts = mode === 'car' ? TAUNTS_CAR : TAUNTS_RUN;
    const world = getWorld();
    const caption = el('p', { class: 'chase-taunt', 'aria-live': 'polite' });
    const meter = el('div', { class: 'chase-meter', role: 'meter', 'aria-label': 'Расстояние до Мелоди', 'aria-valuemin': '0', 'aria-valuemax': String(config.startGap) });
    const controls = createControls(mode === 'car' ? ['jump'] : ['jump', 'down']);
    const hud = el('div', { class: 'episode-hud' }, el('div', { class: 'chase-top' }, el('span', { class: 'chase-label' }, 'Мелоди'), meter), caption, controls.bar);
    root.classList.add('episode-3d');
    root.replaceChildren(world.root, hud);
    world.show('collapse', 'night', null);
    world.setCast([]);
    world.reduceMotion = reduceMotion;
    world.start();
    const scene = world.sceneRoot;
    const obstacles = obstacleMeshes(course);
    scene.add(obstacles);
    const runner = world.spawn('dameo', 0, LANE_Z, 'right');
    runner.emotion = 'scared';
    const car = mode === 'car' ? calculatorCar() : null;
    if (car) scene.add(car.group, car.trail);
    const monster = new MelodyMonster(scene, { scale: mode === 'car' ? 1.15 : 1 });
    const s = startState(config);
    let time = 0;
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    let stop = () => {};
    let flash = 0;

    const tick = (dt: number) => {
      time += dt;
      const jump = controls.state.jumpPressed || controls.state.jump;
      controls.state.jumpPressed = false;
      const result = stepChase(s, config, course, { jump, crouch: controls.state.down }, dt, () => {
        flash = 0.25;
      });
      const x = s.distance;
      const lift = car ? 0.55 : 0;
      runner.drive(x - 0.2, s.runner.y + lift, LANE_Z + (car ? 0 : 0), !car, s.runner.crouching, dt);
      runner.fade = s.invulnerable > 0 && Math.floor(s.invulnerable * 12) % 2 ? 0.35 : 1;
      car?.update(x - 0.3, time);
      // on screen the gap is compressed: at the full gap her reaching hands are already in frame
      monster.x = x - 1.0 - s.gap * 0.45;
      monster.update(dt, config.speed);
      world.current?.track?.(x);
      // side-on camera running with him, a little ahead; it shakes when she is close
      const near = Math.max(0, 1 - s.gap / config.startGap);
      const shake = reduceMotion ? 0 : near * 0.06 * Math.sin(time * 40);
      void world.setShot({ pos: [x + 0.6 + shake, 2.1 + shake, 7.8], look: [x + 0.6, 1.7, 0], fov: 50 }, 0);
      caption.textContent = `${mode === 'car' ? '' : 'Мелоди: '}${taunts[Math.min(taunts.length - 1, Math.floor((x / config.length) * taunts.length))]!}`;
      meter.style.setProperty('--gap', String(Math.max(0, s.gap / config.startGap)));
      meter.setAttribute('aria-valuenow', s.gap.toFixed(1));
      root.classList.toggle('is-hit', flash > 0);
      flash = Math.max(0, flash - dt);
      if (result === 'caught') {
        finish?.({ outcome: 'failure', reason: 'Мелоди догнала Дамео.' });
        return false;
      }
      if (result === 'escaped') {
        finish?.({ outcome: 'success' });
        return false;
      }
      return true;
    };

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          stop = startLoop(tick);
        }),
      destroy: () => {
        finish = null;
        stop();
        controls.dispose();
        monster.dispose();
        scene.remove(obstacles);
        if (car) scene.remove(car.group, car.trail);
        world.despawn('dameo');
        world.root.remove();
        root.replaceChildren();
      },
    };
  },
};
