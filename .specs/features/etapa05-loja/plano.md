# Plano — Loja de presets (carrinho, compra simulada, biblioteca)

> Rascunho de arquitetura. Ainda não é spec: serve para decidir o rumo antes de
> rodar o fluxo Specify → Design → Tasks. Também cobre os requisitos da Etapa 05
> (módulos, chamadas assíncronas, loading, erro, consulta + envio ao servidor).

## 1. Fluxo desejado

```
login → navegar/filtrar (presets.html) → detalhe (preset.html?id=N)
      → "Adicionar ao carrinho" → carrinho.html → checkout.html (pagamento simulado)
      → pedido aprovado → biblioteca.html lista o preset com botão "Download"
```

Regras de negócio:

- R1. Visitante navega, vê preços e monta o carrinho; checkout e biblioteca exigem
  login (sem login → redireciona para `login.html?voltar=<página>`).
- R2. Preset já comprado não pode ir ao carrinho de novo: o botão vira "Na biblioteca".
- R3. O mesmo preset não entra duas vezes no carrinho (quantidade sempre 1 — é arquivo digital).
- R4. O botão "Download" só existe na biblioteca, nunca no detalhe.
- R5. Pagamento recusado mantém o carrinho intacto e mostra o erro.

## 2. O que muda hoje no projeto

| Hoje | Depois |
|---|---|
| `dados.js` com `window.PRESETS` fixo (AD-006) | Dados vêm de um **mock server** via `fetch` |
| Scripts clássicos que se comunicam por `window.*` | **ES modules** (`<script type="module">`, `import`/`export`) |
| `login.js` só valida o formulário | Login autentica de verdade no mock e guarda a sessão |
| `preset.html` estático com link de download | Página dinâmica por `?id=`, com preço e botão de carrinho |
| `biblioteca.html` sempre vazia | Lista os presets comprados, com download |
| — | Novas páginas `carrinho.html` e `checkout.html` |
| Proposta: presets gratuitos + favoritos | Presets pagos; "Biblioteca" = presets comprados |

## 3. Decisões de arquitetura (propostas)

### D1. Back-end simulado com json-server
Um `db.json` vira uma API REST (rotas HTTP como `GET /presets`). Escolhido porque
aceita `POST` de verdade (o pedido fica gravado), o que atende à "operação
submetida" da Etapa 05. Descartado: API pública (dados sem relação com o tema) e
`fetch` de um `.json` estático (não aceita escrita).
Quando o Spring Boot existir, só a `BASE_URL` em `api/cliente.js` muda.

### D2. Carrinho no `localStorage`, pedido no servidor
O carrinho é estado temporário do navegador (chave `carrinho:<usuarioId>`); só a
compra é enviada (`POST /pedidos`). Mais simples que sincronizar carrinho com o
servidor, e é o padrão de muitas lojas. Custo: o carrinho não acompanha o usuário
entre dispositivos — aceitável aqui.

### D3. Pagamento simulado, sem dados reais de cartão
Um módulo `pagamento.js` imita um gateway (serviço que processa pagamentos, como
Stripe ou Mercado Pago): espera ~1,5 s e aprova ou recusa por regra fixa, por
exemplo cartão terminado em `0000` → recusado. Isso permite demonstrar sucesso,
erro e loading de forma reproduzível nos testes.
Nunca pedir nem salvar cartão real. Na versão real, o front redireciona para o
checkout hospedado do gateway e o Spring Boot confirma o pagamento por webhook
(chamada que o gateway faz ao seu servidor avisando "pago").

### D4. Biblioteca é derivada dos pedidos pagos
Não existe tabela "biblioteca": ela é `GET /pedidos?usuarioId=X&status=pago`
→ junta os `presetIds` → busca esses presets. Evita duas fontes de verdade
(pedido diz "comprou", biblioteca diz outra coisa).

### D5. Sessão no `sessionStorage`
Após o login guarda `{ id, nome, email }`. Um módulo `sessao.js` expõe
`usuarioAtual()`, `exigirLogin()` e `sair()`. Substitui AD-006 e prepara o
lugar onde o JWT (token assinado que identifica o usuário) ficará depois.

### ⚠️ Limitação de segurança (precisa constar no relatório)
Com front + json-server, **nada é realmente protegido**: qualquer pessoa pode
abrir a URL do arquivo do preset, ler `db.json` ou chamar `POST /pedidos` com
`status: "pago"`. A proteção real só existe no back-end:
- Spring Boot verifica o pagamento com o gateway antes de marcar o pedido como pago;
- o download passa por `GET /presets/{id}/download`, que confere se o usuário do
  JWT comprou o preset e só então entrega o arquivo (ou um link temporário assinado);
- senhas com hash (já previsto na proposta).
O front só **esconde** botões; quem **garante** a regra é o servidor.

## 4. Modelo de dados (`db.json`)

```json
{
  "usuarios": [{ "id": 1, "nome": "Ryan", "email": "ryan@exemplo.com", "senha": "teste123" }],
  "presets": [{
    "id": 1, "nome": "Crunch Clássico", "marca": "boss", "equipamento": "GT-1000",
    "estilo": "rock", "data": "2026-09-10", "descricao": "...",
    "precoCentavos": 1990, "arquivo": "/arquivos/crunch-classico.tsl"
  }],
  "pedidos": [{
    "id": 1, "usuarioId": 1, "presetIds": [1, 3], "totalCentavos": 3980,
    "status": "pago", "criadoEm": "2026-11-05T14:00:00Z"
  }]
}
```

- Preço em **centavos inteiros**: `0.1 + 0.2 !== 0.3` em JavaScript, então somar
  reais com casas decimais gera erro de arredondamento. Formatar só na exibição
  com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- O pedido guarda `totalCentavos` calculado na hora da compra (se o preço mudar
  depois, o histórico não muda).
- Senha em texto puro **só porque é mock**; o Spring Boot fará hash.
- Proposta/BD real: novas entidades `Pedido` e `ItemPedido` (com preço pago);
  `Favorito` sai ou vira recurso separado.

## 5. Estrutura de módulos

```
frontend/
├── api/
│   ├── cliente.js        # BASE_URL, requisicao(): fetch + timeout + erro padronizado
│   ├── presets.js        # listarPresets(), buscarPreset(id)
│   ├── auth.js           # entrar(email, senha), cadastrar(dados)
│   └── pedidos.js        # criarPedido(), listarPedidosPagos(usuarioId)
├── servicos/
│   ├── sessao.js         # usuarioAtual(), exigirLogin(), sair()
│   ├── carrinho.js       # adicionar, remover, listar, limpar, total (localStorage)
│   └── pagamento.js      # processarPagamento() simulado (D3)
├── ui/
│   ├── cartao.js         # criarCartao (já existe; vira export)
│   ├── estado.js         # mostrarCarregando(), mostrarErro(msg, tentarDeNovo), limpar()
│   ├── cabecalho.js      # contador do carrinho + "Entrar"/"Sair" conforme sessão
│   └── formato.js        # formatarPreco(centavos), rotulos
└── paginas/              # um ponto de entrada por HTML
    ├── inicio.js  presets.js  preset.js  login.js
    └── carrinho.js  checkout.js  biblioteca.js
```

Regra de dependência: `paginas → servicos/ui → api`. Só `api/` chama `fetch`;
só `servicos/carrinho.js` toca no `localStorage`. As funções puras de filtro e
ordenação de `presets.js` continuam iguais — só a origem da lista muda.

### Erro e loading padronizados (`api/cliente.js`)
```js
export async function requisicao(caminho, opcoes = {}) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), 8000);
    try {
        const resposta = await fetch(BASE_URL + caminho, { ...opcoes, signal: controle.signal });
        if (!resposta.ok) throw new ErroApi(resposta.status, 'Falha ao comunicar com o servidor.');
        return resposta.status === 204 ? null : await resposta.json();
    } catch (erro) {
        if (erro instanceof ErroApi) throw erro;
        throw new ErroApi(0, 'Servidor indisponível. Verifique sua conexão.');
    } finally {
        clearTimeout(timer);
    }
}
```
`fetch` só rejeita em falha de rede — HTTP 404/500 chega como sucesso, por isso o
`if (!resposta.ok)`. Cada página faz `mostrarCarregando()` → `await` →
renderiza ou `mostrarErro()`, com o botão de "Tentar novamente".

## 6. Mapeamento para a entrega da Etapa 05

| Exigência | Onde aparece |
|---|---|
| Módulos | Estrutura da seção 5 com ES modules |
| Fetch + async/await | `api/cliente.js` e páginas |
| Consulta | `GET /presets` (lista/detalhe) e `GET /pedidos` (biblioteca) |
| Envio ao servidor | `POST /pedidos` (compra) e `POST /usuarios` (cadastro) |
| Loading | Lista, detalhe, biblioteca e "Processando pagamento..." |
| Sucesso | Tela "Compra aprovada" + preset aparece na biblioteca |
| Erro | Servidor desligado, login inválido, cartão `...0000` recusado |
| Dados simulados | `db.json` no json-server |

## 7. Ordem de implementação (fatias que funcionam sozinhas)

1. **Infra do mock** — `db.json` com presets + preço, script `npm run api`,
   `api/cliente.js`. Converter páginas para ES modules. Lista e início lendo da API
   com loading/erro. *Prova:* desligar o json-server mostra o erro.
2. **Login real + sessão** — `api/auth.js`, `sessao.js`, cabeçalho com "Sair",
   guarda de rotas protegidas e `?voltar=`.
3. **Detalhe dinâmico** — `preset.html?id=N`, preço, cartões linkando com id,
   remover o download dali.
4. **Carrinho** — `servicos/carrinho.js`, botão no detalhe, contador no cabeçalho,
   `carrinho.html` com remover e total.
5. **Checkout + pedido** — `checkout.html`, `pagamento.js`, `POST /pedidos`,
   tela de aprovado/recusado, limpar carrinho só se aprovado.
6. **Biblioteca** — derivada dos pedidos, botão Download, "Na biblioteca" no
   detalhe (R2).
7. **Documentação** — nova AD substituindo AD-006, atualizar `proposta.md`
   (presets pagos, Pedido/ItemPedido), `docs/etapa-05.md` e evidências.

Fatias 1 e 2 já cumprem a Etapa 05 sozinhas; 3–6 são a loja.

## 8. Testes (Playwright)

- `playwright.config.js` passa a ter **dois** `webServer`: o servidor estático
  (8080) e o json-server (3000).
- Antes de cada execução, copiar `db.seed.json` → `db.json`; senão um pedido
  criado por um teste aparece na biblioteca do próximo (testes dependentes).
- Erro de rede testado com `page.route('**/presets', r => r.abort())` em vez de
  derrubar o servidor; loading testado atrasando a rota com `page.route`.
- Os 83 testes atuais leem `window.PRESETS` indiretamente pela tela; precisam
  esperar o fim do carregamento (o loading) antes de afirmar algo.

## 9. Decisões tomadas (2026-11-05)

1. Carrinho no `localStorage` (D2).
2. Visitante monta o carrinho sem login; o login é exigido só no checkout e na
   biblioteca. **Substitui R1**: "carrinho" sai da lista de páginas protegidas.
3. Pagamento: só cartão simulado (D3).
4. Favoritos removidos por enquanto; "Biblioteca" = presets comprados.
5. `json-server@0.17.4` instalado como devDependency.
