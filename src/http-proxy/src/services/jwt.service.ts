import jwt from 'jsonwebtoken';
import { appConfig } from '../config';
import { JWTPayload } from '../models/types';

export class JWTService {
  private secret: string;
  private expiresIn: string;

  constructor() {
    this.secret = appConfig.jwt.secret;
    this.expiresIn = appConfig.jwt.expiresIn;
  }

  private getSecret(): string {
    return process.env.JWT_SECRET || this.secret;
  }

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.getSecret(), {
      expiresIn: this.expiresIn,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.getSecret()) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
