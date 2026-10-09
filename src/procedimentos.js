// Página de Procedimentos
// Dados em procedimentos.json — campos: id, area, title, summary, assunto, date (DD/MM/AAAA), numero, link.
// Filtros: área (lateral), busca e ordenação. O estado fica no endereço
// (ex.: procedimentos.html?area=IR&q=declaracao&pagina=2).
// "Salvar" funciona como em Regulamentos: ícone em cada item e lista "Procedimentos Salvos".
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

    const listEl = document.getElementById('procedimentos-list');
    const searchInput = document.getElementById('procedimento-search');
    const orderSelect = document.getElementById('procedimento-ordem');
    const areaList = document.getElementById('area-filters');
    const resultCount = document.getElementById('result-count');
    const clearBtn = document.getElementById('clear-filters');
    const pagination = document.getElementById('pagination-container');
    const savedList = document.getElementById('saved-list');
    if (!listEl) return;

    const PER_PAGE = 10;
    const AREA_STYLE = {
        'Contabilidade': { badge: 'bg-sky-50 text-sky-700', icon: 'fa-calculator' },
        'ICMS e Outros': { badge: 'bg-emerald-50 text-emerald-700', icon: 'fa-truck-fast' },
        'Prev/Trab': { badge: 'bg-orange-50 text-orange-700', icon: 'fa-people-group' },
        'IR': { badge: 'bg-red-50 text-red-700', icon: 'fa-coins' },
        'Federal': { badge: 'bg-violet-50 text-violet-700', icon: 'fa-landmark' },
        'ISS e Outros': { badge: 'bg-amber-50 text-amber-700', icon: 'fa-city' }
    };
    const styleOf = area => AREA_STYLE[area] || { badge: 'bg-slate-100 text-slate-700', icon: 'fa-file-lines' };

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    // Endereço do procedimento (o link do JSON, ou a página de detalhe pelo id)
    const urlOf = p => (p.link && p.link !== '#' ? p.link : `procedimento.html?id=${encodeURIComponent(p.id)}`);
    const dateKey = d => (d ? d.split('/').reverse().join('') : '');

    let all = [];
    const state = { area: '', q: '', ordem: 'recentes', pagina: 1 };

    fetch('./procedimentos.json')
        .then(r => r.json())
        .then(data => {
            all = data.map(p => ({
                ...p,
                _search: normalize([p.title, p.summary, p.assunto, p.area, p.numero].join(' '))
            }));
            readParams();
            render();
            renderSaved();
        })
        .catch(error => {
            console.error('Erro ao carregar procedimentos:', error);
            listEl.innerHTML = '<p class="text-red-600">Não foi possível carregar os procedimentos.</p>';
        });

    // --- Endereço (filtros) ---
    function readParams() {
        const p = new URLSearchParams(location.search);
        state.area = p.get('area') || '';
        state.q = p.get('q') || '';
        state.ordem = p.get('ordem') === 'az' ? 'az' : 'recentes';
        state.pagina = Math.max(1, parseInt(p.get('pagina'), 10) || 1);
        searchInput.value = state.q;
        orderSelect.value = state.ordem;
    }
    function writeParams() {
        const p = new URLSearchParams();
        if (state.area) p.set('area', state.area);
        if (state.q) p.set('q', state.q);
        if (state.ordem !== 'recentes') p.set('ordem', state.ordem);
        if (state.pagina > 1) p.set('pagina', state.pagina);
        const qs = p.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    function filter(ignoreArea) {
        const terms = normalize(state.q.trim()).split(/\s+/).filter(Boolean);
        return all.filter(p =>
            (ignoreArea || !state.area || p.area === state.area) &&
            terms.every(t => p._search.includes(t))
        );
    }

    // --- Renderização ---
    function render() {
        const items = filter().sort((a, b) => state.ordem === 'az'
            ? a.title.localeCompare(b.title, 'pt-BR')
            : dateKey(b.date).localeCompare(dateKey(a.date)));

        renderAreas();
        const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
        state.pagina = Math.min(state.pagina, pages);

        clearBtn.classList.toggle('hidden', !(state.area || state.q));
        resultCount.textContent = items.length
            ? `${items.length} ${items.length === 1 ? 'procedimento' : 'procedimentos'}${state.area ? ` · ${state.area}` : ''}`
            : '';

        if (!items.length) {
            listEl.innerHTML = `
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-regular fa-folder-open mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">Nenhum procedimento encontrado.</p>
                    <p class="mt-1 text-sm text-slate-500">Tente outro termo ou limpe os filtros.</p>
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

    function card(p) {
        const s = styleOf(p.area);
        const saved = isSaved(p.id);
        const meta = [p.assunto, p.date, p.numero ? `Nº ${p.numero}` : ''].filter(Boolean)
            .map(escapeHTML).join('<span class="text-slate-300" aria-hidden="true">·</span>');
        return `
            <article class="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md">
                <div class="flex flex-wrap items-center gap-2 pr-10">
                    <span class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${s.badge}"><i class="fa-solid ${s.icon} text-[10px]" aria-hidden="true"></i>${escapeHTML(p.area)}</span>
                </div>
                <h2 class="mt-2 pr-10 text-lg leading-snug font-semibold text-slate-900">
                    <a href="${escapeHTML(urlOf(p))}" class="after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(p.title)}</a>
                </h2>
                <p class="mt-1 text-sm text-slate-600">${escapeHTML(p.summary)}</p>
                <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">${meta}</p>
                <button type="button" class="save-btn absolute top-4 right-4 z-10 inline-flex size-9 cursor-pointer items-center justify-center rounded-lg transition ${saved ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}" data-id="${escapeHTML(p.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remover dos salvos' : 'Salvar'}: ${escapeHTML(p.title)}" title="${saved ? 'Remover dos procedimentos salvos' : 'Salvar procedimento'}">
                    <i class="${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i>
                </button>
            </article>`;
    }

    function renderAreas() {
        const base = filter(true);
        const areas = [...new Set(all.map(p => p.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const row = (value, label, n) => {
            const on = state.area === value;
            const icon = value ? styleOf(value).icon : 'fa-layer-group';
            return `<li><button type="button" data-area="${escapeHTML(value)}" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'} ${n === 0 && !on ? 'opacity-40' : ''}" aria-pressed="${on}">
                <span class="flex items-center gap-2.5"><i class="fa-solid ${icon} w-4 text-center text-xs ${on ? 'text-blue-700' : 'text-slate-400'}" aria-hidden="true"></i>${escapeHTML(label)}</span>
                <span class="text-xs ${on ? 'text-blue-700' : 'text-slate-400'}">${n}</span>
            </button></li>`;
        };
        areaList.innerHTML = row('', 'Todas', base.length) + areas.map(a => row(a, a, base.filter(p => p.area === a).length)).join('');
    }

    function renderPagination(pages) {
        if (pages <= 1) { pagination.innerHTML = ''; return; }
        const btn = (label, page, { current = false, disabled = false, aria = '' } = {}) =>
            `<button type="button" data-page="${page}" ${disabled ? 'disabled' : ''} ${current ? 'aria-current="page"' : ''} ${aria ? `aria-label="${aria}"` : ''}
                class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${current ? 'bg-blue-900 text-white' : disabled ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer text-slate-600 hover:bg-white hover:text-blue-800'}">${label}</button>`;
        let html = btn('<i class="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>', state.pagina - 1, { disabled: state.pagina === 1, aria: 'Página anterior' });
        // Mostra a primeira, a última e as vizinhas da atual; "…" só quando esconde 2 ou mais páginas
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

    // --- Procedimentos salvos ---
    const storageKey = 'savedProcedimentos';
    function readSaved() {
        try {
            const data = JSON.parse(localStorage.getItem(storageKey));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }
    function writeSaved(list) {
        try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch (e) { /* sem armazenamento */ }
    }
    const isSaved = id => readSaved().some(s => s.id === id);

    function toggleSaved(id) {
        const p = all.find(x => x.id === id);
        if (!p) return;
        let list = readSaved();
        if (list.some(s => s.id === id)) list = list.filter(s => s.id !== id);
        else list.unshift({ id: p.id, title: p.title, link: urlOf(p), area: p.area, date: p.date });
        writeSaved(list);
        render();
        renderSaved();
    }

    function renderSaved() {
        const list = readSaved();
        if (!list.length) {
            savedList.innerHTML = '<li class="px-1 text-xs text-slate-500">Nenhum procedimento salvo. Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> em cada procedimento.</li>';
            return;
        }
        savedList.innerHTML = list.map(s => `
            <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                <a href="${escapeHTML(urlOf(s))}" class="min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}">
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${escapeHTML(s.title)}</span>
                    <span class="block text-[11px] text-slate-400">${escapeHTML([s.area, s.date].filter(Boolean).join(' · '))}</span>
                </a>
                <button type="button" class="remove-saved mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </li>`).join('');
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
    orderSelect.addEventListener('change', () => setState({ ordem: orderSelect.value }));
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        setState({ area: '', q: '' });
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
    });
    savedList.addEventListener('click', e => {
        const b = e.target.closest('.remove-saved');
        if (b) {
            writeSaved(readSaved().filter(s => s.id !== b.dataset.id));
            render();
            renderSaved();
            return;
        }
    });
});
