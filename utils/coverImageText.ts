/**
 * Cover / erase a rectangular region on an image (percent-based bbox).
 * Used after OCR so baked-in AI text can be replaced by an editable overlay.
 */

export interface PercentBox {
  /** Center X 0–100 */
  x: number;
  /** Center Y 0–100 */
  y: number;
  /** Width as % of image width */
  width: number;
  /** Height as % of image height */
  height: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się wczytać obrazu do zakrycia tekstu'));
    img.src = src;
  });
}

/**
 * Fills the bbox with a soft patch sampled from surrounding pixels
 * (better than flat black for social images).
 */
export async function coverTextRegionOnImage(
  imageSrc: string,
  box: PercentBox,
  options?: { paddingPercent?: number }
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas niedostępny');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pad = options?.paddingPercent ?? 2;
  const wPct = clamp(box.width + pad * 2, 4, 100);
  const hPct = clamp(box.height + pad * 2, 3, 100);
  const cx = clamp(box.x, 0, 100);
  const cy = clamp(box.y, 0, 100);

  const rw = (wPct / 100) * canvas.width;
  const rh = (hPct / 100) * canvas.height;
  const rx = (cx / 100) * canvas.width - rw / 2;
  const ry = (cy / 100) * canvas.height - rh / 2;

  const x0 = clamp(Math.floor(rx), 0, canvas.width - 1);
  const y0 = clamp(Math.floor(ry), 0, canvas.height - 1);
  const x1 = clamp(Math.ceil(rx + rw), 1, canvas.width);
  const y1 = clamp(Math.ceil(ry + rh), 1, canvas.height);
  const bw = Math.max(1, x1 - x0);
  const bh = Math.max(1, y1 - y0);

  // Sample ring around the box for average color
  const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const margin = Math.max(4, Math.floor(Math.min(bw, bh) * 0.15));

  const pushPixel = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return;
    // skip interior of box
    if (px >= x0 && px < x1 && py >= y0 && py < y1) return;
    const i = (py * canvas.width + px) * 4;
    r += sample[i] ?? 0;
    g += sample[i + 1] ?? 0;
    b += sample[i + 2] ?? 0;
    count += 1;
  };

  for (let x = x0 - margin; x < x1 + margin; x++) {
    for (let t = 0; t < margin; t++) {
      pushPixel(x, y0 - 1 - t);
      pushPixel(x, y1 + t);
    }
  }
  for (let y = y0; y < y1; y++) {
    for (let t = 0; t < margin; t++) {
      pushPixel(x0 - 1 - t, y);
      pushPixel(x1 + t, y);
    }
  }

  if (count === 0) {
    r = g = b = 30;
  } else {
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
  }

  // Soft rounded rect fill
  const radius = Math.min(bw, bh) * 0.12;
  ctx.save();
  ctx.beginPath();
  const rr = Math.min(radius, bw / 2, bh / 2);
  ctx.moveTo(x0 + rr, y0);
  ctx.arcTo(x0 + bw, y0, x0 + bw, y0 + bh, rr);
  ctx.arcTo(x0 + bw, y0 + bh, x0, y0 + bh, rr);
  ctx.arcTo(x0, y0 + bh, x0, y0, rr);
  ctx.arcTo(x0, y0, x0 + bw, y0, rr);
  ctx.closePath();
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();

  // Slight blur-like noise for less obvious patch
  const patch = ctx.getImageData(x0, y0, bw, bh);
  for (let i = 0; i < patch.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    patch.data[i] = clamp((patch.data[i] ?? 0) + n, 0, 255);
    patch.data[i + 1] = clamp((patch.data[i + 1] ?? 0) + n, 0, 255);
    patch.data[i + 2] = clamp((patch.data[i + 2] ?? 0) + n, 0, 255);
  }
  ctx.putImageData(patch, x0, y0);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
