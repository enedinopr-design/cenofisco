// Busca de CST e cClassTrib do IBS e da CBS (cst-cclasstrib.html).
// Dados: cclasstrib.json (tabela oficial do Portal da Conformidade Fácil) e, sob demanda,
// cclasstrib-itens.json (NCM/NBS dos anexos de cada cClassTrib).
// Parâmetros: q (CST, cClassTrib, NCM/NBS ou texto) e cst (filtro por CST).
document.addEventListener('DOMContentLoaded', function () {
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
    const form = $('cct-form');
    const input = $('cct-q');
    const selCst = $('cct-cst');
    const resumoEl = $('cct-resumo');
    const listaEl = $('cct-lista');
    if (!form || !listaEl) return;

    const escapeHTML = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalizar = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const digitos = v => String(v || '').replace(/\D/g, '');
    const fmtNcm = d => (d.length <= 4 ? d : d.length <= 6 ? `${d.slice(0, 4)}.${d.slice(4)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`);
    const fmtNbs = d => [d.slice(0, 1), d.slice(1, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join('.');
    const fmtCodigo = (cod, tipo) => (tipo === 'NBS' ? fmtNbs(cod) : fmtNcm(cod));
    const pct = v => `${String(v).replace('.', ',')}%`;

    let base = null;      // cclasstrib.json
    let itens = null;     // cclasstrib-itens.json (carregado sob demanda)
    let itensPromise = null;
    const carregarItens = () => (itensPromise ||= fetch('cclasstrib-itens.json').then(r => (r.ok ? r.json() : {})).then(j => (itens = j)).catch(() => (itens = {})));

    // Estado inicial a partir do endereço
    const p = new URLSearchParams(location.search);
    input.value = p.get('q') || '';

    fetch('cclasstrib.json')
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(j => {
            base = j;
            selCst.innerHTML = '<option value="">Todos os CST</option>' + j.cst.map(c => `<option value="${c.cst}">${c.cst} – ${escapeHTML(c.nome)}</option>`).join('');
            selCst.value = j.cst.some(c => c.cst === p.get('cst')) ? p.get('cst') : '';
            $('cct-total').textContent = `${j.cst.length} CST · ${j.cst.reduce((s, c) => s + c.classificacoes.length, 0)} cClassTrib`;
            buscar();
        })
        .catch(() => { listaEl.innerHTML = '<p class="text-red-600">Não foi possível carregar a tabela de CST e cClassTrib.</p>'; });

    // Busca enquanto digita (com pequena espera) e ao enviar
    let timer = null;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(buscar, 250); });
    selCst.addEventListener('change', buscar);
    form.addEventListener('submit', e => { e.preventDefault(); buscar(); });
    listaEl.addEventListener('click', e => {
        const b = e.target.closest('[data-sugestao]');
        if (b) { input.value = b.dataset.sugestao; buscar(); }
    });

    async function buscar() {
        if (!base) return;
        const q = input.value.trim();
        const cstFiltro = selCst.value;
        // Endereço compartilhável
        const url = new URL(location.href);
        q ? url.searchParams.set('q', q) : url.searchParams.delete('q');
        cstFiltro ? url.searchParams.set('cst', cstFiltro) : url.searchParams.delete('cst');
        history.replaceState(null, '', url);

        const num = digitos(q);
        const numerico = q && /^[\d.\s-]+$/.test(q);
        const palavras = normalizar(q).split(/\s+/).filter(w => w.length >= 2);
        // Código com 4+ dígitos que não é CST (3) nem cClassTrib (6): procura NCM/NBS nos anexos
        let porItem = null;
        if (numerico && num.length >= 4 && num.length !== 6) {
            await carregarItens();
            porItem = {};
            Object.entries(itens).forEach(([cod, lista]) => {
                const achados = lista.filter(([c]) => c.startsWith(num) || num.startsWith(c));
                if (achados.length) porItem[cod] = achados;
            });
        }

        const grupos = base.cst
            .filter(c => !cstFiltro || c.cst === cstFiltro)
            .map(c => {
                const casaCst = numerico ? c.cst.startsWith(num) && num.length <= 3 : false;
                const classes = c.classificacoes.filter(t => {
                    if (!q) return true;
                    if (numerico) return casaCst || t.codigo.startsWith(num) || Boolean(porItem && porItem[t.codigo]);
                    const texto = normalizar(`${c.cst} ${c.nome} ${t.codigo} ${t.nome} ${t.descricao} ${t.anexo || ''}`);
                    return palavras.every(w => texto.includes(w));
                });
                return { c, classes };
            })
            .filter(g => g.classes.length || (!q && !g.c.classificacoes.length));

        const total = grupos.reduce((s, g) => s + g.classes.length, 0);
        resumoEl.textContent = q || cstFiltro
            ? `${total} cClassTrib em ${grupos.length} CST${q ? ` para “${q}”` : ''}${cstFiltro ? ` · CST ${cstFiltro}` : ''}`
            : `${total} cClassTrib em ${grupos.length} CST`;

        if (!grupos.length) {
            listaEl.innerHTML = `
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-solid fa-magnifying-glass mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">Nenhum CST ou cClassTrib para “${escapeHTML(q)}”.</p>
                    <p class="mt-1 text-sm text-slate-500">Pesquise pelo CST (ex.: 200), pelo cClassTrib (ex.: 200003), por NCM/NBS ou por palavras da descrição.</p>
                    <div class="mt-4 flex flex-wrap justify-center gap-2">${['200', '000001', 'cesta básica', 'saúde', '1006'].map(s => `<button type="button" data-sugestao="${s}" class="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">${s}</button>`).join('')}</div>
                </div>`;
            return;
        }

        // Com poucos resultados, os itens já vêm abertos
        const abrir = q && total <= 3;
        listaEl.innerHTML = grupos.map(g => grupoCst(g.c, g.classes, abrir, porItem)).join('');
    }

    function grupoCst(c, classes, abrir, porItem) {
        return `
            <section class="cf-card p-0! overflow-hidden" aria-labelledby="cst-${c.cst}">
                <header class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h2 id="cst-${c.cst}" class="flex items-baseline gap-3 font-bold text-slate-900">
                        <span class="rounded-md bg-blue-900 px-2 py-0.5 text-sm text-white tabular-nums">CST ${c.cst}</span>
                        <span>${escapeHTML(c.nome)}</span>
                    </h2>
                    <span class="text-xs text-slate-500">${classes.length} cClassTrib</span>
                    ${c.indicadores.length ? `<ul class="flex basis-full flex-wrap gap-1.5" aria-label="Indicadores do CST">${c.indicadores.map(i => `<li class="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">${escapeHTML(i)}</li>`).join('')}</ul>` : ''}
                </header>
                <ul class="divide-y divide-slate-100">${classes.map(t => itemClassTrib(t, abrir, porItem && porItem[t.codigo])).join('') || '<li class="px-5 py-4 text-sm text-slate-500">Sem cClassTrib vigente.</li>'}</ul>
            </section>`;
    }

    function reducao(t) {
        if (t.redIbs === t.redCbs) return t.redIbs ? `Redução de ${pct(t.redIbs)}` : '';
        return `Redução IBS ${pct(t.redIbs)} · CBS ${pct(t.redCbs)}`;
    }

    function itemClassTrib(t, abrir, achados) {
        const red = reducao(t);
        return `
            <li>
                <details class="group"${abrir ? ' open' : ''} data-codigo="${t.codigo}">
                    <summary class="flex cursor-pointer list-none items-start gap-3 px-5 py-4 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                        <span class="mt-0.5 shrink-0 rounded bg-amber-100 px-2 py-0.5 font-mono text-sm font-bold text-amber-900">${t.codigo}</span>
                        <span class="min-w-0 flex-1">
                            <span class="block font-medium text-slate-900">${escapeHTML(t.nome || t.descricao)}</span>
                            <span class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                ${red ? `<span class="font-semibold text-emerald-700">${red}</span>` : ''}
                                ${t.anexo ? `<span>${escapeHTML(t.anexo)}</span>` : ''}
                                ${t.qtdItens ? `<span>${t.qtdItens} NCM/NBS</span>` : ''}
                                ${achados ? `<span class="font-semibold text-blue-700">Inclui ${achados.map(([c, tipo]) => `${tipo} ${fmtCodigo(c, tipo)}`).slice(0, 3).join(', ')}${achados.length > 3 ? '…' : ''}</span>` : ''}
                            </span>
                        </span>
                        <i class="fa-solid fa-chevron-down mt-1.5 text-xs text-slate-400 transition group-open:rotate-180" aria-hidden="true"></i>
                    </summary>
                    <div class="space-y-4 px-5 pb-5 text-sm text-slate-700 sm:pl-[5.75rem]">
                        <p>${escapeHTML(t.descricao)}</p>
                        <dl class="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div class="cf-row"><dt>Redução IBS</dt><dd class="font-semibold text-slate-900">${pct(t.redIbs)}</dd></div>
                            <div class="cf-row"><dt>Redução CBS</dt><dd class="font-semibold text-slate-900">${pct(t.redCbs)}</dd></div>
                            <div class="cf-row"><dt>Vigência</dt><dd class="font-semibold text-slate-900">${t.vigencia[0] ? `desde ${t.vigencia[0]}` : '—'}${t.vigencia[1] ? ` até ${t.vigencia[1]}` : ''}</dd></div>
                            <div class="cf-row"><dt>Publicação</dt><dd class="font-semibold text-slate-900">${t.publicacao || '—'}</dd></div>
                            <div class="cf-row"><dt>Tributação regular</dt><dd class="font-semibold text-slate-900">${t.tributacaoRegular ? 'Sim' : 'Não'}</dd></div>
                            <div class="cf-row"><dt>Crédito presumido</dt><dd class="font-semibold text-slate-900">${t.creditoPresumido ? 'Permite' : 'Não'}</dd></div>
                        </dl>
                        ${t.dfe.length ? `<div><p class="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Documentos fiscais</p><ul class="flex flex-wrap gap-1.5">${t.dfe.map(x => `<li class="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">${escapeHTML(x)}</li>`).join('')}</ul></div>` : ''}
                        ${t.texto ? `<details class="rounded-lg border border-slate-200 bg-slate-50"><summary class="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">Texto legal</summary><p class="border-t border-slate-200 px-3 py-2 text-xs leading-relaxed whitespace-pre-line text-slate-700">${escapeHTML(t.texto)}</p></details>` : ''}
                        <div class="flex flex-wrap gap-2">
                            ${t.legislacao ? `<a href="${escapeHTML(t.legislacao)}" target="_blank" rel="noopener" class="cf-btn cf-btn-secondary py-2! text-sm"><i class="fa-solid fa-scale-balanced text-xs" aria-hidden="true"></i>Legislação<span class="sr-only"> (abre em nova aba)</span></a>` : ''}
                            ${t.qtdItens ? `<button type="button" class="cct-itens cf-btn cf-btn-soft py-2! text-sm" data-codigo="${t.codigo}" aria-expanded="false"><i class="fa-solid fa-list text-xs" aria-hidden="true"></i>Ver ${t.qtdItens} NCM/NBS do anexo</button>` : ''}
                        </div>
                        <div class="cct-itens-lista hidden"></div>
                    </div>
                </details>
            </li>`;
    }

    // NCM/NBS do anexo (carrega o arquivo de itens na primeira vez)
    listaEl.addEventListener('click', async e => {
        const b = e.target.closest('.cct-itens');
        if (!b) return;
        const alvo = b.parentElement.nextElementSibling;
        const aberto = b.getAttribute('aria-expanded') === 'true';
        if (aberto) { alvo.classList.add('hidden'); b.setAttribute('aria-expanded', 'false'); return; }
        b.setAttribute('aria-expanded', 'true');
        alvo.classList.remove('hidden');
        if (!alvo.dataset.carregado) {
            alvo.innerHTML = '<p class="text-xs text-slate-500">Carregando…</p>';
            await carregarItens();
            const lista = itens[b.dataset.codigo] || [];
            const LIMITE = 100;
            const linhas = l => l.map(([cod, tipo, desc]) => `<tr><td data-label="${tipo}" class="whitespace-nowrap font-semibold tabular-nums">${fmtCodigo(cod, tipo)}</td><td data-label="Tipo">${tipo}</td><td data-label="Descrição" class="cf-table-full">${escapeHTML(desc)}</td></tr>`).join('');
            alvo.innerHTML = `
                <div class="overflow-x-auto rounded-xl border border-slate-200 max-md:rounded-none max-md:border-0">
                    <table class="cf-table text-xs"><thead><tr><th scope="col">Código</th><th scope="col">Tipo</th><th scope="col">Descrição</th></tr></thead>
                    <tbody>${linhas(lista.slice(0, LIMITE))}</tbody></table>
                </div>
                ${lista.length > LIMITE ? `<button type="button" class="cct-mais mt-2 text-xs font-semibold text-blue-700 hover:underline">Mostrar todos os ${lista.length}</button>` : ''}`;
            alvo.querySelector('.cct-mais')?.addEventListener('click', ev => {
                alvo.querySelector('tbody').innerHTML = linhas(lista);
                ev.currentTarget.remove();
            });
            alvo.dataset.carregado = '1';
        }
    });
});
