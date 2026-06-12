import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';
import type { ImportCsvRow } from './hierarchy.schema.js';

interface RegionSummary {
  id: string;
  name: string;
  level: string;
  code: string | null;
  child_count: number;
  total_cards: number;
  total_beneficiaries: number;
  month: string;
}

interface RegionDetail extends RegionSummary {
  parent_id: string | null;
  parent_name: string | null;
  path: string | null;
  nfsa_aay_rc: number;
  nfsa_aay_ben: number;
  nfsa_phh_rc: number;
  nfsa_phh_ben: number;
  nfsa_apl1_rc: number;
  nfsa_apl1_ben: number;
  nfsa_apl2_rc: number;
  nfsa_apl2_ben: number;
  nfsa_bpl_rc: number;
  nfsa_bpl_ben: number;
  non_nfsa_apl1_rc: number;
  non_nfsa_apl1_ben: number;
  non_nfsa_apl2_rc: number;
  non_nfsa_apl2_ben: number;
  non_nfsa_bpl_rc: number;
  non_nfsa_bpl_ben: number;
}

export class HierarchyService {
  async getStateLevel(month: string) {
    const cacheKey = `hierarchy:state:${month}`;
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as { summary: RegionSummary; districts: RegionSummary[] };

    const summary = await query(
      `SELECT COALESCE(SUM(total_cards), 0) as total_cards,
              COALESCE(SUM(total_beneficiaries), 0) as total_beneficiaries,
              COUNT(*) as child_count
       FROM gujarat_aggregate_stats s
       JOIN gujarat_region_hierarchy r ON r.id = s.region_id
       WHERE r.level = 'district' AND s.month = $1`,
      [month]
    );

    const districts = await query(
      `SELECT r.id, r.name, r.code, r.level,
              COALESCE(s.total_cards, 0) as total_cards,
              COALESCE(s.total_beneficiaries, 0) as total_beneficiaries,
              s.month,
              (SELECT COUNT(*) FROM gujarat_region_hierarchy WHERE parent_id = r.id) as child_count
       FROM gujarat_region_hierarchy r
       LEFT JOIN gujarat_aggregate_stats s ON s.region_id = r.id AND s.month = $1
       WHERE r.level = 'district'
       ORDER BY r.name`,
      [month]
    );

    const stateSummary = await query(
      `SELECT id, name, code, level FROM gujarat_region_hierarchy WHERE level = 'state' LIMIT 1`
    );

    const result = {
      summary: {
        id: stateSummary.rows[0]?.id ?? null,
        name: 'Gujarat',
        level: 'state',
        code: 'GJ',
        child_count: districts.rows.length,
        total_cards: Number(summary.rows[0]?.total_cards ?? 0),
        total_beneficiaries: Number(summary.rows[0]?.total_beneficiaries ?? 0),
        month,
      },
      districts: districts.rows.map((r) => ({
        ...r,
        total_cards: Number(r.total_cards),
        total_beneficiaries: Number(r.total_beneficiaries),
        child_count: Number(r.child_count),
      })),
    };

    await redis.set(cacheKey, JSON.stringify(result), 'EX', 600);
    return result;
  }

  async getChildren(parentId: string, month: string) {
    const cacheKey = `hierarchy:children:${parentId}:${month}`;
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as { parent: RegionSummary; children: RegionSummary[] };

    const parent = await query(
      `SELECT r.id, r.name, r.level, r.code,
              COALESCE(s.total_cards, 0) as total_cards,
              COALESCE(s.total_beneficiaries, 0) as total_beneficiaries,
              s.month,
              (SELECT COUNT(*) FROM gujarat_region_hierarchy WHERE parent_id = r.id) as child_count
       FROM gujarat_region_hierarchy r
       LEFT JOIN gujarat_aggregate_stats s ON s.region_id = r.id AND s.month = $1
       WHERE r.id = $2`,
      [month, parentId]
    );

    if (parent.rows.length === 0) {
      return null;
    }

    const children = await query(
      `SELECT r.id, r.name, r.code, r.level,
              COALESCE(s.total_cards, 0) as total_cards,
              COALESCE(s.total_beneficiaries, 0) as total_beneficiaries,
              s.month,
              (SELECT COUNT(*) FROM gujarat_region_hierarchy WHERE parent_id = r.id) as child_count
       FROM gujarat_region_hierarchy r
       LEFT JOIN gujarat_aggregate_stats s ON s.region_id = r.id AND s.month = $1
       WHERE r.parent_id = $2
       ORDER BY r.sort_order, r.name`,
      [month, parentId]
    );

    const result = {
      parent: {
        ...parent.rows[0],
        total_cards: Number(parent.rows[0].total_cards),
        total_beneficiaries: Number(parent.rows[0].total_beneficiaries),
        child_count: Number(parent.rows[0].child_count),
      },
      children: children.rows.map((r) => ({
        ...r,
        total_cards: Number(r.total_cards),
        total_beneficiaries: Number(r.total_beneficiaries),
        child_count: Number(r.child_count),
      })),
    };

    await redis.set(cacheKey, JSON.stringify(result), 'EX', 600);
    return result;
  }

  async getRegionDetail(regionId: string, month: string) {
    const cacheKey = `hierarchy:detail:${regionId}:${month}`;
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as RegionDetail | null;

    const result = await query(
      `SELECT r.id, r.parent_id, r.level, r.name, r.code, r.path::text,
              rp.name as parent_name,
              s.nfsa_aay_rc, s.nfsa_aay_ben,
              s.nfsa_phh_rc, s.nfsa_phh_ben,
              s.nfsa_apl1_rc, s.nfsa_apl1_ben,
              s.nfsa_apl2_rc, s.nfsa_apl2_ben,
              s.nfsa_bpl_rc, s.nfsa_bpl_ben,
              s.non_nfsa_apl1_rc, s.non_nfsa_apl1_ben,
              s.non_nfsa_apl2_rc, s.non_nfsa_apl2_ben,
              s.non_nfsa_bpl_rc, s.non_nfsa_bpl_ben,
              s.total_phh_rc, s.total_phh_ben,
              s.nfsa_total_rc, s.nfsa_total_ben,
              s.non_nfsa_total_rc, s.non_nfsa_total_ben,
              COALESCE(s.total_cards, 0) as total_cards,
              COALESCE(s.total_beneficiaries, 0) as total_beneficiaries,
              s.month,
              (SELECT COUNT(*) FROM gujarat_region_hierarchy WHERE parent_id = r.id) as child_count
       FROM gujarat_region_hierarchy r
       LEFT JOIN gujarat_aggregate_stats s ON s.region_id = r.id AND s.month = $2
       LEFT JOIN gujarat_region_hierarchy rp ON rp.id = r.parent_id
       WHERE r.id = $1`,
      [regionId, month]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const detail: RegionDetail = {
      id: row.id,
      parent_id: row.parent_id,
      parent_name: row.parent_name,
      name: row.name,
      level: row.level,
      code: row.code,
      path: row.path,
      child_count: Number(row.child_count),
      total_cards: Number(row.total_cards),
      total_beneficiaries: Number(row.total_beneficiaries),
      month: row.month ?? month,
      nfsa_aay_rc: Number(row.nfsa_aay_rc ?? 0),
      nfsa_aay_ben: Number(row.nfsa_aay_ben ?? 0),
      nfsa_phh_rc: Number(row.nfsa_phh_rc ?? 0),
      nfsa_phh_ben: Number(row.nfsa_phh_ben ?? 0),
      nfsa_apl1_rc: Number(row.nfsa_apl1_rc ?? 0),
      nfsa_apl1_ben: Number(row.nfsa_apl1_ben ?? 0),
      nfsa_apl2_rc: Number(row.nfsa_apl2_rc ?? 0),
      nfsa_apl2_ben: Number(row.nfsa_apl2_ben ?? 0),
      nfsa_bpl_rc: Number(row.nfsa_bpl_rc ?? 0),
      nfsa_bpl_ben: Number(row.nfsa_bpl_ben ?? 0),
      non_nfsa_apl1_rc: Number(row.non_nfsa_apl1_rc ?? 0),
      non_nfsa_apl1_ben: Number(row.non_nfsa_apl1_ben ?? 0),
      non_nfsa_apl2_rc: Number(row.non_nfsa_apl2_rc ?? 0),
      non_nfsa_apl2_ben: Number(row.non_nfsa_apl2_ben ?? 0),
      non_nfsa_bpl_rc: Number(row.non_nfsa_bpl_rc ?? 0),
      non_nfsa_bpl_ben: Number(row.non_nfsa_bpl_ben ?? 0),
    };

    await redis.set(cacheKey, JSON.stringify(detail), 'EX', 600);
    return detail;
  }

  async getFpsForWard(wardId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const dealers = await query(
      `SELECT d.id, d.fps_id, d.full_name, d.mobile, d.village, d.is_active,
              (SELECT COUNT(*) FROM beneficiaries WHERE dealer_id = d.id AND is_active = TRUE) as beneficiary_count
       FROM dealers d
       WHERE d.gujarat_region_id = $1
       ORDER BY d.full_name
       LIMIT $2 OFFSET $3`,
      [wardId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM dealers WHERE gujarat_region_id = $1`,
      [wardId]
    );

    return {
      dealers: dealers.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
      page,
      limit,
    };
  }

  async getRegionBreadcrumb(regionId: string) {
    const result = await query(
      `WITH RECURSIVE ancestors AS (
         SELECT id, parent_id, name, level, code, 0 AS depth
         FROM gujarat_region_hierarchy WHERE id = $1
         UNION ALL
         SELECT r.id, r.parent_id, r.name, r.level, r.code, a.depth + 1
         FROM gujarat_region_hierarchy r
         INNER JOIN ancestors a ON r.id = a.parent_id
       )
       SELECT id, name, level, code FROM ancestors ORDER BY depth DESC`,
      [regionId]
    );

    return result.rows;
  }

  async importCsvData(
    level: 'state' | 'district' | 'taluka' | 'ward',
    month: string,
    rows: ImportCsvRow[],
    parentRegionName?: string,
  ) {
    let parentId: string | null = null;

    if (level !== 'state') {
      if (!parentRegionName) {
        throw new Error(`parentRegionName is required for level '${level}'`);
      }
      if (level === 'district') {
        const state = await query(`SELECT id FROM gujarat_region_hierarchy WHERE level = 'state' LIMIT 1`);
        if (state.rows.length === 0) throw new Error('State region not found. Seed state first.');
        parentId = state.rows[0].id;
      } else {
        const parent = await query(
          `SELECT id FROM gujarat_region_hierarchy WHERE LOWER(name) = LOWER($1) AND level = $2 LIMIT 1`,
          [parentRegionName, level === 'taluka' ? 'district' : 'taluka']
        );
        if (parent.rows.length === 0) {
          throw new Error(`Parent region '${parentRegionName}' not found`);
        }
        parentId = parent.rows[0].id;
      }
    }

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    const regionIds: string[] = [];

    for (const row of rows) {
      const existing = await query(
        `SELECT id FROM gujarat_region_hierarchy WHERE LOWER(name) = LOWER($1) AND parent_id IS NOT DISTINCT FROM $2 AND level = $3`,
        [row.areaName, parentId, level]
      );

      let regionId: string;
      if (existing.rows.length > 0) {
        regionId = existing.rows[0].id;
        await query(
          `UPDATE gujarat_region_hierarchy SET updated_at = NOW() WHERE id = $1`,
          [regionId]
        );
      } else {
        const sortOrder = row.srNo ?? 0;
        const code = level === 'state' ? 'GJ'
          : `${level === 'district' ? 'D' : level === 'taluka' ? 'T' : 'W'}_${row.srNo ?? 0}`;
        const newRegion = await query(
          `INSERT INTO gujarat_region_hierarchy (parent_id, level, name, code, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [parentId, level, row.areaName, code, sortOrder]
        );
        regionId = newRegion.rows[0].id;

        if (parentId) {
          await query(
            `UPDATE gujarat_region_hierarchy SET path = (SELECT path FROM gujarat_region_hierarchy WHERE id = $1) || text2ltree($2::text) WHERE id = $3`,
            [parentId, regionId.replace(/-/g, '_'), regionId]
          );
        } else {
          await query(
            `UPDATE gujarat_region_hierarchy SET path = text2ltree($1::text) WHERE id = $2`,
            [regionId.replace(/-/g, '_'), regionId]
          );
        }
      }

      const totalCards = row.totalCards ?? (
        row.nfsaAayRc + row.nfsaPhhRc + row.nfsaApl1Rc + row.nfsaApl2Rc + row.nfsaBplRc +
        row.nonNfsaApl1Rc + row.nonNfsaApl2Rc + row.nonNfsaBplRc
      );
      const totalBeneficiaries = row.totalBeneficiaries ?? (
        row.nfsaAayBen + row.nfsaPhhBen + row.nfsaApl1Ben + row.nfsaApl2Ben + row.nfsaBplBen +
        row.nonNfsaApl1Ben + row.nonNfsaApl2Ben + row.nonNfsaBplBen
      );

      const existingStat = await query(
        `SELECT id FROM gujarat_aggregate_stats WHERE region_id = $1 AND month = $2`,
        [regionId, month]
      );

      if (existingStat.rows.length > 0) {
        await query(
          `UPDATE gujarat_aggregate_stats SET
             nfsa_aay_rc = $1, nfsa_aay_ben = $2,
             nfsa_phh_rc = $3, nfsa_phh_ben = $4,
             nfsa_apl1_rc = $5, nfsa_apl1_ben = $6,
             nfsa_apl2_rc = $7, nfsa_apl2_ben = $8,
             nfsa_bpl_rc = $9, nfsa_bpl_ben = $10,
             non_nfsa_apl1_rc = $11, non_nfsa_apl1_ben = $12,
             non_nfsa_apl2_rc = $13, non_nfsa_apl2_ben = $14,
             non_nfsa_bpl_rc = $15, non_nfsa_bpl_ben = $16,
             total_cards = $17, total_beneficiaries = $18
           WHERE id = $19`,
          [
            row.nfsaAayRc, row.nfsaAayBen,
            row.nfsaPhhRc, row.nfsaPhhBen,
            row.nfsaApl1Rc, row.nfsaApl1Ben,
            row.nfsaApl2Rc, row.nfsaApl2Ben,
            row.nfsaBplRc, row.nfsaBplBen,
            row.nonNfsaApl1Rc, row.nonNfsaApl1Ben,
            row.nonNfsaApl2Rc, row.nonNfsaApl2Ben,
            row.nonNfsaBplRc, row.nonNfsaBplBen,
            totalCards, totalBeneficiaries,
            existingStat.rows[0].id,
          ]
        );
        updated++;
      } else {
        await query(
          `INSERT INTO gujarat_aggregate_stats
             (region_id, month, source,
              nfsa_aay_rc, nfsa_aay_ben,
              nfsa_phh_rc, nfsa_phh_ben,
              nfsa_apl1_rc, nfsa_apl1_ben,
              nfsa_apl2_rc, nfsa_apl2_ben,
              nfsa_bpl_rc, nfsa_bpl_ben,
              non_nfsa_apl1_rc, non_nfsa_apl1_ben,
              non_nfsa_apl2_rc, non_nfsa_apl2_ben,
              non_nfsa_bpl_rc, non_nfsa_bpl_ben,
              total_cards, total_beneficiaries)
           VALUES ($1, $2, 'govt_csv',
             $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
             $13, $14, $15, $16, $17, $18,
             $19, $20)`,
          [
            regionId, month,
            row.nfsaAayRc, row.nfsaAayBen,
            row.nfsaPhhRc, row.nfsaPhhBen,
            row.nfsaApl1Rc, row.nfsaApl1Ben,
            row.nfsaApl2Rc, row.nfsaApl2Ben,
            row.nfsaBplRc, row.nfsaBplBen,
            row.nonNfsaApl1Rc, row.nonNfsaApl1Ben,
            row.nonNfsaApl2Rc, row.nonNfsaApl2Ben,
            row.nonNfsaBplRc, row.nonNfsaBplBen,
            totalCards, totalBeneficiaries,
          ]
        );
        inserted++;
      }

      regionIds.push(regionId);
    }

    await query(
      `INSERT INTO gujarat_csv_imports (level, month, total_rows, inserted_rows, updated_rows, unchanged_rows, region_ids, raw_sample)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [level, month, rows.length, inserted, updated, unchanged, regionIds, JSON.stringify(rows.slice(0, 3))]
    );

    const cacheKeys = [
      `hierarchy:state:${month}`,
      ...(parentId ? [`hierarchy:children:${parentId}:${month}`] : []),
    ];
    const redis = getRedis();
    for (const key of cacheKeys) {
      await redis.del(key);
    }

    return { inserted, updated, unchanged, total: rows.length, regionCount: regionIds.length };
  }

  async searchRegions(queryStr: string, level?: string, limit = 20) {
    const conditions = [`r.is_active = TRUE`];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (queryStr) {
      conditions.push(`(r.name ILIKE $${paramIdx} OR r.code ILIKE $${paramIdx})`);
      params.push(`%${queryStr}%`);
      paramIdx++;
    }

    if (level) {
      conditions.push(`r.level = $${paramIdx}`);
      params.push(level);
      paramIdx++;
    }

    const result = await query(
      `SELECT r.id, r.name, r.level, r.code, r.parent_id,
              rp.name as parent_name,
              (SELECT COALESCE(SUM(total_cards), 0) FROM gujarat_aggregate_stats WHERE region_id = r.id) as total_cards,
              (SELECT COALESCE(SUM(total_beneficiaries), 0) FROM gujarat_aggregate_stats WHERE region_id = r.id) as total_beneficiaries
       FROM gujarat_region_hierarchy r
       LEFT JOIN gujarat_region_hierarchy rp ON rp.id = r.parent_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.name
       LIMIT $${paramIdx}`,
      [...params, limit]
    );

    return result.rows;
  }

  async getAvailableMonths() {
    const result = await query(
      `SELECT DISTINCT month FROM gujarat_aggregate_stats ORDER BY month DESC LIMIT 12`
    );
    return result.rows.map((r) => r.month);
  }

  async getChangeHistory(regionId: string, limit = 20) {
    const result = await query(
      `SELECT s.month, s.total_cards, s.total_beneficiaries, s.nfsa_total_rc, s.nfsa_total_ben,
              s.non_nfsa_total_rc, s.non_nfsa_total_ben, s.created_at
       FROM gujarat_aggregate_stats s
       WHERE s.region_id = $1
       ORDER BY s.month DESC
       LIMIT $2`,
      [regionId, limit]
    );
    return result.rows;
  }
}

export const hierarchyService = new HierarchyService();
