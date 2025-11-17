/**
 * Logger utility for consistent logging across the application
 * Uses console.warn and console.error to comply with ESLint rules
 */

const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    // Always log in production for debugging
    console.warn(`[${timestamp()}] [INFO] ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[${timestamp()}] [WARN] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`[${timestamp()}] [ERROR] ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    // Always log in production for debugging
    console.warn(`[${timestamp()}] [DEBUG] ${message}`, ...args);
  },
};
