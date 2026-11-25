import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { createSupportMediaThumbnail } from '../../src/server/mediaThumbnail';
import { mediaSlides } from '../../src/components/inventory/SupportCardPrimitives';
import type { InventoryItem } from '../../src/types';

test('support media thumbnails are resized, cropped and encoded as WebP', async () => {
  const original = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 30, g: 90, b: 160 } },
  }).png().toBuffer();
  const thumbnail = await createSupportMediaThumbnail(original);
  const metadata = await sharp(thumbnail).metadata();

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 640);
  assert.equal(metadata.height, 360);
  assert.ok(thumbnail.length < original.length);
});

test('support card media uses thumbnails for private image routes but preserves videos', () => {
  const item = {
    canonical_id: 'SUP-MEDIA-001',
    name: 'Soporte multimedia',
    ciudad: 'mendoza',
    tipo_soporte: 'tradicional',
    media: [
      { url: '/api/media/12', media_type: 'image', active: true },
      { url: '/api/media/13', media_type: 'video', active: true },
    ],
  } as unknown as InventoryItem;

  assert.deepEqual(mediaSlides(item), [
    { url: '/api/media/12?variant=thumbnail', kind: 'image' },
    { url: '/api/media/13', kind: 'video' },
  ]);
});
