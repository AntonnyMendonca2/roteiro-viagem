# Prompt — Mapa da Viagem pela Europa

> Copie tudo a partir de "INÍCIO DO PROMPT" e cole no Fable.

---

## INÍCIO DO PROMPT

Crie os arquivos do projeto dentro da pasta `C:\Users\anton\Viagem` (a mesma pasta deste
arquivo `prompt.md`). Não apague nem altere o `prompt.md`.

Gere um projeto estático (HTML + CSS + JavaScript puro, sem build, sem backend, sem npm) que será
hospedado no **GitHub Pages** e também precisa abrir com duplo clique no `index.html`
(protocolo `file://`). Estrutura:

```
index.html
css/style.css
js/data.js      ← objeto DATA (cidades, pontos, trechos), definido como `window.DATA = {...}`
js/map.js       ← mapa D3, rotas, animações
js/ui.js        ← painéis, inputs, roteiro, orçamento
js/app.js       ← inicialização e estado (localStorage)
README.md       ← como rodar localmente e como publicar no GitHub Pages
.nojekyll       ← arquivo vazio
```

Regras: carregar os scripts com `<script src>` normais (sem ES modules e sem `fetch` de arquivos
locais, que não funcionam em `file://`); usar só caminhos relativos (o site vai rodar em
`https://<usuario>.github.io/<repositorio>/`). É um PLANEJADOR DE VIAGEM em forma de mapa
interativo da Europa. Tudo em português do Brasil. O roteiro vai mudar com o tempo, então o app
precisa ser editável pela interface: eu escolho cidades, pontos de interesse e meios de
transporte, e os totais se recalculam.

### 1. Bibliotecas (CDN, versões fixas)
- D3: https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js
- TopoJSON: https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js
- Mapa-múndi: https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json

Use D3 com projeção geoConicConformal centrada na Europa. Sem tiles, sem chave de API.

### 2. Estilo: MONOCROMÁTICO + 1 COR DE DESTAQUE
- Base inteira em tons de cinza: fundo #0e0e0e, oceano um pouco mais claro, países cinza escuro com bordas finas.
- ITENS NÃO SELECIONADOS (cidades e pontos de interesse): cinza neutro, opacidade reduzida, sem pulso.
- ITENS SELECIONADOS: uma única cor de destaque (âmbar #F5B841), com pulso suave e glow. Definir em variável CSS `--accent` para eu trocar fácil.
- Países com alguma cidade selecionada ficam em cinza claro; os demais continuam escuros. Transição suave (400ms).
- Rotas ativas na cor de destaque; trechos alternativos (modo não escolhido) em cinza tracejado.
- Tipografia: Inter (Google Fonts). Interface minimalista, cantos arredondados, sombras sutis.
- Responsivo: no celular, toque substitui hover e o painel lateral vira gaveta inferior.

### 3. Animações
1. Ao carregar: fade do mapa e a rota ativa é "desenhada" trecho por trecho (stroke-dashoffset), em arcos curvos.
2. Um ícone de trem ou avião (conforme o modo do trecho) percorre a rota ativa em loop lento.
3. Itens selecionados pulsam (anel que expande e some).
4. HOVER em qualquer ponto (selecionado ou não): card ACIMA do ponto com foto (escala de cinza que ganha cor após ~0,5s), nome, preço de referência e status (Selecionado / Não selecionado). Entrada: sobe 8px + fade.
5. CLIQUE em cidade: ripple, zoom animado (~900ms) até a cidade mostrando todos os pontos dela, painel lateral com slide-in.
6. CLIQUE em ponto de interesse: ripple, painel com detalhes e botão grande "✓ Incluir no roteiro" / "Remover do roteiro". Ao selecionar: animação de "acender" (cinza → destaque, escala 1 → 1.4 → 1) e o total sobe com contagem animada.
7. Hover em trecho da rota: fica mais grosso e mostra tempo, meio e preço.
8. Botão "Ver Europa inteira" e tecla Esc voltam ao zoom inicial.

### 4. Fotos
Buscar pela API da Wikipedia: `https://en.wikipedia.org/api/rest_v1/page/summary/{TÍTULO}` →
`thumbnail.source` (ou `originalimage.source`). Cache em memória. Se falhar, placeholder elegante
com as iniciais. Títulos na coluna "wiki" das listas.

### 5. Modelo de dados (objeto `DATA` em `js/data.js`, fácil de editar)
- `cities`: id, nome, país, lat/lon, moeda local, wiki, selecionada (bool), noites, ordem.
- `pois`: id, cityId, nome, lat/lon, preço de referência + moeda, wiki, descrição curta (escreva você, 2–3 linhas), site oficial, tags ("Harry Potter", "Compras", "Museu", "Bate-volta", "Futebol"), selecionado (bool), avisos.
- `legs`: trechos entre pares de cidades com opções TREM e AVIÃO (tempo + faixa de preço) e modo padrão.
- Estado do usuário salvo em localStorage (com try/catch; o app funciona sem ele). Botões "Exportar JSON", "Importar JSON", "Restaurar padrão" (com confirmação).

### 6. Roteiro editável
- Painel "Meu roteiro" com as cidades selecionadas em ordem; reordenar por drag and drop ou setas ↑↓; definir noites de cada cidade.
- Incluir/remover cidade pelo painel dela ("Incluir cidade no roteiro").
- Rota no mapa: Viracopos → [cidades selecionadas na ordem] → Viracopos, redesenhada com animação quando muda.
- Datas calculadas a partir da data de saída (padrão 02/03/2027) + noites; linha do tempo horizontal embaixo (clicar num dia dá zoom na cidade).
- Viracopos fica fora do recorte: marcador fixo no canto inferior esquerdo ("Campinas – VCP") com arco até a primeira cidade (via Lisboa).

### 7. Transporte: seletor TREM / AVIÃO por trecho + comparativo
- Cada trecho tem seletor [Trem | Avião] e usa o "modo padrão" da tabela abaixo.
- Trechos sem trem viável (ex.: Roma → Atenas) ficam só Avião, com aviso.
- Quando o trem exige parada intermediária (Paris → Cracóvia via Berlim), mostrar a parada no mapa e checkbox "Pernoitar em Berlim" (adiciona 1 noite + campo de hospedagem).
- Cada trecho tem campo "Valor real" (com moeda) que substitui a estimativa quando preenchido.
- Pares não listados: estimar automaticamente e marcar "estimativa": trem = distância/110 km/h + 30 min; avião = distância/700 km/h + 3h de aeroporto; preços genéricos editáveis.
- PAINEL COMPARATIVO sempre visível: "Total cenário TREM", "Total cenário AVIÃO", "Total do meu roteiro (escolhas atuais)", com diferença em R$ e em horas. O cenário trem inclui as noites de pernoite.

#### Tabela de trechos (aproximados)
| Trecho | Padrão | Trem | Avião |
|---|---|---|---|
| Viracopos → Lisboa → Londres | Avião | — | ~14–16h com conexão (campo de valor) |
| Cracóvia → Viracopos | Avião | — | ~16–20h com conexão (campo de valor) |
| Londres → Paris | **Trem** | Eurostar St Pancras→Gare du Nord ~2h20, €60–150 | ~1h15 voo (+3h aeroporto), €50–120 |
| Paris → Cracóvia | **Avião** | via Berlim ~16–18h (pernoite recomendado), €90–210 | low-cost ~2h10, €50–100 com mala |
| Paris → Berlim | Trem | TGV direto ~8h, €60–150 | ~1h45, €50–120 |
| Berlim → Cracóvia | Trem | ~8h (direto ou via Wrocław), €30–60 | ~1h20, €50–120 |
| Paris → Munique | Trem | TGV ~5h40, €50–130 | ~1h30, €50–120 |
| Paris → Zurique | Trem | TGV Lyria ~4h, €40–120 | ~1h15, €60–130 |
| Zurique → Munique | Trem | ~3h30–4h, €30–70 | — |
| Munique → Viena | Trem | Railjet ~4h, €30–80 | ~1h, €50–120 |
| Viena → Bratislava | Trem | ~1h, €10–15 | — |
| Bratislava → Budapeste | Trem | ~2h30, €15–30 | — |
| Viena → Budapeste | Trem | ~2h40, €20–40 | — |
| Viena → Cracóvia | Trem | ~7–8h (direto ou noturno), €30–60 | ~1h10, €60–120 |
| Budapeste → Cracóvia | Trem | ~10h (noturno), €40–80 | ~1h15, €50–120 |
| Paris → Roma | Avião | via Milão (Frecciarossa) ~10–11h, €80–180 | ~2h, €50–130 |
| Roma → Atenas | Avião | sem trem viável | ~2h, €50–130 |

#### Bate-voltas (linhas tracejadas finas no zoom da cidade; custo de transporte editável, entra no total quando o ponto estiver selecionado)
- Londres → Warner Bros. Studio Tour: trem Euston → Watford Junction ~20 min + ônibus ~15 min (~£20 ida e volta)
- Londres → Bicester Village: trem ~1h
- Paris → Disneyland Paris / La Vallée Village: RER A ~40 min
- Paris → Versalhes: RER C ~40 min
- Cracóvia → Auschwitz-Birkenau: ônibus/van ~1h30
- Cracóvia → Wieliczka: ~30 min

### 8. Valores e orçamento
- Em cada cidade selecionada: campos "Hospedagem (total)", "Alimentação", "Transporte local", "Compras", "Outros".
- Em cada ponto de interesse: campo "Valor" com seletor de moeda (BRL, EUR, GBP, PLN, CHF, HUF), pré-preenchido com o preço de referência. **Só entra no total se o ponto estiver selecionado.**
- Itens gerais: "Voo internacional", "Seguro viagem", "ETA Reino Unido", "Chip/internet", "Roupas de frio" (padrão R$ 2.000).
- Câmbio editável (em BRL): EUR 6,20 · GBP 7,40 · PLN 1,45 · CHF 6,60 · HUF 0,016. Checkbox "Somar IOF 3,5%" para valores em moeda estrangeira.
- Resumo fixo no canto: total em BRL (contagem animada), barra de progresso vs. orçamento de R$ 15.000 (editável; acima de 100% vira padrão listrado), subtotais por cidade e por categoria (mini barras horizontais em cinza), e rótulo de subtotal ao lado de cada cidade no mapa.
- Filtro por tag (ex.: mostrar só "Harry Potter" ou "Compras").

### 9. Cidades e pontos de interesse
Todos aparecem no mapa. Os marcados com ★ vêm selecionados por padrão; os demais ficam neutros.

#### Reino Unido — Londres ★ (51.5074, -0.1278) — GBP — 3 noites
- ★ British Museum — 51.5194, -0.1270 — Grátis — "British_Museum"
- ★ Natural History Museum — 51.4967, -0.1764 — Grátis — "Natural_History_Museum,_London"
- National Gallery — 51.5089, -0.1283 — Grátis — "National_Gallery"
- Tate Modern — 51.5076, -0.0994 — Grátis — "Tate_Modern"
- ★ Torre de Londres — 51.5081, -0.0759 — ~£35 — "Tower_of_London"
- ★ Tower Bridge — 51.5055, -0.0754 — Grátis — "Tower_Bridge"
- ★ Big Ben e Parlamento — 51.5007, -0.1246 — Grátis — "Big_Ben"
- Abadia de Westminster — 51.4993, -0.1273 — ~£30 — "Westminster_Abbey"
- ★ Palácio de Buckingham (troca da guarda) — 51.5014, -0.1419 — Grátis — "Buckingham_Palace"
- London Eye — 51.5033, -0.1196 — ~£30–40 — "London_Eye"
- Sky Garden (reservar) — 51.5113, -0.0835 — Grátis — "Sky_Garden"
- ★ Plataforma 9¾ (King's Cross) — 51.5320, -0.1233 — Grátis — "King's_Cross_railway_station" — Harry Potter
- Leadenhall Market (Beco Diagonal) — 51.5128, -0.0834 — Grátis — "Leadenhall_Market" — Harry Potter
- Millennium Bridge — 51.5095, -0.0985 — Grátis — "Millennium_Bridge,_London" — Harry Potter
- ★ Warner Bros. Studio Tour – Harry Potter — 51.6903, -0.4183 — ~£57 — "Warner_Bros._Studio_Tour_London_–_The_Making_of_Harry_Potter" — Harry Potter, Bate-volta — wbstudiotour.co.uk
- Borough Market — 51.5055, -0.0910 — "Borough_Market"
- Camden Market — 51.5413, -0.1466 — "Camden_Market" — Compras
- Brick Lane (brechós) — 51.5216, -0.0717 — "Brick_Lane" — Compras
- ★ Oxford Street (Primark, Uniqlo, Decathlon, Selfridges) — 51.5154, -0.1419 — "Oxford_Street" — Compras
- Regent Street (Hamleys, Liberty) — 51.5107, -0.1376 — "Regent_Street" — Compras
- Carnaby Street — 51.5131, -0.1390 — "Carnaby_Street" — Compras
- Covent Garden — 51.5117, -0.1240 — "Covent_Garden" — Compras
- Westfield Stratford — 51.5432, -0.0063 — "Westfield_Stratford_City" — Compras
- Burberry Outlet (Hackney) — 51.5466, -0.0556 — "Burberry" — Compras
- Bicester Village (outlet) — 51.8920, -1.1564 — "Bicester_Village" — Compras, Bate-volta
- Emirates Stadium (Arsenal, tour) — 51.5549, -0.1084 — ~£30 — "Emirates_Stadium" — Futebol
- Stamford Bridge (Chelsea, tour) — 51.4817, -0.1910 — ~£30 — "Stamford_Bridge_(stadium)" — Futebol

Nota de Londres: o Reino Unido não devolve imposto para turistas.

#### França — Paris ★ (48.8566, 2.3522) — EUR — 4 noites
- ★ Torre Eiffel (topo) — 48.8584, 2.2945 — ~€36 — "Eiffel_Tower"
- ★ Louvre — 48.8606, 2.3376 — €32 — "Louvre" — aviso "Fechado às terças" — ticketlouvre.fr
- ★ Notre-Dame — 48.8530, 2.3499 — Grátis — "Notre-Dame_de_Paris"
- ★ Montmartre / Sacré-Cœur — 48.8867, 2.3431 — Grátis — "Sacré-Cœur,_Paris"
- Arco do Triunfo (terraço) — 48.8738, 2.2950 — ~€22 — "Arc_de_Triomphe"
- Champs-Élysées — 48.8698, 2.3075 — Grátis — "Champs-Élysées"
- Museu d'Orsay — 48.8600, 2.3266 — ~€16 — "Musée_d'Orsay"
- Sainte-Chapelle — 48.8554, 2.3450 — ~€20 — "Sainte-Chapelle"
- Passeio de barco no Sena — 48.8610, 2.3080 — ~€17 — "Seine"
- Palácio de Versalhes — 48.8049, 2.1204 — ~€25–35 — "Palace_of_Versailles" — Bate-volta
- ★ Disneyland Paris — 48.8722, 2.7758 — €111 — "Disneyland_Paris" — Bate-volta — nota "~€70–80 em dia de semana, 1 parque" — disneylandparis.com
- La Vallée Village (outlet) — 48.8550, 2.7830 — "Val_d'Europe" — Compras
- Galeries Lafayette (terraço grátis) — 48.8738, 2.3320 — "Galeries_Lafayette" — Compras
- Printemps Haussmann — 48.8738, 2.3283 — "Printemps_(department_store)" — Compras
- Le Marais (lojas e brechós) — 48.8590, 2.3620 — "Le_Marais" — Compras
- Decathlon / Uniqlo (roupa de frio) — 48.8720, 2.3340 — "Decathlon" — Compras

Nota de Paris: devolução de imposto (détaxe) de ~10–12% em compras acima de €100 na mesma loja e no mesmo dia.

#### Polônia — Cracóvia ★ (50.0647, 19.9450) — PLN — 3 noites
- ★ Praça Principal (Rynek Główny) — 50.0617, 19.9373 — Grátis — "Main_Square,_Kraków"
- ★ Castelo de Wawel — 50.0540, 19.9354 — externo grátis — "Wawel_Castle"
- ★ Kazimierz — 50.0510, 19.9460 — Grátis — "Kazimierz"
- Fábrica de Schindler — 50.0475, 19.9616 — ~50 PLN — "Oskar_Schindler's_Enamel_Factory"
- ★ Auschwitz-Birkenau — 50.0266, 19.2036 — 150 PLN (General tour 3h45, inglês; study tour 6h também existe) — "Auschwitz_concentration_camp" — Bate-volta — visit.auschwitz.org
- Mina de Sal de Wieliczka — 49.9833, 20.0550 — ~150–170 PLN — "Wieliczka_Salt_Mine" — Bate-volta

#### Alemanha — Berlim (52.5200, 13.4050) — EUR — parada do trem Paris → Cracóvia
- Portão de Brandemburgo — 52.5163, 13.3777 — Grátis — "Brandenburg_Gate"
- East Side Gallery (Muro de Berlim) — 52.5050, 13.4397 — Grátis — "East_Side_Gallery"
- Ilha dos Museus — 52.5169, 13.4019 — ~€20 — "Museum_Island"

#### Alemanha — Munique (48.1351, 11.5820) — EUR
- Marienplatz — 48.1374, 11.5755 — Grátis — "Marienplatz"
- Castelo de Neuschwanstein — 47.5576, 10.7498 — ~€21 — "Neuschwanstein_Castle" — Bate-volta

#### Portugal — Lisboa (38.7223, -9.1393) — EUR — conexão aérea
- Torre de Belém — 38.6916, -9.2160 — ~€10 — "Belém_Tower"

#### Suíça — Zurique (47.3769, 8.5417) — CHF
- Jungfraujoch (via Interlaken) — 46.5475, 7.9853 — ~CHF 200+ — "Jungfraujoch" — Bate-volta

#### Áustria — Viena (48.2082, 16.3738) — EUR
- Palácio de Schönbrunn — 48.1845, 16.3122 — ~€30 — "Schönbrunn_Palace"
- Catedral de Santo Estêvão — 48.2085, 16.3731 — Grátis — "St._Stephen's_Cathedral,_Vienna"

#### Eslováquia — Bratislava (48.1486, 17.1077) — EUR
- Castelo de Bratislava — 48.1424, 17.1000 — ~€10 — "Bratislava_Castle"

#### Hungria — Budapeste (47.4979, 19.0402) — HUF
- Parlamento — 47.5071, 19.0458 — ~€25 — "Hungarian_Parliament_Building"
- Banhos Széchenyi — 47.5186, 19.0823 — ~€30 — "Széchenyi_thermal_bath"
- Bastião dos Pescadores — 47.5022, 19.0348 — Grátis — "Fisherman's_Bastion"

#### Itália — Roma (41.9028, 12.4964) — EUR
- Coliseu — 41.8902, 12.4922 — ~€18 — "Colosseum"
- Museus Vaticanos / Capela Sistina — 41.9065, 12.4536 — ~€20–25 — "Vatican_Museums"
- Fontana di Trevi — 41.9009, 12.4833 — ~€2 — "Trevi_Fountain"
- Panteão — 41.8986, 12.4769 — ~€5 — "Pantheon,_Rome"

#### Grécia — Atenas (37.9838, 23.7275) — EUR
- Acrópole — 37.9715, 23.7257 — ~€30 — "Acropolis_of_Athens"
- Museu da Acrópole — 37.9685, 23.7285 — ~€20 — "Acropolis_Museum"
- Plaka — 37.9725, 23.7300 — Grátis — "Plaka"

#### Ucrânia — SOMENTE INFORMATIVO (não selecionável, ícone de alerta, área hachurada)
- Chernobyl (acidente nuclear de 1986, norte do país) — 51.2763, 30.2219 — "Chernobyl_Exclusion_Zone" — aviso "País em guerra. Turismo suspenso."
- Usina Nuclear de Zaporíjia (sul, em zona de guerra) — 47.5119, 34.5856 — "Zaporizhzhia_Nuclear_Power_Plant" — aviso "Zona de guerra ativa."

### 10. Extras e qualidade
- Legenda discreta: cidade, ponto de interesse (selecionado / neutro), trem, avião, bate-volta, área informativa.
- Aviso visual no Louvre quando a data calculada da visita cair numa terça.
- Atalho: Esc fecha o painel e volta ao zoom da Europa.
- Código organizado e comentado; dados todos no objeto `DATA` em `js/data.js`.
- Sem erros no console. Testar: hover, clique, seleção/remoção de pontos e cidades, reordenação do roteiro, troca trem/avião, pernoite em Berlim, inputs, câmbio, IOF, persistência, exportar/importar.

## FIM DO PROMPT
