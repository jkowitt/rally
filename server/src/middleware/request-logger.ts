import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    const line = `[${level}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 500) {
      console.error(line);
    } else if (res.statusCode >= 400) {
      console.warn(line);
    } else {
      console.log(line);
    }
  });

  // Add response time header
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!res.headersSent) return;
    // Header already set below before finish
  });

  const origEnd = res.end.bind(res);
  const startTime = start;
  res.setHeader('X-Response-Time', '0ms');

  res.end = function (...args: Parameters<Response['end']>) {
    const duration = Date.now() - startTime;
    try { res.setHeader('X-Response-Time', `${duration}ms`); } catch { /* headers sent */ }
    return origEnd(...args);
  } as Response['end'];

  next();
}
