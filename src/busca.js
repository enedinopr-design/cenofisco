// Busca no portal (busca.html): pesquisa ao mesmo tempo em notícias, procedimentos, legislação, consultas,
// tabelas práticas, aplicativos, especiais, podcast e NCM (Busca Fiscal), a partir dos JSONs do portal.
// Parâmetros: q (termo) e tipo (filtra um tipo). Todas as palavras precisam aparecer (título, resumo ou área);
// título vale mais que resumo. Sem resultados, tenta "qualquer palavra" e avisa.
// Para incluir uma fonte nova: acrescente um item em FONTES.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    // --- Menu mobile ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');
    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function () {
            const hidden = mainMenu.classList.toggle('hidden');
            menuToggle.setAttribute('aria-expanded', String(!hidden));
        });
    }

    const $ = id => document.getElementById(id);
    const form = $('busca-form');
    const input = $('busca-q');
    const tiposEl = $('busca-tipos');
    const resumoEl = $('busca-resumo');
    const atalhosEl = $('busca-atalhos');
    const resultadosEl = $('busca-resultados');
    if (!form || !resultadosEl) return;

    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const PARADAS = new Set('a o as os de da do das dos e em no na nos nas um uma para por com sem que como sobre ao aos'.split(' '));
    const dataChave = s => { const [d, m, a] = String(s || '').split('/'); return a ? `${a}${m}${d}` : ''; };
    const json = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(r.status))).catch(() => null);

    // Cada fonte: arquivo, como listar os itens e como transformar em resultado { titulo, resumo, area, data, link }
    const FONTES = [
        { id: 'noticias', rotulo: 'Notícias', icone: 'fa-newspaper', tom: 'bg-blue-50 text-blue-700', arquivo: 'noticias.json', itens: j => j,
            item: n => ({ titulo: n.title, resumo: n.summary, area: n.area, data: n.date, link: n.link && n.link !== '#' ? n.link : `noticia.html?id=${encodeURIComponent(n.id)}` }) },
        { id: 'procedimentos', rotulo: 'Procedimentos', icone: 'fa-file-lines', tom: 'bg-emerald-50 text-emerald-700', arquivo: 'procedimentos.json', itens: j => j,
            item: p => ({ titulo: p.title, resumo: p.summary, area: [p.area, p.numero ? `Nº ${p.numero}` : ''].filter(Boolean).join(' · '), data: p.date, link: p.link && p.link !== '#' ? p.link : `procedimento.html?id=${encodeURIComponent(p.id)}` }) },
        { id: 'legislacao', rotulo: 'Legislação', icone: 'fa-scale-balanced', tom: 'bg-violet-50 text-violet-700', arquivo: 'legislacao.json', itens: j => j,
            item: l => ({ titulo: l.title, resumo: l.summary, area: [l.area, l.tipo_de_publicacao].filter(Boolean).join(' · '), data: l.date, link: l.link || 'legislacao.html' }) },
        { id: 'consultas', rotulo: 'Consultas', icone: 'fa-headset', tom: 'bg-sky-50 text-sky-700', arquivo: 'consultas.json', itens: j => j,
            item: c => ({ titulo: c.title, resumo: c.summary, area: c.area, data: c.date, link: `consulta.html?id=${encodeURIComponent(c.id)}` }) },
        { id: 'tabelas', rotulo: 'Tabelas Práticas', icone: 'fa-table', tom: 'bg-teal-50 text-teal-700', arquivo: 'tabelas.json', itens: j => j.tabelas,
            item: t => ({ titulo: t.titulo, resumo: t.link ? 'Tabela prática disponível no portal.' : 'Em breve no portal.', area: t.area, link: t.link || `tabelas.html?q=${encodeURIComponent(t.titulo)}`, emBreve: !t.link }) },
        { id: 'aplicativos', rotulo: 'Aplicativos', icone: 'fa-calculator', tom: 'bg-orange-50 text-orange-700', arquivo: 'aplicativos.json', itens: j => j,
            item: a => ({ titulo: a.title, resumo: 'Aplicativo de cálculo.', area: a.categoria, link: a.link || `aplicativos.html?q=${encodeURIComponent(a.title)}`, emBreve: !a.link }) },
        { id: 'especiais', rotulo: 'Especiais', icone: 'fa-star', tom: 'bg-amber-50 text-amber-700', arquivo: 'especiais.json', itens: j => j,
            item: e => ({ titulo: e.title, resumo: e.summary, area: e.area, data: e.updated, link: e.link || `especiais.html?q=${encodeURIComponent(e.sigla || e.title)}` }) },
        { id: 'podcast', rotulo: 'Podcast', icone: 'fa-microphone', tom: 'bg-red-50 text-red-700', arquivo: 'podcasts.json', itens: j => j.episodios,
            item: p => ({ titulo: p.titulo, resumo: `Episódio do Cenofisco Orienta${p.duracao ? ` · ${p.duracao}` : ''}.`, area: p.categoria, data: p.data, link: `podcasts.html?ep=${encodeURIComponent(p.id)}` }) },
        { id: 'cclasstrib', rotulo: 'CST/cClassTrib', icone: 'fa-tags', tom: 'bg-cyan-50 text-cyan-700', arquivo: 'cclasstrib.json',
            itens: j => j.cst.flatMap(c => [{ cst: c, tipo: 'cst' }, ...(c.classificacoes || []).map(k => ({ cst: c, k, tipo: 'k' }))]),
            item: ({ cst, k, tipo }) => tipo === 'cst'
                ? { titulo: `CST ${cst.cst} – ${cst.nome}`, resumo: `${(cst.classificacoes || []).length} códigos cClassTrib.`, area: 'IBS e CBS', link: `cst-cclasstrib.html?cst=${cst.cst}`, chave: cst.cst }
                : { titulo: `cClassTrib ${k.codigo} – ${k.nome}`, resumo: k.descricao && k.descricao !== k.nome ? k.descricao : `CST ${cst.cst} – ${cst.nome}`, area: 'IBS e CBS', link: `cst-cclasstrib.html?q=${k.codigo}`, chave: k.codigo } },
        { id: 'ncm', rotulo: 'NCM', icone: 'fa-barcode', tom: 'bg-slate-100 text-slate-700', arquivo: 'buscafiscal.json', itens: j => j.tec,
            item: n => ({ titulo: `${n.ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')} – ${n.descricao}`, resumo: `IPI ${n.ipi ?? '—'}% · II ${n.ii ?? '—'}%`, area: 'Busca Fiscal', link: `buscafiscal-resultados.html?q=${encodeURIComponent(n.ncm)}&busca_fiscal_tipo=ncm`, chave: n.ncm }) }
    ];
    const fonte = id => FONTES.find(f => f.id === id);

    const params = new URLSearchParams(location.search);
    const estado = { q: (params.get('q') || '').trim(), tipo: fonte(params.get('tipo')) ? params.get('tipo') : '' };
    input.value = estado.q;
    const globalInput = $('globalSearch');
    if (globalInput) globalInput.value = estado.q;

    let base = null;   // { fonteId: [resultados normalizados] }
    Promise.all(FONTES.map(f => json(f.arquivo).then(j => {
        let lista = [];
        try { lista = (f.itens(j) || []).map(f.item).map(r => ({ ...r, fonte: f.id, texto: norm(`${r.titulo} ${r.resumo} ${r.area} ${r.chave || ''}`), tituloN: norm(r.titulo) })); } catch (e) { /* arquivo fora do formato */ }
        return [f.id, lista];
    }))).then(pares => { base = Object.fromEntries(pares); render(); });

    function termos(q) { return norm(q).split(/[^a-z0-9º°ª.\/-]+/).map(t => t.replace(/^[.\/-]+|[.\/-]+$/g, '')).filter(t => t && !PARADAS.has(t)); }
    function pontuar(r, ts, todas) {
        const achou = ts.filter(t => r.texto.includes(t) || (/^\d[\d.]*$/.test(t) && r.texto.replace(/\./g, '').includes(t.replace(/\./g, ''))));
        if (todas ? achou.length < ts.length : !achou.length) return 0;
        let p = achou.length * 2;
        achou.forEach(t => { if (r.tituloN.includes(t)) p += 3; if (r.tituloN.startsWith(t)) p += 1; });
        if (r.tituloN.includes(norm(estado.q))) p += 6;   // frase inteira no título
        if (r.emBreve) p -= 1;
        return p;
    }
    function buscar(ts, todas) {
        const out = {};
        FONTES.forEach(f => {
            out[f.id] = (base[f.id] || []).map(r => ({ r, p: pontuar(r, ts, todas) })).filter(x => x.p > 0)
                .sort((a, b) => b.p - a.p || dataChave(b.r.data).localeCompare(dataChave(a.r.data))).map(x => x.r);
        });
        return out;
    }

    // Realça os termos no texto (sem quebrar o HTML)
    function realce(texto, ts) {
        let html = esc(texto);
        const n = norm(texto);
        const marcas = [];
        ts.forEach(t => { let i = n.indexOf(t); while (i >= 0 && t.length > 1) { marcas.push([i, i + t.length]); i = n.indexOf(t, i + t.length); } });
        if (!marcas.length) return html;
        marcas.sort((a, b) => a[0] - b[0]);
        let res = '', pos = 0;
        marcas.forEach(([a, b]) => { if (a < pos) return; res += esc(texto.slice(pos, a)) + `<mark class="rounded bg-amber-100 px-0.5 text-inherit">${esc(texto.slice(a, b))}</mark>`; pos = b; });
        return res + esc(texto.slice(pos));
    }

    function cartao(r, ts) {
        const f = fonte(r.fonte);
        return `<li><a href="${esc(r.link)}" class="group flex gap-4 rounded-xl px-3 py-3 transition hover:bg-slate-50">
            <span class="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm ${f.tom}" aria-hidden="true"><i class="fa-solid ${f.icone}"></i></span>
            <span class="min-w-0 flex-1">
                <span class="block font-semibold leading-snug text-slate-900 group-hover:text-blue-800 group-hover:underline group-hover:underline-offset-2">${realce(r.titulo, ts)}</span>
                ${r.resumo ? `<span class="mt-1 line-clamp-2 block text-sm text-slate-600">${realce(r.resumo, ts)}</span>` : ''}
                <span class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span class="font-semibold">${esc(f.rotulo)}</span>${r.area ? `<span aria-hidden="true">·</span><span>${esc(r.area)}</span>` : ''}${r.data ? `<span aria-hidden="true">·</span><span>${esc(r.data)}</span>` : ''}${r.emBreve ? '<span class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Em breve</span>' : ''}
                </span>
            </span>
        </a></li>`;
    }

    // Atalho quando o termo parece um NCM (4 a 8 dígitos) e não é um código CST/cClassTrib (esses já aparecem nos resultados)
    function atalhos(q) {
        const d = q.replace(/[.\s-]/g, '');
        const a = [];
        const ehClassTrib = (base?.cclasstrib || []).some(r => r.chave === d);
        if (/^\d{4,8}$/.test(d) && !ehClassTrib) a.push({ href: `buscafiscal-resultados.html?q=${d}&busca_fiscal_tipo=ncm`, icone: 'fa-barcode', titulo: `Consultar o NCM ${esc(q)} na Busca Fiscal`, texto: 'Alíquotas de IPI, II, PIS/Cofins e ICMS.' });
        return a.map(x => `<a href="${x.href}" class="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-100">
            <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white" aria-hidden="true"><i class="fa-solid ${x.icone}"></i></span>
            <span class="min-w-0 flex-1"><span class="block font-semibold text-blue-900">${x.titulo}</span><span class="block text-sm text-slate-600">${x.texto}</span></span>
            <i class="fa-solid fa-arrow-right text-sm text-blue-700" aria-hidden="true"></i></a>`).join('');
    }

    const SUGESTOES = ['13º salário', 'Simples Nacional', 'cesta básica', 'FECP', 'Reforma Tributária', 'cerveja'];
    function vazio(titulo, texto) {
        return `<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <i class="fa-solid fa-magnifying-glass mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
            <p class="font-semibold text-slate-800">${titulo}</p>
            <p class="mt-1 text-sm text-slate-600">${texto}</p>
            <p class="mt-5 text-xs font-semibold tracking-wider text-slate-500 uppercase">Experimente</p>
            <div class="mt-2 flex flex-wrap justify-center gap-2">${SUGESTOES.map(s => `<a href="busca.html?q=${encodeURIComponent(s)}" class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800">${esc(s)}</a>`).join('')}</div>
            <div class="mt-6 flex flex-wrap justify-center gap-3">
                <a href="consultoria.html" class="cf-btn cf-btn-primary"><i class="fa-solid fa-headset" aria-hidden="true"></i>Falar com a Consultoria</a>
            </div>
        </div>`;
    }

    function render() {
        const url = new URL(location.href);
        estado.q ? url.searchParams.set('q', estado.q) : url.searchParams.delete('q');
        estado.tipo ? url.searchParams.set('tipo', estado.tipo) : url.searchParams.delete('tipo');
        history.replaceState(null, '', url);
        document.title = estado.q ? `“${estado.q}” – Busca – Cenofisco` : 'Busca – Cenofisco';
        atalhosEl.innerHTML = estado.q ? atalhos(estado.q) : '';

        const ts = termos(estado.q);
        if (!ts.length) {
            tiposEl.innerHTML = '';
            resumoEl.textContent = '';
            resultadosEl.innerHTML = vazio('O que você procura?', 'Digite uma palavra, um número de norma, um NCM ou um assunto.');
            return;
        }
        let achados = buscar(ts, true);
        let parcial = false;
        if (!FONTES.some(f => achados[f.id].length)) { achados = buscar(ts, false); parcial = true; }
        const total = FONTES.reduce((n, f) => n + achados[f.id].length, 0);

        // Filtros por tipo (com contagem)
        const chip = (id, rotulo, n) => {
            const on = estado.tipo === id;
            return `<button type="button" data-tipo="${id}" aria-pressed="${on}" ${n === 0 && !on ? 'disabled' : ''} class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition disabled:cursor-default disabled:opacity-40 ${on ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800'}">${esc(rotulo)}<span class="text-xs ${on ? 'text-blue-100' : 'text-slate-400'}">${n}</span></button>`;
        };
        tiposEl.innerHTML = chip('', 'Todos', total) + FONTES.filter(f => achados[f.id].length || estado.tipo === f.id).map(f => chip(f.id, f.rotulo, achados[f.id].length)).join('');

        if (!total) {
            resumoEl.textContent = `Nenhum resultado para “${estado.q}”.`;
            if (atalhosEl.innerHTML) { resultadosEl.innerHTML = ''; return; }   // o atalho para a Busca Fiscal (NCM) já resolve
            resultadosEl.innerHTML = vazio(`Nenhum resultado para “${esc(estado.q)}”`, 'Confira a grafia, use menos palavras ou um termo mais geral.');
            return;
        }
        resumoEl.innerHTML = `${total} ${total === 1 ? 'resultado' : 'resultados'} para <strong class="text-slate-800">“${esc(estado.q)}”</strong>${parcial ? ' <span class="text-amber-700">· nenhum item tinha todas as palavras; mostrando os que têm alguma delas</span>' : ''}`;

        const grupos = (estado.tipo ? [fonte(estado.tipo)] : FONTES).filter(f => achados[f.id].length);
        const LIMITE = estado.tipo ? Infinity : 4;
        resultadosEl.innerHTML = grupos.map(f => {
            const lista = achados[f.id];
            const mais = lista.length > LIMITE;
            return `<section class="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3" aria-labelledby="grupo-${f.id}">
                <h2 id="grupo-${f.id}" class="flex items-center gap-2.5 px-3 pt-2 pb-1 font-semibold text-slate-900"><i class="fa-solid ${f.icone} text-sm text-slate-400" aria-hidden="true"></i>${esc(f.rotulo)} <span class="text-sm font-normal text-slate-500">${lista.length}</span></h2>
                <ul class="divide-y divide-slate-100">${lista.slice(0, LIMITE).map(r => cartao(r, ts)).join('')}</ul>
                ${mais ? `<button type="button" data-tipo="${f.id}" class="mx-3 mt-1 mb-2 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline">Ver os ${lista.length} resultados em ${esc(f.rotulo)} <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></button>` : ''}
            </section>`;
        }).join('');
    }

    // --- Eventos ---
    form.addEventListener('submit', e => {
        e.preventDefault();
        estado.q = input.value.trim();
        estado.tipo = '';
        if (globalInput) globalInput.value = estado.q;
        if (base) render();
    });
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-tipo]');
        if (!b || !base) return;
        estado.tipo = b.dataset.tipo;
        render();
        if (b.closest('#busca-resultados')) $('busca-topo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});
