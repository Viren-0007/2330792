const DEFAULT_TEST_SERVER_URL = process.env.TEST_LOG_SERVER_URL || 'http://localhost:3000/log';

function normalizeString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string`);
  }

  return value.trim();
}

async function sendLogToServer(payload, url = DEFAULT_TEST_SERVER_URL) {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Fetch is not available in this runtime. Use Node 18+ or install a Fetch Polyfill.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Log server responded with status ${response.status}: ${text}`);
    error.status = response.status;
    throw error;
  }
  return response.json().catch(() => null);
}
async function Log(stack, level, pkg, message) {
  const payLoad = {
    timestamp: new Date().toISOString(),
    stack: normalizeString(stack, 'stack'),
    level: normalizeString(level, 'level'),
    package: normalizeString(pkg, 'package'),
    message: normalizeString(message, 'message'),
  };

  return sendLogToServer(payLoad);
}
module.exports = {
    Log,
    sendLogToServer,
    DEFAULT_TEST_SERVER_URL
}