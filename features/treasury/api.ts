import { api } from '@/lib/api/api';
import type {
  BuildSpendXdrResult,
  FundingOtpRequestResult,
  FundingOtpVerifyResult,
  InitiateSpendInput,
  Receipt,
  ReceiptListResponse,
  SendDestinationReadiness,
  SendFundsInput,
  SpendRequest,
  SpendStatus,
  TreasuryAuditPage,
  TreasuryPolicy,
  TreasuryPolicyRule,
  TreasuryWallet,
  WalletBalance,
} from './types';

// The NestJS global interceptor wraps payloads in { success, message, data }.
// Tolerate a bare payload too (matches lib/api/hackathons/escrow.ts).
interface Wrapped<T> {
  success?: boolean;
  message?: string;
  data: T;
}

const unwrap = <T>(body: T | Wrapped<T>): T =>
  body &&
  typeof body === 'object' &&
  'data' in body &&
  (body as Wrapped<T>).data !== undefined
    ? (body as Wrapped<T>).data
    : (body as T);

const base = (organizationId: string) =>
  `/organizations/${organizationId}/treasury`;

// ── Wallets ──────────────────────────────────────────────────────────────

export const listTreasuryWallets = async (
  organizationId: string
): Promise<TreasuryWallet[]> => {
  const { data } = await api.get<TreasuryWallet[] | Wrapped<TreasuryWallet[]>>(
    `${base(organizationId)}/wallets`
  );
  return unwrap(data) ?? [];
};

export const createManagedTreasuryWallet = async (
  organizationId: string,
  label: string
): Promise<TreasuryWallet> => {
  const { data } = await api.post<TreasuryWallet | Wrapped<TreasuryWallet>>(
    `${base(organizationId)}/wallets/managed`,
    { label }
  );
  return unwrap(data);
};

export const registerConnectedWallet = async (
  organizationId: string,
  body: { publicKey: string; label: string; connectionMethod: string }
): Promise<TreasuryWallet> => {
  const { data } = await api.post<TreasuryWallet | Wrapped<TreasuryWallet>>(
    `${base(organizationId)}/wallets/connected`,
    body
  );
  return unwrap(data);
};

export const updateTreasuryWallet = async (
  organizationId: string,
  walletId: string,
  patch: { label?: string; isDefault?: boolean }
): Promise<TreasuryWallet> => {
  const { data } = await api.patch<TreasuryWallet | Wrapped<TreasuryWallet>>(
    `${base(organizationId)}/wallets/${walletId}`,
    patch
  );
  return unwrap(data);
};

export const archiveTreasuryWallet = async (
  organizationId: string,
  walletId: string
): Promise<TreasuryWallet> => {
  const { data } = await api.post<TreasuryWallet | Wrapped<TreasuryWallet>>(
    `${base(organizationId)}/wallets/${walletId}/archive`
  );
  return unwrap(data);
};

// Wallets are never deleted, only archived; these power the archived view + restore.
export const listArchivedTreasuryWallets = async (
  organizationId: string
): Promise<TreasuryWallet[]> => {
  const { data } = await api.get<TreasuryWallet[] | Wrapped<TreasuryWallet[]>>(
    `${base(organizationId)}/wallets/archived`
  );
  return unwrap(data) ?? [];
};

export const restoreTreasuryWallet = async (
  organizationId: string,
  walletId: string
): Promise<TreasuryWallet> => {
  const { data } = await api.post<TreasuryWallet | Wrapped<TreasuryWallet>>(
    `${base(organizationId)}/wallets/${walletId}/restore`
  );
  return unwrap(data);
};

export const getWalletBalance = async (
  organizationId: string,
  walletId: string
): Promise<WalletBalance> => {
  const { data } = await api.get<WalletBalance | Wrapped<WalletBalance>>(
    `${base(organizationId)}/wallets/${walletId}/balance`
  );
  return unwrap(data);
};

export const getDefaultTreasuryWallet = async (
  organizationId: string
): Promise<TreasuryWallet> => {
  const { data } = await api.get<TreasuryWallet | Wrapped<TreasuryWallet>>(
    `${base(organizationId)}/default-wallet`
  );
  return unwrap(data);
};

// ── Policy ───────────────────────────────────────────────────────────────

export const getTreasuryPolicy = async (
  organizationId: string
): Promise<TreasuryPolicy> => {
  const { data } = await api.get<TreasuryPolicy | Wrapped<TreasuryPolicy>>(
    `${base(organizationId)}/policy`
  );
  return unwrap(data);
};

export const updateTreasuryPolicy = async (
  organizationId: string,
  body: { rules: TreasuryPolicyRule[]; defaultWalletId?: string }
): Promise<TreasuryPolicy> => {
  const { data } = await api.put<TreasuryPolicy | Wrapped<TreasuryPolicy>>(
    `${base(organizationId)}/policy`,
    body
  );
  return unwrap(data);
};

// ── Spend requests ───────────────────────────────────────────────────────

export const listSpendRequests = async (
  organizationId: string,
  status?: SpendStatus
): Promise<SpendRequest[]> => {
  const query = status ? `?status=${status}` : '';
  const { data } = await api.get<SpendRequest[] | Wrapped<SpendRequest[]>>(
    `${base(organizationId)}/spend${query}`
  );
  return unwrap(data) ?? [];
};

export const initiateSpend = async (
  organizationId: string,
  body: InitiateSpendInput
): Promise<SpendRequest> => {
  const { data } = await api.post<SpendRequest | Wrapped<SpendRequest>>(
    `${base(organizationId)}/spend`,
    body
  );
  return unwrap(data);
};

const spendAction = async (
  organizationId: string,
  requestId: string,
  action: 'approve' | 'reject' | 'cancel' | 'execute',
  body?: { note?: string }
): Promise<SpendRequest> => {
  const { data } = await api.post<SpendRequest | Wrapped<SpendRequest>>(
    `${base(organizationId)}/spend/${requestId}/${action}`,
    body ?? {}
  );
  return unwrap(data);
};

export const approveSpend = (
  organizationId: string,
  requestId: string,
  note?: string
) => spendAction(organizationId, requestId, 'approve', { note });

export const rejectSpend = (
  organizationId: string,
  requestId: string,
  note?: string
) => spendAction(organizationId, requestId, 'reject', { note });

export const cancelSpend = (organizationId: string, requestId: string) =>
  spendAction(organizationId, requestId, 'cancel');

export const executeSpend = (organizationId: string, requestId: string) =>
  spendAction(organizationId, requestId, 'execute');

export const buildSpendXdr = async (
  organizationId: string,
  requestId: string
): Promise<BuildSpendXdrResult> => {
  const { data } = await api.post<
    BuildSpendXdrResult | Wrapped<BuildSpendXdrResult>
  >(`${base(organizationId)}/spend/${requestId}/build-xdr`);
  return unwrap(data);
};

export const submitSpendSignedXdr = async (
  organizationId: string,
  requestId: string,
  signedXdr: string
): Promise<SpendRequest> => {
  const { data } = await api.post<SpendRequest | Wrapped<SpendRequest>>(
    `${base(organizationId)}/spend/${requestId}/submit-signed-xdr`,
    { signedXdr }
  );
  return unwrap(data);
};

// ── Send funds (one-shot, email OTP step-up) ──────────────────────────────

export const sendTreasuryFunds = async (
  organizationId: string,
  body: SendFundsInput
): Promise<SpendRequest> => {
  const { data } = await api.post<SpendRequest | Wrapped<SpendRequest>>(
    `${base(organizationId)}/spend/send`,
    body
  );
  return unwrap(data);
};

export const requestSendFundsOtp = async (
  organizationId: string
): Promise<FundingOtpRequestResult> => {
  const { data } = await api.post<
    FundingOtpRequestResult | Wrapped<FundingOtpRequestResult>
  >(`${base(organizationId)}/spend/funding-otp/request`);
  return unwrap(data);
};

export const verifySendFundsOtp = async (
  organizationId: string,
  code: string
): Promise<FundingOtpVerifyResult> => {
  const { data } = await api.post<
    FundingOtpVerifyResult | Wrapped<FundingOtpVerifyResult>
  >(`${base(organizationId)}/spend/funding-otp/verify`, { code });
  return unwrap(data);
};

// Pre-send check: can this address receive USDC (account exists + USDC trustline)?
export const checkSendDestinationReadiness = async (
  organizationId: string,
  address: string
): Promise<SendDestinationReadiness> => {
  const { data } = await api.get<
    SendDestinationReadiness | Wrapped<SendDestinationReadiness>
  >(
    `${base(organizationId)}/spend/destination-readiness?address=${encodeURIComponent(
      address
    )}`
  );
  return unwrap(data);
};

// ── Receipts ───────────────────────────────────────────────────────────────

const receiptsBase = (organizationId: string) =>
  `/organizations/${organizationId}/receipts`;

export const listReceipts = async (
  organizationId: string,
  params: { page?: number; limit?: number; referenceId?: string } = {}
): Promise<ReceiptListResponse> => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.referenceId) qs.set('referenceId', params.referenceId);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const { data } = await api.get<
    ReceiptListResponse | Wrapped<ReceiptListResponse>
  >(`${receiptsBase(organizationId)}${suffix}`);
  return unwrap(data);
};

export const getReceipt = async (
  organizationId: string,
  receiptId: string
): Promise<Receipt> => {
  const { data } = await api.get<Receipt | Wrapped<Receipt>>(
    `${receiptsBase(organizationId)}/${receiptId}`
  );
  return unwrap(data);
};

export const sendReceipt = async (
  organizationId: string,
  receiptId: string,
  email?: string
): Promise<{ sent: boolean }> => {
  const { data } = await api.post<
    { sent: boolean } | Wrapped<{ sent: boolean }>
  >(
    `${receiptsBase(organizationId)}/${receiptId}/send`,
    email ? { email } : {}
  );
  return unwrap(data);
};

export const voidReceipt = async (
  organizationId: string,
  receiptId: string,
  reason?: string
): Promise<Receipt> => {
  const { data } = await api.post<Receipt | Wrapped<Receipt>>(
    `${receiptsBase(organizationId)}/${receiptId}/void`,
    reason ? { reason } : {}
  );
  return unwrap(data);
};

// ── Audit log ────────────────────────────────────────────────────────────

export const getAuditLog = async (
  organizationId: string,
  page = 1,
  limit = 50
): Promise<TreasuryAuditPage> => {
  const { data } = await api.get<
    TreasuryAuditPage | Wrapped<TreasuryAuditPage>
  >(`${base(organizationId)}/audit-log?page=${page}&limit=${limit}`);
  return unwrap(data);
};
