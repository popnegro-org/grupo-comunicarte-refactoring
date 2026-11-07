export type MediaKitErrorStatus = 400 | 404 | 409 | 503;

export class MediaKitDomainError extends Error {
  readonly statusCode: MediaKitErrorStatus;

  constructor(message: string, statusCode: MediaKitErrorStatus) {
    super(message);
    this.name = 'MediaKitDomainError';
    this.statusCode = statusCode;
  }
}
