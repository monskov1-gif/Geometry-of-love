// Fullscreen on the first gesture (browsers allow it only from a click or key),
// and no zoom on a double tap or pinch: the game is a fixed screen, not a page.
export function enterFullscreen(): void {
  const root = document.documentElement;
  if (document.fullscreenElement || !root.requestFullscreen) return;
  root.requestFullscreen({ navigationUI: 'hide' }).catch((e: unknown) => {
    // refused (iOS Safari, an embedded frame, user setting): the game still runs in the window
    console.warn('[fullscreen] not available', e);
  });
}

export function preventZoom(): void {
  // iOS Safari ignores user-scalable=no; its own gesture events are the only lever
  for (const type of ['gesturestart', 'gesturechange'] as const) document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  let lastTouch = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = e.timeStamp;
      if (now - lastTouch < 320) e.preventDefault(); // a second tap this soon would zoom
      lastTouch = now;
    },
    { passive: false },
  );
}
