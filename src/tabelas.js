// Tabelas Práticas (tabelas.html): índice das tabelas por área, com busca, filtro e salvar.
// Dados em tabelas.json: areas (ordem da lateral) e tabelas [{ id, titulo, area, link }] — link null = ainda sem página.
// Parâmetros: area, q, disponiveis=1. Tabelas salvas: chave savedTabelas (lateral, tabela.html e Meu Perfil).
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
    const listaEl = $('tab-lista');
    const areasEl = $('tab-areas');
    const buscaEl = $('tab-busca');
    const dispEl = $('tab-disponiveis');
    const resumoEl = $('tab-resumo');
    const limparBtn = $('tab-limpar');
    const salvasEl = $('tab-salvas');
    if (!listaEl) return;

    const ICONES = {
        'Trabalhista e Previdência': 'fa-people-group', 'Imposto de Renda': 'fa-coins', 'Federal': 'fa-landmark',
        'ICMS e Outros': 'fa-truck-fast', 'ISS e Outros': 'fa-city', 'IPI e Comércio Exterior': 'fa-ship', 'Índices e Taxas': 'fa-chart-line'
    };
    const icone = a => ICONES[a] || 'fa-table';
    const escapeHTML = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalizar = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    let dados = null;
    const p = new URLSearchParams(location.search);
    const estado = { area: p.get('area') || '', q: p.get('q') || '', disponiveis: p.get('disponiveis') === '1' };
    buscaEl.value = estado.q;
    dispEl.checked = estado.disponiveis;

    fetch('tabelas.json')
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(j => {
            dados = j;
            dados.tabelas.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
            if (!dados.areas.includes(estado.area)) estado.area = '';
            render();
            renderSalvas();
        })
        .catch(() => { listaEl.innerHTML = '<p class="text-red-600">Não foi possível carregar as tabelas.</p>'; });

    function filtradas(ignorarArea) {
        const termos = normalizar(estado.q).split(/\s+/).filter(Boolean);
        return dados.tabelas.filter(t =>
            (ignorarArea || !estado.area || t.area === estado.area) &&
            (!estado.disponiveis || t.link) &&
            termos.every(w => normalizar(`${t.titulo} ${t.area}`).includes(w)));
    }

    // --- Salvar (mesma chave em tabela.html e Meu Perfil) ---
    const SALVAS = 'savedTabelas';
    const lerSalvas = () => { try { const l = JSON.parse(localStorage.getItem(SALVAS)); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarSalvas = l => { try { localStorage.setItem(SALVAS, JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const salva = id => lerSalvas().some(s => s.id === id);
    const linkDe = t => t.link || `tabelas.html?q=${encodeURIComponent(t.titulo)}`;
    function botaoSalvar(t) {
        const on = salva(t.id);
        return `<button type="button" class="tab-salvar inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition ${on ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}" data-id="${escapeHTML(t.id)}" aria-pressed="${on}" aria-label="${on ? 'Remover dos salvos' : 'Salvar'}: ${escapeHTML(t.titulo)}" title="${on ? 'Remover das tabelas salvas' : 'Salvar tabela'}"><i class="${on ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i></button>`;
    }
    function alternarSalva(id) {
        const t = dados.tabelas.find(x => x.id === id);
        let l = lerSalvas();
        if (l.some(s => s.id === id)) l = l.filter(s => s.id !== id);
        else if (t) l.unshift({ id: t.id, title: t.titulo, link: linkDe(t), area: t.area, date: new Date().toLocaleDateString('pt-BR') });
        gravarSalvas(l);
        const atual = listaEl.querySelector(`.tab-salvar[data-id="${CSS.escape(id)}"]`);
        if (atual && t) { atual.outerHTML = botaoSalvar(t); listaEl.querySelector(`.tab-salvar[data-id="${CSS.escape(id)}"]`)?.focus(); }
        renderSalvas();
    }
    function renderSalvas() {
        const l = lerSalvas();
        salvasEl.innerHTML = l.length
            ? l.map(s => `
                <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                    <a href="${escapeHTML(s.link)}" class="min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}">
                        <span class="block truncate text-slate-700 group-hover:text-blue-800">${escapeHTML(s.title)}</span>
                        <span class="block text-[11px] text-slate-400">${escapeHTML(s.area || '')}</span>
                    </a>
                    <button type="button" class="tab-remover mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </li>`).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhuma tabela salva. Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> em cada tabela.</li>';
    }

    function render() {
        // Endereço compartilhável
        const url = new URL(location.href);
        estado.area ? url.searchParams.set('area', estado.area) : url.searchParams.delete('area');
        estado.q ? url.searchParams.set('q', estado.q) : url.searchParams.delete('q');
        estado.disponiveis ? url.searchParams.set('disponiveis', '1') : url.searchParams.delete('disponiveis');
        history.replaceState(null, '', url);

        // Áreas com contagem
        const base = filtradas(true);
        const linha = (valor, rotulo, n, ic) => {
            const on = estado.area === valor;
            return `<li><button type="button" data-area="${escapeHTML(valor)}" aria-pressed="${on}" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'} ${n === 0 && !on ? 'opacity-50' : ''}">
                <span class="flex min-w-0 items-center gap-2.5"><i class="fa-solid ${ic} w-4 shrink-0 text-center text-xs ${on ? 'text-blue-700' : 'text-slate-400'}" aria-hidden="true"></i><span class="leading-snug">${escapeHTML(rotulo)}</span></span>
                <span class="text-xs ${on ? 'text-blue-700' : 'text-slate-400'}">${n}</span>
            </button></li>`;
        };
        areasEl.innerHTML = linha('', 'Todas', base.length, 'fa-layer-group') + dados.areas.map(a => linha(a, a, base.filter(t => t.area === a).length, icone(a))).join('');

        const itens = filtradas(false);
        const disponiveis = itens.filter(t => t.link).length;
        limparBtn.classList.toggle('hidden', !(estado.area || estado.q || estado.disponiveis));
        resumoEl.textContent = `${itens.length} ${itens.length === 1 ? 'tabela' : 'tabelas'} · ${disponiveis} ${disponiveis === 1 ? 'disponível' : 'disponíveis'}`;

        if (!itens.length) {
            listaEl.innerHTML = `
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-regular fa-folder-open mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">Nenhuma tabela encontrada.</p>
                    <p class="mt-1 text-sm text-slate-500">Tente outro termo ou limpe os filtros.</p>
                </div>`;
            return;
        }
        // Agrupadas por área (na ordem das áreas)
        const grupos = dados.areas.map(a => ({ a, l: itens.filter(t => t.area === a) })).filter(g => g.l.length);
        listaEl.innerHTML = grupos.map(g => `
            <section class="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="area-${escapeHTML(g.a.replace(/\W+/g, '-'))}">
                <h2 id="area-${escapeHTML(g.a.replace(/\W+/g, '-'))}" class="flex items-center gap-3 border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">
                    <span class="inline-flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><i class="fa-solid ${icone(g.a)} text-sm" aria-hidden="true"></i></span>
                    ${escapeHTML(g.a)} <span class="text-xs font-normal text-slate-500">${g.l.length}</span>
                </h2>
                <ul class="divide-y divide-slate-100">${g.l.map(t => `
                    <li class="flex items-center gap-3 px-5 py-2.5">
                        <div class="min-w-0 flex-1">
                            ${t.link
                                ? `<a href="${escapeHTML(t.link)}" class="font-medium text-slate-800 hover:text-blue-800 hover:underline">${escapeHTML(t.titulo)}</a>`
                                : `<span class="text-slate-600">${escapeHTML(t.titulo)}</span>`}
                        </div>
                        ${t.link
                            ? `<a href="${escapeHTML(t.link)}" class="hidden shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline sm:inline-flex" tabindex="-1" aria-hidden="true">Ver tabela <i class="fa-solid fa-arrow-right text-[10px]"></i></a>`
                            : '<span class="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Em breve</span>'}
                        ${botaoSalvar(t)}
                    </li>`).join('')}
                </ul>
            </section>`).join('');
    }

    // --- Eventos ---
    const setEstado = m => { Object.assign(estado, m); render(); };
    areasEl.addEventListener('click', e => { const b = e.target.closest('[data-area]'); if (b) setEstado({ area: b.dataset.area }); });
    listaEl.addEventListener('click', e => { const b = e.target.closest('.tab-salvar'); if (b) alternarSalva(b.dataset.id); });
    salvasEl.addEventListener('click', e => { const b = e.target.closest('.tab-remover'); if (b) alternarSalva(b.dataset.id); });
    let timer = null;
    buscaEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => setEstado({ q: buscaEl.value.trim() }), 150); });
    dispEl.addEventListener('change', () => setEstado({ disponiveis: dispEl.checked }));
    limparBtn.addEventListener('click', () => { buscaEl.value = ''; dispEl.checked = false; setEstado({ area: '', q: '', disponiveis: false }); });
});
