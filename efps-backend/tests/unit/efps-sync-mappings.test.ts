import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

vi.mock('../../src/config/database', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock('../../src/config/redis', () => ({
  getBullRedis: vi.fn().mockReturnValue({}),
  getRedis: vi.fn().mockReturnValue({ get: vi.fn(), setex: vi.fn(), set: vi.fn() }),
  closeRedis: vi.fn(),
}));

vi.mock('../../src/config/index', () => ({
  config: {
    INTERNAL_SYNC_URL: 'http://localhost:3000/api/internal/sync',
    INTERNAL_SYNC_SECRET: 'test-service-token',
    MOCK_GOVT_PORTAL: false,
    START_SYNC_WORKER: false,
  },
}));

vi.mock('../../src/shared/utils/encrypt', () => ({
  decrypt: vi.fn().mockReturnValue('test-value'),
}));

vi.mock('../../src/shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/shared/events/index', () => ({
  eventBus: {
    emit: vi.fn(),
  },
  EventTypes: {
    SYNC_COMPLETED: 'sync.completed',
  },
}));

describe('Internal Sync API — record processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes beneficiary records through the sync pipeline', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    const db = await import('../../src/config/database.js');
    vi.mocked(db.query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_job_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'beneficiary',
          records: [
            { ration_card_no: 'GJ001', beneficiary_name: 'Test A', category: 'NFSA-AAY', version: 1 },
            { ration_card_no: 'GJ002', beneficiary_name: 'Test B', category: 'NFSA-PHH', version: 1 },
          ],
        },
      ],
      trace_id: 'trace-1',
      worker_version: '2.0.0',
    });

    expect(result.totalRecords).toBe(2);
  });

  it('processes transaction records through the sync pipeline', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    const db = await import('../../src/config/database.js');
    vi.mocked(db.query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_job_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'transaction',
          records: [
            { ration_card_no: 'GJ001', transaction_date: '2026-06-17', commodity: 'Wheat', allocated_quantity: 15, lifted_quantity: 15, amount_paid: 30, version: 1 },
            { ration_card_no: 'GJ002', transaction_date: '2026-06-17', commodity: 'Rice', allocated_quantity: 20, lifted_quantity: 18, amount_paid: 54, version: 1 },
          ],
        },
      ],
      trace_id: 'trace-2',
      worker_version: '2.0.0',
    });

    expect(result.totalRecords).toBe(2);
  });

  it('processes stock allocation records through the sync pipeline', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    const db = await import('../../src/config/database.js');
    vi.mocked(db.query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_job_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'stock_allocation',
          records: [
            { commodity: 'Wheat', allocated_quantity: 1000, lifted_quantity: 850, month: '2026-06-01', version: 1 },
            { commodity: 'Rice', allocated_quantity: 800, lifted_quantity: 600, month: '2026-06-01', version: 1 },
          ],
        },
      ],
      trace_id: 'trace-3',
      worker_version: '2.0.0',
    });

    expect(result.totalRecords).toBe(2);
  });

  it('processes mixed record types in a single payload', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    const db = await import('../../src/config/database.js');
    vi.mocked(db.query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_job_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'beneficiary',
          records: [
            { ration_card_no: 'GJ001', beneficiary_name: 'Test A', category: 'NFSA-AAY', version: 1 },
          ],
        },
        {
          type: 'transaction',
          records: [
            { ration_card_no: 'GJ001', transaction_date: '2026-06-17', commodity: 'Wheat', allocated_quantity: 15, lifted_quantity: 15, amount_paid: 30, version: 1 },
          ],
        },
        {
          type: 'stock_allocation',
          records: [
            { commodity: 'Wheat', allocated_quantity: 1000, lifted_quantity: 850, month: '2026-06-01', version: 1 },
          ],
        },
      ],
      trace_id: 'trace-mixed',
      worker_version: '2.0.0',
    });

    expect(result.totalRecords).toBe(3);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Internal Sync API — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('quarantines empty beneficiary records', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    const db = await import('../../src/config/database.js');
    vi.mocked(db.query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'beneficiary',
          records: [
            { ration_card_no: '', beneficiary_name: '' },
          ],
        },
      ],
      trace_id: 'trace-validate',
      worker_version: '2.0.0',
    });

    expect(result.quarantined).toBe(1);
    expect(result.processed).toBe(0);
  });

  it('quarantines beneficiary records missing required fields', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    const db = await import('../../src/config/database.js');
    vi.mocked(db.query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'beneficiary',
          records: [
            { beneficiary_name: 'No Card Number' },
          ],
        },
      ],
      trace_id: 'trace-validate-2',
      worker_version: '2.0.0',
    });

    expect(result.quarantined).toBe(1);
  });
});

describe('eFPS Sync Worker — mock mode data shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('the internal sync schema accepts mock-mode shaped data', async () => {
    const { syncPayloadSchema } = await import('../../src/modules/internal-sync/internal-sync.schema.js');

    const validPayload = {
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_job_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'beneficiary',
          records: [
            {
              ration_card_no: 'GJ123456001',
              beneficiary_name: 'Arvindbhai Patel',
              mobile_no: '9988776655',
              category: 'NFSA-PHH',
              status: 'active',
              version: 1,
            },
          ],
        },
        {
          type: 'transaction',
          records: [
            {
              ration_card_no: 'GJ123456001',
              transaction_date: '2026-06-17',
              commodity: 'Wheat',
              allocated_quantity: 15,
              lifted_quantity: 15,
              amount_paid: 30,
              version: 1,
            },
          ],
        },
        {
          type: 'stock_allocation',
          records: [
            {
              commodity: 'Wheat',
              allocated_quantity: 1000,
              lifted_quantity: 850,
              month: '2026-06-01',
              version: 1,
            },
          ],
        },
      ],
      trace_id: 'trace-mock',
      worker_version: '2.0.0',
    };

    const parsed = syncPayloadSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.workers).toHaveLength(3);
    }
  });

  it('rejects invalid worker types in the schema', async () => {
    const { syncPayloadSchema } = await import('../../src/modules/internal-sync/internal-sync.schema.js');

    const invalidPayload = {
      dealer_id: '00000000-0000-0000-0000-000000000000',
      workers: [
        {
          type: 'invalid_type',
          records: [],
        },
      ],
    };

    const parsed = syncPayloadSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
