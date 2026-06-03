const { Log } = require('../logging_middleware/middleware');

const DEFAULT_WEIGHTS = {
  placements: 3,
  events: 2,
  results: 1,
};

const WEIGHT_FACTOR = 1e12;

function computeScore(notification, weights = DEFAULT_WEIGHTS) {
  const weight = weights[notification.category] || 0;
  const ts = typeof notification.timestamp === 'number'
    ? notification.timestamp
    : Date.parse(notification.timestamp || '') || 0;
  return weight * WEIGHT_FACTOR + ts;
}
class MinHeap {
  constructor() {
    this.heap = [];
  }
  size() {
    return this.heap.length;
  }
  peek() {
    return this.heap[0];
  }
  push(item) {
    this.heap.push(item);
    this._siftUp(this.heap.length - 1);
  }
  replaceMin(item) {
    if (this.heap.length === 0) return this.push(item);
    this.heap[0] = item;
    this._siftDown(0);
  }
  toArray() {
    return this.heap.slice().sort((a, b) => b.score - a.score);
  }
  _siftUp(idx) {
    let i = idx;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.heap[p].score <= this.heap[i].score) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  _siftDown(idx) {
    let i = idx;
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.heap[l].score < this.heap[smallest].score) smallest = l;
      if (r < n && this.heap[r].score < this.heap[smallest].score) smallest = r;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

/**
 * Fetch notifications from the Notification API and return the top `n` based on category weight and recency.
 * This function performs a single fetch and returns current top-n (no DB or persistence).
 * @param {string} apiUrl - full URL to fetch notifications from (GET)
 * @param {number} n - number of top notifications to return
 */
async function getTopNNotifications(apiUrl, n = 10) {
  await Log('notification', 'info', 'priority-service', `Fetching notifications from ${apiUrl}`);

  if (typeof globalThis.fetch !== 'function') {
    await Log('notification', 'error', 'priority-service', 'fetch not available in runtime');
    throw new Error('fetch is not available in this runtime. Use Node 18+ or a fetch polyfill.');
  }

  const res = await fetch(apiUrl, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    await Log('notification', 'error', 'priority-service', `Failed to fetch notifications: ${res.status} ${text}`);
    throw new Error(`Failed to fetch notifications: ${res.status}`);
  }

  const notifications = await res.json();
  await Log('notification', 'info', 'priority-service', `Received ${Array.isArray(notifications) ? notifications.length : 0} notifications`);

  const heap = new MinHeap();

  for (const notif of (notifications || [])) {
    try {
      const score = computeScore(notif);
      const item = { notif, score };

      if (heap.size() < n) {
        heap.push(item);
        await Log('notification', 'info', 'priority-service', `Pushed notification id=${notif.id || 'unknown'} into top-${n}`);
      } else if (score > heap.peek().score) {
        const replaced = heap.peek();
        heap.replaceMin(item);
        await Log('notification', 'info', 'priority-service', `Replaced notification id=${replaced.notif.id || 'unknown'} with id=${notif.id || 'unknown'} in top-${n}`);
      }
    } catch (err) {
      await Log('notification', 'error', 'priority-service', `Error processing notification id=${notif && notif.id ? notif.id : 'unknown'}: ${err.message}`);
    }
  }

  const top = heap.toArray().map(x => x.notif);
  await Log('notification', 'info', 'priority-service', `Computed top-${n} notifications`);
  return top;
}

/**
 * Example streaming helper: given an async iterator of notifications (or a stream), maintain top-n and call `onUpdate` when top-n changes.
 * Demonstrates how to keep top-n efficiently as new notifications arrive.
 */
async function maintainTopNStream(asyncIterable, n = 10, onUpdate = async () => {}) {
  const heap = new MinHeap();
  let changed = false;

  for await (const notif of asyncIterable) {
    const score = computeScore(notif);
    const item = { notif, score };
    if (heap.size() < n) {
      heap.push(item);
      changed = true;
      await Log('notification', 'info', 'priority-service', `Stream: pushed id=${notif.id || 'unknown'} into top-${n}`);
    } else if (score > heap.peek().score) {
      const replaced = heap.peek();
      heap.replaceMin(item);
      changed = true;
      await Log('notification', 'info', 'priority-service', `Stream: replaced id=${replaced.notif.id || 'unknown'} with id=${notif.id || 'unknown'}`);
    }

    if (changed) {
      changed = false;
      const top = heap.toArray().map(x => x.notif);
      try {
        await onUpdate(top);
      } catch (err) {
        await Log('notification', 'error', 'priority-service', `onUpdate handler error: ${err.message}`);
      }
    }
  }
}

module.exports = {
  getTopNNotifications,
  maintainTopNStream,
  computeScore,
};
