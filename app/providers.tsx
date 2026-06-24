'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { SocketProvider } from '@/components/providers/socket-provider';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { MessagesProvider } from '@/components/messages/MessagesProvider';
import { TrustlessWorkProvider } from '@/lib/providers/TrustlessWorkProvider';
import { EscrowProvider } from '@/lib/providers/EscrowProvider';
import { AuthModalProvider } from '@/components/auth/AuthModalProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            // Client errors (4xx) are deterministic; retrying wastes a round trip.
            retry: (failureCount, error) => {
              if (
                error instanceof ApiError &&
                error.status >= 400 &&
                error.status < 500
              ) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthModalProvider>
        <SocketProvider>
          <WalletProvider>
            <MessagesProvider>
              <TrustlessWorkProvider>
                <EscrowProvider>{children}</EscrowProvider>
              </TrustlessWorkProvider>
            </MessagesProvider>
          </WalletProvider>
        </SocketProvider>
      </AuthModalProvider>
    </QueryClientProvider>
  );
}
