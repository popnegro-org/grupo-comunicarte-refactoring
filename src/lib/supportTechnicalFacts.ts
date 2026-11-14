export interface SupportFaceRecord {
  active?: boolean | null;
}

export function withSupportFaceCount<T extends { caras?: number | null }>(
  technical: T | null | undefined,
  faces: SupportFaceRecord[],
): T | (T & { caras: number }) | null {
  const activeFaceCount = faces.filter((face) => face.active !== false).length;
  if (activeFaceCount === 0) return technical ?? null;
  return { ...(technical || {} as T), caras: activeFaceCount } as T & { caras: number };
}
