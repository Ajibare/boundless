export const treasuryKeys = {
  all: ['treasury'] as const,
  wallets: (organizationId: string) =>
    ['treasury', 'wallets', organizationId] as const,
  // Child of `wallets` so invalidating the wallets key refreshes both lists.
  archivedWallets: (organizationId: string) =>
    ['treasury', 'wallets', organizationId, 'archived'] as const,
  balance: (organizationId: string, walletId: string) =>
    ['treasury', 'balance', organizationId, walletId] as const,
  policy: (organizationId: string) =>
    ['treasury', 'policy', organizationId] as const,
  spends: (organizationId: string, status?: string) =>
    ['treasury', 'spends', organizationId, status ?? 'all'] as const,
  sendReadiness: (organizationId: string, address: string) =>
    ['treasury', 'send-readiness', organizationId, address] as const,
  audit: (organizationId: string, page: number) =>
    ['treasury', 'audit', organizationId, page] as const,
  receipts: (organizationId: string) =>
    ['treasury', 'receipts', organizationId] as const,
  receipt: (organizationId: string, receiptId: string) =>
    ['treasury', 'receipts', organizationId, receiptId] as const,
  receiptByReference: (organizationId: string, referenceId: string) =>
    ['treasury', 'receipts', organizationId, 'ref', referenceId] as const,
};
