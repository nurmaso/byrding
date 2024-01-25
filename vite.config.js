import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
// https://vitejs.dev/config/

export default defineConfig({
  build: {
    copyPublicDir: false,
    manifest: true,
    minify: true,
    reportCompressedSize: true,
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      name: 'NurmasoStore',
      formats: ['es', 'umd'],
      fileName: function (format) {
        return 'main.'.concat(format, '.js');
      },
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'styled-components'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'styled-components': 'styled',
        },
      },
    },
  },
  server: {
    port: 7077,
  },
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['lib'],
      outputDir: 'dist/types',
      skipDiagnostics: false,
    }),
  ],
});
