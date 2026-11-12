// The shopping cart: pack ids the visitor chose, in the order they were added.
// It lives in localStorage, so it survives closing the tab, and this is the
// only module that touches it (AD-009). Prices are never stored here: the
// cart page and the checkout read them from the API.
export const CHAVE_CARRINHO = 'corsino:carrinho';

// Same shape as a pack id: lowercase words joined by single dashes.
const ID_PACK = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Pack ids in the cart. A corrupt value is removed and counts as an empty cart. */
export function itensDoCarrinho() {
    const texto = localStorage.getItem(CHAVE_CARRINHO);
    if (texto === null) return [];
    try {
        const itens = JSON.parse(texto);
        if (Array.isArray(itens) && itens.every((id) => typeof id === 'string' && ID_PACK.test(id))) {
            // A pack is a digital file: a repeated id is one item.
            return [...new Set(itens)];
        }
    } catch {
        // Falls through to removal below.  
    }
    localStorage.removeItem(CHAVE_CARRINHO);
    return [];
}

function guardar(itens) {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
}

export function estaNoCarrinho(id) {
    return itensDoCarrinho().includes(id);
}

/** Adds the pack at the end; adding one that is already there changes nothing. */
export function adicionarAoCarrinho(id) {
    const itens = itensDoCarrinho();
    if (!itens.includes(id)) guardar([...itens, id]);
}

/** Removes the pack and keeps the others in their order. */
export function removerDoCarrinho(id) {
    guardar(itensDoCarrinho().filter((item) => item !== id));
}

export function esvaziarCarrinho() {
    localStorage.removeItem(CHAVE_CARRINHO);
}
