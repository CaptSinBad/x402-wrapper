import { vi } from 'vitest';

// Provide a small UUID helper globally for tests that want to generate one
(globalThis as any).testUtils = {
  uuid: () => (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : require('crypto').randomUUID(),
};
