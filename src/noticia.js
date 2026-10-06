// Detalhe de uma notícia (noticia.html?id=...), no mesmo padrão visual de noticias.html e detail.html.
// Dados em noticias.json. Usa a mesma chave de armazenamento da listagem: savedNoticias (notícias salvas).
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
    const detailEl = $('noticia-detail');
    if (!detailEl) return;
    const titleEl = $('noticia-title');
    const badgesEl = $('hero-badges');
    const heroMeta = $('hero-meta');
    const crumbArea = $('crumb-area');
    const areaLinks = $('area-links');
    const saveBtn = $('save-btn');
    const shareBtn = $('share-btn');
    const shareMsg = $('share-msg');
    const backLink = $('back-link');
    const relatedWrap = $('related-wrap');
    const relatedList = $('related-list');
    const savedList = $('saved-list');

    const AREA_STYLE = {
        'Tributário': { badge: 'bg-emerald-50 text-emerald-700', icon: 'fa-coins' },
        'Trabalhista': { badge: 'bg-orange-50 text-orange-700', icon: 'fa-people-group' },
        'Federal': { badge: 'bg-blue-50 text-blue-700', icon: 'fa-landmark' },
        'Previdenciário': { badge: 'bg-violet-50 text-violet-700', icon: 'fa-shield-halved' }
    };
    const styleOf = area => AREA_STYLE[area] || { badge: 'bg-slate-100 text-slate-700', icon: 'fa-newspaper' };

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isoDate = d => (d ? d.split('/').reverse().join('-') : '');
    // Endereço da notícia (o link do JSON, ou esta página pelo id)
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
    let item = null;
    const wantedId = new URLSearchParams(location.search).get('id');

    // Voltar: se veio da listagem, volta com os mesmos filtros
    if (document.referrer && /\/noticias\.html/.test(document.referrer)) backLink.href = document.referrer;

    fetch('./noticias.json')
        .then(r => {
            if (!r.ok) throw new Error('Erro ao carregar noticias.json');
            return r.json();
        })
        .then(data => {
            all = data.map(n => ({ ...n, _iso: isoDate(n.date) }));
            item = all.find(n => n.id === wantedId) || null;
            if (item) {
                renderDetail();
                renderRelated();
            } else {
                renderNotFound();
            }
            renderAreas();
            renderSaved();
        })
        .catch(error => {
            console.error('Erro ao carregar notícia:', error);
            titleEl.textContent = 'Notícias';
            detailEl.innerHTML = '<p class="text-red-600">Não foi possível carregar a notícia.</p>';
        });

    // --- Renderização ---
    const badge = n => {
        const s = styleOf(n.area);
        return `<span class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${s.badge}"><i class="fa-solid ${s.icon} text-[10px]" aria-hidden="true"></i>${escapeHTML(n.area)}</span>`;
    };

    function renderDetail() {
        const n = item;
        const s = styleOf(n.area);
        document.title = `${n.title} - Cenofisco`;
        titleEl.textContent = n.title;

        crumbArea.innerHTML = `
            <i class="fa-solid fa-chevron-right text-[9px] text-blue-300" aria-hidden="true"></i>
            <a href="noticias.html?area=${encodeURIComponent(n.area)}" class="transition hover:text-white">${escapeHTML(n.area)}</a>`;

        badgesEl.innerHTML = `<span class="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase ring-1 ring-white/15"><i class="fa-solid ${s.icon} text-[10px] text-amber-400" aria-hidden="true"></i>${escapeHTML(n.area)}</span>`;

        heroMeta.innerHTML = `<span class="inline-flex items-center gap-1.5"><i class="fa-regular fa-calendar text-xs text-amber-400" aria-hidden="true"></i>Publicada em ${escapeHTML(n.date)}</span>`;

        detailEl.innerHTML = `
            <p class="border-l-4 border-amber-400 pl-4 text-base leading-relaxed text-slate-700 italic md:text-lg">${escapeHTML(n.summary)}</p>
            <div class="mt-8 space-y-4 leading-relaxed text-slate-700">
                ${n.content
                    ? n.content
                    : `<p>Este é um espaço para o texto completo da notícia. Em um sistema real, este conteúdo viria de um campo <code class="rounded bg-slate-100 px-1 text-sm">content</code> no JSON, ou de um arquivo HTML/Markdown separado.</p>
                       <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`}
            </div>`;

        saveBtn.classList.remove('hidden');
        renderSaveBtn();
    }

    function renderNotFound() {
        titleEl.textContent = 'Notícia não encontrada';
        detailEl.innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <i class="fa-regular fa-newspaper mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                <p class="font-medium text-slate-700">Não encontramos esta notícia.</p>
                <p class="mt-1 text-sm text-slate-500">Ela pode ter sido removida ou o endereço está incompleto.</p>
                <a href="noticias.html" class="cf-btn cf-btn-primary mt-4 inline-flex">Ver todas as notícias</a>
            </div>`;
    }

    // Primeiro as da mesma área, depois as demais; mais recentes primeiro
    function renderRelated() {
        const n = item;
        const related = all
            .filter(x => x.id !== n.id)
            .sort((a, b) => (b.area === n.area) - (a.area === n.area) || b._iso.localeCompare(a._iso))
            .slice(0, 4);
        if (!related.length) return;
        relatedList.innerHTML = related.map(card).join('');
        relatedWrap.classList.remove('hidden');
    }

    function card(n) {
        return `
            <article class="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md">
                <div class="flex flex-wrap items-center gap-2">${badge(n)}<span class="text-xs text-slate-500">${escapeHTML(n.date)}</span></div>
                <h3 class="mt-2 leading-snug font-semibold text-slate-900">
                    <a href="${escapeHTML(urlOf(n))}" class="after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(n.title)}</a>
                </h3>
                <p class="mt-1 line-clamp-2 text-sm text-slate-600">${escapeHTML(n.summary)}</p>
            </article>`;
    }

    function renderAreas() {
        const areas = [...new Set(all.map(n => n.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        areaLinks.innerHTML = areas.map(a => {
            const on = item && item.area === a;
            const count = all.filter(n => n.area === a).length;
            return `<li><a href="noticias.html?area=${encodeURIComponent(a)}" class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'}">
                <span class="flex items-center gap-2.5"><i class="fa-solid ${styleOf(a).icon} w-4 text-center text-xs ${on ? 'text-blue-700' : 'text-slate-400'}" aria-hidden="true"></i>${escapeHTML(a)}</span>
                <span class="text-xs ${on ? 'text-blue-700' : 'text-slate-400'}">${count}</span>
            </a></li>`;
        }).join('');
    }

    // --- Notícias salvas ---
    const SAVED_KEY = 'savedNoticias';
    const isSaved = id => readList(SAVED_KEY).some(s => s.id === id);
    function renderSaveBtn() {
        const saved = isSaved(item.id);
        saveBtn.setAttribute('aria-pressed', String(saved));
        saveBtn.title = saved ? 'Remover das notícias salvas' : 'Salvar notícia';
        saveBtn.innerHTML = `<i class="${saved ? 'fa-solid text-amber-500' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i><span>${saved ? 'Salva' : 'Salvar'}</span>`;
    }
    function toggleSaved() {
        const n = item;
        let list = readList(SAVED_KEY);
        if (list.some(s => s.id === n.id)) list = list.filter(s => s.id !== n.id);
        else list.unshift({ id: n.id, title: n.title, link: urlOf(n), area: n.area, date: n.date });
        writeList(SAVED_KEY, list);
        renderSaveBtn();
        renderSaved();
    }
    function renderSaved() {
        const list = readList(SAVED_KEY);
        savedList.innerHTML = list.length
            ? list.map(s => {
                const current = item && s.id === item.id;
                return `
                <li class="group flex items-start gap-1 rounded-lg ${current ? 'bg-blue-50' : 'hover:bg-blue-50'}">
                    <a href="${escapeHTML(urlOf(s))}" class="min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}" ${current ? 'aria-current="page"' : ''}>
                        <span class="block truncate ${current ? 'font-semibold text-blue-800' : 'text-slate-700 group-hover:text-blue-800'}">${escapeHTML(s.title)}</span>
                        <span class="block text-[11px] text-slate-400">${escapeHTML([s.area, s.date].filter(Boolean).join(' · '))}</span>
                    </a>
                    <button type="button" class="remove-saved mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </li>`;
            }).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhuma notícia salva. Use o botão <i class="fa-regular fa-bookmark" aria-hidden="true"></i> Salvar.</li>';
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
