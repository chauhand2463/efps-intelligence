import { FastifyRequest, FastifyReply } from 'fastify';
import { syncPayloadSchema } from './internal-sync.schema.js';
import { processSyncPayload } from './internal-sync.service.js';
import { insertSystemEvent } from '../../shared/sync/system-events.service.js';
import { config } from '../../config/index.js';
import crypto from 'crypto';

const SERVICE_TOKEN = config.INTERNAL_SYNC_SECRET;
const TOKEN_HASH = crypto.createHash('sha256').update(SERVICE_TOKEN).digest('hex');

function verifyServiceToken(request: FastifyRequest): boolean {
  const token = request.headers['x-service-token'] as string | undefined;
  if (!token || !TOKEN_HASH) return false;
  const providedHash = crypto.createHash('sha256').update(token).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(TOKEN_HASH));
}

export async function handleSync(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!verifyServiceToken(request)) {
    await insertSystemEvent({
      eventType: 'SYNC_AUTH_FAILED',
      severity: 'warn',
      source: 'internal-sync-api',
      message: 'Invalid service token in sync request',
      metadata: { ip: request.ip },
    });
    reply.status(401).send({ error: 'Invalid service token' });
    return;
  }

  const parseResult = syncPayloadSchema.safeParse(request.body);
  if (!parseResult.success) {
    reply.status(400).send({
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    });
    return;
  }

  const payload = parseResult.data;

  try {
    const result = await processSyncPayload(payload);

    await insertSystemEvent({
      eventType: result.errors.length > 0 ? 'SYNC_PARTIAL' : 'SYNC_SUCCESS',
      severity: result.errors.length > 0 ? 'warn' : 'info',
      source: 'internal-sync-api',
      message: `Sync processed: ${result.processed} records, ${result.quarantined} quarantined${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
      metadata: {
        dealer_id: payload.dealer_id,
        sync_job_id: payload.sync_job_id,
        trace_id: payload.trace_id,
        totalRecords: result.totalRecords,
        processed: result.processed,
        quarantined: result.quarantined,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      traceId: payload.trace_id,
    });

    reply.status(200).send({
      success: true,
      data: {
        totalRecords: result.totalRecords,
        processed: result.processed,
        quarantined: result.quarantined,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    await insertSystemEvent({
      eventType: 'SYNC_FAILED',
      severity: 'error',
      source: 'internal-sync-api',
      message: `Sync failed: ${msg}`,
      metadata: { dealer_id: payload.dealer_id, sync_job_id: payload.sync_job_id, trace_id: payload.trace_id },
      traceId: payload.trace_id,
    });
    reply.status(500).send({ error: 'Sync processing failed', message: msg });
  }
}
