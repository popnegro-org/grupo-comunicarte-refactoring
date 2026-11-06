export function matchesMediaSignature(data: Buffer, mimeType: string): boolean {
  if (data.length < 4) return false;

  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    case 'image/png':
      return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
    case 'video/mp4':
      return data.length >= 12 && data.toString('ascii', 4, 8) === 'ftyp' && data.toString('ascii', 8, 12) !== 'qt  ';
    case 'video/quicktime':
      return data.length >= 12 && data.toString('ascii', 4, 8) === 'ftyp' && data.toString('ascii', 8, 12) === 'qt  ';
    case 'video/webm':
      return data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}
