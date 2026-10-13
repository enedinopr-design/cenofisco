// Gera src/tema-escuro-classes.css: ajustes classe a classe para o tema escuro (azul-marinho, sem preto).
// - Fundos claros (bg-white, bg-blue-50, bg-amber-50...) -> superfície azul-marinho ou um tom translúcido da cor.
// - Bordas/anéis claros (border-blue-200, ring-amber-200...) -> tom translúcido da cor.
// - Textos escuros coloridos (text-blue-700, hover:text-blue-900...) -> tom claro da mesma cor.
// Não dá para simplesmente trocar as variáveis dessas cores porque o mesmo tom aparece em papéis opostos
// (ex.: text-blue-100 é texto claro na faixa azul do topo; bg-blue-50 é fundo de etiqueta).
// Os cinzas (slate/gray) são invertidos por variável em tema-escuro.css.
//
// Roda em "npm run css" (antes do Tailwind). Lê as classes usadas em src/*.html e src/*.js.
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');

const CORES = 'blue|sky|cyan|teal|emerald|green|lime|amber|yellow|orange|red|rose|pink|purple|violet|indigo|fuchsia';
const VARIANTES = 'hover|focus|group-hover|peer-checked|active|focus-visible';
// Texto: tom escuro -> tom claro. No tom 950, elementos com fundo amarelo (botões bg-amber-400) mantêm o texto escuro.
const TEXTO_CLARO = { 500: 400, 600: 400, 700: 300, 800: 300, 900: 200, 950: 200 };
const SOBRE_AMARELO = ':not([class*="bg-amber-"]):not([class*="bg-yellow-"])';
// Fundo/borda claros -> porcentagem da cor (tom 500) misturada com transparente
const FUNDO = { 50: 16, 100: 24, 200: 32 };
const BORDA = { 100: 30, 200: 40, 300: 55 };

const re = new RegExp(`(?:^|[\\s"'\`])((?:(?:${VARIANTES}):)?(text|bg|border|ring)-(white|${CORES})(?:-(\\d{2,3}))?(?:\\/(\\d{1,3}))?)(?=$|[\\s"'\`])`, 'g');
const classes = new Map();
for (const arq of fs.readdirSync(SRC).filter(f => /\.(html|js)$/.test(f))) {
    const s = fs.readFileSync(path.join(SRC, arq), 'utf8');
    for (const m of s.matchAll(re)) classes.set(m[1], m);
}

const esc = c => c.replace(/[:/.[\]]/g, ch => '\\' + ch);
function seletor(classe) {
    const variante = (classe.match(new RegExp(`^(${VARIANTES}):`)) || [])[1];
    const base = `.${esc(classe)}`;
    return {
        undefined: base, hover: `${base}:hover`, focus: `${base}:focus`, active: `${base}:active`,
        'focus-visible': `${base}:focus-visible`, 'group-hover': `.group:hover ${base}`, 'peer-checked': `.peer:checked ~ ${base}`
    }[variante];
}
const mistura = (cor, pct) => `color-mix(in oklab, var(--color-${cor}-500) ${pct}%, transparent)`;

const regras = [];
for (const [classe, m] of [...classes].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [, , tipo, cor, tomTxt, opTxt] = m;
    const tom = Number(tomTxt);
    const op = opTxt ? Number(opTxt) / 100 : 1;
    let decl = null;
    if (tipo === 'text' && cor !== 'white' && TEXTO_CLARO[tom]) decl = `color: var(--color-${cor}-${TEXTO_CLARO[tom]})`;
    else if (tipo === 'bg' && cor === 'white' && op >= 0.5) decl = `background-color: color-mix(in oklab, var(--cf-superficie) ${Math.round(op * 100)}%, transparent)`;
    else if (tipo === 'bg' && cor !== 'white' && FUNDO[tom]) decl = `background-color: ${mistura(cor, Math.round(FUNDO[tom] * op))}`;
    else if (tipo === 'border' && cor !== 'white' && BORDA[tom]) decl = `border-color: ${mistura(cor, Math.round(BORDA[tom] * op))}`;
    else if (tipo === 'ring' && cor !== 'white' && BORDA[tom]) decl = `--tw-ring-color: ${mistura(cor, Math.round(BORDA[tom] * op))}`;
    if (decl) regras.push(`html[data-tema="escuro"] ${seletor(classe)}${tipo === 'text' && tom === 950 ? SOBRE_AMARELO : ''} { ${decl}; }`);
}

const saida = `/* Gerado por ferramentas/gerar-tema-escuro.js — não edite à mão (rode "npm run css"). */\n${regras.join('\n')}\n`;
fs.writeFileSync(path.join(SRC, 'tema-escuro-classes.css'), saida);
const antigo = path.join(SRC, 'tema-escuro-textos.css');
if (fs.existsSync(antigo)) fs.unlinkSync(antigo);
console.log(`tema-escuro-classes.css: ${regras.length} ajustes.`);
