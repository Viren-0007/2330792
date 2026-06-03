**Priority Inbox Design (Stage 1)**

- **Context**: Campus notification platform delivering real-time updates for Placements, Events, and Results. Users are already authorized; no auth/login required for this assessment.

**Goal**: Provide a priority inbox that always surfaces the top `n` unread notifications (default example: top 10). Priority is based on a combination of category weight (placements > events > results) and recency.

**Scoring & Ranking**
- Assign category weights: `placements = 3`, `events = 2`, `results = 1`.
- Compute a composite score for each notification: `score = weight * WEIGHT_FACTOR + timestamp_ms` where `WEIGHT_FACTOR` is a large constant (e.g. 1e12) so that category weight dominates recency but recency breaks ties and ranks newer items higher.

**Choosing Top N Efficiently (Streaming / Continuous Updates)**n
- Use a min-heap (priority queue) of size `n` to maintain the current top `n` notifications as new notifications arrive.
- For each incoming notification, compute `score`. If heap size < n, push. Else if `score > heap.min.score`, replace the min element with the new one.
- Complexity: each insertion costs O(log n), memory O(n). This is optimal for high-throughput streaming when `n` is small (e.g., 10–20).

**Why a Min-Heap**
- Sorting the whole dataset every time is O(m log m) (m = total notifications) and inefficient when m is large or unbounded. The min-heap approach restricts work to O(log n) per new item and keeps memory bounded.

**Handling Recency**
- Timestamp should be in epoch milliseconds. Using `score = weight * WEIGHT_FACTOR + timestamp_ms` ensures category weight always outranks recency differences unless they cross a weight boundary (intended behavior).

**Integration with Logging Middleware**
- All significant lifecycle events must be logged via the provided middleware function `Log(stack, level, package, message)` (no console or other loggers):
  - Fetch start/complete/failure
  - Number of notifications received
  - When top-N changes (e.g., new item enters top-N or replacement occurs)
  - Errors and exceptional conditions
- The implementation files for Stage 1 use the `Log` API extensively; see `notification_app_be/top_notifications.js` for examples.

**Persistence & UI**
- Stage 1 does not require storing notifications. The priority selection runs in-memory and can be exposed via an API endpoint for a frontend to poll or via WebSocket push events.

**Fault Tolerance & Backpressure**
- If stream rate is higher than processing capacity, consider batching incoming notifications and processing batches into the heap to amortize heap operations.
- For production, persist the current top-n to a fast key-value store (e.g., Redis) to survive restarts and to serve multiple app instances.

**Files added for Stage 1**
- `notification_app_be/top_notifications.js` — contains `getTopNNotifications(apiUrl, n)` and a streaming helper `maintainTopNStream` that demonstrate maintaining top-n using a min-heap and extensive `Log()` calls.
- `notification_app_be/run_top10.js` — example runner showing how to call the module and log lifecycle events.

**How to run (example)**
- Ensure Node 18+ (for global `fetch`) or install a fetch polyfill.
- Set the environment variable `NOTIF_API_URL` to the Notification API base URL.

```bash
# from workspace root
cd notification_app_be
node run_top10.js
```

**Notes**
- The implementation intentionally avoids any built-in or console logging; all logs go through the middleware `Log()`.
- The design is ready to be extended to multiple categories or adjustable weights.
