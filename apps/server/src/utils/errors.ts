/**
 * Typed application errors with stable codes for logs and future API responses.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

export class LobbyError extends AppError {
  constructor(message: string, code = 'LOBBY_ERROR', statusCode = 400) {
    super(message, code, statusCode);
  }
}

export class GameError extends AppError {
  constructor(message: string, code = 'GAME_ERROR', statusCode = 400) {
    super(message, code, statusCode);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR', statusCode = 400) {
    super(message, code, statusCode);
  }
}
