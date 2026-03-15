// Device Model
export interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: 'android' | 'ios' | 'embedded';
  osVersion: string;
  appVersion: string;
  createdAt: Date;
  lastActiveAt: Date;
}

// JWT Payload
export interface JWTPayload {
  deviceId: string;
  deviceType: string;
  iat?: number;
  exp?: number;
}

// API Request/Response Types
export interface RegisterDeviceRequest {
  deviceName: string;
  deviceType: 'android' | 'ios' | 'embedded';
  osVersion: string;
  appVersion: string;
}

export interface RegisterDeviceResponse {
  success: boolean;
  data?: {
    deviceId: string;
    token: string;
  };
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    message: string;
    conversationId: string;
  };
  error?: string;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'chat' | 'ping' | 'pong' | 'error';
  payload: any;
  timestamp: number;
}

// Error Types
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}
