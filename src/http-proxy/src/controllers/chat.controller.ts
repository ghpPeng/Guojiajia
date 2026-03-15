import { Request, Response } from 'express';
import { WebSocketServer } from '../websocket/server';

export class ChatController {
  constructor(private wsServer: WebSocketServer) {}

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const { message, conversationId } = req.body;
    const deviceId = req.device!.deviceId;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    // Send via WebSocket if connected
    const sent = this.wsServer.sendToDevice(deviceId, {
      type: 'chat',
      payload: { message, conversationId },
      timestamp: Date.now(),
    });

    if (sent) {
      res.status(200).json({
        success: true,
        data: {
          message: 'Message sent via WebSocket',
          conversationId: conversationId || 'new',
        },
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Device not connected via WebSocket',
      });
    }
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const deviceId = req.device!.deviceId;
    const connected = this.wsServer.getConnectedDevices();

    res.status(200).json({
      success: true,
      data: {
        deviceId,
        wsConnected: connected.includes(deviceId),
        connectedDevices: connected.length,
      },
    });
  };
}
