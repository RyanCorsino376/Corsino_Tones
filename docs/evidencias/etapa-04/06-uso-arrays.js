// Evidence for docs/etapa-04.md: use of arrays.
// Excerpts copied verbatim from the source files named above each block;
// line numbers refer to those files. Not loaded by any page.

// ---- frontend/dados.js, lines 1-87 ----
// Sample catalogue until the Spring Boot API exists (AD-006). Page scripts only
// read window.PRESETS, so swapping this file for an API call changes nothing else.
// Deliberately not in date order: the pages sort it themselves.
window.PRESETS = [
    {
        id: 1,
        nome: 'Crunch Clássico',
        marca: 'boss',
        equipamento: 'GT-1000',
        estilo: 'rock',
        data: '2026-09-10',
        descricao: 'Crunch de amplificador britânico com leve compressão, ideal para riffs abertos.',
    },
    {
        id: 2,
        nome: 'Distorção Moderna',
        marca: 'nux',
        equipamento: 'MG-30',
        estilo: 'metal',
        data: '2026-08-15',
        descricao: 'Ganho alto com gate apertado e médios recortados para afinações baixas.',
    },
    {
        id: 3,
        nome: 'Blues de Sexta',
        marca: 'line6',
        equipamento: 'HX Stomp',
        estilo: 'blues',
        data: '2026-08-28',
        descricao: 'Overdrive suave que limpa ao baixar o volume da guitarra.',
    },
    {
        id: 4,
        nome: 'Hard Rock Anos 80',
        marca: 'boss',
        equipamento: 'ME-90',
        estilo: 'rock',
        data: '2026-04-20',
        descricao: 'Distorção encorpada com chorus e delay longo para solos de arena.',
    },
    {
        id: 5,
        nome: 'Limpo Cristalino',
        marca: 'mooer',
        equipamento: 'GE300',
        estilo: 'clean',
        data: '2026-07-30',
        descricao: 'Timbre limpo brilhante com reverb de sala e compressor leve.',
    },
    {
        id: 6,
        nome: 'Djent Preciso',
        marca: 'headrush',
        equipamento: 'MX5',
        estilo: 'metal',
        data: '2026-06-25',
        descricao: 'Ataque definido, graves firmes e noise gate agressivo.',
    },
    {
        id: 7,
        // Starts with an accent on purpose: pt-BR sorts it first, code-point order last.
        nome: 'Ápice do Solo',
        marca: 'zoom',
        equipamento: 'G6',
        estilo: 'rock',
        data: '2026-07-12',
        descricao: 'Lead com sustain longo, delay analógico e boost de médios.',
    },
    {
        id: 8,
        nome: 'Funk Limpo',
        marca: 'hotone',
        equipamento: 'Ampero II',
        estilo: 'clean',
        data: '2026-05-18',
        descricao: 'Limpo percussivo com compressor e auto-wah sutil.',
    },
    {
        id: 9,
        nome: 'Texas Blues',
        marca: 'valeton',
        equipamento: 'GP-200',
        estilo: 'blues',
        data: '2026-06-02',
        descricao: 'Drive de pedal verde sobre amplificador americano, com reverb de mola.',
    },
];
