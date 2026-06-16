import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, ApiRequestError } from './api';
import type {
  ApiResponse, PaginationMeta,
  Beneficiary, CreateBeneficiaryInput, UpdateBeneficiaryInput,
  Transaction, CreateTransactionInput,
  StockAllocation,
  Notification,
  IncomeEntry, ExpenseEntry, CreateIncomeInput, CreateExpenseInput, ProfitLoss,
  CommissionRate, Commission,
  LiftingEntry, CreateLiftingInput,
  DashboardSummary,
  Ad, DealerDto, UpdateDealerInput,
} from './types';

// --- Generic hook for paginated list ---
export function usePaginatedList<T>(fetcher: (page: number, limit: number) => Promise<{ data: T[]; meta: PaginationMeta }>) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, cursor: null });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const result = await fetcher(page, limit);
      setData(result.data);
      setMeta(result.meta);
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);

  return { data, meta, loading, reload: () => load(meta.page, meta.limit), loadPage: (p: number) => load(p, meta.limit) };
}

// --- Beneficiaries ---
export function useBeneficiaries() {
  const list = useCallback(async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<Beneficiary[]>>(`/beneficiaries?page=${page}&limit=${limit}`);
    return res as unknown as { data: Beneficiary[]; meta: PaginationMeta };
  }, []);

  const search = useCallback(async (q: string, page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<Beneficiary[]>>(`/beneficiaries/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);
    return res as unknown as { data: Beneficiary[]; meta: PaginationMeta };
  }, []);

  const create = useCallback(async (input: CreateBeneficiaryInput) => {
    const result = await api.post<Beneficiary>('/beneficiaries', input);
    toast.success('Beneficiary created');
    return result;
  }, []);

  const update = useCallback(async (id: string, input: UpdateBeneficiaryInput) => {
    const result = await api.patch<Beneficiary>(`/beneficiaries/${id}`, input);
    toast.success('Beneficiary updated');
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/beneficiaries/${id}`);
    toast.success('Beneficiary deactivated');
  }, []);

  return { list: usePaginatedList(list), search, create, update, remove };
}

// --- Transactions ---
export function useTransactions() {
  const list = useCallback(async (page = 1, limit = 20, month?: string, commodity?: string) => {
    let path = `/transactions?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    if (commodity) path += `&commodity=${commodity}`;
    const res = await api.get<ApiResponse<Transaction[]>>(path);
    return res as unknown as { data: Transaction[]; meta: PaginationMeta };
  }, []);

  const create = useCallback(async (input: CreateTransactionInput) => {
    const result = await api.post<Transaction>('/transactions', input);
    toast.success('Transaction created');
    return result;
  }, []);

  const getSummary = useCallback(async () => {
    return api.get<{ total_today: number; quantity_today: number; total_month: number; quantity_month: number; monthly_sales: Array<{ commodity: string; quantity: number; amount: number }> }>('/transactions/summary');
  }, []);

  const getPending = useCallback(async () => {
    return api.get<Array<{ beneficiary_id: string; head_of_family: string; ration_card_no: string }>>('/transactions/pending');
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/transactions/${id}`);
    toast.success('Transaction deleted');
  }, []);

  return { list, create, getSummary, getPending, remove };
}

// --- Stock ---
export function useStock() {
  const getCurrent = useCallback(async () => {
    return api.get<StockAllocation[]>('/stock');
  }, []);

  const getHistory = useCallback(async (page = 1, limit = 20, month?: string, commodity?: string) => {
    let path = `/stock/history?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    if (commodity) path += `&commodity=${commodity}`;
    const res = await api.get<ApiResponse<StockAllocation[]>>(path);
    return res as unknown as { data: StockAllocation[]; meta: PaginationMeta };
  }, []);

  return { getCurrent, getHistory };
}

// --- Notifications ---
export function useNotifications() {
  const list = useCallback(async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<Notification[]>>(`/notifications?page=${page}&limit=${limit}`);
    return res as unknown as { data: Notification[]; meta: PaginationMeta };
  }, []);

  const markRead = useCallback(async (id: string) => {
    return api.patch<Notification>(`/notifications/${id}/read`);
  }, []);

  const markAllRead = useCallback(async () => {
    return api.patch<{ marked_read: number }>('/notifications/read-all');
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/notifications/${id}`);
  }, []);

  return { list: usePaginatedList(list), markRead, markAllRead, remove };
}

// --- Finance ---
export function useFinance() {
  const addIncome = useCallback(async (input: CreateIncomeInput) => {
    const result = await api.post<IncomeEntry>('/finance/income', input);
    toast.success('Income added');
    return result;
  }, []);

  const addExpense = useCallback(async (input: CreateExpenseInput) => {
    const result = await api.post<ExpenseEntry>('/finance/expense', input);
    toast.success('Expense added');
    return result;
  }, []);

  const listIncome = useCallback(async (page = 1, limit = 20, month?: string) => {
    let path = `/finance/income?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    const res = await api.get<ApiResponse<IncomeEntry[]>>(path);
    return res as unknown as { data: IncomeEntry[]; meta: PaginationMeta };
  }, []);

  const listExpenses = useCallback(async (page = 1, limit = 20, month?: string) => {
    let path = `/finance/expenses?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    const res = await api.get<ApiResponse<ExpenseEntry[]>>(path);
    return res as unknown as { data: ExpenseEntry[]; meta: PaginationMeta };
  }, []);

  const getProfitLoss = useCallback(async (month?: string) => {
    let path = '/finance/profit-loss';
    if (month) path += `?month=${month}`;
    return api.get<ProfitLoss>(path);
  }, []);

  const deleteIncome = useCallback(async (id: string) => {
    await api.delete(`/finance/income/${id}`);
    toast.success('Income entry deleted');
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    await api.delete(`/finance/expense/${id}`);
    toast.success('Expense entry deleted');
  }, []);

  return { addIncome, addExpense, listIncome, listExpenses, getProfitLoss, deleteIncome, deleteExpense };
}

// --- Commission ---
export function useCommission() {
  const getRates = useCallback(async () => {
    return api.get<CommissionRate[]>('/commission/rates');
  }, []);

  const calculate = useCallback(async (month?: string) => {
    let path = '/commission/calculate';
    if (month) path += `?month=${month}`;
    return api.get<Commission[]>(path);
  }, []);

  const list = useCallback(async (page = 1, limit = 20, month?: string) => {
    let path = `/commission?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    const res = await api.get<ApiResponse<Commission[]>>(path);
    return res as unknown as { data: Commission[]; meta: PaginationMeta };
  }, []);

  return { getRates, calculate, list };
}

// --- Lifting ---
export function useLifting() {
  const create = useCallback(async (input: CreateLiftingInput) => {
    const result = await api.post<LiftingEntry>('/lifting', input);
    toast.success('Lifting entry created');
    return result;
  }, []);

  const list = useCallback(async (page = 1, limit = 20, month?: string) => {
    let path = `/lifting?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    const res = await api.get<ApiResponse<LiftingEntry[]>>(path);
    return res as unknown as { data: LiftingEntry[]; meta: PaginationMeta };
  }, []);

  return { create, list };
}

// --- Dashboard ---
export function useDashboard() {
  const getSummary = useCallback(async () => {
    return api.get<DashboardSummary>('/dashboard/summary');
  }, []);

  return { getSummary };
}

// --- Profile ---
export function useProfile() {
  const get = useCallback(async (id: string) => {
    return api.get<DealerDto>(`/dealers/${id}`);
  }, []);

  const update = useCallback(async (id: string, input: UpdateDealerInput) => {
    const result = await api.patch<DealerDto>(`/dealers/${id}`, input);
    toast.success('Profile updated');
    return result;
  }, []);

  const getStats = useCallback(async (id: string) => {
    return api.get(`/dealers/${id}/stats`);
  }, []);

  return { get, update, getStats };
}

// --- Ads ---
export function useAds() {
  const list = useCallback(async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<Ad[]>>(`/ads?page=${page}&limit=${limit}`);
    return res as unknown as { data: Ad[]; meta: PaginationMeta };
  }, []);

  return { list: usePaginatedList(list) };
}

// --- Sync ---
export function useSync() {
  const getBankInfo = useCallback(async () => {
    return api.get<{ bank_name: string | null; branch_name: string | null; account_no: string | null; ifsc_code: string | null; account_holder: string | null }>('/sync/bank-info');
  }, []);

  const updateBankInfo = useCallback(async (data: Record<string, string | undefined>) => {
    const result = await api.put('/sync/bank-info', data);
    toast.success('Bank info updated');
    return result;
  }, []);

  const triggerSelfSync = useCallback(async (syncType: string = 'beneficiaries') => {
    const result = await api.post('/sync/self/trigger', { sync_type: syncType });
    toast.success('Sync triggered');
    return result;
  }, []);

  const getSelfSyncStatus = useCallback(async () => {
    return api.get('/sync/self/status');
  }, []);

  return { getBankInfo, updateBankInfo, triggerSelfSync, getSelfSyncStatus };
}
