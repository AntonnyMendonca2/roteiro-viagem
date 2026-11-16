# Plano de migração para a AWS

Objetivo: transformar o planejador num produto com **contas de usuário**, **banco de dados** e
**API**, sem expor os dados curados (cidades, pontos, trechos, preços) nem deixar o custo fugir do
controle em caso de abuso.

Este documento é para ser executado **uma etapa por vez** (por você ou por uma sessão de IA). Cada
etapa diz o que fazer e **quando está pronta**. Não pule etapas: cada uma deixa o site funcionando.

---

## 1. Princípios

1. **O site continua estático** (o build do Vite em `dist/`). Tudo o que precisa ser protegido vai
   para a API: dados curados, roteiros dos usuários e, depois, a lógica de valor.
2. **Serverless, sem contêineres**: API Gateway + Lambda + DynamoDB não cobram parados e escalam
   sozinhos. Contêineres (ECS/Fargate + ALB + RDS) têm custo fixo e mais superfície exposta.
3. **Todo limite é explícito**: na AWS não existe teto automático de gasto. Cada camada tem um
   limite configurado (seção 5) e há alertas de custo desde o primeiro dia.
4. **Infraestrutura como código** (AWS CDK em TypeScript, na pasta `infra/`): nada é criado à mão
   no console, exceto a conta e os alertas iniciais. Assim dá para revisar, repetir e desfazer.
5. **Nenhum segredo no frontend nem no repositório.** O deploy usa GitHub OIDC (sem chaves de
   acesso salvas).

## 2. Arquitetura alvo

```
 Navegador ──► Amplify Hosting (CloudFront + Shield Standard)  ── site estático (dist/)
     │
     ├──► Cognito (managed login: e-mail/senha, Google)  ── devolve um token (JWT)
     │
     └──► API Gateway (HTTP API, autorizador JWT do Cognito, throttling)
                 └──► Lambda (Node.js 22, concorrência reservada)
                          └──► DynamoDB (sob demanda, throughput máximo, TTL)

 Opcional: Cloudflare na frente (DNS + proxy) para DDoS ilimitado, rate limiting e bloqueio de IP
           sem pagar o AWS WAF.
```

**Região:** `sa-east-1` (São Paulo), a mais perto dos usuários. É um pouco mais cara que
`us-east-1`; se custo pesar mais que latência, use `us-east-1`.

## 3. Modelo de dados (DynamoDB)

### Tabela `catalogo` (dados curados — só leitura pela API)

| pk | sk | conteúdo |
|---|---|---|
| `CIDADE#londres` | `META` | o objeto da cidade (hoje em `data.js` / `data-europa.js`) |
| `CIDADE#londres` | `PONTO#lon-abbey-road` | um ponto de interesse |
| `CIDADE#londres` | `CLUBE#arsenal` | clube de futebol |
| `TRECHOS` | `londres~paris` | um trecho da tabela |
| `CONFIG` | `GERAL` | moedas, categorias, itens gerais, origem (Viracopos), estimativas |

Um script `infra/seed/semear.mjs` lê os arquivos `js/data*.js` atuais (carregando-os num `window`
falso, como faz o `tests/`) e grava no DynamoDB. Rodar de novo atualiza.

### Tabela `app` (dados dos usuários)

| pk | sk | conteúdo |
|---|---|---|
| `USER#<sub>` | `ROTEIRO#<id>` | resumo para a lista "meus roteiros" (nome, atualizado em) |
| `ROTEIRO#<id>` | `ESTADO` | o roteiro (mesmo objeto de `Compartilhar.montar(state, { todos: true })`), `versao` |
| `ROTEIRO#<id>` | `MEMBRO#<sub>` | papel: `dono`, `editor` ou `leitor` (edição em conjunto) |
| `CONVITE#<codigo>` | `ROTEIRO#<id>` | link de convite para editar ou ver, com TTL |
| `LINK#<id>` | `-` | link curto (o `1z…` compactado), com TTL |

- **Edição em conjunto:** as gravações usam `ConditionExpression: versao = :base`. Se falhar,
  devolve 409 com a versão atual, e o `js/colab.js` já sabe mesclar e tentar de novo. Ao contrário do
  KV da Cloudflare, o DynamoDB tem leitura fortemente consistente: sem o atraso de até ~60 s.
- **TTL** do DynamoDB apaga links curtos e convites vencidos sem custo.

## 4. API (HTTP API, todas as rotas exigem token, exceto onde indicado)

| Método e rota | O que faz |
|---|---|
| `GET /catalogo/cidades` | lista leve de todas as cidades (id, nome, país, lat, lon, moeda) — para desenhar o mapa |
| `GET /catalogo/cidades/{id}` | cidade completa + pontos + clubes |
| `GET /catalogo/trechos` | tabela de trechos |
| `GET /catalogo/config` | moedas, categorias, origem, estimativas |
| `GET /roteiros` · `POST /roteiros` | meus roteiros · criar |
| `GET /roteiros/{id}` · `PUT /roteiros/{id}?base=n` · `DELETE /roteiros/{id}` | ler · salvar com versão · apagar |
| `POST /roteiros/{id}/convites` · `POST /convites/{codigo}` | criar convite · aceitar convite |
| `POST /links` · `GET /links/{id}` (**público**, com limite baixo) | link curto (substitui o Worker) |
| `DELETE /me` | apaga a conta e todos os dados (LGPD) |

Cada resposta de catálogo leva `Cache-Control` curto (ex.: 5 min) para o navegador não pedir de novo.

## 5. Proteções e limites de custo (configurar todos)

| Camada | Configuração | Valor inicial sugerido |
|---|---|---|
| Conta | MFA no usuário root; uso diário via IAM Identity Center | — |
| Custo | **AWS Budgets** com alertas por e-mail | US$ 5, 10 e 20 por mês |
| Custo | **Cost Anomaly Detection** | ligado |
| Site | Shield Standard (já vem com CloudFront/Amplify) | — |
| API | **Throttling** do estágio | 20 req/s, pico 40 |
| API | Throttling das rotas de escrita (`PUT/POST`) | 5 req/s, pico 10 |
| API | Autorizador JWT do Cognito em todas as rotas, menos `GET /links/{id}` | — |
| Lambda | **Concorrência reservada** por função (teto duro) | 5 a 10 |
| Lambda | Timeout e memória baixos | 5 s · 256 MB |
| DynamoDB | Sob demanda com **throughput máximo** (teto duro) | ex.: 50 leituras/s e 20 gravações/s por tabela |
| DynamoDB | Tamanho máximo do roteiro validado na Lambda | 256 KB |
| Cognito | Verificação de e-mail obrigatória; limite de tentativas padrão | — |
| Abuso por IP | **Cloudflare na frente** (grátis) **ou** AWS WAF com regra *rate-based* (~US$ 5–10/mês) | 100 req / 5 min por IP |
| Observação | Alarmes no CloudWatch: 5xx, 429 (throttles) e gasto | e-mail |

Com esses tetos, o pior caso de um ataque é **o serviço ficar lento ou recusar pedidos**, não a
fatura explodir.

## 6. Custos estimados (confira no AWS Pricing Calculator; os preços mudam)

Com poucas centenas de usuários: Amplify Hosting, Lambda, API Gateway, DynamoDB sob demanda e
Cognito ficam perto de **zero** (cotas gratuitas e cobrança por uso). Custos fixos possíveis: domínio
(~R$ 40/ano no Registro.br) e AWS WAF (~US$ 5–10/mês, ou zero usando a Cloudflare na frente).

## 7. Etapas

### E0 — Preparação da conta
- Conta AWS com MFA no root; usuário administrador via IAM Identity Center.
- Budgets (US$ 5/10/20) e Cost Anomaly Detection.
- Repositório GitHub **privado**.
- **Pronto quando:** você recebe o e-mail de teste do Budget e o repositório está privado.

### E1 — Infraestrutura base (CDK)
- Pasta `infra/` com um app CDK (TypeScript): tabelas `catalogo` e `app` (sob demanda, throughput
  máximo, TTL, PITR ligado na `app`), Cognito User Pool + app client (PKCE, managed login), HTTP API
  com autorizador JWT e throttling, uma Lambda `GET /saude`.
- Deploy pelo GitHub Actions com OIDC (sem chaves salvas).
- **Pronto quando:** `GET /saude` responde 401 sem token e 200 com o token de um usuário de teste.

### E2 — Site no Amplify Hosting
- Conectar o repositório privado; build `npm ci && npm run build`; artefatos `dist`.
- Domínio próprio (opcional nesta etapa). Atualizar `ALLOWED_ORIGINS` do Worker com o novo
  endereço enquanto o Worker existir.
- **Pronto quando:** o site abre pelo endereço do Amplify e funciona como no GitHub Pages.

### E3 — Login no site
- Botão **Entrar / Sair** na barra superior (Cognito managed login com PKCE; biblioteca
  `aws-amplify` só com o módulo de Auth, ou fluxo OAuth feito à mão).
- Guardar o token só em memória + refresh token conforme a biblioteca; nada no `localStorage` além
  do que a biblioteca exige.
- **Pronto quando:** dá para criar conta, confirmar o e-mail, entrar e sair; o site continua
  funcionando sem login como hoje.

### E4 — Roteiros na nuvem
- Lambdas de `/roteiros`. No primeiro login, oferecer **subir o roteiro deste navegador** para a
  conta. Depois, salvar com o mesmo mecanismo do `js/colab.js` (envio adiado ~1,5 s, versão, mescla
  em 409), apontando para a API em vez do Worker.
- Tela **Meus roteiros** (lista, abrir, renomear, apagar).
- **Pronto quando:** o roteiro aparece igual em dois navegadores logados na mesma conta, e os testes
  de mescla (`tests/testes.js`, grupo "Edição em conjunto") continuam passando.

### E5 — Catálogo pela API (a etapa que protege os dados)
- Script de semeadura (seção 3) e Lambdas de `/catalogo`.
- O boot do app passa a ser assíncrono: `js/main.js` carrega `config`, `cidades` e `trechos` da API
  **antes** de importar o resto (hoje os arquivos `js/data*.js` montam `window.DATA` na hora).
  Os pontos de cada cidade vêm sob demanda ao abrir a cidade (`/catalogo/cidades/{id}`), com cache.
- Decidir o que visitante sem login vê (sugestão: o mapa com as cidades, sem pontos nem preços, e um
  convite para criar conta).
- Remover `js/data*.js` do `js/main.js` (continuam no repositório como fonte da semeadura e dos testes).
- **Pronto quando:** `grep "Abbey Road" dist/assets/*.js` não encontra nada e o app funciona logado.
- Atenção: muitas partes do app assumem que todos os pontos estão em memória (busca, filtros por
  tag, assistente, cenários). Fazer em dois passos: primeiro carregar o catálogo inteiro pela API
  após o login (já protege contra quem não tem conta), depois o carregamento por cidade.

### E6 — Edição em conjunto e links curtos na AWS
- Convites (`/roteiros/{id}/convites`) substituem o link `#e=`; papéis dono/editor/leitor.
- `/links` substitui o Worker de links curtos (DynamoDB com TTL).
- Desligar o Cloudflare Worker (ou mantê-lo só como proxy), depois de um período em que os links
  antigos ainda abrem.
- **Pronto quando:** dois usuários editam o mesmo roteiro com papéis diferentes e um leitor não
  consegue salvar (403).

### E7 — Proteções e observação
- Conferir todos os itens da seção 5, os alarmes e um teste de carga simples (ex.: 100 pedidos/s por
  1 minuto) para ver o throttling devolver 429 sem gerar custo relevante.
- **Pronto quando:** o teste de carga recebe 429 e o custo do dia no Cost Explorer fica em centavos.

### E8 — Conta e LGPD
- Página de **política de privacidade** e **termos de uso**; consentimento no cadastro.
- `DELETE /me` (apaga usuário no Cognito e todos os itens dele) e exportar meus dados (JSON).
- **Pronto quando:** apagar a conta remove tudo do DynamoDB e do Cognito.

### E9 (opcional) — Lógica no servidor
- Levar o assistente "o que cabe?" e a rota inteligente para Lambdas, se quiser proteger os
  algoritmos. O código já é puro (`App._t.heldKarp`, `Assistente.problema`, `avaliar`, `otimizar`),
  então dá para reaproveitar quase sem mudança.

## 8. Decisões em aberto (do dono do projeto)

1. O que visitante sem login pode ver?
2. Região: `sa-east-1` (latência) ou `us-east-1` (custo)?
3. Cloudflare na frente da AWS (grátis, recomendado) ou AWS WAF?
4. Domínio próprio e quando.
5. Monetização (afiliados, anúncios) — muda os termos de uso e a política de privacidade.

## 9. Para quem for executar (pessoa ou IA)

- Uma etapa por vez, numa branch própria, com commit ao fim de cada etapa.
- Antes de terminar: `npm run build` sem erros, `tests/index.html` com todos os testes passando e o
  site conferido no navegador.
- Não colocar chaves, tokens ou senhas no repositório nem no frontend.
- Atualizar o README e este documento quando uma decisão for tomada ou uma etapa terminar.
