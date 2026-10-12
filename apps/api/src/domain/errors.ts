export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export function fail(status: number, code: string, message: string): never {
  throw new AppError(status, code, message);
}
export function missing(): never {
  return fail(
    404,
    "NOT_FOUND",
    "This record is unavailable in your current workspace and role.",
  );
}
