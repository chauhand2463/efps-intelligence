// Backend DTO types - source of truth from fastify backend

// --- Enums ---
export const Role = { DEALER: 'dealer', AREA_OFFICER: 'area_officer', ADMIN: 'admin' } as const;
export type RoleType = (typeof Role)[keyof typeof Role];

export const CommodityType = { RICE: 'Rice', WHEAT: 'Wheat', SUGAR: 'Sugar', KEROSENE: 'Kerosene', OIL: 'Oil', PULSES: 'Pulses' } as const;
export type CommodityTypeType = (typeof CommodityType)[keyof typeof CommodityType];
export const COMMODITIES: CommodityTypeType[] = ['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses'];

export const BeneficiaryCategory = { APL: 'APL', BPL: 'BPL', AAY: 'AAY', PHH: 'PHH' } as const;
export type BeneficiaryCategoryType = (typeof BeneficiaryCategory)[keyof typeof BeneficiaryCategory];

export const TransactionMode = { POS: 'pos', MANUAL: 'manual', OTG: 'otg' } as const;
export type TransactionModeType = (typeof TransactionMode)[keyof typeof TransactionMode];

export const NotificationType = { INFO: 'info', WARNING: 'warning', ALERT: 'alert' } as const;
export type NotificationTypeType = (typeof NotificationType)[keyof typeof NotificationType];

// --- API Response Envelope ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  cursor: string | null;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    statusCode: number;
  };
}

// --- Auth ---
export interface LoginResponse {
  dealer: DealerDto;
}

export interface RefreshResponse {
  message: string;
}

export interface DealerDto {
  id: string;
  fps_id: string;
  full_name: string;
  mobile: string;
  role: RoleType;
  is_active: boolean;
  is_verified: boolean;
  district: string | null;
  taluka: string | null;
  village: string | null;
  address: string | null;
  area_id: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  role: RoleType;
  fps_id: string;
}

// --- Dealer ---
export interface RegisterDealerInput {
  fps_id: string;
  full_name: string;
  mobile: string;
  password: string;
  address?: string;
  district?: string;
  taluka?: string;
  village?: string;
  area_id?: string;
  efps_username?: string;
  efps_password?: string;
}

export interface UpdateDealerInput {
  full_name?: string;
  address?: string;
  district?: string;
  taluka?: string;
  village?: string;
  area_id?: string;
}

// --- Beneficiary ---
export interface Beneficiary {
  id: string;
  dealer_id: string;
  ration_card_no: string;
  head_of_family: string;
  mobile: string | null;
  member_count: number;
  category: BeneficiaryCategoryType | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBeneficiaryInput {
  ration_card_no: string;
  head_of_family: string;
  mobile?: string | null;
  member_count?: number;
  category?: BeneficiaryCategoryType | null;
}

export interface UpdateBeneficiaryInput {
  ration_card_no?: string;
  head_of_family?: string;
  mobile?: string | null;
  member_count?: number;
  category?: BeneficiaryCategoryType | null;
  is_active?: boolean;
}

// --- Transaction ---
export interface Transaction {
  id: string;
  dealer_id: string;
  beneficiary_id: string;
  transaction_date: string;
  month: string;
  commodity: CommodityTypeType;
  quantity_kg: number;
  price_per_kg: number | null;
  total_amount: number | null;
  mode: TransactionModeType;
  biometric_auth: boolean;
  remarks: string | null;
  created_at: string;
}

export interface CreateTransactionInput {
  beneficiary_id: string;
  transaction_date?: string;
  month: string;
  commodity: CommodityTypeType;
  quantity_kg: number;
  price_per_kg?: number | null;
  total_amount?: number | null;
  mode?: TransactionModeType;
  biometric_auth?: boolean;
  remarks?: string | null;
}

// --- Stock ---
export interface StockAllocation {
  id: string;
  dealer_id: string;
  month: string;
  commodity: CommodityTypeType;
  allocated_kg: number;
  lifted_kg: number;
  remaining_kg?: number;
  created_at: string;
  updated_at: string;
}

// --- Notification ---
export interface Notification {
  id: string;
  dealer_id: string;
  title: string;
  body: string;
  type: NotificationTypeType;
  is_read: boolean;
  created_at: string;
}

// --- Finance ---
export interface IncomeEntry {
  id: string;
  dealer_id: string;
  source: string;
  amount: number;
  entry_date: string;
  description: string | null;
  created_at: string;
}

export interface ExpenseEntry {
  id: string;
  dealer_id: string;
  category: string;
  amount: number;
  entry_date: string;
  description: string | null;
  bill_reference: string | null;
  created_at: string;
}

export interface CreateIncomeInput {
  source: string;
  amount: number;
  entry_date?: string;
  description?: string;
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  entry_date?: string;
  description?: string;
  bill_reference?: string;
}

export interface ProfitLoss {
  total_income: number;
  total_expense: number;
  net_profit: number;
  income_count: number;
  expense_count: number;
}

// --- Commission ---
export interface CommissionRate {
  id: string;
  commodity: CommodityTypeType;
  rate_per_kg: number;
  effective_from: string;
  effective_to: string | null;
}

export interface Commission {
  id: string;
  dealer_id: string;
  month: string;
  commodity: CommodityTypeType;
  quantity_sold_kg: number;
  commission_rate: number;
  gross_commission: number;
  tds_percent: number;
  tds_deducted: number;
  net_commission: number;
  amount_paid: number | null;
  deposit_date: string | null;
  status: string;
  created_at: string;
}

// --- Lifting ---
export interface LiftingEntry {
  id: string;
  dealer_id: string;
  commodity: CommodityTypeType;
  quantity_kg: number;
  month: string;
  vehicle_no: string | null;
  warehouse: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateLiftingInput {
  commodity: CommodityTypeType;
  quantity_kg: number;
  month: string;
  vehicle_no?: string;
  warehouse?: string;
  notes?: string;
}

// --- Dashboard ---
export interface DashboardSummary {
  today_transactions: number;
  today_quantity: number;
  month_transactions: number;
  month_quantity: number;
  total_beneficiaries: number;
  allocated_kg: number;
  lifted_kg: number;
  pending_deliveries: number;
  low_stock_alerts: number;
  monthly_sales: Array<{ commodity: string; quantity: number; amount: number }>;
}

export interface MasterDashboard {
  kpis: {
    rationCards: { total: number; aay: number; phh: number; priority: number; nonPriority: number; inactive: number; migrated: number; blocked: number };
    todayDistribution: { cardsServed: number; membersServed: number; quantityDistributed: number; transactions: number };
    remainingDistribution: { pendingCards: number; pendingMembers: number; pendingQuantity: number; estimatedCompletion: string };
    currentStock: { available: number; reserved: number; damaged: number; incoming: number; lowStock: number };
    governmentAllocation: { allocated: number; received: number; remaining: number; shortage: number; excess: number };
    revenue: { commission: number; subsidy: number; todayIncome: number; monthlyIncome: number };
    syncStatus: { efps: string; ipds: string; lastSync: string | null; worker: string; queue: number; failedJobs: number };
    alerts: { pendingIssues: number; portalErrors: number; stockShortage: number; beneficiaryIssues: number };
  };
  distributionProgress: {
    target: number; completed: number; pending: number; percentage: number;
    trend: string; dailyComparison: number; monthlyComparison: number;
  };
  stockByCommodity: Array<{
    commodity: string; allocated: number; received: number; available: number;
    reserved: number; distributed: number; damaged: number; remaining: number;
    variance: number; status: string;
  }>;
  beneficiarySummary: {
    totalFamilies: number; totalMembers: number; todayServed: number;
    pending: number; portability: number; migrated: number; inactive: number; rejected: number;
  };
  distributionHistory: Array<{
    id: string; date: string; beneficiary: string; commodity: string;
    quantity: number; mode: string; amount: number; status: string;
  }>;
  financialSummary: {
    commission: number; governmentIncentive: number; bankDeposits: number;
    expenses: number; profit: number;
    monthlySummary: Array<{ month: string; income: number; expense: number; profit: number }>;
    yearlySummary: Array<{ year: string; income: number; expense: number; profit: number }>;
  };
  monthlySales: Array<{ commodity: string; quantity: number; amount: number }>;
  systemHealth: {
    dealer: { fps_id: string; area_id: string | null; district: string | null; village: string | null; full_name: string; role: string; last_login: string | null };
    server: string; database: string; redis: string; worker: string;
    portal: string; efps: string; ipds: string;
  };
}

// --- Ads ---
export interface Ad {
  id: string;
  dealer_id: string;
  title: string;
  body: string;
  type: 'announcement' | 'notice' | 'offer' | 'promotion';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

// --- Sync ---
export interface BankInfo {
  bank_name: string | null;
  branch_name: string | null;
  account_no: string | null;
  ifsc_code: string | null;
  account_holder: string | null;
}

export interface SyncJob {
  id: string;
  dealer_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  records_synced: number;
  processed_count: number;
  quarantined_count: number;
  error_message: string | null;
  error_detail: string[] | null;
  priority: number;
  sync_mode: 'full' | 'incremental' | 'priority';
  worker_version: string | null;
  website_version: string | null;
  trace_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface SyncDashboardData {
  lastSync: SyncJob | null;
  syncHistory: SyncJob[];
  totalBeneficiaries: number;
  totalTransactions: number;
  totalStockAllocations: number;
  recentQuarantined: number;
  queueLength: number;
}

export interface ImportResult {
  batchId: string;
  totalRecords: number;
  newRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  deletedRecords: number;
  errorCount: number;
}

export interface QuarantineSummary {
  total: number;
  byType: Record<string, number>;
  byReason: Record<string, number>;
}
