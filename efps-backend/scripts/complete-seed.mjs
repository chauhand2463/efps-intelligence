import { query } from '../dist/src/config/database.js';

const SEED_SQL = `
INSERT INTO commission_rates (commodity, rate_per_kg, effective_from)
VALUES 
  ('Rice', 2.50, '2026-06-01'),
  ('Wheat', 2.00, '2026-06-01'),
  ('Sugar', 1.50, '2026-06-01'),
  ('Kerosene', 3.00, '2026-06-01'),
  ('Oil', 2.75, '2026-06-01'),
  ('Pulses', 2.25, '2026-06-01');

INSERT INTO gujarat_directory (name, category, district, department, phone, description)
VALUES 
  ('District Collector Office', 'office', 'Ahmedabad', 'Revenue', '079-1234567', 'Main district administration office'),
  ('ICDS Project Office', 'office', 'Gandhinagar', 'Women & Child Development', '079-7654321', 'ICDS program coordination'),
  ('Mid-Day Meal Scheme', 'scheme', 'All Districts', 'Education', NULL, 'School nutrition program under MDM'),
  ('Food & Civil Supplies Dept', 'office', 'All Districts', 'Food & Civil Supplies', '079-1122334', 'PDS and FPS oversight');
`;

try {
  await query(SEED_SQL);
  console.log('Seed data inserted successfully!');
} catch (err) {
  console.error('Seed warning:', err instanceof Error ? err.message : err);
}
process.exit(0);
