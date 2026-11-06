// The catalogue as the store sells it: packs, each joined with the presets of
// its style. json-server cannot embed a filtered child list, so the join
// happens here, in one pure function.
import { listarPacks } from '../api/packs.js';
import { listarPresets } from '../api/presets.js';

/**
 * Adds to each pack its presets (same estilo as the pack id), the brand keys
 * they cover, and `data`, the newest preset date. Naming it `data` lets the
 * existing date sorts work on packs unchanged.
 */
export function montarPacks(packs, presets) {
    return packs.map((pack) => {
        const doPack = presets.filter((preset) => preset.estilo === pack.id);
        return {
            ...pack,
            presets: doPack,
            marcas: [...new Set(doPack.map((preset) => preset.marca))],
            // ISO dates (YYYY-MM-DD) compare correctly as plain strings.
            data: doPack.reduce((maisNova, preset) => (preset.data > maisNova ? preset.data : maisNova), ''),
        };
    });
}

/**
 * Loads packs and presets at the same time and joins them. If either request
 * fails, the whole Promise rejects: a card with a wrong count is worse than
 * the error state.
 */
export async function carregarCatalogo() {
    const [packs, presets] = await Promise.all([listarPacks(), listarPresets()]);
    return montarPacks(packs, presets);
}
