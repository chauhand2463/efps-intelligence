import type { FastifyRequest } from 'fastify';
import { query } from '../../config/database.js';

export interface AuditLogData {
  dealerId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  request: FastifyRequest;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await query(
      `INSERT INTO audit_logs (dealer_id, action, entity, entity_id, old_data, new_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.dealerId,
        data.action,
        data.entity,
        data.entityId,
        data.oldData ? JSON.stringify(data.oldData) : null,
        data.newData ? JSON.stringify(data.newData) : null,
        data.request.ip,
        data.request.headers['user-agent'] ?? null,
      ]
    );
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}
