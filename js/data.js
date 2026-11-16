/* ==========================================================================
   DADOS DA VIAGEM — edite este arquivo para mudar cidades, pontos e trechos.
   Tudo o que o app mostra vem do objeto DATA abaixo.

   Dica: depois de editar valores padrão aqui, use "Restaurar padrão" na aba
   "Dados" do app (o navegador guarda as suas escolhas no localStorage).
   ========================================================================== */

window.DATA = {

  /* ---------------------------------------------------------------- config */
  config: {
    dataSaida: '2027-03-02',          // data de saída do Brasil (AAAA-MM-DD)
    orcamento: 0,                     // orçamento total em R$ (0 = não definido)
    iof: false,                       // somar IOF em valores em moeda estrangeira
    iofPct: 3.5,                      // percentual do IOF
    spreadPct: 4,                     // spread padrão sobre a cotação comercial (cartão/casa de câmbio)
    noitesVooIda: 1,                  // noite passada em voo na ida (Brasil → Europa)
    escalaFotosKm: 5,                 // fotos dos pontos somem quando a escala do mapa chega a este valor (km)
    viajantes: 1,                     // nº de pessoas nas buscas de voos e hospedagem
    hospedagemPernoite: { v: 80, cur: 'EUR' }, // estimativa de 1 noite em parada de trem
    malaLowCost: { v: 35, cur: 'EUR' },        // mala de mão grande/despachada nas low-cost (por trecho de avião, por pessoa)
    // dia a dia: horários de cada tipo de dia e limites (veja js/diaadia.js)
    diaADia: { inicioH: 9, fimH: 19, chegadaH: 14, partidaH: 12, puxadoH: 10, bateVoltaLongoH: 4 },
    // links curtos (opcional): endereço do seu Cloudflare Worker (worker/roteiro.js; veja "Links curtos" no README).
    // Vazio = o roteiro vai inteiro dentro do link.
    linkCurtoUrl: 'https://fancy-tooth-7972.antonnymendonca.workers.dev',
    // CAPTCHA (Cloudflare Turnstile) ao gerar link curto e link de edição: a CHAVE DO SITE (pública).
    // A chave secreta fica só no Worker (TURNSTILE_SECRET). Vazio = não pede CAPTCHA.
    turnstileSiteKey: '0x4AAAAAAGEEL0lTUSCwfBiI',

    // privacidade e transparência (páginas privacidade.html e como-e-mantido.html, js/consent.js)
    responsavel: { nome: 'Antonny Mendonça', email: 'antonnymendonca@gmail.com' },   // contato para pedidos de privacidade (LGPD)
    linkCurtoValidadeDias: 5,         // mantenha igual ao TTL_DIAS do Worker (aparece na página Privacidade)
    adsenseCliente: '',               // Google AdSense, ex.: 'ca-pub-1234567890123456' (vazio = sem anúncios)
    avisoParceiros: true              // linha "Buscas em sites parceiros" perto dos botões de busca
  },

  /* ------------------------------------------------------ moedas e câmbio */
  moedas: ['BRL', 'EUR', 'GBP', 'PLN', 'CHF', 'HUF'],
  simbolos: { BRL: 'R$', EUR: '€', GBP: '£', PLN: 'zł', CHF: 'CHF', HUF: 'Ft' },
  cambio: { EUR: 6.20, GBP: 7.40, PLN: 1.45, CHF: 6.60, HUF: 0.016 },   // 1 unidade = X reais

  /* ------------------------------------------- fuso horário por país (código ISO numérico)
     Usado para mostrar o nascer e o pôr do sol na hora local, mesmo sem internet. */
  fusos: {
    826: 'Europe/London', 250: 'Europe/Paris', 616: 'Europe/Warsaw', 276: 'Europe/Berlin', 620: 'Europe/Lisbon',
    756: 'Europe/Zurich', 40: 'Europe/Vienna', 703: 'Europe/Bratislava', 348: 'Europe/Budapest', 380: 'Europe/Rome',
    300: 'Europe/Athens', 724: 'Europe/Madrid', 372: 'Europe/Dublin', 528: 'Europe/Amsterdam', 56: 'Europe/Brussels',
    442: 'Europe/Luxembourg', 203: 'Europe/Prague', 208: 'Europe/Copenhagen', 752: 'Europe/Stockholm', 578: 'Europe/Oslo',
    246: 'Europe/Helsinki', 352: 'Atlantic/Reykjavik', 233: 'Europe/Tallinn', 428: 'Europe/Riga', 440: 'Europe/Vilnius',
    705: 'Europe/Ljubljana', 191: 'Europe/Zagreb', 70: 'Europe/Sarajevo', 688: 'Europe/Belgrade', 499: 'Europe/Podgorica',
    8: 'Europe/Tirane', 807: 'Europe/Skopje', 383: 'Europe/Belgrade', 100: 'Europe/Sofia', 642: 'Europe/Bucharest',
    498: 'Europe/Chisinau', 470: 'Europe/Malta', 196: 'Asia/Nicosia', 792: 'Europe/Istanbul', 492: 'Europe/Monaco',
    438: 'Europe/Vaduz', 674: 'Europe/San_Marino', 20: 'Europe/Andorra', 336: 'Europe/Vatican'
  },

  /* ------------------------------------------------------------------ tags */
  tags: ['Harry Potter', 'Compras', 'Museu', 'Bate-volta', 'Futebol', 'Música'],

  /* ------------------------------------- gastos por cidade (campos do painel) */
  categorias: [
    { id: 'hospedagem',      nome: 'Hospedagem (total)' },
    { id: 'alimentacao',     nome: 'Alimentação' },
    { id: 'transporteLocal', nome: 'Transporte local' },
    { id: 'compras',         nome: 'Compras' },
    { id: 'outros',          nome: 'Outros' }
  ],

  /* --------------------------------------------------------- itens gerais */
  gerais: [
    { id: 'voo',    nome: 'Voo internacional', v: '',   cur: 'BRL' },
    { id: 'seguro', nome: 'Seguro viagem',     v: '',   cur: 'BRL' },
    { id: 'eta',    nome: 'ETA Reino Unido',   v: '',   cur: 'GBP' },
    { id: 'chip',   nome: 'Chip/internet',     v: '',   cur: 'BRL' },
    { id: 'roupas', nome: 'Roupas de frio',    v: '',   cur: 'BRL' }
  ],

  /* ------------------------------- estimativa para pares de cidades não listados */
  estimativa: {
    aviaoKmh: 700,         // avião = distância / 700 km/h ...
    aviaoExtraH: 3,        // ... + 3 h de aeroporto (vale também para os voos da tabela)
    aviaoEur: [50, 130]    // faixa genérica de voo low-cost
    // por terra não há estimativa "em linha reta": o app usa a rede de trechos da tabela
  },

  /* ------------------------------------------------------- aeroportos de saída
     O usuário escolhe em "Saindo de" (Meu roteiro); padrão: Campinas (VCP).
     wikiRotas: página do aeroporto na Wikipedia (em inglês) de onde saem os destinos diretos
     (js/rotas.js; cópia em js/data-rotas.js, gerada por `npm run rotas`).
     No app, o aeroporto de saída é o ponto 'vcp' da rota (chave interna mantida por compatibilidade). */
  origemPadrao: 'VCP',
  aeroportos: [
    { iata: 'BEL', cidade: 'Belém',          nome: 'Val-de-Cans',     lat: -1.3792,  lon: -48.4763, wikiRotas: 'Belém/Val-de-Cans International Airport' },
    { iata: 'CNF', cidade: 'Belo Horizonte', nome: 'Confins',         lat: -19.6244, lon: -43.9719, wikiRotas: 'Belo Horizonte International Airport' },
    { iata: 'BSB', cidade: 'Brasília',       nome: 'Juscelino Kubitschek', lat: -15.8711, lon: -47.9186, wikiRotas: 'Brasília International Airport' },
    { iata: 'VCP', cidade: 'Campinas',       nome: 'Viracopos',       lat: -23.0074, lon: -47.1345, wikiRotas: 'Viracopos International Airport' },
    { iata: 'FLN', cidade: 'Florianópolis',  nome: 'Hercílio Luz',    lat: -27.6703, lon: -48.5525, wikiRotas: 'Hercílio Luz International Airport' },
    { iata: 'FOR', cidade: 'Fortaleza',      nome: 'Pinto Martins',   lat: -3.7763,  lon: -38.5326, wikiRotas: 'Fortaleza Airport' },
    { iata: 'MAO', cidade: 'Manaus',         nome: 'Eduardo Gomes',   lat: -3.0386,  lon: -60.0497, wikiRotas: 'Eduardo Gomes International Airport' },
    { iata: 'NAT', cidade: 'Natal',          nome: 'São Gonçalo do Amarante', lat: -5.7681, lon: -35.3761, wikiRotas: 'Greater Natal International Airport' },
    { iata: 'POA', cidade: 'Porto Alegre',   nome: 'Salgado Filho',   lat: -29.9939, lon: -51.1714, wikiRotas: 'Salgado Filho Porto Alegre International Airport' },
    { iata: 'REC', cidade: 'Recife',         nome: 'Guararapes',      lat: -8.1265,  lon: -34.9236, wikiRotas: 'Recife/Guararapes–Gilberto Freyre International Airport' },
    { iata: 'GIG', cidade: 'Rio de Janeiro', nome: 'Galeão',          lat: -22.8100, lon: -43.2506, wikiRotas: 'Rio de Janeiro/Galeão International Airport' },
    { iata: 'SSA', cidade: 'Salvador',       nome: 'Luís Eduardo Magalhães', lat: -12.9086, lon: -38.3225, wikiRotas: 'Salvador Bahia Airport' },
    { iata: 'GRU', cidade: 'São Paulo',      nome: 'Guarulhos',       lat: -23.4356, lon: -46.4731, wikiRotas: 'São Paulo/Guarulhos International Airport' }
  ],

  /* Voo internacional (Brasil ⇄ Europa): a duração é ESTIMADA pela distância — nenhuma fonte grátis
     informa o tempo de voo. Direto = destino listado nas rotas do aeroporto; senão, com conexão no
     destino direto (hub) que der o menor caminho total. Volta: um pouco mais longa (vento contra). */
  voosIntl: {
    kmh: 830,            // velocidade média de cruzeiro
    extraH: 0.6,         // decolagem, pouso e taxiamento (por voo)
    desvio: 1.04,        // a rota real é um pouco mais longa que a linha reta
    conexaoH: 3,         // espera média na conexão
    voltaH: 0.5,         // a volta para o Brasil leva um pouco mais
    faixaH: 0.5          // a faixa mostrada é a estimativa ± este valor
  },

  /* ---------------------------------------------------------------- cidades
     rotulo: posição do nome no mapa (n, s, e, w) · paisIso: código ISO numérico
     iata: código da cidade/aeroporto (buscas de voo) · hostelworld: país/cidade no site do Hostelworld
     estacao: estação principal (traçado real dos trens) · diariaHospedagem / diariaGastos: estimativa por
     noite e por dia, na moeda local (usadas pelo assistente "o que cabe?")
     As demais cidades da Europa ficam em js/data-europa.js. */
  cities: [
    { id: 'londres',    nome: 'Londres',    pais: 'Reino Unido', paisIso: 826, lat: 51.5074, lon: -0.1278, moeda: 'GBP', wiki: 'London', iata: 'LON', hostelworld: 'england/london',     estacao: { nome: 'London St Pancras', lat: 51.5308, lon: -0.126 }, diariaHospedagem: 45, diariaGastos: 40, selecionada: false,  noites: 3, ordem: 1, rotulo: 'w',
      nota: 'O Reino Unido não devolve imposto (tax free) para turistas. Brasileiros precisam da ETA para entrar.' },
    { id: 'paris',      nome: 'Paris',      pais: 'França',      paisIso: 250, lat: 48.8566, lon: 2.3522,  moeda: 'EUR', wiki: 'Paris', iata: 'PAR', hostelworld: 'france/paris',      estacao: { nome: 'Paris Gare du Nord', lat: 48.8809, lon: 2.3553 }, diariaHospedagem: 50, diariaGastos: 45, selecionada: false,  noites: 4, ordem: 2, rotulo: 'w',
      nota: 'Devolução de imposto (détaxe) de ~10–12% em compras acima de €100 na mesma loja e no mesmo dia.' },
    { id: 'cracovia',   nome: 'Cracóvia',   pais: 'Polônia',     paisIso: 616, lat: 50.0647, lon: 19.9450, moeda: 'PLN', wiki: 'Kraków', iata: 'KRK', hostelworld: 'poland/krakow',     estacao: { nome: 'Kraków Główny', lat: 50.0677, lon: 19.9477 }, diariaHospedagem: 110, diariaGastos: 140, selecionada: false,  noites: 3, ordem: 3, rotulo: 'e' },
    { id: 'berlim',     nome: 'Berlim',     pais: 'Alemanha',    paisIso: 276, lat: 52.5200, lon: 13.4050, moeda: 'EUR', wiki: 'Berlin', iata: 'BER', hostelworld: 'germany/berlin',     estacao: { nome: 'Berlin Hbf', lat: 52.5251, lon: 13.3694 }, diariaHospedagem: 40, diariaGastos: 40, selecionada: false, noites: 2, rotulo: 'n',
      papel: 'Parada do trem Paris → Cracóvia' },
    { id: 'munique',    nome: 'Munique',    pais: 'Alemanha',    paisIso: 276, lat: 48.1351, lon: 11.5820, moeda: 'EUR', wiki: 'Munich', iata: 'MUC', hostelworld: 'germany/munich',     estacao: { nome: 'München Hbf', lat: 48.1402, lon: 11.5586 }, diariaHospedagem: 45, diariaGastos: 45, selecionada: false, noites: 2, rotulo: 'n' },
    { id: 'lisboa',     nome: 'Lisboa',     pais: 'Portugal',    paisIso: 620, lat: 38.7223, lon: -9.1393, moeda: 'EUR', wiki: 'Lisbon', iata: 'LIS', hostelworld: 'portugal/lisbon',     estacao: { nome: 'Lisboa Santa Apolónia', lat: 38.7139, lon: -9.1226 }, diariaHospedagem: 35, diariaGastos: 35, selecionada: false, noites: 1, rotulo: 'e',
      papel: 'Conexão aérea' },
    { id: 'zurique',    nome: 'Zurique',    pais: 'Suíça',       paisIso: 756, lat: 47.3769, lon: 8.5417,  moeda: 'CHF', wiki: 'Zurich', iata: 'ZRH', hostelworld: 'switzerland/zurich',     estacao: { nome: 'Zürich HB', lat: 47.3782, lon: 8.5403 }, diariaHospedagem: 60, diariaGastos: 70, selecionada: false, noites: 2, rotulo: 'w' },
    { id: 'viena',      nome: 'Viena',      pais: 'Áustria',     paisIso: 40,  lat: 48.2082, lon: 16.3738, moeda: 'EUR', wiki: 'Vienna', iata: 'VIE', hostelworld: 'austria/vienna',     estacao: { nome: 'Wien Hbf', lat: 48.1853, lon: 16.3765 }, diariaHospedagem: 40, diariaGastos: 40, selecionada: false, noites: 2, rotulo: 'w' },
    { id: 'bratislava', nome: 'Bratislava', pais: 'Eslováquia',  paisIso: 703, lat: 48.1486, lon: 17.1077, moeda: 'EUR', wiki: 'Bratislava', iata: 'BTS', hostelworld: 'slovakia/bratislava', estacao: { nome: 'Bratislava hlavná stanica', lat: 48.1589, lon: 17.1067 }, diariaHospedagem: 30, diariaGastos: 30, selecionada: false, noites: 1, rotulo: 'e' },
    { id: 'budapeste',  nome: 'Budapeste',  pais: 'Hungria',     paisIso: 348, lat: 47.4979, lon: 19.0402, moeda: 'HUF', wiki: 'Budapest', iata: 'BUD', hostelworld: 'hungary/budapest',   estacao: { nome: 'Budapest Keleti', lat: 47.5003, lon: 19.0839 }, diariaHospedagem: 9000, diariaGastos: 11000, selecionada: false, noites: 2, rotulo: 'e' },
    { id: 'roma',       nome: 'Roma',       pais: 'Itália',      paisIso: 380, lat: 41.9028, lon: 12.4964, moeda: 'EUR', wiki: 'Rome', iata: 'ROM', hostelworld: 'italy/rome',       estacao: { nome: 'Roma Termini', lat: 41.9009, lon: 12.5019 }, diariaHospedagem: 45, diariaGastos: 40, selecionada: false, noites: 3, rotulo: 'e' },
    { id: 'atenas',     nome: 'Atenas',     pais: 'Grécia',      paisIso: 300, lat: 37.9838, lon: 23.7275, moeda: 'EUR', wiki: 'Athens', iata: 'ATH', hostelworld: 'greece/athens',     estacao: { nome: 'Atenas (Larissa)', lat: 37.9925, lon: 23.7208 }, diariaHospedagem: 30, diariaGastos: 35, selecionada: false, noites: 2, rotulo: 'e' }
  ],

  /* ------------------------------------------------------ pontos de interesse
     preco: { v: valor numérico usado no orçamento, cur: moeda, label: texto exibido }
     bateVolta: { desc: como chegar, custo: transporte ida e volta (editável no app) }
     fechado: dias da semana em que fecha (0 = domingo ... 6 = sábado)
     duracaoH: tempo de visita em horas (bate-voltas já incluem o deslocamento)
     horario: { abre, fecha } (opcional) · arLivre: atividade ao ar livre (aviso de pôr do sol)
     wiki: título da página na Wikipedia em inglês, usado só para buscar a foto.
           Alguns usam uma página vizinha porque a página principal devolve um
           logotipo ou mapa (ex.: Torre Eiffel → Champ_de_Mars).                 */
  pois: [
    /* ===== LONDRES ===== */
    { id: 'british-museum', cityId: 'londres', nome: 'British Museum', lat: 51.5194, lon: -0.1270, duracaoH: 2.5, horario: { abre: '10:00', fecha: '17:00' },
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'British_Museum', site: 'https://www.britishmuseum.org',
      tags: ['Museu'], selecionado: false,
      desc: 'Um dos maiores museus do mundo, com a Pedra de Roseta, múmias egípcias e as esculturas do Partenon. Dá para ver os destaques em 2–3 horas.' },
    { id: 'natural-history', cityId: 'londres', nome: 'Natural History Museum', lat: 51.4967, lon: -0.1764, duracaoH: 2, horario: { abre: '10:00', fecha: '17:50' },
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Hope_(whale)', site: 'https://www.nhm.ac.uk',
      tags: ['Museu'], selecionado: false,
      desc: 'Museu de história natural em um prédio vitoriano espetacular. O esqueleto de baleia-azul no saguão e a ala dos dinossauros são os pontos altos.' },
    { id: 'national-gallery', cityId: 'londres', nome: 'National Gallery', lat: 51.5089, lon: -0.1283, duracaoH: 1.5, horario: { abre: '10:00', fecha: '18:00' },
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'National_Gallery', site: 'https://www.nationalgallery.org.uk',
      tags: ['Museu'], selecionado: false,
      desc: 'Pinacoteca na Trafalgar Square com obras de Van Gogh, Da Vinci, Monet e Turner. Fácil de encaixar entre um passeio e outro pelo centro.' },
    { id: 'tate-modern', cityId: 'londres', nome: 'Tate Modern', lat: 51.5076, lon: -0.0994, duracaoH: 1.5, horario: { abre: '10:00', fecha: '18:00' },
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Tate_Modern', site: 'https://www.tate.org.uk/visit/tate-modern',
      tags: ['Museu'], selecionado: false,
      desc: 'Museu de arte moderna numa antiga usina de energia à beira do Tâmisa. O mirante e o enorme Turbine Hall valem a visita mesmo sem tempo.' },
    { id: 'tower-of-london', cityId: 'londres', nome: 'Torre de Londres', lat: 51.5081, lon: -0.0759, duracaoH: 2.5, horario: { abre: '09:00', fecha: '16:30' },
      preco: { v: 35, cur: 'GBP', label: '~£35' }, wiki: 'Tower_of_London', site: 'https://www.hrp.org.uk/tower-of-london/',
      tags: [], selecionado: false,
      desc: 'Fortaleza medieval com quase mil anos, que já foi palácio, prisão e casa da moeda. Guarda as Joias da Coroa e tem visitas guiadas pelos Beefeaters.' },
    { id: 'tower-bridge', cityId: 'londres', nome: 'Tower Bridge', lat: 51.5055, lon: -0.0754, duracaoH: 0.5, arLivre: true,
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Tower_Bridge', site: 'https://www.towerbridge.org.uk',
      tags: [], selecionado: false,
      desc: 'A ponte mais famosa de Londres, ao lado da Torre. Atravessar a pé é grátis; a passarela de vidro no alto é paga à parte.' },
    { id: 'big-ben', cityId: 'londres', nome: 'Big Ben e Parlamento', lat: 51.5007, lon: -0.1246, duracaoH: 0.5, arLivre: true,
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Big_Ben', site: 'https://www.parliament.uk/visiting/',
      tags: [], selecionado: false,
      desc: 'A torre do relógio e o Palácio de Westminster, cartão-postal da cidade. A melhor vista é da ponte de Westminster, de preferência no fim da tarde.' },
    { id: 'westminster-abbey', cityId: 'londres', nome: 'Abadia de Westminster', lat: 51.4993, lon: -0.1273, duracaoH: 1.5, horario: { abre: '09:30', fecha: '15:30' },
      preco: { v: 30, cur: 'GBP', label: '~£30' }, wiki: 'Westminster_Abbey', site: 'https://www.westminster-abbey.org',
      tags: [], selecionado: false,
      desc: 'Igreja gótica das coroações e casamentos reais, com túmulos de reis, Newton e Darwin. Fica a poucos passos do Big Ben.' },
    { id: 'buckingham', cityId: 'londres', nome: 'Palácio de Buckingham (troca da guarda)', lat: 51.5014, lon: -0.1419, duracaoH: 1, arLivre: true,
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Buckingham_Palace', site: 'https://www.rct.uk/visit/buckingham-palace',
      tags: [], selecionado: false, avisos: ['A troca da guarda não acontece todos os dias — confira o calendário e chegue cedo.'],
      desc: 'Residência oficial do rei. A troca da guarda acontece no pátio da frente, por volta das 11h, e é gratuita.' },
    { id: 'london-eye', cityId: 'londres', nome: 'London Eye', lat: 51.5033, lon: -0.1196, duracaoH: 1, horario: { abre: '11:00', fecha: '18:00' },
      preco: { v: 35, cur: 'GBP', label: '~£30–40' }, wiki: 'London_Eye', site: 'https://www.londoneye.com',
      tags: [], selecionado: false,
      desc: 'Roda-gigante de 135 m à beira do Tâmisa, com volta de cerca de 30 minutos e vista para o Parlamento. Mais barato comprando online com antecedência.' },
    { id: 'sky-garden', cityId: 'londres', nome: 'Sky Garden (reservar)', lat: 51.5113, lon: -0.0835, duracaoH: 1, horario: { abre: '10:00', fecha: '18:00' },
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Fenchurch_Street', site: 'https://skygarden.london',
      tags: [], selecionado: false, avisos: ['Entrada grátis, mas é preciso reservar horário no site com antecedência.'],
      desc: 'Jardim com mirante no topo do prédio "Walkie-Talkie". É a alternativa gratuita aos mirantes pagos, com vista de 360° da cidade.' },
    { id: 'plataforma-9-34', cityId: 'londres', nome: 'Plataforma 9¾ (King\'s Cross)', lat: 51.5320, lon: -0.1233, duracaoH: 0.5,
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'London_King\'s_Cross_railway_station', site: 'https://www.harrypotterplatform934.com',
      tags: ['Harry Potter'], selecionado: false,
      desc: 'O carrinho atravessando a parede na estação de King\'s Cross, com loja oficial ao lado. A foto é grátis; a fila costuma ser menor cedo ou à noite.' },
    { id: 'leadenhall', cityId: 'londres', nome: 'Leadenhall Market (Beco Diagonal)', lat: 51.5128, lon: -0.0834, duracaoH: 0.5,
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Leadenhall_Market', site: 'https://leadenhallmarket.co.uk',
      tags: ['Harry Potter'], selecionado: false,
      desc: 'Mercado vitoriano coberto que serviu de cenário para o Beco Diagonal no primeiro filme. Fica ao lado do Sky Garden.' },
    { id: 'millennium-bridge', cityId: 'londres', nome: 'Millennium Bridge', lat: 51.5095, lon: -0.0985, duracaoH: 0.3, arLivre: true,
      preco: { v: 0, cur: 'GBP', label: 'Grátis' }, wiki: 'Millennium_Bridge,_London', site: '',
      tags: ['Harry Potter'], selecionado: false,
      desc: 'Ponte de pedestres entre a Catedral de St Paul e a Tate Modern — a que os Comensais da Morte destroem em "O Enigma do Príncipe".' },
    { id: 'wb-studio-tour', cityId: 'londres', nome: 'Warner Bros. Studio Tour – Harry Potter', lat: 51.6903, lon: -0.4183, duracaoH: 6.5, horario: { abre: '09:30', fecha: '20:00' },
      preco: { v: 57, cur: 'GBP', label: '~£57' }, wiki: 'Warner_Bros._Studio_Tour_London_–_The_Making_of_Harry_Potter', site: 'https://www.wbstudiotour.co.uk',
      tags: ['Harry Potter', 'Bate-volta'], selecionado: false, avisos: ['Ingressos esgotam com meses de antecedência — compre no site oficial.'],
      bateVolta: { desc: 'Trem Euston → Watford Junction (~20 min) + ônibus do estúdio (~15 min)', custo: { v: 20, cur: 'GBP' } },
      desc: 'Os estúdios onde os filmes foram gravados: Salão Principal, Beco Diagonal, Expresso de Hogwarts e a maquete do castelo. Reserve de 3 a 4 horas.' },
    { id: 'borough-market', cityId: 'londres', nome: 'Borough Market', lat: 51.5055, lon: -0.0910, duracaoH: 1, horario: { abre: '10:00', fecha: '17:00' },
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Borough_Market', site: 'https://boroughmarket.org.uk',
      tags: [], selecionado: false,
      desc: 'Mercado gastronômico mais tradicional de Londres, ótimo para almoçar comida de rua. Fica perto da London Bridge e da Tate Modern.' },
    { id: 'camden-market', cityId: 'londres', nome: 'Camden Market', lat: 51.5413, lon: -0.1466, duracaoH: 1.5, horario: { abre: '10:00', fecha: '18:00' },
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Camden_Market', site: 'https://www.camdenmarket.com',
      tags: ['Compras'], selecionado: false,
      desc: 'Conjunto de mercados alternativos à beira do canal, com roupas, vinis, artesanato e muita comida de rua.' },
    { id: 'brick-lane', cityId: 'londres', nome: 'Brick Lane (brechós)', lat: 51.5216, lon: -0.0717, duracaoH: 1, arLivre: true,
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Brick_Lane', site: '',
      tags: ['Compras'], selecionado: false,
      desc: 'Rua do leste de Londres famosa pelos brechós, arte de rua e bagels. Aos domingos tem feira e fica bem mais movimentada.' },
    { id: 'oxford-street', cityId: 'londres', nome: 'Oxford Street (Primark, Uniqlo, Decathlon, Selfridges)', lat: 51.5154, lon: -0.1419, duracaoH: 1.5,
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Oxford_Street', site: 'https://www.oxfordstreet.co.uk',
      tags: ['Compras'], selecionado: false,
      desc: 'Principal rua de compras de Londres. Boa parada para roupa de frio barata (Primark, Uniqlo, Decathlon) logo na chegada.' },
    { id: 'regent-street', cityId: 'londres', nome: 'Regent Street (Hamleys, Liberty)', lat: 51.5107, lon: -0.1376, duracaoH: 1,
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Regent_Street', site: 'https://www.regentstreetonline.com',
      tags: ['Compras'], selecionado: false,
      desc: 'Avenida elegante em curva, com a loja de brinquedos Hamleys e a tradicional Liberty logo ao lado.' },
    { id: 'carnaby-street', cityId: 'londres', nome: 'Carnaby Street', lat: 51.5131, lon: -0.1390, duracaoH: 0.5,
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Carnaby_Street', site: 'https://www.carnaby.co.uk',
      tags: ['Compras'], selecionado: false,
      desc: 'Rua de pedestres no Soho, berço da moda dos anos 60, hoje cheia de marcas independentes e restaurantes.' },
    { id: 'covent-garden', cityId: 'londres', nome: 'Covent Garden', lat: 51.5117, lon: -0.1240, duracaoH: 1,
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Covent_Garden', site: 'https://www.coventgarden.london',
      tags: ['Compras'], selecionado: false,
      desc: 'Antigo mercado coberto com lojas, cafés e artistas de rua. Um dos cantos mais agradáveis para passear no centro.' },
    { id: 'westfield-stratford', cityId: 'londres', nome: 'Westfield Stratford', lat: 51.5432, lon: -0.0063, duracaoH: 2,
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Westfield_Stratford_City', site: 'https://uk.westfield.com/stratfordcity',
      tags: ['Compras'], selecionado: false,
      desc: 'Um dos maiores shoppings da Europa, ao lado do Parque Olímpico. Reúne praticamente todas as grandes redes num lugar só.' },
    { id: 'burberry-outlet', cityId: 'londres', nome: 'Burberry Outlet (Hackney)', lat: 51.5466, lon: -0.0556, duracaoH: 1,
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Burberry', site: '',
      tags: ['Compras'], selecionado: false,
      desc: 'Outlet oficial da Burberry em Hackney, com peças de coleções passadas com desconto. Há outros outlets de grife na mesma rua.' },
    { id: 'bicester-village', cityId: 'londres', nome: 'Bicester Village (outlet)', lat: 51.8920, lon: -1.1564, duracaoH: 6, horario: { abre: '09:00', fecha: '20:00' },
      preco: { v: 0, cur: 'GBP', label: 'Entrada livre' }, wiki: 'Bicester_Village', site: 'https://www.thebicestercollection.com/bicester-village/',
      tags: ['Compras', 'Bate-volta'], selecionado: false,
      bateVolta: { desc: 'Trem de London Marylebone até Bicester Village (~1h)', custo: { v: 30, cur: 'GBP' } },
      desc: 'Outlet de luxo a céu aberto, com mais de 150 marcas. O trem deixa na porta, então dá para ir e voltar no mesmo dia com folga.' },
    { id: 'emirates-stadium', cityId: 'londres', nome: 'Emirates Stadium (Arsenal, tour)', lat: 51.5549, lon: -0.1084, duracaoH: 2, horario: { abre: '10:00', fecha: '17:00' },
      preco: { v: 30, cur: 'GBP', label: '~£30' }, wiki: 'Emirates_Stadium', site: 'https://www.arsenal.com/tours',
      tags: ['Futebol'], selecionado: false,
      desc: 'Tour pelo estádio do Arsenal: vestiários, túnel de acesso, beira do gramado e museu do clube.' },
    { id: 'stamford-bridge', cityId: 'londres', nome: 'Stamford Bridge (Chelsea, tour)', lat: 51.4817, lon: -0.1910, duracaoH: 2, horario: { abre: '10:00', fecha: '16:00' },
      preco: { v: 30, cur: 'GBP', label: '~£30' }, wiki: 'Stamford_Bridge_(stadium)', site: 'https://www.chelseafc.com/en/stadium-tours-and-museum',
      tags: ['Futebol'], selecionado: false,
      desc: 'Tour pelo estádio do Chelsea, com vestiários, sala de imprensa e museu. Fica no oeste da cidade, perto do Natural History Museum.' },

    /* ===== PARIS ===== */
    { id: 'torre-eiffel', cityId: 'paris', nome: 'Torre Eiffel (topo)', lat: 48.8584, lon: 2.2945, duracaoH: 2, horario: { abre: '09:30', fecha: '23:00' },
      preco: { v: 36, cur: 'EUR', label: '~€36' }, wiki: 'Champ_de_Mars', site: 'https://www.toureiffel.paris',
      tags: [], selecionado: false, avisos: ['Compre o ingresso do topo no site oficial com antecedência.'],
      desc: 'O símbolo de Paris. O ingresso até o topo sobe de elevador a 276 m; à noite a torre pisca nos primeiros minutos de cada hora.' },
    { id: 'louvre', cityId: 'paris', nome: 'Louvre', lat: 48.8606, lon: 2.3376, duracaoH: 3, horario: { abre: '09:00', fecha: '18:00' },
      preco: { v: 32, cur: 'EUR', label: '€32' }, wiki: 'Louvre', site: 'https://www.ticketlouvre.fr',
      tags: ['Museu'], selecionado: false, avisos: ['Fechado às terças.'], fechado: [2],
      desc: 'O museu mais visitado do mundo, casa da Mona Lisa, da Vênus de Milo e da Vitória de Samotrácia. Reserve horário online e escolha as alas antes de ir.' },
    { id: 'notre-dame', cityId: 'paris', nome: 'Notre-Dame', lat: 48.8530, lon: 2.3499, duracaoH: 1,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'Notre-Dame_de_Paris', site: 'https://www.notredamedeparis.fr',
      tags: [], selecionado: false,
      desc: 'Catedral gótica reaberta no fim de 2024, depois da restauração do incêndio. A entrada é gratuita; reservar horário ajuda a evitar fila.' },
    { id: 'montmartre', cityId: 'paris', nome: 'Montmartre / Sacré-Cœur', lat: 48.8867, lon: 2.3431, duracaoH: 2, arLivre: true,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'Sacré-Cœur,_Paris', site: 'https://www.sacre-coeur-montmartre.com',
      tags: [], selecionado: false,
      desc: 'Bairro boêmio no alto da colina, com a basílica branca e uma das melhores vistas de Paris. Vale se perder pelas ruelas e pela Place du Tertre.' },
    { id: 'arco-do-triunfo', cityId: 'paris', nome: 'Arco do Triunfo (terraço)', lat: 48.8738, lon: 2.2950, duracaoH: 1, horario: { abre: '10:00', fecha: '22:30' },
      preco: { v: 22, cur: 'EUR', label: '~€22' }, wiki: 'Arc_de_Triomphe', site: 'https://www.paris-arc-de-triomphe.fr',
      tags: [], selecionado: false,
      desc: 'Monumento no alto da Champs-Élysées. Do terraço se vê a Torre Eiffel e as doze avenidas que saem da praça em estrela.' },
    { id: 'champs-elysees', cityId: 'paris', nome: 'Champs-Élysées', lat: 48.8698, lon: 2.3075, duracaoH: 1, arLivre: true,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'Champs-Élysées', site: '',
      tags: [], selecionado: false,
      desc: 'A avenida mais famosa de Paris, do Arco do Triunfo à Place de la Concorde, com lojas, cafés e cinemas.' },
    { id: 'orsay', cityId: 'paris', nome: 'Museu d\'Orsay', lat: 48.8600, lon: 2.3266, duracaoH: 2, horario: { abre: '09:30', fecha: '18:00' },
      preco: { v: 16, cur: 'EUR', label: '~€16' }, wiki: 'Gare_d\'Orsay', site: 'https://www.musee-orsay.fr',
      tags: ['Museu'], selecionado: false,
      desc: 'Antiga estação de trem transformada em museu, com a maior coleção de impressionistas do mundo: Monet, Van Gogh, Renoir e Degas.' },
    { id: 'sainte-chapelle', cityId: 'paris', nome: 'Sainte-Chapelle', lat: 48.8554, lon: 2.3450, duracaoH: 0.75, horario: { abre: '09:00', fecha: '17:00' },
      preco: { v: 20, cur: 'EUR', label: '~€20' }, wiki: 'Sainte-Chapelle', site: 'https://www.sainte-chapelle.fr',
      tags: [], selecionado: false,
      desc: 'Capela gótica do século XIII com 15 vitrais gigantes. Em dia de sol o interior fica todo colorido. Fica a 5 minutos da Notre-Dame.' },
    { id: 'barco-sena', cityId: 'paris', nome: 'Passeio de barco no Sena', lat: 48.8610, lon: 2.3080, duracaoH: 1.25, arLivre: true,
      preco: { v: 17, cur: 'EUR', label: '~€17' }, wiki: 'Seine', site: '',
      tags: [], selecionado: false,
      desc: 'Cruzeiro de cerca de uma hora passando pela Torre Eiffel, Louvre e Notre-Dame. Fica ainda mais bonito ao anoitecer.' },
    { id: 'versalhes', cityId: 'paris', nome: 'Palácio de Versalhes', lat: 48.8049, lon: 2.1204, duracaoH: 6, horario: { abre: '09:00', fecha: '17:30' },
      preco: { v: 30, cur: 'EUR', label: '~€25–35' }, wiki: 'Palace_of_Versailles', site: 'https://www.chateauversailles.fr',
      tags: ['Bate-volta'], selecionado: false, avisos: ['Fechado às segundas.'], fechado: [1],
      bateVolta: { desc: 'RER C até Versailles Château Rive Gauche (~40 min)', custo: { v: 5, cur: 'EUR' } },
      desc: 'O palácio de Luís XIV, com a Galeria dos Espelhos e jardins imensos. Reserve pelo menos meio dia e compre o ingresso com horário marcado.' },
    { id: 'disneyland', cityId: 'paris', nome: 'Disneyland Paris', lat: 48.8722, lon: 2.7758, duracaoH: 10, horario: { abre: '09:30', fecha: '21:00' },
      preco: { v: 111, cur: 'EUR', label: '€111' }, wiki: 'Disneyland_Paris', site: 'https://www.disneylandparis.com',
      tags: ['Bate-volta'], selecionado: false, nota: '~€70–80 em dia de semana, 1 parque.',
      bateVolta: { desc: 'RER A até Marne-la-Vallée – Chessy (~40 min)', custo: { v: 5, cur: 'EUR' } },
      desc: 'O parque da Disney na Europa, com o castelo da Bela Adormecida e um segundo parque ao lado. O preço varia bastante conforme a data.' },
    { id: 'la-vallee', cityId: 'paris', nome: 'La Vallée Village (outlet)', lat: 48.8550, lon: 2.7830, duracaoH: 5, horario: { abre: '10:00', fecha: '20:00' },
      preco: { v: 0, cur: 'EUR', label: 'Entrada livre' }, wiki: 'Val_d\'Europe', site: 'https://www.thebicestercollection.com/la-vallee-village/',
      tags: ['Compras', 'Bate-volta'], selecionado: false,
      bateVolta: { desc: 'RER A até Val d\'Europe (~40 min) — mesma linha da Disneyland', custo: { v: 5, cur: 'EUR' } },
      desc: 'Outlet de grifes a uma estação da Disneyland, com descontos sobre coleções anteriores e direito a détaxe.' },
    { id: 'galeries-lafayette', cityId: 'paris', nome: 'Galeries Lafayette (terraço grátis)', lat: 48.8738, lon: 2.3320, duracaoH: 1, horario: { abre: '10:00', fecha: '20:30' },
      preco: { v: 0, cur: 'EUR', label: 'Entrada livre' }, wiki: 'Boulevard_Haussmann', site: 'https://haussmann.galerieslafayette.com',
      tags: ['Compras'], selecionado: false,
      desc: 'Loja de departamentos com uma cúpula de vitral impressionante. O terraço no último andar é gratuito e tem vista para a Ópera e a Torre Eiffel.' },
    { id: 'printemps', cityId: 'paris', nome: 'Printemps Haussmann', lat: 48.8738, lon: 2.3283, duracaoH: 1, horario: { abre: '10:00', fecha: '20:00' },
      preco: { v: 0, cur: 'EUR', label: 'Entrada livre' }, wiki: 'Printemps', site: 'https://www.printemps.com',
      tags: ['Compras'], selecionado: false,
      desc: 'Vizinha das Galeries Lafayette, também com terraço panorâmico gratuito e andares inteiros de moda e beleza.' },
    { id: 'le-marais', cityId: 'paris', nome: 'Le Marais (lojas e brechós)', lat: 48.8590, lon: 2.3620, duracaoH: 1.5,
      preco: { v: 0, cur: 'EUR', label: 'Entrada livre' }, wiki: 'Le_Marais', site: '',
      tags: ['Compras'], selecionado: false,
      desc: 'Bairro histórico de ruas estreitas, com brechós, lojas independentes e a Place des Vosges. Bom para passear no domingo, quando quase tudo abre.' },
    { id: 'decathlon-paris', cityId: 'paris', nome: 'Decathlon / Uniqlo (roupa de frio)', lat: 48.8720, lon: 2.3340, duracaoH: 1,
      preco: { v: 0, cur: 'EUR', label: 'Entrada livre' }, wiki: 'Decathlon_(retailer)', site: 'https://www.decathlon.fr',
      tags: ['Compras'], selecionado: false,
      desc: 'Lojas na região da Ópera para completar a roupa de frio (segunda pele, luvas, gorro) gastando pouco antes de seguir para a Polônia.' },

    /* ===== CRACÓVIA ===== */
    { id: 'rynek-glowny', cityId: 'cracovia', nome: 'Praça Principal (Rynek Główny)', lat: 50.0617, lon: 19.9373, duracaoH: 1, arLivre: true,
      preco: { v: 0, cur: 'PLN', label: 'Grátis' }, wiki: 'Main_Square,_Kraków', site: '',
      tags: [], selecionado: false,
      desc: 'Uma das maiores praças medievais da Europa, com o Mercado de Tecidos no centro e a Basílica de Santa Maria, de onde o trompetista toca a cada hora.' },
    { id: 'wawel', cityId: 'cracovia', nome: 'Castelo de Wawel', lat: 50.0540, lon: 19.9354, duracaoH: 2,
      preco: { v: 0, cur: 'PLN', label: 'Externo grátis' }, wiki: 'Wawel_Castle', site: 'https://wawel.krakow.pl',
      tags: [], selecionado: false, nota: 'Pátios e área externa são gratuitos; as exposições internas são pagas à parte.',
      desc: 'Castelo dos reis poloneses no alto de uma colina sobre o rio Vístula, com catedral, pátio renascentista e a lenda do dragão.' },
    { id: 'kazimierz', cityId: 'cracovia', nome: 'Kazimierz', lat: 50.0510, lon: 19.9460, duracaoH: 1.5, arLivre: true,
      preco: { v: 0, cur: 'PLN', label: 'Grátis' }, wiki: 'Szeroka_Street,_Kraków', site: '',
      tags: [], selecionado: false,
      desc: 'Antigo bairro judeu, hoje cheio de sinagogas históricas, cafés e bares. Foi cenário de "A Lista de Schindler".' },
    { id: 'schindler', cityId: 'cracovia', nome: 'Fábrica de Schindler', lat: 50.0475, lon: 19.9616, duracaoH: 2, horario: { abre: '10:00', fecha: '18:00' },
      preco: { v: 50, cur: 'PLN', label: '~50 PLN' }, wiki: 'Oskar_Schindler\'s_Enamel_Factory', site: 'https://muzeumkrakowa.pl',
      tags: ['Museu'], selecionado: false,
      desc: 'Museu na antiga fábrica de Oskar Schindler, que conta como foi a ocupação nazista de Cracóvia. Os ingressos são limitados por horário.' },
    { id: 'auschwitz', cityId: 'cracovia', nome: 'Auschwitz-Birkenau', lat: 50.0266, lon: 19.2036, duracaoH: 7, horario: { abre: '08:00', fecha: '17:00' },
      preco: { v: 150, cur: 'PLN', label: '150 PLN' }, wiki: 'Auschwitz_concentration_camp', site: 'https://visit.auschwitz.org',
      tags: ['Bate-volta', 'Museu'], selecionado: false, nota: 'General tour de 3h45 em inglês; também existe o study tour de 6h.',
      avisos: ['Reserve com antecedência no site oficial — as vagas dos tours guiados acabam rápido.'],
      bateVolta: { desc: 'Ônibus ou van de Cracóvia até Oświęcim (~1h30)', custo: { v: 40, cur: 'PLN' } },
      desc: 'Memorial e museu no maior campo de concentração e extermínio nazista. A visita guiada passa por Auschwitz I e por Birkenau; ocupa o dia quase todo.' },
    { id: 'wieliczka', cityId: 'cracovia', nome: 'Mina de Sal de Wieliczka', lat: 49.9833, lon: 20.0550, duracaoH: 4.5, horario: { abre: '08:00', fecha: '17:00' },
      preco: { v: 160, cur: 'PLN', label: '~150–170 PLN' }, wiki: 'Wieliczka_Salt_Mine', site: 'https://www.kopalnia.pl',
      tags: ['Bate-volta'], selecionado: false,
      bateVolta: { desc: 'Trem ou ônibus de Cracóvia até Wieliczka (~30 min)', custo: { v: 15, cur: 'PLN' } },
      desc: 'Mina de sal do século XIII com capelas, lagos e esculturas talhadas em sal a mais de 100 m de profundidade. A visita guiada dura umas 3 horas.' },

    /* ===== BERLIM ===== */
    { id: 'brandemburgo', cityId: 'berlim', nome: 'Portão de Brandemburgo', lat: 52.5163, lon: 13.3777, duracaoH: 0.5, arLivre: true,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'Brandenburg_Gate', site: '',
      tags: [], selecionado: false,
      desc: 'O símbolo de Berlim e da reunificação alemã. Fica ao lado do Reichstag e do Memorial do Holocausto.' },
    { id: 'east-side-gallery', cityId: 'berlim', nome: 'East Side Gallery (Muro de Berlim)', lat: 52.5050, lon: 13.4397, duracaoH: 1, arLivre: true,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'East_Side_Gallery', site: '',
      tags: [], selecionado: false,
      desc: 'O maior trecho preservado do Muro de Berlim, com 1,3 km de murais pintados depois da queda — incluindo o famoso "beijo fraterno".' },
    { id: 'ilha-dos-museus', cityId: 'berlim', nome: 'Ilha dos Museus', lat: 52.5169, lon: 13.4019, duracaoH: 3, horario: { abre: '10:00', fecha: '18:00' },
      preco: { v: 20, cur: 'EUR', label: '~€20' }, wiki: 'Museum_Island', site: 'https://www.smb.museum',
      tags: ['Museu'], selecionado: false,
      desc: 'Conjunto de cinco museus numa ilha do rio Spree, Patrimônio da Humanidade. O busto de Nefertiti fica no Neues Museum.' },

    /* ===== MUNIQUE ===== */
    { id: 'marienplatz', cityId: 'munique', nome: 'Marienplatz', lat: 48.1374, lon: 11.5755, duracaoH: 0.75, arLivre: true,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'Marienplatz', site: '',
      tags: [], selecionado: false,
      desc: 'Praça central de Munique, com a prefeitura neogótica e o carrilhão de bonecos que se apresenta às 11h e ao meio-dia.' },
    { id: 'neuschwanstein', cityId: 'munique', nome: 'Castelo de Neuschwanstein', lat: 47.5576, lon: 10.7498, duracaoH: 9, horario: { abre: '09:00', fecha: '18:00' },
      preco: { v: 21, cur: 'EUR', label: '~€21' }, wiki: 'Neuschwanstein_Castle', site: 'https://www.neuschwanstein.de',
      tags: ['Bate-volta'], selecionado: false,
      bateVolta: { desc: 'Trem de Munique até Füssen (~2h) + ônibus até o castelo', custo: { v: 35, cur: 'EUR' } },
      desc: 'O castelo de conto de fadas que inspirou a Disney, nos Alpes da Baviera. A visita interna é com horário marcado; o passeio toma o dia inteiro.' },

    /* ===== LISBOA ===== */
    { id: 'torre-de-belem', cityId: 'lisboa', nome: 'Torre de Belém', lat: 38.6916, lon: -9.2160, duracaoH: 1, horario: { abre: '09:30', fecha: '18:00' },
      preco: { v: 10, cur: 'EUR', label: '~€10' }, wiki: 'Belém_Tower', site: '',
      tags: [], selecionado: false,
      desc: 'Fortaleza do século XVI à beira do Tejo, símbolo da era dos Descobrimentos. Os pastéis de Belém originais ficam a poucos minutos dali.' },

    /* ===== ZURIQUE ===== */
    { id: 'jungfraujoch', cityId: 'zurique', nome: 'Jungfraujoch (via Interlaken)', lat: 46.5475, lon: 7.9853, duracaoH: 10, arLivre: true,
      preco: { v: 200, cur: 'CHF', label: '~CHF 200+' }, wiki: 'Jungfraujoch', site: 'https://www.jungfrau.ch',
      tags: ['Bate-volta'], selecionado: false,
      bateVolta: { desc: 'Trem de Zurique até Interlaken (~2h), de onde sai o trem de montanha', custo: { v: 140, cur: 'CHF' } },
      desc: 'O "Topo da Europa": estação de trem a 3.454 m, com neve o ano inteiro e vista para a geleira Aletsch. Passeio caro e que depende do tempo.' },

    /* ===== VIENA ===== */
    { id: 'schonbrunn', cityId: 'viena', nome: 'Palácio de Schönbrunn', lat: 48.1845, lon: 16.3122, duracaoH: 2.5, horario: { abre: '08:30', fecha: '17:00' },
      preco: { v: 30, cur: 'EUR', label: '~€30' }, wiki: 'Schönbrunn_Palace', site: 'https://www.schoenbrunn.at',
      tags: [], selecionado: false,
      desc: 'Residência de verão dos Habsburgo, com salões barrocos e jardins enormes. Subir até a Gloriette rende a melhor vista do palácio.' },
    { id: 'stephansdom', cityId: 'viena', nome: 'Catedral de Santo Estêvão', lat: 48.2085, lon: 16.3731, duracaoH: 0.75,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'St._Stephen\'s_Cathedral,_Vienna', site: 'https://www.stephanskirche.at',
      tags: [], selecionado: false,
      desc: 'Catedral gótica no coração de Viena, com telhado de azulejos coloridos. A entrada é gratuita; torres e catacumbas são pagas à parte.' },

    /* ===== BRATISLAVA ===== */
    { id: 'castelo-bratislava', cityId: 'bratislava', nome: 'Castelo de Bratislava', lat: 48.1424, lon: 17.1000, duracaoH: 1.5, horario: { abre: '10:00', fecha: '18:00' },
      preco: { v: 10, cur: 'EUR', label: '~€10' }, wiki: 'Bratislava_Castle', site: '',
      tags: [], selecionado: false,
      desc: 'Castelo branco de quatro torres no alto da colina, com vista para o Danúbio e, em dia claro, para a Áustria e a Hungria.' },

    /* ===== BUDAPESTE ===== */
    { id: 'parlamento-hungria', cityId: 'budapeste', nome: 'Parlamento', lat: 47.5071, lon: 19.0458, duracaoH: 1.25, horario: { abre: '08:00', fecha: '16:00' },
      preco: { v: 25, cur: 'EUR', label: '~€25' }, wiki: 'Hungarian_Parliament_Building', site: 'https://www.parlament.hu',
      tags: [], selecionado: false,
      desc: 'Um dos maiores parlamentos do mundo, em estilo neogótico à beira do Danúbio. A visita guiada mostra a escadaria e a coroa húngara.' },
    { id: 'szechenyi', cityId: 'budapeste', nome: 'Banhos Széchenyi', lat: 47.5186, lon: 19.0823, duracaoH: 2.5, horario: { abre: '07:00', fecha: '20:00' },
      preco: { v: 30, cur: 'EUR', label: '~€30' }, wiki: 'Széchenyi_thermal_bath', site: 'https://www.szechenyibath.hu',
      tags: [], selecionado: false,
      desc: 'O maior complexo de banhos termais da Europa, com piscinas externas de água quente que funcionam mesmo no inverno.' },
    { id: 'bastiao-pescadores', cityId: 'budapeste', nome: 'Bastião dos Pescadores', lat: 47.5022, lon: 19.0348, duracaoH: 0.75, arLivre: true,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'Fisherman\'s_Bastion', site: '',
      tags: [], selecionado: false,
      desc: 'Terraço de torres brancas no alto de Buda, com a vista mais famosa do Parlamento e do Danúbio. A maior parte é de acesso livre.' },

    /* ===== ROMA ===== */
    { id: 'coliseu', cityId: 'roma', nome: 'Coliseu', lat: 41.8902, lon: 12.4922, duracaoH: 2.5, horario: { abre: '08:30', fecha: '17:30' },
      preco: { v: 18, cur: 'EUR', label: '~€18' }, wiki: 'Colosseum', site: 'https://colosseo.it',
      tags: [], selecionado: false,
      desc: 'O maior anfiteatro do Império Romano. O ingresso costuma incluir o Fórum Romano e o Palatino, logo ao lado.' },
    { id: 'museus-vaticanos', cityId: 'roma', nome: 'Museus Vaticanos / Capela Sistina', lat: 41.9065, lon: 12.4536, duracaoH: 3, horario: { abre: '08:00', fecha: '19:00' },
      preco: { v: 22, cur: 'EUR', label: '~€20–25' }, wiki: 'Sistine_Chapel', site: 'https://www.museivaticani.va',
      tags: ['Museu'], selecionado: false, avisos: ['Fechado na maioria dos domingos.'],
      desc: 'Quilômetros de galerias que terminam na Capela Sistina, com o teto de Michelangelo. Comprar online evita filas de horas.' },
    { id: 'fontana-di-trevi', cityId: 'roma', nome: 'Fontana di Trevi', lat: 41.9009, lon: 12.4833, duracaoH: 0.3, arLivre: true,
      preco: { v: 2, cur: 'EUR', label: '~€2' }, wiki: 'Trevi_Fountain', site: '',
      tags: [], selecionado: false,
      desc: 'A fonte barroca mais famosa do mundo. Diz a tradição que quem joga uma moeda de costas volta a Roma.' },
    { id: 'panteao', cityId: 'roma', nome: 'Panteão', lat: 41.8986, lon: 12.4769, duracaoH: 0.5, horario: { abre: '09:00', fecha: '19:00' },
      preco: { v: 5, cur: 'EUR', label: '~€5' }, wiki: 'Pantheon,_Rome', site: '',
      tags: [], selecionado: false,
      desc: 'Templo romano de quase 2 mil anos, com a maior cúpula de concreto não armado do mundo e um óculo aberto para o céu.' },

    /* ===== ATENAS ===== */
    { id: 'acropole', cityId: 'atenas', nome: 'Acrópole', lat: 37.9715, lon: 23.7257, duracaoH: 2.5, horario: { abre: '08:00', fecha: '17:00' }, arLivre: true,
      preco: { v: 30, cur: 'EUR', label: '~€30' }, wiki: 'Acropolis_of_Athens', site: 'https://hhticket.gr',
      tags: [], selecionado: false,
      desc: 'A colina sagrada de Atenas, com o Partenon e o Erecteion. Vá cedo ou no fim da tarde para fugir do calor e das multidões.' },
    { id: 'museu-acropole', cityId: 'atenas', nome: 'Museu da Acrópole', lat: 37.9685, lon: 23.7285, duracaoH: 1.5, horario: { abre: '09:00', fecha: '17:00' },
      preco: { v: 20, cur: 'EUR', label: '~€20' }, wiki: 'Caryatid', site: 'https://www.theacropolismuseum.gr',
      tags: ['Museu'], selecionado: false,
      desc: 'Museu moderno aos pés da Acrópole, com as esculturas originais do Partenon e piso de vidro sobre ruínas antigas.' },
    { id: 'plaka', cityId: 'atenas', nome: 'Plaka', lat: 37.9725, lon: 23.7300, duracaoH: 1, arLivre: true,
      preco: { v: 0, cur: 'EUR', label: 'Grátis' }, wiki: 'Plaka', site: '',
      tags: [], selecionado: false,
      desc: 'O bairro mais antigo de Atenas, de ruelas com tavernas e lojinhas na encosta da Acrópole.' }
  ],

  /* ------------------------------------------------------- trechos entre cidades
     h: tempo em horas [mín, máx] — no avião é só o voo (o app soma +3h de aeroporto)
     eur: faixa de preço em euros [mín, máx] · null = modo não disponível
     via: parada intermediária · pernoite: oferece "Pernoitar em ..."            */
  legs: [
    { a: 'londres', b: 'paris', padrao: 'trem',
      trem:  { desc: 'Eurostar St Pancras → Gare du Nord', h: [2.33, 2.33], eur: [60, 150] },
      aviao: { desc: 'Voo direto', h: [1.25, 1.25], eur: [50, 120] } },
    { a: 'paris', b: 'cracovia', padrao: 'aviao',
      trem:  { desc: 'Via Berlim (pernoite recomendado)', h: [16, 18], eur: [90, 210], via: { cityId: 'berlim' }, pernoite: true },
      aviao: { desc: 'Low-cost direto, com mala', h: [2.17, 2.17], eur: [50, 100], comMala: true } },
    { a: 'paris', b: 'berlim', padrao: 'trem',
      trem:  { desc: 'TGV direto', h: [8, 8], eur: [60, 150] },
      aviao: { desc: 'Voo direto', h: [1.75, 1.75], eur: [50, 120] } },
    { a: 'berlim', b: 'cracovia', padrao: 'trem',
      trem:  { desc: 'Direto ou via Wrocław', h: [8, 8], eur: [30, 60] },
      aviao: { desc: 'Voo direto', h: [1.33, 1.33], eur: [50, 120] } },
    { a: 'paris', b: 'munique', padrao: 'trem',
      trem:  { desc: 'TGV', h: [5.67, 5.67], eur: [50, 130] },
      aviao: { desc: 'Voo direto', h: [1.5, 1.5], eur: [50, 120] } },
    { a: 'paris', b: 'zurique', padrao: 'trem',
      trem:  { desc: 'TGV Lyria', h: [4, 4], eur: [40, 120] },
      aviao: { desc: 'Voo direto', h: [1.25, 1.25], eur: [60, 130] } },
    { a: 'zurique', b: 'munique', padrao: 'trem',
      trem:  { desc: 'Trem direto', h: [3.5, 4], eur: [30, 70] },
      aviao: null, aviso: 'Sem voo prático neste trecho — o trem é mais rápido porta a porta.' },
    { a: 'munique', b: 'viena', padrao: 'trem',
      trem:  { desc: 'Railjet', h: [4, 4], eur: [30, 80] },
      aviao: { desc: 'Voo direto', h: [1, 1], eur: [50, 120] } },
    { a: 'viena', b: 'bratislava', padrao: 'trem',
      trem:  { desc: 'Trem regional', h: [1, 1], eur: [10, 15] },
      aviao: null, aviso: 'Sem voo neste trecho — as cidades ficam a 1h de trem.' },
    { a: 'bratislava', b: 'budapeste', padrao: 'trem',
      trem:  { desc: 'Trem direto', h: [2.5, 2.5], eur: [15, 30] },
      aviao: null, aviso: 'Sem voo prático neste trecho.' },
    { a: 'viena', b: 'budapeste', padrao: 'trem',
      trem:  { desc: 'Railjet', h: [2.67, 2.67], eur: [20, 40] },
      aviao: null, aviso: 'Sem voo prático neste trecho.' },
    { a: 'viena', b: 'cracovia', padrao: 'trem',
      trem:  { desc: 'Direto ou noturno', h: [7, 8], eur: [30, 60] },
      aviao: { desc: 'Voo direto', h: [1.17, 1.17], eur: [60, 120] } },
    { a: 'budapeste', b: 'cracovia', padrao: 'trem',
      trem:  { desc: 'Trem noturno', h: [10, 10], eur: [40, 80] },
      aviao: { desc: 'Voo direto', h: [1.25, 1.25], eur: [50, 120] } },
    { a: 'paris', b: 'roma', padrao: 'aviao',
      trem:  { desc: 'Via Milão (Frecciarossa)', h: [10, 11], eur: [80, 180], via: { nome: 'Milão', lat: 45.4642, lon: 9.1900 } },
      aviao: { desc: 'Voo direto', h: [2, 2], eur: [50, 130] } },
    { a: 'roma', b: 'atenas', padrao: 'aviao',
      trem:  null, aviso: 'Sem trem viável neste trecho — somente avião.',
      aviao: { desc: 'Voo direto', h: [2, 2], eur: [50, 130] } }
  ],

  /* ------------------------------------ Ucrânia: somente informativo (não selecionável) */
  infoArea: { pais: 'Ucrânia', paisIso: 804 },
  info: [
    { id: 'chernobyl', nome: 'Chernobyl', lat: 51.2763, lon: 30.2219, wiki: 'Chernobyl_Exclusion_Zone',
      aviso: 'País em guerra. Turismo suspenso.',
      desc: 'Local do acidente nuclear de 1986, no norte da Ucrânia. A zona de exclusão recebia visitas guiadas antes da guerra; hoje está fechada ao turismo.' },
    { id: 'zaporijia', nome: 'Usina Nuclear de Zaporíjia', lat: 47.5119, lon: 34.5856, wiki: 'Zaporizhzhia_Nuclear_Power_Plant',
      aviso: 'Zona de guerra ativa.',
      desc: 'A maior usina nuclear da Europa, no sul da Ucrânia, em área ocupada e em zona de combate desde 2022. Aparece aqui apenas como referência.' }
  ]
};
