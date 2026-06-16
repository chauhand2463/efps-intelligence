import type { FastifyInstance } from 'fastify';
import Prometheus from 'prom-client';

Prometheus.collectDefaultMetrics({ register: Prometheus.register });

export const httpRequestDuration = new Prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
});

export const httpRequestsTotal = new Prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const activeConnections = new Prometheus.Gauge({
  name: 'http_active_connections',
  help: 'Number of active connections',
});

export async function registerMetrics(app: FastifyInstance) {
  app.addHook('onRequest', async (_request) => {
    activeConnections.inc();
  });

  app.addHook('onResponse', async (request, reply) => {
    activeConnections.dec();
    const route = request.routeOptions?.url ?? request.url;
    httpRequestsTotal.inc({ method: request.method, route, status_code: reply.statusCode });
    httpRequestDuration.observe(
      { method: request.method, route, status_code: reply.statusCode },
      reply.elapsedTime / 1000
    );
  });
}
