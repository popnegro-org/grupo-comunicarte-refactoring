import sharp from 'sharp';

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_HEIGHT = 360;

export async function createSupportMediaThumbnail(source: Buffer): Promise<Buffer> {
  return sharp(source, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      fit: 'cover',
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    })
    .webp({ quality: 72, effort: 4 })
    .toBuffer();
}
