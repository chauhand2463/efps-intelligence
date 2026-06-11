import { query } from '../../config/database.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { Notification } from '../../shared/types/models.js';
import type { ListNotificationsInput } from './notification.schema.js';

export class NotificationService {
  async list(dealerId: string, params: ListNotificationsInput) {
    const { offset, limit, page } = parsePaginationParams({ page: params.page, limit: params.limit });

    const countResult = await query(
      `SELECT COUNT(*) FROM notifications WHERE dealer_id = $1`,
      [dealerId]
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT * FROM notifications WHERE dealer_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [dealerId, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows as Notification[], total, page, limit);
  }

  async markAsRead(id: string, dealerId: string) {
    const result = await query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND dealer_id = $2 RETURNING *`,
      [id, dealerId]
    );

    return result.rows[0] as Notification | undefined;
  }

  async markAllAsRead(dealerId: string) {
    const result = await query(
      `UPDATE notifications SET is_read = TRUE
       WHERE dealer_id = $1 AND is_read = FALSE
       RETURNING *`,
      [dealerId]
    );

    return result.rows as Notification[];
  }

  async create(dealerId: string, title: string, body: string, type: string = 'info') {
    const result = await query(
      `INSERT INTO notifications (dealer_id, title, body, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [dealerId, title, body, type]
    );

    return result.rows[0] as Notification;
  }
}

export const notificationService = new NotificationService();
