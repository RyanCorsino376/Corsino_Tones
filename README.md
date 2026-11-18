# CorsinoTones

Loja de **packs de presets** de pedais e pedaleiras de guitarra. Um preset é um
conjunto de ajustes salvo no equipamento; um pack reúne os presets de **um estilo
musical para um único modelo de pedaleira** (por exemplo, "Rock · Boss GT-1000"),
então tudo o que se compra funciona no aparelho de quem comprou.

A proposta inicial (problema, público e tecnologias previstas) está em
[`docs/proposta.md`](docs/proposta.md). O plano da loja, com as decisões tomadas
depois dela, está em [`.specs/features/etapa05-loja/plano.md`](.specs/features/etapa05-loja/plano.md).

## Estado atual

O projeto está na **etapa 06: servidor com Spring Boot**. O front-end é JavaScript
puro organizado em módulos ES. O **cadastro e o login** já passam por uma API
Spring Boot (porta 8081, senhas com BCrypt, token JWT); packs, presets, carrinho e
pedidos ainda vêm de uma API simulada pelo
[json-server](https://github.com/typicode/json-server). Os usuários do Spring ficam
**só em memória** (o banco PostgreSQL vem depois) e são carregados de
`mock/db.seed.json` ao iniciar. Descrição da etapa 05, evidências e roteiro de
teste: [`docs/etapa-05.md`](docs/etapa-05.md).

| Tela | Arquivo | O que faz |
| ---- | ------- | --------- |
| Página inicial | `frontend/index.html` | Carrossel com os packs |
| Packs | `frontend/packs.html` | Cards dos packs com filtros por marca e estilo, busca (inclusive pelo modelo) e ordenação |
| Pack | `frontend/pack.html?id=rock-boss-gt-1000` | Preço, descrição e presets incluídos |
| Entrar / Criar conta | `frontend/login.html` | Login e cadastro pela API Spring (cartão que gira) |
| Biblioteca | `frontend/biblioteca.html` | Exige login; mostrará os packs comprados |

Carrinho, compra simulada e biblioteca com download são as próximas fatias do plano.

## Estrutura

```
frontend/
  api/        requisições HTTP (só aqui há fetch)
  servicos/   regras: login, cadastro, sessão, junção packs + presets
  ui/         peças de interface: cards, cabeçalho, carregando/erro, pop-up
  paginas/    um módulo de entrada por página
backend/      API Spring Boot (Java 21, Maven): controller, service, repository, model, dto
mock/         dados do servidor simulado (db.seed.json) e preparar.js
imagens/      logomarca e imagens das páginas
tests/        testes Playwright
docs/         proposta, descrição das etapas e capturas de tela
.specs/       especificações, tarefas e decisões de cada parte
```

## Como executar

Requer Node.js, Python 3 e JDK 21 (o Maven vem junto, pelo `mvnw`). Na pasta do projeto:

```bash
npm install
```

Em um terminal, a API Spring Boot (porta 8081). Ela exige o segredo que assina os
tokens de login, com pelo menos 32 caracteres, definido por variável de ambiente
(sem ele o app não inicia). Nunca coloque o segredo no git:

```bash
cd backend
export CORSINO_JWT_SECRET="um-segredo-local-com-pelo-menos-32-caracteres"
./mvnw spring-boot:run
```

Em outro terminal, a API simulada (porta 3000):

```bash
npm run api
```

Use `npm run api:lento` para atrasar cada resposta em 2 s e ver os estados de
carregamento. Em um terceiro, o site (porta 8080). As páginas usam
`../imagens/` e módulos ES, então o servidor parte da raiz do repositório:

```bash
python3 -m http.server 8080
```

Depois abra <http://127.0.0.1:8080/frontend/index.html>.

**Conta de teste:** `ryan@exemplo.com`, senha `teste123` (existe no Spring e no mock).

Use `127.0.0.1` no navegador, e não `localhost`: as duas origens são aceitas pelo
Spring, mas o mock e os testes usam `127.0.0.1`. As contas criadas no Spring somem
quando ele é reiniciado.

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

O Playwright sobe sozinho o site, a API simulada e o Spring durante os testes
(configuração em `playwright.config.js`; a primeira execução compila o Spring e
demora mais). Se algum deles já estiver ligado, ele é reaproveitado. Os testes do
back-end rodam separados, com JUnit e MockMvc:

```bash
cd backend
./mvnw clean test
```

## Próximos passos

- Carrinho, compra simulada e biblioteca com download (fatias 4 a 6 do plano).
- Avaliar a migração do cliente para React com TypeScript, depois da loja.
- Mover packs, presets, pedidos e biblioteca para o Spring Boot, e então ligar o
  PostgreSQL no lugar do armazenamento em memória.
- Reescrever o cliente em React com TypeScript (especificação em
  `.specs/features/etapa06-react-catalogo/`).
