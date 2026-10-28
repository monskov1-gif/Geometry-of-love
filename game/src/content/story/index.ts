import type { Story } from '../../core/types';
import { testScene } from './test-scene';

// Add scene modules here (one file per chapter or episode).
export const story: Story = {
  startScene: testScene.id,
  scenes: {
    [testScene.id]: testScene,
  },
};
