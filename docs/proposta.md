# CorsinoTones #

## Problema a ser resolvido ##
- Com o tempo, senti falta de um lugar para compartilhar meus presets de pedaleiras de guitarra — os conjuntos de ajustes salvos no equipamento — com meus amigos e com quem quisesse ter acesso a eles e testá-los por conta própria. Daí veio a ideia do CorsinoTones: uma plataforma onde vou disponibilizar meus presets de pedais e pedaleiras de guitarra para quem queira usá-los em seus respectivos equipamentos.

## Público alvo ##
- Qualquer guitarrista que queira usar os presets que eu, Ryan Corsino, uso em meus equipamentos.

## Objetivo da aplicação ##
- Ajudar outros instrumentistas que tenham dificuldade em configurar os timbres de seus equipamentos.

## Funcionalidades ##
- Cadastro e login de usuários, com autenticação por e-mail e senha.
- Publicação de presets pelo autor, informando nome, equipamento de origem, estilo musical, descrição e os valores de cada parâmetro (ganho, equalização, efeitos, nível, etc.).
- Listagem dos presets do mais recente para o mais antigo, com paginação, busca por texto e filtros por equipamento e estilo musical.
- Página de detalhe do preset, exibindo todos os parâmetros em formato de tabela e um passo a passo de como aplicá-los no equipamento.
- Favoritar presets, com uma lista pessoal de presets salvos por usuário.
- Comentários em cada preset, para retorno de quem testou.
- Área administrativa restrita ao autor, para criar, editar e remover presets e apagar comentários indevidos.

## Descrição de telas ##
1. **Tela inicial (listagem de presets)** — Apresenta os presets mais recentes em cartões, cada um com nome, equipamento e estilo musical. No topo ficam o menu de navegação e a barra de busca; ao lado da lista, um painel de filtros por equipamento e estilo, que atualiza o resultado sem recarregar a página.
2. **Tela de detalhe do preset** — Mostra a descrição, a tabela com o valor de cada parâmetro, o passo a passo de configuração e o botão de favoritar. Abaixo ficam a lista de comentários dos outros usuários e o campo para comentar; para o autor, cada comentário traz também a opção de apagar.
3. **Tela de login e cadastro** — Formulário único com alternância entre entrar e criar conta, validação dos campos no próprio navegador e mensagens de erro devolvidas pelo servidor (e-mail já usado, senha inválida).
4. **Tela de perfil do usuário** — Reúne os dados da conta e a lista de presets favoritados, com opção de removê-los da lista.
5. **Painel administrativo** — Visível apenas para o autor. Contém o formulário de criação e edição de presets e a listagem dos presets publicados, com as ações de editar e excluir.

## Modelo de dados ##
- **Usuário** — nome, e-mail, senha (armazenada como hash) e perfil de acesso (comum ou administrador).
- **Equipamento** — marca e modelo do pedal ou pedaleira; um equipamento reúne vários presets.
- **Preset** — nome, descrição, estilo musical e data de publicação; pertence a um equipamento e a um usuário autor.
- **Parâmetro** — nome do ajuste (ganho, grave, médio, agudo, nível, etc.) e o valor correspondente; cada preset tem vários. Fica em entidade própria porque cada equipamento tem um conjunto diferente de ajustes, o que impede fixar essas colunas na tabela de presets.
- **Comentário** — texto e data; liga um usuário a um preset.
- **Favorito** — vínculo entre um usuário e um preset, sem repetição do mesmo par.

## Tecnologias lado do cliente ##
- **React com TypeScript** para a construção das telas em componentes reutilizáveis. O TypeScript foi escolhido por verificar os tipos ainda em tempo de escrita do código, o que reduz erros na integração com a API.
- **Vite** como ferramenta de build e servidor de desenvolvimento.
- **React Router** para a navegação entre as telas.
- **Tailwind CSS** para a estilização e para o layout responsivo (adaptação a celular, tablet e computador).

## Tecnologias lado do servidor ##
- **Java com Spring Boot**, expondo uma API REST (interface de comunicação baseada em requisições HTTP) consumida pelo cliente.
- **Spring Web** para o mapeamento das rotas e dos controladores.
- **Spring Security com JWT** (JSON Web Token — credencial assinada que identifica o usuário a cada requisição) para autenticação e para separar as permissões de usuário comum e de administrador.
- **Spring Data JPA** para o mapeamento entre as classes Java e as tabelas do banco.
- **Maven** para o gerenciamento de dependências e o empacotamento da aplicação.

## Tecnologia de persistência ##
- **PostgreSQL** como banco de dados relacional. A escolha se deve ao formato dos dados da aplicação, que é bem definido e tem muitas relações entre as entidades (usuário, preset, parâmetro, equipamento, comentário e favorito) — situação em que o modelo relacional evita repetição de informação e garante a integridade dos vínculos.
- O esquema do banco é criado por scripts SQL versionados junto ao código, para que o histórico das alterações de tabelas acompanhe o projeto.

## Requisitos não funcionais ##
- As telas devem funcionar em celular, tablet e computador.
- As senhas são gravadas apenas como hash, nunca em texto puro.
- As rotas de escrita da API exigem token válido; as de leitura ficam abertas a visitantes.
- O código-fonte fica versionado em repositório Git.

## Fora do escopo ##
- Envio automático do preset para o equipamento — não há integração com os aparelhos, de modo que o usuário aplica os valores manualmente.
- Upload de áudio ou vídeo de demonstração.
- Publicação de presets por outros usuários — nesta primeira versão apenas o autor publica.
