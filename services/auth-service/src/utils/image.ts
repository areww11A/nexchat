import sharp from 'sharp';

interface ImageOptions {
  width: number;
  height: number;
  format: 'jpeg' | 'png';
}

export const processImage = async (buffer: Buffer, options: ImageOptions): Promise<Buffer> => {
  const { width, height, format } = options;

  return sharp(buffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'center',
    })
    .format(format)
    .toBuffer();
}; 