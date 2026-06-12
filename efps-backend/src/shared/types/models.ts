import type { RoleType, AccountStatusType, CommodityTypeType, BeneficiaryCategoryType, TransactionModeType, NotificationTypeType } from './enums.js';

export interface Dealer {
  id: string;
  fps_id: string;
  area_id: string | null;
  full_name: string;
  mobile: string;
  address: string | null;
  district: string | null;
  taluka: string | null;
  village: string | null;
  password_hash: string;
  role: RoleType;
  is_active: boolean;
  is_verified: boolean;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  dealer_id: string;
  refresh_token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string;
  created_at: string;
}

export interface OtpRequest {
  id: string;
  mobile: string;
  fps_id: string | null;
  otp_hash: string;
  purpose: string;
  attempts: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

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

export interface StockAllocation {
  id: string;
  dealer_id: string;
  month: string;
  commodity: CommodityTypeType;
  allocated_kg: number;
  lifted_kg: number;
  created_at: string;
  updated_at: string;
}

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

export interface AuditLog {
  id: number;
  dealer_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  dealer_id: string;
  title: string;
  body: string;
  type: NotificationTypeType;
  is_read: boolean;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  cursor: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
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

export interface JwtPayload {
  sub: string;
  role: RoleType;
  fps_id: string;
}

export interface AuthUser {
  id: string;
  role: RoleType;
  fps_id: string;
}
