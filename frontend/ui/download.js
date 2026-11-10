// "Download" of a preset. The seed has no real files, so the file is generated
// here from the preset data (a Blob). Only the library offers it (plan R4).

/** Saves `preset-{id}.json` with the preset's own fields. */
export function baixarPreset(preset) {
    const { id, nome, estilo, marca, equipamento, descricao, packId } = preset;
    const texto = JSON.stringify({ id, nome, estilo, marca, equipamento, descricao, packId }, null, 2);
    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `preset-${id}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    // The browser has started reading the Blob by now; free it a moment later.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
