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

describe('eFPS Sync Worker — module structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports efpsSyncQueue as a BullMQ Queue', async () => {
    const { efpsSyncQueue } = await import('../../src/jobs/sync/efps-sync.worker.js');
    expect(efpsSyncQueue).toBeDefined();
    expect(efpsSyncQueue.name).toBe('efps-sync');
  });

  it('exports enqueueEfpsSync function', async () => {
    const { enqueueEfpsSync } = await import('../../src/jobs/sync/efps-sync.worker.js');
    expect(enqueueEfpsSync).toBeInstanceOf(Function);
  });

  it('exports efpsSyncWorker as null when START_SYNC_WORKER is false', async () => {
    const { efpsSyncWorker } = await import('../../src/jobs/sync/efps-sync.worker.js');
    expect(efpsSyncWorker).toBeNull();
  });
});

describe('eFPS Sync Worker — internal API posting', () => {
  it('processSyncPayload validates and processes beneficiary records', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    vi.mocked((await import('../../src/config/database.js')).query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_job_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'beneficiary',
          records: [
            {
              ration_card_no: 'TEST001',
              beneficiary_name: 'Test Beneficiary',
              category: 'NFSA-AAY',
              status: 'active',
              version: 1,
            },
          ],
        },
      ],
      trace_id: 'test-trace',
      worker_version: '2.0.0',
    });

    expect(result.totalRecords).toBeGreaterThan(0);
    expect(result.processed + result.quarantined).toBe(result.totalRecords);
  });

  it('processSyncPayload quarantines invalid records', async () => {
    const { processSyncPayload } = await import('../../src/modules/internal-sync/internal-sync.service.js');

    vi.mocked((await import('../../src/config/database.js')).query).mockResolvedValue({ rows: [] });

    const result = await processSyncPayload({
      dealer_id: '00000000-0000-0000-0000-000000000000',
      sync_job_id: '00000000-0000-0000-0000-000000000000',
      sync_mode: 'full',
      workers: [
        {
          type: 'beneficiary',
          records: [
            {},
            { ration_card_no: '', beneficiary_name: '' },
          ],
        },
      ],
      trace_id: 'test-trace',
      worker_version: '2.0.0',
    });

    expect(result.quarantined).toBe(2);
    expect(result.processed).toBe(0);
  });
});
