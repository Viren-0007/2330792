const { getTopNNotifications } = require('./top_notifications');
const { Log } = require('../logging_middleware/middleware');

const API_URL = process.env.NOTIF_API_URL || 'http://4.224.186.213/evaluation-services/notifications';
const N = parseInt(process.env.TOP_N || '10', 10);

(async () => {
  try {
    await Log('notification', 'info', 'runner', `Starting top-${N} fetch from ${API_URL}`);
    const top = await getTopNNotifications(API_URL, N);
    await Log('notification', 'info', 'runner', `Top-${N} fetched, count=${top.length}`);
    for (const t of top) {
      await Log('notification', 'info', 'runner', `Top item id=${t.id || 'unknown'} category=${t.category} ts=${t.timestamp}`);
    }
    await Log('notification', 'info', 'runner', 'Runner finished successfully');
  } catch (err) {
    await Log('notification', 'error', 'runner', `Runner failed: ${err.message}`);
    process.exitCode = 1;
  }
})();