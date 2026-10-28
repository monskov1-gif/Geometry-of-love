// Image loading with diagnostics. Image URLs come from Vite imports, so a
// missing file already fails the build; this catches runtime failures
// (network, wrong deploy path) and reports them instead of failing silently.

const cache = new Map<string, Promise<HTMLImageElement>>();
const failures = new Set<string>();
let onFailure: ((src: string) => void) | null = null;

export function setAssetFailureHandler(handler: (src: string) => void): void {
  onFailure = handler;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = cache.get(src);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => {
        failures.add(src);
        console.error(`[assets] failed to load ${src}`);
        onFailure?.(src);
        reject(new Error(`Не удалось загрузить ресурс: ${src}`));
      };
      img.src = src;
    });
    cache.set(src, pending);
  }
  return pending;
}

/** Loads all images; resolves with the list of sources that failed. */
export async function preloadImages(sources: string[]): Promise<string[]> {
  const unique = [...new Set(sources)];
  const results = await Promise.allSettled(unique.map(loadImage));
  return results.flatMap((r, i) => (r.status === 'rejected' ? [unique[i] as string] : []));
}

export const failedAssets = (): string[] => [...failures];
