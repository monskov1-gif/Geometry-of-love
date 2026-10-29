// Глава 14: «Мелоди тоже теряет привычный облик. Её тело искажается, руки
// вытягиваются за пределы экрана, а голова поворачивается независимо от
// туловища. Но лицо сохраняет прежнюю неподвижную улыбку» (синопсис).
// Staged to the first 20.5 s of «Corrupted Pulse» (the quiet build-up before the
// rise at ~21 s): the scene ends exactly when the chase music kicks in.
// Direction (category 2): her figure trembles and stretches, dissolves, and the
// giant smiling Melody rises out of the floor behind him.
import type { Cutscene } from '../../world/director';

export const melodyTransforms: Cutscene = {
  id: 'melody-transforms',
  title: 'Мелоди меняется',
  cues: [
    { do: 'location', id: 'collapse', state: 'night' },
    {
      do: 'cast',
      actors: [
        { id: 'dameo', at: 'start', facing: 'left', emotion: 'scared' },
        { id: 'melody', at: 'melody', facing: 'right', emotion: 'happy' },
      ],
    },
    { do: 'shot', shot: 'start', dur: 0 },
    { do: 'letterbox', on: true },
    { do: 'wait', dur: 0.6 },
    { do: 'line', speaker: 'melody', text: 'Куда ты, Дамео? Урок ещё не закончился.', dur: 3 },
    { do: 'actorFx', actor: 'melody', fx: 'tremble', dur: 1.2, async: true },
    { do: 'sfx', sound: 'glitch' },
    { do: 'shot', shot: 'rise', dur: 3, async: true },
    { do: 'line', speaker: 'dameo', text: 'Не подходи ко мне.', dur: 2 },
    { do: 'actorFx', actor: 'melody', fx: 'stretch', dur: 2, async: true },
    { do: 'flash', color: '#ff6cc5', dur: 0.3 },
    { do: 'line', speaker: 'melody', text: 'Я же для тебя старалась. Всё — для тебя.', dur: 2.6 },
    { do: 'sfx', sound: 'rumble' },
    {
      do: 'par',
      cues: [
        { do: 'actorFx', actor: 'melody', fx: 'dissolve', dur: 1.6 },
        { do: 'prop', name: 'melody-monster', action: 'rise', dur: 5.5 },
        { do: 'shake', strength: 0.7, dur: 1.4 },
        { do: 'line', speaker: 'melody', text: 'Смотри, какая я теперь большая. Теперь я смогу обнять тебя целиком.', dur: 4.2 },
      ],
    },
    { do: 'remove', actor: 'melody' },
    { do: 'turn', actor: 'dameo', facing: 'right' },
    { do: 'line', speaker: 'dameo', text: 'Бежать. Просто бежать.', dur: 1.8 },
    { do: 'shake', strength: 1.3, dur: 0.6, async: true },
    { do: 'sfx', sound: 'slam' },
    { do: 'until', t: 20.5 },
    { do: 'letterbox', on: false },
  ],
};
