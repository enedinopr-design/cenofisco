// Detalhe de uma legislação (detail.html?title=... ou ?id=...), no mesmo padrão visual de legislacao.html.
// Dados em legislacao.json. Usa as mesmas chaves de armazenamento da listagem:
// savedLegislacao (legislações salvas) e recentlyAccessed (acessadas recentemente, compartilhada com a home; máx. 5).
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
    const detailEl = $('legislation-detail');
    if (!detailEl) return;
    const titleEl = $('leg-title');
    const badgesEl = $('hero-badges');
    const heroMeta = $('hero-meta');
    const crumbEsfera = $('crumb-esfera');
    const dadosEl = $('leg-dados');
    const saveBtn = $('save-btn');
    const shareBtn = $('share-btn');
    const shareMsg = $('share-msg');
    const backLink = $('back-link');
    const relatedWrap = $('related-wrap');
    const relatedList = $('related-list');
    const savedList = $('saved-list');
    const recentList = $('recently-accessed-list');

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
        { id: 'federal', label: 'Federal', badge: 'bg-blue-50 text-blue-700' },
        { id: 'estadual', label: 'Estadual', badge: 'bg-emerald-50 text-emerald-700' },
        { id: 'municipal', label: 'Municipal', badge: 'bg-orange-50 text-orange-700' }
    ];
    const esferaOf = id => ESFERAS.find(e => e.id === id) || ESFERAS[0];

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isoDate = d => (d ? d.split('/').reverse().join('-') : '');
    const clean = s => (s || '').trim();
    const placeOf = l => l.type === 'estadual' ? ufName(l.estado)
        : l.type === 'municipal' ? `${l.municipio}/${l.estado}` : '';
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
    let item = null;

    const params = new URLSearchParams(location.search);
    const wantedId = params.get('id');
    const wantedTitle = params.get('title');

    // Voltar: se veio da listagem, volta com os mesmos filtros
    if (document.referrer && /\/legislacao\.html/.test(document.referrer)) backLink.href = document.referrer;

    fetch('./legislacao.json')
        .then(r => {
            if (!r.ok) throw new Error('Erro ao carregar legislacao.json');
            return r.json();
        })
        .then(data => {
            all = data.map(l => ({
                ...l,
                type: l.type || 'federal',
                area: clean(l.area),
                tipo_de_publicacao: clean(l.tipo_de_publicacao),
                _iso: isoDate(l.date)
            }));
            item = all.find(l => (wantedId && l.id === wantedId) || (wantedTitle && l.title === wantedTitle)) || null;
            if (item) {
                addRecent(item);
                renderDetail();
                renderRelated();
            } else {
                renderNotFound();
            }
            renderSaved();
            renderRecent();
        })
        .catch(error => {
            console.error('Erro ao carregar legislação:', error);
            titleEl.textContent = 'Legislação';
            detailEl.innerHTML = '<p class="text-red-600">Não foi possível carregar os detalhes da legislação.</p>';
        });

    // --- Renderização ---
    function renderDetail() {
        const l = item;
        const e = esferaOf(l.type);
        document.title = `${l.title} - Cenofisco`;
        titleEl.textContent = l.title;

        crumbEsfera.innerHTML = `
            <i class="fa-solid fa-chevron-right text-[9px] text-blue-300" aria-hidden="true"></i>
            <a href="legislacao.html?esfera=${e.id}" class="transition hover:text-white">${escapeHTML(e.label)}</a>`;

        const place = placeOf(l);
        badgesEl.innerHTML = `
            <span class="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase ring-1 ring-white/15">${escapeHTML(e.label)}</span>
            ${l.tipo_de_publicacao ? `<span class="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-blue-950 uppercase">${escapeHTML(l.tipo_de_publicacao)}</span>` : ''}
            ${place ? `<span class="inline-flex items-center gap-1.5 text-xs text-blue-100"><img src="${flag(l.estado)}" alt="" class="h-3 w-4.5 rounded-sm object-cover ring-1 ring-white/20">${escapeHTML(place)}</span>` : ''}`;

        heroMeta.innerHTML = [
            `<span class="inline-flex items-center gap-1.5"><i class="fa-regular fa-calendar text-xs text-amber-400" aria-hidden="true"></i>Publicado em ${escapeHTML(l.date)}</span>`,
            l.area ? `<span class="inline-flex items-center gap-1.5"><i class="fa-solid fa-building-columns text-xs text-amber-400" aria-hidden="true"></i>${escapeHTML(l.area)}</span>` : ''
        ].filter(Boolean).join('<span class="text-blue-300" aria-hidden="true">·</span>');

        const row = (label, value) => value ? `
            <div>
                <dt class="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">${label}</dt>
                <dd class="mt-0.5 text-slate-700">${value}</dd>
            </div>` : '';
        dadosEl.innerHTML = [
            row('Esfera', `<span class="rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${e.badge}">${escapeHTML(e.label)}</span>`),
            row('Tipo de publicação', escapeHTML(l.tipo_de_publicacao)),
            row('Órgão / área', escapeHTML(l.area)),
            row('Estado', l.estado ? `<span class="inline-flex items-center gap-1.5"><img src="${flag(l.estado)}" alt="" class="h-3 w-4.5 rounded-sm object-cover ring-1 ring-slate-200">${escapeHTML(ufName(l.estado))} (${escapeHTML(l.estado)})</span>` : ''),
            row('Município', escapeHTML(l.municipio)),
            row('Publicação', escapeHTML(l.date))
        ].join('');

        detailEl.innerHTML = `
            <section aria-labelledby="titulo-ementa">
                <h2 id="titulo-ementa" class="cf-eyebrow text-blue-700">Ementa</h2>
                <p class="mt-2 border-l-4 border-amber-400 pl-4 text-base leading-relaxed text-slate-700 italic md:text-lg">${escapeHTML(l.summary)}</p>
            </section>
            <section class="mt-8" aria-labelledby="titulo-integra">
                <h2 id="titulo-integra" class="cf-eyebrow text-blue-700">Texto na íntegra</h2>
                <div class="mt-3 space-y-4 leading-relaxed text-slate-700">
                    ${l.content
                        ? l.content
                        : `<p>Este é um espaço para o conteúdo completo da legislação. Em um sistema real, este conteúdo viria de um campo <code class="rounded bg-slate-100 px-1 text-sm">content</code> no JSON, ou de um arquivo HTML/Markdown separado referenciado pelo link.</p>
                           <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`}
                </div>
            </section>`;

        saveBtn.classList.remove('hidden');
        renderSaveBtn();
    }

    function renderNotFound() {
        titleEl.textContent = 'Legislação não encontrada';
        detailEl.innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <i class="fa-regular fa-folder-open mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                <p class="font-medium text-slate-700">Não encontramos esta publicação.</p>
                <p class="mt-1 text-sm text-slate-500">Ela pode ter sido removida ou o endereço está incompleto.</p>
                <a href="legislacao.html" class="cf-btn cf-btn-primary mt-4 inline-flex">Ver toda a legislação</a>
            </div>`;
        dadosEl.innerHTML = '<p class="text-xs text-slate-500">Sem dados para exibir.</p>';
    }

    // Mesma esfera e mesmo tipo ou órgão (e mesma UF, fora do federal), mais recentes primeiro
    function renderRelated() {
        const l = item;
        const related = all
            .filter(x => x.id !== l.id && x.type === l.type &&
                (l.type === 'federal' || x.estado === l.estado) &&
                ((l.tipo_de_publicacao && x.tipo_de_publicacao === l.tipo_de_publicacao) || (l.area && x.area === l.area)))
            .sort((a, b) => b._iso.localeCompare(a._iso))
            .slice(0, 4);
        if (!related.length) return;
        relatedList.innerHTML = related.map(card).join('');
        relatedWrap.classList.remove('hidden');
    }

    function card(l) {
        const e = esferaOf(l.type);
        const place = placeOf(l);
        const placeHtml = place
            ? `<span class="inline-flex items-center gap-1.5 text-xs text-slate-500"><img src="${flag(l.estado)}" alt="" loading="lazy" class="h-3 w-4.5 rounded-sm object-cover ring-1 ring-slate-200">${escapeHTML(place)}</span>`
            : '';
        const meta = [`Publicado em ${l.date}`, l.area].filter(Boolean).map(escapeHTML).join('<span class="text-slate-300" aria-hidden="true">·</span>');
        return `
            <article class="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${e.badge}">${escapeHTML(e.label)}</span>
                    ${l.tipo_de_publicacao ? `<span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">${escapeHTML(l.tipo_de_publicacao)}</span>` : ''}
                    ${placeHtml}
                </div>
                <h3 class="mt-2 leading-snug font-semibold text-slate-900">
                    <a href="${escapeHTML(l.link || '#')}" class="after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(l.title)}</a>
                </h3>
                <p class="mt-1 line-clamp-2 text-sm text-slate-600">${escapeHTML(l.summary)}</p>
                <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">${meta}</p>
            </article>`;
    }

    // --- Legislações salvas ---
    const SAVED_KEY = 'savedLegislacao';
    const isSaved = id => readList(SAVED_KEY).some(s => s.id === id);
    function renderSaveBtn() {
        const saved = isSaved(item.id);
        saveBtn.setAttribute('aria-pressed', String(saved));
        saveBtn.title = saved ? 'Remover das legislações salvas' : 'Salvar legislação';
        saveBtn.innerHTML = `<i class="${saved ? 'fa-solid text-amber-500' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i><span>${saved ? 'Salva' : 'Salvar'}</span>`;
    }
    function toggleSaved() {
        const l = item;
        let list = readList(SAVED_KEY);
        if (list.some(s => s.id === l.id)) list = list.filter(s => s.id !== l.id);
        else list.unshift({ id: l.id, title: l.title, link: l.link, date: l.date, type: l.type, estado: l.estado || '', municipio: l.municipio || '' });
        writeList(SAVED_KEY, list);
        renderSaveBtn();
        renderSaved();
    }
    function sideItem(s, removeClass) {
        const where = s.type === 'estadual' ? s.estado : s.type === 'municipal' ? `${s.municipio || ''}/${s.estado}` : s.type === 'federal' ? 'Federal' : '';
        const current = item && s.title === item.title;
        return `
            <li class="group flex items-start gap-1 rounded-lg ${current ? 'bg-blue-50' : 'hover:bg-blue-50'}">
                <a href="${escapeHTML(s.link || '#')}" class="min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}" ${current ? 'aria-current="page"' : ''}>
                    <span class="block truncate ${current ? 'font-semibold text-blue-800' : 'text-slate-700 group-hover:text-blue-800'}">${escapeHTML(s.title)}</span>
                    <span class="block text-[11px] text-slate-400">${escapeHTML([where, s.date].filter(Boolean).join(' · '))}</span>
                </a>
                ${removeClass ? `<button type="button" class="${removeClass} mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` : ''}
            </li>`;
    }
    function renderSaved() {
        const list = readList(SAVED_KEY);
        savedList.innerHTML = list.length
            ? list.map(s => sideItem(s, 'remove-saved')).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhuma legislação salva. Use o botão <i class="fa-regular fa-bookmark" aria-hidden="true"></i> Salvar.</li>';
    }

    // --- Acessadas recentemente ---
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
    saveBtn.addEventListener('click', () => { if (item) toggleSaved(); });
    savedList.addEventListener('click', e => {
        const b = e.target.closest('.remove-saved');
        if (!b) return;
        writeList(SAVED_KEY, readList(SAVED_KEY).filter(s => s.id !== b.dataset.id));
        if (item) renderSaveBtn();
        renderSaved();
    });
    shareBtn.addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({ title: document.title, url: location.href }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(location.href).then(() => {
                shareMsg.textContent = 'Link copiado para a área de transferência.';
                shareMsg.classList.remove('hidden');
                setTimeout(() => shareMsg.classList.add('hidden'), 3000);
            });
        }
    });
});
