/**
 * Compresses and resizes an image File/Blob on the client side using HTML5 Canvas.
 * Reduces 5MB-15MB phone camera photos down to ~50KB-120KB for high performance and minimal memory usage.
 */
export async function compressImage(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<File> {
  // If file is not an image or SVG/GIF, return as-is
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = (err) => reject(err);

    reader.readAsDataURL(file);
  });
}
