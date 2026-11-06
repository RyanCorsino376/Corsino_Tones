# CorsinoTones

Loja de **packs de presets** de pedais e pedaleiras de guitarra. Um preset é um
conjunto de ajustes salvo no equipamento; um pack reúne todos os presets de um
estilo musical (Rock, Blues, Metal, Clean), para qualquer equipamento.

A proposta inicial (problema, público e tecnologias previstas) está em
[`docs/proposta.md`](docs/proposta.md). O plano da loja, com as decisões tomadas
depois dela, está em [`.specs/features/etapa05-loja/plano.md`](.specs/features/etapa05-loja/plano.md).

## Estado atual

O projeto está na **etapa 05: modularização e comunicação assíncrona**. O
front-end é JavaScript puro organizado em módulos ES e conversa com uma API
simulada pelo [json-server](https://github.com/typicode/json-server). Descrição
da etapa, evidências e roteiro de teste: [`docs/etapa-05.md`](docs/etapa-05.md).

| Tela | Arquivo | O que faz |
| ---- | ------- | --------- |
| Página inicial | `frontend/index.html` | Carrossel com os packs |
| Packs | `frontend/packs.html` | Cards dos packs com filtros por marca e estilo, busca e ordenação |
| Pack | `frontend/pack.html?id=rock` | Preço, descrição e presets incluídos |
| Entrar / Criar conta | `frontend/login.html` | Login e cadastro pela API (cartão que gira) |
| Biblioteca | `frontend/biblioteca.html` | Exige login; mostrará os packs comprados |

Carrinho, compra simulada e biblioteca com download são as próximas fatias do plano.

## Estrutura

```
frontend/
  api/        requisições HTTP (só aqui há fetch)
  servicos/   regras: login, cadastro, sessão, junção packs + presets
  ui/         peças de interface: cards, cabeçalho, carregando/erro, pop-up
  paginas/    um módulo de entrada por página
mock/         dados do servidor simulado (db.seed.json) e preparar.js
imagens/      logomarca e imagens das páginas
tests/        testes Playwright
docs/         proposta, descrição das etapas e capturas de tela
.specs/       especificações, tarefas e decisões de cada parte
```

## Como executar

Requer Node.js e Python 3. Na pasta do projeto:

```bash
npm install
```

Em um terminal, a API simulada (porta 3000):

```bash
npm run api
```

Use `npm run api:lento` para atrasar cada resposta em 2 s e ver os estados de
carregamento. Em outro terminal, o site (porta 8080). As páginas usam
`../imagens/` e módulos ES, então o servidor parte da raiz do repositório:

```bash
python3 -m http.server 8080
```

Depois abra <http://127.0.0.1:8080/frontend/index.html>.

**Conta de teste:** `ryan@exemplo.com`, senha `teste123`.

Os dados ficam em `mock/db.json`, criado a partir de `mock/db.seed.json` na
primeira execução. Para apagar as contas criadas e voltar aos dados originais:

```bash
npm run api:reset
```

## Testes

Os testes usam [Playwright](https://playwright.dev/) em um navegador real, porque
verificam layout, foco, animação e comunicação com a API.

```bash
npx playwright install chromium
npm test
```

O Playwright sobe sozinho o site e a API durante os testes (configuração em
`playwright.config.js`). Se um `npm run api` estiver ligado, ele é reaproveitado.

## Próximos passos

- Carrinho, compra simulada e biblioteca com download (fatias 4 a 6 do plano).
- Avaliar a migração do cliente para React com TypeScript, depois da loja.
- Criar a API em Java com Spring Boot e o banco PostgreSQL.
