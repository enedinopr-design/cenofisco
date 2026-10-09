// Tabela Prática (tabela.html?id=...): modelo único para as tabelas práticas.
// Cada tabela é um arquivo em tabelas/<id>.json com: titulo, tituloCurto, area, publicado, atualizado,
// introducao (HTML), colunas [{campo, titulo, numero, sufixo, destaque, classe}], notas,
// exemplo/avisoExemplo (dados de demonstração) e o conteúdo em um destes formatos:
//   - linhas: [...] (tabela única), com filtro opcional {campo, rotulo};
//   - tipo "porEstado" + estados: { "PR": { nome, linhas: [...] }, ... } — uma tabela por UF,
//     escolhida na página (parâmetro uf; estadoPadrao quando não informado).
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
    const tituloEl = $('tabela-titulo');
    const metaEl = $('tabela-meta');
    const crumbEl = $('tabela-crumb');
    const avisoEl = $('tabela-aviso');
    const introEl = $('tabela-intro');
    const subtituloEl = $('tabela-subtitulo');
    const estadosWrap = $('tabela-estados-wrap');
    const estadosEl = $('tabela-estados');
    const buscaEl = $('tabela-busca');
    const filtroEl = $('tabela-filtro');
    const filtroWrap = $('tabela-filtro-wrap');
    const resumoEl = $('tabela-resumo');
    const corpoEl = $('tabela-corpo');
    const notasEl = $('tabela-notas');
    if (!corpoEl) return;

    const escapeHTML = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalizar = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '';
    let dados = null;
    let porEstado = false;
    let uf = '';

    if (!/^[a-z0-9-]+$/.test(id)) return naoEncontrada();
    fetch(`tabelas/${id}.json`)
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(j => { dados = j; montar(); })
        .catch(naoEncontrada);

    function naoEncontrada() {
        tituloEl.textContent = 'Tabela não encontrada';
        corpoEl.closest('section').innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <i class="fa-solid fa-table mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                <p class="font-medium text-slate-700">Esta tabela prática ainda não está disponível.</p>
                <a href="index.html#titulo-tabelas" class="cf-btn cf-btn-primary mt-4 inline-flex">Ver tabelas práticas</a>
            </div>`;
    }

    function montar() {
        document.title = `${dados.tituloCurto || dados.titulo} - Cenofisco`;
        tituloEl.textContent = dados.titulo;
        crumbEl.textContent = dados.tituloCurto || dados.titulo;
        metaEl.innerHTML = [
            dados.area ? `<span class="inline-flex rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-white/15">${escapeHTML(dados.area)}</span>` : '',
            dados.publicado ? `<span class="inline-flex items-center gap-1.5"><i class="fa-regular fa-calendar text-xs text-amber-400" aria-hidden="true"></i>Publicado em ${escapeHTML(dados.publicado)}</span>` : '',
            dados.atualizado ? `<span>Atualizado em ${escapeHTML(dados.atualizado)}</span>` : ''
        ].filter(Boolean).join('');

        if (dados.exemplo) {
            avisoEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation mt-0.5 text-amber-600" aria-hidden="true"></i><p><strong>Dados de demonstração.</strong> ${escapeHTML(dados.avisoExemplo || 'Confira os valores antes de utilizar.')}</p>`;
            avisoEl.classList.remove('hidden');
        }
        introEl.innerHTML = dados.introducao || '';
        introEl.closest('section').classList.toggle('hidden', !dados.introducao);

        $('tabela-cabecalho').innerHTML = `<tr>${dados.colunas.map(c => `<th scope="col"${c.numero ? ' class="cf-num"' : ''}>${escapeHTML(c.titulo)}</th>`).join('')}</tr>`;

        porEstado = dados.tipo === 'porEstado' && dados.estados;
        if (porEstado) {
            // Uma tabela por estado: botões das UFs (em ordem alfabética pelo nome)
            const ufs = Object.keys(dados.estados).sort((a, b) => dados.estados[a].nome.localeCompare(dados.estados[b].nome, 'pt-BR'));
            uf = dados.estados[params.get('uf')] ? params.get('uf') : (dados.estados[dados.estadoPadrao] ? dados.estadoPadrao : ufs[0]);
            estadosEl.innerHTML = ufs.map(u => `<button type="button" data-uf="${u}" title="${escapeHTML(dados.estados[u].nome)}" aria-label="${escapeHTML(dados.estados[u].nome)}" class="h-10 cursor-pointer rounded-lg border text-sm font-bold transition">${u}</button>`).join('');
            estadosWrap.classList.remove('hidden');
            buscaEl.placeholder = 'Buscar operação ou base legal';
        } else if (dados.filtro) {
            const valores = [...new Set(dados.linhas.map(l => l[dados.filtro.campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
            $('tabela-filtro-rotulo').textContent = dados.filtro.rotulo;
            filtroEl.innerHTML = '<option value="">Todas</option>' + valores.map(v => `<option>${escapeHTML(v)}</option>`).join('');
            filtroWrap.classList.remove('hidden');
            if (params.get('f')) filtroEl.value = params.get('f');
        }

        // Sem filtro, a busca ocupa a largura toda
        if (filtroWrap.classList.contains('hidden')) $('tabela-form').classList.remove('sm:grid-cols-[1fr_14rem]');

        notasEl.innerHTML = (dados.notas || []).map(n => `<li>${escapeHTML(n)}</li>`).join('');
        notasEl.closest('div').classList.toggle('hidden', !(dados.notas || []).length);

        if (dados.resumo?.length) $('tabela-form').insertAdjacentHTML('beforebegin', quadrosResumo(dados.resumo));

        buscaEl.value = params.get('q') || '';
        render();
        renderSecoes();
    }

    // --- Células e quadros (usados pela tabela principal e pelas complementares) ---
    const valor = (c, v) => {
        if (v === null || v === undefined || v === '') return '<span class="text-slate-400" title="Não informado">—</span>';
        return escapeHTML(v) + (c.sufixo || '');
    };
    // Conteúdo: texto simples ou HTML do próprio arquivo da tabela (c.html), subtexto (c.sub)
    // e a "Nota Cenofisco" da linha (c.nota)
    const celula = (c, l) => {
        let v = c.html && l[c.campo] ? `<div class="space-y-1.5">${l[c.campo]}</div>` : valor(c, l[c.campo]);
        if (c.sub && l[c.sub] && l[c.campo] != null) v += `<span class="block text-[11px] font-normal whitespace-nowrap text-slate-500">${escapeHTML(l[c.sub])}</span>`;
        if (c.nota && l[c.nota]) v += `<div class="mt-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950"><strong>Nota Cenofisco:</strong> ${escapeHTML(l[c.nota])}</div>`;
        return v;
    };
    // Coluna com "variacao" (nome do campo numérico da linha): positivo em verde (▲), negativo em vermelho (▼)
    const corVariacao = v => (v > 0.005 ? 'text-emerald-700' : v < -0.005 ? 'text-red-700' : 'text-slate-600');
    const setaVariacao = v => (v > 0.005 ? 'fa-caret-up' : v < -0.005 ? 'fa-caret-down' : 'fa-minus');
    const td = (c, l) => {
        const cls = [c.numero ? 'cf-num tabular-nums' : '', c.destaque ? 'font-semibold text-slate-900' : '', c.classe || ''];
        const v = c.variacao ? l[c.variacao] : null;
        if (c.variacao && v !== null && v !== undefined && l[c.campo] != null) {
            const n = Number(v);
            return `<td data-label="${escapeHTML(c.titulo)}" class="${cls.join(' ')} font-semibold whitespace-nowrap ${corVariacao(n)}"><i class="fa-solid ${setaVariacao(n)} mr-1 text-xs" aria-hidden="true"></i>${valor(c, l[c.campo])}</td>`;
        }
        return `<td data-label="${escapeHTML(c.titulo)}" class="${cls.join(' ').trim()}">${celula(c, l)}</td>`;
    };
    // Quadros de resumo: [{ rotulo, valor, variacao }]
    const quadrosResumo = itens => `<dl class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">${itens.map(r => `
        <div class="rounded-xl bg-slate-50 px-4 py-3">
            <dt class="text-xs font-medium text-slate-500">${escapeHTML(r.rotulo)}</dt>
            <dd class="mt-1 text-2xl font-bold tabular-nums ${r.variacao !== undefined ? corVariacao(r.variacao) : 'text-slate-900'}">${escapeHTML(r.valor)}</dd>
        </div>`).join('')}</dl>`;

    // Tabelas complementares: [{ id, titulo, icone, descricao (HTML), resumo, colunas, linhas, notas }]
    function renderSecoes() {
        const alvo = $('tabela-secoes');
        if (!alvo || !Array.isArray(dados.secoes)) return;
        alvo.innerHTML = dados.secoes.map(s => `
            <section class="cf-card" id="${escapeHTML(s.id || '')}" aria-labelledby="titulo-${escapeHTML(s.id || '')}">
                <h2 id="titulo-${escapeHTML(s.id || '')}" class="mb-2 flex items-center gap-3 text-lg font-semibold text-slate-900"><span class="cf-icon"><i class="fa-solid ${escapeHTML(s.icone || 'fa-table')}" aria-hidden="true"></i></span>${escapeHTML(s.titulo)}</h2>
                ${s.descricao ? `<div class="cf-prose mb-5 text-sm">${s.descricao}</div>` : ''}
                ${s.resumo?.length ? quadrosResumo(s.resumo) : ''}
                <div class="overflow-x-auto rounded-xl border border-slate-200 max-md:rounded-none max-md:border-0">
                    <table class="cf-table">
                        <thead><tr>${s.colunas.map(c => `<th scope="col"${c.numero ? ' class="cf-num"' : ''}>${escapeHTML(c.titulo)}</th>`).join('')}</tr></thead>
                        <tbody>${s.linhas.map(l => `<tr>${s.colunas.map(c => td(c, l)).join('')}</tr>`).join('')}</tbody>
                    </table>
                </div>
                ${s.notas?.length ? `<ul class="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">${s.notas.map(n => `<li>${escapeHTML(n)}</li>`).join('')}</ul>` : ''}
            </section>`).join('');
    }

    // Aviso de estado ainda com dados de demonstração (tabelas por estado)
    const avisoEstadoEl = document.createElement('p');
    avisoEstadoEl.className = 'mb-3 hidden flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900';
    avisoEstadoEl.setAttribute('role', 'note');
    resumoEl.before(avisoEstadoEl);

    function render() {
        const termos = normalizar(buscaEl.value).split(/\s+/).filter(Boolean);
        const filtro = porEstado ? '' : filtroEl.value;
        const base = porEstado ? dados.estados[uf].linhas : dados.linhas;
        const linhas = base.filter(l =>
            (!filtro || l[dados.filtro.campo] === filtro) &&
            termos.every(t => normalizar(Object.values(l).join(' ')).includes(t)));

        // Endereço compartilhável (uf, busca, filtro)
        const url = new URL(location.href);
        porEstado ? url.searchParams.set('uf', uf) : url.searchParams.delete('uf');
        buscaEl.value ? url.searchParams.set('q', buscaEl.value) : url.searchParams.delete('q');
        filtro ? url.searchParams.set('f', filtro) : url.searchParams.delete('f');
        history.replaceState(null, '', url);

        if (porEstado) {
            const nome = dados.estados[uf].nome;
            subtituloEl.textContent = `${nome} (${uf})`;
            const demo = dados.estados[uf].exemplo;
            avisoEstadoEl.innerHTML = demo ? `<i class="fa-solid fa-triangle-exclamation mt-0.5 text-amber-600" aria-hidden="true"></i><span>${escapeHTML(dados.avisoEstadoExemplo || 'Dados de demonstração.')}</span>` : '';
            avisoEstadoEl.classList.toggle('hidden', !demo);
            estadosEl.querySelectorAll('[data-uf]').forEach(b => {
                const on = b.dataset.uf === uf;
                b.setAttribute('aria-pressed', String(on));
                b.className = `h-10 cursor-pointer rounded-lg border text-sm font-bold transition ${on ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-800'}`;
            });
        }

        resumoEl.textContent = porEstado
            ? `${linhas.length} de ${base.length} ${base.length === 1 ? 'linha' : 'linhas'} · ${dados.estados[uf].nome}`
            : `${linhas.length} de ${base.length} linhas`;
        corpoEl.innerHTML = linhas.length
            ? linhas.map(l => `<tr>${dados.colunas.map(c => td(c, l)).join('')}</tr>`).join('')
            : `<tr><td colspan="${dados.colunas.length}" class="py-8 text-center text-slate-500">Nenhuma linha para esta busca.</td></tr>`;
    }

    let timer = null;
    buscaEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 150); });
    filtroEl.addEventListener('change', render);
    estadosEl.addEventListener('click', e => {
        const b = e.target.closest('[data-uf]');
        if (!b) return;
        uf = b.dataset.uf;
        buscaEl.value = '';
        render();
    });
    $('tabela-form').addEventListener('submit', e => { e.preventDefault(); render(); });
    $('tabela-imprimir').addEventListener('click', () => window.print());
});
