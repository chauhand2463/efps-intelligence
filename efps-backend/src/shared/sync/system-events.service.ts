import pool from '../../config/database.js';

interface SystemEventInput {
  eventType: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export async function insertSystemEvent(event: SystemEventInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO system_events (event_type, severity, source, message, metadata, trace_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event.eventType, event.severity, event.source, event.message, event.metadata ? JSON.stringify(event.metadata) : null, event.traceId ?? null]
    );
  } catch {
    // best-effort event logging
  }
}

export async function getRecentEvents(limit = 50, severity?: string): Promise<Record<string, unknown>[]> {
  const query = severity
    ? `SELECT * FROM system_events WHERE severity = $1 ORDER BY created_at DESC LIMIT $2`
    : `SELECT * FROM system_events ORDER BY created_at DESC LIMIT $1`;
  const params = severity ? [severity, limit] : [limit];
  const result = await pool.query(query, params);
  return result.rows;
}
