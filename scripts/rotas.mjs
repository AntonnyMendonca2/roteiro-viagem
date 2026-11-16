// Gera js/data-rotas.js: destinos diretos de cada aeroporto de saída (DATA.aeroportos),
// lidos da tabela "Airlines and destinations" da Wikipedia com o MESMO leitor do site (js/rotas.js).
//
//   npm run rotas
//
// Rode de tempos em tempos (ex.: no começo de cada temporada), confira a diferença no git e faça o commit.
// - Falha de rede num aeroporto: mantém o que já estava no arquivo para ele (e avisa).
// - Página sem a tabela (formato mudou): PARA com erro e não grava nada.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(raiz, 'js/data-rotas.js');
const API = 'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&page=';
const ESPERA_MS = 2500;   // a Wikipedia limita consultas seguidas

// Carrega os arquivos do site num "window" de mentira.
const ctx = { window: {}, console };
vm.createContext(ctx);
const carregar = arq => vm.runInContext(readFileSync(join(raiz, arq), 'utf8'), ctx, { filename: arq });
['js/data.js', 'js/data-europa.js'].forEach(carregar);
if (existsSync(SAIDA)) carregar('js/data-rotas.js');
carregar('js/rotas.js');
const D = ctx.window.DATA, Rotas = ctx.window.Rotas;
const anterior = (D.rotas && D.rotas.aeroportos) || {};

const espera = ms => new Promise(r => setTimeout(r, ms));
async function baixar(titulo) {
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const r = await fetch(API + encodeURIComponent(titulo), { headers: { 'User-Agent': 'roteiro-viagem/1.0 (planejador de viagem; script de rotas)' } });
      const txt = await r.text();
      if (r.ok && txt.charAt(0) === '{') {
        const j = JSON.parse(txt);
        if (j.error) throw new Error(j.error.info);
        return j.parse.wikitext;
      }
      throw new Error('HTTP ' + r.status + (txt.charAt(0) === '{' ? '' : ' (limite de consultas)'));
    } catch (e) {
      if (tentativa === 4) throw e;
      await espera(ESPERA_MS * tentativa * 2);
    }
  }
}

const out = {}, avisos = [];
for (const ap of D.aeroportos) {
  process.stdout.write(ap.iata + ' ');
  let texto;
  try { texto = await baixar(ap.wikiRotas); } catch (e) {
    avisos.push(ap.iata + ': sem conexão com a Wikipedia (' + e.message + ') — mantido o que já havia');
    if (anterior[ap.iata]) out[ap.iata] = anterior[ap.iata];
    console.log('✗ rede');
    await espera(ESPERA_MS);
    continue;
  }
  let destinos;
  try { destinos = Rotas.extrair(texto); } catch (e) {
    console.error('\n✘ ' + ap.iata + ' (' + ap.wikiRotas + '): ' + e.message + '. O formato da página mudou? Nada foi gravado.');
    process.exit(1);
  }
  out[ap.iata] = destinos;
  const ids = Object.keys(destinos);
  console.log('✓ ' + (ids.length ? ids.map(id => id + (destinos[id].sazonal ? '*' : '')).join(', ') : '(nenhuma cidade do app)'));
  await espera(ESPERA_MS);
}

const hoje = new Date().toISOString().slice(0, 10);
const linhas = Object.keys(out).sort().map(iata => '    ' + iata + ': ' + JSON.stringify(out[iata]));
const arquivo = `/* ==========================================================================
   data-rotas.js — destinos diretos de cada aeroporto de saída.
   GERADO por scripts/rotas.mjs (npm run rotas) em ${hoje}, a partir da tabela
   "Airlines and destinations" da Wikipedia. Não edite à mão: rode o script de novo.
   Formato: aeroportos[SIGLA][cidade] = { cias: [companhias], sazonal: true|false }
   O site atualiza em segundo plano o aeroporto escolhido (js/rotas.js).
   ========================================================================== */
window.DATA.rotas = {
  atualizado: '${hoje}',
  aeroportos: {
${linhas.join(',\n')}
  }
};
`;
writeFileSync(SAIDA, arquivo);
console.log('\nGravado js/data-rotas.js (' + Object.keys(out).length + ' aeroportos). * = sazonal');
if (avisos.length) { console.warn('Avisos:\n  ' + avisos.join('\n  ')); }
