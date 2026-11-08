import { preview } from 'vite';

// Catch unhandled stream errors on Node 26.3.1 for missing old asset hashes
process.on('uncaughtException', (err) => {
  if (err && (err.code === 'ENOENT' || (err.message && err.message.includes('ENOENT')))) {
    console.warn('[preview-server] Handled missing asset gracefully:', err.message);
    return;
  }
  console.error('[preview-server] Uncaught exception:', err);
  process.exit(1);
});

const server = await preview({
  preview: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true
  }
});
server.printUrls();
