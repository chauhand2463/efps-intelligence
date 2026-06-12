import { config } from '../src/config/index.js';
import pg from 'pg';
import * as fs from 'fs';
import * as readline from 'readline';
import { parse } from 'csv-parse/sync';

const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

interface CsvRow {
  srNo: string;
  areaName: string;
  nfsaAayRc: string;
  nfsaAayBen: string;
  nfsaPhhRc: string;
  nfsaPhhBen: string;
  nfsaApl1Rc: string;
  nfsaApl1Ben: string;
  nfsaApl2Rc: string;
  nfsaApl2Ben: string;
  nfsaBplRc: string;
  nfsaBplBen: string;
  nonNfsaApl1Rc: string;
  nonNfsaApl1Ben: string;
  nonNfsaApl2Rc: string;
  nonNfsaApl2Ben: string;
  nonNfsaBplRc: string;
  nonNfsaBplBen: string;
  totalCards: string;
  totalBeneficiaries: string;
}

function tabToCsv(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const cols = line.split('\t');
      return cols
        .map((c) => {
          if (c.includes(',') || c.includes('"') || c.includes('\n')) {
            return `"${c.replace(/"/g, '""')}"`;
          }
          return c;
        })
        .join(',');
    })
    .join('\n');
}

async function importLevel(
  filePath: string,
  level: 'district' | 'taluka' | 'ward',
  month: string,
  parentRegionName?: string,
) {
  console.log(`\n=== Importing ${level} level from ${filePath} ===`);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const csvData = tabToCsv(raw);

  let records: Record<string, string | undefined>[];
  try {
    records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });
  } catch (err) {
    console.error('CSV parse error:', err);
    console.log('Trying without headers...');
    records = parse(csvData, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }).map((row: string[]) => ({
      srNo: row[0] ?? '',
      areaName: row[1] ?? '',
      nfsaAayRc: row[2] ?? '0',
      nfsaAayBen: row[3] ?? '0',
      nfsaPhhRc: row[4] ?? '0',
      nfsaPhhBen: row[5] ?? '0',
      nfsaApl1Rc: row[6] ?? '0',
      nfsaApl1Ben: row[7] ?? '0',
      nfsaApl2Rc: row[8] ?? '0',
      nfsaApl2Ben: row[9] ?? '0',
      nfsaBplRc: row[10] ?? '0',
      nfsaBplBen: row[11] ?? '0',
      nonNfsaApl1Rc: row[12] ?? '0',
      nonNfsaApl1Ben: row[13] ?? '0',
      nonNfsaApl2Rc: row[14] ?? '0',
      nonNfsaApl2Ben: row[15] ?? '0',
      nonNfsaBplRc: row[16] ?? '0',
      nonNfsaBplBen: row[17] ?? '0',
      totalCards: row[18] ?? '0',
      totalBeneficiaries: row[19] ?? '0',
    }));
  }

  function getStr(val: string | undefined): string { return val ?? ''; }
  function getInt(val: string | undefined): number { return parseInt(val ?? '0', 10) || 0; }

  const rows = records
    .filter((r) => {
      const name = getStr(r.areaName).trim();
      return name.length > 0 && !/^total/i.test(name);
    })
    .map((r) => ({
      srNo: getInt(r.srNo),
      areaName: getStr(r.areaName).trim(),
      nfsaAayRc: getInt(r.nfsaAayRc),
      nfsaAayBen: getInt(r.nfsaAayBen),
      nfsaPhhRc: getInt(r.nfsaPhhRc),
      nfsaPhhBen: getInt(r.nfsaPhhBen),
      nfsaApl1Rc: getInt(r.nfsaApl1Rc),
      nfsaApl1Ben: getInt(r.nfsaApl1Ben),
      nfsaApl2Rc: getInt(r.nfsaApl2Rc),
      nfsaApl2Ben: getInt(r.nfsaApl2Ben),
      nfsaBplRc: getInt(r.nfsaBplRc),
      nfsaBplBen: getInt(r.nfsaBplBen),
      nonNfsaApl1Rc: getInt(r.nonNfsaApl1Rc),
      nonNfsaApl1Ben: getInt(r.nonNfsaApl1Ben),
      nonNfsaApl2Rc: getInt(r.nonNfsaApl2Rc),
      nonNfsaApl2Ben: getInt(r.nonNfsaApl2Ben),
      nonNfsaBplRc: getInt(r.nonNfsaBplRc),
      nonNfsaBplBen: getInt(r.nonNfsaBplBen),
      totalCards: getInt(r.totalCards),
      totalBeneficiaries: getInt(r.totalBeneficiaries),
    }));

  console.log(`  Found ${rows.length} valid rows`);

  if (rows.length === 0) {
    console.log('  No valid rows to import. Check file format.');
    return;
  }

  let parentId: string | null = null;

  if (level === 'district') {
    const state = await pool.query(`SELECT id FROM gujarat_region_hierarchy WHERE level = 'state' LIMIT 1`);
    if (state.rows.length === 0) throw new Error('State region not found. Run seed first.');
    parentId = state.rows[0].id;
  } else if (parentRegionName) {
    const parentLevel = level === 'taluka' ? 'district' : 'taluka';
    const parent = await pool.query(
      `SELECT id FROM gujarat_region_hierarchy WHERE LOWER(name) = LOWER($1) AND level = $2 LIMIT 1`,
      [parentRegionName, parentLevel]
    );
    if (parent.rows.length === 0) {
      throw new Error(`Parent region '${parentRegionName}' not found at level ${parentLevel}`);
    }
    parentId = parent.rows[0].id;
  }

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await pool.query(
      `SELECT id FROM gujarat_region_hierarchy WHERE LOWER(name) = LOWER($1) AND parent_id IS NOT DISTINCT FROM $2 AND level = $3`,
      [row.areaName, parentId, level]
    );

    let regionId: string;
    if (existing.rows.length > 0) {
      regionId = existing.rows[0].id;
      updated++;
    } else {
      const code = `${level === 'district' ? 'D' : level === 'taluka' ? 'T' : 'W'}_${String(row.srNo).padStart(3, '0')}`;
      const newRegion = await pool.query(
        `INSERT INTO gujarat_region_hierarchy (parent_id, level, name, code, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [parentId, level, row.areaName, code, row.srNo]
      );
      regionId = newRegion.rows[0].id;

      if (parentId) {
        await pool.query(
          `UPDATE gujarat_region_hierarchy
           SET path = (SELECT path FROM gujarat_region_hierarchy WHERE id = $1) || text2ltree($2)
           WHERE id = $3`,
          [parentId, regionId.replace(/-/g, '_'), regionId]
        );
      }
      inserted++;
    }

    const tc = row.totalCards || (
      row.nfsaAayRc + row.nfsaPhhRc + row.nfsaApl1Rc + row.nfsaApl2Rc + row.nfsaBplRc +
      row.nonNfsaApl1Rc + row.nonNfsaApl2Rc + row.nonNfsaBplRc
    );
    const tb = row.totalBeneficiaries || (
      row.nfsaAayBen + row.nfsaPhhBen + row.nfsaApl1Ben + row.nfsaApl2Ben + row.nfsaBplBen +
      row.nonNfsaApl1Ben + row.nonNfsaApl2Ben + row.nonNfsaBplBen
    );

    await pool.query(
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
         $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
         $13,$14,$15,$16,$17,$18,
         $19,$20)
       ON CONFLICT (region_id, month)
       DO UPDATE SET
         nfsa_aay_rc = EXCLUDED.nfsa_aay_rc,
         nfsa_aay_ben = EXCLUDED.nfsa_aay_ben,
         nfsa_phh_rc = EXCLUDED.nfsa_phh_rc,
         nfsa_phh_ben = EXCLUDED.nfsa_phh_ben,
         nfsa_apl1_rc = EXCLUDED.nfsa_apl1_rc,
         nfsa_apl1_ben = EXCLUDED.nfsa_apl1_ben,
         nfsa_apl2_rc = EXCLUDED.nfsa_apl2_rc,
         nfsa_apl2_ben = EXCLUDED.nfsa_apl2_ben,
         nfsa_bpl_rc = EXCLUDED.nfsa_bpl_rc,
         nfsa_bpl_ben = EXCLUDED.nfsa_bpl_ben,
         non_nfsa_apl1_rc = EXCLUDED.non_nfsa_apl1_rc,
         non_nfsa_apl1_ben = EXCLUDED.non_nfsa_apl1_ben,
         non_nfsa_apl2_rc = EXCLUDED.non_nfsa_apl2_rc,
         non_nfsa_apl2_ben = EXCLUDED.non_nfsa_apl2_ben,
         non_nfsa_bpl_rc = EXCLUDED.non_nfsa_bpl_rc,
         non_nfsa_bpl_ben = EXCLUDED.non_nfsa_bpl_ben,
         total_cards = EXCLUDED.total_cards,
         total_beneficiaries = EXCLUDED.total_beneficiaries`,
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
        tc, tb,
      ]
    );
  }

  console.log(`  Inserted: ${inserted}, Updated: ${updated}, Total: ${rows.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx tsx scripts/import-gujarat-csv.ts <file.tsv> [level] [month] [parentName]');
    console.log('  level: district | taluka | ward (default: district)');
    console.log('  month: YYYY-MM (default: current month)');
    console.log('  parentName: parent region name (required for taluka/ward)');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/import-gujarat-csv.ts districts.tsv district 2026-06');
    console.log('  npx tsx scripts/import-gujarat-csv.ts talukas.tsv taluka 2026-06 Morbi');
    console.log('  npx tsx scripts/import-gujarat-csv.ts wards.tsv ward 2026-06 "Morbi City"');
    process.exit(0);
  }

  const filePath = args[0]!;
  const level = (args[1] ?? 'district') as 'district' | 'taluka' | 'ward';
  const month = args[2] ?? new Date().toISOString().slice(0, 7);
  const parentName = args[3];

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    await importLevel(filePath, level, month, parentName);
    console.log('\nImport complete!');
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
