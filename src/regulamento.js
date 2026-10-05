// Páginas de regulamento (ex.: regulamento-pr.html, regulamento-pr-livro-1.html …)
//
// O regulamento pode ser dividido em várias páginas (uma por Livro, Anexos etc.).
// A lista das partes de 1º nível e a página de cada uma ficam num JSON indicado no <article>:
//     data-regulamento-estrutura="regulamento-pr.json"
//
// Marcação esperada dentro de .reg-body (conteúdo da página atual):
//   - Níveis: elemento com data-nivel e id único
//       data-nivel="decreto | livro | titulo | subtitulo | capitulo | secao | anexo"
//       <span class="reg-num">Livro I</span><span class="reg-nome">Denominação</span>
//   - Artigos: <div id="art-N" data-art="N" class="artigo"> … </div>
//
// O índice mostra o regulamento inteiro: a parte desta página em detalhe (Títulos, Subtítulos e
// faixas de artigos) e as demais como links para as suas páginas. "Ir para o artigo" abre a
// página certa. Também monta a barra de localização, a navegação anterior/próxima e os
// cartões da capa. "Salvar documento" usa a lista de regulamentos salvos de regulamentos.html.
document.addEventListener('DOMContentLoaded', async function () {
    const body = document.querySelector('.reg-body');
    const indexList = document.getElementById('index-list');
    if (!body || !indexList) return;

    const docEl = document.querySelector('[data-regulamento-id]');
    const indexEmpty = document.getElementById('index-empty');
    const indexSearch = document.getElementById('index-search');
    const indexToggle = document.getElementById('index-toggle');
    const indexBody = document.getElementById('index-body');
    const contextBar = document.getElementById('reg-context');
    const pager = document.getElementById('reg-pager');
    const partsGrid = document.getElementById('reg-partes');
    const jumpForm = document.getElementById('art-jump');
    const jumpInput = document.getElementById('art-jump-input');
    const jumpMsg = document.getElementById('art-jump-msg');
    const desktop = window.matchMedia('(min-width: 1024px)');
    const currentPage = decodeURIComponent(location.pathname.split('/').pop() || '');

    // Profundidade de cada nível (decreto, livro e anexo ficam no primeiro nível)
    const RANK = { decreto: 1, livro: 1, anexo: 1, titulo: 2, subtitulo: 3, capitulo: 4, secao: 5 };
    const LEVEL_STYLE = {
        1: 'font-semibold text-slate-900',
        2: 'font-medium text-slate-800',
        3: 'text-slate-700',
        4: 'text-slate-600',
        5: 'text-slate-600'
    };

    const artLabel = n => (n <= 9 ? `${n}º` : `${n}`);
    const cleanText = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rangeText = (first, last) => {
        if (first == null) return '';
        return first === last ? `Art. ${artLabel(first)}` : `Arts. ${artLabel(first)} a ${artLabel(last)}`;
    };

    // --- 1. Estrutura geral (JSON) ---
    let estrutura = null;
    const jsonFile = docEl?.dataset.regulamentoEstrutura;
    if (jsonFile) {
        try {
            const res = await fetch(jsonFile);
            if (res.ok) estrutura = await res.json();
        } catch (e) {
            console.warn('Não foi possível carregar a estrutura do regulamento:', e);
        }
    }
    const partes = estrutura?.partes || [];
    const isCurrentPage = pagina => pagina === currentPage || (!currentPage && pagina === estrutura?.capa);

    // --- 2. Lê a parte desta página (em ordem) ---
    const nodes = [];      // nós locais
    const articles = [];   // { n, el, path: [nós] }
    const localRoots = [];
    const stack = [];

    body.querySelectorAll('[data-nivel][id], [data-art]').forEach(el => {
        if (el.hasAttribute('data-art')) {
            const n = parseInt(el.dataset.art, 10);
            const path = stack.slice();
            path.forEach(node => {
                node.artFirst = node.artFirst ?? n;
                node.artLast = n;
            });
            articles.push({ n, el, path });
            return;
        }
        const rank = RANK[el.dataset.nivel] || 5;
        const node = {
            id: el.id,
            el,
            rank,
            num: cleanText(el.querySelector('.reg-num')) || cleanText(el),
            nome: cleanText(el.querySelector('.reg-nome')),
            children: [],
            parent: null,
            artFirst: null,
            artLast: null
        };
        el.classList.add('scroll-mt-8');
        while (stack.length && stack[stack.length - 1].rank >= rank) stack.pop();
        node.parent = stack[stack.length - 1] || null;
        (node.parent ? node.parent.children : localRoots).push(node);
        stack.push(node);
        nodes.push(node);
    });
    const byId = new Map(nodes.map(n => [n.id, n]));
    const articleByNumber = new Map(articles.map(a => [a.n, a]));

    // --- 3. Monta o índice ---
    function linkInner(num, nome, range, extra = '') {
        return `
            <span class="flex items-center justify-between gap-2"><span>${escapeHTML(num)}</span>${extra}</span>
            ${nome ? `<span class="block text-xs font-normal text-slate-500">${escapeHTML(nome)}</span>` : ''}
            ${range ? `<span class="mt-0.5 block text-[11px] font-normal text-blue-700/80">${range}</span>` : ''}
        `;
    }

    function buildItem(node) {
        const li = document.createElement('li');
        li.dataset.node = node.id;

        const row = document.createElement('div');
        row.className = 'flex items-start gap-0.5';

        if (node.children.length) {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'node-toggle mt-1.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', `Expandir ${node.num}`);
            toggle.innerHTML = '<i class="fa-solid fa-chevron-right text-[10px] transition-transform" aria-hidden="true"></i>';
            row.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'size-6 shrink-0';
            row.appendChild(spacer);
        }

        const a = document.createElement('a');
        a.href = `#${node.id}`;
        a.dataset.target = node.id;
        a.className = `node-link min-w-0 flex-1 rounded-lg px-2 py-1.5 leading-snug transition hover:bg-slate-50 hover:text-blue-900 ${LEVEL_STYLE[node.rank]}`;
        a.innerHTML = linkInner(node.num, node.nome, rangeText(node.artFirst, node.artLast));
        row.appendChild(a);
        li.appendChild(row);

        if (node.children.length) {
            const ol = document.createElement('ol');
            ol.className = 'node-children ml-3 hidden space-y-0.5 border-l border-slate-200 pl-1';
            node.children.forEach(child => ol.appendChild(buildItem(child)));
            li.appendChild(ol);
        }
        node.li = li;
        node.link = a;
        return li;
    }

    // Parte que está em outra página: vira um link para aquela página
    function buildRemoteItem(parte) {
        const node = { id: parte.id, num: parte.num, nome: parte.nome, children: [], parent: null, remote: true };
        const li = document.createElement('li');
        li.dataset.node = parte.id;
        li.innerHTML = `
            <div class="flex items-start gap-0.5">
                <span class="size-6 shrink-0"></span>
                <a href="${escapeHTML(parte.pagina)}#${escapeHTML(parte.id)}" class="min-w-0 flex-1 rounded-lg px-2 py-1.5 leading-snug transition hover:bg-slate-50 hover:text-blue-900 ${LEVEL_STYLE[1]}" title="Abrir ${escapeHTML(parte.num)}">
                    ${linkInner(parte.num, parte.nome, parte.arts ? rangeText(parte.arts[0], parte.arts[1]) : '', '<i class="fa-solid fa-arrow-right text-[10px] text-slate-300" aria-hidden="true"></i>')}
                </a>
            </div>`;
        node.li = li;
        node.link = li.querySelector('a');
        return node;
    }

    // Itens de 1º nível do índice, na ordem do JSON (ou só os desta página, sem JSON)
    const topNodes = [];
    if (partes.length) {
        partes.forEach(parte => {
            const local = byId.get(parte.id);
            if (local && !local.parent) {
                indexList.appendChild(buildItem(local));
                local.li.classList.add('rounded-lg', 'bg-blue-50/40');
                topNodes.push(local);
            } else if (!isCurrentPage(parte.pagina)) {
                const remote = buildRemoteItem(parte);
                indexList.appendChild(remote.li);
                topNodes.push(remote);
            }
        });
        // Partes desta página que não estão no JSON também aparecem
        localRoots.filter(r => !topNodes.includes(r)).forEach(r => {
            indexList.appendChild(buildItem(r));
            topNodes.push(r);
        });
    } else {
        localRoots.forEach(r => { indexList.appendChild(buildItem(r)); topNodes.push(r); });
    }

    // --- 4. Abrir/fechar nós ---
    function setExpanded(node, open) {
        const ol = node.li?.querySelector(':scope > ol');
        const toggle = node.li?.querySelector(':scope > div > .node-toggle');
        if (!ol || !toggle) return;
        ol.classList.toggle('hidden', !open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', `${open ? 'Recolher' : 'Expandir'} ${node.num}`);
        toggle.querySelector('i').classList.toggle('rotate-90', open);
    }
    function expandPath(node) {
        for (let n = node?.parent; n; n = n.parent) setExpanded(n, true);
    }
    function setAll(open) {
        nodes.forEach(n => setExpanded(n, open));
        if (!open && activeNode) expandPath(activeNode);
    }

    indexList.addEventListener('click', e => {
        const toggle = e.target.closest('.node-toggle');
        if (toggle) {
            const node = byId.get(toggle.closest('li').dataset.node);
            setExpanded(node, toggle.getAttribute('aria-expanded') !== 'true');
            return;
        }
        const link = e.target.closest('.node-link');
        if (link) {
            const node = byId.get(link.dataset.target);
            setActive(node, null);
            setExpanded(node, true);
            ignoreScrollUntil = Date.now() + 1000;
            if (!desktop.matches) setIndexOpen(false);
        }
    });
    document.getElementById('index-expand')?.addEventListener('click', () => setAll(true));
    document.getElementById('index-collapse')?.addEventListener('click', () => setAll(false));

    // --- 5. Posição atual: destaque no índice + barra de localização ---
    let activeNode = null;
    let activeArticle = null;
    let ignoreScrollUntil = 0;

    function setActive(node, article) {
        if (node !== activeNode) {
            activeNode?.link?.classList.remove('bg-blue-50', 'text-blue-700');
            activeNode?.link?.removeAttribute('aria-current');
            activeNode = node;
            if (node?.link) {
                node.link.classList.add('bg-blue-50', 'text-blue-700');
                node.link.setAttribute('aria-current', 'location');
                if (!indexSearch?.value) expandPath(node);
                if (desktop.matches) node.link.scrollIntoView({ block: 'nearest' });
            }
        }
        activeArticle = article;
        renderContext();
    }

    function renderContext() {
        if (!contextBar) return;
        const parts = [];
        for (let n = activeNode; n; n = n.parent) parts.unshift(n);
        const sep = '<i class="fa-solid fa-chevron-right text-[8px] text-slate-300" aria-hidden="true"></i>';
        const html = parts.map(n => `<a href="#${n.id}" class="font-medium text-slate-600 hover:text-blue-800">${escapeHTML(n.num)}</a>`);
        if (activeArticle) html.push(`<span class="font-semibold text-blue-800">Art. ${artLabel(activeArticle.n)}</span>`);
        contextBar.innerHTML = html.length
            ? '<span class="mr-1 text-slate-400">Você está em:</span>' + html.join(sep)
            : '<span class="text-slate-400">Início do documento</span>';
    }

    const OFFSET = 190; // cabeçalho fixo + barra de localização + folga
    function updateFromScroll() {
        if (Date.now() < ignoreScrollUntil) return;
        let node = null;
        for (const n of nodes) {
            if (n.el.getBoundingClientRect().top - OFFSET <= 0) node = n; else break;
        }
        let article = null;
        for (const a of articles) {
            if (a.el.getBoundingClientRect().top - OFFSET <= 0) article = a; else break;
        }
        // No fim da página, a última seção pode não conseguir chegar ao topo: vale a última visível
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        if (atBottom) {
            for (const n of nodes) {
                if (n.el.getBoundingClientRect().top < window.innerHeight) node = n;
            }
        }
        if (article && node && !article.path.includes(node)) article = null;
        setActive(node || nodes[0] || null, article);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { updateFromScroll(); ticking = false; });
    }, { passive: true });

    // --- 6. Ir para o artigo (nesta página ou na página do Livro certo) ---
    function showJumpMessage(text) {
        jumpMsg.textContent = text;
        jumpMsg.classList.remove('hidden');
    }
    jumpForm?.addEventListener('submit', e => {
        e.preventDefault();
        const n = parseInt(jumpInput.value, 10);
        if (Number.isNaN(n)) return showJumpMessage('Informe o número do artigo.');

        const article = articleByNumber.get(n);
        if (!article) {
            const parte = partes.find(p => p.arts && n >= p.arts[0] && n <= p.arts[1]);
            if (parte && !isCurrentPage(parte.pagina)) {
                location.href = `${parte.pagina}#art-${n}`;
                return;
            }
            return showJumpMessage(`Art. ${artLabel(n)} não encontrado neste regulamento.`);
        }
        jumpMsg.classList.add('hidden');
        const node = article.path[article.path.length - 1] || null;
        setActive(node, article);
        ignoreScrollUntil = Date.now() + 1200;
        history.replaceState(null, '', `#${article.el.id}`);
        article.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        flash(article.el);
        if (!desktop.matches) setIndexOpen(false);
    });
    jumpInput?.addEventListener('input', () => jumpMsg?.classList.add('hidden'));

    function flash(el) {
        el.classList.add('bg-amber-50');
        setTimeout(() => el.classList.remove('bg-amber-50'), 2000);
    }

    // --- 7. Busca no índice (mostra o item encontrado e os níveis acima dele) ---
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    // Cada palavra digitada precisa aparecer no item. Numeral romano depois de outra palavra
    // ("anexo ii", "titulo iii") precisa ser a palavra exata, para "ii" não trazer "iii".
    function matchesTerm(text, tokens) {
        const words = normalize(text).split(/[^a-z0-9º]+/).filter(Boolean);
        const full = normalize(text);
        return tokens.every((tok, i) => {
            if (i > 0 && /^[ivxlcdm]+$/.test(tok)) return words.includes(tok);
            return full.includes(tok);
        });
    }
    let expandedBeforeSearch = null;
    indexSearch?.addEventListener('input', () => {
        const term = normalize(indexSearch.value.trim());
        const tokens = term.split(/\s+/).filter(Boolean);
        if (term && !expandedBeforeSearch) {
            expandedBeforeSearch = new Set(nodes.filter(n => n.li.querySelector(':scope > div > .node-toggle')?.getAttribute('aria-expanded') === 'true'));
        }

        let visible = 0;
        const showSubtree = node => {
            node.li.hidden = false;
            node.children.forEach(showSubtree);
        };
        const matches = node => {
            const self = !term || matchesTerm(`${node.num} ${node.nome}`, tokens);
            let childMatch = false;
            node.children.forEach(c => { if (matches(c)) childMatch = true; });
            if (self && term) node.children.forEach(showSubtree);
            const show = self || childMatch;
            node.li.hidden = !show;
            if (show && term) setExpanded(node, childMatch || self);
            if (show) visible++;
            return show;
        };
        topNodes.forEach(matches);

        if (!term && expandedBeforeSearch) {
            nodes.forEach(n => setExpanded(n, expandedBeforeSearch.has(n)));
            if (activeNode) expandPath(activeNode);
            expandedBeforeSearch = null;
        }
        indexEmpty?.classList.toggle('hidden', visible > 0);
    });

    // --- 8. Navegação anterior/próxima e cartões da capa ---
    // Agrupa as partes por página, na ordem do JSON (ex.: os Anexos ficam numa página só)
    const pages = [];
    partes.forEach(p => {
        let page = pages.find(x => x.pagina === p.pagina);
        if (!page) pages.push(page = { pagina: p.pagina, partes: [] });
        page.partes.push(p);
    });
    const pageLabel = page => {
        const first = page.partes[0];
        if (page.pagina === estrutura?.capa) return { num: 'Apresentação', nome: first.num };
        if (page.partes.length > 1) {
            const last = page.partes[page.partes.length - 1];
            return { num: first.nivel === 'anexo' ? 'Anexos' : first.num, nome: `${first.num} a ${last.num}` };
        }
        return { num: first.num, nome: first.nome };
    };

    if (pager && pages.length > 1) {
        const i = pages.findIndex(p => isCurrentPage(p.pagina));
        const card = (page, dir) => {
            if (!page) return '<span class="hidden sm:block"></span>';
            const { num, nome } = pageLabel(page);
            const next = dir === 'next';
            return `
                <a href="${escapeHTML(page.pagina)}" class="group flex items-center gap-4 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40 ${next ? 'sm:col-start-2 sm:justify-end sm:text-right' : ''}">
                    ${next ? '' : '<span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition group-hover:bg-blue-100"><i class="fa-solid fa-arrow-left text-sm" aria-hidden="true"></i></span>'}
                    <span class="min-w-0">
                        <span class="block text-[11px] text-slate-500">${next ? 'Próximo' : 'Anterior'}</span>
                        <span class="block font-semibold text-slate-900">${escapeHTML(num)}</span>
                        <span class="block truncate text-xs text-slate-500">${escapeHTML(nome)}</span>
                    </span>
                    ${next ? '<span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition group-hover:bg-blue-100"><i class="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></span>' : ''}
                </a>`;
        };
        if (i !== -1) pager.innerHTML = card(pages[i - 1], 'prev') + card(pages[i + 1], 'next');
    }

    if (partsGrid) {
        partsGrid.innerHTML = partes.filter(p => !isCurrentPage(p.pagina)).map(p => `
            <a href="${escapeHTML(p.pagina)}#${escapeHTML(p.id)}" class="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40">
                <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${p.nivel === 'anexo' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-700'}"><i class="fa-solid ${p.nivel === 'anexo' ? 'fa-paperclip' : 'fa-book'} text-sm" aria-hidden="true"></i></span>
                <span class="min-w-0 flex-1">
                    <span class="block font-semibold text-slate-900 group-hover:text-blue-800">${escapeHTML(p.num)}</span>
                    <span class="block text-sm text-slate-500">${escapeHTML(p.nome)}</span>
                    ${p.arts ? `<span class="mt-1 block text-xs text-blue-700/80">${rangeText(p.arts[0], p.arts[1])}</span>` : ''}
                </span>
                <i class="fa-solid fa-arrow-right mt-1 text-xs text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true"></i>
            </a>`).join('');
    }

    // --- 9. Índice recolhível no celular ---
    function setIndexOpen(open) {
        if (!indexToggle || !indexBody) return;
        indexToggle.setAttribute('aria-expanded', String(open));
        indexBody.classList.toggle('hidden', !open);
        indexBody.classList.toggle('flex', open);
        indexToggle.querySelector('.fa-chevron-down')?.classList.toggle('rotate-180', open);
    }
    indexToggle?.addEventListener('click', () => {
        setIndexOpen(indexToggle.getAttribute('aria-expanded') !== 'true');
    });

    // --- 10. Salvar documento (mesma lista de regulamentos.html) ---
    const saveBtn = document.getElementById('save-doc-btn');
    const storageKey = 'savedRegulations';
    const readSaved = () => {
        try {
            const data = JSON.parse(localStorage.getItem(storageKey));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    };
    const writeSaved = list => {
        try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch (e) { /* navegador sem armazenamento */ }
    };

    if (docEl && saveBtn) {
        const doc = {
            id: docEl.dataset.regulamentoId,
            title: docEl.dataset.regulamentoTitle,
            link: docEl.dataset.regulamentoLink
        };
        const isSaved = () => readSaved().some(r => r.title === doc.title);
        const render = () => {
            const saved = isSaved();
            saveBtn.setAttribute('aria-pressed', String(saved));
            saveBtn.innerHTML = saved
                ? '<i class="fa-solid fa-bookmark" aria-hidden="true"></i><span>Salvo</span>'
                : '<i class="fa-regular fa-bookmark" aria-hidden="true"></i><span>Salvar documento</span>';
            saveBtn.title = saved ? 'Remover dos regulamentos salvos' : 'Salvar nos regulamentos salvos';
        };
        saveBtn.addEventListener('click', () => {
            const list = readSaved().filter(r => r.title !== doc.title);
            if (!isSaved()) list.unshift(doc);
            writeSaved(list);
            render();
        });
        render();
    }

    // --- Estado inicial: abre as partes desta página e respeita #art-N / #id do endereço ---
    localRoots.forEach(r => setExpanded(r, true));
    const hash = decodeURIComponent(location.hash.slice(1));
    const hashArt = /^art-(\d+)$/.exec(hash);
    if (hashArt && articleByNumber.get(+hashArt[1])) {
        const a = articleByNumber.get(+hashArt[1]);
        setActive(a.path[a.path.length - 1] || null, a);
        flash(a.el);
    } else if (byId.get(hash)) {
        setActive(byId.get(hash), null);
    } else {
        updateFromScroll();
    }
});
