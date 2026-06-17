const NAME_CLEAN = /[^a-zA-Z\s\-'\.]/g;
const MULTI_SPACE = /\s+/g;
const NON_DIGIT = /\D/g;

function toTitleCase(s: string): string {
  return s
    .trim()
    .replace(NAME_CLEAN, '')
    .replace(MULTI_SPACE, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(NON_DIGIT, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91${digits.slice(2)}`;
  if (digits.length >= 13 && digits.startsWith('091')) return `+91${digits.slice(3)}`;
  return digits;
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const cleaned = dateStr.trim();
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) return date.toISOString().split('T')[0]!;

  const parts = cleaned.split(/[/\-.]/);
  if (parts.length === 3) {
    const p0 = parts[0]!;
    const p1 = parts[1]!;
    const p2 = parts[2]!;
    let d: string;
    let m: string;
    let y: string;
    if (p0.length === 4) { y = p0; m = p1; d = p2; }
    else if (p2.length === 4) { d = p0; m = p1; y = p2; }
    else { return cleaned; }
    const parsed = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]!;
  }
  return cleaned;
}

function normalizePersonName(name: string): string {
  return toTitleCase(name);
}

function normalizeAddress(address: string): string {
  return address
    .trim()
    .replace(MULTI_SPACE, ' ')
    .replace(/[^\w\s,\-#\/\.\(\)]/g, '');
}

function normalizeDistrictTaluka(val: string): string {
  return toTitleCase(val);
}

function normalizeRationCardNo(val: string): string {
  return val?.trim().toUpperCase().replace(MULTI_SPACE, '') ?? '';
}

function normalizeNumeric(val: string | number): number {
  if (typeof val === 'number') return val;
  const cleaned = val.trim().replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export interface NormalizedFields {
  beneficiary_name?: string;
  father_name?: string;
  address?: string;
  district?: string;
  taluka?: string;
  ration_card_no?: string;
  mobile_no?: string;
  date_of_issue?: string | null;
  transaction_date?: string | null;
  allocated_quantity?: number;
  lifted_quantity?: number;
  amount_paid?: number;
}

export function normalizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...record };

  if (typeof out.beneficiary_name === 'string')
    out.beneficiary_name = normalizePersonName(out.beneficiary_name);
  if (typeof out.father_name === 'string')
    out.father_name = normalizePersonName(out.father_name);
  if (typeof out.mobile_no === 'string')
    out.mobile_no = normalizeMobile(out.mobile_no);
  if (typeof out.mobile === 'string')
    out.mobile = normalizeMobile(out.mobile);
  if (typeof out.address === 'string')
    out.address = normalizeAddress(out.address);
  if (typeof out.district === 'string')
    out.district = normalizeDistrictTaluka(out.district);
  if (typeof out.taluka === 'string')
    out.taluka = normalizeDistrictTaluka(out.taluka);
  if (typeof out.district_name === 'string')
    out.district_name = normalizeDistrictTaluka(out.district_name);
  if (typeof out.taluka_name === 'string')
    out.taluka_name = normalizeDistrictTaluka(out.taluka_name);
  if (typeof out.ration_card_no === 'string')
    out.ration_card_no = normalizeRationCardNo(out.ration_card_no);
  if (typeof out.date_of_issue === 'string')
    out.date_of_issue = normalizeDate(out.date_of_issue);
  if (typeof out.transaction_date === 'string')
    out.transaction_date = normalizeDate(out.transaction_date);
  if (typeof out.allocated_quantity !== 'undefined')
    out.allocated_quantity = normalizeNumeric(out.allocated_quantity as string | number);
  if (typeof out.lifted_quantity !== 'undefined')
    out.lifted_quantity = normalizeNumeric(out.lifted_quantity as string | number);
  if (typeof out.amount_paid !== 'undefined')
    out.amount_paid = normalizeNumeric(out.amount_paid as string | number);

  return out;
}
