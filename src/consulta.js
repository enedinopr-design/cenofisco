// Detalhe de uma consulta da Consultoria Cenofisco (consulta.html?id=...), no padrão de noticia.html.
// Dados em consultas.json: id, area, date, title (a pergunta), summary, content (resposta em HTML), nota, exemplo.
// Consultas salvas: chave savedConsultas (aparece também em Meu Perfil › Meus documentos).
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
    const detailEl = $('consulta-detail');
    if (!detailEl) return;
    const titleEl = $('consulta-title');
    const badgesEl = $('hero-badges');
    const heroMeta = $('hero-meta');
    const crumbArea = $('crumb-area');
    const saveBtn = $('save-btn');
    const shareBtn = $('share-btn');
    const shareMsg = $('share-msg');
    const relatedWrap = $('related-wrap');
    const relatedList = $('related-list');
    const savedList = $('saved-list');

    // Mesmas áreas e ícones da aba "Últimas Consultas" da página inicial
    const AREA_STYLE = {
        'Imposto de Renda': { badge: 'bg-blue-50 text-blue-700', icon: 'fa-coins' },
        'Trabalhista': { badge: 'bg-orange-50 text-orange-700', icon: 'fa-hourglass-half' },
        'Contabilidade': { badge: 'bg-teal-50 text-teal-700', icon: 'fa-calculator' },
        'Comércio Exterior': { badge: 'bg-sky-50 text-sky-700', icon: 'fa-earth-americas' },
        'Federal': { badge: 'bg-violet-50 text-violet-700', icon: 'fa-flag' },
        'Estadual': { badge: 'bg-emerald-50 text-emerald-700', icon: 'fa-truck' }
    };
    const styleOf = area => AREA_STYLE[area] || { badge: 'bg-slate-100 text-slate-700', icon: 'fa-comments' };

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isoDate = d => (d ? d.split('/').reverse().join('-') : '');
    const urlOf = c => `consulta.html?id=${encodeURIComponent(c.id)}`;
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

    fetch('./consultas.json')
        .then(r => {
            if (!r.ok) throw new Error('Erro ao carregar consultas.json');
            return r.json();
        })
        .then(data => {
            all = data.map(c => ({ ...c, _iso: isoDate(c.date) }));
            item = all.find(c => c.id === wantedId) || null;
            if (item) {
                renderDetail();
                renderRelated();
            } else {
                renderNotFound();
            }
            renderSaved();
        })
        .catch(error => {
            console.error('Erro ao carregar consulta:', error);
            titleEl.textContent = 'Consultoria';
            detailEl.innerHTML = '<p class="text-red-600">Não foi possível carregar a consulta.</p>';
        });

    const badge = c => {
        const s = styleOf(c.area);
        return `<span class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${s.badge}"><i class="fa-solid ${s.icon} text-[10px]" aria-hidden="true"></i>${escapeHTML(c.area)}</span>`;
    };

    function renderDetail() {
        const c = item;
        const s = styleOf(c.area);
        document.title = `${c.title} - Consultoria Cenofisco`;
        titleEl.textContent = c.title;

        crumbArea.innerHTML = `
            <i class="fa-solid fa-chevron-right text-[9px] text-blue-300" aria-hidden="true"></i>
            <span>${escapeHTML(c.area)}</span>`;

        badgesEl.innerHTML = `<span class="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase ring-1 ring-white/15"><i class="fa-solid ${s.icon} text-[10px] text-amber-400" aria-hidden="true"></i>${escapeHTML(c.area)}</span>
            <span class="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-blue-100 uppercase ring-1 ring-white/15"><i class="fa-solid fa-circle-question text-[10px]" aria-hidden="true"></i>Consulta</span>`;

        heroMeta.innerHTML = `<span class="inline-flex items-center gap-1.5"><i class="fa-regular fa-calendar text-xs text-amber-400" aria-hidden="true"></i>Publicado em ${escapeHTML(c.date)}</span>`;

        detailEl.innerHTML = c.content
            ? `<h2 class="flex items-center gap-2 text-sm font-semibold tracking-wide text-blue-800 uppercase"><i class="fa-solid fa-reply" aria-hidden="true"></i>Resposta</h2>
               <div class="cf-prose mt-3">${c.content}</div>
               ${c.nota ? `<p class="mt-6 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>Nota:</strong> ${escapeHTML(c.nota)}</p>` : ''}`
            : `<p class="border-l-4 border-amber-400 pl-4 text-base leading-relaxed text-slate-700 italic">${escapeHTML(c.summary)}</p>
               <div class="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">A resposta completa desta consulta ainda não foi publicada no portal.</div>`;

        saveBtn.classList.remove('hidden');
        renderSaveBtn();
    }

    function renderNotFound() {
        titleEl.textContent = 'Consulta não encontrada';
        detailEl.innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <i class="fa-regular fa-comments mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                <p class="font-medium text-slate-700">Não encontramos esta consulta.</p>
                <p class="mt-1 text-sm text-slate-500">Ela pode ter sido removida ou o endereço está incompleto.</p>
                <a href="index.html#consultoria-cenofisco" class="cf-btn cf-btn-primary mt-4 inline-flex">Ver últimas consultas</a>
            </div>`;
    }

    // Primeiro as da mesma área, depois as demais; mais recentes primeiro
    function renderRelated() {
        const c = item;
        const related = all
            .filter(x => x.id !== c.id)
            .sort((a, b) => (b.area === c.area) - (a.area === c.area) || b._iso.localeCompare(a._iso))
            .slice(0, 4);
        if (!related.length) return;
        relatedList.innerHTML = related.map(x => `
            <article class="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md">
                <div class="flex flex-wrap items-center gap-2">${badge(x)}<span class="text-xs text-slate-500">${escapeHTML(x.date)}</span></div>
                <h3 class="mt-2 leading-snug font-semibold text-slate-900">
                    <a href="${escapeHTML(urlOf(x))}" class="after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(x.title)}</a>
                </h3>
                <p class="mt-1 line-clamp-2 text-sm text-slate-600">${escapeHTML(x.summary)}</p>
            </article>`).join('');
        relatedWrap.classList.remove('hidden');
    }

    // --- Consultas salvas ---
    const SAVED_KEY = 'savedConsultas';
    const isSaved = id => readList(SAVED_KEY).some(s => s.id === id);
    function renderSaveBtn() {
        const saved = isSaved(item.id);
        saveBtn.setAttribute('aria-pressed', String(saved));
        saveBtn.title = saved ? 'Remover das consultas salvas' : 'Salvar consulta';
        saveBtn.innerHTML = `<i class="${saved ? 'fa-solid text-amber-500' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i><span>${saved ? 'Salva' : 'Salvar'}</span>`;
    }
    function toggleSaved() {
        const c = item;
        let list = readList(SAVED_KEY);
        if (list.some(s => s.id === c.id)) list = list.filter(s => s.id !== c.id);
        else list.unshift({ id: c.id, title: c.title, link: urlOf(c), area: c.area, date: c.date });
        writeList(SAVED_KEY, list);
        renderSaveBtn();
        renderSaved();
        shareMsg.textContent = isSaved(c.id) ? 'Consulta salva. Ela também aparece em Meu Perfil › Meus documentos.' : 'Consulta removida das salvas.';
        shareMsg.classList.remove('hidden');
        setTimeout(() => shareMsg.classList.add('hidden'), 3500);
    }
    function renderSaved() {
        const list = readList(SAVED_KEY);
        savedList.innerHTML = list.length
            ? list.map(s => {
                const current = item && s.id === item.id;
                return `
                <li class="group flex items-start gap-1 rounded-lg ${current ? 'bg-blue-50' : 'hover:bg-blue-50'}">
                    <a href="${escapeHTML(s.link || urlOf(s))}" class="min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}" ${current ? 'aria-current="page"' : ''}>
                        <span class="line-clamp-2 ${current ? 'font-semibold text-blue-800' : 'text-slate-700 group-hover:text-blue-800'}">${escapeHTML(s.title)}</span>
                        <span class="block text-[11px] text-slate-400">${escapeHTML([s.area, s.date].filter(Boolean).join(' · '))}</span>
                    </a>
                    <button type="button" class="remove-saved mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </li>`;
            }).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhuma consulta salva. Use o botão <i class="fa-regular fa-bookmark" aria-hidden="true"></i> Salvar.</li>';
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
