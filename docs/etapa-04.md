# Etapa 04 — Interatividade com JavaScript #

A lista de presets e os formulários de login passam a reagir ao usuário: os
presets vêm de um array em JavaScript e podem ser filtrados, buscados e
ordenados sem recarregar a página; o login e o cadastro validam os dados e
mostram mensagens em português ao lado de cada campo. Ainda não há servidor,
então nada é enviado.

Requisitos da etapa em `docs/Requisitos_Etapa04/requisitos.md`; especificação
completa em `.specs/features/etapa04-interatividade/spec.md`.

---

## Tabela de especificações ##

Evidências em `docs/evidencias/etapa-04/`. Funções, arrays e métodos de
iteração não aparecem na tela, então as linhas 05 a 07 apontam para arquivos
`.js` com os trechos do código-fonte, cada um indicando o arquivo e as linhas
de origem.

| Requisito | Funcionalidade relacionada | Arquivo(s) | Evidência |
| --------- | -------------------------- | ---------- | --------- |
| Manipulação do DOM | Cartões de preset criados com `createElement` e trocados com `replaceChildren`; contagem, lista vazia e mensagens de erro/sucesso atualizadas na página | `cartao.js`, `presets.js`, `login.js` | [01-manipulacao-dom.png](evidencias/etapa-04/01-manipulacao-dom.png) |
| Tratamento de eventos | Filtros (`change`), busca e correção de campos (`input`), Aplicar e envio do login/cadastro (`submit`), Limpar (`reset`) | `presets.js`, `login.js` | [02-tratamento-eventos.png](evidencias/etapa-04/02-tratamento-eventos.png) |
| Validação de formulários | Login e cadastro: nome, e-mail e senha conferidos no envio, com mensagem ao lado de cada campo | `login.html`, `login.js` | [03-validacao-formularios.png](evidencias/etapa-04/03-validacao-formularios.png) |
| Alteração dinâmica da interface | Lista filtrada, buscada e ordenada sem recarregar; contagem de resultados; mensagem de lista vazia; mensagens de erro e de sucesso | `presets.js`, `login.js`, `style.css` | [04-alteracao-dinamica.png](evidencias/etapa-04/04-alteracao-dinamica.png) |
| Uso de funções | `filtrar`, `ordenar`, `renderizar`, `atualizar`, `normalizar`, `criarCartao`, `validarCampo`, `mostrarErro`, `limparErro` | `cartao.js`, `presets.js`, `login.js` | [05-uso-funcoes.js](evidencias/etapa-04/05-uso-funcoes.js) |
| Uso de arrays | Catálogo `PRESETS` com 9 presets, lido pela página inicial e pela lista | `dados.js`, `inicio.js`, `presets.js` | [06-uso-arrays.js](evidencias/etapa-04/06-uso-arrays.js) |
| Métodos de iteração | `map`, `filter`, `some`, `includes`, `sort` na lista; `forEach`, `every`, `find` na validação | `presets.js`, `cartao.js`, `inicio.js`, `login.js` | [07-metodos-iteracao.js](evidencias/etapa-04/07-metodos-iteracao.js) |
| Tratamento de situações inválidas | Busca sem resultado, caracteres especiais na busca, campos vazios ou só com espaços, e-mail e senha inválidos | `presets.js`, `login.js` | [08-situacoes-invalidas.png](evidencias/etapa-04/08-situacoes-invalidas.png) |

---

## Funcionalidades interativas ##

### 1. Catálogo de presets gerado por JavaScript ###
**Arquivos:** `frontend/dados.js`, `frontend/cartao.js`, `frontend/presets.js`,
`frontend/inicio.js`, `frontend/presets.html`, `frontend/index.html`

Os presets deixaram de estar escritos no HTML. `dados.js` guarda o catálogo em
`window.PRESETS`, um array com 9 objetos, cada um com `id`, `nome`, `marca`,
`equipamento`, `estilo`, `data` e `descricao`. A função `criarCartao`
(`cartao.js`) monta um cartão para cada preset com `createElement`, e as duas
telas usam essa mesma função:

- **Página inicial:** o carrossel "Presets mais recentes" mostra os 9 presets,
  do mais novo para o mais antigo (`ordenarMaisRecentes`).
- **Presets:** a grade mostra o catálogo inteiro.

As telas só leem o array. Quando a API em Spring Boot existir, muda apenas a
origem de `PRESETS`, e as funções de filtro, ordenação e desenho continuam
iguais (decisão AD-006 em `.specs/STATE.md`).

### 2. Filtros por marca e estilo ###
**Arquivos:** `frontend/presets.html`, `frontend/presets.js`

A barra lateral tem dois grupos de caixas de seleção: **Marcas** (8) e
**Estilos** (rock, blues, metal, clean). A lista muda a cada clique, sem
recarregar a página:

- dentro de um grupo vale "ou": Boss **ou** NUX mostra os presets das duas marcas;
- entre grupos vale "e": Boss **e** rock mostra só os presets da Boss de rock;
- um grupo sem nada marcado não filtra.

O botão **Aplicar** chama `preventDefault()` no envio do formulário e apenas
redesenha a lista, então a página nunca recarrega.

### 3. Busca por texto ###
**Arquivos:** `frontend/presets.html`, `frontend/presets.js`, `frontend/style.css`

O campo **Buscar**, acima da grade, filtra a cada tecla digitada. Ele procura
no nome, no equipamento e na descrição, ignorando maiúsculas e acentos:
"distorcao" encontra "Distorção Moderna". A busca se soma aos filtros marcados
("e").

Para ignorar acentos, a função `normalizar` decompõe cada letra com
`normalize('NFD')` e remove os acentos que sobram soltos. A comparação usa
`includes`, e não expressão regular, para que caracteres como `(` e `.*` sejam
procurados como texto comum.

### 4. Ordenação ###
**Arquivos:** `frontend/presets.html`, `frontend/presets.js`

O seletor **Ordenar por** tem três opções: Mais recentes (padrão), Mais antigos
e Nome (A-Z). A ordem vale para a lista já filtrada. A ordem por nome usa
`localeCompare(…, 'pt-BR')`, que coloca "Ápice do Solo" junto dos nomes com A;
uma comparação simples por código de caractere o colocaria depois do Z.

### 5. Limpar filtros ###
**Arquivos:** `frontend/presets.html`, `frontend/presets.js`

O botão **Limpar** desmarca todas as caixas, esvazia a busca, volta a ordem
para "Mais recentes" e mostra os 9 presets. A busca e a ordenação ficam fora da
barra lateral, mas pertencem ao mesmo formulário pelo atributo
`form="form-filtros"`, por isso o Limpar também as restaura. O evento `reset`
dispara antes de o navegador limpar os campos, então o redesenho espera um
instante (`setTimeout(atualizar, 0)`).

### 6. Contagem de resultados e lista vazia ###
**Arquivos:** `frontend/presets.html`, `frontend/presets.js`, `frontend/style.css`

Uma linha acima da grade informa quantos presets aparecem: "9 presets
encontrados", "1 preset encontrado", "0 presets encontrados". Ela é uma região
`aria-live="polite"`, então leitores de tela anunciam cada mudança. Quando nada
combina com a busca e os filtros, aparece "Nenhum preset encontrado" com a
sugestão de clicar em "Limpar".

### 7. Validação de login e cadastro ###
**Arquivos:** `frontend/login.html`, `frontend/login.js`, `frontend/style.css`

Os dois formulários conferem os dados no envio e mostram uma mensagem abaixo de
cada campo errado. Depois de um envio recusado, a mensagem some enquanto o
usuário digita, assim que o campo fica válido. As regras estão em
[Validações implementadas](#validações-implementadas).

### Fluxo comum da lista ###

Toda mudança nos filtros, na busca ou na ordem executa as mesmas etapas, na
função `atualizar()` de `presets.js`:

```
lerCriterios() -> filtrar() -> ordenar() -> renderizar()
```

`renderizar` troca os cartões da grade (`replaceChildren`), atualiza a contagem
e mostra ou esconde a mensagem de lista vazia.

---

## Conceitos de programação utilizados ##

| Conceito | Onde aparece |
| -------- | ------------ |
| Manipulação do DOM | `createElement` e `replaceChildren` nos cartões; mensagens de erro criadas com `createElement`, inseridas com `after` e removidas com `remove`; `textContent`, `hidden`, `setAttribute` |
| Eventos | `change` (caixas e seletor), `input` (busca e campos do login), `submit` (Aplicar, Login, Cadastrar), `reset` (Limpar), `click` (virada do cartão) |
| Funções | `filtrar`, `ordenar`, `renderizar`, `atualizar`, `normalizar`, `criarCartao`, `validarCampo`, `mostrarErro`, `limparErro` |
| Arrays e objetos | `PRESETS` (array de objetos); `regras` (objeto que liga cada campo à sua função de validação) |
| Métodos de iteração | `map` (cartões), `filter` (filtros), `some` (busca em três campos), `includes` (marca, estilo e texto), `sort` (ordenação), `forEach` (validar cada campo), `every` (formulário todo válido?), `find` (primeiro campo com erro) |
| Expressão regular | regra de e-mail `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| Escopo isolado (IIFE) | cada script roda dentro de `(function () { … })()` para não criar variáveis globais |
| Melhoria progressiva | sem JavaScript, os presets mostram um aviso `<noscript>` e os formulários voltam à validação do navegador (`required`, `type="email"`) |

---

## Validações implementadas ##

Os formulários têm o atributo `novalidate`, que desliga as mensagens nativas do
navegador, e o `login.js` aplica as regras abaixo (decisão AD-007). As
mensagens nativas não podem ser estilizadas nem ter o texto definido por nós.

| Campo | Regra | Mensagem |
| ----- | ----- | -------- |
| Nome (cadastro) | pelo menos 2 caracteres | Informe um nome com pelo menos 2 caracteres. |
| E-mail (login e cadastro) | segue `^[^\s@]+@[^\s@]+\.[^\s@]+$` | Informe um e-mail válido, como nome@exemplo.com. |
| Senha (cadastro) | pelo menos 8 caracteres | A senha precisa ter pelo menos 8 caracteres. |
| Senha (login) | não pode ficar vazia | Informe sua senha. |

A regra de 8 caracteres vale só no cadastro: é uma regra de criação de senha, e
aplicá-la no login recusaria contas criadas com outra regra.

Ao enviar:

- cada campo recusado recebe a mensagem logo abaixo, a borda vermelha,
  `aria-invalid="true"` e `aria-describedby` apontando para a mensagem (assim o
  leitor de tela lê o erro junto com o campo);
- o foco vai para o primeiro campo recusado;
- se todos os campos estão certos, a página não recarrega e aparece uma
  mensagem de sucesso na própria face do cartão.

---

## Situações inválidas tratadas ##

| Situação | Tratamento |
| -------- | ---------- |
| Nenhum preset combina com a busca e os filtros | Grade vazia, contagem "0 presets encontrados" e a mensagem "Nenhum preset encontrado" com a sugestão de clicar em "Limpar" |
| Busca com caracteres especiais, como `(`, `.*` ou `[` | Procurados como texto comum com `includes`; nenhum erro na página |
| Busca só com espaços | Tratada como vazia (`trim`): mostra todos os presets |
| Enter no campo de busca | Não recarrega a página: o envio do formulário é cancelado |
| Nome, e-mail ou senha inválidos | Mensagem abaixo do campo, envio bloqueado e foco no primeiro erro |
| Campo preenchido só com espaços | Tratado como vazio (`trim`) e recusado |
| Formulário inválido enviado duas vezes | A mensagem de cada campo é reaproveitada pelo `id`, sem duplicar |
| Formulário válido sem servidor | O envio é cancelado e uma mensagem de sucesso aparece, em vez de a página recarregar sem fazer nada |
| JavaScript desativado | Presets: aviso `<noscript>`. Login: o navegador valida pelos atributos `required` e `type="email"` |

---

## Como testar ##

### Testes automáticos ###

Da pasta `Corsino_Tones/`:

```bash
npm install
npx playwright install chromium
npx playwright test
```

São 83 testes em navegador real (Playwright). Os desta etapa ficam em
`tests/presets-lista.spec.js` (catálogo, filtros, busca, ordenação, contagem e
lista vazia) e `tests/login-validacao.spec.js` (validação). Para rodar só um
deles:

```bash
npx playwright test tests/presets-lista.spec.js
npx playwright test tests/login-validacao.spec.js
```

### Teste manual ###

Os scripts carregam arquivos vizinhos e as imagens ficam em `../imagens/`, então
sirva a pasta `Corsino_Tones/` inteira:

```bash
python3 -m http.server 8080
```

e abra `http://localhost:8080/frontend/index.html`.

**Página inicial**
1. O carrossel mostra 9 presets, o mais recente primeiro.

**Presets** (`presets.html`)
1. Marque **Boss**: só presets da Boss. Marque também **NUX**: presets das duas.
2. Desmarque NUX e marque **Rock**: só os presets da Boss que são de rock.
3. Clique **Limpar** e digite `distorcao` na busca: aparece "Distorção Moderna".
4. Digite `djent`: a contagem mostra "1 preset encontrado".
5. Digite `zzzz`: a grade esvazia e aparece "Nenhum preset encontrado".
   Apague o texto: os cartões voltam.
6. Digite `(`: nenhum resultado e nenhum erro no console do navegador (F12).
7. Em **Ordenar por**, escolha "Nome (A-Z)": "Ápice do Solo" aparece primeiro.
8. Clique **Aplicar** com filtros marcados: a lista fica filtrada e a página não
   recarrega.

**Login e cadastro** (`login.html`)
1. Clique **Login** com os campos vazios: aparecem as mensagens de e-mail e de
   senha, e o cursor vai para o e-mail.
2. Clique **Não tenho conta**, preencha `R`, `ryan@` e `1234567` e clique
   **Cadastrar**: três mensagens diferentes e o cursor no nome.
3. Acrescente uma letra ao nome: a mensagem do nome some; as outras continuam.
4. Corrija para `ryan@x.com` e `12345678` e envie: aparece a mensagem de
   sucesso e a página não recarrega.
