export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type RecordType = 'beneficiary' | 'transaction' | 'stock_allocation' | 'lifting_record';

interface Rule {
  validate: (record: Record<string, unknown>) => ValidationError | null;
}

const requiredFields: Record<RecordType, string[]> = {
  beneficiary: ['ration_card_no', 'beneficiary_name'],
  transaction: ['ration_card_no', 'transaction_date', 'commodity'],
  stock_allocation: ['commodity', 'allocated_quantity', 'month'],
  lifting_record: ['commodity', 'allocated_quantity', 'lifted_quantity', 'month', 'year'],
};

const dateFields = ['date_of_issue', 'transaction_date', 'date', 'lifting_date'];
const numericFields = ['allocated_quantity', 'lifted_quantity', 'amount_paid', 'allocation', 'monthly_requirement', 'opening_balance', 'closing_balance', 'total_offtake', 'total_lifting', 'no_of_families', 'no_of_beneficiaries'];

function makeRequiredRule(recordType: RecordType): Rule {
  return {
    validate: (record) => {
      const fields = requiredFields[recordType];
      if (!fields) return null;
      for (const f of fields) {
        const val = record[f];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          return { field: f, message: `${f} is required for ${recordType}`, code: 'REQUIRED_FIELD_MISSING' };
        }
      }
      return null;
    },
  };
}

function makeNumericRule(): Rule {
  return {
    validate: (record) => {
      for (const f of numericFields) {
        const val = record[f];
        if (val === undefined || val === null) continue;
        const num = Number(val);
        if (isNaN(num)) {
          return { field: f, message: `${f} must be a number, got ${typeof val}`, code: 'INVALID_NUMERIC' };
        }
        if (num < 0) {
          return { field: f, message: `${f} cannot be negative (got ${num})`, code: 'NEGATIVE_VALUE' };
        }
      }
      return null;
    },
  };
}

function makeDateRule(): Rule {
  return {
    validate: (record) => {
      for (const f of dateFields) {
        const val = record[f];
        if (val === undefined || val === null || val === '') continue;
        if (typeof val !== 'string') {
          return { field: f, message: `${f} must be a string date`, code: 'INVALID_DATE_TYPE' };
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          return { field: f, message: `${f} is not a valid date: "${val}"`, code: 'INVALID_DATE_VALUE' };
        }
      }
      return null;
    },
  };
}

function makeRationCardRule(): Rule {
  return {
    validate: (record) => {
      const val = record['ration_card_no'];
      if (!val || typeof val !== 'string') return null;
      if (val.length < 4 || val.length > 20) {
        return { field: 'ration_card_no', message: `ration_card_no length ${val.length} out of range (4-20)`, code: 'INVALID_LENGTH' };
      }
      if (/[^A-Z0-9/\\-]/.test(val.toUpperCase())) {
        return { field: 'ration_card_no', message: `ration_card_no contains invalid characters`, code: 'INVALID_CHARACTERS' };
      }
      return null;
    },
  };
}

function makePositiveQuantityRule(): Rule {
  return {
    validate: (record) => {
      if (record.lifted_quantity !== undefined && record.lifted_quantity !== null) {
        const lq = Number(record.lifted_quantity);
        const aq = record.allocated_quantity !== undefined && record.allocated_quantity !== null ? Number(record.allocated_quantity) : null;
        if (!isNaN(lq) && aq !== null && !isNaN(aq) && lq > aq) {
          return { field: 'lifted_quantity', message: `lifted_quantity (${lq}) exceeds allocated_quantity (${aq})`, code: 'LIFTED_EXCEEDS_ALLOCATED' };
        }
      }
      return null;
    },
  };
}

const rulesByType: Record<RecordType, Rule[]> = {
  beneficiary: [makeRequiredRule('beneficiary'), makeNumericRule(), makeDateRule(), makeRationCardRule()],
  transaction: [makeRequiredRule('transaction'), makeNumericRule(), makeDateRule(), makeRationCardRule()],
  stock_allocation: [makeRequiredRule('stock_allocation'), makeNumericRule(), makeDateRule(), makePositiveQuantityRule()],
  lifting_record: [makeRequiredRule('lifting_record'), makeNumericRule(), makeDateRule(), makePositiveQuantityRule()],
};

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateRecord(record: Record<string, unknown>, recordType: RecordType): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const rules = rulesByType[recordType] || [];
  for (const rule of rules) {
    const err = rule.validate(record);
    if (err) {
      if (err.code === 'LIFTED_EXCEEDS_ALLOCATED') {
        warnings.push(err);
      } else {
        errors.push(err);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateBatch(records: Record<string, unknown>[], recordType: RecordType): { pass: { record: Record<string, unknown>; warnings: ValidationError[] }[]; fail: { record: Record<string, unknown>; errors: ValidationError[] }[] } {
  const pass: { record: Record<string, unknown>; warnings: ValidationError[] }[] = [];
  const fail: { record: Record<string, unknown>; errors: ValidationError[] }[] = [];

  for (const record of records) {
    const result = validateRecord(record, recordType);
    if (result.valid) {
      pass.push({ record, warnings: result.warnings });
    } else {
      fail.push({ record, errors: result.errors });
    }
  }

  return { pass, fail };
}
