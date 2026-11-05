// Etapa 05 - chamadas assíncronas: Fetch API, async/await e Promises.
// Trechos copiados do código-fonte; cada bloco indica o arquivo e as linhas de origem.

// ---------------------------------------------------------------------------
// frontend/api/cliente.js, linhas 33-50: a única função que chama fetch.
// await espera a Promise do fetch; try/catch trata a falha; finally sempre roda.
// ---------------------------------------------------------------------------
export async function requisicao(caminho, opcoes = {}) {
    const metodo = opcoes.method ?? 'GET';
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    let resposta;
    try {
        resposta = await fetch(BASE_URL + caminho, { ...opcoes, signal: controle.signal });
        // fetch only rejects when no response arrives; 404 and 500 resolve normally.
        if (!resposta.ok) throw new ErroApi(resposta.status, `O servidor respondeu ${resposta.status}.`);
        return await resposta.json();
    } catch (erro) {
        const erroApi = classificar(erro, controle.signal.aborted, resposta);
        registrarErro(metodo, caminho, erroApi);
        throw erroApi;
    } finally {
        clearTimeout(limite);
    }
}

// ---------------------------------------------------------------------------
// frontend/api/usuarios.js, linhas 18-24: a operação submetida ao servidor (POST).
// ---------------------------------------------------------------------------
export function criarUsuario({ nome, email, senha }) {
    return requisicao('/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
    });
}

// ---------------------------------------------------------------------------
// frontend/ui/estado.js, linhas 10-29: carregando -> sucesso ou erro com retry.
// ---------------------------------------------------------------------------
export async function carregarComEstado(opcoes) {
    const { alvo, buscar, aoCarregar, mensagens } = opcoes;

    const aviso = document.createElement('p');
    aviso.setAttribute('role', 'status');
    aviso.textContent = mensagens.carregando;
    alvo.replaceChildren(aviso);

    let dados;
    try {
        dados = await buscar();
    } catch {
        // The API layer already logged the cause; the visitor gets one message and a way out.
        // replaceChildren swaps the old node, so repeated failures never stack messages.
        alvo.replaceChildren(criarErro(mensagens.erro, () => carregarComEstado(opcoes)));
        return;
    }
    alvo.replaceChildren();
    aoCarregar(dados);
}

// ---------------------------------------------------------------------------
// frontend/paginas/login.js, linhas 130-147: botão em espera durante o envio.
// ---------------------------------------------------------------------------
    async function enviar(form, acao) {
        const botao = form.querySelector('button[type="submit"]');
        const textoOriginal = botao.textContent;
        limparAlerta(form);
        // Disabled while pending: a double click must not send the form twice.
        botao.disabled = true;
        botao.textContent = TEXTO_PENDENTE[form.id];
        try {
            abrirSessao(await acao());
            // The button stays disabled while the next page loads.
            location.replace(destinoSeguro(voltar));
            return;
        } catch (erro) {
            tratarFalha(form, erro);
        }
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
