# Mapa da Viagem — Europa 2027

Planejador de viagem em forma de mapa interativo da Europa. Site estático (HTML + CSS +
JavaScript puro): não tem build, backend nem npm.

- 69 destinos em toda a Europa, com cerca de 500 pontos de interesse.
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
js/wiki.js      consultas à Wikipedia (lugares próximos, busca, popularidade) e filtros
js/trilhos.js   traçado real dos trens, horários reais e paisagens no caminho
js/ape.js       trajetos reais a pé (matriz de tempos da cidade e caminho desenhado)
js/descobrir.js "Descobrir por perto" e pontos de interesse criados pelo usuário
js/diaadia.js   roteiro dia a dia automático de cada cidade
js/assistente.js assistente "Tenho X dias e R$ Y: o que cabe?" (otimizador em Web Worker)
js/cenarios.js   cenários A/B/C: versões do roteiro e comparação lado a lado
js/compartilhar.js link de compartilhamento (roteiro dentro do link), QR code, mesclar
js/colab.js       edição em conjunto (sincroniza o roteiro pelo Worker de links curtos)
js/futebol.js    clubes, jogos cadastrados à mão, avisos de data e busca automática opcional
js/data-futebol.js clubes de cada cidade, DATA.jogos e o endereço do proxy opcional
worker/futebol.js Cloudflare Worker opcional (guarda a chave da football-data.org)
worker/roteiro.js Cloudflare Worker opcional (links curtos de compartilhamento)
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
- **Trens de verdade:** os trechos de trem seguem o traçado real da ferrovia (a animação e o
  ícone também). No cartão do trecho, **Ver horários reais** traz as 3 melhores opções (horário,
  duração, baldeações, nome do trem), o link da operadora e o botão **Usar esta duração**, que
  substitui a estimativa da tabela. Para datas ainda sem horário publicado, o app consulta o
  mesmo dia da semana numa data próxima e mostra como "horário de referência".
  **Paisagens no caminho** lista castelos, lagos, vales e afins por onde o trem passa, em ordem,
  com o lado da janela, o horário aproximado e a sugestão de onde sentar; no mapa elas aparecem
  como pontinhos ao longo da linha (fotos com o zoom próximo). Em **Dados → Pré-carregar rotas
  dos trens** dá para guardar todos os traçados para uso sem internet.
- **Trajetos a pé:** o painel do ponto mostra a distância e o tempo a pé **reais**, pelas ruas,
  desde a sua hospedagem (ou do centro). **Como chegar a pé** desenha o caminho no mapa. Acima de
  3 km o app sugere o transporte público, com o link do Google Maps. Sem internet, volta à
  estimativa (linha reta × 1,3) e avisa "estimativa".
- **Descobrir por perto:** no fim do painel da cidade, **Buscar sugestões na Wikipedia** lista
  atrações que ainda não estão cadastradas, com foto, descrição, distância e acessos por mês.
  **+ Adicionar** cria o ponto (ele passa a valer em tudo: mapa, totais, filtros, exportar);
  **Ocultar** some com a sugestão e o app lembra. Dá para ver as sugestões no mapa (losangos
  cinza) e para **adicionar um ponto pelo nome**. Pontos criados por você levam a marca "meu",
  têm preço editável (padrão 0) e podem ser excluídos no painel do ponto. As paisagens do caminho
  do trem também podem virar pontos com o botão **+**.
- **Dia a dia:** o painel de cada cidade do roteiro monta a agenda dos pontos selecionados: dia
  de chegada só à tarde, dias inteiros das 9h às 19h e partida só de manhã (ajustável em
  `DATA.config.diaADia`). Bate-voltas longos ganham um dia só para eles; os demais pontos são
  agrupados por proximidade, respeitando dias fechados, horários e o dia que você fixar. Cada
  ponto mostra o horário estimado e o deslocamento (a pé pelas ruas, ou transporte se for longe).
  Arraste um ponto para outro dia (ou use o seletor ao lado) para fixá-lo; **Reorganizar
  automaticamente** libera os dias fixos. Avisos: dia puxado (mais de 10h, com sugestão do que
  mover), atração que fecha antes e atividade ao ar livre depois do pôr do sol. No mapa, os
  chips escolhem o dia: o trajeto dele aparece em destaque com os pontos numerados e os outros
  dias em cinza tracejado. Clicar num dia da linha do tempo abre o plano daquele dia, e **Copiar
  como texto** leva a agenda para a área de transferência.
- **Assistente "o que cabe?":** na aba **Assistente**, informe os dias e o orçamento, dê de 1 a 5
  estrelas às cidades, marque as obrigatórias ("obrig.") e as que não quer ("não"), ajuste as
  noites mínimas/máximas e clique em **Montar 3 roteiros**. O app escolhe cidades, ordem, noites
  e meio de transporte de cada trecho e mostra três alternativas — mais interesse, mais barata e
  equilibrada — com custo estimado, dias, horas de deslocamento e a diferença para o roteiro
  atual. **Ver no mapa** mostra a prévia em cinza tracejado; **Aplicar este roteiro** substitui o
  atual (com confirmação e **Desfazer**). O custo usa as diárias de cada cidade (hospedagem e
  gastos por dia), editáveis no painel da cidade em "Estimativas por dia para o assistente".
  A busca é uma metaheurística (simulated annealing) com tempo limitado, rodando em um Web
  Worker criado por Blob — funciona também em `file://`.
- **Esc** ou **Ver Europa inteira** fecha o painel e volta ao zoom inicial.

Os preços e tempos são aproximados e servem de referência — confira nos sites oficiais antes de
comprar.

### Futebol

No painel de cada cidade com clubes relevantes há a seção **Futebol** (64 clubes em 43 cidades — Londres: Arsenal, Chelsea, Tottenham e West Ham; Paris: PSG; Cracóvia: Wisła e Cracovia; Munique: Bayern; etc.):

- **Clubes:** estádio, liga e os links oficiais de **Calendário** e **Ingressos**. Quando o tour do estádio já é um ponto de interesse, aparece o atalho **Tour do estádio**.
- **Jogos:** não existe API de jogos gratuita, sem chave e que o navegador possa chamar; por isso os jogos são **cadastrados à mão** — em **Adicionar jogo** (data, hora local, mandante, visitante, competição, estádio e link de ingressos) ou em `DATA.jogos`, no `js/data-futebol.js`. Dá para editar e excluir os que você cadastrou.
- Cada jogo mostra como cai nas suas datas: "Você estará em Londres neste dia", "Você chega 1 dia depois do jogo", "Você sai 2 dias antes do jogo" ou cidade fora do roteiro. Jogos nas datas do roteiro ganham uma **bola na linha do tempo**.
- **Pôr no orçamento** transforma o jogo em um ponto de interesse no estádio, fixado no dia do jogo: informe o valor do ingresso e ele entra no total e no dia a dia. O tour do estádio entra no orçamento como qualquer ponto.

#### Jogos automáticos (opcional)

Se você quiser que os jogos apareçam sozinhos, crie um **Cloudflare Worker** que guarda a chave da football-data.org. **A chave fica só no Worker; o site nunca a contém.**

1. Crie a chave grátis em <https://www.football-data.org/client/register> (chega por e-mail).
2. Em <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Worker** (o plano grátis basta). Dê um nome (ex.: `futebol`) e clique em **Deploy**.
3. **Edit code**: apague o exemplo, cole o conteúdo de `worker/futebol.js` e clique em **Deploy**.
4. **Settings → Variables and Secrets**:
   - `FOOTBALL_DATA_KEY` (tipo **Secret**): a sua chave;
   - `ALLOWED_ORIGINS` (tipo **Text**): os endereços que podem usar o Worker, separados por vírgula, sem barra no fim — ex.: `https://seu-usuario.github.io,http://localhost:8000`.
5. Copie o endereço do Worker (ex.: `https://futebol.seu-usuario.workers.dev`) para `DATA.config.futebolProxyUrl`, no fim do `js/data-futebol.js`.

Com isso, o app busca os jogos **em casa** dos clubes das cidades do roteiro (dois dias antes da chegada até dois dias depois da saída), guarda por 12 horas e mostra com a etiqueta "automático". O Worker só aceita os domínios autorizados, só repassa a consulta "jogos de um time entre duas datas" e guarda cada resposta por 6 horas. O plano grátis da football-data.org cobre as grandes ligas (Inglaterra, Alemanha, Espanha, Itália, França, Holanda, Portugal e a Champions); os clubes cobertos têm o campo `fd` (número do time na API) no `js/data-futebol.js` — os números foram anotados de memória: se algum clube não trouxer jogos, confira o número em `https://api.football-data.org/v4/competitions/<liga>/teams`. Clubes de outras ligas (ex.: a polonesa) continuam só com o cadastro à mão. Não funciona em `file://` (o navegador não envia o domínio).

### Reservas

Cada **trecho**, **hospedagem** e **ponto de interesse** tem um status de reserva: *Automático*, *Não precisa*, *A reservar*, *Reservado* ou *Pago*.

- No automático, trechos e hospedagens sempre pedem reserva; pontos pedem quando são pagos ou quando o aviso do ponto fala em reserva/ingresso/agendamento.
- *Reservado* e *Pago* mostram o campo do **código da reserva**; *A reservar* mostra **Comprar até** (prazo). Prazo vencido ou a até 14 dias aparece em destaque.
- O quadro **Reservas**, no topo de *Meu roteiro*, mostra quantas já foram feitas e, expandido, a lista do que falta (prazos primeiro) e do que já está reservado — cada item abre o trecho/cidade/ponto.

### Bagagem

O cartão de cada trecho diz como fica a bagagem no meio de transporte escolhido:

- **Avião dentro da Europa:** nas low-cost a tarifa básica só leva um item pessoal. **Somar mala no custo** vem ligado e soma `DATA.config.malaLowCost` (padrão €35 por trecho; editável em cada trecho — no bate-volta, ida e volta). Nos comparativos *Cenário avião* e na rota inteligente por custo a mala sempre entra. Trechos cuja estimativa já inclui a mala têm `comMala: true` na tabela.
- **Voo internacional:** aviso para conferir se a tarifa inclui mala despachada.
- **Trem, ônibus e balsa:** bagagem inclusa.

### Bate-volta de cidade

Qualquer cidade pode ser visitada **em um dia, indo e voltando** a partir de uma cidade do roteiro, sem pernoite (ex.: Liverpool a partir de Londres, Madri a partir de Barcelona):

- No painel da cidade, **"Dá para fazer em um bate-volta"** aparece quando há uma cidade do roteiro a até 4 h dela; no painel de uma cidade do roteiro, **Bate-voltas a partir de…** lista as cidades perto com o tempo de viagem (**+ Cidade** inclui).
- O bate-volta **não entra na sequência da rota nem muda as datas**: ocupa um dia da estadia na base (de preferência um dia inteiro; dá para escolher o dia). Se a base sair do roteiro, ele sai junto.
- Em **Meu roteiro** ele fica num cartão tracejado logo abaixo da base; expandido, mostra o dia, o trecho de **ida e volta** (meio de transporte, horários reais do trem, busca de voos, **valor real** das duas passagens somadas e link) e os pontos escolhidos na cidade.
- O custo soma o trecho de ida e volta (estimativa × 2 ou o valor real), os pontos e os gastos da cidade (sem hospedagem).
- No mapa, o trecho é tracejado e a cidade vira um anel; na linha do tempo, o dia leva o nome da cidade (↺); no **Dia a dia** da base, o dia mostra a agenda do bate-volta, com saída às 8h e a volta.
- **Dormir em… (virar parada)** transforma o bate-volta em parada com pernoite, e vice-versa.

### Cenários A/B/C

O botão **Cenário** (barra superior) guarda várias versões do roteiro — por exemplo "Com Roma" e "Só Leste Europeu":

- **Duplicar o atual** cria uma cópia e já entra nela; **Criar vazio** começa do zero; ✎ renomeia e × exclui (com confirmação).
- Cada cenário tem a sua data de saída, cidades (ordem, noites, gastos, hospedagem), pontos, trechos (modo e valor real) e opções da rota inteligente. **Itens gerais, orçamento total e câmbio são os mesmos em todos**, para a comparação ser justa.
- **Comparar…** abre o painel lado a lado (o cenário ativo + até 2): total, dias, noites, horas de deslocamento, cidades, pontos, trechos por meio de transporte e interesse, com a diferença para o ativo. As cidades que só existem em um cenário aparecem em destaque. Com **Comparar no mapa**, as rotas dos outros cenários aparecem em cinza tracejado.
- No **Assistente**, cada alternativa tem o botão **Salvar como cenário**.
- Roteiros salvos antes desta versão viram o "Cenário A" sozinhos. **Exportar/Importar** levam todos os cenários.

### Compartilhar por link

O botão **Compartilhar** (barra superior e aba **Dados**) gera um link com o roteiro inteiro **dentro dele** — não há servidor:

- O link leva só o que difere do roteiro padrão, em JSON compactado (`CompressionStream('deflate-raw')`) e codificado em base64url, no *hash*: `…/#r=1z<dados>`. O `1` é a versão do formato; `z` = compactado, `j` = JSON puro (usado quando o navegador não tem `CompressionStream`). Como fica no hash, nada vai para o servidor.
- A janela mostra o link, o tamanho, **Copiar link**, **Enviar…** (no celular, pelo compartilhamento do sistema) e um **QR code** (biblioteca `qrcode-generator@1.4.4`, carregada só nessa hora).
- **Privacidade:** o link inclui hospedagens marcadas e todos os valores. Marque **Não incluir hospedagens e valores** para mandar só o roteiro (cidades, noites, pontos, trechos).
- Vai só o cenário ativo; marque **Incluir todos os cenários** para mandar todos.
- Quem abre o link vê a faixa **"Você está vendo um roteiro compartilhado"**, com: **Só visualizar** (modo leitura — nada é salvo no navegador), **Usar este roteiro** (substitui o seu, com confirmação e *Desfazer*), **Mesclar** (acrescenta ao seu as cidades e os pontos que você não tem, sem trazer valores) e **Voltar ao meu**.
- Funciona também em `file://`, mas aí o link só abre no mesmo computador.

#### Links curtos (opcional)

Com vários cenários, pontos e valores, o link completo passa de 2 mil caracteres. Com um **Cloudflare Worker** seu, o roteiro (o mesmo `1z…` compactado) fica guardado num banco KV da sua conta e o link leva só um código de 10 letras: `…/roteiro-viagem/#s=k7Qm2xPaB4`. O plano grátis da Cloudflare basta (KV grátis: 1.000 gravações e 100 mil leituras por dia). O código vem do conteúdo, então o mesmo roteiro gera sempre o mesmo link.

1. Em <https://dash.cloudflare.com>, abra **Storage & Databases → KV → Create** e crie um namespace chamado `roteiros`.
2. Em **Workers & Pages → Create → Create Worker**, dê um nome (ex.: `links`) e clique em **Deploy**.
3. **Edit code**: apague o exemplo, cole o conteúdo de `worker/roteiro.js` e clique em **Deploy**.
4. No Worker, **Settings → Bindings → Add → KV namespace**: *Variable name* `ROTEIROS`, namespace `roteiros`.
5. Em **Settings → Variables and Secrets**, adicione `ALLOWED_ORIGINS` (tipo **Text**) com o endereço do seu site **sem a pasta**, ex.: `https://seu-usuario.github.io` (para testar no computador, acrescente `,http://localhost:8000`). Opcional: `TTL_DIAS` para apagar os links depois de N dias (sem ela, não expiram).
6. Copie o endereço do Worker (ex.: `https://links.seu-usuario.workers.dev`) para `linkCurtoUrl`, no `DATA.config` do `js/data.js`, e publique.

Com isso, **Compartilhar** passa a mostrar o link curto (o QR code também fica bem menor), com a opção **Copiar o link completo**, que não depende do servidor. Se o Worker estiver fora do ar, a janela avisa e mostra o link completo. Os links `#r=` antigos continuam abrindo. Importante: o link curto só funciona enquanto o roteiro estiver no seu KV; se você apagar o Worker ou o namespace, ele para de abrir.

### Edição em conjunto

Precisa do Worker de links curtos (abaixo) com o código atual de `worker/roteiro.js`. Em **Compartilhar → Editar junto → Criar link de edição**, o app gera um link `…/#e=<código>`:

- Quem abrir o link entra no mesmo roteiro (o roteiro dele fica guardado e volta ao sair). Cada mudança é enviada ~1,5 s depois; a cada ~12 s (e ao voltar para a aba) o app busca as mudanças dos outros. A barra superior mostra **Editando junto · sincronizado**.
- Se duas pessoas salvarem ao mesmo tempo, o app **mescla**: mudanças em campos diferentes ficam as duas; no mesmo campo, vale a última a chegar.
- Câmbio, spread/IOF e filtros continuam pessoais.
- **Quem tiver o link de edição pode mudar o roteiro** — mande só para quem vai planejar com você. *Sair (fico com uma cópia)* ou *Sair e voltar ao meu roteiro* encerram.
- O KV da Cloudflare pode levar até ~1 minuto para mostrar uma mudança em outra região do mundo; entre pessoas no mesmo país costuma ser imediato. Cada mudança salva conta como 1 gravação (o plano grátis permite 1.000 por dia).

## APIs externas

Todas são gratuitas, sem chave e chamadas direto do navegador. As respostas ficam guardadas no
`localStorage` (chaves `viagem-cache:*`) com validade; sem internet o app usa o que estiver
guardado ou mostra um aviso discreto. Nenhuma chave de API fica no código do site.

| Uso | Serviço | Validade do cache |
|---|---|---|
| Câmbio do dia e histórico de 90 dias | [Frankfurter](https://frankfurter.dev) (Banco Central Europeu) | 12 h |
| Clima histórico (10 anos) e previsão de 16 dias | [Open-Meteo](https://open-meteo.com) | 30 dias / 3 h |
| Traçado das ferrovias | [OpenRailRouting](https://routing.openrailrouting.org) (servidor comunitário: 1 requisição por vez) | 1 ano |
| Tempos e caminhos a pé | [OSRM](https://routing.openstreetmap.de) perfil de pedestres (servidor comunitário: 1 por segundo) | 180 dias |
| Horários reais de trem | [Transitous](https://transitous.org) | 24 h |
| Fotos, lugares próximos e popularidade | Wikipedia / Wikimedia | 30 dias |
| QR code do link de compartilhamento | biblioteca `qrcode-generator@1.4.4` (jsDelivr), carregada só ao abrir a janela | — |
| Jogos de futebol (opcional, desligado por padrão) | football-data.org **pelo seu Cloudflare Worker** (a chave fica no Worker) | 12 h |
| Links curtos de compartilhamento (opcional, desligado por padrão) | **seu Cloudflare Worker** + KV (`worker/roteiro.js`) | — |

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
