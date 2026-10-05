// Página de Regulamentos: federais, estaduais (27 UFs) e municipais.
// Dados em regulamentos.json — campos: id, esfera (federal|estadual|municipal), uf, municipio,
// tributo, sigla, title, norma, summary, atualizado, link (vazio = "Em breve").
// Filtros: esfera (abas), busca, UF e tributo. O estado dos filtros fica no endereço
// (ex.: regulamentos.html?esfera=estadual&uf=SP), o que permite links diretos a partir da home.
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

    const resultsEl = document.getElementById('regulations-results');
    const searchInput = document.getElementById('regulation-search');
    const ufSelect = document.getElementById('uf-filter');
    const ufWrap = document.getElementById('uf-filter-wrap');
    const tabsEl = document.getElementById('esfera-tabs');
    const statsEl = document.getElementById('esfera-stats');
    const tributoList = document.getElementById('tributo-filters');
    const resultCount = document.getElementById('result-count');
    const clearBtn = document.getElementById('clear-filters');
    const savedList = document.getElementById('articles-list');
    if (!resultsEl) return;

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
        { id: 'federal', label: 'Federais', icon: 'fa-landmark' },
        { id: 'estadual', label: 'Estaduais', icon: 'fa-map' },
        { id: 'municipal', label: 'Municipais', icon: 'fa-city' }
    ];
    const TRIBUTO_ICON = {
        IPI: 'fa-industry', IR: 'fa-coins', 'Previdência': 'fa-people-roof', 'Simples Nacional': 'fa-store',
        Aduaneiro: 'fa-ship', 'PIS/Cofins': 'fa-percent', ICMS: 'fa-truck-fast', ISS: 'fa-briefcase'
    };

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    let all = [];
    const state = { esfera: 'todos', uf: '', tributo: '', q: '' };

    // --- Carrega dados e lê filtros do endereço ---
    fetch('./regulamentos.json')
        .then(r => r.json())
        .then(data => {
            all = data.map(r => ({
                ...r,
                _search: normalize([r.sigla, r.title, r.norma, r.summary, r.tributo, r.municipio, r.uf, ufName(r.uf)].join(' '))
            }));
            readParams();
            buildUfOptions();
            render();
            renderSaved();
        })
        .catch(error => {
            console.error('Erro ao carregar regulamentos:', error);
            resultsEl.innerHTML = '<p class="text-red-600">Não foi possível carregar os regulamentos.</p>';
        });

    function readParams() {
        const p = new URLSearchParams(location.search);
        if (ESFERAS.some(e => e.id === p.get('esfera'))) state.esfera = p.get('esfera');
        if (UFS[(p.get('uf') || '').toUpperCase()]) state.uf = p.get('uf').toUpperCase();
        state.tributo = p.get('tributo') || '';
        state.q = p.get('q') || '';
        searchInput.value = state.q;
    }

    function writeParams() {
        const p = new URLSearchParams();
        if (state.esfera !== 'todos') p.set('esfera', state.esfera);
        if (state.uf) p.set('uf', state.uf);
        if (state.tributo) p.set('tributo', state.tributo);
        if (state.q) p.set('q', state.q);
        const qs = p.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    function buildUfOptions() {
        ufSelect.innerHTML = '<option value="">Todos os estados</option>' + Object.keys(UFS)
            .sort((a, b) => ufName(a).localeCompare(ufName(b), 'pt-BR'))
            .map(uf => `<option value="${uf}">${escapeHTML(ufName(uf))} (${uf})</option>`).join('');
        ufSelect.value = state.uf;
    }

    // Filtra ignorando um dos filtros (para calcular as contagens de abas e tributos)
    function filter(except) {
        const term = normalize(state.q.trim());
        const terms = term.split(/\s+/).filter(Boolean);
        return all.filter(r =>
            (except === 'esfera' || state.esfera === 'todos' || r.esfera === state.esfera) &&
            (except === 'uf' || !state.uf || r.esfera === 'federal' || r.uf === state.uf) &&
            (except === 'tributo' || !state.tributo || r.tributo === state.tributo) &&
            terms.every(t => r._search.includes(t))
        );
    }

    // --- Renderização ---
    function render() {
        const items = filter();
        renderStats();
        renderTabs();
        renderTributos();

        // UF não se aplica a regulamentos federais
        ufWrap.classList.toggle('hidden', state.esfera === 'federal');

        const active = state.esfera !== 'todos' || state.uf || state.tributo || state.q;
        clearBtn.classList.toggle('hidden', !active);
        const available = items.filter(r => r.link).length;
        resultCount.textContent = items.length
            ? `${items.length} ${items.length === 1 ? 'regulamento' : 'regulamentos'}${state.uf ? ` · ${ufName(state.uf)}` : ''} · ${available} ${available === 1 ? 'disponível' : 'disponíveis'}`
            : '';

        if (!items.length) {
            resultsEl.innerHTML = `
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-regular fa-folder-open mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">Nenhum regulamento encontrado.</p>
                    <p class="mt-1 text-sm text-slate-500">Tente outro termo ou limpe os filtros.</p>
                </div>`;
            writeParams();
            return;
        }

        const groups = ESFERAS.slice(1)
            .map(e => ({ ...e, items: items.filter(r => r.esfera === e.id) }))
            .filter(g => g.items.length);

        resultsEl.innerHTML = groups.map(g => `
            <section aria-labelledby="grupo-${g.id}">
                <h2 id="grupo-${g.id}" class="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                    <i class="fa-solid ${g.icon} text-slate-400" aria-hidden="true"></i>${g.label}
                    <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">${g.items.length}</span>
                </h2>
                ${g.id === 'municipal' ? renderMunicipal(g.items) : `<div class="grid gap-3 md:grid-cols-2">${g.items.map(card).join('')}</div>`}
            </section>`).join('');

        writeParams();
    }

    // Municipais agrupados por UF — subtítulos só quando algum estado tem mais de um município
    function renderMunicipal(items) {
        const byUf = {};
        items.forEach(r => (byUf[r.uf] = byUf[r.uf] || []).push(r));
        const ufs = Object.keys(byUf).sort((a, b) => ufName(a).localeCompare(ufName(b), 'pt-BR'));
        const flat = ufs.length === 1 || ufs.every(uf => byUf[uf].length === 1);
        if (flat) return `<div class="grid gap-3 md:grid-cols-2">${ufs.map(uf => byUf[uf].map(card).join('')).join('')}</div>`;
        return `<div class="space-y-5">${ufs.map(uf => `
            <div>
                <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <img src="${flag(uf)}" alt="" loading="lazy" class="h-3.5 w-5 rounded-sm object-cover ring-1 ring-slate-200">${escapeHTML(ufName(uf))}
                    <span class="text-xs font-normal text-slate-400">${byUf[uf].length} ${byUf[uf].length === 1 ? 'município' : 'municípios'}</span>
                </h3>
                <div class="grid gap-3 md:grid-cols-2">${byUf[uf].map(card).join('')}</div>
            </div>`).join('')}</div>`;
    }

    function card(r) {
        const available = Boolean(r.link);
        const saved = isSaved(r);
        const thumb = r.esfera === 'federal'
            ? `<span class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-950 text-amber-400"><i class="fa-solid ${TRIBUTO_ICON[r.tributo] || 'fa-scale-balanced'}" aria-hidden="true"></i></span>`
            : `<span class="relative shrink-0"><img src="${flag(r.uf)}" alt="" loading="lazy" class="h-8 w-11 rounded-md object-cover shadow-sm ring-1 ring-slate-200">${r.esfera === 'municipal' ? '<span class="absolute -right-1.5 -bottom-1.5 inline-flex size-5 items-center justify-center rounded-full bg-white text-[10px] text-slate-600 shadow ring-1 ring-slate-200"><i class="fa-solid fa-city" aria-hidden="true"></i></span>' : ''}</span>`;
        const place = r.esfera === 'estadual' ? ufName(r.uf) : r.esfera === 'municipal' ? `${r.municipio}/${r.uf}` : 'Federal';

        return `
            <article class="group relative flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition ${available ? 'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md' : ''}">
                ${thumb}
                <div class="min-w-0 flex-1 pr-8">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span class="text-xs font-semibold text-blue-800">${escapeHTML(r.sigla)}</span>
                        <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">${escapeHTML(r.tributo)}</span>
                        <span class="text-xs text-slate-400">${escapeHTML(place)}</span>
                    </div>
                    <h3 class="mt-1 leading-snug font-semibold text-slate-900">
                        ${available
                            ? `<a href="${escapeHTML(r.link)}" class="after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(r.title)}</a>`
                            : escapeHTML(r.title)}
                    </h3>
                    ${r.norma ? `<p class="mt-0.5 text-xs text-slate-500">${escapeHTML(r.norma)}</p>` : ''}
                    <p class="mt-2 line-clamp-2 text-sm text-slate-600">${escapeHTML(r.summary)}</p>
                    <p class="mt-3 text-xs font-medium">
                        ${available
                            ? '<span class="inline-flex items-center gap-1.5 text-emerald-700"><span class="size-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>Disponível</span>'
                            : '<span class="inline-flex items-center gap-1.5 text-slate-400"><i class="fa-regular fa-clock" aria-hidden="true"></i>Em breve</span>'}
                        ${r.atualizado ? `<span class="ml-2 text-slate-400">Atualizado em ${escapeHTML(r.atualizado)}</span>` : ''}
                    </p>
                </div>
                <button type="button" class="save-btn absolute top-3 right-3 z-10 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg transition ${saved ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}" data-id="${escapeHTML(r.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remover dos salvos' : 'Salvar'}: ${escapeHTML(r.title)}" title="${saved ? 'Remover dos regulamentos salvos' : 'Salvar regulamento'}">
                    <i class="${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i>
                </button>
            </article>`;
    }

    function renderStats() {
        if (!statsEl) return;
        statsEl.innerHTML = ESFERAS.slice(1).map(e => {
            const n = all.filter(r => r.esfera === e.id).length;
            const on = state.esfera === e.id;
            return `
                <button type="button" data-esfera="${e.id}" class="cursor-pointer rounded-xl px-4 py-3 text-left ring-1 transition ${on ? 'bg-white text-blue-950 ring-white' : 'bg-white/5 ring-white/15 hover:bg-white/10'}" aria-pressed="${on}">
                    <span class="block text-2xl font-bold">${n}</span>
                    <span class="block text-xs ${on ? 'text-slate-500' : 'text-blue-100'}">${e.label}</span>
                </button>`;
        }).join('');
    }

    function renderTabs() {
        const counts = filter('esfera');
        tabsEl.innerHTML = ESFERAS.map(e => {
            const n = e.id === 'todos' ? counts.length : counts.filter(r => r.esfera === e.id).length;
            const on = state.esfera === e.id;
            return `<button type="button" role="tab" aria-selected="${on}" data-esfera="${e.id}" class="tab-button ${on ? 'active' : ''}">${e.label} <span class="ml-1 rounded-full ${on ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'} px-1.5 py-0.5 text-[11px]">${n}</span></button>`;
        }).join('');
    }

    function renderTributos() {
        const base = filter('tributo');
        const tributos = [...new Set(all.map(r => r.tributo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const row = (value, label, n) => {
            const on = state.tributo === value;
            return `<li><button type="button" data-tributo="${escapeHTML(value)}" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'} ${n === 0 && !on ? 'opacity-40' : ''}" aria-pressed="${on}">
                <span class="flex items-center gap-2.5"><i class="fa-solid ${TRIBUTO_ICON[value] || 'fa-layer-group'} w-4 text-center text-xs ${on ? 'text-blue-700' : 'text-slate-400'}" aria-hidden="true"></i>${escapeHTML(label)}</span>
                <span class="text-xs ${on ? 'text-blue-700' : 'text-slate-400'}">${n}</span>
            </button></li>`;
        };
        tributoList.innerHTML = row('', 'Todos', base.length) +
            tributos.map(t => row(t, t, base.filter(r => r.tributo === t).length)).join('');
    }

    // --- Regulamentos salvos (compartilhados com as páginas de regulamento) ---
    const storageKey = 'savedRegulations';
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
    // Itens antigos guardavam só título/link: compara por id e, na falta, pelo link
    const sameReg = (saved, r) => (saved.id && saved.id === r.id) || (saved.link && r.link && saved.link === r.link);
    const isSaved = r => readSaved().some(s => sameReg(s, r));

    function toggleSaved(id) {
        const r = all.find(x => x.id === id);
        if (!r) return;
        let list = readSaved();
        if (list.some(s => sameReg(s, r))) {
            list = list.filter(s => !sameReg(s, r));
        } else {
            list.unshift({ id: r.id, title: r.title, link: r.link, sigla: r.sigla });
        }
        writeSaved(list);
        render();
        renderSaved();
    }

    function renderSaved() {
        const list = readSaved();
        if (!list.length) {
            savedList.innerHTML = '<li class="px-1 text-xs text-slate-500">Nenhum regulamento salvo. Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> nos cartões.</li>';
            return;
        }
        savedList.innerHTML = list.map((s, i) => `
            <li class="group flex items-center gap-1 rounded-lg hover:bg-blue-50">
                ${s.link
                    ? `<a href="${escapeHTML(s.link)}" class="min-w-0 flex-1 truncate px-2 py-1.5 text-slate-700 group-hover:text-blue-800" title="${escapeHTML(s.title)}"><i class="fa-regular fa-file-lines mr-2 text-slate-400" aria-hidden="true"></i>${escapeHTML(s.title)}</a>`
                    : `<span class="min-w-0 flex-1 truncate px-2 py-1.5 text-slate-500" title="${escapeHTML(s.title)} (em breve)"><i class="fa-regular fa-clock mr-2 text-slate-300" aria-hidden="true"></i>${escapeHTML(s.title)}</span>`}
                <button type="button" class="remove-saved inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-index="${i}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </li>`).join('');
    }

    // --- Eventos ---
    const setState = changes => { Object.assign(state, changes); render(); };

    tabsEl.addEventListener('click', e => {
        const b = e.target.closest('[data-esfera]');
        if (b) setState({ esfera: b.dataset.esfera });
    });
    statsEl?.addEventListener('click', e => {
        const b = e.target.closest('[data-esfera]');
        if (b) setState({ esfera: state.esfera === b.dataset.esfera ? 'todos' : b.dataset.esfera });
    });
    tributoList.addEventListener('click', e => {
        const b = e.target.closest('[data-tributo]');
        if (b) setState({ tributo: b.dataset.tributo });
    });
    ufSelect.addEventListener('change', () => setState({ uf: ufSelect.value }));
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => setState({ q: searchInput.value }), 150);
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        ufSelect.value = '';
        setState({ esfera: 'todos', uf: '', tributo: '', q: '' });
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
        const list = readSaved();
        list.splice(Number(b.dataset.index), 1);
        writeSaved(list);
        render();
        renderSaved();
    });
});
