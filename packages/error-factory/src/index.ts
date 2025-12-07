/**
 * @tiltcheck/error-factory
 * Standardized error creation and handling utilities
 */

export class ApplicationError extends Error {
  constructor(message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

// TODO: Implement remaining error classes:
// - AuthenticationError
// - NotFoundError
// - ConflictError
// - RateLimitError
// - ExternalServiceError
