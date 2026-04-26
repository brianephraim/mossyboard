import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "warn"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.set-cookie",
      'req.headers["set-cookie"]',
      "headers.authorization",
      "headers.cookie",
      "headers.set-cookie",
      'headers["set-cookie"]',
    ],
    remove: true,
  },
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
});
