// Pack endpoints. A pack is one style for one pedalboard model; its presets
// point to it through packId (see api/presets.js, listarPresetsDoPack).
import { ErroApi, registrarErro, requisicao } from './cliente.js';

/** GET /packs. Rejects with ErroApi if the body is not a list. */
export async function listarPacks() {
    const dados = await requisicao('/packs');
    if (!Array.isArray(dados)) {
        const erro = new ErroApi(200, 'A resposta de /packs não é uma lista.');
        registrarErro('GET', '/packs', erro);
        throw erro;
    }
    return dados;
}

/** GET /packs/{id}. Resolves null when the pack does not exist (404). */
export async function buscarPack(id) {
    try {
        return await requisicao(`/packs/${encodeURIComponent(id)}`);
    } catch (erro) {
        // Not found is a normal answer for the page; other failures stay errors.
        if (erro instanceof ErroApi && erro.status === 404) return null;
        throw erro;
    }
}
