/**
 * Token contract (SAC) configuration for the boundless-events escrow flow.
 *
 * The v2 escrow endpoints take a `tokenAddress` that must be the Stellar Asset
 * Contract (SAC) **C-address** whitelisted on the events contract — NOT the
 * classic issuer G-address (e.g. the old `USDC_TRUSTLINE_ADDRESS`). The
 * backend rejects anything that isn't a valid C-address.
 *
 * The concrete SAC values come from the backend admin runbook (the contract's
 * whitelisted token registry) and are injected per network via env vars so
 * testnet/mainnet stay in lockstep with the backend without a code change.
 */
import { getCurrentNetwork, type NetworkType } from '@/lib/wallet-utils';

// Stellar contract (SAC) address: 56-char base32, starts with C. Mirrors the
// backend C_ADDRESS_REGEX in hackathon-escrow.dto.ts.
const C_ADDRESS_REGEX = /^C[A-Z2-7]{55}$/;

/**
 * USDC SAC (Soroban) contract addresses per network. Defaults mirror the
 * backend's canonical registry (boundless-nestjs
 * src/common/utils/supported-currencies.ts) so the frontend is correct out of
 * the box and the escrow token always matches the wallet's USDC. Override via
 * env only if the backend registry changes.
 */
const USDC_SAC_BY_NETWORK: Record<NetworkType, string | undefined> = {
  testnet:
    process.env.NEXT_PUBLIC_USDC_TOKEN_CONTRACT_TESTNET ||
    'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  public:
    process.env.NEXT_PUBLIC_USDC_TOKEN_CONTRACT_PUBLIC ||
    'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
};

/** Currencies the prize pool can be denominated in. USDC only for now. */
export type SupportedCurrency = 'USDC';

const SAC_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<NetworkType, string | undefined>
> = {
  USDC: USDC_SAC_BY_NETWORK,
};

/**
 * Resolve the SAC (C-address) for a currency on a given network, for use as the
 * escrow `tokenAddress`. Defaults to the env-configured current network.
 *
 * @throws if the currency is unsupported or no SAC is configured for the network.
 */
export function getTokenAddress(
  currency: string,
  network: NetworkType = getCurrentNetwork()
): string {
  const normalized = currency?.toUpperCase() as SupportedCurrency;
  const byNetwork = SAC_BY_CURRENCY[normalized];
  if (!byNetwork) {
    throw new Error(
      `Unsupported escrow currency "${currency}". Only USDC is supported.`
    );
  }

  const address = byNetwork[network];
  if (!address) {
    throw new Error(
      `No ${normalized} token contract configured for ${network}. Set ` +
        `NEXT_PUBLIC_USDC_TOKEN_CONTRACT_${network.toUpperCase()} to the ` +
        'whitelisted SAC C-address from the backend admin runbook.'
    );
  }
  if (!C_ADDRESS_REGEX.test(address)) {
    throw new Error(
      `Configured ${normalized} token contract for ${network} ("${address}") ` +
        'is not a valid Stellar contract (C-) address.'
    );
  }
  return address;
}

/** Whether a SAC is configured for the given currency/network (no throw). */
export function hasTokenAddress(
  currency: string,
  network: NetworkType = getCurrentNetwork()
): boolean {
  const byNetwork =
    SAC_BY_CURRENCY[currency?.toUpperCase() as SupportedCurrency];
  const address = byNetwork?.[network];
  return !!address && C_ADDRESS_REGEX.test(address);
}
