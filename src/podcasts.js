// Podcast Cenofisco (podcasts.html): episódios por categoria, com o player do SoundCloud.
// Dados em podcasts.json: categorias (ordem da lateral) e episodios [{ id, titulo, categoria, data, duracao, url }].
// Parâmetros: categoria, q (busca) e ep (abre o player daquele episódio).
// Podcasts salvos: chave savedPodcasts (lateral e Meu Perfil › Meus documentos).
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
    const listaEl = $('pod-lista');
    const categoriasEl = $('pod-categorias');
    const buscaEl = $('pod-busca');
    const resumoEl = $('pod-resumo');
    const limparBtn = $('pod-limpar');
    if (!listaEl) return;

    const ICONES = {
        'Comércio Exterior': 'fa-earth-americas', 'Contabilidade': 'fa-calculator', 'Exportação': 'fa-plane-departure',
        'Federal': 'fa-landmark', 'ICMS e Outros': 'fa-truck-fast', 'Importação': 'fa-plane-arrival', 'Imposto de Renda': 'fa-coins',
        'IPI/IOF e Outros': 'fa-industry', 'ISS e Outros': 'fa-city', 'Reforma Tributária': 'fa-scale-balanced', 'Trabalhista e Previdência': 'fa-people-group'
    };
    const icone = c => ICONES[c] || 'fa-microphone';
    const escapeHTML = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalizar = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const chaveData = d => String(d || '').split('/').reverse().join('');
    // Player do SoundCloud para um episódio (só é carregado quando a pessoa pede para ouvir)
    const player = url => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%231e3a8a&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;

    let dados = null;
    const p = new URLSearchParams(location.search);
    const estado = { categoria: p.get('categoria') || '', q: p.get('q') || '', ep: p.get('ep') || '' };
    buscaEl.value = estado.q;

    fetch('podcasts.json')
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(j => {
            dados = j;
            dados.episodios.sort((a, b) => chaveData(b.data).localeCompare(chaveData(a.data)));
            if (!dados.categorias.includes(estado.categoria)) estado.categoria = '';
            if (dados.descricao) $('pod-descricao').textContent = dados.descricao;
            if (dados.perfil) $('pod-perfil').href = dados.perfil;
            $('pod-fonte').textContent = 'Episódios publicados no SoundCloud do Cenofisco.';
            render();
            renderSalvos();
            if (estado.ep) abrirPlayer(estado.ep, true);
        })
        .catch(() => { listaEl.innerHTML = '<li class="text-red-600">Não foi possível carregar os episódios.</li>'; });

    function filtrados(ignorarCategoria) {
        const termos = normalizar(estado.q).split(/\s+/).filter(Boolean);
        return dados.episodios.filter(e =>
            (ignorarCategoria || !estado.categoria || e.categoria === estado.categoria) &&
            termos.every(t => normalizar(`${e.titulo} ${e.categoria}`).includes(t)));
    }

    function render() {
        // Endereço compartilhável
        const url = new URL(location.href);
        ['categoria', 'q'].forEach(k => (estado[k] ? url.searchParams.set(k, estado[k]) : url.searchParams.delete(k)));
        history.replaceState(null, '', url);

        // Categorias (todas, mesmo sem episódios, na ordem do arquivo)
        const base = filtrados(true);
        const linha = (valor, rotulo, n, ic) => {
            const on = estado.categoria === valor;
            return `<li><button type="button" data-categoria="${escapeHTML(valor)}" aria-pressed="${on}" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'} ${n === 0 && !on ? 'opacity-50' : ''}">
                <span class="flex min-w-0 items-center gap-2.5"><i class="fa-solid ${ic} w-4 shrink-0 text-center text-xs ${on ? 'text-blue-700' : 'text-slate-400'}" aria-hidden="true"></i><span class="truncate">${escapeHTML(rotulo)}</span></span>
                <span class="text-xs ${on ? 'text-blue-700' : 'text-slate-400'}">${n}</span>
            </button></li>`;
        };
        categoriasEl.innerHTML = linha('', 'Todas', base.length, 'fa-layer-group')
            + dados.categorias.map(c => linha(c, c, base.filter(e => e.categoria === c).length, icone(c))).join('');

        const itens = filtrados(false);
        limparBtn.classList.toggle('hidden', !(estado.categoria || estado.q));
        resumoEl.textContent = `${itens.length} ${itens.length === 1 ? 'episódio' : 'episódios'}${estado.categoria ? ` · ${estado.categoria}` : ''}`;

        if (!itens.length) {
            listaEl.innerHTML = `
                <li class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <i class="fa-solid fa-microphone-slash mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                    <p class="font-medium text-slate-700">${estado.categoria && !estado.q ? `Ainda não há episódios de ${escapeHTML(estado.categoria)}.` : 'Nenhum episódio encontrado.'}</p>
                    <p class="mt-1 text-sm text-slate-500">${estado.categoria && !estado.q ? 'Escolha outra categoria ou veja todos os episódios.' : 'Tente outro termo ou limpe os filtros.'}</p>
                </li>`;
            return;
        }
        listaEl.innerHTML = itens.map(e => `
            <li id="ep-${escapeHTML(e.id)}" class="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="flex items-start gap-4">
                    <button type="button" class="pod-ouvir inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-amber-400 text-blue-950 shadow transition hover:bg-amber-300" data-ep="${escapeHTML(e.id)}" aria-expanded="false" aria-controls="player-${escapeHTML(e.id)}" aria-label="Ouvir: ${escapeHTML(e.titulo)}">
                        <i class="fa-solid fa-play ml-0.5" aria-hidden="true"></i>
                    </button>
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <button type="button" data-categoria="${escapeHTML(e.categoria)}" class="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 font-semibold tracking-wide text-blue-800 uppercase hover:bg-blue-100"><i class="fa-solid ${icone(e.categoria)} text-[10px]" aria-hidden="true"></i>${escapeHTML(e.categoria)}</button>
                            <span class="text-slate-500"><i class="fa-regular fa-calendar mr-1" aria-hidden="true"></i>${escapeHTML(e.data)}</span>
                            <span class="text-slate-500"><i class="fa-regular fa-clock mr-1" aria-hidden="true"></i>${escapeHTML(e.duracao)}</span>
                        </div>
                        <h2 class="mt-1.5 leading-snug font-semibold text-slate-900">${escapeHTML(e.titulo)}</h2>
                        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <button type="button" class="pod-compartilhar cursor-pointer font-medium text-blue-700 hover:underline" data-ep="${escapeHTML(e.id)}"><i class="fa-solid fa-share-nodes mr-1 text-xs" aria-hidden="true"></i>Compartilhar</button>
                            <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener" class="font-medium text-blue-700 hover:underline"><i class="fa-brands fa-soundcloud mr-1 text-xs" aria-hidden="true"></i>Abrir no SoundCloud<span class="sr-only"> (abre em nova aba)</span></a>
                        </div>
                    </div>
                    ${botaoSalvar(e)}
                </div>
                <div id="player-${escapeHTML(e.id)}" class="mt-4 hidden"></div>
            </li>`).join('');
    }

    // Abre (ou fecha) o player de um episódio; só um toca por vez
    function abrirPlayer(id, rolar) {
        const ep = dados.episodios.find(e => e.id === id);
        const caixa = $(`player-${id}`);
        if (!ep || !caixa) return;
        const btn = listaEl.querySelector(`.pod-ouvir[data-ep="${CSS.escape(id)}"]`);
        const aberto = !caixa.classList.contains('hidden');
        listaEl.querySelectorAll('[id^="player-"]').forEach(c => { c.classList.add('hidden'); c.innerHTML = ''; });
        listaEl.querySelectorAll('.pod-ouvir').forEach(b => { b.setAttribute('aria-expanded', 'false'); b.innerHTML = '<i class="fa-solid fa-play ml-0.5" aria-hidden="true"></i>'; });
        if (aberto) return;
        caixa.innerHTML = `<iframe title="Player: ${escapeHTML(ep.titulo)}" width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" loading="lazy" class="rounded-xl" src="${player(ep.url)}"></iframe>`;
        caixa.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        btn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        btn.setAttribute('aria-label', `Fechar o player: ${ep.titulo}`);
        if (rolar) $(`ep-${id}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Podcasts salvos (chave savedPodcasts; aparecem também em Meu Perfil › Meus documentos) ---
    const SALVOS = 'savedPodcasts';
    const lerSalvos = () => { try { const l = JSON.parse(localStorage.getItem(SALVOS)); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarSalvos = l => { try { localStorage.setItem(SALVOS, JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const salvo = id => lerSalvos().some(s => s.id === id);
    function botaoSalvar(e) {
        const on = salvo(e.id);
        return `<button type="button" class="pod-salvar -mt-1 -mr-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition ${on ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}" data-ep="${escapeHTML(e.id)}" aria-pressed="${on}" aria-label="${on ? 'Remover dos salvos' : 'Salvar'}: ${escapeHTML(e.titulo)}" title="${on ? 'Remover dos podcasts salvos' : 'Salvar podcast'}"><i class="${on ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i></button>`;
    }
    function alternarSalvo(id) {
        const e = dados.episodios.find(x => x.id === id);
        if (!e) return;
        let lista = lerSalvos();
        if (lista.some(s => s.id === id)) lista = lista.filter(s => s.id !== id);
        else lista.unshift({ id: e.id, title: e.titulo, link: `podcasts.html?ep=${encodeURIComponent(e.id)}`, area: e.categoria, date: e.data, duracao: e.duracao });
        gravarSalvos(lista);
        const atual = listaEl.querySelector(`.pod-salvar[data-ep="${CSS.escape(id)}"]`);
        if (atual) { atual.outerHTML = botaoSalvar(e); listaEl.querySelector(`.pod-salvar[data-ep="${CSS.escape(id)}"]`)?.focus(); }
        renderSalvos();
    }
    function renderSalvos() {
        const el = $('pod-salvos');
        if (!el) return;
        const lista = lerSalvos();
        el.innerHTML = lista.length
            ? lista.map(s => `
                <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                    <a href="${escapeHTML(s.link)}" data-ep="${escapeHTML(s.id)}" class="pod-ir min-w-0 flex-1 px-2 py-1.5" title="${escapeHTML(s.title)}">
                        <span class="line-clamp-2 text-slate-700 group-hover:text-blue-800">${escapeHTML(s.title)}</span>
                        <span class="block text-[11px] text-slate-400">${escapeHTML([s.area, s.date].filter(Boolean).join(' · '))}</span>
                    </a>
                    <button type="button" class="pod-remover mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-ep="${escapeHTML(s.id)}" aria-label="Remover ${escapeHTML(s.title)}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </li>`).join('')
            : '<li class="px-1 text-xs text-slate-500">Nenhum podcast salvo. Use o ícone <i class="fa-regular fa-bookmark" aria-hidden="true"></i> em cada episódio.</li>';
    }
    $('pod-salvos')?.addEventListener('click', e => {
        const rem = e.target.closest('.pod-remover');
        if (rem) { alternarSalvo(rem.dataset.ep); return; }
        // Episódio salvo: abre o player nesta mesma página (mostrando todas as categorias)
        const ir = e.target.closest('.pod-ir');
        if (ir && dados) {
            e.preventDefault();
            buscaEl.value = '';
            setEstado({ categoria: '', q: '' });
            abrirPlayer(ir.dataset.ep, true);
        }
    });

    // --- Eventos ---
    const setEstado = mud => { Object.assign(estado, mud); render(); };
    categoriasEl.addEventListener('click', e => {
        const b = e.target.closest('[data-categoria]');
        if (b) setEstado({ categoria: b.dataset.categoria });
    });
    listaEl.addEventListener('click', async e => {
        const cat = e.target.closest('[data-categoria]');
        if (cat) { setEstado({ categoria: cat.dataset.categoria }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        const sal = e.target.closest('.pod-salvar');
        if (sal) { alternarSalvo(sal.dataset.ep); return; }
        const ouvir = e.target.closest('.pod-ouvir');
        if (ouvir) { abrirPlayer(ouvir.dataset.ep, false); return; }
        const comp = e.target.closest('.pod-compartilhar');
        if (comp) {
            const ep = dados.episodios.find(x => x.id === comp.dataset.ep);
            const url = `${location.origin}${location.pathname}?ep=${encodeURIComponent(ep.id)}`;
            try {
                if (navigator.share) await navigator.share({ title: ep.titulo, url });
                else if (navigator.clipboard) { await navigator.clipboard.writeText(url); comp.innerHTML = '<i class="fa-solid fa-check mr-1 text-xs" aria-hidden="true"></i>Link copiado'; }
            } catch (_) { /* compartilhamento cancelado */ }
        }
    });
    let timer = null;
    buscaEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => setEstado({ q: buscaEl.value.trim() }), 200); });
    limparBtn.addEventListener('click', () => { buscaEl.value = ''; setEstado({ categoria: '', q: '' }); });
});
