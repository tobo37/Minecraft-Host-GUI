/**
 * Logger utility for consistent logging across the application
 * Uses console.warn and console.error to comply with ESLint rules
 */

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEBUG] ${message}`, ...args);
    }
  },
};
