/**
 * Connected-wallet transaction signer.
 *
 * Previously a stub that threw (signing was unavailable). Now delegates to the
 * Stellar Wallets Kit (Freighter / xBull / Albedo / Lobstr / Hana) so the
 * legacy escrow + crowdfunding flows that call signTransaction({ ... }) get a
 * real multi-wallet signer with the Kit's built-in connect modal.
 */
import { signXdrWithKit } from '@/lib/wallet/wallet-kit';

interface SignTransactionProps {
  unsignedTransaction: string;
  address: string;
}

export const signTransaction = async ({
  unsignedTransaction,
  address,
}: SignTransactionProps): Promise<string> => {
  return signXdrWithKit(unsignedTransaction, address);
};
