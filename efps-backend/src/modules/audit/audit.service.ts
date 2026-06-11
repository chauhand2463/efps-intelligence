export class AuditService {
  async create(dealerId: string, input: { title: string; meeting_date: string; venue?: string; total_beneficiaries_verified?: number; issues_identified?: string; resolutions?: string }) {
    const { query } = await import('../../config/database.js');
    const result = await query(
      `INSERT INTO social_audit_meetings (dealer_id, title, meeting_date, venue, total_beneficiaries_verified, issues_identified, resolutions)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [dealerId, input.title, input.meeting_date, input.venue ?? null, input.total_beneficiaries_verified ?? 0, input.issues_identified ?? null, input.resolutions ?? null]
    );
    return result.rows[0];
  }

  async list(dealerId: string) {
    const { query } = await import('../../config/database.js');
    const result = await query(
      `SELECT * FROM social_audit_meetings WHERE dealer_id = $1 ORDER BY meeting_date DESC`,
      [dealerId]
    );
    return result.rows;
  }
}

export const auditService = new AuditService();
