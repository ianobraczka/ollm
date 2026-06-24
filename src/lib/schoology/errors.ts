export class SchoologyAuthError extends Error {
  constructor(message = "Schoology API authentication failed. Check SCHOOLOGY_CONSUMER_KEY and SCHOOLOGY_CONSUMER_SECRET.") {
    super(message);
    this.name = "SchoologyAuthError";
  }
}

/** @deprecated Use SchoologyAuthError — kept for existing catch blocks. */
export class SchoologySessionExpiredError extends SchoologyAuthError {
  constructor(message?: string) {
    super(message);
    this.name = "SchoologySessionExpiredError";
  }
}

export class SchoologyPageNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchoologyPageNotFoundError";
  }
}

export class SchoologyApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SchoologyApiError";
    this.status = status;
  }
}

export class SchoologyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchoologyConfigError";
  }
}
