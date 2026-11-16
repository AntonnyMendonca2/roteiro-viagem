/* ==========================================================================
   DADOS DA EUROPA COMPLETA — cidades, moedas e trechos que completam o data.js.
   (Os pontos de interesse novos ficam em data-pontos-1.js e data-pontos-2.js.)

   Carregado logo depois do data.js. Para manter o arquivo legível, cada
   cidade e cada trecho ocupa uma linha, montada pelas funções C() e L().
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;

  /* ------------------------------------------------------ moedas e câmbio */
  // 1 unidade = X reais (valor inicial; o câmbio automático atualiza as que o Frankfurter cobre).
  const NOVAS = {
    CZK: ['Kč', 0.257], DKK: ['kr', 0.839], SEK: ['kr', 0.57], NOK: ['kr', 0.535], ISK: ['kr', 0.0433],
    RON: ['lei', 1.23], RSD: ['din', 0.0534], BAM: ['KM', 3.2], ALL: ['L', 0.0646], MKD: ['den', 0.1017],
    MDL: ['L', 0.32], TRY: ['₺', 0.128]
  };
  Object.keys(NOVAS).forEach(m => { D.moedas.push(m); D.simbolos[m] = NOVAS[m][0]; D.cambio[m] = NOVAS[m][1]; });
  // O Frankfurter não cobre estas: ficam sempre manuais (valor inicial aproximado).
  D.cambioManual = ['RSD', 'ALL', 'MKD', 'MDL'];
  // Paridade fixa com o euro (1 EUR = 1,95583 BAM): derivada da cotação do euro.
  D.cambioFixoEur = { BAM: 1.95583 };

  /* ----------------------------------------------------------------- cidades
     C(id, nome, país, ISO numérico, lat, lon, moeda, wiki, iata, hostelworld,
       estação [nome, lat, lon] ou null, diária de hospedagem, gastos por dia, extras)
     As diárias estão na moeda local: cama em hostel/quarto econômico e
     alimentação + transporte local, por pessoa. Editáveis no assistente.
     extras: rotulo (n/s/e/w), grande (nome sempre visível no mapa da Europa),
             aeroExtraH (horas até o aeroporto mais próximo, quando a cidade não tem um),
             nota, papel, paisesExtra (países destacados junto, ex.: Vaticano) */
  function C(id, nome, pais, paisIso, lat, lon, moeda, wiki, iata, hostelworld, est, diariaHospedagem, diariaGastos, extras) {
    D.cities.push(Object.assign({
      id, nome, pais, paisIso, lat, lon, moeda, wiki, iata, hostelworld,
      estacao: est ? { nome: est[0], lat: est[1], lon: est[2] } : null,
      diariaHospedagem, diariaGastos, selecionada: false, noites: 2, rotulo: 'e'
    }, extras || {}));
  }

  /* Espanha e Portugal */
  C('madri', 'Madri', 'Espanha', 724, 40.4168, -3.7038, 'EUR', 'Madrid', 'MAD', 'spain/madrid', ['Madrid Puerta de Atocha', 40.4066, -3.6892], 38, 38, { grande: true, rotulo: 'w' });
  C('barcelona', 'Barcelona', 'Espanha', 724, 41.3874, 2.1686, 'EUR', 'Barcelona', 'BCN', 'spain/barcelona', ['Barcelona Sants', 41.3790, 2.1400], 45, 40, { grande: true, rotulo: 's' });
  C('sevilha', 'Sevilha', 'Espanha', 724, 37.3891, -5.9845, 'EUR', 'Seville', 'SVQ', 'spain/seville', ['Sevilla Santa Justa', 37.3920, -5.9753], 32, 32, { rotulo: 'w' });
  C('granada', 'Granada', 'Espanha', 724, 37.1773, -3.5986, 'EUR', 'Granada', 'GRX', 'spain/granada', ['Granada', 37.1840, -3.6090], 28, 30, { rotulo: 'e' });
  C('porto', 'Porto', 'Portugal', 620, 41.1579, -8.6291, 'EUR', 'Porto', 'OPO', 'portugal/porto', ['Porto Campanhã', 41.1488, -8.5858], 30, 32, { rotulo: 'w' });

  /* Reino Unido (além de Londres) */
  C('liverpool', 'Liverpool', 'Reino Unido', 826, 53.4084, -2.9916, 'GBP', 'Liverpool', 'LPL', 'england/liverpool', ['Liverpool Lime Street', 53.4076, -2.9775], 32, 32, { rotulo: 'w',
    nota: 'A cidade dos Beatles e do Liverpool FC. Fica a ~2h15 de trem de Londres: dá para incluir como bate-volta (ida e volta no mesmo dia) ou dormir aqui.' });

  /* Irlanda, Benelux */
  C('dublin', 'Dublin', 'Irlanda', 372, 53.3498, -6.2603, 'EUR', 'Dublin', 'DUB', 'ireland/dublin', ['Dublin Connolly', 53.3531, -6.2460], 55, 45, { grande: true, rotulo: 'w',
    nota: 'A Irlanda não faz parte do espaço Schengen: há controle de passaporte na chegada. De trem, só se sai da ilha de balsa.' });
  C('amsterda', 'Amsterdã', 'Países Baixos', 528, 52.3676, 4.9041, 'EUR', 'Amsterdam', 'AMS', 'netherlands/amsterdam', ['Amsterdam Centraal', 52.3791, 4.9003], 60, 45, { grande: true, rotulo: 'n' });
  C('bruxelas', 'Bruxelas', 'Bélgica', 56, 50.8467, 4.3525, 'EUR', 'Brussels', 'BRU', 'belgium/brussels', ['Bruxelles-Midi', 50.8357, 4.3365], 42, 40, { rotulo: 's' });
  C('bruges', 'Bruges', 'Bélgica', 56, 51.2093, 3.2247, 'EUR', 'Bruges', 'BRU', 'belgium/bruges', ['Brugge', 51.1972, 3.2167], 45, 40, { rotulo: 'w', aeroExtraH: 1.3 });
  C('luxemburgo', 'Luxemburgo', 'Luxemburgo', 442, 49.6116, 6.1319, 'EUR', 'Luxembourg City', 'LUX', 'luxembourg/luxembourg', ['Gare de Luxembourg', 49.5999, 6.1342], 55, 45, { rotulo: 's',
    nota: 'O transporte público é gratuito em todo o país (ônibus, bonde e trens em 2ª classe).' });

  /* França, Itália e microestados vizinhos */
  C('nice', 'Nice', 'França', 250, 43.7102, 7.2620, 'EUR', 'Nice', 'NCE', 'france/nice', ['Nice-Ville', 43.7046, 7.2619], 45, 40, { rotulo: 's' });
  C('monaco', 'Mônaco', 'Mônaco', 492, 43.7384, 7.4246, 'EUR', 'Monte_Carlo', 'NCE', 'monaco/monaco', ['Monaco-Monte-Carlo', 43.7387, 7.4190], 90, 70, { rotulo: 'e', aeroExtraH: 0.7,
    nota: 'Microestado: a maioria dos viajantes dorme em Nice (25 min de trem) e visita Mônaco em um dia.' });
  C('veneza', 'Veneza', 'Itália', 380, 45.4408, 12.3155, 'EUR', 'Venice', 'VCE', 'italy/venice', ['Venezia Santa Lucia', 45.4410, 12.3210], 55, 45, { grande: true, rotulo: 'n',
    nota: 'Em dias de pico, quem visita Veneza sem pernoitar paga uma taxa de acesso (€5–10); confira o calendário oficial.' });
  C('florenca', 'Florença', 'Itália', 380, 43.7696, 11.2558, 'EUR', 'Florence', 'FLR', 'italy/florence', ['Firenze Santa Maria Novella', 43.7765, 11.2480], 45, 40, { rotulo: 'w' });
  C('milao', 'Milão', 'Itália', 380, 45.4642, 9.1900, 'EUR', 'Milan', 'MIL', 'italy/milan', ['Milano Centrale', 45.4862, 9.2043], 50, 42, { grande: true, rotulo: 'w' });
  C('napoles', 'Nápoles', 'Itália', 380, 40.8518, 14.2681, 'EUR', 'Naples', 'NAP', 'italy/naples', ['Napoli Centrale', 40.8529, 14.2727], 35, 32, { rotulo: 'e' });
  C('san-marino', 'San Marino', 'San Marino', 674, 43.9424, 12.4578, 'EUR', 'City of San Marino', 'BLQ', 'italy/rimini', ['Rimini (+ ônibus)', 44.0643, 12.5741], 60, 40, { rotulo: 'e', aeroExtraH: 1.8,
    nota: 'Microestado no alto do Monte Titano. Não tem trem: o ônibus sai da estação de Rimini (~50 min).' });

  /* Suíça, Áustria, Liechtenstein */
  C('lucerna', 'Lucerna', 'Suíça', 756, 47.0502, 8.3093, 'CHF', 'Lucerne', 'ZRH', 'switzerland/lucerne', ['Luzern', 47.0502, 8.3102], 55, 65, { rotulo: 'w', aeroExtraH: 1.2 });
  C('interlaken', 'Interlaken', 'Suíça', 756, 46.6863, 7.8632, 'CHF', 'Interlaken', 'ZRH', 'switzerland/interlaken', ['Interlaken Ost', 46.6905, 7.8690], 50, 65, { rotulo: 's', aeroExtraH: 2.2 });
  C('vaduz', 'Vaduz', 'Liechtenstein', 438, 47.1410, 9.5209, 'CHF', 'Vaduz', 'ZRH', 'liechtenstein/vaduz', ['Sargans (+ ônibus)', 47.0447, 9.4463], 80, 70, { rotulo: 'e', aeroExtraH: 1.6,
    nota: 'Microestado sem aeroporto nem estação central: chega-se de trem até Sargans (Suíça) ou Feldkirch (Áustria) e segue de ônibus.' });
  C('salzburgo', 'Salzburgo', 'Áustria', 40, 47.8095, 13.0550, 'EUR', 'Salzburg', 'SZG', 'austria/salzburg', ['Salzburg Hbf', 47.8129, 13.0457], 42, 40, { rotulo: 's' });

  /* Alemanha e Tchéquia */
  C('hamburgo', 'Hamburgo', 'Alemanha', 276, 53.5511, 9.9937, 'EUR', 'Hamburg', 'HAM', 'germany/hamburg', ['Hamburg Hbf', 53.5528, 10.0067], 40, 40, { rotulo: 'n' });
  C('colonia', 'Colônia', 'Alemanha', 276, 50.9375, 6.9603, 'EUR', 'Cologne', 'CGN', 'germany/cologne', ['Köln Hbf', 50.9430, 6.9589], 38, 38, { rotulo: 'e' });
  C('frankfurt', 'Frankfurt', 'Alemanha', 276, 50.1109, 8.6821, 'EUR', 'Frankfurt', 'FRA', 'germany/frankfurt', ['Frankfurt (Main) Hbf', 50.1071, 8.6638], 42, 40, { rotulo: 'e',
    papel: 'Grande conexão aérea e ferroviária' });
  C('praga', 'Praga', 'Tchéquia', 203, 50.0755, 14.4378, 'CZK', 'Prague', 'PRG', 'czech-republic/prague', ['Praha hlavní nádraží', 50.0830, 14.4353], 600, 800, { grande: true, rotulo: 'n' });

  /* Países nórdicos */
  C('copenhague', 'Copenhague', 'Dinamarca', 208, 55.6761, 12.5683, 'DKK', 'Copenhagen', 'CPH', 'denmark/copenhagen', ['København H', 55.6727, 12.5646], 350, 400, { grande: true, rotulo: 'e' });
  C('estocolmo', 'Estocolmo', 'Suécia', 752, 59.3293, 18.0686, 'SEK', 'Stockholm', 'STO', 'sweden/stockholm', ['Stockholm Central', 59.3300, 18.0586], 400, 450, { grande: true, rotulo: 'w' });
  C('oslo', 'Oslo', 'Noruega', 578, 59.9139, 10.7522, 'NOK', 'Oslo', 'OSL', 'norway/oslo', ['Oslo S', 59.9111, 10.7528], 500, 550, { grande: true, rotulo: 'e' });
  C('bergen', 'Bergen', 'Noruega', 578, 60.3913, 5.3221, 'NOK', 'Bergen', 'BGO', 'norway/bergen', ['Bergen', 60.3903, 5.3336], 500, 550, { rotulo: 'w' });
  C('helsinque', 'Helsinque', 'Finlândia', 246, 60.1699, 24.9384, 'EUR', 'Helsinki', 'HEL', 'finland/helsinki', ['Helsinki Central', 60.1719, 24.9414], 40, 45, { grande: true, rotulo: 'n' });
  C('rovaniemi', 'Rovaniemi', 'Finlândia', 246, 66.5039, 25.7294, 'EUR', 'Rovaniemi', 'RVN', 'finland/rovaniemi', ['Rovaniemi', 66.4977, 25.7106], 60, 50, { rotulo: 'e',
    nota: 'Capital da Lapônia, no Círculo Polar Ártico. A aurora boreal é mais provável de setembro a março, em noites sem nuvens.' });
  C('reykjavik', 'Reykjavík', 'Islândia', 352, 64.1466, -21.9426, 'ISK', 'Reykjavík', 'REK', 'iceland/reykjavik', null, 8000, 9000, { grande: true, rotulo: 'e',
    nota: 'A Islândia só tem ligação por avião. O aeroporto internacional (Keflavík) fica a 45 min de ônibus da cidade.' });

  /* Bálticos */
  C('tallinn', 'Tallinn', 'Estônia', 233, 59.4370, 24.7536, 'EUR', 'Tallinn', 'TLL', 'estonia/tallinn', ['Tallinn Balti jaam', 59.4400, 24.7372], 28, 32, { rotulo: 'w' });
  C('riga', 'Riga', 'Letônia', 428, 56.9496, 24.1052, 'EUR', 'Riga', 'RIX', 'latvia/riga', ['Rīga Centrālā', 56.9466, 24.1210], 25, 30, { rotulo: 'w' });
  C('vilnius', 'Vilnius', 'Lituânia', 440, 54.6872, 25.2797, 'EUR', 'Vilnius', 'VNO', 'lithuania/vilnius', ['Vilnius', 54.6704, 25.2843], 25, 28, { rotulo: 'e' });

  /* Eslovênia, Croácia e Bálcãs */
  C('liubliana', 'Liubliana', 'Eslovênia', 705, 46.0569, 14.5058, 'EUR', 'Ljubljana', 'LJU', 'slovenia/ljubljana', ['Ljubljana', 46.0580, 14.5113], 35, 35, { rotulo: 's' });
  C('bled', 'Bled', 'Eslovênia', 705, 46.3683, 14.1146, 'EUR', 'Bled', 'LJU', 'slovenia/bled', ['Lesce-Bled', 46.3615, 14.1583], 40, 35, { rotulo: 'n', aeroExtraH: 0.6 });
  C('zagreb', 'Zagreb', 'Croácia', 191, 45.8150, 15.9819, 'EUR', 'Zagreb', 'ZAG', 'croatia/zagreb', ['Zagreb Glavni kolodvor', 45.8046, 15.9787], 30, 32, { rotulo: 'e' });
  C('split', 'Split', 'Croácia', 191, 43.5081, 16.4402, 'EUR', 'Split, Croatia', 'SPU', 'croatia/split', ['Split', 43.5045, 16.4425], 38, 35, { rotulo: 'w' });
  C('dubrovnik', 'Dubrovnik', 'Croácia', 191, 42.6507, 18.0944, 'EUR', 'Dubrovnik', 'DBV', 'croatia/dubrovnik', null, 50, 45, { rotulo: 'w' });
  C('sarajevo', 'Sarajevo', 'Bósnia e Herzegovina', 70, 43.8563, 18.4131, 'BAM', 'Sarajevo', 'SJJ', 'bosnia-and-herzegovina/sarajevo', ['Sarajevo', 43.8603, 18.3989], 35, 40, { rotulo: 'e' });
  C('mostar', 'Mostar', 'Bósnia e Herzegovina', 70, 43.3438, 17.8078, 'BAM', 'Mostar', 'SJJ', 'bosnia-and-herzegovina/mostar', ['Mostar', 43.3483, 17.8133], 30, 35, { rotulo: 'w', aeroExtraH: 2.3 });
  C('belgrado', 'Belgrado', 'Sérvia', 688, 44.7866, 20.4489, 'RSD', 'Belgrade', 'BEG', 'serbia/belgrade', ['Beograd Centar', 44.7936, 20.4553], 2500, 3000, { rotulo: 'e' });
  C('kotor', 'Kotor', 'Montenegro', 499, 42.4247, 18.7712, 'EUR', 'Kotor', 'TIV', 'montenegro/kotor', null, 30, 30, { rotulo: 'e', aeroExtraH: 0.3 });
  C('tirana', 'Tirana', 'Albânia', 8, 41.3275, 19.8187, 'ALL', 'Tirana', 'TIA', 'albania/tirana', null, 2000, 2500, { rotulo: 'w',
    nota: 'A Albânia praticamente não tem trens de passageiros: os deslocamentos são de ônibus ou van (furgon).' });
  C('ohrid', 'Ohrid', 'Macedônia do Norte', 807, 41.1231, 20.8016, 'MKD', 'Ohrid', 'OHD', 'macedonia/ohrid', null, 900, 1100, { rotulo: 'e' });
  C('prizren', 'Prizren', 'Kosovo', 383, 42.2139, 20.7397, 'EUR', 'Prizren', 'PRN', 'kosovo/prizren', null, 20, 20, { rotulo: 'n', aeroExtraH: 1.5,
    nota: 'Quem entra no Kosovo pela Albânia, Montenegro ou Macedônia do Norte pode ter problemas para seguir direto para a Sérvia; confira antes.' });
  C('sofia', 'Sófia', 'Bulgária', 100, 42.6977, 23.3219, 'EUR', 'Sofia', 'SOF', 'bulgaria/sofia', ['Sofia Central', 42.7124, 23.3210], 22, 25, { rotulo: 'e',
    nota: 'A Bulgária adotou o euro em janeiro de 2026.' });
  C('bucareste', 'Bucareste', 'Romênia', 642, 44.4268, 26.1025, 'RON', 'Bucharest', 'BUH', 'romania/bucharest', ['București Nord', 44.4467, 26.0744], 120, 140, { grande: true, rotulo: 'e' });
  C('brasov', 'Brașov', 'Romênia', 642, 45.6427, 25.5887, 'RON', 'Brașov', 'OTP', 'romania/brasov', ['Brașov', 45.6610, 25.6130], 110, 120, { rotulo: 'n', aeroExtraH: 2.7 });
  C('chisinau', 'Chișinău', 'Moldávia', 498, 47.0105, 28.8638, 'MDL', 'Chișinău', 'RMO', 'moldova/chisinau', ['Chișinău', 47.0125, 28.8597], 400, 450, { rotulo: 'e' });

  /* Mediterrâneo e Turquia */
  C('santorini', 'Santorini', 'Grécia', 300, 36.4166, 25.4324, 'EUR', 'Santorini', 'JTR', 'greece/santorini', null, 60, 50, { rotulo: 'e',
    nota: 'Em março muita coisa ainda está fechada e há menos balsas; a temporada vai de abril a outubro.' });
  C('valletta', 'Valletta', 'Malta', 470, 35.8989, 14.5146, 'EUR', 'Valletta', 'MLA', 'malta/valletta', null, 35, 38, { rotulo: 'e' });
  C('pafos', 'Pafos', 'Chipre', 196, 34.7720, 32.4297, 'EUR', 'Paphos', 'PFO', 'cyprus/paphos', null, 35, 38, { rotulo: 'w' });
  C('istambul', 'Istambul', 'Turquia', 792, 41.0082, 28.9784, 'TRY', 'Istanbul', 'IST', 'turkey/istanbul', ['Halkalı', 41.0189, 28.7669], 1000, 1200, { grande: true, rotulo: 'e',
    nota: 'Os pontos cadastrados ficam na parte europeia. Brasileiros não precisam de visto para estadias de turismo de até 90 dias.' });
  C('andorra', 'Andorra', 'Andorra', 20, 42.5063, 1.5218, 'EUR', 'Andorra la Vella', 'BCN', 'andorra/andorra-la-vella', null, 45, 40, { rotulo: 'n', aeroExtraH: 3,
    nota: 'Microestado nos Pireneus, sem aeroporto nem trem: chega-se de ônibus a partir de Barcelona ou Toulouse. Compras com imposto reduzido.' });

  // Cidades que já existiam e ganham destaque no mapa da Europa / países extras.
  ['londres', 'paris', 'berlim', 'roma', 'viena', 'lisboa', 'atenas', 'budapeste', 'cracovia'].forEach(id => {
    const c = D.cities.find(x => x.id === id);
    if (c) c.grande = true;
  });
  D.cities.find(c => c.id === 'roma').paisesExtra = [336];        // o Vaticano fica destacado junto com Roma

  /* ------------------------------------------------------- trechos entre cidades
     L(a, b, modo padrão, { trem, onibus, balsa, aviao }, aviso)
     Cada modo: [descrição, h mín, h máx, € mín, € máx, extras]
       extras: via ({ cityId } ou { nome, lat, lon }), noturno (dorme a bordo), pernoite
     Avião: se não for informado e as cidades ficarem a mais de 350 km, entra uma
     estimativa de voo; aviao: false = sem voo prático. */
  const cidade = id => D.cities.find(c => c.id === id);
  function km(a, b) {
    const R = 6371, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const opt = o => (o ? Object.assign({ desc: o[0], h: [o[1], o[2]], eur: [o[3], o[4]] }, o[5] || {}) : null);

  function L(a, b, padrao, modos, aviso) {
    const leg = { a, b, padrao, trem: opt(modos.trem), onibus: opt(modos.onibus), balsa: opt(modos.balsa), aviao: null };
    if (aviso) leg.aviso = aviso;
    if (modos.aviao) leg.aviao = opt(modos.aviao);
    else if (modos.aviao !== false) {
      const d = km(cidade(a), cidade(b));
      if (d >= 350) { const h = Math.round((d / 750 + 0.5) * 100) / 100; leg.aviao = { desc: 'Voo (~' + Math.round(d) + ' km)', h: [h, h], eur: d > 1500 ? [70, 180] : [50, 130] }; }
    }
    D.legs.push(leg);
  }
  const VIA = (nome, lat, lon) => ({ via: { nome, lat, lon } });

  /* Londres, Benelux e França */
  L('londres', 'bruxelas', 'trem', { trem: ['Eurostar St Pancras → Bruxelles-Midi', 2, 2.1, 50, 140] });
  L('londres', 'amsterda', 'trem', { trem: ['Eurostar direto', 4.1, 4.3, 60, 160], aviao: ['Voo direto', 1.25, 1.25, 50, 130] });
  L('londres', 'dublin', 'aviao', { balsa: ['Trem até Holyhead + balsa (SailRail)', 8, 9, 50, 75, VIA('Holyhead', 53.3095, -4.6310)], aviao: ['Voo direto', 1.4, 1.4, 30, 120] });
  L('londres', 'liverpool', 'trem', { trem: ['Avanti West Coast Euston → Lime Street (direto)', 2.1, 2.3, 30, 120], onibus: ['National Express direto', 5, 5.5, 10, 35], aviao: false });
  L('liverpool', 'dublin', 'balsa', { balsa: ['Balsa P&O Liverpool → Dublin', 8, 8.5, 40, 110], aviao: ['Voo direto', 1, 1, 25, 100] });
  L('paris', 'bruxelas', 'trem', { trem: ['Eurostar (antigo Thalys)', 1.4, 1.4, 30, 100], aviao: false });
  L('paris', 'amsterda', 'trem', { trem: ['Eurostar direto', 3.3, 3.4, 40, 140], aviao: ['Voo direto', 1.3, 1.3, 60, 140] });
  L('paris', 'luxemburgo', 'trem', { trem: ['TGV direto', 2.2, 2.3, 30, 90], aviao: false });
  L('paris', 'frankfurt', 'trem', { trem: ['ICE/TGV direto', 3.8, 4, 40, 130], aviao: ['Voo direto', 1.25, 1.25, 60, 150] });
  L('paris', 'colonia', 'trem', { trem: ['Eurostar direto (via Bruxelas)', 3.3, 3.4, 35, 120] });
  L('paris', 'nice', 'trem', { trem: ['TGV direto pela Provença', 5.8, 6, 35, 120], aviao: ['Voo direto', 1.5, 1.5, 50, 120] });
  L('paris', 'barcelona', 'aviao', { trem: ['TGV direto', 6.7, 6.9, 40, 140], aviao: ['Voo direto', 1.8, 1.8, 40, 120] });
  L('paris', 'milao', 'trem', { trem: ['TGV ou Frecciarossa pelos Alpes', 7, 7.3, 35, 120], aviao: ['Voo direto', 1.5, 1.5, 40, 120] });
  L('bruxelas', 'amsterda', 'trem', { trem: ['Eurostar (1h50) ou Intercity', 1.9, 2.8, 25, 80], aviao: false });
  L('bruxelas', 'bruges', 'trem', { trem: ['Intercity, a cada 30 min', 1, 1.1, 15, 18], aviao: false });
  L('bruxelas', 'luxemburgo', 'trem', { trem: ['Intercity direto', 3, 3.2, 20, 45], aviao: false });
  L('bruxelas', 'colonia', 'trem', { trem: ['ICE ou Eurostar', 1.8, 1.9, 25, 80], aviao: false });
  L('amsterda', 'colonia', 'trem', { trem: ['ICE direto', 2.7, 2.8, 25, 70], aviao: false });
  L('amsterda', 'berlim', 'trem', { trem: ['Intercity direto', 5.9, 6.3, 40, 110], aviao: ['Voo direto', 1.3, 1.3, 50, 130] });
  L('amsterda', 'frankfurt', 'trem', { trem: ['ICE direto', 3.9, 4.1, 35, 100] });
  L('amsterda', 'hamburgo', 'trem', { trem: ['Intercity + ICE (1 troca)', 5.2, 5.5, 40, 100] });
  L('nice', 'monaco', 'trem', { trem: ['Trem regional pela costa', 0.4, 0.4, 5, 6], onibus: ['Ônibus 600 pela orla', 0.75, 0.75, 2, 3], aviao: false });
  L('nice', 'milao', 'trem', { trem: ['Via Ventimiglia e Gênova', 4.8, 5.2, 25, 60], aviao: false });
  L('nice', 'barcelona', 'aviao', { trem: ['Via Marselha e Montpellier (2 trocas)', 9, 10, 50, 130], aviao: ['Voo direto', 1.25, 1.25, 40, 110] });

  /* Alemanha, Tchéquia e Áustria */
  L('colonia', 'frankfurt', 'trem', { trem: ['ICE pela linha de alta velocidade', 1.1, 1.3, 20, 60], aviao: false });
  L('colonia', 'hamburgo', 'trem', { trem: ['ICE/IC direto', 4, 4.1, 30, 90] });
  L('colonia', 'berlim', 'trem', { trem: ['ICE direto', 4.3, 4.6, 30, 100] });
  L('frankfurt', 'munique', 'trem', { trem: ['ICE direto', 3.2, 3.5, 30, 100] });
  L('frankfurt', 'berlim', 'trem', { trem: ['ICE direto', 3.9, 4.2, 30, 110] });
  L('frankfurt', 'hamburgo', 'trem', { trem: ['ICE direto', 3.6, 3.9, 30, 100] });
  L('frankfurt', 'zurique', 'trem', { trem: ['ICE direto via Basileia', 3.9, 4.1, 35, 100] });
  L('frankfurt', 'luxemburgo', 'trem', { trem: ['Via Koblenz e Trier (1–2 trocas)', 3.8, 4.3, 30, 60, VIA('Koblenz', 50.3506, 7.5886)], aviao: false });
  L('hamburgo', 'berlim', 'trem', { trem: ['ICE direto', 1.8, 2, 20, 60], aviao: false });
  L('hamburgo', 'copenhague', 'trem', { trem: ['Intercity direto pela Jutlândia', 4.6, 4.8, 35, 90], aviao: false });
  L('berlim', 'munique', 'trem', { trem: ['ICE Sprinter', 4, 4.5, 30, 110], aviao: ['Voo direto', 1.1, 1.1, 60, 150] });
  L('berlim', 'praga', 'trem', { trem: ['Eurocity pelo vale do Elba', 4, 4.3, 25, 60], aviao: false });
  L('praga', 'viena', 'trem', { trem: ['Railjet direto', 4, 4.2, 20, 50], aviao: false });
  L('praga', 'munique', 'trem', { trem: ['Trem direto (ALX) via Pilsen', 5.6, 5.9, 25, 60], onibus: ['Ônibus expresso', 4.8, 5, 20, 35], aviao: false });
  L('praga', 'bratislava', 'trem', { trem: ['Eurocity direto', 4.1, 4.3, 20, 45], aviao: false });
  L('praga', 'cracovia', 'trem', { trem: ['Direto (diurno ou noturno)', 6.8, 7.5, 25, 60, { noturno: true }], onibus: ['Ônibus direto', 7, 7.5, 20, 35] });
  L('praga', 'budapeste', 'trem', { trem: ['Eurocity direto via Bratislava', 6.7, 7, 25, 60] });
  L('munique', 'salzburgo', 'trem', { trem: ['Railjet ou regional (BRB)', 1.5, 1.8, 20, 40], aviao: false });
  L('munique', 'veneza', 'trem', { trem: ['Eurocity pelo passo do Brennero', 6.8, 7, 40, 90, VIA('Verona', 45.4287, 10.9826)] });
  L('salzburgo', 'viena', 'trem', { trem: ['Railjet ou Westbahn', 2.4, 2.5, 20, 55], aviao: false });
  L('salzburgo', 'liubliana', 'trem', { trem: ['Eurocity pelos Alpes (via Villach)', 4.2, 4.5, 25, 50], aviao: false });
  L('zurique', 'salzburgo', 'trem', { trem: ['Railjet pelo Arlberg (via Innsbruck)', 5.4, 5.6, 40, 90], aviao: false });
  L('viena', 'veneza', 'trem', { trem: ['Railjet diurno ou Nightjet (noturno)', 7.6, 11, 40, 90, { noturno: true }], aviao: ['Voo direto', 1.1, 1.1, 60, 150] });
  L('viena', 'liubliana', 'trem', { trem: ['Eurocity via Graz', 6, 6.2, 30, 60], aviao: false });
  L('viena', 'zagreb', 'trem', { trem: ['Eurocity via Graz e Maribor', 6.6, 7, 30, 60], aviao: false });

  /* Suíça e Liechtenstein */
  L('zurique', 'lucerna', 'trem', { trem: ['InterRegio, a cada 30 min', 0.75, 0.85, 15, 28], aviao: false });
  L('zurique', 'interlaken', 'trem', { trem: ['Intercity via Berna', 2, 2.1, 35, 75], aviao: false });
  L('zurique', 'vaduz', 'trem', { trem: ['Trem até Sargans + ônibus 11', 1.4, 1.6, 20, 40], aviao: false });
  L('zurique', 'milao', 'trem', { trem: ['Eurocity pelo túnel de São Gotardo', 3.3, 3.6, 30, 80], aviao: false });
  L('lucerna', 'interlaken', 'trem', { trem: ['Luzern–Interlaken Express (trem panorâmico)', 1.8, 2, 25, 38], aviao: false });
  L('lucerna', 'milao', 'trem', { trem: ['Eurocity via Arth-Goldau e Gotardo', 3.3, 3.6, 30, 75], aviao: false });
  L('interlaken', 'milao', 'trem', { trem: ['Via Spiez, Brig e túnel do Simplon', 3.2, 3.5, 35, 80], aviao: false });

  /* Itália */
  L('milao', 'veneza', 'trem', { trem: ['Frecciarossa ou Italo', 2.4, 2.6, 20, 60], aviao: false });
  L('milao', 'florenca', 'trem', { trem: ['Frecciarossa ou Italo', 1.9, 2, 25, 70], aviao: false });
  L('milao', 'roma', 'trem', { trem: ['Frecciarossa ou Italo', 3.2, 3.6, 30, 90], aviao: ['Voo direto', 1.2, 1.2, 50, 130] });
  L('florenca', 'veneza', 'trem', { trem: ['Frecciarossa ou Italo', 2.2, 2.3, 20, 60], aviao: false });
  L('florenca', 'roma', 'trem', { trem: ['Frecciarossa ou Italo', 1.5, 1.7, 20, 60], aviao: false });
  L('florenca', 'san-marino', 'trem', { trem: ['Trem até Rimini (via Bolonha) + ônibus', 3, 3.4, 25, 50, VIA('Bolonha', 44.5058, 11.3430)], aviao: false });
  L('veneza', 'san-marino', 'trem', { trem: ['Trem até Rimini (via Bolonha) + ônibus', 3.8, 4.3, 25, 55, VIA('Bolonha', 44.5058, 11.3430)], aviao: false });
  L('roma', 'napoles', 'trem', { trem: ['Frecciarossa ou Italo', 1.2, 1.3, 15, 50], aviao: false });
  L('veneza', 'liubliana', 'trem', { trem: ['Trem direto ou via Trieste', 3.9, 4.5, 20, 40], onibus: ['Ônibus direto', 3.5, 3.8, 15, 30], aviao: false });
  L('roma', 'valletta', 'aviao', { aviao: ['Voo direto', 1.5, 1.5, 40, 120] }, 'Malta é uma ilha: somente avião (ou balsa a partir da Sicília).');

  /* Península Ibérica e Andorra */
  L('madri', 'barcelona', 'trem', { trem: ['AVE, Iryo ou Ouigo', 2.6, 3.1, 30, 110], aviao: ['Ponte aérea', 1.3, 1.3, 40, 120] });
  L('madri', 'sevilha', 'trem', { trem: ['AVE ou Iryo', 2.6, 2.8, 30, 90], aviao: false });
  L('madri', 'granada', 'trem', { trem: ['AVE direto', 3.3, 3.5, 30, 80], aviao: false });
  L('sevilha', 'granada', 'trem', { trem: ['Avant direto', 2.5, 2.7, 25, 50], onibus: ['Ônibus direto', 3, 3, 20, 30], aviao: false });
  L('madri', 'lisboa', 'aviao', { onibus: ['Ônibus direto (há noturnos)', 7.5, 8.5, 25, 50, { noturno: true }], aviao: ['Voo direto', 1.3, 1.3, 40, 120] }, 'Não há trem direto entre Madri e Lisboa (de trem são 2–3 trocas e ~10h).');
  L('madri', 'porto', 'aviao', { onibus: ['Ônibus direto', 8, 9, 30, 50, { noturno: true }], aviao: ['Voo direto', 1.2, 1.2, 40, 120] });
  L('lisboa', 'porto', 'trem', { trem: ['Alfa Pendular ou Intercidades', 2.9, 3.3, 15, 45], onibus: ['Ônibus expresso', 3.5, 3.5, 8, 20], aviao: false });
  L('lisboa', 'sevilha', 'onibus', { onibus: ['Ônibus direto (há noturnos)', 6.5, 7.5, 25, 45, { noturno: true }], aviao: ['Voo direto', 1.1, 1.1, 50, 130] });
  L('barcelona', 'andorra', 'onibus', { onibus: ['Ônibus direto (Andbus/Direct Bus)', 3, 3.5, 30, 40], aviao: false }, 'Andorra não tem trem nem aeroporto — o acesso é de ônibus.');

  /* Países nórdicos e Bálticos */
  L('copenhague', 'estocolmo', 'trem', { trem: ['SJ de alta velocidade', 5.2, 5.5, 40, 100], aviao: ['Voo direto', 1.2, 1.2, 50, 130] });
  L('copenhague', 'oslo', 'aviao', { trem: ['Via Gotemburgo (1 troca)', 7.5, 8.2, 60, 110, VIA('Gotemburgo', 57.7089, 11.9730)], balsa: ['Balsa noturna (dorme a bordo)', 19, 19, 80, 200, { noturno: true }], aviao: ['Voo direto', 1.2, 1.2, 50, 130] });
  L('estocolmo', 'oslo', 'trem', { trem: ['SJ direto', 5.2, 6, 35, 90], aviao: ['Voo direto', 1, 1, 50, 130] });
  L('oslo', 'bergen', 'trem', { trem: ['Bergensbanen (um dos trens mais bonitos da Europa)', 6.8, 7.2, 35, 100, { noturno: true }], aviao: ['Voo direto', 0.9, 0.9, 50, 130] });
  L('estocolmo', 'helsinque', 'aviao', { balsa: ['Balsa noturna (dorme a bordo)', 16.5, 17.5, 50, 150, { noturno: true }], aviao: ['Voo direto', 1, 1, 50, 130] });
  L('estocolmo', 'tallinn', 'aviao', { balsa: ['Balsa noturna (dorme a bordo)', 16, 17, 40, 120, { noturno: true }], aviao: ['Voo direto', 1, 1, 50, 130] });
  L('estocolmo', 'riga', 'aviao', { balsa: ['Balsa noturna (dorme a bordo)', 17, 18, 40, 120, { noturno: true }], aviao: ['Voo direto', 1.1, 1.1, 50, 130] });
  L('helsinque', 'tallinn', 'balsa', { balsa: ['Balsa (Tallink, Viking ou Eckerö)', 2, 2.5, 20, 45], aviao: false });
  L('helsinque', 'rovaniemi', 'trem', { trem: ['Trem noturno “Santa Claus Express” (ou diurno, 8h)', 8, 12, 40, 110, { noturno: true }], aviao: ['Voo direto', 1.3, 1.3, 50, 150] });
  L('tallinn', 'riga', 'onibus', { onibus: ['Ônibus expresso (Lux Express)', 4.3, 4.6, 15, 30], aviao: ['Voo direto', 0.9, 0.9, 50, 120] }, 'De trem há uma troca em Valga e leva bem mais tempo que o ônibus.');
  L('riga', 'vilnius', 'trem', { trem: ['Trem direto (1 por dia)', 4.2, 4.4, 20, 30], onibus: ['Ônibus expresso', 4, 4.3, 15, 30], aviao: false });
  L('vilnius', 'cracovia', 'aviao', { trem: ['Via Varsóvia (1–2 trocas)', 12, 13.5, 50, 90, VIA('Varsóvia', 52.2297, 21.0122)], onibus: ['Ônibus noturno', 12, 13, 35, 55, { noturno: true }] });
  L('londres', 'reykjavik', 'aviao', { aviao: ['Voo direto', 3, 3.2, 60, 200] }, 'A Islândia só tem ligação por avião.');
  L('copenhague', 'reykjavik', 'aviao', { aviao: ['Voo direto', 3.2, 3.3, 70, 220] }, 'A Islândia só tem ligação por avião.');
  L('oslo', 'reykjavik', 'aviao', { aviao: ['Voo direto', 2.7, 2.8, 70, 220] }, 'A Islândia só tem ligação por avião.');
  L('amsterda', 'reykjavik', 'aviao', { aviao: ['Voo direto', 3.2, 3.3, 70, 220] }, 'A Islândia só tem ligação por avião.');
  L('dublin', 'reykjavik', 'aviao', { aviao: ['Voo direto', 2.6, 2.7, 60, 200] }, 'A Islândia só tem ligação por avião.');

  /* Eslovênia, Croácia e Bálcãs (quase tudo de ônibus) */
  L('liubliana', 'bled', 'onibus', { trem: ['Trem até Lesce-Bled + ônibus local', 0.9, 1.1, 6, 10], onibus: ['Ônibus direto, a cada hora', 1.2, 1.3, 7, 9], aviao: false });
  L('liubliana', 'zagreb', 'trem', { trem: ['Trem direto', 2.3, 2.5, 10, 25], onibus: ['Ônibus direto', 2.3, 2.5, 10, 20], aviao: false });
  L('zagreb', 'budapeste', 'trem', { trem: ['Trem direto', 5.8, 6.5, 20, 40], onibus: ['Ônibus direto', 4.8, 5, 20, 35], aviao: false });
  L('zagreb', 'split', 'onibus', { trem: ['Trem pendular (poucos por dia)', 6, 6.5, 15, 30], onibus: ['Ônibus pela autoestrada', 4.8, 5.5, 15, 30], aviao: ['Voo direto', 0.8, 0.8, 50, 120] });
  L('zagreb', 'belgrado', 'onibus', { onibus: ['Ônibus direto', 5.5, 6, 25, 40] }, 'Não há trem de passageiros entre Zagreb e Belgrado.');
  L('zagreb', 'sarajevo', 'onibus', { onibus: ['Ônibus direto', 7, 8, 25, 40], aviao: ['Voo direto', 0.8, 0.8, 60, 140] });
  L('split', 'dubrovnik', 'onibus', { onibus: ['Ônibus pela costa (cruza um trecho da Bósnia ou a ponte de Pelješac)', 4, 4.5, 18, 30], balsa: ['Catamarã (só na temporada, abr–out)', 4.5, 6, 40, 55], aviao: false });
  L('split', 'mostar', 'onibus', { onibus: ['Ônibus direto', 3.5, 4, 15, 25], aviao: false });
  L('dubrovnik', 'mostar', 'onibus', { onibus: ['Ônibus direto', 3, 3.5, 15, 25], aviao: false });
  L('dubrovnik', 'kotor', 'onibus', { onibus: ['Ônibus direto (a fronteira pode demorar no verão)', 2.2, 3, 20, 30], aviao: false });
  L('mostar', 'sarajevo', 'trem', { trem: ['Trem pelo vale do Neretva (2 por dia, muito bonito)', 2, 2.1, 6, 10], onibus: ['Ônibus direto', 2.5, 2.7, 10, 15], aviao: false });
  L('sarajevo', 'belgrado', 'onibus', { onibus: ['Ônibus direto', 7, 8, 25, 35], aviao: ['Voo direto', 0.8, 0.8, 60, 140] });
  L('belgrado', 'budapeste', 'onibus', { onibus: ['Ônibus direto', 5.5, 6.5, 20, 40], aviao: ['Voo direto', 1, 1, 60, 140] }, 'A linha de trem Budapeste–Belgrado está sendo reconstruída em alta velocidade; confira se já voltou a operar.');
  L('belgrado', 'sofia', 'onibus', { onibus: ['Ônibus direto', 6.5, 7.5, 25, 35], aviao: ['Voo direto', 1, 1, 60, 150] });
  L('belgrado', 'kotor', 'onibus', { onibus: ['Ônibus noturno (ou trem cênico até Bar + ônibus)', 10, 12, 25, 40, { noturno: true }], aviao: ['Voo direto até Tivat', 1, 1, 50, 130] });
  L('belgrado', 'prizren', 'onibus', { onibus: ['Ônibus via Pristina', 7.5, 9, 20, 30], aviao: false });
  L('kotor', 'tirana', 'onibus', { onibus: ['Ônibus via Podgorica e Shkodër', 5, 6, 25, 35], aviao: false });
  L('tirana', 'ohrid', 'onibus', { onibus: ['Ônibus ou van até Struga/Ohrid', 3, 3.5, 12, 20], aviao: false });
  L('tirana', 'prizren', 'onibus', { onibus: ['Ônibus pela autoestrada', 2.8, 3.2, 10, 15], aviao: false });
  L('tirana', 'atenas', 'aviao', { onibus: ['Ônibus noturno', 11, 13, 35, 50, { noturno: true }], aviao: ['Voo direto', 1.2, 1.2, 50, 140] });
  L('prizren', 'ohrid', 'onibus', { onibus: ['Ônibus via Skopje (1 troca)', 5, 6, 15, 25, VIA('Skopje', 41.9981, 21.4254)], aviao: false });
  L('ohrid', 'sofia', 'onibus', { onibus: ['Ônibus via Skopje (1 troca)', 7, 8, 25, 35, VIA('Skopje', 41.9981, 21.4254)], aviao: false });
  L('sofia', 'bucareste', 'onibus', { trem: ['Trem via Ruse (direto só no verão)', 9.5, 10.5, 25, 40], onibus: ['Ônibus direto', 6.5, 7.5, 25, 35], aviao: false });
  L('sofia', 'istambul', 'onibus', { trem: ['Sofia–Istambul Express (noturno, chega em Halkalı)', 10, 11.5, 25, 45, { noturno: true }], onibus: ['Ônibus direto (há noturnos)', 8, 9.5, 25, 35, { noturno: true }], aviao: ['Voo direto', 1.3, 1.3, 60, 160] });
  L('bucareste', 'brasov', 'trem', { trem: ['InterRegio pelos Cárpatos', 2.5, 2.8, 10, 20], aviao: false });
  L('bucareste', 'chisinau', 'onibus', { trem: ['Trem noturno “Prietenia”', 13, 14, 30, 50, { noturno: true }], onibus: ['Ônibus direto', 8, 9, 20, 30], aviao: ['Voo direto', 1.1, 1.1, 60, 150] });
  L('bucareste', 'istambul', 'aviao', { onibus: ['Ônibus direto (há noturnos)', 10, 12, 35, 50, { noturno: true }], aviao: ['Voo direto', 1.3, 1.3, 60, 160] });
  L('budapeste', 'bucareste', 'aviao', { trem: ['Trem noturno (Ister)', 15, 16, 40, 90, { noturno: true }], aviao: ['Voo direto', 1.4, 1.4, 50, 140] });
  L('budapeste', 'brasov', 'trem', { trem: ['Trem noturno pela Transilvânia', 12, 13.5, 35, 80, { noturno: true }] });

  /* Grécia, Chipre e Turquia */
  L('atenas', 'santorini', 'balsa', { balsa: ['Balsa do Pireu (rápida 5h, convencional 8h)', 5, 8, 45, 90], aviao: ['Voo direto', 0.8, 0.8, 50, 130] });
  L('atenas', 'istambul', 'aviao', { aviao: ['Voo direto', 1.4, 1.4, 60, 160] }, 'Sem trem entre a Grécia e a Turquia — somente avião (ou ônibus de ~14h).');
  L('atenas', 'pafos', 'aviao', { aviao: ['Voo direto', 1.8, 1.8, 50, 150] }, 'Chipre é uma ilha: somente avião.');

  // O trem Paris → Roma passa por Milão, que agora é uma cidade do mapa.
  const pr = D.legs.find(l => l.a === 'paris' && l.b === 'roma');
  if (pr && pr.trem) pr.trem.via = { cityId: 'milao' };

  /* ------------------------------------ áreas somente informativas (não selecionáveis) */
  D.infoAreas = [
    { pais: D.infoArea.pais, paisIso: D.infoArea.paisIso, aviso: 'País em guerra. Turismo suspenso.' },
    { pais: 'Rússia', paisIso: 643, aviso: 'Viagem não recomendada: sem voos diretos da UE e alertas consulares.' },
    { pais: 'Bielorrússia', paisIso: 112, aviso: 'Viagem não recomendada: sem voos diretos da UE e alertas consulares.' }
  ];

  /* ------------------------------------------------------- pontos de interesse
     DATA.ponto(cidade, id, nome, lat, lon, preço, duração em horas, wiki, site, tags, descrição, extras)
     Usada pelos arquivos data-pontos-*.js. O preço está na moeda da cidade (extras.cur troca);
     o rótulo é gerado ("Grátis", "~€15") ou vem de extras.label.
     extras: label, cur, nota, avisos [..], fechado [dias 0–6], horario [abre, fecha],
             ar (ao ar livre), bv [como chegar, custo ida e volta] (bate-volta) */
  D.ponto = function (cityId, id, nome, lat, lon, preco, duracaoH, wiki, site, tags, desc, x) {
    x = x || {};
    const cur = x.cur || cidade(cityId).moeda;
    let label = x.label;
    if (!label) {
      const sim = { EUR: '€', GBP: '£', CHF: 'CHF ', TRY: '₺' }[cur];
      label = !preco ? 'Grátis' : '~' + (sim ? sim + preco.toLocaleString('pt-BR') : preco.toLocaleString('pt-BR') + ' ' + cur);
    }
    const p = { id, cityId, nome, lat, lon, duracaoH, preco: { v: preco, cur, label }, wiki, site: site || '',
      tags: tags ? tags.split(',') : [], selecionado: false, desc };
    if (x.nota) p.nota = x.nota;
    if (x.avisos) p.avisos = x.avisos;
    if (x.fechado) p.fechado = x.fechado;
    if (x.horario) p.horario = { abre: x.horario[0], fecha: x.horario[1] };
    if (x.ar) p.arLivre = true;
    if (x.bv) { p.bateVolta = { desc: x.bv[0], custo: { v: x.bv[1], cur } }; if (p.tags.indexOf('Bate-volta') < 0) p.tags.push('Bate-volta'); }
    D.pois.push(p);
  };

  /* ------------------------------------------------ meios de transporte entre cidades */
  D.modos = ['trem', 'onibus', 'balsa', 'aviao'];              // ordem dos botões
  D.modosTerrestres = ['trem', 'onibus', 'balsa'];
})();
