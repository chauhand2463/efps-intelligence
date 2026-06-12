import type { FastifyRequest, FastifyReply } from 'fastify';
import { syncService } from './sync.service.js';
import { govtImporterService } from './govt-importer.service.js';
import { enqueueFullStateSync, enqueueDistrictSync } from '../../jobs/sync/govt-data-sync.job.js';
import {
  triggerSyncSchema, updateBankInfoSchema, importCsvSchema,
  importRowSchema, syncAllSchema, syncDistrictSchema,
} from './sync.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';
import { query } from '../../config/database.js';

export async function triggerSyncHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = triggerSyncSchema.parse(request.body);
  const result = await syncService.triggerSync(body);
  return sendCreated(reply, result);
}

export async function getSyncHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await syncService.getSyncHistory();
  return sendSuccess(reply, result);
}

export async function getBankInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await syncService.getBankInfo(request.user!.id);
  return sendSuccess(reply, result);
}

export async function updateBankInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = updateBankInfoSchema.parse(request.body);
  const result = await syncService.updateBankInfo(request.user!.id, body);
  return sendSuccess(reply, result);
}

export async function importCsvHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = importCsvSchema.parse(request.body);
  const result = await govtImporterService.importBeneficiaries(
    request.user!.id,
    body.rows,
    'csv',
  );
  return sendCreated(reply, result);
}

export async function importSingleRowHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = importRowSchema.parse(request.body);
  const result = await govtImporterService.importBeneficiaries(
    request.user!.id,
    [body],
    'manual',
  );
  return sendCreated(reply, result);
}

export async function syncAllDealersHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = syncAllSchema.parse(request.body ?? {});
  const result = await enqueueFullStateSync();
  return sendSuccess(reply, { message: `Sync queued for ${result.queued} dealers`, ...result });
}

export async function syncDistrictHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = syncDistrictSchema.parse(request.body);
  const result = await enqueueDistrictSync(body.district);
  return sendSuccess(reply, { message: `Sync queued for ${result.queued} dealers in ${body.district}`, ...result });
}

export async function getImportBatchesHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await query(
    `SELECT * FROM sync_import_batches ORDER BY created_at DESC LIMIT 20`
  );
  return sendSuccess(reply, result.rows);
}

export async function getChangeLogHandler(request: FastifyRequest, reply: FastifyReply) {
  const { batchId } = request.params as { batchId: string };
  const result = await query(
    `SELECT gcl.*, b.ration_card_no, b.head_of_family
     FROM govt_change_log gcl
     LEFT JOIN beneficiaries b ON b.id = gcl.beneficiary_id
     WHERE gcl.sync_batch_id = $1
     ORDER BY gcl.created_at DESC
     LIMIT 100`,
    [batchId]
  );
  return sendSuccess(reply, result.rows);
}
