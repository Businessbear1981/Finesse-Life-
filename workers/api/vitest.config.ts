import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  resolve: { alias: { 'server-only': r('./test/stubs/server-only.ts'), '@/': r('../../src/') } },
  test: { include: ['test/**/*.test.ts'], testTimeout: 20000, fileParallelism: false },
});
