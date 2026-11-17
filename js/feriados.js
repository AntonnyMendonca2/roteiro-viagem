/* ==========================================================================
   feriados.js — feriados nacionais e fechamentos nas datas do roteiro.

   - Fonte: Nager.Date (https://date.nager.at), grátis, sem chave, chamada direto
     do navegador. Uma consulta por país e ano, guardada por 30 dias.
   - Só feriados NACIONAIS: o app não sabe a região de cada cidade, e os
     regionais (ex.: metade dos da Alemanha) dariam alarme falso.
   - Domingo: em alguns países quase todo o comércio fecha (inclusive
     supermercados) — aviso fixo, sem consulta.
   Onde aparece: linha do tempo (marca no dia), painel da cidade ("Feriados e
   fechamentos"), cabeçalho do dia a dia e aviso no ponto com visita fixada
   num feriado (App.poiWarn).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const Net = window.Net;
  const Feriados = window.Feriados = {};
  const TTL = 30 * Net.DIA;
  const API = 'https://date.nager.at/api/v3/PublicHolidays/';

  // Código ISO numérico (DATA.cities[].paisIso) → sigla de 2 letras usada pela API.
  Feriados.SIGLA = { 8: 'AL', 20: 'AD', 40: 'AT', 56: 'BE', 70: 'BA', 100: 'BG', 191: 'HR', 196: 'CY', 203: 'CZ', 208: 'DK', 233: 'EE', 246: 'FI',
    250: 'FR', 276: 'DE', 300: 'GR', 348: 'HU', 352: 'IS', 372: 'IE', 380: 'IT', 383: 'XK', 428: 'LV', 438: 'LI', 440: 'LT', 442: 'LU', 470: 'MT',
    492: 'MC', 498: 'MD', 499: 'ME', 528: 'NL', 578: 'NO', 616: 'PL', 620: 'PT', 642: 'RO', 674: 'SM', 688: 'RS', 703: 'SK', 705: 'SI', 724: 'ES',
    752: 'SE', 756: 'CH', 792: 'TR', 807: 'MK', 826: 'GB' };

  // Países onde, aos domingos, a maioria das lojas (inclusive supermercados) fecha.
  Feriados.DOMINGO = { DE: 1, AT: 1, CH: 1, PL: 1, NO: 1, HR: 1 };

  // Nomes em português dos feriados mais comuns (a API traz o nome local e em inglês).
  const PT = {
    "New Year's Day": 'Ano-Novo', 'Epiphany': 'Dia de Reis', 'Good Friday': 'Sexta-feira Santa', 'Holy Saturday': 'Sábado de Aleluia',
    'Easter Sunday': 'Domingo de Páscoa', 'Easter Monday': 'Segunda-feira de Páscoa', 'Labour Day': 'Dia do Trabalho', 'May Day': 'Dia do Trabalho',
    'Ascension Day': 'Ascensão', 'Whit Sunday': 'Pentecostes', 'Pentecost': 'Pentecostes', 'Whit Monday': 'Segunda-feira de Pentecostes',
    'Corpus Christi': 'Corpus Christi', 'Assumption Day': 'Assunção de Nossa Senhora', 'Assumption of Mary': 'Assunção de Nossa Senhora',
    "All Saints' Day": 'Todos os Santos', 'Immaculate Conception': 'Imaculada Conceição', 'Christmas Eve': 'Véspera de Natal',
    'Christmas Day': 'Natal', "St. Stephen's Day": 'Santo Estêvão', 'Boxing Day': 'Boxing Day (26/12)', "New Year's Eve": 'Véspera de Ano-Novo',
    'Armistice Day': 'Armistício', 'Victory in Europe Day': 'Dia da Vitória', 'National Day': 'Dia Nacional', 'Independence Day': 'Dia da Independência',
    'Liberation Day': 'Dia da Libertação', 'Constitution Day': 'Dia da Constituição', 'Republic Day': 'Dia da República', 'Republic Day ': 'Dia da República',
    'Early May Bank Holiday': 'Feriado bancário de maio', 'Spring Bank Holiday': 'Feriado bancário de primavera', 'Summer Bank Holiday': 'Feriado bancário de verão',
    "King's Day": 'Dia do Rei', "St. Patrick's Day": 'Dia de São Patrício', 'German Unity Day': 'Dia da Unidade Alemã', 'Bastille Day': 'Queda da Bastilha',
    'Swiss National Day': 'Dia Nacional Suíço', 'Midsummer Eve': 'Véspera do Solstício', 'Midsummer Day': 'Solstício de verão'
  };
  const nomePt = h => PT[h.name] || h.name || h.localName;

  /* ------------------------------------------------------------- dados */
  const sigla = cityId => { const c = A().city(cityId); return c ? Feriados.SIGLA[c.paisIso] || '' : ''; };
  const chave = (cc, ano) => 'feriados:' + cc + ':' + ano;

  // Resposta da API → só os nacionais, enxutos: [{ d: 'AAAA-MM-DD', nome, local }]
  Feriados.reduzir = function (json) {
    return (Array.isArray(json) ? json : []).filter(h => h && h.global && /^\d{4}-\d{2}-\d{2}$/.test(h.date))
      .map(h => ({ d: h.date, nome: nomePt(h), local: h.localName || '' }));
  };

  function lista(cc, ano) { const c = Net.cacheGet(chave(cc, ano)); return c && Array.isArray(c.v) ? c.v : null; }

  // Feriado nacional na cidade nesta data → { d, nome, local } ou null.
  Feriados.doDia = function (cityId, date) {
    const cc = sigla(cityId);
    if (!cc || !date) return null;
    const iso = A().iso(date), l = lista(cc, iso.slice(0, 4));
    return (l && l.find(h => h.d === iso)) || null;
  };

  // Comércio fechado aos domingos neste país?
  Feriados.domingoFechado = cityId => !!Feriados.DOMINGO[sigla(cityId)];

  // Feriados e domingos "fechados" da estadia (dias da cidade no roteiro).
  Feriados.daEstadia = function (cityId) {
    const App = A(), dias = App.cityDays(cityId) || [];
    return {
      feriados: dias.map(d => { const f = Feriados.doDia(cityId, d); return f ? { date: d, f } : null; }).filter(Boolean),
      domingos: Feriados.domingoFechado(cityId) ? dias.filter(d => d.getUTCDay() === 0) : []
    };
  };

  /* ------------------------------------------------------- carregamento */
  const pedidos = {};
  // Busca os feriados dos países e anos do roteiro (e da cidade aberta) que ainda não estão guardados.
  Feriados.carregar = function () {
    const App = A();
    if (!App.calc) return;
    const ids = App.calc.route.concat(App.calc.bvs.map(b => b.cityId));
    if (App.focus && App.focus.type === 'city' && ids.indexOf(App.focus.id) < 0) ids.push(App.focus.id);
    const quer = {};
    ids.forEach(id => {
      const cc = sigla(id);
      if (!cc) return;
      (App.cityDays(id) || []).forEach(d => { quer[cc + ':' + d.getUTCFullYear()] = [cc, d.getUTCFullYear()]; });
    });
    Object.keys(quer).forEach(k => {
      const [cc, ano] = quer[k], c = Net.cacheGet(chave(cc, ano));
      if ((c && Date.now() - c.t < TTL) || pedidos[k]) return;
      pedidos[k] = true;
      Net.getJSON(API + ano + '/' + cc, { fila: 'feriados', ttl: TTL, chave: chave(cc, ano), reduzir: Feriados.reduzir, timeout: 12000 })
        .then(() => agendarRender())
        .catch(() => { setTimeout(() => { delete pedidos[k]; }, 10 * 60000); });   // país sem dados ou sem internet: tenta mais tarde
    });
  };
  let timer = null;
  function agendarRender() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (A().calc && window.UI && window.UI.climaChegou) window.UI.climaChegou(); }, 200);
  }

  /* ------------------------------------------------------------ interface */
  const esc = s => window.UI.esc(s);
  const dataTxt = d => window.Fmt.dow(d) + ', ' + window.Fmt.data(d);
  const nomeLocal = f => (f.local && f.local !== f.nome ? ' <small>(' + esc(f.local) + ')</small>' : '');

  // Seção do painel da cidade (vazia se não houver nada a avisar).
  Feriados.cityHtml = function (c) {
    const e = Feriados.daEstadia(c.id);
    if (!e.feriados.length && !e.domingos.length) return '';
    let h = '<h4>Feriados e fechamentos</h4><ul class="fer-lista">';
    e.feriados.forEach(x => {
      h += '<li><b>' + dataTxt(x.date) + '</b> · ' + esc(x.f.nome) + nomeLocal(x.f) +
        '<small>Feriado nacional: museus, lojas e transporte podem fechar ou ter horário reduzido.</small></li>';
    });
    if (e.domingos.length) {
      h += '<li><b>' + e.domingos.map(dataTxt).join(' e ') + '</b> · domingo' +
        '<small>Em ' + esc(A().city(c.id).pais) + ' a maioria das lojas, inclusive supermercados, fecha aos domingos. Compre o que precisar no sábado.</small></li>';
    }
    return h + '</ul>';
  };

  // Marca no botão do dia da linha do tempo → { cls, titulo }
  Feriados.tl = function (cityId, date) {
    const f = cityId ? Feriados.doDia(cityId, date) : null;
    return f ? { cls: ' fer', titulo: 'Feriado: ' + f.nome } : { cls: '', titulo: '' };
  };

  // Linha no cabeçalho do dia a dia.
  Feriados.diaHtml = function (cityId, date) {
    const f = Feriados.doDia(cityId, date);
    return f ? '<p class="dd-fer">Feriado: ' + esc(f.nome) + ' — confira os horários antes de sair.</p>' : '';
  };

  // Para os testes.
  Feriados._t = { chave, nomePt, pedidos };
})();
