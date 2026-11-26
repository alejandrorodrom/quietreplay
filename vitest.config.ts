import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['lib/**/*.ts'],
      exclude: ['**/*.d.ts'],
      // Enforced Silver-level floor. Raise toward Gold (90% statements / 80% branches).
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 90,
        lines: 85,
      },
    },
  },
});
