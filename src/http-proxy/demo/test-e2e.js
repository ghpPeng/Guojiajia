const http = require('http');
const WebSocket = require('ws');

const PROXY_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

let testResults = [];
let startTime;

function log(message, data = '') {
  const timestamp = Date.now() - startTime;
  console.log(`[${timestamp}ms] ${message}`, data);
}

function addResult(test, passed, details = '') {
  testResults.push({ test, passed, details });
  log(`${passed ? '✓' : '✗'} ${test}`, details);
}

async function httpRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  startTime = Date.now();
  console.log('=== HTTP Proxy E2E Test ===\n');

  try {
    // Test 1: Health check
    log('Test 1: Health check');
    const health = await httpRequest('GET', '/health');
    addResult('Health check', health.status === 200 && health.data.status === 'ok');

    // Test 2: Register device
    log('Test 2: Register device');
    const register = await httpRequest('POST', '/api/auth/register', {
      deviceName: 'Test Device',
      deviceType: 'ios',
      osVersion: '17.0',
      appVersion: '1.0.0'
    });
    addResult('Device registration', register.status === 200 && register.data.token);

    const token = register.data.token;
    const deviceId = register.data.deviceId;
    log('Token obtained', token.substring(0, 20) + '...');

    // Test 3: WebSocket connection
    log('Test 3: WebSocket connection with token');
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WS timeout')), 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        addResult('WebSocket connection', true);

        // Test 4: Send message
        log('Test 4: Send message to proxy');
        const msgId = Date.now().toString();
        ws.send(JSON.stringify({
          id: msgId,
          type: 'request',
          data: { action: 'test', payload: 'Hello Gateway' }
        }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        log('Received response', JSON.stringify(msg));
        addResult('Message round-trip', msg.type === 'response' && msg.data.echo);
        ws.close();
        resolve();
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        addResult('WebSocket connection', false, err.message);
        reject(err);
      });
    });

    // Summary
    console.log('\n=== Test Summary ===');
    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    console.log(`Passed: ${passed}/${total}`);
    console.log(`Duration: ${Date.now() - startTime}ms`);

    process.exit(passed === total ? 0 : 1);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
