import express, { Application } from 'express';
import cors from 'cors';
import { appConfig } from './config';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRoutes, healthRoutes } from './routes';

export const app: Application = express();

// Middleware
app.use(cors({
  origin: appConfig.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(loggerMiddleware);

// Routes
app.use('/health', healthRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handling
app.use(errorMiddleware);

export default app;
