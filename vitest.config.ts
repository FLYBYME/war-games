import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        exclude: ['src/tests/e2e/**', 'node_modules/**'],
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/client/**'],
            exclude: ['src/client/**/index.ts', 'src/client/ui-lib/theme.ts'],
        },
    },
});
