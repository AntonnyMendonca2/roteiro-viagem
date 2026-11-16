// Build de produção: junta os scripts do app num pacote só, minificado, com nome
// aleatório (hash) e SEM source maps — o código legível fica só no repositório.
// `npm run dev` serve a pasta como está (código legível) para desenvolver.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',                 // caminhos relativos: funciona em qualquer subpasta (GitHub Pages, Amplify)
  publicDir: false,           // nada é copiado sem passar pelo build (tests/, worker/, docs/ ficam de fora)
  build: {
    outDir: 'dist',
    sourcemap: false,         // sem o "mapa" de volta ao código original
    minify: true,
    cssMinify: true,
    assetsDir: 'assets',
    rollupOptions: { output: { entryFileNames: 'assets/[hash].js', chunkFileNames: 'assets/[hash].js', assetFileNames: 'assets/[hash][extname]' } }
  }
});
