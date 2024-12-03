import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), dts({ rollupTypes: false, tsconfigPath: './tsconfig.app.json' })],
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [
        'vue',
        '@formkit/tempo',
        '@slickgrid-universal/common',
        '@slickgrid-universal/custom-footer-component',
        '@slickgrid-universal/empty-warning-component',
        '@slickgrid-universal/event-pub-sub',
        '@slickgrid-universal/pagination-component',
        '@slickgrid-universal/row-detail-view-plugin',
        '@slickgrid-universal/utils',
        'dequal',
        'i18next',
        'i18next-vue',
        'sortablejs',
      ],
    },
  },
});