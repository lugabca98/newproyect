/**
 * Utility to compress images on the client side before storing in Firestore / localStorage.
 * Resizes large camera photos down to crisp avatar/gallery dimensions (~800px max)
 * and compresses JPEG/WebP to ~40KB-80KB, preventing Firestore document limit errors (1MB max).
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxDimension = 900,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original
        if (typeof fileOrBase64 === 'string') {
          resolve(fileOrBase64);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBase64);
        }
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed jpeg data URL
      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        // Fallback
        if (typeof fileOrBase64 === 'string') {
          resolve(fileOrBase64);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBase64);
        }
      }
    };

    img.onerror = (err) => {
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        reject(err);
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    }
  });
}
