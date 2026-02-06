import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: React.ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

// All providers wrapper for testing
function AllTheProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render with all providers
function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { initialEntries, queryClient, ...renderOptions } = options || {};

  const testQueryClient = queryClient || createTestQueryClient();

  const Wrapper = ({ children }: WrapperProps) => {
    if (initialEntries) {
      return (
        <QueryClientProvider client={testQueryClient}>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </QueryClientProvider>
      );
    }
    return (
      <QueryClientProvider client={testQueryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override render with custom render
export { customRender as render };

// Export query client creator for tests that need direct access
export { createTestQueryClient };

// Helper to wait for loading states to resolve
export async function waitForLoadingToFinish() {
  const { waitFor, screen } = await import('@testing-library/react');
  await waitFor(() => {
    const loaders = screen.queryAllByRole('progressbar');
    expect(loaders).toHaveLength(0);
  });
}

// Mock authenticated user context
export const mockAuthContext = {
  user: {
    id: 'user_01',
    email: 'admin@cogtics.dev',
    role: 'admin',
    tenantId: 'tenant_01',
  },
  isAuthenticated: true,
  login: async () => {},
  logout: async () => {},
};

// Mock tenant context
export const mockTenantContext = {
  tenant: {
    id: 'tenant_01',
    name: 'Test Tenant',
    plan: 'enterprise',
  },
};
