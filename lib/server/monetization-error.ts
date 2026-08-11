export class MonetizationError extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: Record<string, unknown>) {
    super(message)
    this.name = 'MonetizationError'
  }
}
