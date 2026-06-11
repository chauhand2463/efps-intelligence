export const Role = {
  DEALER: 'dealer',
  AREA_OFFICER: 'area_officer',
  ADMIN: 'admin',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

export const AccountStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
} as const;

export type AccountStatusType = (typeof AccountStatus)[keyof typeof AccountStatus];

export const CommodityType = {
  RICE: 'Rice',
  WHEAT: 'Wheat',
  SUGAR: 'Sugar',
  KEROSENE: 'Kerosene',
  OIL: 'Oil',
  PULSES: 'Pulses',
} as const;

export type CommodityTypeType = (typeof CommodityType)[keyof typeof CommodityType];

export const BeneficiaryCategory = {
  APL: 'APL',
  BPL: 'BPL',
  AAY: 'AAY',
  PHH: 'PHH',
} as const;

export type BeneficiaryCategoryType = (typeof BeneficiaryCategory)[keyof typeof BeneficiaryCategory];

export const TransactionMode = {
  POS: 'pos',
  MANUAL: 'manual',
  OTG: 'otg',
} as const;

export type TransactionModeType = (typeof TransactionMode)[keyof typeof TransactionMode];

export const NotificationType = {
  INFO: 'info',
  WARNING: 'warning',
  ALERT: 'alert',
} as const;

export type NotificationTypeType = (typeof NotificationType)[keyof typeof NotificationType];

export const OtpPurpose = {
  PASSWORD_RESET: 'password_reset',
  VERIFY_MOBILE: 'verify_mobile',
  TFA: '2fa',
} as const;

export type OtpPurposeType = (typeof OtpPurpose)[keyof typeof OtpPurpose];
