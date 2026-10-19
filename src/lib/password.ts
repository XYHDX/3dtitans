/** Shared password policy for signup and password reset. Returns an error message or null. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 8 || password.length > 200 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must be at least 8 characters and include a letter and a number.';
  }
  return null;
}
