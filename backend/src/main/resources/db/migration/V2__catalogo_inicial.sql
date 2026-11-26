-- Initial catalogue: the equipments, packs and presets of mock/db.seed.json, with their original ids.

INSERT INTO equipamento (id, marca, modelo) VALUES
    (1, 'boss', 'GT-1000'),
    (2, 'zoom', 'G6'),
    (3, 'nux', 'MG-30'),
    (4, 'line6', 'HX Stomp');

INSERT INTO pack (id, nome, estilo, descricao, preco_centavos, equipamento_id) VALUES
    ('rock-boss-gt-1000', 'Rock · Boss GT-1000', 'rock', 'Do crunch britânico ao solo de arena, prontos para a sua GT-1000.', 4990, 1),
    ('metal-boss-gt-1000', 'Metal · Boss GT-1000', 'metal', 'Ganho alto e graves firmes na GT-1000, de thrash a afinações baixas.', 4990, 1),
    ('blues-boss-gt-1000', 'Blues · Boss GT-1000', 'blues', 'Overdrives que respondem à palheta, ajustados para a GT-1000.', 4990, 1),
    ('rock-zoom-g6', 'Rock · Zoom G6', 'rock', 'Riffs, acordes e solos de rock feitos para a Zoom G6.', 4990, 2),
    ('clean-zoom-g6', 'Clean · Zoom G6', 'clean', 'Limpos brilhantes e ambientes para tocar na Zoom G6.', 4990, 2),
    ('metal-nux-mg-30', 'Metal · NUX MG-30', 'metal', 'Distorções modernas e precisas para a NUX MG-30.', 4990, 3),
    ('clean-nux-mg-30', 'Clean · NUX MG-30', 'clean', 'Do funk ao jazz: limpos com dinâmica para a NUX MG-30.', 4990, 3),
    ('blues-line6-hx-stomp', 'Blues · Line 6 HX Stomp', 'blues', 'Blues clássico e texano, montados no HX Stomp.', 4990, 4),
    ('rock-line6-hx-stomp', 'Rock · Line 6 HX Stomp', 'rock', 'Rock de amplificador no talo, direto do HX Stomp.', 4990, 4);

INSERT INTO preset (id, nome, descricao, data_publicacao, pack_id) VALUES
    (1, 'Djent Preciso', 'Ataque definido, graves firmes e noise gate agressivo.', DATE '2026-06-25', 'metal-nux-mg-30'),
    (2, 'Crunch Clássico', 'Crunch de amplificador britânico com leve compressão, ideal para riffs abertos.', DATE '2026-09-10', 'rock-boss-gt-1000'),
    (3, 'Blues de Sexta', 'Overdrive suave que limpa ao baixar o volume da guitarra.', DATE '2026-08-28', 'blues-line6-hx-stomp'),
    (4, 'Blues Elétrico', 'Overdrive médio que responde à força da palheta.', DATE '2026-04-08', 'blues-boss-gt-1000'),
    (5, 'Rock Alternativo', 'Drive aberto com um toque de fuzz e reverb curto.', DATE '2026-06-01', 'rock-zoom-g6'),
    (6, 'Funk Limpo', 'Limpo percussivo com compressor e auto-wah sutil.', DATE '2026-05-18', 'clean-nux-mg-30'),
    (7, 'Arena 80', 'Distorção encorpada com chorus e delay longo para solos de arena.', DATE '2026-05-02', 'rock-boss-gt-1000'),
    (8, 'Hard Rock Anos 80', 'Ganho médio-alto com chorus leve, no estilo dos anos 80.', DATE '2026-03-22', 'rock-line6-hx-stomp'),
    (9, 'Ápice do Solo', 'Lead com sustain longo, delay analógico e boost de médios.', DATE '2026-07-12', 'rock-zoom-g6'),
    (10, 'Arpejo Ambiente', 'Delay pontilhado e reverb longo para arpejos.', DATE '2026-03-03', 'clean-zoom-g6'),
    (11, 'Thrash Afiado', 'Ganho alto e ataque seco para palhetadas rápidas.', DATE '2026-06-11', 'metal-boss-gt-1000'),
    (12, 'Texas Blues', 'Drive de pedal verde sobre amplificador americano, com reverb de mola.', DATE '2026-07-03', 'blues-line6-hx-stomp'),
    (13, 'Metal Melódico', 'Distorção com médios presentes para solos melódicos.', DATE '2026-04-19', 'metal-nux-mg-30'),
    (14, 'Riff de Garagem', 'Fuzz cru e médios na frente para riffs de garagem.', DATE '2026-03-14', 'rock-boss-gt-1000'),
    (15, 'Jazz Suave', 'Limpo escuro e redondo, com agudos contidos.', DATE '2026-01-12', 'clean-nux-mg-30'),
    (16, 'Power Chords', 'Distorção cheia, pensada para acordes de quinta.', DATE '2026-02-05', 'rock-zoom-g6'),
    (17, 'Classic Rock', 'Amplificador britânico saturado no volume, sem pedais.', DATE '2026-04-27', 'rock-line6-hx-stomp'),
    (18, 'Drop C Pesado', 'Graves firmes e gate apertado para afinações baixas.', DATE '2026-02-20', 'metal-boss-gt-1000'),
    (19, 'Cristal Limpo', 'Limpo brilhante com reverb de sala e compressor leve.', DATE '2026-05-21', 'clean-zoom-g6'),
    (20, 'Slow Blues Noturno', 'Timbre quente com reverb de sala para frases lentas.', DATE '2026-01-30', 'blues-boss-gt-1000'),
    (21, 'Distorção Moderna', 'Ganho alto com gate apertado e médios recortados para afinações baixas.', DATE '2026-08-15', 'metal-nux-mg-30');

-- Explicit ids do not move the identities: the next equipment gets 5 and the next preset 22.
SELECT setval(pg_get_serial_sequence('equipamento', 'id'), (SELECT max(id) FROM equipamento));
SELECT setval(pg_get_serial_sequence('preset', 'id'), (SELECT max(id) FROM preset));
