export class StonkFunError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'StonkFunError';
  }
}

export class StonkFunValidationError extends StonkFunError {
  constructor(message: string) {
    super(`Invalid StonkFun response: ${message}`);
    this.name = 'StonkFunValidationError';
  }
}
