import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { JWTService } from '../services/jwt.service';
import { DeviceService } from '../services/device.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRegisterDevice } from '../middleware/validator.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const jwtService = new JWTService();
const deviceService = new DeviceService();
const authController = new AuthController(jwtService, deviceService);

// Register device
router.post('/register', authRateLimiter, validateRegisterDevice, authController.register);

// Verify token
router.get('/verify', authMiddleware(jwtService, deviceService), authController.verify);

export { router as authRoutes, jwtService, deviceService };
