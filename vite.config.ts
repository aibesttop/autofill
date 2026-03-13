import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync, existsSync, readFileSync } from 'fs';

function copyPublicFiles() {
  // Copy HTML files to dist after build
  const htmlFiles = ['popup.html', 'sidepanel.html', 'options.html'];
  const publicDir = resolve(__dirname, 'public');
  const distDir = resolve(__dirname, 'dist');

  htmlFiles.forEach(file => {
    const srcPath = resolve(publicDir, file);
    const destPath = resolve(distDir, file);

    if (existsSync(srcPath)) {
      let content = readFileSync(srcPath, 'utf-8');

      // Replace script src to point to built files (use relative paths for Chrome extension)
      if (file === 'popup.html') {
        content = content.replace('/src/ui/main.tsx', 'popup.js');
      } else if (file === 'sidepanel.html') {
        content = content.replace('/src/ui/main.tsx', 'sidepanel.js');
      } else if (file === 'options.html') {
        content = content.replace('/src/ui/main.tsx', 'options.js');
      }

      writeFileSync(destPath, content);
    }
  });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-html-files',
      closeBundle: copyPublicFiles,
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/ui/components'),
      '@hooks': resolve(__dirname, './src/ui/hooks'),
      '@services': resolve(__dirname, './src/ui/services'),
      '@shared': resolve(__dirname, './src/shared'),
      '@background': resolve(__dirname, './src/background'),
      '@content': resolve(__dirname, './src/content'),
      '@pageController': resolve(__dirname, './src/page-controller'),
      '@pageHook': resolve(__dirname, './src/page-hook'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background': resolve(__dirname, 'src/background/index.ts'),
        'content': resolve(__dirname, 'src/content/index.ts'),
        'page-hook': resolve(__dirname, 'src/page-hook/index.ts'),
        'page-controller': resolve(__dirname, 'src/page-controller/index.ts'),
        'popup': resolve(__dirname, 'src/ui/popup.tsx'),
        'sidepanel': resolve(__dirname, 'src/ui/sidepanel.tsx'),
        'options': resolve(__dirname, 'src/ui/options.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // Vendor chunks for React UI only
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('@emotion')) {
              return 'emotion-vendor';
            }
          }
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('2.1.0'),
    __DEV__: JSON.stringify(false),
  },
});
