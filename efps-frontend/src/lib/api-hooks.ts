import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
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
export function usePaginatedList<T>(
  queryKey: string,
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; meta: PaginationMeta }>
) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: [queryKey, 1, 20],
    queryFn: () => fetcher(1, 20),
  });

  const loadPage = (page: number) =>
    queryClient.fetchQuery({ queryKey: [queryKey, page, 20], queryFn: () => fetcher(page, 20) });

  return {
    data: data?.data ?? ([] as T[]),
    meta: data?.meta ?? { page: 1, limit: 20, total: 0, cursor: null } as PaginationMeta,
    loading: isLoading,
    reload: () => refetch(),
    loadPage,
  };
}

// --- Beneficiaries ---
export function useBeneficiaries() {
  const list = (page = 1, limit = 20) =>
    api.get<ApiResponse<Beneficiary[]>>(`/beneficiaries?page=${page}&limit=${limit}`)
      .then(r => r as unknown as { data: Beneficiary[]; meta: PaginationMeta });

  const search = (q: string, page = 1, limit = 20) =>
    api.get<ApiResponse<Beneficiary[]>>(`/beneficiaries/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`)
      .then(r => r as unknown as { data: Beneficiary[]; meta: PaginationMeta });

  const createFn = (input: CreateBeneficiaryInput) => api.post<Beneficiary>('/beneficiaries', input);
  const updateFn = ({ id, input }: { id: string; input: UpdateBeneficiaryInput }) => api.patch<Beneficiary>(`/beneficiaries/${id}`, input);
  const removeFn = (id: string) => api.delete(`/beneficiaries/${id}`);

  const create = (input: CreateBeneficiaryInput) => createFn(input);
  const update = (id: string, input: UpdateBeneficiaryInput) => updateFn({ id, input });
  const remove = (id: string) => removeFn(id);

  return { list: usePaginatedList('beneficiaries', list), search, create, update, remove };
}

// --- Transactions ---
export function useTransactions() {
  const list = (page = 1, limit = 20, month?: string, commodity?: string) => {
    let path = `/transactions?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    if (commodity) path += `&commodity=${commodity}`;
    return api.get<ApiResponse<Transaction[]>>(path)
      .then(r => r as unknown as { data: Transaction[]; meta: PaginationMeta });
  };

  const create = (input: CreateTransactionInput) => api.post<Transaction>('/transactions', input);

  const getSummary = () =>
    api.get<{ total_today: number; quantity_today: number; total_month: number; quantity_month: number; monthly_sales: Array<{ commodity: string; quantity: number; amount: number }> }>('/transactions/summary');

  const getPending = () =>
    api.get<Array<{ beneficiary_id: string; head_of_family: string; ration_card_no: string }>>('/transactions/pending');

  const remove = (id: string) => api.delete(`/transactions/${id}`);

  return { list, create, getSummary, getPending, remove };
}

// --- Stock ---
export function useStock() {
  const getCurrent = () => api.get<StockAllocation[]>('/stock');
  const getHistory = (page = 1, limit = 20, month?: string, commodity?: string) => {
    let path = `/stock/history?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    if (commodity) path += `&commodity=${commodity}`;
    return api.get<ApiResponse<StockAllocation[]>>(path)
      .then(r => r as unknown as { data: StockAllocation[]; meta: PaginationMeta });
  };
  return { getCurrent, getHistory };
}

// --- Notifications ---
export function useNotifications() {
  const list = (page = 1, limit = 20) =>
    api.get<ApiResponse<Notification[]>>(`/notifications?page=${page}&limit=${limit}`)
      .then(r => r as unknown as { data: Notification[]; meta: PaginationMeta });

  const markRead = (id: string) => api.patch<Notification>(`/notifications/${id}/read`);
  const markAllRead = () => api.patch<{ marked_read: number }>('/notifications/read-all');
  const remove = (id: string) => api.delete(`/notifications/${id}`);

  return { list: usePaginatedList('notifications', list), markRead, markAllRead, remove };
}

// --- Finance ---
export function useFinance() {
  const addIncome = (input: CreateIncomeInput) => api.post<IncomeEntry>('/finance/income', input);
  const addExpense = (input: CreateExpenseInput) => api.post<ExpenseEntry>('/finance/expense', input);

  const listIncome = (page = 1, limit = 20, month?: string) => {
    let path = `/finance/income?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    return api.get<ApiResponse<IncomeEntry[]>>(path)
      .then(r => r as unknown as { data: IncomeEntry[]; meta: PaginationMeta });
  };

  const listExpenses = (page = 1, limit = 20, month?: string) => {
    let path = `/finance/expenses?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    return api.get<ApiResponse<ExpenseEntry[]>>(path)
      .then(r => r as unknown as { data: ExpenseEntry[]; meta: PaginationMeta });
  };

  const getProfitLoss = (month?: string) => {
    let path = '/finance/profit-loss';
    if (month) path += `?month=${month}`;
    return api.get<ProfitLoss>(path);
  };

  const deleteIncome = (id: string) => api.delete(`/finance/income/${id}`);
  const deleteExpense = (id: string) => api.delete(`/finance/expense/${id}`);

  return { addIncome, addExpense, listIncome, listExpenses, getProfitLoss, deleteIncome, deleteExpense };
}

// --- Commission ---
export function useCommission() {
  const getRates = () => api.get<CommissionRate[]>('/commission/rates');
  const calculate = (month?: string) => {
    let path = '/commission/calculate';
    if (month) path += `?month=${month}`;
    return api.get<Commission[]>(path);
  };
  const list = (page = 1, limit = 20, month?: string) => {
    let path = `/commission?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    return api.get<ApiResponse<Commission[]>>(path)
      .then(r => r as unknown as { data: Commission[]; meta: PaginationMeta });
  };
  return { getRates, calculate, list };
}

// --- Lifting ---
export function useLifting() {
  const create = (input: CreateLiftingInput) => api.post<LiftingEntry>('/lifting', input);

  const list = (page = 1, limit = 20, month?: string) => {
    let path = `/lifting?page=${page}&limit=${limit}`;
    if (month) path += `&month=${month}`;
    return api.get<ApiResponse<LiftingEntry[]>>(path)
      .then(r => r as unknown as { data: LiftingEntry[]; meta: PaginationMeta });
  };

  return { create, list };
}

// --- Dashboard ---
export function useDashboard() {
  const getSummary = () => api.get<DashboardSummary>('/dashboard/summary');
  return { getSummary };
}

// --- Profile ---
export function useProfile() {
  const get = (id: string) => api.get<DealerDto>(`/dealers/${id}`);
  const update = (id: string, input: UpdateDealerInput) => api.patch<DealerDto>(`/dealers/${id}`, input);
  const getStats = (id: string) => api.get(`/dealers/${id}/stats`);
  return { get, update, getStats };
}

// --- Ads ---
export function useAds() {
  const list = (page = 1, limit = 20) =>
    api.get<ApiResponse<Ad[]>>(`/ads?page=${page}&limit=${limit}`)
      .then(r => r as unknown as { data: Ad[]; meta: PaginationMeta });
  return { list: usePaginatedList('ads', list) };
}

// --- Sync ---
import type { SyncJob, SyncDashboardData, ImportResult, QuarantineSummary } from './types';

export function useSync() {
  const getBankInfo = () =>
    api.get<{ bank_name: string | null; branch_name: string | null; account_no: string | null; ifsc_code: string | null; account_holder: string | null }>('/sync/bank-info');
  const updateBankInfo = (data: Record<string, string | undefined>) => api.put('/sync/bank-info', data);
  const triggerSelfSync = (syncType = 'beneficiaries') =>
    api.post('/sync/self/trigger', { sync_type: syncType });
  const getSelfSyncStatus = () => api.get('/sync/self/status');
  const getSelfDashboard = () => api.get<SyncDashboardData>('/sync/self/dashboard');
  const triggerPrioritySync = () => api.post('/sync/self/trigger', { sync_type: 'priority' });
  const importCsv = (rows: {
    hofAsPerNFSA: string;
    rationCardNo: string;
    cardCategory?: string;
    familyMember?: number;
    cardHolderName?: string;
    lpgStatus?: string;
    pngStatus?: string;
    address?: string;
    village?: string;
  }[]) =>
    api.post<ImportResult>('/sync/import/csv', { rows });
  return { getBankInfo, updateBankInfo, triggerSelfSync, getSelfSyncStatus, getSelfDashboard, triggerPrioritySync, importCsv };
}
