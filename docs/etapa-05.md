# Etapa 05 — Modularização e comunicação assíncrona #

O front-end deixou de ler dados fixos e passou a conversar com um servidor. Os
presets e os usuários vêm de uma API simulada pelo **json-server**. O código foi
dividido em módulos ES (`import`/`export`), e cada chamada ao servidor mostra
os três estados: carregando, sucesso e erro.

A etapa foi feita em duas partes, cada uma com sua especificação:

- **Parte 1, catálogo pela API:** `.specs/features/etapa05-api-modulos/spec.md`
- **Parte 2, login, cadastro e sessão:** `.specs/features/etapa05-auth/spec.md`

O plano completo da loja (carrinho, compra e biblioteca), do qual estas são as
duas primeiras partes, está em `.specs/features/etapa05-loja/plano.md`.

---

## Tabela de requisitos ##

Evidências em `docs/evidencias/etapa-05/`. A estrutura de módulos e o código
assíncrono não aparecem na tela, então as linhas 01 e 10 apontam para arquivos
de texto e de código, cada trecho indicando o arquivo e as linhas de origem.

| Requisito da etapa | Como foi atendido | Arquivo(s) | Evidência |
| ------------------ | ----------------- | ---------- | --------- |
| Separar o código em módulos | 15 módulos em `api/`, `servicos/`, `ui/` e `paginas/`, ligados por `import`/`export` | `frontend/**/*.js` | [01-estrutura-modulos.txt](evidencias/etapa-05/01-estrutura-modulos.txt) |
| Evitar um único arquivo com toda a lógica | Cada página carrega um módulo pequeno; só `api/` faz requisições | `frontend/paginas/*.js` | [01-estrutura-modulos.txt](evidencias/etapa-05/01-estrutura-modulos.txt) |
| Chamadas assíncronas | Catálogo, busca de usuário e criação de conta pela rede | `api/cliente.js`, `api/presets.js`, `api/usuarios.js` | [10-fetch-async-await.js](evidencias/etapa-05/10-fetch-async-await.js) |
| Fetch API | `fetch` com limite de tempo (`AbortController`) | `api/cliente.js` | [10-fetch-async-await.js](evidencias/etapa-05/10-fetch-async-await.js) |
| Promises e async/await | `async function` + `await` + `try/catch/finally` em todas as chamadas | `api/`, `servicos/auth.js`, `ui/estado.js`, `paginas/login.js` | [10-fetch-async-await.js](evidencias/etapa-05/10-fetch-async-await.js) |
| Estados de carregamento | "Carregando presets..." na lista e no carrossel; "Entrando..." e "Cadastrando..." nos botões | `ui/estado.js`, `paginas/login.js` | [02-consulta-carregando.png](evidencias/etapa-05/02-consulta-carregando.png), [05-envio-carregando.png](evidencias/etapa-05/05-envio-carregando.png) |
| Erros de comunicação | Mensagem + "Tentar novamente" na lista; alerta no formulário; detalhe técnico no console | `api/cliente.js`, `ui/estado.js`, `paginas/login.js` | [04-consulta-erro.png](evidencias/etapa-05/04-consulta-erro.png) |
| Dados externos ou serviço simulado | json-server servindo `mock/db.json`, criado a partir de `mock/db.seed.json` | `mock/`, `package.json` | [03-consulta-sucesso.png](evidencias/etapa-05/03-consulta-sucesso.png) |

### Entregas pedidas ###

| Entrega | Onde ver | Evidência |
| ------- | -------- | --------- |
| Operação de consulta | `GET /presets`, na lista de presets e no carrossel | [03-consulta-sucesso.png](evidencias/etapa-05/03-consulta-sucesso.png) |
| Operação submetida ao servidor | `POST /usuarios`, no cadastro | [06-envio-sucesso.png](evidencias/etapa-05/06-envio-sucesso.png) |
| Tratamento de sucesso | Lista desenhada; após o cadastro, sessão aberta e "Olá, Ana" no cabeçalho | [03-consulta-sucesso.png](evidencias/etapa-05/03-consulta-sucesso.png), [06-envio-sucesso.png](evidencias/etapa-05/06-envio-sucesso.png) |
| Tratamento de erro | Servidor fora do ar, e-mail já cadastrado, senha errada | [04-consulta-erro.png](evidencias/etapa-05/04-consulta-erro.png), [07-envio-erro.png](evidencias/etapa-05/07-envio-erro.png), [08-login-erro.png](evidencias/etapa-05/08-login-erro.png) |
| Tratamento de carregamento | Aviso na lista; botão desativado com texto de espera | [02-consulta-carregando.png](evidencias/etapa-05/02-consulta-carregando.png), [05-envio-carregando.png](evidencias/etapa-05/05-envio-carregando.png) |

---

## Arquitetura ##

### Servidor simulado ###

O **json-server** transforma um arquivo JSON em uma API REST (rotas HTTP como
`GET /presets` e `POST /usuarios`). Foi escolhido no lugar de uma API pública
porque aceita gravação: o cadastro cria um registro de verdade, que um login
seguinte encontra. Uma API pública teria dados sem relação com presets.

- `mock/db.seed.json` (versionado) guarda os dados iniciais: os 9 presets e o
  usuário de teste.
- `mock/db.json` é a cópia de trabalho que o json-server lê e grava. Ele fica
  fora do git (`.gitignore`), porque muda a cada cadastro.
- `mock/preparar.js` cria `db.json` a partir da semente quando ele não existe;
  `npm run api:reset` restaura os dados originais.

O endereço da API está em um único lugar, `BASE_URL` em `frontend/api/cliente.js`.
Quando o back-end em Spring Boot existir, só essa linha muda (decisão AD-008).

### Módulos ###

As páginas usam `<script type="module">`, e os módulos ficam em quatro pastas,
cada uma com uma responsabilidade (decisão AD-009):

| Pasta | Responsabilidade | Exemplo |
| ----- | ---------------- | ------- |
| `api/` | Requisições HTTP, e nada mais | `listarPresets()`, `criarUsuario()` |
| `servicos/` | Regras do negócio e estado guardado no navegador | `entrar()`, `cadastrar()`, `abrirSessao()` |
| `ui/` | Peças de interface reaproveitadas | `carregarComEstado()`, `atualizarCabecalho()` |
| `paginas/` | Um ponto de entrada por página, que junta as outras peças | `paginas/presets.js` |

Antes, os scripts compartilhavam dados por variáveis globais (`window.PRESETS`,
`window.criarCartao`). Com módulos, cada arquivo declara o que usa (`import`)
e o que oferece (`export`), e nada fica solto em `window`. Um teste automático
garante isso: ele procura `fetch(` fora de `api/` e atribuições a `window` em
todo o `frontend/`.

---

## Funcionalidades ##

### 1. Catálogo pela API, com carregamento e erro ###
**Arquivos:** `api/cliente.js`, `api/presets.js`, `ui/estado.js`,
`paginas/presets.js`, `paginas/inicio.js`

A lista de presets e o carrossel da página inicial buscam `GET /presets`.
Os estados ficam todos em `carregarComEstado()`, usada pelas duas páginas:

1. **Carregando:** mostra "Carregando presets..." (`role="status"`, anunciado
   por leitores de tela). A contagem e a mensagem de lista vazia ficam ocultas.
2. **Sucesso:** apaga o aviso e desenha a lista. Os filtros marcados durante o
   carregamento já são aplicados.
3. **Erro:** mostra "Não foi possível carregar os presets. Verifique sua conexão
   e tente novamente." com o botão **Tentar novamente**, que repete a requisição.

O `requisicao()` de `cliente.js` trata como erro quatro situações diferentes.
Para quem usa o site, a mensagem é a mesma; a causa exata vai para o console
(`console.error`), para quem desenvolve:

| Situação | Por que precisa de tratamento próprio |
| -------- | ------------------------------------- |
| Servidor desligado ou sem rede | `fetch` rejeita a Promise |
| Resposta 404 ou 500 | `fetch` **não** rejeita nesses casos; é preciso conferir `resposta.ok` |
| Servidor não responde | Sem limite, a página ficaria carregando para sempre; após 8 s o `AbortController` cancela |
| Resposta que não é JSON, ou não é uma lista | A lista quebraria ao filtrar; vira erro antes disso |

### 2. Cadastro (operação submetida ao servidor) ###
**Arquivos:** `api/usuarios.js`, `servicos/auth.js`, `paginas/login.js`

Depois da validação dos campos (etapa 04), o cadastro:

1. procura o e-mail com `GET /usuarios?email=`. Se já existir, mostra "Este
   e-mail já está cadastrado." no campo e **não** envia nada;
2. envia `POST /usuarios` com nome, e-mail e senha em JSON;
3. abre a sessão e leva a pessoa para a página inicial já logada.

O e-mail é gravado sem espaços e em minúsculas, então `Ana@Exemplo.com` e
`ana@exemplo.com` são a mesma conta.

### 3. Login ###
**Arquivos:** `servicos/auth.js`, `paginas/login.js`

O login busca o usuário pelo e-mail e confere a senha. E-mail inexistente e
senha errada mostram a **mesma** mensagem, "E-mail ou senha incorretos.", para
não revelar quais e-mails têm conta. Em caso de erro, a senha é apagada e o
e-mail continua no campo.

Durante o envio, o botão fica desativado e mostra "Entrando..." ou
"Cadastrando...". Isso indica a espera e impede que um clique duplo crie duas
contas.

### 4. Sessão e cabeçalho ###
**Arquivos:** `servicos/sessao.js`, `ui/cabecalho.js`

A sessão fica no `sessionStorage`, que se apaga ao fechar a aba, com `id`,
`nome` e `email`, **nunca** a senha. Enquanto ela existe, o cabeçalho de todas
as páginas troca "Entrar" por "Olá, {primeiro nome}" e um botão **Sair**. O nome
entra como texto (`textContent`), nunca como HTML, para que um nome como
`<img onerror=...>` não vire código na página.

### 5. Biblioteca exige login ###
**Arquivos:** `ui/aviso-login.js`, `paginas/biblioteca.js`

Sem sessão, a biblioteca abre um pop-up (`<dialog>` nativo) com "Faça login para
acessar sua biblioteca" e dois botões:

- **Fazer login:** vai para `login.html?voltar=biblioteca.html` e, depois de
  entrar, a pessoa volta para a biblioteca;
- **Voltar** (ou a tecla Esc): vai para a página inicial.

O `?voltar=` só aceita nomes de página deste site (`biblioteca.html`). Um link
como `login.html?voltar=https://site-falso.com` leva à página inicial, nunca a
outro site.

---

## Situações tratadas ##

| Situação | Tratamento |
| -------- | ---------- |
| Servidor desligado | Lista: mensagem + "Tentar novamente". Formulários: "Não foi possível conectar ao servidor. Tente novamente.", com os valores mantidos |
| Servidor responde 500 | Mesmo tratamento do servidor desligado |
| Servidor não responde em 8 s | Requisição cancelada; mesmo tratamento |
| Resposta em formato inesperado | Tratada como erro de comunicação |
| Servidor devolve lista vazia | "0 presets encontrados" e a mensagem de lista vazia; não é um erro |
| Falhar duas vezes seguidas | Uma única mensagem de erro, sem acumular |
| Clique duplo em Login/Cadastrar | Botão desativado durante o envio |
| E-mail já cadastrado | Mensagem no campo; nada é enviado |
| Senha errada ou e-mail sem conta | A mesma mensagem nos dois casos |
| Sessão corrompida no navegador | Descartada; a pessoa aparece como não logada |
| `?voltar=` para outro site | Ignorado; vai para a página inicial |

---

## Limitações conhecidas do servidor simulado ##

Estas limitações existem porque o json-server não tem lógica de servidor. Elas
deixam de existir com o back-end em Spring Boot (ver `docs/proposta.md`):

- **A senha fica em texto puro** em `mock/db.json`. O back-end real grava apenas
  o hash da senha.
- **A senha é conferida no navegador:** a resposta de `GET /usuarios?email=`
  traz a senha. No back-end real, o servidor confere a senha e devolve um token
  JWT (credencial assinada que identifica o usuário).
- **E-mail único só no navegador:** dois cadastros simultâneos com o mesmo
  e-mail poderiam passar pela verificação.
- **O front-end só esconde, não protege:** qualquer pessoa pode chamar a API
  direto. Quem garante as regras é o servidor.

---

## Como testar ##

### Testes automáticos ###

Da pasta `Corsino_Tones/`:

```bash
npm install
npx playwright install chromium
npx playwright test
```

São 180 testes em navegador real (Playwright). O Playwright sobe sozinho o site
(porta 8080) e o json-server (porta 3000). Os desta etapa:

| Arquivo | O que testa |
| ------- | ----------- |
| `tests/api-mock.spec.js` | Dados do servidor simulado, semente e `api:reset` |
| `tests/api-cliente.spec.js` | `fetch`: sucesso, rede, 500, JSON inválido, lista inválida, limite de 8 s |
| `tests/api-usuarios.spec.js` | `GET` e `POST /usuarios` |
| `tests/carga-estado.spec.js` | Carregando, erro e "Tentar novamente" na lista e no carrossel |
| `tests/modulos.spec.js` | Scripts como módulo, nenhuma global, `fetch` só em `api/` |
| `tests/sessao.spec.js`, `tests/auth.spec.js` | Sessão, `?voltar=`, regras de login e cadastro |
| `tests/login-api.spec.js` | Login e cadastro pela tela |
| `tests/cabecalho.spec.js` | Cabeçalho com sessão e pop-up da biblioteca |

Os testes que criam contas usam e-mails únicos. Para apagar essas contas e
voltar aos dados originais:

```bash
npm run api:reset
```

### Teste manual ###

Em dois terminais, na pasta `Corsino_Tones/`. O primeiro sobe a API com 2 s de
atraso em cada resposta, para dar tempo de ver o carregamento:

```bash
npm run api:lento
```

O segundo serve o site. Os módulos ES não funcionam abrindo o arquivo direto
(`file://`), então é preciso um servidor:

```bash
python3 -m http.server 8080
```

Abra `http://127.0.0.1:8080/frontend/presets.html`.

**Consulta** (`presets.html`)
1. Ao abrir, aparece "Carregando presets..." por 2 s, e depois os 9 presets.
2. Marque **Boss** enquanto carrega: quando os dados chegam, só a Boss aparece.
3. Pare o primeiro terminal (Ctrl+C) e recarregue: aparece a mensagem de erro
   com **Tentar novamente**.
4. Ligue a API de novo e clique em **Tentar novamente**: carrega e mostra a lista.

**Envio** (`login.html`)
1. Clique em **Não tenho conta**, preencha nome, um e-mail novo e uma senha de 8
   caracteres e clique em **Cadastrar**: o botão mostra "Cadastrando..." e depois
   a página inicial abre com "Olá, {nome}".
2. Clique em **Sair** e cadastre de novo com `ryan@exemplo.com`: aparece "Este
   e-mail já está cadastrado."
3. Na face de login, use `ryan@exemplo.com` e `teste124`: aparece "E-mail ou
   senha incorretos." Com `teste123`, entra.

**Biblioteca**
1. Sem login, abra a **Biblioteca**: aparece o pop-up. **Fazer login** leva ao
   login e, depois de entrar, de volta à biblioteca.

Com o DevTools aberto (F12), a aba **Network** mostra cada requisição, e a aba
**Console** mostra a causa real de cada erro, como `[api] GET /presets falhou: ...`.
