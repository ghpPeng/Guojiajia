const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`Mock Gateway started on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[Gateway] Client connected');

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('[Gateway] Received:', message);

    // Echo response
    const response = {
      id: message.id,
      type: 'response',
      data: { echo: message.data, timestamp: Date.now() }
    };

    ws.send(JSON.stringify(response));
    console.log('[Gateway] Sent:', response);
  });

  ws.on('close', () => console.log('[Gateway] Client disconnected'));
});
