// Página de Ferramentas (aplicativos de cálculo)
// Dados em aplicativos.json — campos: id, categoria, title, icon (Font Awesome), link (vazio = "Em breve").
// Filtros: categoria (abas) e busca; o estado fica no endereço (ex.: aplicativos.html?categoria=Federal&q=irpf).
// Lateral: "Aplicativos Salvos" (favoritos, como em Regulamentos/Procedimentos) e "Meus Cálculos"
// (cálculos salvos nas páginas dos aplicativos, chave meusCalculos).
// "Usados recentemente" usa a chave savedCalculations, a mesma lida pelas páginas de Cálculo de Férias.
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

    const resultsEl = document.getElementById('app-results');
    const searchInput = document.getElementById('app-search');
    const tabsEl = document.getElementById('categoria-tabs');
    const statsEl = document.getElementById('categoria-stats');
    const resultCount = document.getElementById('result-count');
    const clearBtn = document.getElementById('clear-filters');
    const savedList = document.getElementById('saved-apps-list');
    const calcList = document.getElementById('meus-calculos-list');
    const recentesBox = document.getElementById('recentes');
    const recentesList = document.getElementById('recentes-list');
    if (!resultsEl) return;

    const CATEGORIAS = [
        { id: 'Trabalhista/Previdenciário', label: 'Trabalhista e Previdenciário', short: 'Trabalhista', icon: 'fa-people-group', tone: 'bg-orange-50 text-orange-600' },
        { id: 'Federal', label: 'Federal', short: 'Federal', icon: 'fa-landmark', tone: 'bg-blue-50 text-blue-700' },
        { id: 'Estadual', label: 'Estadual', short: 'Estadual', icon: 'fa-map', tone: 'bg-emerald-50 text-emerald-700' },
        { id: 'Municipal', label: 'Municipal', short: 'Municipal', icon: 'fa-city', tone: 'bg-amber-50 text-amber-700' }
    ];
    const catOf = id => CATEGORIAS.find(c => c.id === id) || { label: id, short: id, icon: 'fa-calculator', tone: 'bg-slate-100 text-slate-600' };

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const readList = key => {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    };
    const writeList = (key, list) => {
        try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* sem armazenamento */ }
    };

    let all = [];
    const state = { categoria: '', q: '' };

    fetch('./aplicativos.json')
        .then(r => r.json())
        .then(data => {
            all = data.map(a => ({ ...a, _search: normalize(`${a.title} ${a.categoria}`) }));
            readParams();
            render();
            renderSaved();
            renderCalculos();
        })
        .catch(error => {
            console.error('Erro ao carregar aplicativos:', error);
            resultsEl.innerHTML = '<p class="text-red-600">Não foi possível carregar os aplicativos.</p>';
        });

    // --- Endereço (filtros) ---
    function readParams() {
        const p = new URLSearchParams(location.search);
        if (CATEGORIAS.some(c => c.id === p.get('categoria'))) state.categoria = p.get('categoria');
        state.q = p.get('q') || '';
        searchInput.value = state.q;
    }
    function writeParams() {
        const p = new URLSearchParams();
        if (state.categoria) p.set('categoria', state.categoria);
        if (state.q) p.set('q', state.q);
        const qs = p.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    function filter(ignoreCategoria) {
        const terms = normalize(state.q.trim()).split(/\s+/).filter(Boolean);
        return all.filter(a =>
            (ignoreCategoria || !state.categoria || a.categoria === state.categoria) &&
            terms.every(t => a._search.includes(t))
        );
    }

    // --- Renderização ---
    function render() {
        const items = filter();
        renderStats();
        renderTabs();
        renderRecentes();

        clearBtn.classList.toggle('hidden', !(state.categoria || state.q));
        const available = items.filter(a => a.link).length;
        resultCount.textContent = items.length
            ? `${items.length} ${items.length === 1 ? 'aplicativo' : 'aplicativos'} · ${available} ${available === 1 ? 'disponível' : 'disponíveis'}`
            : '';

        if (!items.length) {
            resultsEl.innerHTML = `
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-solid fa-magnifying-glass mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">Nenhum aplicativo encontrado.</p>
                    <p class="mt-1 text-sm text-slate-500">Tente outro termo ou limpe os filtros.</p>
                </div>`;
            writeParams();
            return;
        }

        resultsEl.innerHTML = CATEGORIAS
            .map(c => ({ ...c, items: items.filter(a => a.categoria === c.id) }))
            .filter(g => g.items.length)
            .map(g => `
                <section aria-labelledby="grupo-${escapeHTML(g.short)}">
                    <h2 id="grupo-${escapeHTML(g.short)}" class="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                        <i class="fa-solid ${g.icon} text-slate-400" aria-hidden="true"></i>${escapeHTML(g.label)}
                        <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">${g.items.length}</span>
                    </h2>
                    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${g.items.map(card).join('')}</div>
                </section>`).join('');
        writeParams();
    }

    function card(a) {
        const c = catOf(a.categoria);
        const available = Boolean(a.link);
        const saved = isSaved(a.id);
        return `
            <article class="group relative flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition ${available ? 'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md' : ''}">
                <span class="inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-lg transition ${available ? 'bg-blue-950 text-amber-400' : c.tone}"><i class="fa-solid ${escapeHTML(a.icon)}" aria-hidden="true"></i></span>
                <div class="min-w-0 flex-1 pr-7">
                    <h3 class="leading-snug font-semibold text-slate-900">
                        ${available
                            ? `<a href="${escapeHTML(a.link)}" data-app="${escapeHTML(a.id)}" class="app-link after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(a.title)}</a>`
                            : escapeHTML(a.title)}
                    </h3>
                    <p class="mt-1 text-xs font-medium">
                        ${available
                            ? '<span class="inline-flex items-center gap-1.5 text-emerald-700"><span class="size-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>Disponível</span>'
                            : '<span class="inline-flex items-center gap-1.5 text-slate-400"><i class="fa-regular fa-clock" aria-hidden="true"></i>Em breve</span>'}
                    </p>
                </div>
                <button type="button" class="save-btn absolute top-2 right-2 z-10 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg transition ${saved ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}" data-id="${escapeHTML(a.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remover dos salvos' : 'Salvar'}: ${escapeHTML(a.title)}" title="${saved ? 'Remover dos aplicativos salvos' : 'Salvar aplicativo'}">
                    <i class="${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i>
                </button>
            </article>`;
    }

    function renderStats() {
        if (!statsEl) return;
        statsEl.innerHTML = CATEGORIAS.map(c => {
            const n = all.filter(a => a.categoria === c.id).length;
            const on = state.categoria === c.id;
            return `
                <button type="button" data-categoria="${escapeHTML(c.id)}" class="cursor-pointer rounded-xl px-4 py-3 text-left ring-1 transition ${on ? 'bg-white text-blue-950 ring-white' : 'bg-white/5 ring-white/15 hover:bg-white/10'}" aria-pressed="${on}">
                    <span class="block text-2xl font-bold">${n}</span>
                    <span class="block text-xs ${on ? 'text-slate-500' : 'text-blue-100'}">${escapeHTML(c.short)}</span>
                </button>`;
        }).join('');
    }

    function renderTabs() {
        const base = filter(true);
        const tabs = [{ id: '', short: 'Todos' }, ...CATEGORIAS];
        tabsEl.innerHTML = tabs.map(c => {
            const n = c.id ? base.filter(a => a.categoria === c.id).length : base.length;
            const on = state.categoria === c.id;
            return `<button type="button" role="tab" aria-selected="${on}" data-categoria="${escapeHTML(c.id)}" class="tab-button ${on ? 'active' : ''}">${escapeHTML(c.short)} <span class="ml-1 rounded-full ${on ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'} px-1.5 py-0.5 text-[11px]">${n}</span></button>`;
        }).join('');
    }

    // --- Usados recentemente (savedCalculations, máx. 5) ---
    function addRecente(app) {
        const list = readList('savedCalculations').filter(i => i.title !== app.title);
        list.unshift({ title: app.title, link: app.link });
        writeList('savedCalculations', list.slice(0, 5));
    }
    function renderRecentes() {
        const list = readList('savedCalculations').filter(r => r.link && r.link !== '#');
        recentesBox.classList.toggle('hidden', !list.length || Boolean(state.q));
        recentesList.innerHTML = list.map(r => {
            const app = all.find(a => a.title === r.title);
            return `<a href="${escapeHTML(r.link)}" class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-800">
                <i class="fa-solid ${escapeHTML(app?.icon || 'fa-calculator')} text-xs text-blue-700" aria-hidden="true"></i>${escapeHTML(r.title)}</a>`;
        }).join('');
    }

    // --- Aplicativos salvos (favoritos) ---
    const SAVED_KEY = 'savedAplicativos';
    const isSaved = id => readList(SAVED_KEY).some(s => s.id === id);
    function toggleSaved(id) {
        const a = all.find(x => x.id === id);
        if (!a) return;
        let list = readList(SAVED_KEY);
        if (list.some(s => s.id === id)) list = list.filter(s => s.id !== id);
        else list.unshift({ id: a.id, title: a.title, link: a.link, icon: a.icon });
        writeList(SAVED_KEY, list);
        render();
        renderSaved();
    }
    function renderSaved() {
        const list = readList(SAVED_KEY);
        if (!list.length) {
            savedList.innerHTML = '<li class="px-1 text-xs text-slate-500">Nenhum aplicativo salvo. Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> nos cartões.</li>';
            return;
        }
        savedList.innerHTML = list.map(s => `
            <li class="group flex items-center gap-1 rounded-lg hover:bg-blue-50">
                ${s.link
                    ? `<a href="${escapeHTML(s.link)}" data-app="${escapeHTML(s.id)}" class="app-link min-w-0 flex-1 truncate px-2 py-1.5 text-slate-700 group-hover:text-blue-800" title="${escapeHTML(s.title)}"><i class="fa-solid ${escapeHTML(s.icon || 'fa-calculator')} mr-2 w-4 text-center text-xs text-slate-400" aria-hidden="true"></i>${escapeHTML(s.title)}</a>`
                    : `<span class="min-w-0 flex-1 truncate px-2 py-1.5 text-slate-500" title="${escapeHTML(s.title)} (em breve)"><i class="fa-regular fa-clock mr-2 w-4 text-center text-xs text-slate-300" aria-hidden="true"></i>${escapeHTML(s.title)}</span>`}
                <button type="button" class="remove-saved inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </li>`).join('');
    }

    // --- Meus cálculos (salvos nas páginas dos aplicativos) ---
    function renderCalculos() {
        const list = readList('meusCalculos');
        if (!list.length) {
            calcList.innerHTML = '<li class="px-1 text-xs text-slate-500">Nenhum cálculo salvo. Use "Salvar" no resultado de um aplicativo.</li>';
            return;
        }
        calcList.innerHTML = list.slice(0, 8).map(c => {
            const app = all.find(a => a.title === c.tipo);
            const total = c.resultados?.totalLiquido;
            return `
                <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                    <a href="${escapeHTML(c.link || app?.link || '#')}" class="min-w-0 flex-1 px-2 py-1.5">
                        <span class="block truncate text-slate-700 group-hover:text-blue-800">${escapeHTML(c.tipo || 'Cálculo')}</span>
                        <span class="block text-[11px] text-slate-400">${escapeHTML([c.dataSalvo, total ? `Líquido ${total}` : ''].filter(Boolean).join(' · '))}</span>
                    </a>
                    <button type="button" class="remove-calc mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(c.id)}" aria-label="Remover cálculo de ${escapeHTML(c.dataSalvo || '')}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </li>`;
        }).join('') + (list.length > 8 ? `<li class="px-2 pt-1 text-xs text-slate-400">+ ${list.length - 8} cálculos salvos</li>` : '');
    }

    // --- Eventos ---
    const setState = changes => { Object.assign(state, changes); render(); };

    tabsEl.addEventListener('click', e => {
        const b = e.target.closest('[data-categoria]');
        if (b) setState({ categoria: b.dataset.categoria });
    });
    statsEl?.addEventListener('click', e => {
        const b = e.target.closest('[data-categoria]');
        if (b) setState({ categoria: state.categoria === b.dataset.categoria ? '' : b.dataset.categoria });
    });
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => setState({ q: searchInput.value }), 120);
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        setState({ categoria: '', q: '' });
    });

    // Abrir um aplicativo registra em "Usados recentemente"
    document.addEventListener('click', e => {
        const link = e.target.closest('a.app-link[data-app]');
        if (!link) return;
        const app = all.find(a => a.id === link.dataset.app);
        if (app?.link) addRecente(app);
    });

    resultsEl.addEventListener('click', e => {
        const b = e.target.closest('.save-btn');
        if (b) {
            e.preventDefault();
            toggleSaved(b.dataset.id);
        }
    });
    savedList.addEventListener('click', e => {
        const b = e.target.closest('.remove-saved');
        if (!b) return;
        writeList(SAVED_KEY, readList(SAVED_KEY).filter(s => s.id !== b.dataset.id));
        render();
        renderSaved();
    });
    calcList.addEventListener('click', e => {
        const b = e.target.closest('.remove-calc');
        if (b) {
            writeList('meusCalculos', readList('meusCalculos').filter(c => c.id !== b.dataset.id));
            renderCalculos();
            return;
        }
        if (e.target.closest('a[href="#"]')) e.preventDefault();
    });
});
