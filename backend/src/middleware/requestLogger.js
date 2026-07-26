import logger from '../config/logger.js';

const SENSITIVE_FIELDS = ['password', 'token', 'authorization', 'cookie', 'secret', 'privateKey'];

function maskSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f))) {
      masked[key] = '***';
    }
  }
  return masked;
}

export function requestLogger(req, res, next) {
  const start = Date.now();

  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length'),
    };

    if (req.user?.uid) {
      logData.userId = req.user.uid;
    }

    logger.log(level, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`, logData);

    originalEnd.apply(this, args);
  };

  next();
}
