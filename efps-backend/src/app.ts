import Fastify from 'fastify';
import compress from '@fastify/compress';
import { config } from './config/index.js';
import { getRedis } from './config/redis.js';
import pool from './config/database.js';
import { errorHandler } from './shared/errors/error-handler.js';
import { registerCors } from './plugins/cors.plugin.js';
import { registerHelmet } from './plugins/helmet.plugin.js';
import { registerRateLimit } from './plugins/rate-limit.plugin.js';
import { registerSwagger } from './plugins/swagger.plugin.js';
import { registerAuthPlugin } from './plugins/auth.plugin.js';
import { registerMultipart } from './plugins/multipart.plugin.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { dealerRoutes } from './modules/dealer/dealer.routes.js';
import { beneficiaryRoutes } from './modules/beneficiary/beneficiary.routes.js';
import { transactionRoutes } from './modules/transaction/transaction.routes.js';
import { stockRoutes } from './modules/stock/stock.routes.js';
import { notificationRoutes } from './modules/notification/notification.routes.js';
import { reportRoutes } from './modules/report/report.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { liftingRoutes } from './modules/lifting/lifting.routes.js';
import { commissionRoutes } from './modules/commission/commission.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { syncRoutes } from './modules/sync/sync.routes.js';
import { adsRoutes } from './modules/ads/ads.routes.js';
import { mdmRoutes } from './modules/mdm/mdm.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { directoryRoutes } from './modules/directory/directory.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { hierarchyRoutes } from './modules/hierarchy/hierarchy.routes.js';
import { registerEventHandlers } from './shared/events/index.js';

export async function buildApp() {
  registerEventHandlers();
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
    requestIdHeader: 'X-Request-Id',
    keepAliveTimeout: 60000,
    connectionTimeout: 30000,
  });

  app.setErrorHandler(errorHandler);

  await registerAuthPlugin(app);
  await registerCors(app);
  await app.register(compress, { global: true, threshold: 1024 });
  await registerHelmet(app);
  await registerRateLimit(app);
  await registerMultipart(app);

  if (config.NODE_ENV !== 'production') {
    await registerSwagger(app);
  }

  const startTime = Date.now();

  app.get('/health', async () => {
    return {
      status: 'ok',
      version: '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/ready', async () => {
    const checks: Record<string, string> = {};
    let allReady = true;

    try {
      await pool.query('SELECT 1');
      checks.database = 'ok';
    } catch (err) {
      checks.database = `error: ${err}`;
      allReady = false;
    }

    try {
      await getRedis().ping();
      checks.redis = 'ok';
    } catch (err) {
      checks.redis = `error: ${err}`;
      allReady = false;
    }

    return {
      status: allReady ? 'ready' : 'degraded',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
      timestamp: new Date().toISOString(),
    };
  });

  await app.register(async (api) => {
    api.register(authRoutes);
    api.register(dealerRoutes);
    api.register(beneficiaryRoutes);
    api.register(transactionRoutes);
    api.register(stockRoutes);
    api.register(notificationRoutes);
    api.register(reportRoutes);
    api.register(adminRoutes);
    api.register(liftingRoutes);
    api.register(commissionRoutes);
    api.register(financeRoutes);
    api.register(syncRoutes);
    api.register(adsRoutes);
    api.register(mdmRoutes);
    api.register(auditRoutes);
    api.register(directoryRoutes);
    api.register(dashboardRoutes);
    api.register(hierarchyRoutes);
  }, { prefix: '/api/v1' });

  return app;
}
