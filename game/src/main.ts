import '@fontsource/tiny5/400.css';
import '@fontsource/press-start-2p/400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/title.css';
import './styles/episodes.css';
import './styles/backgrounds.css';
import './styles/effects.css';

import { AudioEngine } from './audio/engine';
import { SaveStore } from './core/saves';
import { preventZoom } from './platform/fullscreen';
import { InputManager } from './platform/input';
import { MetaStore } from './platform/meta';
import { SettingsStore } from './platform/settings';
import { createStore } from './platform/storage';
import { App } from './ui/app';

const root = document.getElementById('app');
if (!root) throw new Error('#app element missing from index.html');

preventZoom();
const { store, persistent } = createStore();
const app = new App(root, {
  audio: new AudioEngine(),
  input: new InputManager(),
  saves: new SaveStore(store),
  settings: new SettingsStore(store),
  meta: new MetaStore(store),
  persistentStorage: persistent,
});
app.showTitle();
