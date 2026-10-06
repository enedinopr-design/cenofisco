// Página de Notícias
// Dados em noticias.json — campos: id, area, date (DD/MM/AAAA), title, summary, link (image não é exibida).
// Filtros: área (lateral), busca, período e ordenação; o estado fica no endereço
// (ex.: noticias.html?area=Trabalhista&q=nr-1).
// "Salvar" funciona como em Regulamentos/Procedimentos/Legislação (lista "Notícias Salvas").
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
    const listEl = $('noticias-list');
    if (!listEl) return;
    const searchInput = $('noticia-search');
    const fromInput = $('date-from');
    const toInput = $('date-to');
    const orderSelect = $('noticia-ordem');
    const maisFiltros = $('mais-filtros');
    const areaList = $('area-filters');
    const resultCount = $('result-count');
    const clearBtn = $('clear-filters');
    const pagination = $('pagination-container');
    const savedList = $('saved-list');

    const PER_PAGE = 10;
    const AREA_STYLE = {
        'Tributário': { badge: 'bg-emerald-50 text-emerald-700', icon: 'fa-coins' },
        'Trabalhista': { badge: 'bg-orange-50 text-orange-700', icon: 'fa-people-group' },
        'Federal': { badge: 'bg-blue-50 text-blue-700', icon: 'fa-landmark' },
        'Previdenciário': { badge: 'bg-violet-50 text-violet-700', icon: 'fa-shield-halved' }
    };
    const styleOf = area => AREA_STYLE[area] || { badge: 'bg-slate-100 text-slate-700', icon: 'fa-newspaper' };

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const isoDate = d => (d ? d.split('/').reverse().join('-') : '');
    // Endereço da notícia (o link do JSON, ou a página de detalhe pelo id)
    const urlOf = n => (n.link && n.link !== '#' ? n.link : `noticia.html?id=${encodeURIComponent(n.id)}`);
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
    const state = { area: '', q: '', de: '', ate: '', ordem: 'recentes', pagina: 1 };

    fetch('./noticias.json')
        .then(r => r.json())
        .then(data => {
            all = data.map(n => ({ ...n, _iso: isoDate(n.date), _search: normalize(`${n.title} ${n.summary} ${n.area}`) }));
            readParams();
            render();
            renderSaved();
        })
        .catch(error => {
            console.error('Erro ao carregar notícias:', error);
            listEl.innerHTML = '<p class="text-red-600">Não foi possível carregar as notícias.</p>';
        });

    // --- Endereço (filtros) ---
    const PARAMS = ['area', 'q', 'de', 'ate', 'ordem', 'pagina'];
    function readParams() {
        const p = new URLSearchParams(location.search);
        PARAMS.forEach(k => { if (p.get(k)) state[k] = p.get(k); });
        state.ordem = state.ordem === 'antigas' ? 'antigas' : 'recentes';
        state.pagina = Math.max(1, parseInt(state.pagina, 10) || 1);
        searchInput.value = state.q;
        fromInput.value = state.de;
        toInput.value = state.ate;
        orderSelect.value = state.ordem;
        if (state.de || state.ate || state.ordem !== 'recentes') maisFiltros.open = true;
    }
    function writeParams() {
        const p = new URLSearchParams();
        const defaults = { ordem: 'recentes', pagina: 1 };
        PARAMS.forEach(k => { if (state[k] && String(state[k]) !== String(defaults[k] ?? '')) p.set(k, state[k]); });
        const qs = p.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    function filter(ignoreArea) {
        const terms = normalize(state.q.trim()).split(/\s+/).filter(Boolean);
        return all.filter(n =>
            (ignoreArea || !state.area || n.area === state.area) &&
            (!state.de || n._iso >= state.de) &&
            (!state.ate || n._iso <= state.ate) &&
            terms.every(t => n._search.includes(t))
        );
    }

    // --- Renderização ---
    function render() {
        const items = filter().sort((a, b) => state.ordem === 'antigas' ? a._iso.localeCompare(b._iso) : b._iso.localeCompare(a._iso));
        renderAreas();

        const filtered = Boolean(state.area || state.q || state.de || state.ate);
        clearBtn.classList.toggle('hidden', !filtered);
        resultCount.textContent = items.length
            ? `${items.length} ${items.length === 1 ? 'notícia' : 'notícias'}${state.area ? ` · ${state.area}` : ''}`
            : '';

        if (!items.length) {
            listEl.innerHTML = `
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-regular fa-newspaper mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">Nenhuma notícia encontrada.</p>
                    <p class="mt-1 text-sm text-slate-500">Tente outro termo, outro período ou limpe os filtros.</p>
                </div>`;
            pagination.innerHTML = '';
            writeParams();
            return;
        }

        const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
        state.pagina = Math.min(state.pagina, pages);
        const start = (state.pagina - 1) * PER_PAGE;
        listEl.innerHTML = items.slice(start, start + PER_PAGE).map(card).join('');
        renderPagination(pages);
        writeParams();
    }

    function saveButton(n, extra = '') {
        const saved = isSaved(n.id);
        return `<button type="button" class="save-btn absolute z-10 inline-flex size-9 cursor-pointer items-center justify-center rounded-lg transition ${extra} ${saved ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}" data-id="${escapeHTML(n.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remover dos salvos' : 'Salvar'}: ${escapeHTML(n.title)}" title="${saved ? 'Remover das notícias salvas' : 'Salvar notícia'}">
            <i class="${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i></button>`;
    }
    const badge = n => {
        const s = styleOf(n.area);
        return `<span class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${s.badge}"><i class="fa-solid ${s.icon} text-[10px]" aria-hidden="true"></i>${escapeHTML(n.area)}</span>`;
    };
    const titleLink = n => `<a href="${escapeHTML(urlOf(n))}" class="after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(n.title)}</a>`;

    function card(n) {
        return `
            <article class="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md">
                <div class="flex flex-wrap items-center gap-2 pr-10">${badge(n)}<span class="text-xs text-slate-500">${escapeHTML(n.date)}</span></div>
                <h2 class="mt-2 pr-10 leading-snug font-semibold text-slate-900">${titleLink(n)}</h2>
                <p class="mt-1 line-clamp-2 text-sm text-slate-600">${escapeHTML(n.summary)}</p>
                ${saveButton(n, 'top-4 right-4')}
            </article>`;
    }

    function renderAreas() {
        const base = filter(true);
        const areas = [...new Set(all.map(n => n.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const row = (value, label, count) => {
            const on = state.area === value;
            const icon = value ? styleOf(value).icon : 'fa-layer-group';
            return `<li><button type="button" data-area="${escapeHTML(value)}" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'} ${count === 0 && !on ? 'opacity-40' : ''}" aria-pressed="${on}">
                <span class="flex items-center gap-2.5"><i class="fa-solid ${icon} w-4 text-center text-xs ${on ? 'text-blue-700' : 'text-slate-400'}" aria-hidden="true"></i>${escapeHTML(label)}</span>
                <span class="text-xs ${on ? 'text-blue-700' : 'text-slate-400'}">${count}</span>
            </button></li>`;
        };
        areaList.innerHTML = row('', 'Todas', base.length) + areas.map(a => row(a, a, base.filter(n => n.area === a).length)).join('');
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

    // --- Notícias salvas ---
    const SAVED_KEY = 'savedNoticias';
    const isSaved = id => readList(SAVED_KEY).some(s => s.id === id);
    function toggleSaved(id) {
        const n = all.find(x => x.id === id);
        if (!n) return;
        let list = readList(SAVED_KEY);
        if (list.some(s => s.id === id)) list = list.filter(s => s.id !== id);
        else list.unshift({ id: n.id, title: n.title, link: urlOf(n), area: n.area, date: n.date });
        writeList(SAVED_KEY, list);
        render();
        renderSaved();
    }
    function renderSaved() {
        const list = readList(SAVED_KEY);
        savedList.innerHTML = list.length
            ? list.map(s => `
                <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                    <a href="${escapeHTML(urlOf(s))}" class="min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}">
                        <span class="block truncate text-slate-700 group-hover:text-blue-800">${escapeHTML(s.title)}</span>
                        <span class="block text-[11px] text-slate-400">${escapeHTML([s.area, s.date].filter(Boolean).join(' · '))}</span>
                    </a>
                    <button type="button" class="remove-saved mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </li>`).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhuma notícia salva. Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> em cada notícia.</li>';
    }

    // --- Eventos ---
    const setState = changes => { Object.assign(state, { pagina: 1 }, changes); render(); };

    areaList.addEventListener('click', e => {
        const b = e.target.closest('[data-area]');
        if (b) setState({ area: b.dataset.area });
    });
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => setState({ q: searchInput.value }), 150);
    });
    fromInput.addEventListener('change', () => setState({ de: fromInput.value }));
    toInput.addEventListener('change', () => setState({ ate: toInput.value }));
    orderSelect.addEventListener('change', () => setState({ ordem: orderSelect.value }));
    clearBtn.addEventListener('click', () => {
        searchInput.value = ''; fromInput.value = ''; toInput.value = '';
        setState({ area: '', q: '', de: '', ate: '' });
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
        // Notícia ainda sem página: não navega para "#"
        if (e.target.closest('a[href="#"]')) e.preventDefault();
    });
    savedList.addEventListener('click', e => {
        const b = e.target.closest('.remove-saved');
        if (b) {
            writeList(SAVED_KEY, readList(SAVED_KEY).filter(s => s.id !== b.dataset.id));
            render();
            renderSaved();
            return;
        }
        if (e.target.closest('a[href="#"]')) e.preventDefault();
    });
});
