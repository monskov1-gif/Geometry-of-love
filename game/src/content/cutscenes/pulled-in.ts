// Глава 3: «Дамео собирается закрыть приложение, но из монитора внезапно
// появляется рука, хватает его и затягивает внутрь экрана» (синопсис).
// Direction: the close-up of the CRT, the cursor on «Закрыть», the screen
// breaking up, then the room from behind him as the arm comes out of the glass,
// stretches across the room, catches his wrist and drags him into the picture;
// the camera follows him into the tube and the screen burns to white.
import type { Cutscene } from '../../world/director';

export const pulledIn: Cutscene = {
  id: 'pulled-in',
  title: 'Рука из монитора',
  cues: [
    { do: 'location', id: 'dameo-room', state: 'night' },
    { do: 'cast', actors: [{ id: 'dameo', at: 'chair', facing: 'front', emotion: 'tired' }] },
    { do: 'screen', state: { view: 'close-dialog', melody: 'neutral', unease: 0.5 } },
    { do: 'shot', shot: 'crt', dur: 0 },
    { do: 'letterbox', on: true },
    { do: 'music', track: null },
    { do: 'wait', dur: 1.2 },
    { do: 'line', speaker: 'dameo', text: 'Всё. Хватит.' },
    { do: 'sfx', sound: 'click' },
    { do: 'wait', dur: 0.5 },
    // the program refuses to close
    { do: 'screen', state: { view: 'close-dialog', melody: 'neutral', unease: 0.9 } },
    { do: 'sfx', sound: 'glitch' },
    { do: 'flash', color: '#ff315a', dur: 0.2 },
    { do: 'sfx', sound: 'click' },
    { do: 'wait', dur: 0.3 },
    { do: 'sfx', sound: 'click' },
    { do: 'screen', state: { view: 'stare', melody: 'neutral', unease: 1 } },
    { do: 'sfx', sound: 'heartbeat' },
    { do: 'wait', dur: 1.4 },
    // the room from behind his shoulder: the glass bulges
    { do: 'shot', shot: 'over-shoulder', dur: 0 },
    { do: 'sfx', sound: 'rumble' },
    { do: 'shake', strength: 0.6, dur: 0.6 },
    { do: 'prop', name: 'monitor-hand', action: 'emerge', dur: 1.1 },
    { do: 'emote', actor: 'dameo', emotion: 'scared' },
    { do: 'line', speaker: 'dameo', text: 'Что за…' },
    // he backs away; the arm keeps coming
    {
      do: 'par',
      cues: [
        { do: 'shot', shot: 'wide', dur: 1.4 },
        { do: 'move', actor: 'dameo', to: 'backed-off', speed: 1.1 },
        { do: 'prop', name: 'monitor-hand', action: 'reach', dur: 1.6, target: 'dameo' },
      ],
    },
    { do: 'sfx', sound: 'hand' },
    { do: 'prop', name: 'monitor-hand', action: 'grab', dur: 0.2, target: 'dameo' },
    { do: 'shake', strength: 1.2, dur: 0.4 },
    { do: 'sfx', sound: 'slam' },
    { do: 'line', speaker: 'dameo', text: 'Пусти! ПУСТИ!', dur: 1.6 },
    // dragged across the room into the picture
    {
      do: 'par',
      cues: [
        { do: 'prop', name: 'monitor-hand', action: 'pull', dur: 1.5, target: 'dameo' },
        { do: 'shot', shot: 'into-screen', dur: 1.7 },
        { do: 'sfx', sound: 'erase' },
      ],
    },
    { do: 'prop', name: 'monitor-hand', action: 'hide', dur: 0 },
    { do: 'remove', actor: 'dameo' },
    { do: 'screen', state: { view: 'lesson', melody: 'cheerful', unease: 0 } },
    { do: 'sfx', sound: 'sparkle' },
    { do: 'fade', to: 'white', dur: 0.5 },
    { do: 'wait', dur: 0.8 },
    { do: 'letterbox', on: false },
  ],
};
