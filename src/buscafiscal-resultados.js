// Resultados da Busca Fiscal (buscafiscal-resultados.html) — dados em buscafiscal.json.
// Lê os mesmos parâmetros do formulário da página inicial:
//   q, busca_fiscal_tipo (ncm|cnae|tipi|classtrib), ncm_tipo_busca (ipi|ii|piscofins|icms, vários),
//   pis_cofins_tipo_venda (importacao|venda_interna), venda_interna_regime, icms_tipo_operacao (interestadual|interna),
//   uf_origem, uf_destino, classtrib_tipo (mercadoria|servico).
// Abas (ordem da página de referência): IPI, II, PIS/COFINS Importação, PIS/COFINS, ICMS, ICMS/ST,
// A busca do tipo "Classificação Tributária" (IBS e CBS da Reforma Tributária) tem só a aba própria.
// Cada linha abre o detalhamento em ncm.html.
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
    const form = $('bf-form');
    const abasEl = $('bf-abas');
    const paineisEl = $('bf-paineis');
    if (!form || !abasEl) return;

    const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
    const REGIMES = { cumulativo: 'regime cumulativo', nao_cumulativo: 'regime não cumulativo', monofasico: 'regime monofásico' };
    const POR_PAGINA = 10;

    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normalizar = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const digitos = v => String(v || '').replace(/\D/g, '');
    // NBS: 1.1302.21.00 (9 dígitos); códigos de nível superior ficam com os grupos que tiverem
    const formatarNbs = d => [d.slice(0, 1), d.slice(1, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join('.');
    const formatarNcm = d => (d.length <= 4 ? d : d.length <= 6 ? `${d.slice(0, 4)}.${d.slice(4)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`);
    const valor = v => (v === null || v === undefined ? '<span class="text-slate-400" title="Não informado">—</span>' : escapeHTML(v));

    // ------------------------------------------------------------------
    // Parâmetros
    // ------------------------------------------------------------------
    const p = new URLSearchParams(location.search);
    const termo = (p.get('q') || '').trim();
    const tipoBusca = p.get('busca_fiscal_tipo') || 'ncm';
    const tributos = p.getAll('ncm_tipo_busca');
    const pisTipo = p.get('pis_cofins_tipo_venda') || '';
    const regime = REGIMES[p.get('venda_interna_regime')] ? p.get('venda_interna_regime') : 'cumulativo';
    const icmsOperacao = p.get('icms_tipo_operacao') || '';
    const ufOrigem = UFS.includes(p.get('uf_origem')) ? p.get('uf_origem') : 'PR';
    const ufDestino = UFS.includes(p.get('uf_destino')) ? p.get('uf_destino') : 'SP';
    const servico = p.get('classtrib_tipo') === 'servico';

    // Preenche o formulário (o mesmo da página inicial) com a busca atual.
    // buscafiscal.js mostra/oculta os blocos condicionais só em eventos "change": marcamos as opções
    // e disparamos esses eventos, na ordem do formulário, para ele abrir no estado em que foi enviado.
    form.querySelectorAll('.js-uf-select').forEach(sel => UFS.forEach(uf => sel.add(new Option(uf, uf))));
    $('busca-fiscal-input').value = termo;
    if (p.get('uf_origem')) $('icms-uf-origem').value = ufOrigem;
    if (p.get('uf_destino')) $('icms-uf-destino').value = ufDestino;
    const marcar = (nome, valores) => form.querySelectorAll(`input[name="${nome}"]`).forEach(el => { el.checked = valores.includes(el.value); });
    marcar('busca_fiscal_tipo', [tipoBusca]);
    marcar('ncm_tipo_busca', tributos);
    marcar('classtrib_tipo', [servico ? 'servico' : 'mercadoria']);
    marcar('pis_cofins_tipo_venda', [pisTipo]);
    marcar('venda_interna_regime', p.get('venda_interna_regime') ? [regime] : []);
    marcar('icms_tipo_operacao', [icmsOperacao]);
    ['busca_fiscal_tipo', 'classtrib_tipo', 'ncm_tipo_busca', 'pis_cofins_tipo_venda', 'venda_interna_regime', 'icms_tipo_operacao'].forEach(nome => {
        form.querySelectorAll(`input[name="${nome}"]:checked`).forEach(el => el.dispatchEvent(new Event('change', { bubbles: true })));
    });

    // Com resultados, a pesquisa abre recolhida e mostra só o resumo do que foi buscado
    const nomesTipo = { ncm: 'NCM – Alíquotas', cnae: 'CNAE', tipi: 'TIPI/TEC', classtrib: 'Classificação Tributária' };
    const nomesTributo = { ipi: 'IPI', ii: 'II', piscofins: 'PIS/COFINS', icms: 'ICMS' };
    const classificacao = tipoBusca === 'classtrib';
    const partesResumo = classificacao ? [nomesTipo.classtrib, servico ? 'Serviço (NBS)' : 'Mercadoria (NCM)'] : [nomesTipo[tipoBusca] || nomesTipo.ncm, tributos.length ? Object.keys(nomesTributo).filter(t => tributos.includes(t)).map(t => nomesTributo[t]).join(', ') : 'todos os tributos'];
    if (!classificacao && icmsOperacao === 'interestadual') partesResumo.push(`ICMS interestadual ${ufOrigem} → ${ufDestino}`);
    else if (!classificacao && icmsOperacao === 'interna') partesResumo.push(`ICMS interno ${ufDestino}`);
    $('bf-compor-resumo').textContent = termo ? `“${termo}” · ${partesResumo.join(' · ')}` : 'Escolha o tipo de busca e digite o NCM ou a descrição.';
    $('bf-compor').open = !termo;

    // Quais abas aparecem (nenhum tributo marcado = todos)
    const todos = tributos.length === 0;
    const quer = t => !classificacao && (todos || tributos.includes(t));
    const abasVisiveis = {
        ipi: quer('ipi'),
        ii: quer('ii'),
        pisimp: quer('piscofins') && pisTipo !== 'venda_interna',
        pis: quer('piscofins') && pisTipo !== 'importacao',
        icms: quer('icms') && icmsOperacao !== 'interestadual',
        st: quer('icms') && icmsOperacao !== 'interna',
        classtrib: classificacao
    };
    // Aba inicial: IPI para busca do tipo "TIPI/TEC"
    const abaInicial = tipoBusca === 'tipi' ? 'ipi' : null;

    // ------------------------------------------------------------------
    // Busca nos dados
    // ------------------------------------------------------------------
    const palavras = normalizar(termo).split(/\s+/).filter(w => w.length >= 2);
    const numerico = /^\d[\d.\s-]*$/.test(termo) && digitos(termo).length >= 2;
    const casa = (ncm, texto) => numerico
        ? String(ncm).startsWith(digitos(termo))
        : palavras.length > 0 && palavras.every(w => normalizar(texto).includes(w));

    // Destaca o termo buscado (sem acento e sem diferenciar maiúsculas)
    function destacar(texto) {
        const seguro = escapeHTML(texto);
        if (numerico || !palavras.length) return seguro;
        const base = normalizar(seguro);
        const marcas = [];
        palavras.forEach(w => {
            let i = base.indexOf(w);
            while (i >= 0) { marcas.push([i, i + w.length]); i = base.indexOf(w, i + w.length); }
        });
        if (!marcas.length) return seguro;
        marcas.sort((a, b) => a[0] - b[0]);
        let out = '', pos = 0;
        marcas.forEach(([ini, fim]) => {
            if (ini < pos) return;
            out += seguro.slice(pos, ini) + '<mark>' + seguro.slice(ini, fim) + '</mark>';
            pos = fim;
        });
        return out + seguro.slice(pos);
    }

    // tributo = aba de origem: o detalhe (ncm.html) mostra só esse tributo
    const linkNcm = (ncm, tributo) => `ncm.html?codigo=${formatarNcm(ncm)}&origem=${ufOrigem}&destino=${ufDestino}${tributo ? `&tributo=${tributo}#${tributo}` : ''}`;
    const celulaNcm = (ncm, ancora) => `<td data-label="NCM" class="whitespace-nowrap"><a href="${linkNcm(ncm, ancora)}" class="font-semibold text-blue-700 tabular-nums underline-offset-2 hover:text-blue-900 hover:underline">${formatarNcm(ncm)}</a></td>`;
    const celulaDescricao = (ncm, texto, ancora, rotulo = 'Descrição', extra = '') => `<td data-label="${rotulo}" class="cf-table-full"><a href="${linkNcm(ncm, ancora)}" class="text-slate-800 hover:text-blue-800">${extra}${destacar(texto)}</a></td>`;

    // Botão de monitorar NCM (monitor-ncm.js); o estado vale para todas as abas da mesma NCM
    const monitor = window.CFMonitorNcm;
    const rotuloMonitor = (ncm, on) => `${on ? 'Deixar de monitorar' : 'Monitorar'} a NCM ${formatarNcm(ncm)}`;
    const botaoMonitor = (ncm, descricao, on) => `<button type="button" class="bf-monitor -my-2 inline-flex size-9 cursor-pointer items-center justify-center rounded-lg transition ${on ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}" data-ncm="${escapeHTML(ncm)}" data-descricao="${escapeHTML(descricao)}" aria-pressed="${on}" aria-label="${rotuloMonitor(ncm, on)}" title="${on ? 'NCM monitorada · clique para remover' : 'Salvar NCM para monitoramento'}"><i class="${on ? 'fa-solid' : 'fa-regular'} fa-bell" aria-hidden="true"></i></button>`;
    const celulaMonitor = x => `<td data-label="Monitorar" class="cf-num">${botaoMonitor(x.ncm, x.descricao || x.mercadoria || '', Boolean(monitor && monitor.monitorada(x.ncm)))}</td>`;

    fetch('./buscafiscal.json')
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(montar)
        .catch(error => {
            console.error('Erro ao carregar buscafiscal.json:', error);
            paineisEl.innerHTML = '<p class="text-red-600">Não foi possível carregar os resultados da Busca Fiscal.</p>';
        });

    // ------------------------------------------------------------------
    // Montagem das abas
    // ------------------------------------------------------------------
    function montar(dados) {
        const tecIpi = dados.tec.filter(x => x.tipi && casa(x.ncm, x.descricao));
        const tecII = dados.tec.filter(x => casa(x.ncm, x.descricao));
        const pis = dados.pis.filter(x => casa(x.ncm, x.descricao));
        const icms = dados.icms.filter(x => x.uf === ufDestino && casa(x.ncm, x.mercadoria));
        const st = dados.st.filter(x => x.origem === ufOrigem && x.destino === ufDestino && casa(x.ncm, x.mercadoria));
        const classtrib = servico
            ? (dados.classtribNbs || []).filter(x => casa(x.codigo, x.descricao))
            : (dados.classtrib || []).filter(x => casa(x.ncm, x.descricao));
        const temBase = {
            icms: dados.icms.some(x => x.uf === ufDestino),
            st: dados.st.some(x => x.origem === ufOrigem && x.destino === ufDestino)
        };

        // Resumo no topo
        $('bf-resumo').innerHTML = termo
            ? `Resultados para <strong class="text-white">“${escapeHTML(termo)}”</strong>${tipoBusca === 'cnae' ? ' · busca por CNAE' : ''}${classificacao ? ` · Classificação Tributária do IBS e da CBS · ${servico ? 'serviços (NBS)' : 'mercadorias (NCM)'}` : ` · ICMS com destino <strong class="text-white">${ufDestino}</strong> · ICMS/ST <strong class="text-white">${ufOrigem} → ${ufDestino}</strong>`}`
            : 'Informe o NCM ou a descrição da mercadoria para pesquisar.';

        const abas = [
            { id: 'ipi', rotulo: 'IPI', itens: tecIpi, render: painelIpi },
            { id: 'ii', rotulo: 'II', itens: tecII, render: painelII },
            { id: 'pisimp', rotulo: 'PIS/COFINS Importação', itens: tecIpi, render: painelPisImportacao },
            { id: 'pis', rotulo: 'PIS/COFINS', itens: pis, render: painelPis },
            { id: 'icms', rotulo: `ICMS · ${ufDestino}`, itens: icms, render: painelIcms, semBase: !temBase.icms },
            { id: 'st', rotulo: `ICMS/ST · ${ufOrigem} → ${ufDestino}`, itens: st, render: painelSt, semBase: !temBase.st },
            { id: 'classtrib', rotulo: servico ? 'Classificação Tributária · Serviços' : 'Classificação Tributária · Mercadorias', itens: classtrib, render: servico ? painelClassTribNbs : painelClassTrib }
        ].filter(a => abasVisiveis[a.id]);

        abasEl.innerHTML = abas.map(a => `
            <button type="button" role="tab" id="aba-${a.id}" aria-controls="painel-${a.id}" class="tab-button" data-aba="${a.id}">
                ${escapeHTML(a.rotulo)} <span class="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 tabular-nums">${a.itens.length}</span>
            </button>`).join('');
        paineisEl.innerHTML = abas.map(a => `<div id="painel-${a.id}" role="tabpanel" aria-labelledby="aba-${a.id}" class="hidden" tabindex="0"></div>`).join('');

        abas.forEach(a => {
            const painel = $(`painel-${a.id}`);
            if (!termo) painel.innerHTML = vazio('Digite um termo para pesquisar', 'Use o NCM (ex.: 2203.00.00) ou parte da descrição (ex.: cerveja).');
            else if (tipoBusca === 'cnae') painel.innerHTML = vazio('Busca por CNAE em construção', 'Nesta versão, pesquise pelo NCM ou pela descrição da mercadoria.');
            else if (a.semBase) painel.innerHTML = vazio(`Sem dados para ${a.id === 'st' ? `${ufOrigem} → ${ufDestino}` : ufDestino} nesta demonstração`, `Os dados disponíveis são de ICMS com destino SP e de ICMS/ST na operação PR → SP. As demais UFs entram quando a base de dados for integrada.`);
            else if (!a.itens.length) painel.innerHTML = vazio(`Nenhum resultado para “${termo}”`, a.id === 'classtrib' && servico ? 'Nesta demonstração há serviços para “consultoria” e “contabilidade”. Pesquise também pelo código NBS.' : 'Confira a grafia, use menos palavras ou pesquise pelo NCM.');
            else a.render(painel, a.itens, dados);
        });

        // Aba inicial: a do tipo de busca, senão a primeira com resultados
        const doEndereco = location.hash.slice(1); // ao voltar do detalhe (#st, #ii…)
        const inicial = abas.find(a => a.id === doEndereco) || abas.find(a => a.id === abaInicial) || abas.find(a => a.itens.length) || abas[0];
        if (inicial) ativar(inicial.id, false);
        atualizarIndicadorRolagem();
    }

    // ------------------------------------------------------------------
    // Painéis
    // ------------------------------------------------------------------
    const intro = (titulo, texto) => `
        <div class="mb-4">
            <h3 class="font-semibold text-slate-900">${titulo}</h3>
            <p class="mt-1 text-sm text-slate-600">${texto}</p>
        </div>`;

    const tabela = (cabecalhos, linhas, monitorar = true) => `
        <div class="overflow-x-auto rounded-xl border border-slate-200 max-md:rounded-none max-md:border-0">
            <table class="cf-table">
                <thead><tr>${cabecalhos.map(([t, cls, title]) => `<th scope="col"${cls ? ` class="${cls}"` : ''}${title ? ` title="${title}"` : ''}>${t}</th>`).join('')}${monitorar ? '<th scope="col" class="cf-num">Monitorar</th>' : ''}</tr></thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>`;

    // Paginação local (listas longas, como o II com os Ex-tarifários)
    function paginar(painel, itens, render) {
        let pagina = 0;
        const total = Math.ceil(itens.length / POR_PAGINA);
        const desenhar = () => {
            render(itens.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA));
            if (total <= 1) return;
            const nav = document.createElement('nav');
            nav.className = 'mt-4 flex flex-wrap items-center justify-between gap-3 text-sm';
            nav.setAttribute('aria-label', 'Paginação');
            nav.innerHTML = `
                <p class="text-slate-500">${pagina * POR_PAGINA + 1}–${Math.min((pagina + 1) * POR_PAGINA, itens.length)} de ${itens.length}</p>
                <div class="flex gap-1">${Array.from({ length: total }, (_, i) => `
                    <button type="button" data-pagina="${i}" class="inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg px-3 font-medium transition ${i === pagina ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}" ${i === pagina ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('')}
                </div>`;
            nav.addEventListener('click', e => {
                const b = e.target.closest('[data-pagina]');
                if (!b) return;
                pagina = Number(b.dataset.pagina);
                desenhar();
                painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            painel.appendChild(nav);
        };
        desenhar();
    }

    function painelIpi(painel, itens, dados) {
        painel.innerHTML = intro('IPI', `Alíquota do Imposto sobre Produtos Industrializados de acordo com a ${escapeHTML(dados.atos.ipi)}. NT = não tributado.`)
            + tabela([['NCM'], ['Descrição'], ['IPI (%)', 'cf-num']], itens.map(x => `<tr>
                ${celulaNcm(x.ncm, 'ipi')}
                ${celulaDescricao(x.ncm, x.descricao, 'ipi')}
                <td data-label="IPI (%)" class="cf-num font-semibold">${valor(x.ipi)}</td>${celulaMonitor(x)}</tr>`).join(''));
    }

    function painelII(painel, itens, dados) {
        const exs = itens.filter(x => x.ex).length;
        paginar(painel, itens, pagina => {
            painel.innerHTML = intro('II', `Alíquota do Imposto de Importação que compõe a ${escapeHTML(dados.atos.ii)}. SSN: ${escapeHTML(dados.atos.ssn)}.${exs ? ` Inclui ${exs} Ex-tarifário${exs > 1 ? 's' : ''}.` : ''}`)
                + tabela([['NCM'], ['Descrição'], ['II (%)', 'cf-num'], ['SSN', 'cf-num', 'Sem Similar Nacional']], pagina.map(x => `<tr>
                    ${celulaNcm(x.ncm, 'ii')}
                    ${celulaDescricao(x.ncm, x.ex ? x.descricao.replace(/^Ex\s+\d+\s*/i, '') : x.descricao, 'ii', 'Descrição', x.ex ? `<span class="mr-1.5 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase">${escapeHTML(x.ex)}</span>` : '')}
                    <td data-label="II (%)" class="cf-num font-semibold">${valor(x.ii)}</td>
                    <td data-label="SSN" class="cf-num">${valor(x.ssn)}</td>${celulaMonitor(x)}</tr>`).join(''));
        });
    }

    function painelPisImportacao(painel, itens) {
        painel.innerHTML = intro('PIS/COFINS Importação', 'Alíquotas do PIS/PASEP-Importação e da COFINS-Importação por NCM.')
            + tabela([['NCM'], ['Descrição'], ['PIS/PASEP (%)', 'cf-num'], ['COFINS (%)', 'cf-num']], itens.map(x => `<tr>
                ${celulaNcm(x.ncm, 'pisimp')}
                ${celulaDescricao(x.ncm, x.descricao, 'pisimp')}
                <td data-label="PIS/PASEP (%)" class="cf-num">${valor(null)}</td>
                <td data-label="COFINS (%)" class="cf-num">${valor(null)}</td>${celulaMonitor(x)}</tr>`).join(''))
            + '<p class="mt-3 text-xs text-slate-500">"—" = alíquota não disponível nesta demonstração.</p>';
    }

    function painelPis(painel, itens) {
        painel.innerHTML = intro(`PIS/COFINS · venda interna · ${REGIMES[regime]}`, 'Mercadorias com tratamento de PIS/COFINS cadastrado. Abra a mercadoria para ver o enquadramento.')
            + tabela([['NCM'], ['Mercadoria'], ['Unidade'], ['Tratamentos', 'cf-num', 'Tratamentos cadastrados para a venda']], itens.map(x => `<tr>
                ${celulaNcm(x.ncm, 'pis')}
                ${celulaDescricao(x.ncm, x.descricao, 'pis', 'Mercadoria')}
                <td data-label="Unidade" class="whitespace-nowrap">${escapeHTML(x.unidade)}</td>
                <td data-label="Tratamentos" class="cf-num">${x.tratamentosVenda}</td>${celulaMonitor(x)}</tr>`).join(''));
    }

    // ICMS e ICMS/ST: agrupados pelo ato legal, como na página de referência
    function grupos(itens) {
        const mapa = new Map();
        itens.forEach(x => {
            const chave = `${x.ato}|${x.origem || ''}|${x.destino || x.uf}`;
            if (!mapa.has(chave)) mapa.set(chave, []);
            mapa.get(chave).push(x);
        });
        return [...mapa.values()];
    }
    const cabecalhoAto = (x, st) => `
        <div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span class="min-w-0 basis-full font-semibold text-blue-900 sm:basis-auto"><i class="fa-solid fa-scale-balanced mr-1.5 text-xs" aria-hidden="true"></i>${escapeHTML(x.ato)}</span>
            ${st ? `<span class="whitespace-nowrap text-slate-600">UF remetente <strong class="text-lg text-amber-600">${escapeHTML(x.origem)}</strong></span>
                    <span class="whitespace-nowrap text-slate-600">UF destinatária <strong class="text-lg text-amber-600">${escapeHTML(x.destino)}</strong></span>`
                : `<span class="whitespace-nowrap text-slate-600">UF <strong class="text-lg text-amber-600">${escapeHTML(x.uf)}</strong></span>`}
            <span class="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-blue-800">${escapeHTML(x.responsabilidade)}</span>
            <span class="whitespace-nowrap text-slate-500">Vigência: ${escapeHTML(x.vigencia)}</span>
        </div>`;

    function painelIcms(painel, itens) {
        painel.innerHTML = intro(`ICMS · ${ufDestino}`, 'Tratamento do ICMS nas operações internas da UF de destino. Abra a mercadoria para ver o tratamento tributário completo.')
            + grupos(itens).map(g => cabecalhoAto(g[0], false) + tabela(
                [['NCM'], ['Mercadoria'], ['Alíq. efetiva (%)', 'cf-num'], ['FCP (%)', 'cf-num', 'Fundo de Combate à Pobreza'], ['Detalhes']],
                g.map(x => `<tr>
                    ${celulaNcm(x.ncm, 'icms')}
                    ${celulaDescricao(x.ncm, x.mercadoria, 'icms', 'Mercadoria')}
                    <td data-label="Alíq. efetiva (%)" class="cf-num font-semibold">${valor(x.aliquotaEfetiva)}</td>
                    <td data-label="FCP (%)" class="cf-num">${valor(x.fcp)}</td>
                    <td data-label="Detalhes" class="whitespace-nowrap"><a href="${linkNcm(x.ncm, 'icms')}" class="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">Tratamento <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></a></td>${celulaMonitor(x)}</tr>`).join(''))).join('<div class="h-6"></div>');
    }

    function painelSt(painel, itens) {
        painel.innerHTML = intro(`ICMS/ST · ${ufOrigem} → ${ufDestino}`, 'Substituição Tributária do ICMS nas operações interestaduais, conforme o ato legal firmado entre a UF remetente e a UF destinatária. Abra a mercadoria para ver o tratamento e simular o cálculo.')
            + grupos(itens).map(g => cabecalhoAto(g[0], true) + tabela(
                [['NCM'], ['Mercadoria'], ['CEST', '', 'Código Especificador da Substituição Tributária'], ['Alíq. destino (%)', 'cf-num'], ['Alíq. inter (%)', 'cf-num'], ['MVA (%)', 'cf-num', 'MVA original'], ['Detalhes']],
                g.map(x => `<tr>
                    ${celulaNcm(x.ncm, 'st')}
                    ${celulaDescricao(x.ncm, x.mercadoria, 'st', 'Mercadoria')}
                    <td data-label="CEST" class="whitespace-nowrap tabular-nums">${valor(x.cest)}</td>
                    <td data-label="Alíq. destino (%)" class="cf-num font-semibold">${valor(x.aliquotaDestino)}</td>
                    <td data-label="Alíq. inter (%)" class="cf-num">${valor(x.inter)}</td>
                    <td data-label="MVA (%)" class="cf-num">${x.baseCalculo === 'pauta' && (x.mvaOriginal === '-' || x.mvaOriginal === null) ? '<span class="text-xs text-slate-500">pauta fiscal</span>' : valor(x.mvaOriginal)}</td>
                    <td data-label="Detalhes" class="whitespace-nowrap"><a href="${linkNcm(x.ncm, 'st')}" class="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">Tratamento e cálculo <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></a></td>${celulaMonitor(x)}</tr>`).join(''))).join('<div class="h-6"></div>');
    }

    // Classificação Tributária (IBS/CBS): a lista é pública; CST e cClassTrib ficam no portal da Reforma (assinantes)
    const URL_RT = (id, tipo = 'NCM') => `https://reformatributaria.cenofisco.com.br/BuscaTributaria/Detalhes?id=${encodeURIComponent(id)}&tipo=${tipo}`;
    const linkRT = (id, tipo) => `<a href="${URL_RT(id, tipo)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">Ver classificação <i class="fa-solid fa-arrow-up-right-from-square text-xs" aria-hidden="true"></i><span class="sr-only">(abre o portal Reforma Tributária em nova aba)</span></a>`;
    const avisoRT = '<p class="mt-3 text-xs text-slate-500">A consulta do CST e do cClassTrib no portal Reforma Tributária é exclusiva para assinantes.</p>';
    function painelClassTrib(painel, itens, dados) {
        painel.innerHTML = intro('Classificação Tributária · IBS e CBS', `Código de Situação Tributária (CST) e Código de Classificação Tributária (cClassTrib) do IBS e da CBS, conforme a ${escapeHTML(dados.atos.classtrib)}. O detalhamento abre no portal Reforma Tributária do Cenofisco.`)
            + tabela([['NCM'], ['Descrição'], ['CST e cClassTrib']], itens.map(x => `<tr>
                ${celulaNcm(x.ncm, 'classtrib')}
                ${celulaDescricao(x.ncm, x.descricao, 'classtrib')}
                <td data-label="CST e cClassTrib" class="whitespace-nowrap">${linkRT(x.idMercadoria, 'NCM')}</td>${celulaMonitor(x)}</tr>`).join(''))
            + avisoRT;
    }

    // Serviços (NBS): só códigos completos (9 dígitos) têm classificação; os demais são agrupadores
    function painelClassTribNbs(painel, todos, dados) {
        paginar(painel, todos, itens => { painel.innerHTML = intro('Classificação Tributária · Serviços (NBS)', `CST e cClassTrib do IBS e da CBS por código da Nomenclatura Brasileira de Serviços (NBS), conforme a ${escapeHTML(dados.atos.classtrib)}. O detalhamento abre no portal Reforma Tributária do Cenofisco.`)
            + tabela([['NBS'], ['Descrição'], ['CST e cClassTrib']], itens.map(x => `<tr>
                <td data-label="NBS" class="font-semibold whitespace-nowrap text-slate-900 tabular-nums">${formatarNbs(x.codigo)}</td>
                <td data-label="Descrição" class="cf-table-full text-slate-800">${destacar(x.descricao)}</td>
                <td data-label="CST e cClassTrib" class="whitespace-nowrap">${x.codigo.length === 9 ? linkRT(x.idNbs, 'NBS') : '<span class="text-xs text-slate-500">Agrupador: escolha um código de 9 dígitos</span>'}</td></tr>`).join(''), false)
            + avisoRT; });
    }

    const vazio = (titulo, texto) => `
        <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <i class="fa-solid fa-magnifying-glass mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
            <p class="font-medium text-slate-700">${escapeHTML(titulo)}</p>
            <p class="mt-1 text-sm text-slate-500">${escapeHTML(texto)}</p>
        </div>`;

    // ------------------------------------------------------------------
    // Monitorar NCM: atualiza todos os botões da mesma NCM e avisa o usuário
    // ------------------------------------------------------------------
    const avisoMonitor = document.createElement('div');
    avisoMonitor.setAttribute('role', 'status');
    avisoMonitor.className = 'fixed right-4 bottom-4 z-[60] hidden max-w-sm rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg';
    document.body.appendChild(avisoMonitor);
    let avisoTimer = null;
    paineisEl.addEventListener('click', e => {
        const b = e.target.closest('.bf-monitor');
        if (!b || !monitor) return;
        const { ncm, descricao } = b.dataset;
        const celula = b.parentElement;
        const on = monitor.alternar(ncm, descricao);
        paineisEl.querySelectorAll(`.bf-monitor[data-ncm="${ncm}"]`).forEach(btn => { btn.outerHTML = botaoMonitor(ncm, descricao, on); });
        celula.querySelector('.bf-monitor')?.focus(); // o foco continua no botão clicado
        avisoMonitor.innerHTML = on
            ? `NCM ${formatarNcm(ncm)} salva para monitoramento. <a href="meu-perfil.html#documentos" class="font-semibold text-amber-300 underline">Ver em Meu Perfil</a>`
            : `NCM ${formatarNcm(ncm)} removida do monitoramento.`;
        avisoMonitor.classList.remove('hidden');
        clearTimeout(avisoTimer);
        avisoTimer = setTimeout(() => avisoMonitor.classList.add('hidden'), 4000);
    });

    // ------------------------------------------------------------------
    // Abas: clique, teclado (setas, Home, End) e indicador de rolagem
    // ------------------------------------------------------------------
    function ativar(id, focar) {
        abasEl.querySelectorAll('[role="tab"]').forEach(b => {
            const on = b.dataset.aba === id;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
            b.tabIndex = on ? 0 : -1;
            if (on && focar) b.focus();
        });
        paineisEl.querySelectorAll('[role="tabpanel"]').forEach(pn => pn.classList.toggle('hidden', pn.id !== `painel-${id}`));
        history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
    }
    abasEl.addEventListener('click', e => {
        const b = e.target.closest('[data-aba]');
        if (b) ativar(b.dataset.aba, false);
    });
    abasEl.addEventListener('keydown', e => {
        const tabs = [...abasEl.querySelectorAll('[role="tab"]')];
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        const alvo = { ArrowRight: tabs[(i + 1) % tabs.length], ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length], Home: tabs[0], End: tabs[tabs.length - 1] }[e.key];
        if (alvo) { e.preventDefault(); ativar(alvo.dataset.aba, true); }
    });
    function atualizarIndicadorRolagem() {
        const max = abasEl.scrollWidth - abasEl.clientWidth;
        if (max <= 1) { abasEl.removeAttribute('data-overflow'); return; }
        abasEl.dataset.overflow = abasEl.scrollLeft <= 1 ? 'end' : abasEl.scrollLeft >= max - 1 ? 'start' : 'both';
    }
    abasEl.addEventListener('scroll', atualizarIndicadorRolagem, { passive: true });
    window.addEventListener('resize', atualizarIndicadorRolagem);
});
