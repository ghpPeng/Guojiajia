import { config } from 'dotenv';

config();

interface Config {
  port: number;
  nodeEnv: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  gateway: {
    wsUrl: string;
  };
  logging: {
    level: string;
    dir: string;
  };
  cors: {
    origin: string;
  };
}

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  console.warn('⚠️  WARNING: Using insecure JWT secret for development - DO NOT USE IN PRODUCTION');
}

export const appConfig: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-only-for-testing',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  gateway: {
    wsUrl: process.env.GATEWAY_WS_URL || 'ws://localhost:8080',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
};
