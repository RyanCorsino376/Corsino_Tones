# Etapa 03 — Telas do CorsinoTones #

Protótipo estático (HTML + CSS + um JavaScript). Os dados são de exemplo e os
formulários ainda não enviam nada — o servidor virá em etapa posterior.
Capturas em `docs/evidencias/etapa-03/`, três por tela
(`desktop-`, `tablet-`, `smartphone-`).

**Comum a todas as telas:** cabeçalho com a logomarca, barra de navegação fixa
(Página Inicial · Presets · Biblioteca · Entrar), rodapé, tema escuro com
vermelho de destaque. Faixas de tela cortadas em 768 px e 1024 px — os mesmos
valores do Tailwind, previsto para a reescrita em React.

---

## Tela 01 — Página inicial ##
`index.html` · evidências `*-tela-01.png`

Apresenta o autor e os lançamentos. Tem a seção de boas-vindas (foto + frase
principal) e o carrossel "Presets mais recentes", com rolagem horizontal.
No celular a foto e o texto empilham sozinhos, e o cartão encolhe para
`75vw` — assim aparece a borda do próximo, indicando que a lista continua.

## Tela 02 — Presets ##
`presets.html` · evidências `*-tela-02.png`

Lista todos os presets com uma barra lateral de filtros por marca (oito caixas
de seleção, botões Aplicar e Limpar). A grade calcula sozinha o número de
colunas pelo espaço disponível (`auto-fill`). A partir de 1024 px os filtros
ficam à esquerda acompanhando a rolagem; até 767 px eles passam para cima da
lista e perdem a fixação, que cobriria os resultados.

## Tela 03 — Detalhe do preset ##
`preset.html` · evidências `*-tela-03.png`

Capa, nome, marca/equipamento, descrição e o botão **Download**; abaixo, dois
espaços reservados para os vídeos de demonstração. Até 767 px o topo vira uma
coluna só, com a capa acima do texto.

## Tela 04 — Biblioteca ##
`biblioteca.html` · evidências `*-tela-04.png`

Reúne os presets favoritados. Como não há login nem persistência ainda, só o
estado vazio está desenhado: a mensagem e o link **Explorar presets** — é a
primeira tela que todo usuário novo vê, e deixá-la em branco seria um beco sem
saída.

## Telas 05 e 06 — Entrar e Criar conta ##
`login.html` + `login.js` · evidências `*-tela-05.png` e `*-tela-06.png`

São duas faces do mesmo cartão, não duas páginas. *Entrar* pede e-mail e senha;
*Criar conta* pede nome, e-mail e senha — exatamente os campos do modelo de
dados da proposta. Todos são `required`, então o navegador bloqueia o envio e
aponta o campo faltante (visível em `desktop-tela-06.png`).

Ao clicar em "Não tenho conta" o cartão gira 180° no eixo Y em 600 ms. Detalhes
que sustentam isso:

- a face oculta recebe `inert`, saindo da ordem de tabulação, e o foco vai para
  o primeiro campo da face revelada;
- as duas faces têm a mesma altura (definida pela de cadastro, a mais alta),
  senão o cartão mudaria de tamanho no meio do giro;
- com `prefers-reduced-motion: reduce` a troca é instantânea;
- sem JavaScript os dois formulários aparecem empilhados e utilizáveis.

---

## Pendências ##

- Conteúdo dos cartões, do detalhe e dos vídeos ainda é espaço reservado.
- `login.html` tem `action=""`: nada é enviado até existir o endpoint.
- A faixa de tablet (768–1023 px) ainda não foi recortada — hoje vale a regra de
  computador, por isso a captura de tablet (iPad Pro, 1024 px) já mostra os
  filtros ao lado da lista. É a próxima tarefa (T7 em `.specs/STATE.md`).
- "Esqueci a senha" aponta para `#`; recuperação de senha está fora do escopo.
- Testes: `npx playwright test` (virada do cartão e navegação nas três larguras).
