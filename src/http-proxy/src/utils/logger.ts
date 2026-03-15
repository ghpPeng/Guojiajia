import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { appConfig } from '../config';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports: winston.transport[] = [];

// Console transport for development
if (appConfig.nodeEnv !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// File transports
if (appConfig.nodeEnv !== 'test') {
  // Error log
  transports.push(
    new DailyRotateFile({
      filename: path.join(appConfig.logging.dir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
      format: logFormat,
    })
  );

  // Combined log
  transports.push(
    new DailyRotateFile({
      filename: path.join(appConfig.logging.dir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: logFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: appConfig.logging.level,
  format: logFormat,
  transports,
});
