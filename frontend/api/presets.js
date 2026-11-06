// Catalogue endpoints.
import { ErroApi, registrarErro, requisicao } from './cliente.js';

/** GET /presets. Rejects with ErroApi if the body is not a list. */
export async function listarPresets() {
    const dados = await requisicao('/presets');
    // The filter pipeline calls array methods on this value; anything else would crash it.
    if (!Array.isArray(dados)) {
        const erro = new ErroApi(200, 'A resposta de /presets não é uma lista.');
        registrarErro('GET', '/presets', erro);
        throw erro;
    }
    return dados;
}

/** GET /presets?packId=. The presets of one pack. Rejects with ErroApi if the body is not a list. */
export async function listarPresetsDoPack(packId) {
    const caminho = `/presets?packId=${encodeURIComponent(packId)}`;
    const dados = await requisicao(caminho);
    if (!Array.isArray(dados)) {
        const erro = new ErroApi(200, 'A resposta de /presets não é uma lista.');
        registrarErro('GET', caminho, erro);
        throw erro;
    }
    return dados;
}
