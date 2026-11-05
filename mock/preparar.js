// Prepares the mock database for json-server (AD-008).
// mock/db.seed.json is the tracked starting data; mock/db.json is the
// git-ignored working copy that json-server reads and writes.
//
//   node mock/preparar.js          creates db.json from the seed if it is missing
//   node mock/preparar.js --reset  overwrites db.json with the seed
//
// Paths are relative to this file, so it works from any working directory.
const fs = require('fs');
const path = require('path');

const semente = path.join(__dirname, 'db.seed.json');
const dados = path.join(__dirname, 'db.json');
const reiniciar = process.argv.includes('--reset');

if (reiniciar || !fs.existsSync(dados)) {
    fs.copyFileSync(semente, dados);
    console.log(reiniciar ? 'mock/db.json restaurado a partir da semente.' : 'mock/db.json criado a partir da semente.');
}
