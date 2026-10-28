import '@fontsource/tiny5/400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/episodes.css';
import './styles/backgrounds.css';
import './styles/effects.css';

import { SaveStore } from './core/saves';
import { InputManager } from './platform/input';
import { MetaStore } from './platform/meta';
import { SettingsStore } from './platform/settings';
import { createStore } from './platform/storage';
import { App } from './ui/app';

const root = document.getElementById('app');
if (!root) throw new Error('#app element missing from index.html');

const { store, persistent } = createStore();
const app = new App(root, {
  input: new InputManager(),
  saves: new SaveStore(store),
  settings: new SettingsStore(store),
  meta: new MetaStore(store),
  persistentStorage: persistent,
});
app.showTitle();
