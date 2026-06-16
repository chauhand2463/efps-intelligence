import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
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

    if (result.rows.length === 0) {
      throw new AppError('Notification not found', 404, ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }

    return result.rows[0] as Notification;
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

  async remove(id: string, dealerId: string) {
    const result = await query(
      `DELETE FROM notifications WHERE id = $1 AND dealer_id = $2 RETURNING id`,
      [id, dealerId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Notification not found', 404, ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }

    return { message: 'Notification deleted successfully' };
  }
}

export const notificationService = new NotificationService();
