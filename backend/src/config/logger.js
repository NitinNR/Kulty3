import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.resolve(__dirname, '../../logs');
const IS_VERCEL = !!process.env.VERCEL;

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '14d';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '20m';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}${stackStr}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const stackStr = stack ? `\n${stack}` : '';
    return `[${timestamp}] ${level}: ${message}${stackStr}`;
  })
);

const transports = [];

if (!IS_VERCEL) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOGS_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      zippedArchive: true,
      auditFile: path.join(LOGS_DIR, '.audit.json'),
    }),
    new DailyRotateFile({
      filename: path.join(LOGS_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: LOG_LEVEL,
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      zippedArchive: true,
      auditFile: path.join(LOGS_DIR, '.audit.json'),
    }),
    new DailyRotateFile({
      filename: path.join(LOGS_DIR, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      zippedArchive: true,
      auditFile: path.join(LOGS_DIR, '.audit.json'),
    })
  );
}

transports.push(
  new winston.transports.Console({
    level: IS_VERCEL ? LOG_LEVEL : 'debug',
    format: consoleFormat,
  })
);

const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  format: logFormat,
  transports,
  exceptionHandlers: !IS_VERCEL
    ? [
        new DailyRotateFile({
          filename: path.join(LOGS_DIR, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: LOG_MAX_SIZE,
          maxFiles: LOG_MAX_FILES,
          zippedArchive: true,
        }),
      ]
    : [],
  rejectionHandlers: !IS_VERCEL
    ? [
        new DailyRotateFile({
          filename: path.join(LOGS_DIR, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: LOG_MAX_SIZE,
          maxFiles: LOG_MAX_FILES,
          zippedArchive: true,
        }),
      ]
    : [],
  exitOnError: false,
});

export default logger;
