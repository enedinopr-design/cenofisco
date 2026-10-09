// Detalhe de um procedimento (procedimento.html?id=...), no mesmo padrão de noticia.html.
// Dados em procedimentos.json (campo content = texto completo em HTML, com <h2>/<h3> numerados).
// O sumário da lateral é montado a partir desses títulos. Salvos: chave savedProcedimentos (a mesma da listagem).
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
    const detailEl = $('proc-detail');
    if (!detailEl) return;
    const titleEl = $('proc-title');
    const badgesEl = $('hero-badges');
    const heroMeta = $('hero-meta');
    const crumbArea = $('crumb-area');
    const sumarioWrap = $('sumario-wrap');
    const sumarioEl = $('sumario');
    const saveBtn = $('save-btn');
    const shareBtn = $('share-btn');
    const shareMsg = $('share-msg');
    const backLink = $('back-link');
    const relatedWrap = $('related-wrap');
    const relatedList = $('related-list');
    const savedList = $('saved-list');

    // Mesmas cores e ícones de procedimentos.js
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
    const isoDate = d => (d ? d.split('/').reverse().join('-') : '');
    const urlOf = p => (p.link && p.link !== '#' ? p.link : `procedimento.html?id=${encodeURIComponent(p.id)}`);
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
    if (document.referrer && /\/procedimentos\.html/.test(document.referrer)) backLink.href = document.referrer;

    fetch('./procedimentos.json')
        .then(r => {
            if (!r.ok) throw new Error('Erro ao carregar procedimentos.json');
            return r.json();
        })
        .then(data => {
            all = data.map(p => ({ ...p, _iso: isoDate(p.date) }));
            item = all.find(p => p.id === wantedId) || null;
            if (item) {
                renderDetail();
                renderRelated();
            } else {
                renderNotFound();
            }
            renderSaved();
        })
        .catch(error => {
            console.error('Erro ao carregar procedimento:', error);
            titleEl.textContent = 'Procedimentos';
            detailEl.innerHTML = '<p class="text-red-600">Não foi possível carregar o procedimento.</p>';
        });

    const badge = p => {
        const s = styleOf(p.area);
        return `<span class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${s.badge}"><i class="fa-solid ${s.icon} text-[10px]" aria-hidden="true"></i>${escapeHTML(p.area)}</span>`;
    };

    function renderDetail() {
        const p = item;
        const s = styleOf(p.area);
        document.title = `${p.title} - Cenofisco`;
        titleEl.textContent = p.title;

        crumbArea.innerHTML = `
            <i class="fa-solid fa-chevron-right text-[9px] text-blue-300" aria-hidden="true"></i>
            <a href="procedimentos.html?area=${encodeURIComponent(p.area)}" class="transition hover:text-white">${escapeHTML(p.area)}</a>`;

        badgesEl.innerHTML = `<span class="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase ring-1 ring-white/15"><i class="fa-solid ${s.icon} text-[10px] text-amber-400" aria-hidden="true"></i>${escapeHTML(p.area)}</span>`
            + (p.assunto ? `<span class="inline-flex rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-blue-100 uppercase ring-1 ring-white/15">${escapeHTML(p.assunto)}</span>` : '');

        heroMeta.innerHTML = `<span class="inline-flex items-center gap-1.5"><i class="fa-regular fa-calendar text-xs text-amber-400" aria-hidden="true"></i>Publicado em ${escapeHTML(p.date)}</span>`
            + (p.numero ? `<span aria-hidden="true">·</span><span>Número ${escapeHTML(p.numero)}</span>` : '');

        detailEl.innerHTML = `
            <p class="border-l-4 border-amber-400 pl-4 text-base leading-relaxed text-slate-700 italic md:text-lg">${escapeHTML(p.summary)}</p>
            ${p.content
                ? `<div class="cf-prose mt-8">${p.content}</div>`
                : `<div class="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">O texto completo deste procedimento ainda não foi publicado no portal.</div>`}`;

        renderSumario();
        saveBtn.classList.remove('hidden');
        renderSaveBtn();
        // Abriu com #s3, por exemplo: rola até a seção depois de montar o texto
        if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    }

    // Sumário a partir dos <h2>/<h3> com id; destaca a seção visível
    function renderSumario() {
        const titulos = [...detailEl.querySelectorAll('.cf-prose h2[id], .cf-prose h3[id]')];
        if (titulos.length < 2) return;
        sumarioEl.innerHTML = titulos.map(h => `
            <li><a href="#${h.id}" data-alvo="${h.id}" class="block rounded-lg py-1.5 pr-2 leading-snug transition hover:bg-slate-50 hover:text-blue-800 ${h.tagName === 'H3' ? 'pl-6 text-[13px] text-slate-500' : 'pl-3 font-medium text-slate-700'}">${escapeHTML(h.textContent)}</a></li>`).join('');
        sumarioWrap.classList.remove('hidden');

        if (!('IntersectionObserver' in window)) return;
        const links = new Map([...sumarioEl.querySelectorAll('a')].map(a => [a.dataset.alvo, a]));
        let atual = null;
        const marcar = id => {
            if (id === atual) return;
            links.get(atual)?.classList.remove('bg-blue-50', 'text-blue-800');
            links.get(atual)?.removeAttribute('aria-current');
            const a = links.get(id);
            if (!a) return;
            a.classList.add('bg-blue-50', 'text-blue-800');
            a.setAttribute('aria-current', 'location');
            atual = id;
        };
        const obs = new IntersectionObserver(entradas => {
            const visiveis = entradas.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visiveis.length) marcar(visiveis[0].target.id);
        }, { rootMargin: '-120px 0px -65% 0px' });
        titulos.forEach(h => obs.observe(h));
    }

    function renderNotFound() {
        titleEl.textContent = 'Procedimento não encontrado';
        detailEl.innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <i class="fa-regular fa-file-lines mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                <p class="font-medium text-slate-700">Não encontramos este procedimento.</p>
                <p class="mt-1 text-sm text-slate-500">Ele pode ter sido removido ou o endereço está incompleto.</p>
                <a href="procedimentos.html" class="cf-btn cf-btn-primary mt-4 inline-flex">Ver todos os procedimentos</a>
            </div>`;
    }

    // Primeiro os da mesma área, depois os demais; mais recentes primeiro
    function renderRelated() {
        const p = item;
        const related = all
            .filter(x => x.id !== p.id)
            .sort((a, b) => (b.area === p.area) - (a.area === p.area) || b._iso.localeCompare(a._iso))
            .slice(0, 4);
        if (!related.length) return;
        relatedList.innerHTML = related.map(x => `
            <article class="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md">
                <div class="flex flex-wrap items-center gap-2">${badge(x)}<span class="text-xs text-slate-500">${escapeHTML([x.assunto, x.date].filter(Boolean).join(' · '))}</span></div>
                <h3 class="mt-2 leading-snug font-semibold text-slate-900">
                    <a href="${escapeHTML(urlOf(x))}" class="after:absolute after:inset-0 group-hover:text-blue-800">${escapeHTML(x.title)}</a>
                </h3>
                <p class="mt-1 line-clamp-2 text-sm text-slate-600">${escapeHTML(x.summary)}</p>
            </article>`).join('');
        relatedWrap.classList.remove('hidden');
    }

    // --- Procedimentos salvos (mesma chave da listagem) ---
    const SAVED_KEY = 'savedProcedimentos';
    const isSaved = id => readList(SAVED_KEY).some(s => s.id === id);
    function renderSaveBtn() {
        const saved = isSaved(item.id);
        saveBtn.setAttribute('aria-pressed', String(saved));
        saveBtn.title = saved ? 'Remover dos procedimentos salvos' : 'Salvar procedimento';
        saveBtn.innerHTML = `<i class="${saved ? 'fa-solid text-amber-500' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i><span>${saved ? 'Salvo' : 'Salvar'}</span>`;
    }
    function toggleSaved() {
        const p = item;
        let list = readList(SAVED_KEY);
        if (list.some(s => s.id === p.id)) list = list.filter(s => s.id !== p.id);
        else list.unshift({ id: p.id, title: p.title, link: urlOf(p), area: p.area, date: p.date });
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
            : '<li class="px-1 text-xs text-slate-500">Nenhum procedimento salvo. Use o botão <i class="fa-regular fa-bookmark" aria-hidden="true"></i> Salvar.</li>';
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
