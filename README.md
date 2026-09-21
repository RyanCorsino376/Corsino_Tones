# CorsinoTones

Site onde o administrador publica presets de pedais e pedaleiras de guitarra — os
conjuntos de ajustes salvos no equipamento — para que outros guitarristas baixem e
importem em seus próprios aparelhos.

A proposta completa (problema, público, funcionalidades, modelo de dados e
tecnologias previstas) está em [`docs/proposta.md`](docs/proposta.md).

## Estado atual

O projeto está na **etapa 03: protótipo estático das telas**, feito em HTML, CSS e
um pouco de JavaScript puro. Os dados exibidos são de exemplo e os formulários
ainda não enviam nada — o servidor e o banco de dados virão em etapas posteriores.

| Tela | Arquivo |
| ---- | ------- |
| Página inicial | `frontend/index.html` |
| Lista de presets com filtros | `frontend/presets.html` |
| Detalhe do preset | `frontend/preset.html` |
| Biblioteca (favoritos) | `frontend/biblioteca.html` |
| Entrar / Criar conta (cartão que gira) | `frontend/login.html` + `frontend/login.js` |

Descrição de cada tela e capturas em celular, tablet e computador:
[`docs/etapa-03.md`](docs/etapa-03.md).

## Estrutura

```
frontend/   páginas HTML, style.css e login.js
imagens/    logomarca e imagens usadas pelas páginas
tests/      testes Playwright
docs/       proposta, descrição das etapas e capturas de tela
.specs/     especificação, tarefas e decisões da feature em andamento
```

## Como executar

As páginas referenciam `../imagens/`, então o servidor deve partir da raiz do
repositório, não de `frontend/`:

```bash
python3 -m http.server 8080
```

Depois abra <http://localhost:8080/frontend/index.html>.

## Testes

Os testes usam [Playwright](https://playwright.dev/) em um navegador real, porque
verificam layout, foco e animação — coisas que só existem depois da renderização.
Requer Node.js e Python 3.

```bash
npm install
npx playwright install chromium
npm test
```

O próprio Playwright sobe o servidor local durante os testes
(configuração em `playwright.config.js`).

## Próximos passos

- Ajustar a faixa de tablet (768–1023 px) na lista de presets e no detalhe.
- Reescrever o cliente em React com TypeScript e Tailwind CSS.
- Criar a API em Java com Spring Boot e o banco PostgreSQL.
