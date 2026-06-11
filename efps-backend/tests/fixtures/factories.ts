import * as argon2 from 'argon2';

export async function createTestDealer(overrides: Partial<{
  fps_id: string;
  full_name: string;
  mobile: string;
  password: string;
  role: string;
  district: string;
  taluka: string;
  village: string;
}> = {}) {
  const passwordHash = await argon2.hash(overrides.password ?? 'Password123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  return {
    fps_id: overrides.fps_id ?? '99999',
    full_name: overrides.full_name ?? 'Test Dealer',
    mobile: overrides.mobile ?? '8888888888',
    password_hash: passwordHash,
    role: overrides.role ?? 'dealer',
    district: overrides.district ?? 'Ahmedabad',
    taluka: overrides.taluka ?? 'City',
    village: overrides.village ?? 'Test',
    ...overrides,
  };
}

export function createTestBeneficiary(overrides: Partial<{
  dealer_id: string;
  ration_card_no: string;
  head_of_family: string;
  mobile: string;
  member_count: number;
  category: string;
}> = {}) {
  return {
    dealer_id: overrides.dealer_id ?? '00000000-0000-0000-0000-000000000000',
    ration_card_no: overrides.ration_card_no ?? 'RC-TEST-001',
    head_of_family: overrides.head_of_family ?? 'Test Family',
    mobile: overrides.mobile ?? '7777777777',
    member_count: overrides.member_count ?? 3,
    category: overrides.category ?? 'BPL',
    ...overrides,
  };
}

export function createTestTransaction(overrides: Partial<{
  dealer_id: string;
  beneficiary_id: string;
  transaction_date: string;
  month: string;
  commodity: string;
  quantity_kg: number;
  total_amount: number;
  mode: string;
}> = {}) {
  const month = new Date();
  month.setDate(1);
  const monthStr = month.toISOString().split('T')[0];

  return {
    dealer_id: overrides.dealer_id ?? '00000000-0000-0000-0000-000000000000',
    beneficiary_id: overrides.beneficiary_id ?? '00000000-0000-0000-0000-000000000001',
    transaction_date: overrides.transaction_date ?? new Date().toISOString().split('T')[0],
    month: overrides.month ?? monthStr,
    commodity: overrides.commodity ?? 'Rice',
    quantity_kg: overrides.quantity_kg ?? 5,
    total_amount: overrides.total_amount ?? 100,
    mode: overrides.mode ?? 'pos',
    ...overrides,
  };
}
