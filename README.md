# Mapa da Viagem — Europa 2027

Planejador de viagem em forma de mapa interativo da Europa. Site estático (HTML + CSS +
JavaScript puro): não tem build, backend nem npm.

- 68 destinos em toda a Europa, com cerca de 500 pontos de interesse.
- Escolha cidades, pontos de interesse e meio de transporte (trem, ônibus, balsa ou avião) de cada trecho.
- Os totais, as datas e o comparativo terrestre × avião se recalculam na hora.
- Suas escolhas ficam salvas no navegador (localStorage) e podem ser exportadas/importadas em JSON.

## Como rodar no computador

**Opção 1 — duplo clique:** abra o arquivo `index.html` no navegador. Funciona direto em
`file://`.

**Opção 2 — servidor local** (opcional):

```bash
# dentro da pasta do projeto
python -m http.server 8000
# depois abra http://localhost:8000
```

É preciso estar conectado à internet: o D3, o contorno dos países, a fonte Inter e as fotos
(Wikipedia) vêm de CDNs. Sem internet o roteiro e o orçamento continuam funcionando, mas o mapa
fica sem os países e sem fotos.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `viagem`).
2. Envie os arquivos desta pasta:

   ```bash
   git init
   git add .
   git commit -m "Mapa da viagem"
   git branch -M main
   git remote add origin https://github.com/<usuario>/<repositorio>.git
   git push -u origin main
   ```

3. No GitHub, abra **Settings → Pages**. Em **Build and deployment**, escolha
   **Source: Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
4. Em um ou dois minutos o site fica disponível em
   `https://<usuario>.github.io/<repositorio>/`.

O projeto usa só caminhos relativos, então funciona em qualquer subpasta. O arquivo `.nojekyll`
(vazio) avisa o GitHub para servir os arquivos como estão.

> O que você digita no app fica salvo **no seu navegador**, não no repositório. Para levar o
> roteiro para outro aparelho, use **Dados → Exportar JSON** e depois **Importar JSON**.

## Estrutura

```
index.html      página única
css/style.css   estilo (monocromático + 1 cor de destaque)
js/data.js      objeto DATA: cidades e pontos do roteiro original, trechos, câmbio, itens gerais
js/data-europa.js    Europa completa: demais cidades, moedas, trechos (trem/ônibus/balsa/avião)
js/data-pontos-*.js  pontos de interesse das cidades novas (e reforço das antigas)
js/net.js       chamadas a APIs externas: cache no navegador (com validade) e filas por serviço
js/cambio.js    câmbio automático (Frankfurter/BCE), spread e mini-gráficos de 90 dias
js/clima.js     clima típico nas datas, previsão, nascer/pôr do sol e lista "o que levar"
js/map.js       mapa D3, rotas e animações
js/ui.js        painéis, inputs, roteiro, orçamento, linha do tempo, legenda
js/app.js       estado (localStorage), cálculos e inicialização
.nojekyll       arquivo vazio (GitHub Pages)
prompt.md       especificação original
prompt-v2.md    especificação da atualização 2
tests/          testes das funções puras (abra tests/index.html no navegador)
```

## Como personalizar

**Cor de destaque:** em `css/style.css`, troque a variável `--accent` (logo no começo do arquivo).

**Cidades, pontos e trechos:** o roteiro original fica em `js/data.js`; a Europa completa, em
`js/data-europa.js` (cidades e trechos, uma linha por item) e `js/data-pontos-*.js` (pontos).

- `cities` — id, nome, país, lat/lon, moeda, título da Wikipedia (`wiki`), `selecionada`,
  `noites`, `ordem`, `estacao` (estação principal), `diariaHospedagem` e `diariaGastos` (moeda
  local), `aeroExtraH` (horas até o aeroporto mais próximo, para cidades sem aeroporto).
- `pois` — pontos de interesse: `cityId`, lat/lon, `preco` (`v` é o número usado no orçamento,
  `label` é o texto exibido), `wiki`, `desc`, `site`, `tags`, `selecionado`, `avisos`.
  Bate-voltas têm `bateVolta: { desc, custo }`; `fechado: [2]` avisa quando a visita cai em
  uma terça (0 = domingo … 6 = sábado).
- `legs` — trechos entre pares de cidades, com as opções `trem`, `onibus`, `balsa` e `aviao`
  (tempo em horas e faixa de preço em euros) e o modo `padrao`. O seletor de cada trecho mostra
  só os meios disponíveis. Pares que não estão na lista são estimados: por terra, pelo caminho
  mais rápido na rede de trechos da tabela (Dijkstra); de avião, pela distância. Aparecem
  marcados como "estimativa".
- `config`, `cambio`, `gerais` — data de saída, orçamento, câmbio e itens gerais padrão.

Depois de mudar valores padrão no `data.js`, use **Dados → Restaurar padrão** no app para
descartar o que estava salvo no navegador.

## Como usar

- **Passe o mouse** (ou toque) em um ponto para ver foto, preço de referência e status.
- **Clique em uma cidade** para dar zoom, ver os pontos dela e preencher os gastos.
- **Clique em um ponto** para ver os detalhes e incluir/remover do roteiro. Só pontos
  selecionados entram no total.
- **Meu roteiro:** reordene as cidades arrastando ou com as setas ↑↓, ajuste as noites e escolha
  Trem ou Avião em cada trecho. O campo "Valor real" substitui a estimativa.
- **Rota inteligente:** ao incluir uma cidade, ela entra na posição que deixa a viagem mais curta
  (problema do caixeiro-viajante, resolvido de forma exata com o algoritmo de Held-Karp).
  Critérios: menor tempo (porta a porta, com o modo trem/avião de cada trecho), menor custo ou
  menor distância. Por padrão a 1ª e a última cidade ficam fixas (chegada e saída dos voos
  internacionais). Reordenar à mão desliga a otimização automática; o botão "Otimizar agora"
  mostra quanto a melhor ordem economiza. Até 14 cidades a solução é exata; acima disso o app usa
  uma heurística (2-opt + Or-opt) e avisa "rota aproximada".
- **Europa completa:** "Ver Europa inteira" enquadra todos os destinos, da Islândia a Chipre; ao
  abrir, o mapa enquadra o seu roteiro ("Ver meu roteiro"). No zoom da Europa aparecem os nomes
  das cidades do roteiro e de algumas grandes; as demais são pontos (o nome surge no hover ou ao
  aproximar). Rússia e Bielorrússia, como a Ucrânia, são somente informativas. Em "Meu roteiro"
  há uma busca para adicionar cidades, agrupadas por país. Moedas sem cotação automática (RSD,
  ALL, MKD, MDL) ficam manuais; a BAM é derivada do euro (paridade fixa).
- **Passagens aéreas:** clique em um país no mapa (ou veja o painel da cidade) para abrir buscas
  já preenchidas no Google Flights, Skyscanner e Kayak — da cidade anterior do roteiro até a
  cidade daquele país, na data de chegada (e a volta para Campinas, na última cidade). Não usa
  API nem chave: os preços aparecem no site de cada buscador.
- **Hospedagem:** no painel da cidade, buscas no Airbnb e no Booking com as datas de entrada e
  saída, e a página de hostels do Hostelworld. Em "Minha hospedagem", marque o local clicando no
  mapa ou colando um link do Google Maps (ou "latitude, longitude"); as distâncias e o tempo a pé
  dos pontos passam a ser medidos a partir dela. O número de pessoas fica em
  `DATA.config.viajantes` (`js/data.js`).
- **Orçamento:** itens gerais, câmbio, IOF e orçamento total.
- **Câmbio automático:** em **Orçamento → Câmbio**, o modo *Automático* busca a cotação do dia ao
  abrir o app (guardada por 12 h) e mostra a data e a fonte; o modo *Manual* mantém o que você
  digitar. O **spread** (padrão 4%) entra em toda conversão, junto com o IOF, porque cartão e casa
  de câmbio cobram acima da cotação comercial. Cada moeda tem um mini-gráfico de 90 dias com a
  variação e a posição em relação à média. O resumo mostra quanto o total mudou desde a cotação
  anterior.
- **Clima e luz do dia:** a linha do tempo mostra, em cada dia, a mínima/máxima típica e um ícone
  (sol, nuvem, chuva, neve). O painel da cidade traz o bloco **Clima nas suas datas** (médias,
  chance de chuva e de neve, horas de luz e pôr do sol). São médias dos últimos 10 anos; quando a
  data está a até 16 dias, entra a previsão real. A aba Orçamento ganha a lista **O que levar**,
  gerada pelas mínimas da viagem, como sugestão para o item "Roupas de frio".
- **Esc** ou **Ver Europa inteira** fecha o painel e volta ao zoom inicial.

Os preços e tempos são aproximados e servem de referência — confira nos sites oficiais antes de
comprar.

## APIs externas

Todas são gratuitas, sem chave e chamadas direto do navegador. As respostas ficam guardadas no
`localStorage` (chaves `viagem-cache:*`) com validade; sem internet o app usa o que estiver
guardado ou mostra um aviso discreto. Nenhuma chave de API fica no código do site.

| Uso | Serviço | Validade do cache |
|---|---|---|
| Câmbio do dia e histórico de 90 dias | [Frankfurter](https://frankfurter.dev) (Banco Central Europeu) | 12 h |
| Clima histórico (10 anos) e previsão de 16 dias | [Open-Meteo](https://open-meteo.com) | 30 dias / 3 h |

## Testes

Abra `tests/index.html` no navegador (duplo clique ou pelo servidor local). A página carrega os
scripts do app e roda os testes das funções puras, mostrando ✓/✗. O botão no fim da página confere
se todos os títulos `wiki` devolvem foto (lento: ~1 por segundo).

## Créditos

- [D3](https://d3js.org) 7.9.0 e [TopoJSON Client](https://github.com/topojson/topojson-client) 3.1.0
- Contorno dos países: [world-atlas](https://github.com/topojson/world-atlas) 2.0.2 (Natural Earth)
- Mapa de ruas (ao dar zoom): Esri World Dark Gray Canvas — © Esri, HERE, Garmin, © OpenStreetMap.
  Não precisa de chave de API. Para trocar a fonte, edite `TILE_URL` em `js/map.js`.
- Links "Ver no Google Maps" e "Como chegar" abrem o Google Maps (não usam API)
- Fotos: API REST da Wikipedia · Fonte: Inter (Google Fonts) · Ícones: Material Icons
