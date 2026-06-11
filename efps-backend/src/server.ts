import { config } from './config/index.js';
import { buildApp } from './app.js';
import { getRedis, closeRedis } from './config/redis.js';
import pool from './config/database.js';

async function main() {
  const app = await buildApp();

  await getRedis().connect();

  const port = config.PORT;
  const host = config.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

  try {
    await app.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
    console.log(`API docs at http://${host}:${port}/docs`);
    if (process.send) process.send('ready');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }

  let shuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    const forceExit = setTimeout(() => {
      console.error('Forced exit after timeout');
      process.exit(1);
    }, 10000);

    try {
      await app.close();
      await closeRedis();
      await pool.end();
      clearTimeout(forceExit);
      console.log('Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('Shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}

main();
