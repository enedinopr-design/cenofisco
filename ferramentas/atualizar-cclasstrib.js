// Atualiza a tabela de CST e cClassTrib do IBS e da CBS a partir do Portal da Conformidade Fácil.
//
// Uso (na pasta do projeto):
//   npm run atualizar:cclasstrib              -> baixa, mostra o que mudou e grava
//   npm run atualizar:cclasstrib -- --verificar -> só mostra o que mudou, sem gravar
//
// Gera:
//   src/cclasstrib.json        CST e cClassTrib (usado pela página cst-cclasstrib.html e pela home)
//   src/cclasstrib-itens.json  NCM/NBS dos anexos de cada cClassTrib (carregado sob demanda)
// e atualiza a data "consultada em" em src/cst-cclasstrib.html.
// Requer Node 18 ou superior (usa fetch nativo). Não depende de pacotes externos.
'use strict';
const fs = require('fs');
const path = require('path');

const URL_TABELA = 'https://dfe-portal.svrs.rs.gov.br/DFE/ClassificacaoTributaria';
const SRC = path.join(__dirname, '..', 'src');
const ARQ_TABELA = path.join(SRC, 'cclasstrib.json');
const ARQ_ITENS = path.join(SRC, 'cclasstrib-itens.json');
const ARQ_PAGINA = path.join(SRC, 'cst-cclasstrib.html');
const SO_VERIFICAR = process.argv.includes('--verificar');

const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const data = v => (v ? v.slice(0, 10).split('-').reverse().join('/') : null);
const DFE = { IndNfe: 'NF-e', IndNfce: 'NFC-e', IndCte: 'CT-e', IndCteos: 'CT-e OS', IndBpe: 'BP-e', IndBpetm: 'BP-e TM', IndBpeta: 'BP-e TA', IndNf3e: 'NF3e', IndNfcom: 'NFCom', IndNfse: 'NFS-e', IndNfag: 'NFAg', IndNfsvia: 'NFS-e Via', IndNfabi: 'NFABI', IndNfgas: 'NFGas', IndDere: 'DERE' };
const IND_CST = { IndExigeTrib: 'Exige tributação', IndReducaoBc: 'Redução da base de cálculo', IndReducaoAliq: 'Redução de alíquota', IndTransferenciaCred: 'Transferência de crédito', IndDiferimento: 'Diferimento', IndMonofasica: 'Monofásica', IndCredPresIbsZfm: 'Crédito presumido IBS ZFM', IndAjusteCompet: 'Ajuste de competência' };

function falhar(msg) {
    console.error(`\n✖ ${msg}\nNenhum arquivo foi alterado.`);
    process.exit(1);
}

async function baixar() {
    console.log(`Baixando ${URL_TABELA} ...`);
    let resp;
    try {
        resp = await fetch(URL_TABELA, { headers: { 'User-Agent': 'Mozilla/5.0 (atualizador Cenofisco)' } });
    } catch (e) {
        falhar(`Não foi possível acessar o portal (${e.message}). Verifique a internet e tente de novo.`);
    }
    if (!resp.ok) falhar(`O portal respondeu ${resp.status} ${resp.statusText}.`);
    const html = await resp.text();
    // Os dados vêm embutidos na página: var dadosOriginais = [ ... ];
    const marca = 'var dadosOriginais = ';
    const ini = html.indexOf(marca);
    if (ini < 0) falhar('A página do portal mudou: não encontrei "dadosOriginais". O script precisa ser revisado.');
    const fimLinha = html.indexOf('\n', ini);
    const trecho = html.slice(ini + marca.length, fimLinha < 0 ? undefined : fimLinha).trim().replace(/;\s*$/, '');
    try {
        return JSON.parse(trecho);
    } catch (e) {
        falhar(`Os dados da página não estão em um formato esperado (${e.message}).`);
    }
}

function converter(dados) {
    if (!Array.isArray(dados) || !dados.length || !dados[0].Cst) falhar('Os dados baixados não têm a estrutura de CST esperada.');
    const itens = {};
    const cst = dados.map(c => ({
        cst: c.Cst, nome: c.NomeCst,
        indicadores: Object.keys(IND_CST).filter(k => c[k]).map(k => IND_CST[k]),
        vigencia: [data(c.DthIniVig), data(c.DthFimVig)],
        classificacoes: (c.ClassificacoesTributarias || []).map(t => {
            const anexos = (t.Anexos || []).map(a => [a.CodNcmNbs, a.TipoCodigo, (a.DescItemAnexo || a.Observacao || '').trim()]);
            if (anexos.length) itens[t.CodClassTrib] = anexos;
            return {
                codigo: t.CodClassTrib, nome: t.NomeReduzido || '', descricao: t.NomeClassTrib || '',
                redIbs: t.PercRedIbs, redCbs: t.PercRedCbs,
                tributacaoRegular: !!t.IndTribRegular, creditoPresumido: !!t.IndPermiteCredPres,
                dfe: Object.keys(DFE).filter(k => t[k]).map(k => DFE[k]),
                vigencia: [data(t.DthIniVig), data(t.DthFimVig)], publicacao: data(t.DthPublicacao),
                legislacao: t.TexUrlLegislacao || null,
                texto: (t.TexRegIbs || t.TexRegCbs || '').replace(/\r\n/g, '\n').trim(),
                anexo: (t.Anexos && t.Anexos[0] && t.Anexos[0].DescAnexo) || null,
                qtdItens: anexos.length
            };
        }).sort((a, b) => a.codigo.localeCompare(b.codigo))
    })).sort((a, b) => a.cst.localeCompare(b.cst));
    const total = cst.reduce((s, c) => s + c.classificacoes.length, 0);
    // Proteção contra download incompleto: a tabela tinha 18 CST e 173 cClassTrib em 10/2026
    if (cst.length < 10 || total < 100) falhar(`Dados incompletos (${cst.length} CST, ${total} cClassTrib).`);
    return {
        tabela: { _fonte: `Tabela oficial CST e cClassTrib do IBS e da CBS (Portal da Conformidade Fácil – ${URL_TABELA.replace('https://', '')}), consultada em ${hoje}.`, cst },
        itens, total
    };
}

function compararComAtual(novo) {
    let atual = null;
    try { atual = JSON.parse(fs.readFileSync(ARQ_TABELA, 'utf8')); } catch (e) { return ['(não havia tabela anterior)']; }
    const mapa = t => new Map(t.cst.flatMap(c => c.classificacoes.map(x => [x.codigo, { ...x, cst: c.cst }])));
    const antes = mapa(atual), depois = mapa(novo);
    const msgs = [];
    depois.forEach((x, cod) => { if (!antes.has(cod)) msgs.push(`+ novo cClassTrib ${cod} (CST ${x.cst}): ${x.nome || x.descricao}`); });
    antes.forEach((x, cod) => { if (!depois.has(cod)) msgs.push(`- removido cClassTrib ${cod} (CST ${x.cst}): ${x.nome || x.descricao}`); });
    depois.forEach((x, cod) => {
        const a = antes.get(cod);
        if (!a) return;
        const mud = [];
        if (a.redIbs !== x.redIbs || a.redCbs !== x.redCbs) mud.push(`redução IBS/CBS ${a.redIbs}%/${a.redCbs}% → ${x.redIbs}%/${x.redCbs}%`);
        if (String(a.vigencia) !== String(x.vigencia)) mud.push(`vigência ${a.vigencia.filter(Boolean).join(' a ')} → ${x.vigencia.filter(Boolean).join(' a ')}`);
        if (a.descricao !== x.descricao) mud.push('descrição alterada');
        if (a.qtdItens !== x.qtdItens) mud.push(`NCM/NBS do anexo ${a.qtdItens} → ${x.qtdItens}`);
        if (mud.length) msgs.push(`~ ${cod}: ${mud.join('; ')}`);
    });
    return msgs;
}

(async () => {
    const { tabela, itens, total } = converter(await baixar());
    const mudancas = compararComAtual(tabela);
    console.log(`\nRecebido: ${tabela.cst.length} CST, ${total} cClassTrib, ${Object.values(itens).reduce((s, l) => s + l.length, 0)} NCM/NBS nos anexos.`);
    console.log(mudancas.length ? `\nMudanças em relação à cópia atual (${mudancas.length}):\n  ${mudancas.join('\n  ')}` : '\nNenhuma mudança nos cClassTrib em relação à cópia atual.');

    if (SO_VERIFICAR) {
        console.log('\nModo --verificar: nenhum arquivo foi gravado.');
        return;
    }
    fs.writeFileSync(ARQ_TABELA, JSON.stringify(tabela, null, 1) + '\n');
    fs.writeFileSync(ARQ_ITENS, JSON.stringify(itens) + '\n');
    // Data da consulta no rodapé da página
    const pagina = fs.readFileSync(ARQ_PAGINA, 'utf8');
    const novaPagina = pagina.replace(/consultada em \d{2}\/\d{2}\/\d{4}/, `consultada em ${hoje}`);
    if (novaPagina !== pagina) fs.writeFileSync(ARQ_PAGINA, novaPagina);
    console.log(`\n✔ Gravado: src/cclasstrib.json, src/cclasstrib-itens.json (consulta de ${hoje}).`);
    console.log('  Confira em cst-cclasstrib.html e faça o commit das mudanças.');
})();
