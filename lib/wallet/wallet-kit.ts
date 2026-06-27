/**
 * Stellar Wallets Kit — connected-wallet signer for the EXTERNAL funding path.
 *
 * Replaces the Freighter-only signer with the Kit's multi-wallet support
 * (Freighter, xBull, Albedo, Lobstr, Hana) and its built-in connect modal.
 *
 * The Kit (v2 static API) is browser-only and touches `window` at import time,
 * so everything is loaded through a lazy dynamic import and initialized once on
 * first use. Importing this module on the server is safe; nothing runs until a
 * function is called in the browser.
 */
import { getCurrentNetwork, getNetworkPassphrase } from '@/lib/wallet-utils';
import type { SignXdrFn } from '@/features/hackathons';

type KitClass =
  typeof import('@creit.tech/stellar-wallets-kit').StellarWalletsKit;

let kitRef: KitClass | null = null;
let initPromise: Promise<void> | null = null;

/** Initialize the Kit exactly once (idempotent across concurrent callers). */
function initKit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const [mod, freighter, xbull, albedo, lobstr, hana] = await Promise.all([
        import('@creit.tech/stellar-wallets-kit'),
        import('@creit.tech/stellar-wallets-kit/modules/freighter'),
        import('@creit.tech/stellar-wallets-kit/modules/xbull'),
        import('@creit.tech/stellar-wallets-kit/modules/albedo'),
        import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
        import('@creit.tech/stellar-wallets-kit/modules/hana'),
      ]);
      mod.StellarWalletsKit.init({
        network:
          getCurrentNetwork() === 'public'
            ? mod.Networks.PUBLIC
            : mod.Networks.TESTNET,
        modules: [
          new freighter.FreighterModule(),
          new xbull.xBullModule(),
          new albedo.AlbedoModule(),
          new lobstr.LobstrModule(),
          new hana.HanaModule(),
        ],
      });
      kitRef = mod.StellarWalletsKit;
    })();
  }
  return initPromise;
}

async function getKit(): Promise<KitClass> {
  await initKit();
  if (!kitRef) {
    throw new Error('Wallet kit failed to initialize.');
  }
  return kitRef;
}

export interface ConnectedWallet {
  address: string;
}

/** Open the Kit's wallet picker; resolves with the connected address. */
export async function connectWallet(): Promise<ConnectedWallet> {
  const kit = await getKit();
  const { address } = await kit.authModal();
  return { address };
}

/** The currently connected address, or null if none is selected yet. */
export async function getConnectedAddress(): Promise<string | null> {
  const kit = await getKit();
  try {
    const { address } = await kit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

/** Forget the connected wallet. */
export async function disconnectWallet(): Promise<void> {
  try {
    const kit = await getKit();
    await kit.disconnect();
  } catch {
    // Best-effort: nothing meaningful to do if disconnect fails.
  }
}

/**
 * Sign an unsigned XDR with the connected wallet. Matches the EscrowOpRunner
 * `SignXdrFn` so it can be handed straight to the runner for the EXTERNAL path.
 * Prompts the wallet picker if nothing is connected yet.
 */
export const signXdrWithKit: SignXdrFn = async (unsignedXdr, signerHint) => {
  const kit = await getKit();

  let address: string | null = signerHint ?? (await getConnectedAddress());
  if (!address) {
    const connected = await connectWallet();
    address = connected.address;
  }

  const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
    networkPassphrase: getNetworkPassphrase(),
    address: address ?? undefined,
  });
  if (!signedTxXdr) {
    throw new Error('The wallet returned no signed transaction.');
  }
  return signedTxXdr;
};
