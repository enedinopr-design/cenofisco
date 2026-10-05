// Página de Legislação: federal, estadual e municipal.
// Dados em legislacao.json (também lido pela home e por detail.html) — campos: id, type (federal|estadual|municipal),
// estado (UF), municipio, title, summary, date (DD/MM/AAAA), area (órgão/área), tipo_de_publicacao, link.
// Filtros: esfera (abas), busca, UF, município, tipo de publicação (lateral), órgão/área, período e ordenação.
// O estado dos filtros fica no endereço (ex.: legislacao.html?esfera=estadual&uf=PR&tipo=DECRETO).
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
    const listEl = $('legislacao-articles');
    if (!listEl) return;
    const searchInput = $('leg-search');
    const ufSelect = $('leg-uf');
    const ufWrap = $('uf-wrap');
    const munSelect = $('leg-municipio');
    const munWrap = $('municipio-wrap');
    const areaSelect = $('leg-area');
    const deInput = $('leg-de');
    const ateInput = $('leg-ate');
    const orderSelect = $('leg-ordem');
    const maisFiltros = $('mais-filtros');
    const tabsEl = $('esfera-tabs');
    const statsEl = $('esfera-stats');
    const tipoList = $('tipo-filters');
    const resultCount = $('result-count');
    const clearBtn = $('clear-filters');
    const pagination = $('pagination-container');
    const savedList = $('saved-list');
    const recentList = $('recently-accessed-list');

    const PER_PAGE = 10;
    const UFS = {
        AC: ['Acre', 'acre'], AL: ['Alagoas', 'alagoas'], AP: ['Amapá', 'amapa'], AM: ['Amazonas', 'amazonas'],
        BA: ['Bahia', 'bahia'], CE: ['Ceará', 'ceara'], DF: ['Distrito Federal', 'df'], ES: ['Espírito Santo', 'espiritosanto'],
        GO: ['Goiás', 'goias'], MA: ['Maranhão', 'maranhao'], MT: ['Mato Grosso', 'matogrosso'], MS: ['Mato Grosso do Sul', 'matogrossodosul'],
        MG: ['Minas Gerais', 'minasgerais'], PA: ['Pará', 'para'], PB: ['Paraíba', 'paraiba'], PR: ['Paraná', 'parana'],
        PE: ['Pernambuco', 'pernambuco'], PI: ['Piauí', 'piaui'], RJ: ['Rio de Janeiro', 'riodejaneiro'], RN: ['Rio Grande do Norte', 'riograndedonorte'],
        RS: ['Rio Grande do Sul', 'riograndedosul'], RO: ['Rondônia', 'rondonia'], RR: ['Roraima', 'roraima'], SC: ['Santa Catarina', 'santacatarina'],
        SP: ['São Paulo', 'saopaulo'], SE: ['Sergipe', 'sergipe'], TO: ['Tocantins', 'tocantins']
    };
    const ufName = uf => UFS[uf]?.[0] || uf;
    const flag = uf => (UFS[uf] ? `img/bandeiras/${UFS[uf][1]}.png` : 'img/bandeiras/brasil.png');

    const ESFERAS = [
        { id: 'todos', label: 'Todos' },
        { id: 'federal', label: 'Federal', plural: 'Federais', badge: 'bg-blue-50 text-blue-700' },
        { id: 'estadual', label: 'Estadual', plural: 'Estaduais', badge: 'bg-emerald-50 text-emerald-700' },
        { id: 'municipal', label: 'Municipal', plural: 'Municipais', badge: 'bg-orange-50 text-orange-700' }
    ];
    const esferaOf = id => ESFERAS.find(e => e.id === id) || ESFERAS[1];

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const isoDate = d => (d ? d.split('/').reverse().join('-') : '');
    const clean = s => (s || '').trim();
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
    const state = { esfera: 'todos', uf: '', municipio: '', tipo: '', area: '', de: '', ate: '', ordem: 'recentes', q: '', pagina: 1 };

    fetch('./legislacao.json')
        .then(r => r.json())
        .then(data => {
            all = data.map(l => ({
                ...l,
                type: l.type || 'federal',
                area: clean(l.area),
                tipo_de_publicacao: clean(l.tipo_de_publicacao),
                _iso: isoDate(l.date),
                _search: normalize([l.title, l.summary, l.area, l.tipo_de_publicacao, l.municipio, l.estado, ufName(l.estado)].join(' '))
            }));
            readParams();
            buildSelects();
            render();
            renderSaved();
            renderRecent();
        })
        .catch(error => {
            console.error('Erro ao carregar legislação:', error);
            listEl.innerHTML = '<p class="text-red-600">Não foi possível carregar a legislação.</p>';
        });

    // --- Endereço (filtros) ---
    const PARAMS = ['esfera', 'uf', 'municipio', 'tipo', 'area', 'de', 'ate', 'ordem', 'q', 'pagina'];
    function readParams() {
        const p = new URLSearchParams(location.search);
        PARAMS.forEach(k => { if (p.get(k)) state[k] = p.get(k); });
        if (!ESFERAS.some(e => e.id === state.esfera)) state.esfera = 'todos';
        state.uf = UFS[state.uf.toUpperCase()] ? state.uf.toUpperCase() : '';
        state.pagina = Math.max(1, parseInt(state.pagina, 10) || 1);
        searchInput.value = state.q;
        deInput.value = state.de;
        ateInput.value = state.ate;
        orderSelect.value = state.ordem;
        if (state.area || state.de || state.ate || state.ordem !== 'recentes') maisFiltros.open = true;
    }
    function writeParams() {
        const p = new URLSearchParams();
        const defaults = { esfera: 'todos', ordem: 'recentes', pagina: 1 };
        PARAMS.forEach(k => { if (state[k] && String(state[k]) !== String(defaults[k] ?? '')) p.set(k, state[k]); });
        const qs = p.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    function buildSelects() {
        ufSelect.innerHTML = '<option value="">Todos os estados</option>' + Object.keys(UFS)
            .sort((a, b) => ufName(a).localeCompare(ufName(b), 'pt-BR'))
            .map(uf => `<option value="${uf}">${escapeHTML(ufName(uf))} (${uf})</option>`).join('');
        ufSelect.value = state.uf;
        const areas = [...new Set(all.map(l => l.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        areaSelect.innerHTML = '<option value="">Todos</option>' + areas.map(a => `<option value="${escapeHTML(a)}">${escapeHTML(a)}</option>`).join('');
        areaSelect.value = state.area;
        buildMunicipios();
    }

    // Município: aparece quando há UF escolhida e a esfera não é só federal/estadual
    function buildMunicipios() {
        const show = state.uf && (state.esfera === 'todos' || state.esfera === 'municipal');
        munWrap.classList.toggle('hidden', !show);
        if (!show) { state.municipio = ''; return; }
        const muns = [...new Set(all.filter(l => l.type === 'municipal' && l.estado === state.uf).map(l => l.municipio).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        munSelect.innerHTML = `<option value="">${muns.length ? 'Todos os municípios' : 'Nenhum município com publicações'}</option>` +
            muns.map(m => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`).join('');
        if (!muns.includes(state.municipio)) state.municipio = '';
        munSelect.value = state.municipio;
    }

    // Filtra ignorando um dos filtros (para as contagens das abas e dos tipos)
    function filter(except) {
        const terms = normalize(state.q.trim()).split(/\s+/).filter(Boolean);
        return all.filter(l =>
            (except === 'esfera' || state.esfera === 'todos' || l.type === state.esfera) &&
            (!state.uf || l.type === 'federal' || l.estado === state.uf) &&
            (!state.municipio || l.municipio === state.municipio) &&
            (except === 'tipo' || !state.tipo || l.tipo_de_publicacao === state.tipo) &&
            (!state.area || l.area === state.area) &&
            (!state.de || l._iso >= state.de) &&
            (!state.ate || l._iso <= state.ate) &&
            terms.every(t => l._search.includes(t))
        );
    }

    // --- Renderização ---
    function render() {
        const items = filter().sort((a, b) =>
            state.ordem === 'az' ? a.title.localeCompare(b.title, 'pt-BR')
                : state.ordem === 'antigas' ? a._iso.localeCompare(b._iso)
                    : b._iso.localeCompare(a._iso));

        ufWrap.classList.toggle('hidden', state.esfera === 'federal');
        renderStats();
        renderTabs();
        renderTipos();

        const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
        state.pagina = Math.min(state.pagina, pages);
        const active = state.esfera !== 'todos' || state.uf || state.tipo || state.area || state.de || state.ate || state.q;
        clearBtn.classList.toggle('hidden', !active);
        const where = state.municipio ? ` · ${state.municipio}/${state.uf}` : state.uf ? ` · ${ufName(state.uf)}` : '';
        resultCount.textContent = items.length
            ? `${items.length} ${items.length === 1 ? 'publicação' : 'publicações'}${where}`
            : '';

        if (!items.length) {
            listEl.innerHTML = `
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-regular fa-folder-open mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">Nenhuma publicação encontrada.</p>
                    <p class="mt-1 text-sm text-slate-500">Tente outro termo, outro período ou limpe os filtros.</p>
                </div>`;
            pagination.innerHTML = '';
            writeParams();
            return;
        }

        const start = (state.pagina - 1) * PER_PAGE;
        listEl.innerHTML = items.slice(start, start + PER_PAGE).map(card).join('');
        renderPagination(pages);
        writeParams();
    }

    function card(l) {
        const e = esferaOf(l.type);
        const saved = isSaved(l.id);
        const place = l.type === 'estadual' ? ufName(l.estado)
            : l.type === 'municipal' ? `${l.municipio}/${l.estado}` : '';
        const placeHtml = l.type === 'federal'
            ? ''
            : `<span class="inline-flex items-center gap-1.5 text-xs text-slate-500"><img src="${flag(l.estado)}" alt="" loading="lazy" class="h-3 w-4.5 rounded-sm object-cover ring-1 ring-slate-200">${escapeHTML(place)}</span>`;
        const meta = [`Publicado em ${l.date}`, l.area].filter(Boolean).map(escapeHTML).join('<span class="text-slate-300" aria-hidden="true">·</span>');
        return `
            <article class="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md">
                <div class="flex flex-wrap items-center gap-2 pr-10">
                    <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${e.badge}">${escapeHTML(e.label)}</span>
                    ${l.tipo_de_publicacao ? `<span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">${escapeHTML(l.tipo_de_publicacao)}</span>` : ''}
                    ${placeHtml}
                </div>
                <h2 class="mt-2 pr-10 leading-snug font-semibold text-slate-900">
                    <a href="${escapeHTML(l.link || '#')}" data-id="${escapeHTML(l.id)}" class="leg-link after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(l.title)}</a>
                </h2>
                <p class="mt-1 line-clamp-3 text-sm text-slate-600">${escapeHTML(l.summary)}</p>
                <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">${meta}</p>
                <button type="button" class="save-btn absolute top-4 right-4 z-10 inline-flex size-9 cursor-pointer items-center justify-center rounded-lg transition ${saved ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}" data-id="${escapeHTML(l.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remover dos salvos' : 'Salvar'}: ${escapeHTML(l.title)}" title="${saved ? 'Remover das legislações salvas' : 'Salvar legislação'}">
                    <i class="${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i>
                </button>
            </article>`;
    }

    function renderStats() {
        statsEl.innerHTML = ESFERAS.slice(1).map(e => {
            const n = all.filter(l => l.type === e.id).length;
            const on = state.esfera === e.id;
            return `
                <button type="button" data-esfera="${e.id}" class="cursor-pointer rounded-xl px-4 py-3 text-left ring-1 transition ${on ? 'bg-white text-blue-950 ring-white' : 'bg-white/5 ring-white/15 hover:bg-white/10'}" aria-pressed="${on}">
                    <span class="block text-2xl font-bold">${n}</span>
                    <span class="block text-xs ${on ? 'text-slate-500' : 'text-blue-100'}">${e.plural}</span>
                </button>`;
        }).join('');
    }

    function renderTabs() {
        const base = filter('esfera');
        tabsEl.innerHTML = ESFERAS.map(e => {
            const n = e.id === 'todos' ? base.length : base.filter(l => l.type === e.id).length;
            const on = state.esfera === e.id;
            return `<button type="button" role="tab" aria-selected="${on}" data-esfera="${e.id}" class="tab-button ${on ? 'active' : ''}">${e.label} <span class="ml-1 rounded-full ${on ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'} px-1.5 py-0.5 text-[11px]">${n}</span></button>`;
        }).join('');
    }

    function renderTipos() {
        const base = filter('tipo');
        const tipos = [...new Set(all.map(l => l.tipo_de_publicacao).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const label = t => t.charAt(0) + t.slice(1).toLowerCase();
        const row = (value, text, n) => {
            const on = state.tipo === value;
            return `<li><button type="button" data-tipo="${escapeHTML(value)}" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'} ${n === 0 && !on ? 'opacity-40' : ''}" aria-pressed="${on}">
                <span>${escapeHTML(text)}</span><span class="text-xs ${on ? 'text-blue-700' : 'text-slate-400'}">${n}</span>
            </button></li>`;
        };
        tipoList.innerHTML = row('', 'Todos', base.length) + tipos.map(t => row(t, label(t), base.filter(l => l.tipo_de_publicacao === t).length)).join('');
    }

    function renderPagination(pages) {
        if (pages <= 1) { pagination.innerHTML = ''; return; }
        const btn = (label, page, { current = false, disabled = false, aria = '' } = {}) =>
            `<button type="button" data-page="${page}" ${disabled ? 'disabled' : ''} ${current ? 'aria-current="page"' : ''} ${aria ? `aria-label="${aria}"` : ''}
                class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${current ? 'bg-blue-900 text-white' : disabled ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer text-slate-600 hover:bg-white hover:text-blue-800'}">${label}</button>`;
        let html = btn('<i class="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>', state.pagina - 1, { disabled: state.pagina === 1, aria: 'Página anterior' });
        const shown = [...new Set([1, pages, state.pagina - 1, state.pagina, state.pagina + 1])]
            .filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
        shown.forEach((n, i) => {
            const gap = i > 0 ? n - shown[i - 1] : 1;
            if (gap === 2) html += btn(n - 1, n - 1);
            else if (gap > 2) html += '<span class="px-1 text-slate-400" aria-hidden="true">…</span>';
            html += btn(n, n, { current: n === state.pagina });
        });
        html += btn('<i class="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>', state.pagina + 1, { disabled: state.pagina === pages, aria: 'Próxima página' });
        pagination.innerHTML = html;
    }

    // --- Legislações salvas ---
    const SAVED_KEY = 'savedLegislacao';
    const isSaved = id => readList(SAVED_KEY).some(s => s.id === id);
    function toggleSaved(id) {
        const l = all.find(x => x.id === id);
        if (!l) return;
        let list = readList(SAVED_KEY);
        if (list.some(s => s.id === id)) list = list.filter(s => s.id !== id);
        else list.unshift({ id: l.id, title: l.title, link: l.link, date: l.date, type: l.type, estado: l.estado || '', municipio: l.municipio || '' });
        writeList(SAVED_KEY, list);
        render();
        renderSaved();
    }
    function sideItem(s, removeClass) {
        const where = s.type === 'estadual' ? s.estado : s.type === 'municipal' ? `${s.municipio || ''}/${s.estado}` : s.type === 'federal' ? 'Federal' : '';
        return `
            <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                <a href="${escapeHTML(s.link || '#')}" class="min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}">
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${escapeHTML(s.title)}</span>
                    <span class="block text-[11px] text-slate-400">${escapeHTML([where, s.date].filter(Boolean).join(' · '))}</span>
                </a>
                ${removeClass ? `<button type="button" class="${removeClass} mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` : ''}
            </li>`;
    }
    function renderSaved() {
        const list = readList(SAVED_KEY);
        savedList.innerHTML = list.length
            ? list.map(s => sideItem(s, 'remove-saved')).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhuma legislação salva. Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> em cada publicação.</li>';
    }

    // --- Acessadas recentemente (chave recentlyAccessed, compartilhada com a home; máx. 5) ---
    function addRecent(l) {
        const list = readList('recentlyAccessed').filter(i => i.title !== l.title);
        list.unshift({ title: l.title, date: l.date, link: l.link });
        writeList('recentlyAccessed', list.slice(0, 5));
    }
    function renderRecent() {
        const list = readList('recentlyAccessed');
        recentList.innerHTML = list.length
            ? list.map(r => {
                const l = all.find(x => x.title === r.title);
                return sideItem({ ...r, type: l?.type, estado: l?.estado, municipio: l?.municipio }, '');
            }).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhuma legislação acessada recentemente.</li>';
    }

    // --- Eventos ---
    const setState = changes => { Object.assign(state, { pagina: 1 }, changes); buildMunicipios(); render(); };

    tabsEl.addEventListener('click', e => {
        const b = e.target.closest('[data-esfera]');
        if (b) setState({ esfera: b.dataset.esfera });
    });
    statsEl.addEventListener('click', e => {
        const b = e.target.closest('[data-esfera]');
        if (b) setState({ esfera: state.esfera === b.dataset.esfera ? 'todos' : b.dataset.esfera });
    });
    tipoList.addEventListener('click', e => {
        const b = e.target.closest('[data-tipo]');
        if (b) setState({ tipo: b.dataset.tipo });
    });
    ufSelect.addEventListener('change', () => setState({ uf: ufSelect.value, municipio: '' }));
    munSelect.addEventListener('change', () => setState({ municipio: munSelect.value }));
    areaSelect.addEventListener('change', () => setState({ area: areaSelect.value }));
    deInput.addEventListener('change', () => setState({ de: deInput.value }));
    ateInput.addEventListener('change', () => setState({ ate: ateInput.value }));
    orderSelect.addEventListener('change', () => setState({ ordem: orderSelect.value }));
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => setState({ q: searchInput.value }), 150);
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = ''; ufSelect.value = ''; areaSelect.value = ''; deInput.value = ''; ateInput.value = '';
        setState({ esfera: 'todos', uf: '', municipio: '', tipo: '', area: '', de: '', ate: '', q: '' });
    });
    pagination.addEventListener('click', e => {
        const b = e.target.closest('[data-page]');
        if (!b || b.disabled) return;
        state.pagina = Number(b.dataset.page);
        render();
        listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    listEl.addEventListener('click', e => {
        const save = e.target.closest('.save-btn');
        if (save) {
            e.preventDefault();
            toggleSaved(save.dataset.id);
            return;
        }
        const link = e.target.closest('a.leg-link');
        if (link) {
            const l = all.find(x => x.id === link.dataset.id);
            if (l) addRecent(l);
        }
    });
    savedList.addEventListener('click', e => {
        const b = e.target.closest('.remove-saved');
        if (!b) return;
        writeList(SAVED_KEY, readList(SAVED_KEY).filter(s => s.id !== b.dataset.id));
        render();
        renderSaved();
    });
});
