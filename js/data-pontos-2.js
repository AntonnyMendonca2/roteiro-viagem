/* ==========================================================================
   PONTOS DE INTERESSE — parte 2: Tchéquia, países nórdicos, Bálticos,
   Bálcãs, Grécia, Malta, Chipre, Turquia e Andorra.

   Cada linha: P(cidade, id, nome, lat, lon, preço, horas, wiki, site, tags, descrição, extras)
   O preço está na moeda da cidade. Veja DATA.ponto em data-europa.js.
   ========================================================================== */
(function () {
  'use strict';
  const P = window.DATA.ponto;
  const SEG = [1];

  /* ===== PRAGA ===== */
  P('praga', 'prg-castelo', 'Castelo de Praga e Catedral de São Vito', 50.0909, 14.4005, 450, 3, 'Prague_Castle', 'https://www.hrad.cz', '', 'O maior complexo de castelo do mundo, com a catedral gótica, o antigo palácio real e a Viela Dourada. Os pátios são de acesso livre.', { horario: ['09:00', '16:00'] });
  P('praga', 'prg-ponte-carlos', 'Ponte Carlos', 50.0865, 14.4114, 0, 0.5, 'Charles_Bridge', '', '', 'Ponte de pedra do século XIV sobre o rio Moldava, ladeada por 30 estátuas barrocas. Bem cedo ela fica quase vazia.', { ar: 1 });
  P('praga', 'prg-praca-velha', 'Praça da Cidade Velha e Relógio Astronômico', 50.0870, 14.4208, 0, 1, 'Prague_astronomical_clock', '', '', 'O relógio de 1410 que desfila os apóstolos a cada hora cheia, na praça cercada pela igreja de Týn e por fachadas barrocas.', { ar: 1 });
  P('praga', 'prg-bairro-judeu', 'Bairro Judeu (Josefov)', 50.0900, 14.4180, 600, 2, 'Old_Jewish_Cemetery,_Prague', 'https://www.jewishmuseum.cz', 'Museu', 'Seis sinagogas e o antigo cemitério de lápides amontoadas, o conjunto judaico mais bem preservado da Europa.', { fechado: [6], avisos: ['Fechado aos sábados e em feriados judaicos.'] });
  P('praga', 'prg-petrin', 'Colina de Petřín', 50.0835, 14.3950, 250, 1.5, 'Petřín_Lookout_Tower', '', '', 'Parque no morro com uma mini Torre Eiffel de 1891. Sobe-se a pé ou de funicular.', { ar: 1 });
  P('praga', 'prg-venceslau', 'Praça Venceslau', 50.0810, 14.4280, 0, 1, 'Wenceslas_Square', '', 'Compras', 'O bulevar comercial da Cidade Nova, palco da Revolução de Veludo de 1989.', { label: 'Entrada livre', ar: 1 });
  P('praga', 'prg-lennon', 'Muro de Lennon e Kampa', 50.0862, 14.4069, 0, 0.5, 'Lennon_Wall', '', '', 'Muro coberto de grafites desde os anos 80, símbolo de liberdade, ao lado da ilha de Kampa.', { ar: 1 });
  P('praga', 'prg-cervejaria', 'Cervejaria tradicional (U Fleků)', 50.0789, 14.4170, 300, 1.5, 'U_Fleků', 'https://ufleku.cz', '', 'Cervejaria que produz no mesmo lugar desde 1499. A República Tcheca é o país que mais bebe cerveja por pessoa no mundo.');
  P('praga', 'prg-letna', 'Estádio Letná (Sparta Praga)', 50.0999, 14.4160, 0, 0.75, 'Stadion_Letná', 'https://sparta.cz', 'Futebol', 'A casa do Sparta, maior clube tcheco. O parque de Letná, ao lado, tem a melhor vista das pontes de Praga.', { label: 'Por fora' });
  P('praga', 'prg-kutna-hora', 'Kutná Hora (Ossuário de Sedlec)', 49.9620, 15.2883, 220, 6, 'Sedlec_Ossuary', 'https://www.sedlec.info', '', 'Capela decorada com os ossos de 40 mil pessoas, numa antiga cidade de minas de prata.', { bv: ['Trem direto até Kutná Hora hl.n. (~1h)', 280] });

  /* ===== COPENHAGUE ===== */
  P('copenhague', 'cph-nyhavn', 'Nyhavn', 55.6798, 12.5912, 0, 1, 'Nyhavn', '', '', 'O canal das casas coloridas do século XVII e dos veleiros de madeira. Hans Christian Andersen morou em três delas.', { ar: 1 });
  P('copenhague', 'cph-tivoli', 'Jardins de Tivoli', 55.6737, 12.5681, 170, 3, 'Tivoli_Gardens', 'https://www.tivoli.dk', '', 'Parque de diversões de 1843, que inspirou Walt Disney. Fecha em parte do inverno; confira as temporadas.', { ar: 1, avisos: ['Só abre em temporadas (primavera–verão, Halloween e Natal).'] });
  P('copenhague', 'cph-sereia', 'A Pequena Sereia', 55.6929, 12.5993, 0, 0.5, 'The_Little_Mermaid_(statue)', '', '', 'A estátua de bronze de 1913, baseada no conto de Andersen. É pequena e fica sempre cheia.', { ar: 1 });
  P('copenhague', 'cph-rosenborg', 'Castelo de Rosenborg', 55.6858, 12.5773, 140, 1.5, 'Rosenborg_Castle', 'https://www.kongernessamling.dk', 'Museu', 'Castelo renascentista com as joias da coroa dinamarquesa, dentro do Jardim do Rei.');
  P('copenhague', 'cph-christiania', 'Christiania', 55.6736, 12.5980, 0, 1, 'Freetown_Christiania', '', '', 'Comunidade alternativa autogerida desde 1971 numa antiga área militar, com murais, oficinas e cafés.', { ar: 1 });
  P('copenhague', 'cph-stroget', 'Strøget', 55.6788, 12.5760, 0, 1.5, 'Strøget', '', 'Compras', 'Uma das ruas de pedestres mais longas da Europa, com design dinamarquês, a loja-conceito da Lego e as grandes redes.', { label: 'Entrada livre', ar: 1 });
  P('copenhague', 'cph-rundetaarn', 'Torre Redonda (Rundetaarn)', 55.6814, 12.5757, 50, 0.75, 'Rundetaarn', 'https://www.rundetaarn.dk', '', 'Observatório do século XVII com uma rampa em espiral no lugar de escadas. O topo tem vista para os telhados do centro.');
  P('copenhague', 'cph-parken', 'Parken (FC Copenhague, tour)', 55.7027, 12.5722, 150, 1.25, 'Parken_Stadium', 'https://www.fck.dk', 'Futebol', 'Estádio nacional da Dinamarca e casa do FC Copenhague.');
  P('copenhague', 'cph-kronborg', 'Castelo de Kronborg (Hamlet)', 56.0390, 12.6213, 145, 5, 'Kronborg', 'https://kronborg.dk', '', 'O castelo de Elsinore, cenário de “Hamlet”, no estreito que separa a Dinamarca da Suécia.', { bv: ['Trem até Helsingør (~45 min)', 220] });

  /* ===== ESTOCOLMO ===== */
  P('estocolmo', 'sto-gamla-stan', 'Gamla Stan (cidade velha)', 59.3251, 18.0711, 0, 2, 'Gamla_stan', '', '', 'A ilha medieval de ruelas e casas ocre onde Estocolmo nasceu, com a praça Stortorget e a rua mais estreita da cidade.', { ar: 1 });
  P('estocolmo', 'sto-vasa', 'Museu Vasa', 59.3280, 18.0914, 230, 2, 'Vasa_Museum', 'https://www.vasamuseet.se', 'Museu', 'Navio de guerra de 1628 que afundou na viagem inaugural e foi resgatado quase intacto 333 anos depois.', { horario: ['10:00', '17:00'] });
  P('estocolmo', 'sto-palacio', 'Palácio Real', 59.3268, 18.0717, 200, 1.5, 'Stockholm_Palace', 'https://www.kungligaslotten.se', '', 'Um dos maiores palácios da Europa, com mais de 600 cômodos. A troca da guarda acontece no pátio por volta do meio-dia.');
  P('estocolmo', 'sto-skansen', 'Skansen', 59.3270, 18.1037, 220, 2.5, 'Skansen', 'https://skansen.se', 'Museu', 'O museu a céu aberto mais antigo do mundo: casas e fazendas de toda a Suécia e animais nórdicos.', { ar: 1 });
  P('estocolmo', 'sto-abba', 'ABBA The Museum', 59.3250, 18.0966, 300, 1.5, 'Djurgården', 'https://abbathemuseum.com', 'Museu', 'Museu interativo do grupo sueco, com figurinos originais e palco para cantar com os hologramas.');
  P('estocolmo', 'sto-prefeitura', 'Prefeitura (Stadshuset)', 59.3275, 18.0543, 150, 1, 'Stockholm_City_Hall', 'https://stadshuset.stockholm', '', 'Onde acontece o banquete do Prêmio Nobel. A visita guiada mostra o Salão Dourado, com 18 milhões de mosaicos.');
  P('estocolmo', 'sto-metro', 'Estações de metrô decoradas', 59.3313, 18.0607, 43, 1, 'Stockholm_Metro', '', '', 'Chamado de “a galeria de arte mais longa do mundo”: T-Centralen, Kungsträdgården e Stadion são as mais bonitas.', { label: '~43 SEK (bilhete)' });
  P('estocolmo', 'sto-drottninggatan', 'Drottninggatan', 59.3330, 18.0630, 0, 1.25, 'Drottninggatan', '', 'Compras', 'A rua de pedestres que corta o centro, com as redes suecas e lojas de departamento.', { label: 'Entrada livre', ar: 1 });
  P('estocolmo', 'sto-drottningholm', 'Palácio de Drottningholm', 59.3217, 17.8867, 190, 4, 'Drottningholm_Palace', 'https://www.kungligaslotten.se', '', 'A residência da família real, numa ilha do lago Mälaren, com teatro do século XVIII e jardins franceses.', { bv: ['Metrô até Brommaplan + ônibus (~40 min)', 86] });

  /* ===== OSLO ===== */
  P('oslo', 'osl-opera', 'Ópera de Oslo', 59.9075, 10.7531, 0, 0.75, 'Oslo_Opera_House', 'https://operaen.no', '', 'Prédio de mármore branco que mergulha no fiorde. A graça é subir andando pelo telhado.', { ar: 1 });
  P('oslo', 'osl-vigeland', 'Parque Vigeland', 59.9270, 10.7008, 0, 1.5, 'Vigeland_installation', '', '', 'Mais de 200 esculturas de um único artista, Gustav Vigeland, incluindo o Monólito de corpos entrelaçados.', { ar: 1 });
  P('oslo', 'osl-munch', 'Museu Munch', 59.9060, 10.7556, 180, 2, 'Munch_Museum', 'https://www.munchmuseet.no', 'Museu', 'Treze andares dedicados a Edvard Munch, com versões de “O Grito” que se revezam em exposição.');
  P('oslo', 'osl-akershus', 'Fortaleza de Akershus', 59.9075, 10.7361, 0, 1, 'Akershus_Fortress', '', '', 'Castelo medieval à beira do fiorde, com muralhas de acesso livre e vista para o porto.', { ar: 1 });
  P('oslo', 'osl-fram', 'Museu Fram (Bygdøy)', 59.9036, 10.6997, 180, 1.5, 'Fram_Museum', 'https://frammuseum.no', 'Museu', 'O navio polar que levou Amundsen à Antártida. Dá para entrar no convés e nos camarotes.');
  P('oslo', 'osl-karl-johans', 'Karl Johans gate', 59.9133, 10.7400, 0, 1.25, 'Karl_Johans_gate', '', 'Compras', 'A avenida principal, da estação central ao Palácio Real, com lojas, cafés e o parlamento.', { label: 'Entrada livre', ar: 1 });
  P('oslo', 'osl-holmenkollen', 'Holmenkollen (trampolim de esqui)', 59.9639, 10.6678, 190, 2.5, 'Holmenkollbakken', 'https://www.holmenkollen.com', '', 'O trampolim de salto de esqui sobre a cidade, com museu do esqui e mirante no topo da torre.', { ar: 1 });

  /* ===== BERGEN ===== */
  P('bergen', 'bgo-bryggen', 'Bryggen', 60.3975, 5.3245, 0, 1, 'Bryggen', '', '', 'O cais de armazéns de madeira coloridos dos mercadores hanseáticos, Patrimônio da Humanidade.', { ar: 1 });
  P('bergen', 'bgo-floyen', 'Monte Fløyen (funicular)', 60.3944, 5.3436, 180, 1.5, 'Fløyen', 'https://www.floyen.no', '', 'O funicular sobe em 6 minutos a 320 m, com vista para a cidade, as ilhas e os fiordes.', { ar: 1 });
  P('bergen', 'bgo-mercado-peixe', 'Mercado de Peixe', 60.3947, 5.3250, 0, 0.75, 'Fisketorget', '', '', 'Bancas de salmão, caranguejo-real e bacalhau no porto, desde o século XIII. Os preços são altos, como tudo na Noruega.', { label: 'Entrada livre', ar: 1 });
  P('bergen', 'bgo-kode', 'Museus KODE', 60.3900, 5.3220, 175, 1.5, 'Troldhaugen', 'https://kodebergen.no', 'Museu', 'Quatro prédios de arte à beira do lago central, com uma boa coleção de Munch.', { fechado: SEG });
  P('bergen', 'bgo-fiorde', 'Cruzeiro pelo fiorde (Mostraumen)', 60.3990, 5.3220, 900, 3.5, 'Osterfjorden', 'https://www.rodne.no', '', 'Passeio de barco de três horas por um fiorde estreito, até encostar numa cachoeira.', { ar: 1 });
  P('bergen', 'bgo-flam', 'Flåm e Sognefjord (Norway in a Nutshell)', 60.8638, 7.1136, 2500, 12, 'Flåm_Line', 'https://www.norwaynutshell.com', '', 'Roteiro de um dia com trem, a ferrovia de Flåm (uma das mais íngremes do mundo) e barco pelo fiorde Nærøy.', { ar: 1, bv: ['Trem, barco e ônibus já incluídos no pacote', 0] });

  /* ===== HELSINQUE ===== */
  P('helsinque', 'hel-catedral', 'Catedral e Praça do Senado', 60.1704, 24.9522, 0, 0.75, 'Helsinki_Cathedral', '', '', 'A catedral branca de cúpulas verdes no alto de uma escadaria, símbolo da cidade.', { ar: 1 });
  P('helsinque', 'hel-suomenlinna', 'Suomenlinna', 60.1454, 24.9881, 0, 3.5, 'Suomenlinna', 'https://www.suomenlinna.fi', '', 'Fortaleza marítima do século XVIII espalhada por seis ilhas, a 15 minutos de balsa do mercado.', { ar: 1, bv: ['Balsa pública da Praça do Mercado (bilhete do transporte urbano)', 6] });
  P('helsinque', 'hel-temppeliaukio', 'Igreja na Rocha (Temppeliaukio)', 60.1730, 24.9253, 8, 0.5, 'Temppeliaukio_Church', '', '', 'Igreja escavada dentro de um bloco de granito, com cúpula de cobre e luz natural entrando pelas laterais.');
  P('helsinque', 'hel-mercado', 'Praça do Mercado e Mercado Velho', 60.1675, 24.9530, 0, 1, 'Market_Square,_Helsinki', '', '', 'Bancas de salmão, frutas vermelhas e artesanato na beira do porto; ao lado, o mercado coberto de 1889.', { label: 'Entrada livre', ar: 1 });
  P('helsinque', 'hel-oodi', 'Biblioteca Oodi', 60.1738, 24.9380, 0, 0.75, 'Helsinki_Central_Library_Oodi', 'https://oodihelsinki.fi', '', 'Biblioteca-sala de estar de madeira e vidro, com terraço, estúdios e impressoras 3D de uso livre.');
  P('helsinque', 'hel-sauna', 'Sauna pública (Löyly)', 60.1520, 24.9300, 26, 2, 'Löyly', 'https://www.loylyhelsinki.fi', '', 'Sauna de madeira à beira do mar Báltico: depois do calor, o costume é mergulhar na água gelada.', { avisos: ['Reserve o horário (sessões de 2 horas).'] });
  P('helsinque', 'hel-esplanadi', 'Esplanadi e Design District', 60.1675, 24.9475, 0, 1.25, 'Esplanadi', '', 'Compras', 'O bulevar arborizado com as lojas de design finlandês, como Marimekko e Iittala.', { label: 'Entrada livre', ar: 1 });

  /* ===== ROVANIEMI ===== */
  P('rovaniemi', 'rvn-papai-noel', 'Vila do Papai Noel (Círculo Polar)', 66.5436, 25.8473, 0, 3, 'Santa_Claus_Village', 'https://santaclausvillage.info', '', 'A linha do Círculo Polar Ártico e a casa oficial do Papai Noel, aberta o ano todo. A entrada é gratuita; a foto com ele é paga.', { ar: 1 });
  P('rovaniemi', 'rvn-arktikum', 'Arktikum', 66.5086, 25.7260, 20, 2, 'Arktikum_Science_Museum', 'https://www.arktikum.fi', 'Museu', 'Museu sobre o Ártico e a Lapônia, num corredor de vidro apontado para o norte.');
  P('rovaniemi', 'rvn-aurora', 'Caça à aurora boreal', 66.5300, 25.7000, 90, 4, 'Aurora', '', '', 'Passeio noturno para fora das luzes da cidade. A aurora depende de céu limpo e atividade solar — não há garantia.', { ar: 1 });
  P('rovaniemi', 'rvn-husky', 'Passeio de trenó com huskies', 66.5600, 25.8300, 150, 2.5, 'Sled_dog', '', '', 'Fazendas de huskies oferecem passeios de trenó pela floresta nevada (dezembro a março).', { ar: 1 });
  P('rovaniemi', 'rvn-ounasvaara', 'Ounasvaara', 66.4960, 25.7850, 0, 2, 'Ounasjoki', '', '', 'Morro ao lado da cidade com trilhas, pista de esqui e torre de observação.', { ar: 1 });

  /* ===== REYKJAVÍK ===== */
  P('reykjavik', 'rek-hallgrimskirkja', 'Hallgrímskirkja', 64.1417, -21.9266, 1400, 0.75, 'Hallgrímskirkja', 'https://www.hallgrimskirkja.is', '', 'A igreja de concreto inspirada em colunas de basalto. A torre de 74 m tem a melhor vista das casas coloridas.');
  P('reykjavik', 'rek-harpa', 'Harpa e Sun Voyager', 64.1503, -21.9326, 0, 0.75, 'Harpa_(concert_hall)', 'https://www.harpa.is', '', 'A sala de concertos de fachada de vidro em favos e, a poucos minutos pela orla, a escultura do barco viking.', { ar: 1 });
  P('reykjavik', 'rek-lagoa-azul', 'Lagoa Azul', 63.8804, -22.4495, 12000, 4, 'Blue_Lagoon_(geothermal_spa)', 'https://www.bluelagoon.com', '', 'Spa geotérmico de água azul-leitosa a 38 °C, num campo de lava perto do aeroporto.', { ar: 1, avisos: ['Reserva obrigatória. Pode fechar por atividade vulcânica na região — confira.'], bv: ['Ônibus de traslado (~50 min)', 7000] });
  P('reykjavik', 'rek-circulo-dourado', 'Círculo Dourado', 64.3271, -20.1199, 12000, 8, 'Gullfoss', '', '', 'O roteiro clássico de um dia: o parque Þingvellir (entre duas placas tectônicas), o gêiser Strokkur e a cachoeira Gullfoss.', { ar: 1, bv: ['Excursão de ônibus já incluída no preço', 0] });
  P('reykjavik', 'rek-perlan', 'Perlan', 64.1293, -21.9189, 5500, 1.5, 'Perlan', 'https://perlan.is', 'Museu', 'Museu de ciências naturais com caverna de gelo de verdade, planetário de aurora boreal e mirante.');
  P('reykjavik', 'rek-laugavegur', 'Laugavegur', 64.1445, -21.9230, 0, 1.25, 'Laugavegur_(Reykjavík)', '', 'Compras', 'A rua principal de lojas, cafés e bares, onde se compram os suéteres de lã islandeses.', { label: 'Entrada livre', ar: 1 });
  P('reykjavik', 'rek-costa-sul', 'Costa Sul (cachoeiras e praia de areia preta)', 63.4044, -19.0447, 14000, 10, 'Reynisfjara', '', '', 'As cachoeiras Seljalandsfoss e Skógafoss e a praia de areia preta de Reynisfjara, com colunas de basalto.', { ar: 1, bv: ['Excursão de ônibus já incluída no preço', 0] });

  /* ===== TALLINN ===== */
  P('tallinn', 'tll-cidade-velha', 'Cidade velha e Praça da Prefeitura', 59.4372, 24.7453, 0, 2, 'Tallinn_Old_Town', '', '', 'Um dos centros medievais mais bem preservados da Europa, com muralhas, torres e a prefeitura gótica de 1404.', { ar: 1 });
  P('tallinn', 'tll-toompea', 'Toompea e mirantes', 59.4370, 24.7400, 0, 1, 'Toompea', '', '', 'A cidade alta, com o parlamento num castelo e os mirantes de Kohtuotsa e Patkuli sobre os telhados vermelhos.', { ar: 1 });
  P('tallinn', 'tll-nevsky', 'Catedral Alexandre Nevsky', 59.4358, 24.7393, 0, 0.3, 'Alexander_Nevsky_Cathedral,_Tallinn', '', '', 'Catedral ortodoxa russa de cúpulas de cebola, de 1900, no alto de Toompea.');
  P('tallinn', 'tll-telliskivi', 'Telliskivi e Balti Jaam', 59.4400, 24.7290, 0, 1.25, 'Telliskivi_Creative_City', '', 'Compras', 'Antigas fábricas viraram o polo criativo da cidade, com lojas de design, murais e o mercado ao lado da estação.', { label: 'Entrada livre' });
  P('tallinn', 'tll-kadriorg', 'Palácio de Kadriorg', 59.4385, 24.7910, 9, 1.5, 'Kadriorg_Palace', '', 'Museu', 'Palácio barroco construído por Pedro, o Grande, num parque a leste do centro.', { fechado: SEG });
  P('tallinn', 'tll-lennusadam', 'Museu Marítimo Lennusadam', 59.4514, 24.7380, 20, 2, 'Seaplane_Harbour', 'https://meremuuseum.ee', 'Museu', 'Hangar de hidroaviões com um submarino de 1936 em que se pode entrar.', { fechado: SEG });

  /* ===== RIGA ===== */
  P('riga', 'rix-cidade-velha', 'Cidade velha e Casa dos Cabeças Negras', 56.9471, 24.1068, 0, 2, 'House_of_the_Blackheads_(Riga)', '', '', 'O centro hanseático de Riga, com a praça da prefeitura e a casa da guilda dos mercadores solteiros.', { ar: 1 });
  P('riga', 'rix-art-nouveau', 'Bairro Art Nouveau (Alberta iela)', 56.9595, 24.1085, 0, 1, 'Art_Nouveau_architecture_in_Riga', '', '', 'Riga tem a maior concentração de prédios art nouveau do mundo; a rua Alberta é a mais impressionante.', { ar: 1 });
  P('riga', 'rix-mercado', 'Mercado Central', 56.9440, 24.1150, 0, 1, 'Riga_Central_Market', '', '', 'Um dos maiores mercados da Europa, dentro de cinco hangares de zepelins da Primeira Guerra.', { label: 'Entrada livre' });
  P('riga', 'rix-sao-pedro', 'Igreja de São Pedro (torre)', 56.9475, 24.1093, 9, 0.75, 'St._Peter\'s_Church,_Riga', '', '', 'Um elevador sobe a 72 m na torre, com vista para a cidade velha e o rio Daugava.');
  P('riga', 'rix-liberdade', 'Monumento da Liberdade', 56.9515, 24.1133, 0, 0.3, 'Freedom_Monument', '', '', 'Obelisco de 42 m erguido em 1935, símbolo da independência da Letônia.', { ar: 1 });
  P('riga', 'rix-jurmala', 'Jūrmala', 56.9680, 23.7700, 0, 4, 'Jūrmala', '', '', 'Balneário de casas de madeira e uma praia de 30 km no mar Báltico.', { ar: 1, bv: ['Trem até Majori (~30 min)', 4] });

  /* ===== VILNIUS ===== */
  P('vilnius', 'vno-cidade-velha', 'Cidade velha e Catedral', 54.6858, 25.2877, 0, 1.5, 'Vilnius_Cathedral', '', '', 'Um dos maiores centros barrocos da Europa. A catedral neoclássica e seu campanário ficam na praça principal.', { ar: 1 });
  P('vilnius', 'vno-gediminas', 'Torre de Gediminas', 54.6867, 25.2907, 8, 0.75, 'Gediminas\'_Tower', '', '', 'O que restou do castelo alto, no morro atrás da catedral, com vista para a cidade velha.', { ar: 1 });
  P('vilnius', 'vno-uzupis', 'República de Užupis', 54.6806, 25.2955, 0, 1, 'Užupis', '', '', 'Bairro de artistas que se declarou república independente em 1997, com constituição pregada no muro.', { ar: 1 });
  P('vilnius', 'vno-portao-aurora', 'Portão da Aurora', 54.6744, 25.2896, 0, 0.3, 'Gate_of_Dawn', '', '', 'O único portão que restou da muralha, com uma capela e um ícone da Virgem venerado por católicos e ortodoxos.');
  P('vilnius', 'vno-kgb', 'Museu das Ocupações (antiga KGB)', 54.6880, 25.2707, 6, 1.25, 'Lukiškės_Square', '', 'Museu', 'No antigo quartel da KGB, com as celas do porão preservadas.', { fechado: [1, 2] });
  P('vilnius', 'vno-trakai', 'Castelo de Trakai', 54.6524, 24.9335, 12, 4.5, 'Trakai_Island_Castle', 'https://trakaimuziejus.lt', '', 'Castelo de tijolos vermelhos numa ilha do lago Galvė, antiga capital do Grão-Ducado da Lituânia.', { ar: 1, bv: ['Ônibus ou trem até Trakai (~35 min)', 5] });

  /* ===== LIUBLIANA ===== */
  P('liubliana', 'lju-ponte-tripla', 'Ponte Tripla e Praça Prešeren', 46.0514, 14.5060, 0, 0.5, 'Triple_Bridge', '', '', 'O coração da cidade: três pontes lado a lado desenhadas por Jože Plečnik, diante da igreja rosa.', { ar: 1 });
  P('liubliana', 'lju-castelo', 'Castelo de Liubliana', 46.0489, 14.5085, 16, 1.5, 'Ljubljana_Castle', 'https://www.ljubljanskigrad.si', '', 'Castelo medieval no morro central, com funicular, torre de observação e museu da história eslovena.');
  P('liubliana', 'lju-rio', 'Margens do rio Ljubljanica', 46.0500, 14.5055, 0, 1.25, 'Ljubljanica', '', '', 'Calçadões sem carros, cheios de cafés ao ar livre e pontes, como a dos Dragões.', { ar: 1 });
  P('liubliana', 'lju-mercado', 'Mercado Central', 46.0515, 14.5090, 0, 0.75, 'Ljubljana_Central_Market', '', '', 'Mercado ao ar livre e colunata à beira do rio, também de Plečnik.', { label: 'Entrada livre', fechado: [0], ar: 1 });
  P('liubliana', 'lju-metelkova', 'Metelkova', 46.0567, 14.5170, 0, 0.75, 'Metelkova', '', '', 'Antigo quartel ocupado por artistas, coberto de grafites e esculturas.', { ar: 1 });
  P('liubliana', 'lju-postojna', 'Gruta de Postojna e Castelo de Predjama', 45.7828, 14.2038, 42, 6, 'Postojna_Cave', 'https://www.postojnska-jama.eu', '', 'Um trenzinho percorre 3,7 km dentro da caverna; perto dali, um castelo encaixado na boca de outra gruta.', { bv: ['Ônibus ou trem até Postojna (~1h)', 14] });

  /* ===== BLED ===== */
  P('bled', 'bld-lago', 'Lago Bled (volta a pé)', 46.3636, 14.0938, 0, 1.75, 'Lake_Bled', '', '', 'A trilha plana de 6 km em volta do lago verde-esmeralda, com os Alpes Julianos ao fundo.', { ar: 1 });
  P('bled', 'bld-ilha', 'Ilha de Bled (barco pletna)', 46.3623, 14.0900, 18, 1.5, 'Bled_Island', '', '', 'A única ilha natural da Eslovênia, com uma igreja e 99 degraus. Chega-se nos barcos a remo tradicionais.', { ar: 1 });
  P('bled', 'bld-castelo', 'Castelo de Bled', 46.3698, 14.1007, 18, 1.25, 'Bled_Castle', 'https://www.blejski-grad.si', '', 'O castelo mais antigo do país, num penhasco 130 m acima do lago.');
  P('bled', 'bld-vintgar', 'Garganta de Vintgar', 46.3936, 14.0853, 15, 2.5, 'Vintgar_Gorge', 'https://www.vintgar.si', '', 'Passarelas de madeira ao longo de 1,6 km de um cânion de água azul-turquesa. Fecha no inverno.', { ar: 1 });

  /* ===== ZAGREB ===== */
  P('zagreb', 'zag-cidade-alta', 'Cidade alta e Igreja de São Marcos', 45.8163, 15.9736, 0, 1.5, 'St._Mark\'s_Church,_Zagreb', '', '', 'O bairro medieval de Gradec, com a igreja de telhado colorido que mostra os brasões da Croácia e de Zagreb.', { ar: 1 });
  P('zagreb', 'zag-catedral', 'Catedral de Zagreb', 45.8145, 15.9798, 0, 0.5, 'Zagreb_Cathedral', '', '', 'A construção mais alta da Croácia, com duas torres neogóticas. Segue em restauro depois do terremoto de 2020.');
  P('zagreb', 'zag-dolac', 'Mercado Dolac', 45.8141, 15.9773, 0, 0.75, 'Dolac_Market', '', '', 'O “ventre de Zagreb”: mercado ao ar livre de guarda-sóis vermelhos, logo acima da praça central.', { label: 'Entrada livre', ar: 1 });
  P('zagreb', 'zag-relacoes', 'Museu dos Relacionamentos Terminados', 45.8150, 15.9735, 7, 1, 'Lotrščak_Tower', 'https://brokenships.com', 'Museu', 'Objetos doados por pessoas do mundo todo, cada um com a história do fim de um amor.');
  P('zagreb', 'zag-jelacic', 'Praça Ban Jelačić e rua Ilica', 45.8131, 15.9772, 0, 1, 'Ban_Jelačić_Square', '', 'Compras', 'A praça central e a rua de compras mais longa da cidade.', { label: 'Entrada livre', ar: 1 });
  P('zagreb', 'zag-plitvice', 'Lagos de Plitvice', 44.8654, 15.5820, 23, 10, 'Plitvice_Lakes_National_Park', 'https://np-plitvicka-jezera.hr', '', 'Dezesseis lagos em degraus ligados por cachoeiras e passarelas de madeira.', { ar: 1, avisos: ['Compre o ingresso online com antecedência na alta temporada.'], bv: ['Ônibus direto (~2h15)', 26] });

  /* ===== SPLIT ===== */
  P('split', 'spu-diocleciano', 'Palácio de Diocleciano', 43.5081, 16.4402, 0, 2, 'Diocletian\'s_Palace', '', '', 'O palácio de um imperador romano que virou o centro da cidade: 3 mil pessoas moram dentro das muralhas.', { ar: 1 });
  P('split', 'spu-catedral', 'Catedral de São Dômnio (campanário)', 43.5081, 16.4405, 11, 1, 'Cathedral_of_Saint_Domnius', '', '', 'O mausoléu de Diocleciano transformado em catedral, uma das mais antigas do mundo. O campanário tem vista para o porto.');
  P('split', 'spu-riva', 'Riva', 43.5075, 16.4380, 0, 0.75, 'Port_of_Split', '', '', 'O calçadão de palmeiras à beira-mar, diante da fachada sul do palácio.', { ar: 1 });
  P('split', 'spu-marjan', 'Morro Marjan', 43.5090, 16.4170, 0, 1.75, 'Marjan,_Split', '', '', 'Parque de pinheiros na península a oeste do centro, com mirantes sobre a cidade e as ilhas.', { ar: 1 });
  P('split', 'spu-krka', 'Parque Nacional de Krka', 43.8041, 15.9631, 20, 8, 'Krka_National_Park', 'https://www.npkrka.hr', '', 'As cachoeiras de Skradinski buk, numa sequência de lagos e passarelas.', { ar: 1, bv: ['Ônibus até Skradin (~1h30)', 20] });
  P('split', 'spu-hvar', 'Ilha de Hvar', 43.1729, 16.4411, 0, 9, 'Hvar_(town)', '', '', 'A ilha mais ensolarada da Croácia, com um porto veneziano e uma fortaleza no alto.', { ar: 1, bv: ['Catamarã (~1h)', 40] });

  /* ===== DUBROVNIK ===== */
  P('dubrovnik', 'dbv-muralhas', 'Muralhas de Dubrovnik', 42.6420, 18.1070, 40, 2, 'Walls_of_Dubrovnik', 'https://wallsofdubrovnik.com', '', 'Quase 2 km de muralhas medievais em volta da cidade velha, com vista para os telhados e o Adriático.', { ar: 1, horario: ['08:00', '17:00'] });
  P('dubrovnik', 'dbv-stradun', 'Stradun e cidade velha', 42.6414, 18.1083, 0, 1.5, 'Stradun_(street)', '', '', 'A rua principal de calcário polido e os becos em escadaria. Cenário de Porto Real em “Game of Thrones”.', { ar: 1 });
  P('dubrovnik', 'dbv-srd', 'Monte Srđ (teleférico)', 42.6500, 18.1130, 27, 1.25, 'Srđ', 'https://www.dubrovnikcablecar.com', '', 'O teleférico sobe a 412 m em 4 minutos, para a vista clássica da cidade murada e das ilhas.', { ar: 1 });
  P('dubrovnik', 'dbv-lovrijenac', 'Fortaleza Lovrijenac', 42.6410, 18.1040, 15, 0.75, 'Fort_Lovrijenac', '', '', 'Fortaleza num rochedo de 37 m fora das muralhas, a “Fortaleza Vermelha” da série.', { ar: 1 });
  P('dubrovnik', 'dbv-lokrum', 'Ilha de Lokrum', 42.6250, 18.1220, 27, 3.5, 'Lokrum', 'https://www.lokrum.hr', '', 'Reserva natural a 15 minutos de barco, com jardim botânico, pavões e um lago salgado. Só de abril a novembro.', { ar: 1 });

  /* ===== SARAJEVO ===== */
  P('sarajevo', 'sjj-bascarsija', 'Baščaršija', 43.8597, 18.4313, 0, 1.5, 'Baščaršija', '', 'Compras', 'O bazar otomano do século XV, com a fonte Sebilj, oficinas de cobre e café bósnio servido em džezva.', { label: 'Entrada livre', ar: 1 });
  P('sarajevo', 'sjj-ponte-latina', 'Ponte Latina', 43.8578, 18.4289, 0, 0.3, 'Latin_Bridge', '', '', 'A esquina onde o arquiduque Francisco Ferdinando foi assassinado em 1914, estopim da Primeira Guerra.', { ar: 1 });
  P('sarajevo', 'sjj-tunel', 'Túnel da Esperança', 43.8197, 18.3372, 20, 2, 'Sarajevo_Tunnel', 'https://tunelspasa.ba', 'Museu', 'O túnel cavado sob o aeroporto que abasteceu a cidade durante os quase quatro anos de cerco (1992–96).');
  P('sarajevo', 'sjj-mesquita', 'Mesquita Gazi Husrev-beg', 43.8591, 18.4290, 6, 0.5, 'Gazi_Husrev-beg_Mosque', '', '', 'A mesquita mais importante da Bósnia, de 1531, no meio do bazar.');
  P('sarajevo', 'sjj-vijecnica', 'Vijećnica (prefeitura)', 43.8590, 18.4335, 10, 0.75, 'Vijećnica', '', '', 'Prédio mourisco de 1896 que abrigava a biblioteca nacional, queimada no cerco e reconstruída.');
  P('sarajevo', 'sjj-fortaleza-amarela', 'Fortaleza Amarela', 43.8620, 18.4395, 0, 0.75, 'Žuta_Tabija', '', '', 'Mirante sobre a cidade velha e os minaretes, muito procurado no pôr do sol.', { ar: 1 });

  /* ===== MOSTAR ===== */
  P('mostar', 'omo-ponte', 'Ponte Velha (Stari Most)', 43.3373, 17.8150, 0, 0.75, 'Stari_Most', '', '', 'A ponte otomana de 1566, destruída na guerra e reconstruída pedra por pedra. Mergulhadores saltam dos seus 24 m.', { ar: 1 });
  P('mostar', 'omo-bazar', 'Bazar velho (Kujundžiluk)', 43.3378, 17.8155, 0, 1, 'Mostar', '', 'Compras', 'Rua de pedra com lojas de cobre, tapetes e lembranças dos dois lados da ponte.', { label: 'Entrada livre', ar: 1 });
  P('mostar', 'omo-mesquita', 'Mesquita Koski Mehmed Paša', 43.3390, 17.8145, 15, 0.5, 'Karađoz_Bey_Mosque', '', '', 'Do minarete e do jardim se tira a foto clássica da Ponte Velha.');
  P('mostar', 'omo-blagaj', 'Blagaj Tekija', 43.2569, 17.9033, 10, 3, 'Blagaj_Tekke', '', '', 'Mosteiro dervixe do século XVI ao pé de um paredão, na nascente do rio Buna.', { ar: 1, bv: ['Ônibus local 10/11 (~30 min)', 5] });

  /* ===== BELGRADO ===== */
  P('belgrado', 'beg-kalemegdan', 'Fortaleza de Kalemegdan', 44.8231, 20.4506, 0, 1.75, 'Belgrade_Fortress', '', '', 'Fortaleza e parque no encontro dos rios Sava e Danúbio, disputada por romanos, otomanos e austríacos.', { ar: 1 });
  P('belgrado', 'beg-sao-sava', 'Templo de São Sava', 44.7981, 20.4690, 0, 0.75, 'Church_of_Saint_Sava', '', '', 'Uma das maiores igrejas ortodoxas do mundo, com cripta e cúpula cobertas de mosaicos dourados.');
  P('belgrado', 'beg-knez-mihailova', 'Knez Mihailova', 44.8170, 20.4570, 0, 1.25, 'Knez_Mihailova_Street', '', 'Compras', 'A rua de pedestres do centro, que liga a Praça da República à fortaleza.', { label: 'Entrada livre', ar: 1 });
  P('belgrado', 'beg-skadarlija', 'Skadarlija', 44.8180, 20.4645, 0, 1.25, 'Skadarlija', '', '', 'A rua boêmia de paralelepípedos, com restaurantes tradicionais e música ao vivo.', { ar: 1 });
  P('belgrado', 'beg-tesla', 'Museu Nikola Tesla', 44.8050, 20.4706, 800, 1, 'Nikola_Tesla_Museum', 'https://tesla-museum.org', 'Museu', 'Pequeno museu com demonstrações ao vivo das invenções de Tesla e a urna com suas cinzas.', { fechado: SEG });
  P('belgrado', 'beg-iugoslavia', 'Museu da Iugoslávia (túmulo de Tito)', 44.7866, 20.4520, 600, 1.25, 'Museum_of_Yugoslavia', 'https://www.muzej-jugoslavije.org', 'Museu', 'A história do país que deixou de existir e a Casa das Flores, onde Tito está enterrado.', { fechado: SEG });
  P('belgrado', 'beg-marakana', 'Estádio Rajko Mitić (Estrela Vermelha)', 44.7832, 20.4649, 0, 0.75, 'Rajko_Mitić_Stadium', 'https://www.crvenazvezdafk.com', 'Futebol', 'O “Marakana” de Belgrado, casa do Estrela Vermelha, campeão europeu de 1991.', { label: 'Por fora' });

  /* ===== KOTOR ===== */
  P('kotor', 'tiv-cidade-velha', 'Cidade velha de Kotor', 42.4247, 18.7712, 0, 1.5, 'Kotor', '', '', 'Cidade veneziana murada no fundo de uma baía cercada de montanhas, cheia de praças, igrejas e gatos.', { ar: 1 });
  P('kotor', 'tiv-fortaleza', 'Fortaleza de São João', 42.4226, 18.7760, 15, 1.75, 'Fortifications_of_Kotor', '', '', 'São 1.350 degraus pelas muralhas até 260 m de altura, para a vista mais famosa da baía.', { ar: 1 });
  P('kotor', 'tiv-perast', 'Perast e Nossa Senhora das Rochas', 42.4869, 18.6990, 5, 3.5, 'Our_Lady_of_the_Rocks', '', '', 'Vila barroca à beira da baía; de lá, barquinhos levam à ilhota artificial com uma igreja.', { ar: 1, bv: ['Ônibus local (~25 min)', 4] });
  P('kotor', 'tiv-budva', 'Budva', 42.2780, 18.8380, 0, 4.5, 'Budva', '', '', 'Cidade murada à beira-mar e as praias mais movimentadas de Montenegro.', { ar: 1, bv: ['Ônibus (~40 min)', 8] });

  /* ===== TIRANA ===== */
  P('tirana', 'tia-skanderbeg', 'Praça Skanderbeg', 41.3275, 19.8187, 0, 0.75, 'Skanderbeg_Square', '', '', 'A praça central, com a estátua do herói nacional, a mesquita Et\'hem Bey e o Museu Histórico Nacional.', { ar: 1 });
  P('tirana', 'tia-bunkart', 'Bunk\'Art 2', 41.3270, 19.8200, 900, 1.25, 'Bunkers_in_Albania', 'https://bunkart.al', 'Museu', 'Bunker antinuclear do Ministério do Interior transformado em museu sobre a polícia secreta da ditadura.');
  P('tirana', 'tia-piramide', 'Pirâmide de Tirana', 41.3233, 19.8214, 0, 0.5, 'Dëshmorët_e_Kombit_Boulevard', '', '', 'Antigo mausoléu do ditador Enver Hoxha, reformado com escadarias para subir até o topo.', { ar: 1 });
  P('tirana', 'tia-blloku', 'Blloku', 41.3200, 19.8170, 0, 1.25, 'Blloku', '', '', 'O bairro antes exclusivo da elite comunista, hoje a região dos cafés, bares e restaurantes.', { ar: 1 });
  P('tirana', 'tia-dajti', 'Monte Dajti (teleférico)', 41.3650, 19.9230, 1500, 3, 'Mount_Dajt', 'https://dajtiekspres.com', '', 'O teleférico mais longo dos Bálcãs sobe em 15 minutos a 1.000 m, com vista para a cidade.', { ar: 1 });
  P('tirana', 'tia-kruja', 'Krujë', 41.5080, 19.7930, 500, 4.5, 'Krujë_Castle', '', '', 'Vila de montanha com o castelo de Skanderbeg e um bazar otomano de madeira.', { bv: ['Van (furgon) de Tirana (~1h)', 400] });

  /* ===== OHRID ===== */
  P('ohrid', 'ohd-kaneo', 'Igreja de São João em Kaneo', 41.1112, 20.7886, 150, 0.5, 'Church_of_St._John_at_Kaneo', '', '', 'A igrejinha do século XIII num penhasco sobre o lago — o cartão-postal da Macedônia do Norte.', { ar: 1 });
  P('ohrid', 'ohd-cidade-velha', 'Cidade velha de Ohrid', 41.1130, 20.7940, 0, 1.75, 'Ohrid', '', '', 'Casas otomanas brancas subindo a encosta, um teatro antigo e dezenas de igrejas. Dizem que já teve 365, uma para cada dia.', { ar: 1 });
  P('ohrid', 'ohd-samuil', 'Fortaleza de Samuil', 41.1150, 20.7910, 150, 0.75, 'Samuel\'s_Fortress,_Ohrid', '', '', 'Muralhas do século X no topo da cidade, com vista para o lago e a Albânia do outro lado.', { ar: 1 });
  P('ohrid', 'ohd-sveti-naum', 'Mosteiro de Sveti Naum', 40.9139, 20.7406, 150, 4.5, 'Monastery_of_Saint_Naum', '', '', 'Mosteiro do século X na ponta sul do lago, com pavões e nascentes de água cristalina.', { ar: 1, bv: ['Ônibus (~45 min) ou barco pelo lago', 300] });

  /* ===== PRIZREN ===== */
  P('prizren', 'prn-fortaleza', 'Fortaleza de Prizren', 42.2090, 20.7450, 0, 1.25, 'Prizren_Fortress', '', '', 'Ruínas no alto do morro, com a vista dos minaretes, das torres de igreja e do rio.', { ar: 1 });
  P('prizren', 'prn-ponte', 'Ponte de Pedra e Shadërvan', 42.2090, 20.7410, 0, 1, 'Old_Stone_Bridge,_Prizren', '', '', 'A ponte otomana sobre o rio Bistrica e a praça de cafés do centro histórico.', { ar: 1 });
  P('prizren', 'prn-mesquita', 'Mesquita Sinan Paxá', 42.2093, 20.7417, 0, 0.3, 'Sinan_Pasha_Mosque_(Prizren)', '', '', 'A mesquita de 1615 que domina o centro, com interior de pinturas florais.');

  /* ===== SÓFIA ===== */
  P('sofia', 'sof-nevsky', 'Catedral Alexandre Nevsky', 42.6958, 23.3328, 0, 0.75, 'Alexander_Nevsky_Cathedral,_Sofia', '', '', 'Uma das maiores catedrais ortodoxas do mundo, de cúpulas douradas, símbolo da Bulgária.');
  P('sofia', 'sof-serdica', 'Ruínas de Serdica e Igreja de São Jorge', 42.6975, 23.3220, 0, 0.75, 'Church_of_Saint_George,_Sofia', '', '', 'Ruas romanas à mostra dentro da estação de metrô e uma rotunda do século IV, o prédio mais antigo da cidade.', { ar: 1 });
  P('sofia', 'sof-vitosha-blvd', 'Bulevar Vitosha', 42.6930, 23.3205, 0, 1.25, 'Vitosha_Boulevard', '', 'Compras', 'A rua de pedestres de lojas e cafés, com a montanha Vitosha ao fundo.', { label: 'Entrada livre', ar: 1 });
  P('sofia', 'sof-boyana', 'Igreja de Boyana', 42.6447, 23.2661, 5, 1.5, 'Boyana_Church', 'https://www.boyanachurch.org', '', 'Afrescos de 1259 considerados precursores do Renascimento. Entram poucas pessoas por vez.');
  P('sofia', 'sof-rila', 'Mosteiro de Rila', 42.1334, 23.3403, 0, 8, 'Rila_Monastery', '', '', 'O mosteiro mais importante da Bulgária, de arcadas listradas e afrescos, no meio das montanhas.', { ar: 1, bv: ['Excursão ou ônibus de um dia (~2h cada trecho)', 25] });
  P('sofia', 'sof-mineral', 'Banhos Centrais e fontes minerais', 42.6995, 23.3225, 0, 0.5, 'Sofia_Central_Mineral_Baths', '', '', 'Prédio de 1913 em estilo neobizantino; em frente, as bicas públicas onde os moradores enchem garrafas de água quente.', { ar: 1 });

  /* ===== BUCARESTE ===== */
  P('bucareste', 'buh-parlamento', 'Palácio do Parlamento', 44.4275, 26.0875, 80, 1.5, 'Palace_of_the_Parliament', 'https://cic.cdep.ro', '', 'O prédio administrativo mais pesado do mundo, erguido por Ceaușescu. Só com visita guiada e passaporte.', { avisos: ['Reserve a visita por telefone ou online com um dia de antecedência; leve o passaporte.'] });
  P('bucareste', 'buh-centro-velho', 'Centro velho (Lipscani)', 44.4318, 26.1010, 0, 1.5, 'Lipscani', '', '', 'O bairro de ruas de pedestres com bares, a livraria Cărturești Carusel e o mosteiro Stavropoleos.', { ar: 1 });
  P('bucareste', 'buh-ateneu', 'Ateneu Romeno', 44.4413, 26.0973, 25, 0.5, 'Romanian_Athenaeum', '', '', 'Sala de concertos de 1888 com uma cúpula ricamente decorada, símbolo da cidade.');
  P('bucareste', 'buh-museu-aldeia', 'Museu da Aldeia', 44.4725, 26.0760, 30, 1.75, 'Dimitrie_Gusti_National_Village_Museum', 'https://muzeul-satului.ro', 'Museu', 'Mais de 300 casas, igrejas de madeira e moinhos trazidos de toda a Romênia, à beira do lago.', { ar: 1 });
  P('bucareste', 'buh-herastrau', 'Parque Herăstrău e Arco do Triunfo', 44.4700, 26.0820, 0, 1.25, 'Herăstrău_Park', '', '', 'O maior parque da cidade e, ao lado, o arco inspirado no de Paris.', { ar: 1 });
  P('bucareste', 'buh-therme', 'Therme București', 44.6040, 26.0780, 150, 4, 'Balotești', 'https://therme.ro', '', 'O maior complexo de águas termais da Europa, com piscinas, saunas e um jardim de palmeiras.', { bv: ['Ônibus expresso 442 (~40 min)', 10] });

  /* ===== BRAȘOV ===== */
  P('brasov', 'brv-praca', 'Praça do Conselho e Igreja Negra', 45.6423, 25.5890, 25, 1.25, 'Biserica_Neagră', '', '', 'A praça central saxã e a maior igreja gótica do sudeste europeu, escurecida por um incêndio em 1689.');
  P('brasov', 'brv-tampa', 'Monte Tâmpa (teleférico)', 45.6360, 25.5950, 35, 1.5, 'Tâmpa,_Brașov', '', '', 'O morro do letreiro “Brașov”, com vista para os telhados da cidade velha.', { ar: 1 });
  P('brasov', 'brv-bran', 'Castelo de Bran (“do Drácula”)', 45.5149, 25.3672, 70, 4.5, 'Bran_Castle', 'https://bran-castle.com', '', 'O castelo associado à lenda do Drácula, num rochedo na antiga fronteira da Transilvânia.', { bv: ['Ônibus do terminal 2 (~45 min)', 30] });
  P('brasov', 'brv-peles', 'Castelo de Peleș (Sinaia)', 45.3600, 25.5427, 60, 5, 'Peleș_Castle', 'https://peles.ro', '', 'Palácio neorrenascentista dos reis da Romênia nos Cárpatos, um dos mais bonitos da Europa.', { fechado: [1, 2], bv: ['Trem até Sinaia (~1h)', 40] });

  /* ===== CHIȘINĂU ===== */
  P('chisinau', 'kiv-catedral', 'Catedral da Natividade e Arco do Triunfo', 47.0245, 28.8326, 0, 0.75, 'Nativity_Cathedral,_Chișinău', '', '', 'O conjunto neoclássico do parque central, em frente à sede do governo.', { ar: 1 });
  P('chisinau', 'kiv-stefan', 'Parque Estêvão, o Grande', 47.0260, 28.8290, 0, 0.75, 'Stephen_the_Great_Monument', '', '', 'O parque mais antigo da cidade, com a estátua do príncipe que é herói nacional.', { ar: 1 });
  P('chisinau', 'kiv-cricova', 'Vinícola Cricova', 47.1390, 28.8580, 700, 3.5, 'Cricova_(winery)', 'https://cricova.md', '', 'Uma cidade subterrânea de 120 km de túneis de vinho, percorrida em carrinho elétrico.', { avisos: ['Só com visita reservada.'], bv: ['Táxi ou transfer (~30 min)', 300] });
  P('chisinau', 'kiv-orheiul', 'Orheiul Vechi', 47.3020, 28.9660, 50, 5, 'Old_Orhei', '', '', 'Mosteiro escavado na rocha sobre uma curva do rio Răut, o lugar mais bonito da Moldávia.', { ar: 1, bv: ['Micro-ônibus da rodoviária central (~1h)', 80] });

  /* ===== SANTORINI ===== */
  P('santorini', 'jtr-oia', 'Oia (pôr do sol)', 36.4618, 25.3753, 0, 2.5, 'Oia,_Greece', '', '', 'A vila das cúpulas azuis na ponta norte da ilha. O pôr do sol visto do castelo lota todos os dias.', { ar: 1 });
  P('santorini', 'jtr-fira', 'Fira e a caldeira', 36.4166, 25.4324, 0, 1.75, 'Fira', '', '', 'A capital, pendurada na borda da cratera inundada do vulcão, com um teleférico até o porto velho.', { ar: 1 });
  P('santorini', 'jtr-trilha', 'Trilha Fira–Oia', 36.4390, 25.4200, 0, 3.5, 'Imerovigli', '', '', 'Dez quilômetros pela borda da caldeira, passando por Firostefani e Imerovigli. Leve água e saia cedo.', { ar: 1 });
  P('santorini', 'jtr-akrotiri', 'Sítio arqueológico de Akrotiri', 36.3517, 25.4036, 20, 1.5, 'Akrotiri_(prehistoric_city)', '', '', 'Cidade minoica soterrada por cinzas vulcânicas por volta de 1600 a.C., a “Pompeia do Egeu”.');
  P('santorini', 'jtr-praia-vermelha', 'Praia Vermelha', 36.3486, 25.3946, 0, 1.25, 'Red_Beach_(Santorini)', '', '', 'Faixa de areia escura sob paredões de rocha vulcânica vermelha, perto de Akrotiri.', { ar: 1 });

  /* ===== VALLETTA ===== */
  P('valletta', 'mla-concatedral', 'Concatedral de São João', 35.8976, 14.5125, 15, 1.25, 'St_John\'s_Co-Cathedral', 'https://www.stjohnscocathedral.com', '', 'Sóbria por fora e toda dourada por dentro, com “A Decapitação de São João Batista”, a maior tela de Caravaggio.', { fechado: [0] });
  P('valletta', 'mla-barrakka', 'Jardins Upper Barrakka', 35.8947, 14.5125, 0, 0.75, 'Upper_Barrakka_Gardens', '', '', 'Terraço com a melhor vista do Grande Porto e das Três Cidades. Ao meio-dia e às 16h um canhão dispara.', { ar: 1 });
  P('valletta', 'mla-grao-mestre', 'Palácio do Grão-Mestre', 35.8989, 14.5140, 12, 1.25, 'Grandmaster\'s_Palace_(Valletta)', '', 'Museu', 'A sede dos Cavaleiros de Malta, com salões de Estado e uma armaria de mais de 5 mil peças.');
  P('valletta', 'mla-tres-cidades', 'As Três Cidades (Birgu)', 35.8880, 14.5220, 4, 2.5, 'Birgu', '', '', 'As cidades fortificadas do outro lado do porto, mais antigas que Valletta. A travessia de barco leva 10 minutos.', { ar: 1 });
  P('valletta', 'mla-mdina', 'Mdina', 35.8860, 14.4030, 0, 4, 'Mdina', '', '', 'A antiga capital murada, a “cidade silenciosa”, no centro da ilha.', { ar: 1, bv: ['Ônibus 51, 52 ou 53 (~30 min)', 5] });
  P('valletta', 'mla-gozo', 'Ilha de Gozo', 36.0440, 14.2510, 0, 9, 'Gozo', '', '', 'A ilha vizinha, mais rural, com a cidadela de Victoria e os templos de Ġgantija, mais antigos que as pirâmides.', { ar: 1, bv: ['Balsa rápida direto de Valletta (~45 min)', 15] });

  /* ===== PAFOS ===== */
  P('pafos', 'pfo-parque', 'Parque Arqueológico de Pafos (mosaicos)', 34.7570, 32.4070, 4.5, 2, 'Paphos_Archaeological_Park', '', '', 'Villas romanas com alguns dos mosaicos mais bem conservados do Mediterrâneo, Patrimônio da Humanidade.', { ar: 1 });
  P('pafos', 'pfo-tumbas', 'Tumbas dos Reis', 34.7750, 32.4070, 2.5, 1.25, 'Tombs_of_the_Kings_(Paphos)', '', '', 'Túmulos subterrâneos escavados na rocha no século IV a.C., com pátios de colunas.', { ar: 1 });
  P('pafos', 'pfo-castelo', 'Castelo e porto de Pafos', 34.7537, 32.4065, 2.5, 0.75, 'Paphos_Castle', '', '', 'Pequeno forte medieval na ponta do porto, cercado de restaurantes de peixe.', { ar: 1 });
  P('pafos', 'pfo-afrodite', 'Rocha de Afrodite (Petra tou Romiou)', 34.6638, 32.6270, 0, 2.5, 'Petra_tou_Romiou', '', '', 'O rochedo onde, segundo o mito, a deusa Afrodite nasceu da espuma do mar.', { ar: 1, bv: ['Ônibus 631 (~40 min)', 4] });

  /* ===== ISTAMBUL (parte europeia) ===== */
  P('istambul', 'ist-santa-sofia', 'Santa Sofia', 41.0086, 28.9802, 1100, 1.5, 'Hagia_Sophia', '', '', 'Basílica bizantina do século VI que virou mesquita, museu e mesquita de novo. Turistas visitam a galeria superior.', { avisos: ['Turistas pagam ingresso (~€25) e entram pela galeria superior; lenço para mulheres.'], horario: ['09:00', '19:00'] });
  P('istambul', 'ist-mesquita-azul', 'Mesquita Azul', 41.0054, 28.9768, 0, 0.75, 'Sultan_Ahmed_Mosque', '', '', 'A mesquita dos seis minaretes e 20 mil azulejos de İznik. Fecha para turistas nos horários de oração.');
  P('istambul', 'ist-topkapi', 'Palácio de Topkapı', 41.0115, 28.9834, 2000, 3, 'Topkapı_Palace', 'https://www.millisaraylar.gov.tr', 'Museu', 'A residência dos sultões otomanos por 400 anos, com o harém, o tesouro e terraços sobre o Bósforo.', { fechado: [2], avisos: ['Fechado às terças.'] });
  P('istambul', 'ist-cisterna', 'Cisterna da Basílica', 41.0084, 28.9779, 1300, 0.75, 'Basilica_Cistern', 'https://yerebatan.com', '', 'Reservatório subterrâneo do século VI com 336 colunas, incluindo as duas cabeças de Medusa.');
  P('istambul', 'ist-grande-bazar', 'Grande Bazar', 41.0107, 28.9680, 0, 1.75, 'Grand_Bazaar,_Istanbul', '', 'Compras', 'Um dos maiores mercados cobertos do mundo, com 4 mil lojas em 61 ruas. Pechinchar faz parte.', { label: 'Entrada livre', fechado: [0] });
  P('istambul', 'ist-bazar-especiarias', 'Bazar das Especiarias', 41.0165, 28.9705, 0, 0.75, 'Spice_Bazaar,_Istanbul', '', 'Compras', 'Especiarias, chás, frutas secas e doces turcos num mercado do século XVII, ao lado da ponte de Gálata.', { label: 'Entrada livre' });
  P('istambul', 'ist-galata', 'Torre de Gálata', 41.0256, 28.9741, 1250, 1, 'Galata_Tower', '', '', 'Torre genovesa de 1348 com vista de 360° para o Corno de Ouro e a cidade velha.');
  P('istambul', 'ist-bosforo', 'Passeio de barco pelo Bósforo', 41.0190, 28.9740, 400, 2, 'Bosphorus_Bridge', 'https://www.sehirhatlari.istanbul', '', 'A balsa pública percorre o estreito entre a Europa e a Ásia, passando por palácios, fortalezas e casas de madeira.', { ar: 1 });
  P('istambul', 'ist-dolmabahce', 'Palácio de Dolmabahçe', 41.0392, 29.0005, 1500, 2, 'Dolmabahçe_Palace', 'https://www.millisaraylar.gov.tr', 'Museu', 'O palácio europeu dos últimos sultões, à beira do Bósforo, com um lustre de 4,5 toneladas.', { fechado: SEG });
  P('istambul', 'ist-istiklal', 'İstiklal e Praça Taksim', 41.0340, 28.9780, 0, 1.5, 'İstiklal_Avenue', '', 'Compras', 'A avenida de pedestres do bonde vermelho, com lojas, galerias históricas e doceiras.', { label: 'Entrada livre', ar: 1 });
  P('istambul', 'ist-besiktas', 'Tüpraş Stadyumu (Beşiktaş)', 41.0393, 28.9944, 600, 1.25, 'Beşiktaş_Stadium', 'https://bjk.com.tr', 'Futebol', 'O estádio do Beşiktaş, ao lado do Palácio de Dolmabahçe, com tour e museu do clube.');

  /* ===== ANDORRA ===== */
  P('andorra', 'and-caldea', 'Caldea (spa termal)', 42.5115, 1.5370, 45, 3, 'Caldea', 'https://www.caldea.com', '', 'O maior spa termal do sul da Europa, numa torre de vidro, com lagoas internas e externas de água quente.');
  P('andorra', 'and-meritxell', 'Avinguda Meritxell', 42.5075, 1.5290, 0, 2, 'Andorra_la_Vella', '', 'Compras', 'A avenida das compras com imposto reduzido: eletrônicos, perfumes, roupas e artigos de esqui.', { label: 'Entrada livre', ar: 1 });
  P('andorra', 'and-casa-vall', 'Casa de la Vall', 42.5063, 1.5207, 5, 0.5, 'Casa_de_la_Vall', '', '', 'Casa de pedra de 1580 que foi sede de um dos parlamentos mais antigos da Europa.');
  P('andorra', 'and-tristaina', 'Mirador Solar de Tristaina', 42.6360, 1.4860, 30, 4.5, 'Ordino', '', '', 'Passarela em forma de anel a 2.701 m, sobre os lagos de Tristaina. O teleférico funciona no verão; no inverno a região é estação de esqui.', { ar: 1, bv: ['Ônibus L6 até Ordino-Arcalís (~50 min)', 8] });
})();
