import pg from 'pg';
import dotenv from 'dotenv';
import * as argon2 from 'argon2';

dotenv.config();

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });

  try {
    const passwordHash = await argon2.hash('Password123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await pool.query(
      `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (fps_id) DO NOTHING`,
      ['12345', 'Admin Dealer', '9999999999', passwordHash, 'admin', 'Ahmedabad', 'City', 'Navrangpura']
    );

    await pool.query(
      `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (fps_id) DO NOTHING`,
      ['12346', 'Test Dealer', '9999999998', passwordHash, 'dealer', 'Ahmedabad', 'City', 'Maninagar']
    );

    const { rows: dealers } = await pool.query('SELECT id FROM dealers WHERE fps_id IN ($1, $2)', ['12345', '12346']);

    if (dealers.length >= 1) {
      const dealerId = dealers[0]!.id;

      await pool.query(
        `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg)
         VALUES ($1, date_trunc('month', NOW())::date, $2, $3)
         ON CONFLICT (dealer_id, month, commodity) DO NOTHING`,
        [dealerId, 'Rice', 1000]
      );

      await pool.query(
        `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg)
         VALUES ($1, date_trunc('month', NOW())::date, $2, $3)
         ON CONFLICT (dealer_id, month, commodity) DO NOTHING`,
        [dealerId, 'Wheat', 800]
      );

      await pool.query(
        `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg)
         VALUES ($1, date_trunc('month', NOW())::date, $2, $3)
         ON CONFLICT (dealer_id, month, commodity) DO NOTHING`,
        [dealerId, 'Sugar', 500]
      );

      await pool.query(
        `INSERT INTO beneficiaries (dealer_id, ration_card_no, head_of_family, mobile, member_count, category)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ration_card_no) DO NOTHING`,
        [dealerId, 'RC001', 'Ramesh Patel', '9876543210', 4, 'BPL']
      );

      await pool.query(
        `INSERT INTO beneficiaries (dealer_id, ration_card_no, head_of_family, mobile, member_count, category)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ration_card_no) DO NOTHING`,
        [dealerId, 'RC002', 'Suresh Sharma', '9876543211', 3, 'APL']
      );

      await pool.query(
        `INSERT INTO beneficiaries (dealer_id, ration_card_no, head_of_family, mobile, member_count, category)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ration_card_no) DO NOTHING`,
        [dealerId, 'RC003', 'Mohan Singh', '9876543212', 5, 'AAY']
      );
    }

    console.log('Seed data inserted successfully');
    console.log('Test accounts:');
    console.log('  FPS ID: 12345, Password: Password123 (admin)');
    console.log('  FPS ID: 12346, Password: Password123 (dealer)');
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
