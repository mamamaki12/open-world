import { defineConfig } from 'vitest/config';

// The relay uses node:test and is run separately in CI.
export default defineConfig({ test: { include: ['src/**/*.test.{ts,tsx}'] } });
