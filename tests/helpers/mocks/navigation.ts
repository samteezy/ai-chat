import { vi } from 'vitest';

export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  };
}

export function createMockPathname(pathname = '/') {
  return pathname;
}

export function createMockSearchParams(params: Record<string, string> = {}) {
  return new URLSearchParams(params);
}

// Use this to mock next/navigation in tests
export function mockNextNavigation(options: {
  pathname?: string;
  searchParams?: Record<string, string>;
  router?: ReturnType<typeof createMockRouter>;
} = {}) {
  const router = options.router ?? createMockRouter();
  const pathname = options.pathname ?? '/';
  const searchParams = createMockSearchParams(options.searchParams);

  return {
    useRouter: () => router,
    usePathname: () => pathname,
    useSearchParams: () => searchParams,
    useParams: () => ({}),
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
}
