import { config } from '../src/config/index.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

async function seed() {
  console.log('Seeding database...');

  const passwordHash = await argon2.hash('Admin@123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, is_active, is_verified)
     VALUES ('00000001', 'State Administrator', '9999999999', $1, 'admin', 'Gandhinagar', TRUE, TRUE)
     ON CONFLICT (mobile) DO NOTHING`,
    [passwordHash]
  );
  const adminResult = await pool.query(`SELECT id FROM dealers WHERE fps_id = '00000001'`);
  const adminId = adminResult.rows[0]?.id;

  await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, is_active, is_verified)
     VALUES ('00000002', 'District Officer Ahmedabad', '9999999998', $1, 'area_officer', 'Ahmedabad', 'City', TRUE, TRUE)
     ON CONFLICT (mobile) DO NOTHING`,
    [passwordHash]
  );

  const dealerHash = await argon2.hash('Dealer@123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const dealers = [
    { fps_id: '10000001', name: 'Ramesh Patel', mobile: '9876543210', district: 'Ahmedabad', taluka: 'City', village: 'Navrangpura' },
    { fps_id: '10000002', name: 'Suresh Sharma', mobile: '9876543211', district: 'Ahmedabad', taluka: 'City', village: 'Maninagar' },
    { fps_id: '10000003', name: 'Amit Singh', mobile: '9876543212', district: 'Gandhinagar', taluka: 'City', village: 'Sector 21' },
    { fps_id: '10000004', name: 'Rajesh Kumar', mobile: '9876543213', district: 'Vadodara', taluka: 'City', village: 'Alkapuri' },
    { fps_id: '10000005', name: 'Dinesh Mehta', mobile: '9876543214', district: 'Surat', taluka: 'City', village: 'Adajan' },
  ];

  const dealerIds: string[] = [];
  for (const d of dealers) {
    const result = await pool.query(
      `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village, is_active, is_verified)
       VALUES ($1, $2, $3, $4, 'dealer', $5, $6, $7, TRUE, TRUE)
       ON CONFLICT (mobile) DO NOTHING RETURNING id`,
      [d.fps_id, d.name, d.mobile, dealerHash, d.district, d.taluka, d.village]
    );
    if (result.rows[0]) dealerIds.push(result.rows[0].id);
  }

  if (dealerIds.length === 0) {
    const existing = await pool.query('SELECT id FROM dealers WHERE role = $1 LIMIT 5', ['dealer']);
    dealerIds.push(...existing.rows.map(r => r.id));
  }

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const monthStr = firstOfMonth.toISOString().split('T')[0]!;

  const commodities = ['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil'];
  const allocations = [
    { commodity: 'Rice', kg: 500 },
    { commodity: 'Wheat', kg: 300 },
    { commodity: 'Sugar', kg: 100 },
    { commodity: 'Kerosene', kg: 50 },
    { commodity: 'Oil', kg: 75 },
  ];

  for (const dealerId of dealerIds) {
    for (const a of allocations) {
      await pool.query(
        `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg, allocated_quantity, lifted_quantity, unit)
         VALUES ($1, $2, $3, $4, $4, 0, 'Kg')
         ON CONFLICT (dealer_id, month, commodity) DO NOTHING`,
        [dealerId, monthStr, a.commodity, a.kg]
      );
    }
  }

  const categories = ['APL', 'BPL', 'AAY', 'PHH'];
  const familyNames = [
    'Arvind Patel', 'Bhavesh Shah', 'Chandan Das', 'Divya Sharma', 'Esha Gupta',
    'Farhan Khan', 'Gita Devi', 'Harish Kumar', 'Isha Singh', 'Jagdish Joshi',
    'Kiran Rao', 'Lalit Verma', 'Madhu Bala', 'Naresh Reddy', 'Om Prakash',
  ];

  for (const dealerId of dealerIds) {
    for (let i = 0; i < 10; i++) {
      const cardNo = `RC${dealerId.substring(0, 4)}${String(i + 1).padStart(4, '0')}`;
      await pool.query(
        `INSERT INTO beneficiaries (dealer_id, ration_card_no, head_of_family, mobile, member_count, category)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ration_card_no) DO NOTHING`,
        [
          dealerId,
          cardNo,
          familyNames[i % familyNames.length]!,
          `98765${String(43210 + i).padStart(5, '0')}`,
          Math.floor(Math.random() * 4) + 1,
          categories[i % categories.length]!,
        ]
      );
    }
  }

  const commissionRates = [
    { commodity: 'Rice', rate: 2.50 },
    { commodity: 'Wheat', rate: 2.00 },
    { commodity: 'Sugar', rate: 1.50 },
    { commodity: 'Kerosene', rate: 3.00 },
    { commodity: 'Oil', rate: 4.00 },
  ];

  for (const cr of commissionRates) {
    await pool.query(
      `INSERT INTO commission_rates (commodity, rate_per_kg, effective_from)
       VALUES ($1, $2, $3)
       ON CONFLICT (commodity, effective_from) DO NOTHING`,
      [cr.commodity, cr.rate, monthStr]
    );
  }

  const schoolTypes = ['Primary', 'Secondary', 'Higher Secondary'];
  const districts = ['Ahmedabad', 'Gandhinagar', 'Vadodara', 'Surat'];
  for (let i = 1; i <= 10; i++) {
    await pool.query(
      `INSERT INTO schools (school_name, school_code, district, taluka, village, school_type, beneficiary_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (school_code) DO NOTHING`,
      [
        `School ${i}`,
        `SCH${String(i).padStart(4, '0')}`,
        districts[i % districts.length]!,
        'Taluka',
        'Village',
        schoolTypes[i % schoolTypes.length]!,
        Math.floor(Math.random() * 500) + 100,
      ]
    );
  }

  const directoryEntries = [
    { name: 'District Supply Office - Ahmedabad', category: 'office', district: 'Ahmedabad', department: 'Food & Civil Supplies' },
    { name: 'District Supply Office - Gandhinagar', category: 'office', district: 'Gandhinagar', department: 'Food & Civil Supplies' },
    { name: 'District Supply Office - Vadodara', category: 'office', district: 'Vadodara', department: 'Food & Civil Supplies' },
    { name: 'District Supply Office - Surat', category: 'office', district: 'Surat', department: 'Food & Civil Supplies' },
    { name: 'Food Corporation of India - Ahmedabad', category: 'resource', district: 'Ahmedabad', department: 'FCI' },
    { name: 'Food Corporation of India - Gandhinagar', category: 'resource', district: 'Gandhinagar', department: 'FCI' },
  ];

  for (const entry of directoryEntries) {
    await pool.query(
      `INSERT INTO gujarat_directory (name, category, district, department)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [entry.name, entry.category, entry.district, entry.department]
    );
  }

  await pool.query(
    `INSERT INTO policy_schemes (name, department, description, is_active)
     VALUES
       ('NFSA', 'Food & Civil Supplies', 'National Food Security Act - Subsidized food grains to eligible households', TRUE),
       ('PMGKAY', 'Food & Civil Supplies', 'Pradhan Mantri Garib Kalyan Anna Yojana - Additional food grain distribution', TRUE),
       ('ICDS', 'Women & Child Development', 'Integrated Child Development Services - Nutrition for children and mothers', TRUE),
       ('MDM', 'Education Department', 'Mid-Day Meal Scheme - Nutritional meals to school children', TRUE)
     ON CONFLICT DO NOTHING`
  );

  for (const dealerId of dealerIds) {
    await pool.query(
      `INSERT INTO dealer_bank_info (dealer_id, bank_name, branch_name, account_no, ifsc_code, account_holder)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (dealer_id) DO NOTHING`,
      [dealerId, 'State Bank of India', 'Main Branch', `SBIN${dealerId.substring(0, 8)}`, 'SBIN0000001', 'Dealer Name']
    );
  }

  console.log('Seed completed successfully!');
  console.log(`  Dealers created/verified: ${dealerIds.length}`);
  console.log(`  Stock allocations: ${allocations.length} commodities x ${dealerIds.length} dealers`);
  console.log(`  Beneficiaries: 10 per dealer`);
  console.log(`  Commission rates: ${commissionRates.length}`);
  console.log(`  Schools: 10`);
  console.log(`  Directory entries: ${directoryEntries.length}`);
  console.log('');
  console.log('Default credentials:');
  // Seed Gujarat state master record
  const existingState = await pool.query(
    `SELECT id FROM gujarat_region_hierarchy WHERE level = 'state' AND code = 'GJ' LIMIT 1`
  );
  if (existingState.rows.length === 0) {
    const stateResult = await pool.query(
      `INSERT INTO gujarat_region_hierarchy (parent_id, level, name, code, sort_order)
       VALUES (NULL, 'state', 'Gujarat', 'GJ', 0)
       RETURNING id`
    );
    const stateId = stateResult.rows[0].id;
    await pool.query(
      `UPDATE gujarat_region_hierarchy SET path = text2ltree($1) WHERE id = $2`,
      [stateId.replace(/-/g, '_'), stateId]
    );
    console.log('  Gujarat state region seeded');
  } else {
    console.log('  Gujarat state region already exists');
  }

  console.log('  Admin:    FPS ID: 00000001, Password: Admin@123');
  console.log('  Officer:  FPS ID: 00000002, Password: Admin@123');
  console.log('  Dealers:  FPS ID: 10000001-10000005, Password: Dealer@123');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
