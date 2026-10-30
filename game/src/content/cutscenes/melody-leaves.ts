// Глава 8. «Предательство»: «Мелоди воспринимает план побега как
// предательство. Она решает уничтожить всех, кто помогает Дамео» (синопсис);
// in the chapter: «Я поговорю с ним. Потом. Сначала — с ними», then «Она
// уходит, и класс становится темнее». The peak of the escalation (ch08.ts):
// her figure jerks out of shape and stretches, the room shakes, and she walks
// out of the classroom past the calculator. No new words: the scene shows what
// the next line says. The darkness itself is the story's `rage` effect, which
// stays on screen under this scene.
//
// Stage (ch08): the calculator at "left", Melody at "right" of the study room.
// Skipping ends the same way: Melody gone from the room.
import type { Cutscene } from '../../world/director';
import type { Shot } from '../../world/types';

/** Study room (world/locations/study-room.ts): right mark (1.6, −0.8), door (5.5, −0.4). */
const close: Shot = { pos: [1.15, 1.42, 0.75], look: [1.6, 1.22, -0.8], fov: 38 };
const low: Shot = { pos: [0.7, 0.55, 0.9], look: [1.6, 1.15, -0.8], fov: 50 };
/** From the calculator's place, looking after her. */
const after: Shot = { pos: [-1.9, 0.95, 0.9], look: [3.6, 1.1, -0.6], fov: 50 };

export const melodyLeaves: Cutscene = {
  id: 'melody-leaves',
  title: 'Мелоди уходит',
  cues: [
    { do: 'letterbox', on: true },
    { do: 'shot', shot: close, dur: 0.5 },
    { do: 'sfx', sound: 'heartbeat' },
    {
      do: 'par',
      cues: [
        { do: 'actorFx', actor: 'melody', fx: 'warp', dur: 2.2 },
        { do: 'shake', strength: 0.8, dur: 0.6 },
        { do: 'sfx', sound: 'glitch' },
        { do: 'flash', color: '#5a0710', dur: 0.3 },
      ],
    },
    { do: 'shot', shot: low, dur: 0 },
    { do: 'sfx', sound: 'rumble' },
    {
      do: 'par',
      cues: [
        { do: 'actorFx', actor: 'melody', fx: 'stretch', dur: 1.4 },
        { do: 'shake', strength: 1.2, dur: 1.0 },
      ],
    },
    { do: 'actorFx', actor: 'melody', fx: 'warp', dur: 0.8, async: true },
    { do: 'sfx', sound: 'slam' },
    // she walks out; the figure keeps jerking as she goes
    { do: 'shot', shot: after, dur: 0 },
    { do: 'actorFx', actor: 'melody', fx: 'warp', dur: 3.2, async: true },
    { do: 'move', actor: 'melody', to: 'door', speed: 1.6 },
    { do: 'turn', actor: 'melody', facing: 'back' },
    { do: 'sfx', sound: 'slam' },
    {
      do: 'par',
      cues: [
        { do: 'actorFx', actor: 'melody', fx: 'dissolve', dur: 0.7 },
        { do: 'shake', strength: 1.4, dur: 0.5 },
      ],
    },
    { do: 'remove', actor: 'melody' },
    { do: 'wait', dur: 0.8 },
    { do: 'letterbox', on: false },
  ],
};
