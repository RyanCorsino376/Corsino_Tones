# CorsinoTones

Loja de **packs de presets** de pedais e pedaleiras de guitarra. Um preset é um
conjunto de ajustes salvo no equipamento; um pack reúne os presets de **um estilo
musical para um único modelo de pedaleira** (por exemplo, "Rock · Boss GT-1000"),
então tudo o que se compra funciona no aparelho de quem comprou.

A proposta inicial (problema, público e tecnologias previstas) está em
[`docs/proposta.md`](docs/proposta.md). O plano da loja, com as decisões tomadas
depois dela, está em [`.specs/features/etapa05-loja/plano.md`](.specs/features/etapa05-loja/plano.md).

## Estado atual

O projeto está na **etapa 07: persistência com PostgreSQL**. O front-end é JavaScript
puro organizado em módulos ES. A API Spring Boot (porta 8081, senhas com BCrypt,
token JWT) agora guarda usuários, equipamentos, packs, presets e pedidos em um
**PostgreSQL 16** (Docker), e os dados sobrevivem a reiniciar a aplicação. O
catálogo inicial é criado pelas migrações do Flyway. O site ainda lê packs e presets
da API simulada ([json-server](https://github.com/typicode/json-server)); só o
cadastro e o login usam o Spring. Modelo de dados, exemplos de `curl` e a escolha do
PostgreSQL: [`docs/etapa-07.md`](docs/etapa-07.md). Etapa 05, evidências e roteiro de
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

Requer Node.js, Python 3, JDK 21 (o Maven vem junto, pelo `mvnw`) e **Docker**, que
roda o PostgreSQL. Na pasta do projeto:

```bash
npm install
cp .env.example .env
```

Troque `POSTGRES_PASSWORD` no `.env` (ele não vai para o git) e suba o banco, na
porta 5433:

```bash
docker compose up -d
```

Em um terminal, a API Spring Boot (porta 8081). Ela exige o segredo que assina os
tokens de login, com pelo menos 32 caracteres, e a senha do banco, definidos por
variáveis de ambiente (sem elas o app não inicia). Nunca coloque os valores no git.
`CORSINO_DB_URL` e `CORSINO_DB_USER` têm padrão e só precisam mudar para outro banco:

```bash
cd backend
export CORSINO_JWT_SECRET="um-segredo-local-com-pelo-menos-32-caracteres"
export CORSINO_DB_PASSWORD="<a senha do .env>"
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
Spring, mas o mock e os testes usam `127.0.0.1`. As contas criadas no Spring ficam
no PostgreSQL e continuam lá depois de reiniciar a API.

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
(configuração em `playwright.config.js`; o banco precisa estar ligado
(`docker compose up -d`) e `CORSINO_DB_PASSWORD` exportada; a primeira execução compila o Spring e
demora mais). Se algum deles já estiver ligado, ele é reaproveitado. Os testes do
back-end rodam separados, com JUnit e MockMvc, contra um PostgreSQL criado pelo
Testcontainers (o Docker precisa estar ligado):

```bash
cd backend
./mvnw clean test
```

## Próximos passos

- Carrinho, compra simulada e biblioteca com download (fatias 4 a 6 do plano).
- Avaliar a migração do cliente para React com TypeScript, depois da loja.
- Mover packs, presets, pedidos e biblioteca do site para o Spring Boot, que já os
  guarda no PostgreSQL, e guardar os arquivos dos presets no MinIO.
- Reescrever o cliente em React com TypeScript (especificação em
  `.specs/features/etapa06-react-catalogo/`).
