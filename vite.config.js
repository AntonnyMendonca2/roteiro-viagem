// Build de produção: junta os scripts do app num pacote só, minificado, com nome
// aleatório (hash) e SEM source maps — o código legível fica só no repositório.
// `npm run dev` serve a pasta como está (código legível) para desenvolver.
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// ads.txt (exigido pelo AdSense) vai para a raiz do dist/ sem passar pelo bundle.
const copiarAdsTxt = {
  name: 'copiar-ads-txt',
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'ads.txt', source: readFileSync('ads.txt', 'utf8') }); }
};

export default defineConfig({
  plugins: [copiarAdsTxt],
  base: './',                 // caminhos relativos: funciona em qualquer subpasta (GitHub Pages, Amplify)
  publicDir: false,           // nada é copiado sem passar pelo build (tests/, worker/, docs/ ficam de fora)
  build: {
    outDir: 'dist',
    sourcemap: false,         // sem o "mapa" de volta ao código original
    minify: true,
    cssMinify: true,
    assetsDir: 'assets',
    rollupOptions: {
      // páginas do site: o app e as páginas de texto (rodapé)
      input: { index: 'index.html', privacidade: 'privacidade.html', mantido: 'como-e-mantido.html' },
      output: { entryFileNames: 'assets/[hash].js', chunkFileNames: 'assets/[hash].js', assetFileNames: 'assets/[hash][extname]' } }
  }
});
