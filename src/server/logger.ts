import pino, { type Bindings, type Logger, type LoggerOptions } from "pino";

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

const options: LoggerOptions = {
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
};

export const logger: Logger = pino(options);

export function createScopedLogger(bindings: Bindings): Logger {
  return logger.child(bindings);
}

export type { Logger };
