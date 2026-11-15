/* ==========================================================================
   wiki.js — consultas à Wikipedia/Wikimedia usadas por "Paisagens no caminho"
   (Feature 12) e "Descobrir por perto" (Feature 6).

   - geosearch: lugares próximos de uma coordenada (raio máx. 10 km), com foto,
     descrição e título em português;
   - acessos: popularidade (média de acessos por mês nos últimos 12 meses);
   - ehLugar / pontosCenicos: filtros puros (testados em tests/).
   Tudo sem chave, com origin=* e cache de 30 dias.
   ========================================================================== */
(function () {
  'use strict';

  const Net = window.Net;
  const Wiki = window.Wiki = {};
  const API = 'https://en.wikipedia.org/w/api.php';
  const TTL = 30 * Net.DIA;

  /* ============================================================ funções puras */
  // O geosearch devolve também artigos que NÃO são lugares (eventos, períodos, pessoas,
  // empresas...). Heurística por palavras e anos no título e na descrição.
  const TITULO_RUIM = /^(List of|Lists of|History of|Timeline of|Siege of|Battle of|Treaty of|Economy of|Transport in|Culture of|Demographics of|Geography of|Politics of|Education in|Sport in|Liberation of|Capture of|Occupation of|Bombing of|Coronation of|Death of|Murder of|Assassination of|Funeral of)\b/i;
  const DESC_RUIM = new RegExp('\\b(' + [
    'war', 'battle', 'siege', 'treaty', 'revolution(ary)?', 'empire', 'kingdom', 'dynasty', 'republic of \\d', 'period', 'era', 'regime', 'government',
    'election', 'riots?', 'uprising', 'insurrection', 'massacre', 'attacks?', 'bombing', 'shooting', 'disaster', 'crash', 'derailment', 'accident',
    'earthquake', 'flood', 'fire of', 'epidemic', 'protests?', 'strike', 'coup', 'conference', 'summit', 'exhibition of', "world's fair", 'expo \\d',
    'festival', 'championships?', 'tournament', 'season', 'olympics', 'games', 'race', 'marathon', 'event',
    'company', 'corporation', 'manufacturer', 'brand', 'retailer', 'airline', 'bank', 'newspaper', 'magazine', 'publisher', 'broadcaster', 'radio station', 'television',
    'band', 'album', 'song', 'film', 'novel', 'painting by', 'sculpture by', 'opera by', 'play by',
    'politician', 'footballer', 'singer', 'actor', 'actress', 'writer', 'painter', 'composer', 'architect \\(', 'physician', 'general', 'king of', 'queen of',
    'people', 'family', 'language', 'dialect', 'cuisine', 'dish', 'political party', 'organi[sz]ation', 'association', 'trade union', 'ministry', 'agency',
    'football club', 'sports club', 'basketball', 'rugby', 'handball', 'cycling team', 'military unit', 'regiment', 'administrative division', 'constituency',
    'electoral', 'suppression', 'repression', 'metro line', 'bus route', 'railway line', 'motorway', 'highway', 'road in'
  ].join('|') + ')\\b', 'i');
  const ANO = /\b(1[0-9]{3}|20[0-9]{2})\b/;

  Wiki.ehLugar = function (item) {
    const t = item.titulo || '', d = item.desc || '';
    if (TITULO_RUIM.test(t) || /\barrondissement\b/i.test(t)) return false;
    // divisões administrativas e bairros genéricos não são "atrações"
    if (/^(\d+(st|nd|rd|th) )?(arrondissement|quartier|quarter|district|commune|municipality|neighbou?rhood|suburb|borough|administrative|former commune|human settlement|subdivision)\b/i.test(d)) return false;
    if (ANO.test(t)) return false;                       // "Paris Commune of 1871", "2015 attacks"
    if (/^\d/.test(d) || /\(\d{3,4}\s*[–-]/.test(d) || /\b(of|in|from|until|since) (1[0-9]{3}|20[0-9]{2})\b/i.test(d) || /\d{4}\s*[–-]\s*\d{4}/.test(d)) return false;   // períodos e pessoas
    if (DESC_RUIM.test(d)) return false;
    if (/\b(disambiguation|Wikimedia)\b/i.test(d)) return false;
    return true;
  };

  // Palavras que indicam paisagem ou marco bonito visto da janela do trem.
  const CENICO = /\b(mountains?|peak|summit|alps?|massif|glacier|lake|reservoir|river|valley|gorge|canyon|waterfalls?|pass|fjord|coast|bay|island|cliffs?|volcano|forest|national park|nature reserve|vineyards?|castle|château|chateau|schloss|fortress|citadel|palace|viaduct|bridge|aqueduct|abbey|monastery|cathedral|basilica|sanctuary|old town|historic(al)? (cent(er|re)|town|city|village)|medieval|world heritage|unesco|ruins?|tower|lighthouse|windmills?)\b/i;
  const POUCO_CENICO = /\b(station|railway|airport|stadium|school|university|hospital|prison|cemetery|shopping|mall|power (station|plant)|factory|office|headquarters|hotel|commune|municipality|district|suburb|neighbou?rhood|village in|town in|city in|human settlement|street|square|avenue|metro|tram)\b/i;

  // Nota de 0 a 3 para "vale a pena olhar pela janela".
  Wiki.cenico = function (item) {
    const d = (item.desc || '') + ' ' + (item.titulo || '');
    let n = CENICO.test(d) ? 2 : 0;
    if (/\b(mountains?|lake|castle|château|viaduct|abbey|gorge|glacier|fjord|world heritage|unesco)\b/i.test(d)) n += 1;
    if (POUCO_CENICO.test(item.desc || '')) n -= (n < 3 ? 2 : 1);
    return Math.max(0, n);
  };

  // Nota prévia de "atração" (antes de saber a popularidade): foto, artigo em português
  // (sinal de lugar conhecido) e tipo de lugar pela descrição.
  const ATRACAO = /\b(museum|gallery|palace|castle|cathedral|basilica|church|abbey|chapel|mosque|synagogue|temple|park|garden|tower|bridge|square|plaza|monument|memorial|fountain|theat(re|er)|opera|market|library|fortress|ruins?|zoo|aquarium|viewpoint|landmark|arcade|passage|cemetery|island|beach|lake|hill)\b/i;
  Wiki.notaPrevia = i => (i.foto ? 2 : 0) + (i.pt ? 2 : 0) + (ATRACAO.test(i.desc || '') ? 1.5 : 0);

  /* ==================================================================== rede */
  const r4 = v => Math.round(v * 1e4) / 1e4;

  // Converte a resposta do generator=geosearch/search em itens enxutos.
  function itens(json) {
    const pages = (json && json.query && json.query.pages) || {};
    return Object.keys(pages).map(k => {
      const p = pages[k], c = p.coordinates && p.coordinates[0], pt = p.langlinks && p.langlinks[0];
      return {
        titulo: p.title, nome: (pt && pt['*']) || p.title, pt: !!pt, desc: p.description || '',
        foto: (p.thumbnail && p.thumbnail.source) || '', lat: c ? r4(c.lat) : null, lon: c ? r4(c.lon) : null, idx: p.index || 0
      };
    }).filter(i => i.lat != null);
  }

  const PROPS = '&prop=pageimages|description|coordinates|langlinks&lllang=pt&lllimit=max&piprop=thumbnail&pithumbsize=200&pilimit=max&colimit=max&format=json&origin=*';

  // Lugares próximos de (lat, lon). O raio máximo da API é 10 km.
  Wiki.geosearch = function (lat, lon, raio, limite, fila) {
    const la = lat.toFixed(3), lo = lon.toFixed(3), r = Math.min(10000, raio || 10000), n = limite || 50;
    const url = API + '?action=query&generator=geosearch&ggscoord=' + la + '|' + lo + '&ggsradius=' + r + '&ggslimit=' + n + PROPS;
    return Net.getJSON(url, { fila: fila || 'wiki', ttl: TTL, timeout: 12000, chave: 'geo:' + la + ',' + lo + ',' + r + ',' + n, reduzir: itens }).then(x => x.data);
  };

  // Busca por nome (para "Adicionar ponto pelo nome").
  Wiki.buscar = function (texto) {
    const url = API + '?action=query&generator=search&gsrsearch=' + encodeURIComponent(texto) + '&gsrlimit=10' + PROPS;
    return Net.getJSON(url, { fila: 'wiki', ttl: Net.DIA, chave: 'busca:' + texto.toLowerCase(), reduzir: j => itens(j).sort((a, b) => a.idx - b.idx) }).then(x => x.data);
  };

  // Média de acessos por mês (últimos 12 meses) de um artigo.
  Wiki.acessos = function (titulo, fila) {
    const d = new Date(), p2 = n => String(n).padStart(2, '0');
    const fim = d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + '0100';
    const ini = (d.getUTCFullYear() - 1) + p2(d.getUTCMonth() + 1) + '0100';
    const url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/' +
      encodeURIComponent(titulo.replace(/ /g, '_')) + '/monthly/' + ini + '/' + fim;
    return Net.getJSON(url, { fila: fila || 'views', ttl: TTL, timeout: 8000, chave: 'views:' + titulo, reduzir: j => {
      const it = (j && j.items) || [];
      return it.length ? Math.round(it.reduce((s, x) => s + (x.views || 0), 0) / it.length) : 0;
    } }).then(x => x.data).catch(() => 0);
  };

  // Acessos de vários artigos (a fila já limita a 4 por vez). Devolve os itens com .views.
  Wiki.comAcessos = function (lista, fila) {
    return Promise.all(lista.map(i => Wiki.acessos(i.titulo, fila).then(v => Object.assign({}, i, { views: v }))));
  };
})();
