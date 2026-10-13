// Monta src/index-dinamica.html (versão alternativa da página inicial) a partir de src/index.html.
// Reaproveita os mesmos blocos (com os mesmos ids), então index.js, buscafiscal.js etc. funcionam igual.
// Estrutura: topo com busca ligada ao assistente IA, atalhos, faixas temáticas com cabeçalho centralizado,
// números do portal, chamada para a consultoria e perguntas frequentes (comportamento em index-dinamica.js).
//
// Uso: node ferramentas/montar-index-dinamica.js   (rode de novo quando a index.html mudar)
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const original = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

// Extrai um elemento inteiro (com tags iguais aninhadas) a partir de um trecho único da tag de abertura
function bloco(trecho) {
    const ini = original.lastIndexOf('<', original.indexOf(trecho));
    if (original.indexOf(trecho) < 0) throw new Error('bloco não encontrado: ' + trecho);
    const tag = original.slice(ini + 1).match(/^[a-z]+/)[0];
    const re = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'g');
    re.lastIndex = ini;
    let nivel = 0, m;
    while ((m = re.exec(original))) {
        nivel += m[0].startsWith('</') ? -1 : 1;
        if (nivel === 0) {
            return original.slice(ini, m.index + m[0].length)
                .replace(/max-lg:order-\[\d+\] /g, '')                    // ordem da home não se aplica aqui
                .replace(/<h2 /g, '<h3 ').replace(/<\/h2>/g, '</h3>');     // título da faixa é o h2
        }
    }
    throw new Error('fechamento não encontrado: ' + trecho);
}
const b = {
    novidades: bloco('<section id="novidades"'),
    atalhos: bloco('aria-label="Acesso rápido">'),
    noticias: bloco('aria-labelledby="titulo-noticias"'),
    busca: bloco('aria-labelledby="titulo-busca-fiscal"'),
    procedimentos: bloco('aria-labelledby="titulo-procedimentos"'),
    // Coluna estreita: áreas em fileira no topo (sem a divisão lateral do xl)
    consultoria: bloco('id="consultoria-cenofisco"').replace(/ xl:grid-cols-4/g, '').replace(/ xl:col-span-[13]/g, '').replace(/ xl:border-r xl:border-slate-200 xl:pr-4/g, '').replace(/ xl:flex-col xl:space-y-0\.5/g, ''),
    podcast: bloco('aria-labelledby="titulo-podcast"'),
    especiais: bloco('aria-labelledby="titulo-especiais"'),
    // Versão compacta: 4 normas (3 no celular)
    legislacao: bloco('aria-labelledby="titulo-legislacao"').replace('max-sm:[&>*:nth-child(n+4)]:hidden', 'max-sm:[&>*:nth-child(n+4)]:hidden [&>*:nth-child(n+5)]:hidden')
        .replace('md:grid-cols-4" id="legislacao-filtros"', 'md:grid-cols-4 xl:grid-cols-3" id="legislacao-filtros"').replace('col-span-3 md:col-span-1', 'col-span-3 md:col-span-1 xl:col-span-3'),
    cursos: bloco('aria-labelledby="titulo-cursos"').replace('sm:grid-cols-2 max-sm:', 'sm:grid-cols-2 xl:grid-cols-4 max-sm:'),
    agenda: bloco('aria-labelledby="titulo-agenda"'),
    aplicativos: bloco('aria-labelledby="titulo-aplicativos"'),
    reforma: bloco('aria-labelledby="titulo-reforma"'),
    codigos: bloco('aria-labelledby="titulo-codigos"'),
    regulamentos: bloco('aria-labelledby="titulo-regulamentos"'),
    tabelas: bloco('aria-labelledby="titulo-tabelas"'),
    indicadores: bloco('aria-labelledby="titulo-indicadores"'),
    // 6 normas + botão "Mostrar todas" em todas as larguras
    normas: bloco('aria-labelledby="titulo-normas"').replace('max-sm:[&>li:nth-child(n+7)]:hidden', '[&>li:nth-child(n+7)]:hidden').replace('cf-btn cf-btn-soft mt-3 w-full sm:hidden', 'cf-btn cf-btn-soft mt-3 w-full'),
    banner: bloco('block overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm').replace('block overflow-hidden', 'block self-start overflow-hidden'),
    canal: bloco('aria-labelledby="titulo-canal"')
};
// Tabelas Práticas e Aplicativos dividem a fileira com Indicadores (mais alto): mais conteúdo para não sobrar espaço
// em branco, e o botão final encostado no rodapé do cartão para alinhar os três
const naBase = html => html.replace('cf-card"', 'cf-card flex flex-col"').replace(/cf-btn cf-btn-soft mt-[45] w-full/, 'cf-btn cf-btn-soft mt-auto w-full');
b.tabelas = naBase(b.tabelas.replace('<ul id="tabelas-praticas-lista">', '<ul id="tabelas-praticas-lista" class="mb-4" data-limite="11">'));
const apps = JSON.parse(fs.readFileSync(path.join(SRC, 'aplicativos.json'), 'utf8'));
const AREAS_APPS = [
    { id: 'Trabalhista/Previdenciário', rotulo: 'Trabalhista e Previdenciário', icone: 'fa-people-group', tom: 'bg-orange-50 text-orange-600' },
    { id: 'Federal', rotulo: 'Federal', icone: 'fa-landmark', tom: 'bg-blue-50 text-blue-700' },
    { id: 'Estadual', rotulo: 'Estadual', icone: 'fa-map', tom: 'bg-emerald-50 text-emerald-700' },
    { id: 'Municipal', rotulo: 'Municipal', icone: 'fa-city', tom: 'bg-amber-50 text-amber-700' }
];
const tile = (href, icone, tom, titulo) => `            <a href="${href}" class="cf-app-btn">
              <span class="cf-app-icone ${tom}"><i class="fa-solid ${icone}" aria-hidden="true"></i></span>
              <span class="cf-app-nome">${titulo}</span>
            </a>`;
const porArea = `
          <h4 class="mt-5 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Por área · ${apps.length} cálculos</h4>
          <ul class="mb-4">
${AREAS_APPS.map(a => `            <li><a href="aplicativos.html?categoria=${encodeURIComponent(a.id)}" class="cf-row group hover:text-blue-800"><span class="flex items-center gap-2.5"><span class="inline-flex size-7 items-center justify-center rounded-md text-xs ${a.tom}"><i class="fa-solid ${a.icone}" aria-hidden="true"></i></span>${a.rotulo}</span><span class="text-xs text-slate-500 group-hover:text-blue-800">${apps.filter(x => x.categoria === a.id).length}</span></a></li>`).join('\n')}
          </ul>`;
b.indicadores = naBase(b.indicadores);
// Procedimentos: "Navegue por área" no rodapé do cartão (preenche a sobra ao lado de Legislação e Consultoria).
// Contagens geradas a partir de procedimentos.json e atualizadas por index-dinamica.js.
const procs = JSON.parse(fs.readFileSync(path.join(SRC, 'procedimentos.json'), 'utf8'));
const AREAS_PROC = [
    { id: 'ICMS e Outros', rotulo: 'ICMS e Outros', icone: 'fa-truck-fast', tom: 'bg-emerald-50 text-emerald-700' },
    { id: 'Federal', rotulo: 'Federal', icone: 'fa-landmark', tom: 'bg-violet-50 text-violet-700' },
    { id: 'Prev/Trab', rotulo: 'Trabalhista e Previdência', icone: 'fa-people-group', tom: 'bg-orange-50 text-orange-700' },
    { id: 'IR', rotulo: 'Imposto de Renda', icone: 'fa-coins', tom: 'bg-red-50 text-red-700' },
    { id: 'ISS e Outros', rotulo: 'ISS e Outros', icone: 'fa-city', tom: 'bg-amber-50 text-amber-700' },
    { id: 'Contabilidade', rotulo: 'Contabilidade', icone: 'fa-calculator', tom: 'bg-sky-50 text-sky-700' }
];
const navProc = `
          <nav class="mt-auto border-t border-slate-100 pt-5" aria-labelledby="titulo-proc-areas">
            <h4 id="titulo-proc-areas" class="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">Navegue por área</h4>
            <ul class="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
${AREAS_PROC.map(a => `              <li><a href="procedimentos.html?area=${encodeURIComponent(a.id)}" class="group flex h-full items-center gap-2.5 rounded-xl border border-slate-200 px-2.5 py-2 transition hover:border-blue-200 hover:bg-blue-50"><span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-xs ${a.tom}"><i class="fa-solid ${a.icone}" aria-hidden="true"></i></span><span class="min-w-0 flex-1 text-[13px] leading-tight font-medium text-slate-700 group-hover:text-blue-800">${a.rotulo}</span><span class="text-xs text-slate-400 tabular-nums" data-proc-area="${a.id}">${procs.filter(p => p.area === a.id).length}</span></a></li>`).join('\n')}
            </ul>
          </nav>`;
b.procedimentos = b.procedimentos.replace('cf-card"', 'cf-card flex flex-col"');
{
    // insere o campo depois da lista (#home-procedimentos), antes de fechar a seção
    const fim = b.procedimentos.lastIndexOf('</section>');
    b.procedimentos = b.procedimentos.slice(0, fim).replace(/\s*$/, '') + navProc +'\n        </section>';
    b.procedimentos = b.procedimentos.replace('<div id="home-procedimentos" class="', '<div id="home-procedimentos" class="mb-5 ');
}
if (!b.procedimentos.includes('Navegue por área')) throw new Error('ajuste de Procedimentos não aplicado');
// Agenda compacta (abre espaço para "Obrigações salvas" logo abaixo): "Ver agenda" vai para a linha do título,
// rótulo do tipo só para leitores de tela e calendário com menos respiro
const agendaLink = '<a href="agenda-obrigacoes.html" class="ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200 hover:underline">Ver agenda <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></a>';
b.agenda = b.agenda
    .replace(/(<h3 id="titulo-agenda" class=")mb-4 flex items-center gap-3 text-lg font-semibold tracking-tight(">[\s\S]*?Agenda de Obrigações)\n(\s*)<\/h3>/, `$1mb-3 flex flex-wrap items-center gap-3 text-lg font-semibold tracking-tight$2\n$3  ${agendaLink}\n$3</h3>`)
    .replace('<div class="mb-4 space-y-3">', '<div class="mb-3 space-y-3">')
    .replace('<label for="agenda-tipo" class="cf-label text-blue-100">', '<label for="agenda-tipo" class="sr-only">')
    .replace('cf-mini-calendar rounded-xl bg-white p-4', 'cf-mini-calendar rounded-xl bg-white p-3')
    .replace(/\n\s*<a href="agenda-obrigacoes.html" class="mt-5 flex w-full[^\n]*<\/a>/, '');
if (!b.agenda.includes('>Ver agenda <') || b.agenda.includes('Ver agenda completa') || !b.agenda.includes('class="sr-only">')) throw new Error('ajuste da Agenda não aplicado');
b.aplicativos = naBase(b.aplicativos)
    .replace(/(Seguro-Desemprego<\/span>\n\s*<\/a>)/, `$1\n${tile('aplicativos.html?q=13', 'fa-gift', 'bg-amber-50 text-amber-600', 'Cálculo do 13º Salário')}\n${tile('aplicativos.html?q=Rescis%C3%A3o', 'fa-handshake-slash', 'bg-rose-50 text-rose-600', 'Cálculo de Rescisão')}`)
    .replace(/(\n\s*<a href="aplicativos.html" class="cf-btn cf-btn-soft)/, `${porArea}$1`);
if (!b.aplicativos.includes('Por área') || !b.aplicativos.includes('Rescisão')) throw new Error('ajuste de Aplicativos não aplicado');
if (!b.tabelas.includes('data-limite')) throw new Error('ajuste de Tabelas não aplicado');
b.atalhos = b.atalhos.replace('class="mb-6 sm:mb-8"', 'class="cf-hero-atalhos"');
// Novidades sobre o fundo azul do topo: vidro claro em vez do azul sólido
b.novidades = b.novidades.replace(/ mb-6 /, ' ').replace(' sm:mb-8', '').replace('bg-blue-900', 'bg-white/10 ring-1 ring-white/15 backdrop-blur').replace(' shadow-sm', '');

const FAIXAS = [
    { id: 'destaques', rotulo: 'Destaques', icone: 'fa-bolt', titulo: 'O que mudou e o que vence', texto: 'As notícias mais recentes e os prazos da agenda de obrigações, lado a lado.', fundo: false },
    { id: 'ferramentas', rotulo: 'Ferramentas', icone: 'fa-screwdriver-wrench', titulo: 'Ferramentas para o dia a dia fiscal', texto: 'Busca por NCM, códigos, tabelas práticas, cálculos e indicadores atualizados.', fundo: true },
    { id: 'conteudo', rotulo: 'Conteúdo técnico', icone: 'fa-book-open', titulo: 'Procedimentos, legislação e consultoria', texto: 'Orientações passo a passo, normas publicadas e as respostas da Consultoria Cenofisco.', fundo: false },
    { id: 'midia', rotulo: 'Aprenda', icone: 'fa-graduation-cap', titulo: 'Aprenda e acompanhe', texto: 'Podcast, especiais, Reforma Tributária e cursos com especialistas.', fundo: true },
    { id: 'referencias', rotulo: 'Referências', icone: 'fa-bookmark', titulo: 'Referências para consulta', texto: 'Regulamentos estaduais, principais normas e canais de atendimento.', fundo: false },
    { id: 'duvidas', rotulo: 'Dúvidas', icone: 'fa-circle-question', titulo: 'Perguntas frequentes sobre o portal', texto: 'Como salvar conteúdos, consultar códigos e acompanhar prazos.', fundo: true }
];
const faixa = (f, corpo) => `
    <!-- ===================== FAIXA: ${f.titulo.toUpperCase()} ===================== -->
    <section id="faixa-${f.id}" class="cf-faixa${f.fundo ? ' cf-faixa-destaque' : ''}" aria-labelledby="faixa-titulo-${f.id}" data-faixa data-bloco="${f.id}" data-rotulo="${f.rotulo}" data-icone="${f.icone}">
      <div class="container mx-auto px-4">
        <header class="cf-faixa-cabecalho">
          <span class="cf-selo"><i class="fa-solid ${f.icone}" aria-hidden="true"></i>${f.rotulo}</span>
          <h2 id="faixa-titulo-${f.id}" class="cf-faixa-titulo">${f.titulo}</h2>
          <p class="cf-faixa-texto">${f.texto}</p>
        </header>
${corpo}
      </div>
    </section>`;
const grade = (classes, itens) => `        <div class="grid grid-cols-1 gap-5 lg:gap-6 ${classes}">\n${itens.join('\n')}\n        </div>`;
const span2 = html => `<div class="min-w-0 lg:col-span-2">\n${html}\n</div>`;

// Topo: busca que abre o assistente IA já com a pergunta (index-dinamica.js)
const PERGUNTAS = ['IPI da cerveja', 'Salário mínimo 2026', 'cClassTrib 200003', 'Alíquota de cerveja no Acre'];
const hero = `
    <!-- ===================== TOPO: BUSCA COM O ASSISTENTE ===================== -->
    <section class="cf-hero cf-on-dark" aria-labelledby="hero-titulo">
      <div class="container mx-auto px-4 pt-5 pb-24 sm:pt-6 sm:pb-28">
${b.novidades}
        <div class="mx-auto max-w-3xl pt-10 text-center sm:pt-14">
          <span class="cf-selo cf-selo-escuro"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>Tributário · Fiscal · Trabalhista</span>
          <p id="hero-titulo" class="cf-hero-titulo">O que você precisa consultar hoje?</p>
          <p class="mx-auto mt-3 max-w-xl text-base text-pretty text-blue-100 sm:text-lg">Pergunte ao assistente: ele pesquisa NCM, CST/cClassTrib, tabelas práticas, agenda, legislação e procedimentos do portal.</p>
          <form id="hero-ia-form" class="cf-hero-busca" role="search" action="#">
            <span class="cf-hero-ia" aria-hidden="true">IA</span>
            <label for="hero-ia-input" class="sr-only">Pergunta para o assistente Cenofisco</label>
            <input type="search" id="hero-ia-input" name="q" autocomplete="off" maxlength="500" placeholder="Ex.: alíquota de ICMS da cerveja no Acre" class="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none">
            <button type="submit" class="cf-btn cf-btn-accent shrink-0 px-4 py-2.5 sm:px-5"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span class="max-sm:sr-only">Perguntar</span></button>
          </form>
          <div class="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span class="text-xs font-medium text-blue-200">Mais buscados:</span>
${PERGUNTAS.map(p => `            <button type="button" class="cf-hero-chip" data-pergunta="${p}">${p}</button>`).join('\n')}
          </div>
        </div>
      </div>
    </section>

    <!-- Acesso rápido: painel que sobe sobre o fim do topo -->
    <div class="container mx-auto px-4">
${b.atalhos}
    </div>`;

// Números do portal (index-dinamica.js atualiza a partir dos JSONs)
const NUMEROS = [
    { chave: 'tabelas', valor: 73, texto: 'tabelas práticas organizadas por área' },
    { chave: 'cclasstrib', valor: 173, texto: 'códigos cClassTrib da tabela oficial' },
    { chave: 'uf', valor: 27, texto: 'regulamentos estaduais de ICMS' },
    { chave: 'podcast', valor: 11, texto: 'áreas temáticas no podcast' }
];
const numeros = `
    <!-- ===================== NÚMEROS DO PORTAL ===================== -->
    <section class="border-y border-slate-200/80 bg-white py-10 sm:py-12" aria-label="O portal em números" data-bloco="numeros" data-rotulo="Números do portal" data-icone="fa-chart-simple">
      <div class="container mx-auto px-4">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-8 text-center lg:grid-cols-4">
${NUMEROS.map(n => `          <div class="flex flex-col-reverse"><dt class="cf-numero-legenda">${n.texto}</dt><dd class="cf-numero" data-numero="${n.chave}">${n.valor}</dd></div>`).join('\n')}
        </dl>
      </div>
    </section>`;

const cta = `
    <!-- ===================== CHAMADA: CONSULTORIA ===================== -->
    <section class="container mx-auto px-4 py-10 sm:py-12" aria-labelledby="cta-titulo" data-bloco="chamada" data-rotulo="Chamada da Consultoria" data-icone="fa-headset">
      <div class="cf-cta cf-on-dark">
        <div class="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div class="max-w-2xl">
            <span class="cf-selo cf-selo-escuro"><i class="fa-solid fa-headset" aria-hidden="true"></i>Consultoria Cenofisco</span>
            <h2 id="cta-titulo" class="mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl">Precisa de uma análise para o seu caso?</h2>
            <p class="mt-3 text-pretty text-blue-100">Envie sua dúvida tributária, fiscal ou trabalhista para a Consultoria Cenofisco. Para uma pesquisa rápida na base do portal, use o assistente IA.</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a href="#consultoria-cenofisco" class="cf-btn cf-btn-accent px-5 py-2.5"><i class="fa-solid fa-headset" aria-hidden="true"></i>Falar com a Consultoria</a>
              <button type="button" class="cf-btn px-5 py-2.5 text-white ring-1 ring-white/30 hover:bg-white/10" data-abrir-ia><span class="inline-flex size-6 items-center justify-center rounded-full bg-amber-400 text-[10px] font-extrabold text-blue-950" aria-hidden="true">IA</span>Pergunte à IA</button>
            </div>
          </div>
          <span class="hidden size-36 items-center justify-center rounded-full bg-white/10 text-6xl text-amber-300 ring-8 ring-white/5 md:inline-flex" aria-hidden="true"><i class="fa-solid fa-comments"></i></span>
        </div>
      </div>
    </section>`;

const FAQ = [
    ['Como salvo tabelas, podcasts, consultas e procedimentos?', 'Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> (salvar) em cada item. Os itens salvos ficam reunidos em <a href="meu-perfil.html">Meu Perfil</a>, neste navegador.'],
    ['O que é o cClassTrib e onde consulto?', 'É o código de Classificação Tributária do IBS e da CBS, informado junto com o CST nos documentos fiscais da Reforma Tributária. Pesquise em <a href="cst-cclasstrib.html">CST/cClassTrib</a> ou no bloco Códigos, com dados da tabela oficial do Portal DF-e.'],
    ['Como acompanho os prazos das obrigações?', 'Na <a href="agenda-obrigacoes.html">Agenda de Obrigações</a>. As obrigações que você salvar na agenda aparecem no aviso do topo desta página quando estiverem perto de vencer.'],
    ['Onde encontro as tabelas práticas?', 'Em <a href="tabelas.html">Tabelas Práticas</a>: as tabelas estão separadas por área, com busca e filtro para mostrar só as disponíveis.'],
    ['O assistente IA substitui a consultoria?', 'Não. O assistente faz uma pesquisa rápida na base do portal e indica onde está a informação. Para analisar um caso específico, <a href="#consultoria-cenofisco">fale com a Consultoria</a>.'],
    ['Posso mudar a ordem das seções desta página?', 'Sim. Use o botão <i class="fa-solid fa-sliders" aria-hidden="true"></i> <strong>Personalizar</strong> no menu de seções: arraste ou use as setas para mudar a ordem e desligue as seções que não quer ver. A escolha fica salva neste navegador.'],
    ['Como uso o tema escuro?', 'Use o botão <i class="fa-solid fa-moon" aria-hidden="true"></i> na barra superior. A escolha fica salva neste navegador.']
];
const faq = `        <div class="mx-auto max-w-3xl space-y-3">
${FAQ.map(([p, r]) => `          <details class="cf-faq"><summary>${p}</summary><p class="cf-faq-resposta">${r}</p></details>`).join('\n')}
        </div>`;

// Agenda + "Obrigações salvas" (fora do box azul), ocupando a sobra ao lado das notícias.
// No desktop o cartão de salvas não aumenta a fileira: h-0 + grow (flex-1 não serve: base 0% vira altura do conteúdo) (mínimo de 1 obrigação);
// index-dinamica.js mostra só as obrigações que cabem inteiras.
const colunaAgenda = `<div class="flex min-w-0 flex-col gap-5 lg:gap-6">
${b.agenda}
<section id="agenda-salvas" class="cf-card flex flex-col lg:h-0 lg:min-h-52 lg:grow lg:p-5" aria-labelledby="titulo-agenda-salvas">
  <div class="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
    <h3 id="titulo-agenda-salvas" class="flex items-center gap-2.5 font-semibold whitespace-nowrap text-slate-900"><span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-sm text-amber-500"><i class="fa-solid fa-bookmark" aria-hidden="true"></i></span>Obrigações salvas <span id="agenda-salvas-total" class="text-xs font-normal text-slate-500"></span></h3>
    <a href="agenda-obrigacoes.html#titulo-salvas" class="cf-link-more">Ver todas salvas <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
  </div>
  <ul id="agenda-salvas-lista" class="-mx-2 min-h-0 flex-1 overflow-hidden">
    <li class="px-2 py-1.5 text-sm text-slate-500">Nenhuma obrigação salva ainda. Na <a href="agenda-obrigacoes.html" class="font-semibold text-blue-700 hover:underline">Agenda de Obrigações</a>, use <strong>Salvar</strong> ao lado de cada obrigação.</li>
  </ul>
</section>
</div>`;

// Janela "Personalizar a página": a lista é montada por index-dinamica.js a partir dos [data-bloco]
const personalizar = `
    <!-- ===================== PERSONALIZAR A PÁGINA ===================== -->
    <dialog id="personalizar-dialog" class="m-auto w-[min(30rem,calc(100%-2rem))] rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-[rgb(2_6_23/0.55)]" aria-labelledby="personalizar-titulo">
      <div class="flex max-h-[min(42rem,calc(100dvh-2rem))] flex-col">
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><i class="fa-solid fa-sliders" aria-hidden="true"></i></span>
          <div class="min-w-0 flex-1">
            <h2 id="personalizar-titulo" class="text-lg font-bold text-slate-900">Personalizar a página</h2>
            <p class="mt-0.5 text-sm text-slate-600">Arraste ou use as setas para mudar a ordem. Desligue o que não quer ver.</p>
          </div>
          <button type="button" class="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" data-personalizar-fechar aria-label="Fechar"><i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i></button>
        </header>
        <ol id="personalizar-lista" class="flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 py-4" aria-label="Seções da página, na ordem em que aparecem"></ol>
        <p id="personalizar-aviso" class="sr-only" aria-live="polite"></p>
        <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <button type="button" id="personalizar-restaurar" class="cf-btn cf-btn-secondary"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i>Restaurar padrão</button>
          <span class="text-xs text-slate-500">Salvo neste navegador</span>
          <button type="button" class="cf-btn cf-btn-primary" data-personalizar-fechar>Concluir</button>
        </footer>
      </div>
    </dialog>`;

const corpoMain = `
  <main id="conteudo">
    <h1 class="sr-only">Cenofisco – Portal Tributário, Fiscal e Trabalhista</h1>
${hero}

    <!-- Menu das faixas: fica preso abaixo do cabeçalho e marca a faixa visível -->
    <nav id="faixas-nav" class="cf-faixas-nav" aria-label="Seções da página">
      <div class="container mx-auto flex items-center gap-2 px-4">
        <ul id="faixas-lista" class="flex min-w-0 flex-1 gap-1 overflow-x-auto py-2 [scrollbar-width:none] lg:justify-center [&::-webkit-scrollbar]:hidden" data-scroll-hint>
${FAIXAS.map(f => `          <li><a href="#faixa-${f.id}" class="cf-faixas-link" data-alvo="faixa-${f.id}"><i class="fa-solid ${f.icone} text-xs" aria-hidden="true"></i>${f.rotulo}</a></li>`).join('\n')}
        </ul>
        <button type="button" id="personalizar-abrir" class="cf-btn cf-btn-secondary shrink-0 px-3 py-1.5" aria-haspopup="dialog" aria-controls="personalizar-dialog"><i class="fa-solid fa-sliders" aria-hidden="true"></i><span class="max-sm:sr-only">Personalizar</span></button>
      </div>
    </nav>
    <!-- Blocos que a pessoa pode reordenar/esconder (Personalizar; index-dinamica.js) -->
    <div id="home-blocos">
${faixa(FAIXAS[0], grade('lg:grid-cols-3', [span2(b.noticias), colunaAgenda]))}
${faixa(FAIXAS[1], grade('lg:grid-cols-3', [span2(b.busca), b.codigos]) + '\n' + grade('mt-5 lg:mt-6 md:grid-cols-2 lg:grid-cols-3', [b.indicadores, b.tabelas, b.aplicativos]))}
${faixa(FAIXAS[2], grade('md:grid-cols-2 xl:grid-cols-3', [b.procedimentos, b.legislacao, `<div class="min-w-0 md:col-span-2 xl:col-span-1">\n${b.consultoria}\n</div>`]))}
${faixa(FAIXAS[3], grade('md:grid-cols-2 lg:grid-cols-3', [b.podcast, b.especiais, b.reforma]) + '\n' + `        <div class="mt-5 lg:mt-6">\n${b.cursos}\n        </div>`)}
${numeros}
${faixa(FAIXAS[4], grade('md:grid-cols-2 xl:grid-cols-3', [`<div class="flex min-w-0 flex-col gap-5 lg:gap-6">
${b.regulamentos}
${b.canal}
</div>`, b.normas, b.banner]))}
${cta}
${faixa(FAIXAS[5], faq)}
    </div>
${personalizar}
  </main>`;

const mIni = original.indexOf('  <main id="conteudo"');
const mFim = original.indexOf('</main>', mIni) + '</main>'.length;
let s = original.slice(0, mIni) + corpoMain.trimStart().replace(/^/, '  ') + original.slice(mFim);
s = s.replace(/<title>[^<]*<\/title>/, '<title>Cenofisco – Portal Tributário, Fiscal e Trabalhista (versão dinâmica)</title>');
s = s.replace('<script src="./index.js" defer></script>', '<script src="./index.js" defer></script>\n  <script src="./index-dinamica.js" defer></script>');
if (!s.includes('index-dinamica.js')) throw new Error('script index.js não encontrado');
fs.writeFileSync(path.join(SRC, 'index-dinamica.html'), s.replace(/\n/g, '\r\n'));
console.log('index-dinamica.html gerada:', Object.keys(b).length, 'blocos em', FAIXAS.length, 'faixas.');
