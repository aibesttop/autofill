import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync, existsSync, readFileSync, cpSync, mkdirSync } from 'fs';

function copyPublicFiles() {
  const publicDir = resolve(__dirname, 'public');
  const distDir = resolve(__dirname, 'dist');

  // Ensure dist directory exists
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // Copy HTML files with script path replacement
  const htmlFiles = ['popup.html', 'sidepanel.html', 'options.html'];
  htmlFiles.forEach(file => {
    const srcPath = resolve(publicDir, file);
    const destPath = resolve(distDir, file);

    if (existsSync(srcPath)) {
      let content = readFileSync(srcPath, 'utf-8');

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

  // Copy manifest.json
  const manifestSrc = resolve(publicDir, 'manifest.json');
  const manifestDest = resolve(distDir, 'manifest.json');
  if (existsSync(manifestSrc)) {
    let manifest = readFileSync(manifestSrc, 'utf-8');
    // Fix content script path - Vite outputs to dist root, not content-scripts/
    const manifestObj = JSON.parse(manifest);
    if (manifestObj.content_scripts?.[0]?.js) {
      manifestObj.content_scripts[0].js = ['content.js'];
    }
    // Fix page-controller path in web_accessible_resources
    // background.js will inject 'page-controller.js' directly
    writeFileSync(manifestDest, JSON.stringify(manifestObj, null, 2));
  }

  // Copy _locales
  const localesDir = resolve(publicDir, '_locales');
  const localesDest = resolve(distDir, '_locales');
  if (existsSync(localesDir)) {
    cpSync(localesDir, localesDest, { recursive: true });
  }

  // Copy icons
  const iconsDir = resolve(publicDir, 'icons');
  const iconsDest = resolve(distDir, 'icons');
  if (existsSync(iconsDir)) {
    cpSync(iconsDir, iconsDest, { recursive: true });
  }
}

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
    {
      name: 'copy-extension-files',
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
      '@agent': resolve(__dirname, './src/agent'),
      '@lib': resolve(__dirname, './src/lib'),
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
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('@emotion')
            ) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
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
