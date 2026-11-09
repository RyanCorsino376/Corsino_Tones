// Simulated card payment. Plays the part of a payment gateway (plano.md D3):
// it runs in the browser, sends nothing anywhere, and decides by a fixed rule
// so tests and demos are reproducible. With a real gateway, only
// processarPagamento changes, and the card data would go to the gateway,
// never to the store's own server.

export class PagamentoRecusado extends Error {
    constructor() {
        super('Pagamento recusado.');
        this.name = 'PagamentoRecusado';
    }
}

// A visible wait for the stage's loading state.
export const TEMPO_PROCESSAMENTO_MS = 1500;

const MENSAGENS = {
    numero: 'Informe os 16 dígitos do cartão.',
    nome: 'Informe o nome como está no cartão.',
    validade: 'Informe uma validade futura no formato MM/AA.',
    cvv: 'Informe os 3 dígitos do código de segurança.',
};

const apenasDigitos = (valor) => valor.replace(/ /g, '');

const regras = {
    numero: (valor) => /^\d{16}$/.test(apenasDigitos(valor)),
    nome: (valor) => valor.trim().length >= 2,
    validade: (valor, hoje) => {
        const partes = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(valor);
        if (!partes) return false;
        const ano = 2000 + Number(partes[2]);
        const mes = Number(partes[1]);
        // A card is valid through the last day of its month, so the current month passes.
        return ano * 12 + mes >= hoje.getFullYear() * 12 + (hoje.getMonth() + 1);
    },
    cvv: (valor) => /^\d{3}$/.test(valor),
};

/** The spec message for an invalid value of `campo`, or '' when it is valid. */
export function validarCampoCartao(campo, valor, hoje = new Date()) {
    return regras[campo](valor, hoje) ? '' : MENSAGENS[campo];
}

/** Waits like a gateway would, then approves, or declines a card ending in 0000. */
export function processarPagamento(numero) {
    return new Promise((resolver, rejeitar) => {
        setTimeout(() => {
            if (apenasDigitos(numero).endsWith('0000')) rejeitar(new PagamentoRecusado());
            else resolver();
        }, TEMPO_PROCESSAMENTO_MS);
    });
}
