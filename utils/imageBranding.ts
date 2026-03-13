/**
 * Utility to overlay a brand logo onto a generated image using HTML5 Canvas.
 */
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

                // Draw main image
                ctx.drawImage(mainImg, 0, 0);

                // Calculate logo dimensions
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

                // Add a subtle drop shadow to the logo for better visibility
                ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);

                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            logoImg.onerror = () => reject(new Error("Failed to load logo image"));
            logoImg.src = logoSource;
        };
        mainImg.onerror = () => reject(new Error("Failed to load main image"));
        mainImg.src = imageSource;
    });
};
