/**
 * Utility to overlay a brand logo onto a generated image using HTML5 Canvas.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export const overlayLogoOnImage = async (
    imageSource: string,
    logoSource: string,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right',
    padding: number = 20,
    logoWidthPercent: number = 15
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const mainImg = new Image();
        const logoImg = new Image();

        mainImg.crossOrigin = "anonymous";
        logoImg.crossOrigin = "anonymous";

        mainImg.onload = () => {
            logoImg.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                canvas.width = mainImg.width;
                canvas.height = mainImg.height;

                ctx.drawImage(mainImg, 0, 0);

                const logoWidth = (canvas.width * logoWidthPercent) / 100;
                const aspectRatio = logoImg.width / logoImg.height;
                const logoHeight = logoWidth / aspectRatio;

                let x = padding;
                let y = padding;

                switch (position) {
                    case 'top-right':
                        x = canvas.width - logoWidth - padding;
                        break;
                    case 'bottom-left':
                        y = canvas.height - logoHeight - padding;
                        break;
                    case 'bottom-right':
                        x = canvas.width - logoWidth - padding;
                        y = canvas.height - logoHeight - padding;
                        break;
                }

                const badgePad = Math.max(10, Math.round(canvas.width * 0.012));
                roundRect(
                  ctx,
                  x - badgePad,
                  y - badgePad,
                  logoWidth + badgePad * 2,
                  logoHeight + badgePad * 2,
                  Math.max(12, Math.round(badgePad * 1.2))
                );
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
                ctx.lineWidth = Math.max(1, canvas.width * 0.0015);
                ctx.stroke();

                ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);

                ctx.shadowColor = 'transparent';
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            logoImg.onerror = () => reject(new Error("Failed to load logo image"));
            logoImg.src = logoSource;
        };
        mainImg.onerror = () => reject(new Error("Failed to load main image"));
        mainImg.src = imageSource;
    });
};
