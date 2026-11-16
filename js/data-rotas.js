/* ==========================================================================
   data-rotas.js — destinos diretos de cada aeroporto de saída.
   GERADO por scripts/rotas.mjs (npm run rotas) em 2026-11-16, a partir da tabela
   "Airlines and destinations" da Wikipedia. Não edite à mão: rode o script de novo.
   Formato: aeroportos[SIGLA][cidade] = { cias: [companhias], sazonal: true|false }
   O site atualiza em segundo plano o aeroporto escolhido (js/rotas.js).
   ========================================================================== */
window.DATA.rotas = {
  atualizado: '2026-11-16',
  aeroportos: {
    BEL: {"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    BSB: {"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    CNF: {"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    FLN: {"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    FOR: {"paris":{"cias":["Air France"],"sazonal":false},"madri":{"cias":["Iberia"],"sazonal":false},"lisboa":{"cias":["LATAM Brasil","TAP Air Portugal"],"sazonal":false}},
    GIG: {"paris":{"cias":["Air France"],"sazonal":false},"londres":{"cias":["British Airways"],"sazonal":false},"lisboa":{"cias":["Gol Linhas Aéreas","TAP Air Portugal"],"sazonal":false},"madri":{"cias":["Iberia"],"sazonal":false},"roma":{"cias":["ITA Airways"],"sazonal":false},"amsterda":{"cias":["KLM"],"sazonal":false},"frankfurt":{"cias":["Lufthansa"],"sazonal":false},"porto":{"cias":["TAP Air Portugal"],"sazonal":false}},
    GRU: {"madri":{"cias":["Air China","Air Europa","Iberia","LATAM Brasil"],"sazonal":false},"paris":{"cias":["Air France","LATAM Brasil"],"sazonal":false},"londres":{"cias":["British Airways","LATAM Brasil"],"sazonal":false},"roma":{"cias":["ITA Airways","LATAM Brasil"],"sazonal":false},"amsterda":{"cias":["KLM","LATAM Brasil"],"sazonal":false},"barcelona":{"cias":["LATAM Brasil"],"sazonal":false},"bruxelas":{"cias":["LATAM Brasil"],"sazonal":false},"frankfurt":{"cias":["LATAM Brasil","Lufthansa"],"sazonal":false},"lisboa":{"cias":["LATAM Brasil","TAP Air Portugal"],"sazonal":false},"milao":{"cias":["LATAM Brasil"],"sazonal":false},"munique":{"cias":["Lufthansa"],"sazonal":false},"zurique":{"cias":["Swiss International Air Lines"],"sazonal":false},"porto":{"cias":["TAP Air Portugal"],"sazonal":false},"istambul":{"cias":["Turkish Airlines"],"sazonal":false}},
    MAO: {"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    NAT: {"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    POA: {"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    REC: {"madri":{"cias":["Azul Brazilian Airlines","Iberia"],"sazonal":false},"porto":{"cias":["Azul Brazilian Airlines"],"sazonal":false},"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    SSA: {"madri":{"cias":["Air Europa"],"sazonal":false},"paris":{"cias":["Air France"],"sazonal":false},"lisboa":{"cias":["TAP Air Portugal"],"sazonal":false}},
    VCP: {"lisboa":{"cias":["Azul Brazilian Airlines"],"sazonal":false},"madri":{"cias":["Azul Brazilian Airlines"],"sazonal":false},"porto":{"cias":["Azul Brazilian Airlines"],"sazonal":false}}
  }
};
