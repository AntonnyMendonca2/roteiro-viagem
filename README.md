# Mapa da Viagem — Europa 2027

Planejador de viagem em forma de mapa interativo da Europa. Site estático (HTML + CSS +
JavaScript puro): não tem build, backend nem npm.

- Escolha cidades, pontos de interesse e meio de transporte (trem ou avião) de cada trecho.
- Os totais, as datas e o comparativo trem × avião se recalculam na hora.
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
js/data.js      objeto DATA: cidades, pontos de interesse, trechos, câmbio, itens gerais
js/map.js       mapa D3, rotas e animações
js/ui.js        painéis, inputs, roteiro, orçamento, linha do tempo, legenda
js/app.js       estado (localStorage), cálculos e inicialização
.nojekyll       arquivo vazio (GitHub Pages)
prompt.md       especificação original
```

## Como personalizar

**Cor de destaque:** em `css/style.css`, troque a variável `--accent` (logo no começo do arquivo).

**Cidades, pontos e trechos:** tudo fica em `js/data.js`.

- `cities` — id, nome, país, lat/lon, moeda, título da Wikipedia (`wiki`), `selecionada`,
  `noites`, `ordem`.
- `pois` — pontos de interesse: `cityId`, lat/lon, `preco` (`v` é o número usado no orçamento,
  `label` é o texto exibido), `wiki`, `desc`, `site`, `tags`, `selecionado`, `avisos`.
  Bate-voltas têm `bateVolta: { desc, custo }`; `fechado: [2]` avisa quando a visita cai em
  uma terça (0 = domingo … 6 = sábado).
- `legs` — trechos entre pares de cidades, com as opções `trem` e `aviao` (tempo em horas e
  faixa de preço em euros) e o modo `padrao`. Pares que não estão na lista são estimados
  automaticamente (parâmetros em `estimativa`) e aparecem marcados como "estimativa".
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
- **Orçamento:** itens gerais, câmbio, IOF e orçamento total.
- **Esc** ou **Ver Europa inteira** fecha o painel e volta ao zoom inicial.

Os preços e tempos são aproximados e servem de referência — confira nos sites oficiais antes de
comprar.

## Créditos

- [D3](https://d3js.org) 7.9.0 e [TopoJSON Client](https://github.com/topojson/topojson-client) 3.1.0
- Contorno dos países: [world-atlas](https://github.com/topojson/world-atlas) 2.0.2 (Natural Earth)
- Mapa de ruas (ao dar zoom): Esri World Dark Gray Canvas — © Esri, HERE, Garmin, © OpenStreetMap.
  Não precisa de chave de API. Para trocar a fonte, edite `TILE_URL` em `js/map.js`.
- Links "Ver no Google Maps" e "Como chegar" abrem o Google Maps (não usam API)
- Fotos: API REST da Wikipedia · Fonte: Inter (Google Fonts) · Ícones: Material Icons
