import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        exclude: ['src/tests/e2e/**', 'node_modules/**'],
        testTimeout: 30000,
    },
});
