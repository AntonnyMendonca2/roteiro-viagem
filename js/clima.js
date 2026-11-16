/* ==========================================================================
   clima.js — Feature 4: clima e luz do dia em cada data.

   - Histórico: Open-Meteo Archive (sem chave). Baixa 10 anos de dados diários
     de uma cidade UMA vez e reduz a uma "climatologia" por dia do ano (média
     móvel de ±3 dias). Assim, mudar as datas do roteiro não exige nova busca.
     Cache: 30 dias.
   - Previsão real: Open-Meteo Forecast, quando a data está a até 16 dias.
     Cache: 3 horas.
   - Nascer e pôr do sol: calculados localmente (fórmula da NOAA).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA, Net = window.Net;
  const A = () => window.App;
  const Clima = window.Clima = {};
  const ARQ = 'https://archive-api.open-meteo.com/v1/archive';
  const PREV = 'https://api.open-meteo.com/v1/forecast';
  const TTL_HIST = 30 * Net.DIA, TTL_PREV = 3 * Net.HORA;
  const JANELA = 3;              // média móvel: ±3 dias

  /* ============================================================ funções puras */
  // Índice do dia no ano (0–365), sempre contando 29/02 — assim a mesma data cai no mesmo índice todo ano.
  const ACUM = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  Clima.indice = (mes, dia) => ACUM[mes - 1] + dia - 1;
  Clima.indiceIso = iso => Clima.indice(+iso.slice(5, 7), +iso.slice(8, 10));

  // Resposta do Archive (daily) → climatologia { tx, tn, pc, pn } com 366 posições.
  // tx/tn: média das máximas/mínimas (°C) · pc: % de dias com mais de 1 mm · pn: % de dias com neve
  Clima.reduzir = function (daily) {
    const n = 366, soma = k => new Float64Array(n);
    const sTx = soma(), sTn = soma(), sPc = soma(), sPn = soma(), cT = soma(), cP = soma();
    const t = (daily && daily.time) || [];
    for (let i = 0; i < t.length; i++) {
      const k = Clima.indiceIso(t[i]);
      const tx = daily.temperature_2m_max[i], tn = daily.temperature_2m_min[i];
      const ch = daily.precipitation_sum ? daily.precipitation_sum[i] : null, nv = daily.snowfall_sum ? daily.snowfall_sum[i] : null;
      if (tx != null && tn != null) { sTx[k] += tx; sTn[k] += tn; cT[k]++; }
      if (ch != null) { sPc[k] += ch > 1 ? 1 : 0; sPn[k] += nv > 0 ? 1 : 0; cP[k]++; }
    }
    const out = { tx: [], tn: [], pc: [], pn: [] };
    for (let k = 0; k < n; k++) {
      let a = 0, b = 0, c = 0, d = 0, nt = 0, np = 0;
      for (let j = -JANELA; j <= JANELA; j++) {
        const i = (k + j + n) % n;
        a += sTx[i]; b += sTn[i]; nt += cT[i]; c += sPc[i]; d += sPn[i]; np += cP[i];
      }
      out.tx.push(nt ? Math.round(a / nt * 10) / 10 : null);
      out.tn.push(nt ? Math.round(b / nt * 10) / 10 : null);
      out.pc.push(np ? Math.round(c / np * 100) : null);
      out.pn.push(np ? Math.round(d / np * 100) : null);
    }
    return out;
  };

  // Ícone do dia a partir das probabilidades e temperaturas.
  Clima.icone = function (d) {
    if (!d) return '';
    if (d.pn >= 30 && d.tn <= 1) return 'neve';
    if (d.pc >= 50) return 'chuva';
    if (d.pc >= 28) return 'nuvem';
    return 'sol';
  };

  // Nascer e pôr do sol (fórmula da NOAA). Devolve minutos em UTC a partir da meia-noite
  // da data e as horas de luz. polar: 'noite' (sol não nasce) ou 'dia' (sol não se põe).
  Clima.solUTC = function (lat, lon, date) {
    const rad = Math.PI / 180;
    const ini = Date.UTC(date.getUTCFullYear(), 0, 1);
    const N = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - ini) / 86400000) + 1;
    const g = 2 * Math.PI / 365 * (N - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) -
      0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
    if (cosH > 1) return { polar: 'noite', luzH: 0 };
    if (cosH < -1) return { polar: 'dia', luzH: 24 };
    const ha = Math.acos(cosH) / rad;
    const nascer = 720 - 4 * (lon + ha) - eq, por = 720 - 4 * (lon - ha) - eq;
    return { nascer, por, luzH: (por - nascer) / 60 };
  };

  // Hora local (decimal, ex.: 18.5 = 18h30) de um instante, no fuso da cidade.
  function horaLocal(ms, tz) {
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
      const h = +p.find(x => x.type === 'hour').value, m = +p.find(x => x.type === 'minute').value;
      return h + m / 60;
    } catch (e) { return null; }
  }

  // Sol de um dia em hora local: { nascerH, porH, luzH, polar }.
  Clima.sol = function (lat, lon, date, tz) {
    const s = Clima.solUTC(lat, lon, date);
    if (s.polar) return s;
    const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    let nascerH = tz ? horaLocal(base + s.nascer * 60000, tz) : null, porH = tz ? horaLocal(base + s.por * 60000, tz) : null;
    if (nascerH == null || porH == null) {            // sem fuso conhecido: aproxima pelo meridiano
      const off = Math.round(lon / 15);
      nascerH = ((s.nascer / 60 + off) % 24 + 24) % 24; porH = ((s.por / 60 + off) % 24 + 24) % 24;
    }
    return { nascerH, porH, luzH: s.luzH };
  };

  const hhmm = h => { let m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  Clima.hhmm = hhmm;

  // Lista "o que levar" a partir do resumo da viagem (mínima, máxima, chuva, neve).
  Clima.listaLevar = function (r) {
    const itens = [];
    if (!r || r.tmin == null) return itens;
    if (r.tmin < 0) itens.push('luvas', 'gorro', 'segunda pele (térmica)', 'casaco pesado');
    else if (r.tmin < 6) itens.push('casaco quente', 'cachecol', 'gorro');
    else if (r.tmin < 13) itens.push('jaqueta ou moletom');
    if (r.neve >= 20) itens.push('calçado impermeável');
    if (r.chuva >= 35) itens.push('guarda-chuva ou capa de chuva');
    if (r.tmax >= 26) itens.push('protetor solar', 'roupas leves');
    return itens;
  };

  /* ==================================================================== rede */
  const fusoDe = c => (D.fusos && D.fusos[c.paisIso]) || null;
  const chaveHist = c => 'clima:h:' + c.id;
  const pedidos = {};

  // Climatologia da cidade (do cache ou da rede).
  Clima.get = function (cityId) {
    const c = A().city(cityId);
    if (!c) return Promise.reject(new Error('cidade'));
    const ano = new Date().getUTCFullYear();
    const url = ARQ + '?latitude=' + c.lat + '&longitude=' + c.lon + '&start_date=' + (ano - 10) + '-01-01&end_date=' + (ano - 1) + '-12-31' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=auto';
    return Net.getJSON(url, { fila: 'clima', ttl: TTL_HIST, chave: chaveHist(c), timeout: 30000,
      reduzir: j => Object.assign(Clima.reduzir(j.daily), { tz: j.timezone || null }) }).then(r => r.data);
  };

  // Previsão real dos próximos 16 dias (só quando alguma data da cidade está nesse intervalo).
  Clima.getPrevisao = function (cityId) {
    const c = A().city(cityId);
    const url = PREV + '?latitude=' + c.lat + '&longitude=' + c.lon +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum&forecast_days=16&timezone=auto';
    return Net.getJSON(url, { fila: 'clima', ttl: TTL_PREV, chave: 'clima:p:' + c.id, reduzir: j => j.daily || null }).then(r => r.data);
  };

  const hist = id => Net.peek('clima:h:' + id);            // mesmo vencido serve (offline)
  const prev = id => Net.peek('clima:p:' + id, TTL_PREV * 4);

  /* ================================================= consultas (síncronas) */
  // Clima de uma cidade em uma data: previsão real se houver, senão a média histórica.
  Clima.dia = function (cityId, date) {
    const iso = A().iso(date), p = prev(cityId);
    if (p && p.time) {
      const i = p.time.indexOf(iso);
      if (i >= 0 && p.temperature_2m_max[i] != null) {
        const d = { tx: p.temperature_2m_max[i], tn: p.temperature_2m_min[i], pc: p.precipitation_probability_max[i] || 0,
          pn: p.snowfall_sum && p.snowfall_sum[i] > 0 ? 100 : 0, previsao: true };
        d.icone = Clima.icone(d);
        return d;
      }
    }
    const h = hist(cityId);
    if (!h) return null;
    const k = Clima.indiceIso(iso);
    if (h.tx[k] == null) return null;
    const d = { tx: h.tx[k], tn: h.tn[k], pc: h.pc[k], pn: h.pn[k], previsao: false };
    d.icone = Clima.icone(d);
    return d;
  };

  // Resumo de um conjunto de datas na cidade.
  Clima.resumo = function (cityId, datas) {
    const c = A().city(cityId), ds = datas.map(d => Clima.dia(cityId, d)).filter(Boolean);
    if (!ds.length) return null;
    const media = f => ds.reduce((s, d) => s + f(d), 0) / ds.length;
    const h = hist(cityId), tz = (h && h.tz) || fusoDe(c);
    const sois = datas.map(d => Clima.sol(c.lat, c.lon, d, tz));
    const meio = sois[Math.floor(sois.length / 2)];
    return {
      tmin: media(d => d.tn), tmax: media(d => d.tx), minAbs: Math.min.apply(null, ds.map(d => d.tn)), maxAbs: Math.max.apply(null, ds.map(d => d.tx)),
      chuva: media(d => d.pc), neve: media(d => d.pn), previsao: ds.some(d => d.previsao),
      luzH: sois.reduce((s, x) => s + x.luzH, 0) / sois.length, sol: meio
    };
  };

  // Pôr do sol (hora local decimal) de uma cidade em uma data — usado pelo dia a dia.
  Clima.porDoSol = function (cityId, date) {
    const c = A().city(cityId), h = hist(cityId);
    const s = Clima.sol(c.lat, c.lon, date, (h && h.tz) || fusoDe(c));
    return s.polar ? (s.polar === 'dia' ? 24 : 0) : s.porH;
  };

  // Datas usadas para uma cidade: a estadia, ou (fora do roteiro) o período da viagem inteira.
  Clima.datasDe = function (cityId) {
    const App = A(), dias = App.cityDays(cityId);
    if (dias.length) return { datas: dias, estadia: true };
    const segs = App.calc.segs, out = [];
    if (segs.length) for (let d = segs[0].start; d <= segs[segs.length - 1].start; d = App.addDays(d, 1)) out.push(d);
    else { const s = App.parseDate(App.state.dataSaida); for (let i = 0; i < 10; i++) out.push(App.addDays(s, i)); }
    return { datas: out, estadia: false };
  };

  // Resumo da viagem inteira (para a lista "o que levar").
  Clima.viagem = function () {
    const App = A();
    let tmin = null, tmax = null, chuva = 0, neve = 0, n = 0, ondeMin = '';
    App.calc.route.forEach(id => {
      const r = Clima.resumo(id, App.cityDays(id));
      if (!r) return;
      if (tmin == null || r.minAbs < tmin) { tmin = r.minAbs; ondeMin = App.city(id).nome; }
      if (tmax == null || r.maxAbs > tmax) tmax = r.maxAbs;
      chuva = Math.max(chuva, r.chuva); neve = Math.max(neve, r.neve); n++;
    });
    return n ? { tmin, tmax, chuva, neve, ondeMin, cidades: n } : null;
  };

  /* ============================================================== carregamento */
  // Busca o clima das cidades do roteiro (e da cidade aberta) que ainda não estão no cache.
  Clima.carregar = function () {
    const App = A(), hoje = Date.now();
    const ids = App.calc.route.concat(App.calc.bvs.map(b => b.cityId));
    if (App.focus && App.focus.type === 'city' && ids.indexOf(App.focus.id) < 0) ids.push(App.focus.id);
    ids.forEach(id => {
      const temH = !!Net.peek('clima:h:' + id, TTL_HIST);
      const dias = Clima.datasDe(id).datas;
      const perto = dias.some(d => d.getTime() - hoje < 16 * 86400000 && d.getTime() - hoje > -86400000);
      const temP = !perto || !!Net.peek('clima:p:' + id, TTL_PREV);
      if ((temH && temP) || pedidos[id]) return;
      pedidos[id] = true;
      const ps = [];
      if (!temH) ps.push(Clima.get(id));
      if (!temP) ps.push(Clima.getPrevisao(id));
      Promise.all(ps.map(p => p.catch(() => null))).then(rs => {
        setTimeout(() => { delete pedidos[id]; }, 60000);        // em caso de erro, só tenta de novo depois de 1 min
        if (rs.some(Boolean)) agendarRender();
      });
    });
  };

  let renderTimer = null;
  function agendarRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => { if (A().calc) window.UI.climaChegou(); }, 150);
  }

  /* ================================================================= interface */
  const esc = s => window.UI.esc(s);
  const grau = v => (Math.round(v) + '°').replace('-', '−');

  // Ícones monocromáticos 24×24 (traço simples).
  const ICO = {
    sol: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    nuvem: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.6 4.5 4.5 0 0 0 7 18.5z"/>',
    chuva: '<path d="M7 15h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 6.1 4.5 4.5 0 0 0 7 15z"/><path d="M8.5 18l-1 3M12.5 18l-1 3M16.5 18l-1 3"/>',
    neve: '<path d="M7 14.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 5.6a4.5 4.5 0 0 0 0 8.9z"/><path d="M8 18.5h.01M12 18.5h.01M16 18.5h.01M10 21.5h.01M14 21.5h.01"/>'
  };
  const NOME = { sol: 'tempo firme', nuvem: 'nublado, pode chover', chuva: 'chuva provável', neve: 'pode nevar' };
  Clima.svg = (nome, cls) => '<svg class="wx ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICO[nome] || '') + '</svg>';

  // Trecho dentro do botão do dia na linha do tempo.
  Clima.tlHtml = function (cityId, date) {
    const d = cityId ? Clima.dia(cityId, date) : null;
    if (!d) return { html: '', titulo: '' };
    return {
      html: '<span class="tl-wx">' + Clima.svg(d.icone) + grau(d.tn) + '/' + grau(d.tx) + '</span>',
      titulo: (d.previsao ? 'Previsão: ' : 'Típico: ') + grau(d.tn) + ' a ' + grau(d.tx) + ', ' + NOME[d.icone] + (d.previsao ? '' : ' (chuva em ' + d.pc + '% dos anos)')
    };
  };

  // Bloco "Clima nas suas datas" do painel da cidade.
  Clima.cityHtml = function (c) {
    const info = Clima.datasDe(c.id), r = Clima.resumo(c.id, info.datas);
    const F = window.Fmt, ini = info.datas[0], fim = info.datas[info.datas.length - 1];
    let html = '<h4>Clima nas suas datas <small>' + (info.estadia ? '' : 'período da viagem · ') + F.data(ini) + ' – ' + F.data(fim) + '</small></h4>';
    if (!r) {
      return html + '<p class="muted wx-wait">' + (Net.online() ? 'Buscando o histórico do clima…' : 'Sem internet: o clima aparece quando a conexão voltar.') + '</p>';
    }
    const sol = r.sol;
    const cel = (rot, val, sub) => '<div class="wx-cell"><span>' + rot + '</span><b>' + val + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    html += '<div class="wx-grid">' +
      cel('Mínima média', grau(r.tmin), 'mais fria: ' + grau(r.minAbs)) +
      cel('Máxima média', grau(r.tmax), 'mais quente: ' + grau(r.maxAbs)) +
      cel('Chance de chuva', Math.round(r.chuva) + '%', r.previsao ? 'previsão' : 'dias com mais de 1 mm') +
      cel('Chance de neve', Math.round(r.neve) + '%', r.previsao ? 'previsão' : 'dias com neve') +
      cel('Luz do dia', sol.polar ? (sol.polar === 'dia' ? '24h' : '0h') : F.horas(r.luzH), sol.polar ? (sol.polar === 'dia' ? 'sol da meia-noite' : 'noite polar') : 'nasce às ' + hhmm(sol.nascerH)) +
      cel('Pôr do sol', sol.polar ? '—' : hhmm(sol.porH), 'hora local') + '</div>';
    html += '<div class="wx-days">' + info.datas.slice(0, 14).map(d => {
      const x = Clima.dia(c.id, d);
      return x ? '<div class="wx-day" title="' + esc(Clima.tlHtml(c.id, d).titulo) + '"><i>' + F.dow(d) + '</i>' + Clima.svg(x.icone) + '<b>' + grau(x.tx) + '</b><small>' + grau(x.tn) + '</small></div>' : '';
    }).join('') + '</div>';
    html += '<p class="muted">' + (r.previsao ? 'Inclui a previsão real para as datas próximas. ' : 'Médias dos últimos 10 anos nessas datas — não é previsão. ') + 'Fonte: Open-Meteo.</p>';
    return html;
  };

  // Lista "O que levar" (aba Orçamento, junto de "Roupas de frio").
  Clima.levarHtml = function () {
    const v = Clima.viagem();
    if (!v) return '';
    const itens = Clima.listaLevar(v);
    if (!itens.length) return '';
    return '<div class="pack"><b>O que levar</b><p>Pelas datas do roteiro, a mínima típica chega a <b>' + grau(v.tmin) + '</b> em ' + esc(v.ondeMin) +
      (v.chuva >= 35 ? ' e chove em ~' + Math.round(v.chuva) + '% dos dias na cidade mais chuvosa' : '') + '.</p>' +
      '<ul>' + itens.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' +
      '<small>Sugestão para o item “Roupas de frio” acima — dá para comprar parte na viagem (Primark, Uniqlo, Decathlon).</small></div>';
  };
})();
