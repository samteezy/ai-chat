import { vi } from 'vitest';

interface ChainableMock {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
}

export interface MockDbConfig {
  selectResult?: unknown;
  selectAllResult?: unknown[];
  insertResult?: unknown;
  updateResult?: unknown;
  deleteResult?: unknown;
}

export function createMockDb(config: MockDbConfig = {}) {
  const chainable: ChainableMock = {
    from: vi.fn(() => chainable),
    where: vi.fn(() => chainable),
    get: vi.fn(() => config.selectResult ?? null),
    all: vi.fn(() => config.selectAllResult ?? []),
    orderBy: vi.fn(() => chainable),
    values: vi.fn(() => Promise.resolve(config.insertResult)),
    set: vi.fn(() => chainable),
  };

  return {
    select: vi.fn(() => chainable),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve(config.insertResult)),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(config.updateResult)),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(config.deleteResult)),
    })),
  };
}

export function mockDbModule(config: MockDbConfig = {}) {
  return {
    db: createMockDb(config),
  };
}

// Default mock for vi.mock('@/lib/db')
export const defaultDbMock = {
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => null),
        })),
        orderBy: vi.fn(() => ({
          all: vi.fn(() => []),
        })),
        all: vi.fn(() => []),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
};
