/* ==========================================================================
   data-futebol.js — Feature 7: clubes das cidades e jogos cadastrados à mão.

   COMO EDITAR
   - Clube novo:  K('cidade', 'id-do-clube', 'Nome', 'Estádio', lat, lon, 'Liga',
                    'link do calendário', 'link dos ingressos', { poi: 'id do tour', fd: nº })
       poi = id do ponto de interesse (tour do estádio) ligado ao clube, se existir
       fd  = número do time na football-data.org (só usado com o proxy opcional;
             veja "Jogos automáticos" no README)
   - Jogo:  adicione em DATA.jogos (exemplo no fim do arquivo). Também dá para
     cadastrar jogos pela interface (painel da cidade → Futebol → Adicionar jogo).

   Os links são dos sites oficiais dos clubes: confira datas e ingressos lá —
   as tabelas mudam por causa da TV e das copas.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA;

  D.clubes = [];
  function K(cityId, id, nome, estadio, lat, lon, liga, calendario, ingressos, extra) {
    D.clubes.push(Object.assign({ id, cityId, nome, estadio, lat, lon, liga, calendario, ingressos, poi: null, fd: null }, extra || {}));
  }

  /* ----------------------------------------------------------- Reino Unido */
  K('londres', 'arsenal', 'Arsenal', 'Emirates Stadium', 51.5549, -0.1084, 'Premier League',
    'https://www.arsenal.com/fixtures', 'https://www.arsenal.com/tickets', { poi: 'emirates-stadium', fd: 57 });
  K('londres', 'chelsea', 'Chelsea', 'Stamford Bridge', 51.4817, -0.1910, 'Premier League',
    'https://www.chelseafc.com/en/matches/mens-fixtures-and-results', 'https://www.chelseafc.com/en/tickets', { poi: 'stamford-bridge', fd: 61 });
  K('londres', 'tottenham', 'Tottenham Hotspur', 'Tottenham Hotspur Stadium', 51.6043, -0.0664, 'Premier League',
    'https://www.tottenhamhotspur.com/fixtures/men/', 'https://www.tottenhamhotspur.com/tickets/', { fd: 73 });
  K('londres', 'west-ham', 'West Ham United', 'London Stadium', 51.5387, -0.0166, 'Premier League',
    'https://www.whufc.com/fixtures', 'https://www.whufc.com/tickets', { fd: 563 });
  K('liverpool', 'liverpool-fc', 'Liverpool', 'Anfield', 53.4308, -2.9608, 'Premier League',
    'https://www.liverpoolfc.com/fixtures', 'https://www.liverpoolfc.com/tickets', { poi: 'liv-anfield', fd: 64 });
  K('liverpool', 'everton', 'Everton', 'Hill Dickinson Stadium', 53.4247, -3.0001, 'Premier League',
    'https://www.evertonfc.com/fixtures', 'https://www.evertonfc.com/tickets', { fd: 62 });

  /* ---------------------------------------------------------------- França */
  K('paris', 'psg', 'Paris Saint-Germain', 'Parc des Princes', 48.8414, 2.2530, 'Ligue 1',
    'https://www.psg.fr/calendrier', 'https://billetterie.psg.fr', { poi: 'par-parc-des-princes', fd: 524 });
  K('nice', 'nice', 'OGC Nice', 'Allianz Riviera', 43.7050, 7.1926, 'Ligue 1',
    'https://www.ogcnice.com', 'https://billetterie.ogcnice.com', { fd: 522 });
  K('monaco', 'monaco', 'AS Monaco', 'Stade Louis-II', 43.7277, 7.4156, 'Ligue 1',
    'https://www.asmonaco.com', 'https://billetterie.asmonaco.com', { fd: 548 });

  /* --------------------------------------------------------------- Polônia */
  K('cracovia', 'wisla', 'Wisła Kraków', 'Estádio Henryk Reyman', 50.0636, 19.9120, 'Liga polonesa',
    'https://wislakrakow.com', 'https://bilety.wislakrakow.com');
  K('cracovia', 'cracovia', 'Cracovia', 'Estádio Józef Piłsudski', 50.0580, 19.9200, 'Ekstraklasa',
    'https://cracovia.pl', 'https://bilety.cracovia.pl');

  /* -------------------------------------------------------------- Alemanha */
  K('munique', 'bayern', 'Bayern de Munique', 'Allianz Arena', 48.2188, 11.6247, 'Bundesliga',
    'https://fcbayern.com/en/matches', 'https://fcbayern.com/en/tickets', { poi: 'muc-allianz-arena', fd: 5 });
  K('berlim', 'hertha', 'Hertha BSC', 'Olympiastadion', 52.5147, 13.2395, 'Liga alemã',
    'https://www.herthabsc.com', 'https://www.herthabsc.com/de/tickets', { poi: 'ber-olympiastadion' });
  K('berlim', 'union-berlin', '1. FC Union Berlin', 'Stadion An der Alten Försterei', 52.4572, 13.5680, 'Bundesliga',
    'https://www.fc-union-berlin.de', 'https://www.fc-union-berlin.de/de/tickets/', { fd: 28 });
  K('hamburgo', 'hsv', 'Hamburger SV', 'Volksparkstadion', 53.5872, 9.8986, 'Liga alemã',
    'https://www.hsv.de', 'https://www.hsv.de/tickets', { poi: 'ham-volkspark' });
  K('hamburgo', 'st-pauli', 'FC St. Pauli', 'Millerntor-Stadion', 53.5546, 9.9677, 'Liga alemã',
    'https://www.fcstpauli.com', 'https://www.fcstpauli.com/tickets/');
  K('colonia', 'koln', '1. FC Köln', 'RheinEnergieStadion', 50.9335, 6.8750, 'Liga alemã',
    'https://fc.de', 'https://fc.de/fc-tickets/', { poi: 'cgn-rheinenergie', fd: 1 });
  K('frankfurt', 'eintracht', 'Eintracht Frankfurt', 'Deutsche Bank Park', 50.0686, 8.6455, 'Bundesliga',
    'https://www.eintracht.de', 'https://www.eintracht.de/tickets/', { poi: 'fra-waldstadion', fd: 19 });

  /* -------------------------------------------------------------- Portugal */
  K('lisboa', 'benfica', 'Benfica', 'Estádio da Luz', 38.7527, -9.1847, 'Liga Portugal',
    'https://www.slbenfica.pt', 'https://www.slbenfica.pt/pt-pt/bilhetes', { poi: 'lis-estadio-luz', fd: 1903 });
  K('lisboa', 'sporting', 'Sporting CP', 'Estádio José Alvalade', 38.7612, -9.1608, 'Liga Portugal',
    'https://www.sporting.pt', 'https://www.sporting.pt/pt/bilhetes-e-gamebox', { fd: 498 });
  K('porto', 'porto', 'FC Porto', 'Estádio do Dragão', 41.1617, -8.5836, 'Liga Portugal',
    'https://www.fcporto.pt', 'https://www.fcporto.pt/pt/bilhetes', { poi: 'opo-dragao', fd: 503 });

  /* --------------------------------------------------------------- Espanha */
  K('madri', 'real-madrid', 'Real Madrid', 'Santiago Bernabéu', 40.4531, -3.6883, 'La Liga',
    'https://www.realmadrid.com/en-US/football/first-team/schedule', 'https://www.realmadrid.com/en-US/tickets', { poi: 'mad-bernabeu', fd: 86 });
  K('madri', 'atletico', 'Atlético de Madrid', 'Riyadh Air Metropolitano', 40.4362, -3.5995, 'La Liga',
    'https://en.atleticodemadrid.com', 'https://en.atleticodemadrid.com/entradas', { fd: 78 });
  K('barcelona', 'barcelona', 'FC Barcelona', 'Spotify Camp Nou', 41.3809, 2.1228, 'La Liga',
    'https://www.fcbarcelona.com/en/football/first-team/schedule', 'https://www.fcbarcelona.com/en/tickets', { poi: 'bcn-camp-nou', fd: 81 });
  K('sevilha', 'sevilla', 'Sevilla FC', 'Ramón Sánchez-Pizjuán', 37.3840, -5.9705, 'La Liga',
    'https://sevillafc.es', 'https://sevillafc.es/entradas', { fd: 559 });
  K('sevilha', 'betis', 'Real Betis', 'Benito Villamarín', 37.3565, -5.9817, 'La Liga',
    'https://www.realbetisbalompie.es', 'https://www.realbetisbalompie.es/entradas', { fd: 90 });

  /* ---------------------------------------------------------------- Itália */
  K('roma', 'roma', 'AS Roma', 'Stadio Olimpico', 41.9341, 12.4547, 'Serie A',
    'https://www.asroma.com', 'https://www.asroma.com/it/biglietti', { poi: 'rom-olimpico', fd: 100 });
  K('roma', 'lazio', 'SS Lazio', 'Stadio Olimpico', 41.9341, 12.4547, 'Serie A',
    'https://www.sslazio.it', 'https://www.sslazio.it/it/biglietteria', { poi: 'rom-olimpico', fd: 110 });
  K('milao', 'milan', 'AC Milan', 'San Siro', 45.4781, 9.1240, 'Serie A',
    'https://www.acmilan.com', 'https://www.acmilan.com/en/tickets', { poi: 'mil-san-siro', fd: 98 });
  K('milao', 'inter', 'Inter de Milão', 'San Siro', 45.4781, 9.1240, 'Serie A',
    'https://www.inter.it', 'https://www.inter.it/en/biglietteria', { poi: 'mil-san-siro', fd: 108 });
  K('napoles', 'napoli', 'SSC Napoli', 'Estádio Diego Armando Maradona', 40.8280, 14.1931, 'Serie A',
    'https://sscnapoli.it', 'https://sscnapoli.it/biglietti/', { poi: 'nap-maradona', fd: 113 });
  K('florenca', 'fiorentina', 'Fiorentina', 'Stadio Artemio Franchi', 43.7808, 11.2823, 'Serie A',
    'https://www.acffiorentina.com', 'https://www.acffiorentina.com/it/biglietteria', { fd: 99 });
  K('veneza', 'venezia', 'Venezia FC', 'Stadio Pier Luigi Penzo', 45.4277, 12.3639, 'Liga italiana',
    'https://www.veneziafc.it', 'https://www.veneziafc.it/biglietteria');

  /* -------------------------------------------- Holanda · Bélgica · Suíça */
  K('amsterda', 'ajax', 'Ajax', 'Johan Cruijff ArenA', 52.3143, 4.9419, 'Eredivisie',
    'https://www.ajax.nl', 'https://www.ajax.nl/tickets/', { poi: 'ams-arena', fd: 678 });
  K('bruxelas', 'anderlecht', 'RSC Anderlecht', 'Lotto Park', 50.8342, 4.2983, 'Liga belga',
    'https://www.rsca.be', 'https://www.rsca.be/en/tickets');
  K('bruges', 'club-brugge', 'Club Brugge', 'Jan Breydelstadion', 51.1933, 3.1805, 'Liga belga',
    'https://www.clubbrugge.be', 'https://www.clubbrugge.be/en/tickets');
  K('zurique', 'fc-zurich', 'FC Zürich', 'Letzigrund', 47.3828, 8.5039, 'Liga suíça',
    'https://www.fcz.ch', 'https://www.fcz.ch/de/tickets');
  K('zurique', 'grasshoppers', 'Grasshopper Club', 'Letzigrund', 47.3828, 8.5039, 'Liga suíça',
    'https://www.gcz.ch', 'https://www.gcz.ch');

  /* --------------------------------------------------------- Europa Central */
  K('viena', 'rapid', 'Rapid Viena', 'Allianz Stadion', 48.1980, 16.2660, 'Bundesliga austríaca',
    'https://www.skrapid.at', 'https://www.skrapid.at/de/tickets');
  K('viena', 'austria-wien', 'Austria Viena', 'Generali Arena', 48.1622, 16.3870, 'Bundesliga austríaca',
    'https://fk-austria.at', 'https://fk-austria.at');
  K('salzburgo', 'salzburg', 'Red Bull Salzburg', 'Red Bull Arena', 47.8163, 12.9982, 'Bundesliga austríaca',
    'https://www.redbullsalzburg.at', 'https://www.redbullsalzburg.at/en/tickets');
  K('bratislava', 'slovan', 'Slovan Bratislava', 'Tehelné pole', 48.1636, 17.1369, 'Liga eslovaca',
    'https://www.skslovan.com', 'https://www.skslovan.com');
  K('budapeste', 'ferencvaros', 'Ferencváros', 'Groupama Aréna', 47.4753, 19.0957, 'Liga húngara',
    'https://www.fradi.hu', 'https://www.fradi.hu/en');
  K('praga', 'sparta', 'Sparta Praga', 'epet ARENA (Letná)', 50.0999, 14.4160, 'Liga tcheca',
    'https://sparta.cz', 'https://sparta.cz/en/tickets', { poi: 'prg-letna' });
  K('praga', 'slavia', 'Slavia Praga', 'Fortuna Arena (Eden)', 50.0675, 14.4715, 'Liga tcheca',
    'https://www.slavia.cz', 'https://www.slavia.cz');

  /* ------------------------------------------------------------ Escandinávia */
  K('copenhague', 'fck', 'FC Copenhague', 'Parken', 55.7027, 12.5722, 'Superliga dinamarquesa',
    'https://www.fck.dk', 'https://www.fck.dk/billetter', { poi: 'cph-parken' });
  K('estocolmo', 'aik', 'AIK', 'Strawberry Arena', 59.3725, 18.0000, 'Allsvenskan',
    'https://www.aikfotboll.se', 'https://www.aikfotboll.se');
  K('estocolmo', 'hammarby', 'Hammarby', 'Tele2 Arena', 59.2913, 18.0850, 'Allsvenskan',
    'https://www.hammarbyfotboll.se', 'https://www.hammarbyfotboll.se');
  K('oslo', 'valerenga', 'Vålerenga', 'Intility Arena', 59.9186, 10.8050, 'Eliteserien',
    'https://www.vif-fotball.no', 'https://www.vif-fotball.no');
  K('bergen', 'brann', 'SK Brann', 'Brann Stadion', 60.3669, 5.3577, 'Eliteserien',
    'https://www.brann.no', 'https://www.brann.no');
  K('helsinque', 'hjk', 'HJK Helsinque', 'Bolt Arena', 60.1875, 24.9225, 'Veikkausliiga',
    'https://www.hjk.fi', 'https://www.hjk.fi');

  /* ------------------------------------------------- Irlanda · Bálcãs · Leste */
  K('dublin', 'bohemians', 'Bohemian FC', 'Dalymount Park', 53.3617, -6.2750, 'Liga irlandesa',
    'https://bohemianfc.com', 'https://bohemianfc.com');
  K('dublin', 'shamrock', 'Shamrock Rovers', 'Tallaght Stadium', 53.2836, -6.3736, 'Liga irlandesa',
    'https://www.shamrockrovers.ie', 'https://www.shamrockrovers.ie');
  K('zagreb', 'dinamo-zagreb', 'Dinamo Zagreb', 'Estádio Maksimir', 45.8189, 16.0181, 'Liga croata',
    'https://gnkdinamo.hr', 'https://gnkdinamo.hr');
  K('split', 'hajduk', 'Hajduk Split', 'Estádio Poljud', 43.5195, 16.4317, 'Liga croata',
    'https://hajduk.hr', 'https://hajduk.hr');
  K('liubliana', 'olimpija', 'Olimpija Ljubljana', 'Estádio Stožice', 46.0805, 14.5244, 'Liga eslovena',
    'https://www.nkolimpija.si', 'https://www.nkolimpija.si');
  K('belgrado', 'estrela-vermelha', 'Estrela Vermelha', 'Estádio Rajko Mitić (Marakana)', 44.7832, 20.4649, 'Liga sérvia',
    'https://www.crvenazvezdafk.com', 'https://www.crvenazvezdafk.com', { poi: 'beg-marakana' });
  K('belgrado', 'partizan', 'Partizan', 'Estádio Partizan', 44.7886, 20.4592, 'Liga sérvia',
    'https://partizan.rs', 'https://partizan.rs');
  K('sofia', 'levski', 'Levski Sofia', 'Estádio Georgi Asparuhov', 42.7053, 23.3636, 'Liga búlgara',
    'https://levski.bg', 'https://levski.bg');
  K('bucareste', 'fcsb', 'FCSB', 'Arena Națională', 44.4372, 26.1525, 'Liga romena',
    'https://www.fcsb.ro', 'https://www.fcsb.ro');
  K('atenas', 'olympiacos', 'Olympiacos', 'Estádio Georgios Karaiskakis (Pireu)', 37.9463, 23.6645, 'Super League grega',
    'https://www.olympiacos.org', 'https://www.olympiacos.org');
  K('atenas', 'panathinaikos', 'Panathinaikos', 'Estádio Olímpico de Atenas', 38.0361, 23.7875, 'Super League grega',
    'https://www.pao.gr', 'https://www.pao.gr');
  K('atenas', 'aek', 'AEK Atenas', 'OPAP Arena', 38.0364, 23.7403, 'Super League grega',
    'https://www.aekfc.gr', 'https://www.aekfc.gr');
  K('istambul', 'besiktas', 'Beşiktaş', 'Tüpraş Stadyumu', 41.0393, 28.9944, 'Süper Lig',
    'https://bjk.com.tr', 'https://bjk.com.tr', { poi: 'ist-besiktas' });
  K('istambul', 'galatasaray', 'Galatasaray', 'RAMS Park', 41.1034, 28.9907, 'Süper Lig',
    'https://www.galatasaray.org', 'https://www.galatasaray.org');
  K('istambul', 'fenerbahce', 'Fenerbahçe', 'Estádio Şükrü Saracoğlu (Kadıköy)', 40.9877, 29.0369, 'Süper Lig',
    'https://www.fenerbahce.org', 'https://www.fenerbahce.org');

  /* ------------------------------------------------ jogos cadastrados à mão
     Cada jogo: data (AAAA-MM-DD), hora local (HH:MM, ou '' se não saiu), mandante,
     visitante, competição, estádio, cidade (id) e link de ingressos.
     "clube" (opcional) liga o jogo a um clube da lista acima (usa o estádio e os links dele).

     Exemplo (apague o // e ajuste):
     // { id: 'ars-che', data: '2027-03-06', hora: '15:00', casa: 'Arsenal', fora: 'Chelsea',
     //   comp: 'Premier League', estadio: 'Emirates Stadium', cityId: 'londres', clube: 'arsenal',
     //   ingressos: 'https://www.arsenal.com/tickets' },

     A tabela da temporada 2026/27 só é confirmada perto de cada rodada: cadastre aqui
     (ou pela interface) quando as datas saírem nos sites dos clubes. */
  D.jogos = [];

  // Proxy opcional (Cloudflare Worker — veja worker/futebol.js e o README). Vazio = desligado.
  // Ex.: 'https://futebol.seu-usuario.workers.dev'   (a chave da API fica só no Worker, nunca aqui)
  D.config.futebolProxyUrl = '';
})();
