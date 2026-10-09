// Detalhamento de uma NCM (ncm.html?codigo=2203.00.00&origem=PR&destino=SP), aberto pela Busca Fiscal.
// Dados em buscafiscal.json (os mesmos da página de resultados):
//   tec (IPI/II e Ex-tarifários), pis, icms (por UF de destino), st (por UF de origem → destino) e tratamentos.
// Item: alíquotas, Ex-tarifários, PIS/COFINS, ICMS da UF de destino e ICMS/ST da rota, com o tratamento tributário
// em abas e, na ST, a simulação do cálculo. Posição/subposição: lista os itens contidos nela.
// O HTML dos textos de tratamento vem da editoria e é inserido como está.
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
    const conteudo = $('ncm-conteudo');
    if (!conteudo) return;

    const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
    const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const digitos = v => String(v || '').replace(/\D/g, '');
    const formatar = d => (d.length <= 4 ? d : d.length <= 6 ? `${d.slice(0, 4)}.${d.slice(4)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`);
    const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const pct = v => `${String(v).replace('.', ',')}%`;
    const valorPct = v => (v === null || v === undefined ? null : v === '-' || v === 'NT' ? v : `${v}%`);
    const tracinho = '<span class="text-slate-400" title="Não informado">—</span>';

    // Seções do tratamento tributário (abas), na ordem da página de referência
    const SECOES = [
        { chave: 'baseLegal', titulo: 'Base Legal' },
        { chave: 'beneficios', titulo: 'Benefícios/Outros' },
        { chave: 'editoria', titulo: 'Editoria' },
        { chave: 'responsabilidade', titulo: 'Responsabilidade' },
        { chave: 'pagamento', titulo: 'Pagamento' },
        { chave: 'baseCalculo', titulo: 'Base de Cálculo' },
        { chave: 'inaplicabilidade', titulo: 'Inaplicabilidade' },
        { chave: 'mi', titulo: 'MI' },
        { chave: 'cfop', titulo: 'CFOP', colunas: ['CFOP', 'Descrição'] },
        { chave: 'cst', titulo: 'CST', colunas: ['CST', 'Descrição'] },
        { chave: 'crt', titulo: 'CRT', colunas: ['CRT', 'Regime'] }
    ];

    const params = new URLSearchParams(location.search);
    const codigo = digitos(params.get('codigo'));
    const origem = UFS.includes(params.get('origem')) ? params.get('origem') : 'PR';
    const destino = UFS.includes(params.get('destino')) ? params.get('destino') : 'SP';
    // Aba de origem na página de resultados (ipi, ii, pisimp, pis, icms, st, classtrib): mostra só esse tributo
    const tributo = params.get('tributo') || '';
    // Mantém o tributo escolhido ao navegar (classificação, itens de uma posição); todos = sem o filtro
    const urlNcm = (d, todos) => `ncm.html?codigo=${formatar(d)}&origem=${origem}&destino=${destino}${tributo && !todos ? `&tributo=${tributo}#${tributo}` : ''}`;

    // Voltar: se veio dos resultados, volta para a mesma busca
    if (document.referrer && /\/buscafiscal-resultados\.html/.test(document.referrer)) {
        const voltar = document.referrer.split('#')[0] + (tributo ? '#' + tributo : '');
        $('voltar-resultados').href = voltar;
        $('crumb-resultados').href = voltar;
    }

    fetch('./buscafiscal.json')
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(dados => {
            const tec = dados.tec.filter(x => x.ncm === codigo);
            const temItem = tec.length || dados.pis.some(x => x.ncm === codigo) || dados.icms.some(x => x.ncm === codigo) || dados.st.some(x => x.ncm === codigo);
            if (temItem && codigo.length === 8) renderItem(dados, codigo);
            else if (dados.posicoes[codigo] || dados.tec.some(x => x.ncm === codigo)) renderPosicao(dados, codigo);
            else renderNaoEncontrado();
            // Âncora vinda da busca (#ipi, #ii, #pis, #icms, #st): rola até a seção depois de montar
            const alvo = location.hash && document.querySelector(location.hash);
            if (alvo) setTimeout(() => alvo.scrollIntoView({ block: 'start' }), 50);
        })
        .catch(error => {
            console.error('Erro ao carregar buscafiscal.json:', error);
            $('ncm-titulo').textContent = 'NCM';
            conteudo.innerHTML = '<p class="text-red-600">Não foi possível carregar os dados da NCM.</p>';
        });

    // ------------------------------------------------------------------
    // Cabeçalho e classificação
    // ------------------------------------------------------------------
    function cabecalho(dados, d, descricao, tipo) {
        document.title = `NCM ${formatar(d)} - Busca Fiscal - Cenofisco`;
        $('crumb-codigo').textContent = formatar(d);
        $('ncm-titulo').textContent = formatar(d);
        $('ncm-descricao').textContent = descricao;
        $('ncm-tipo').textContent = tipo;
        const niveis = [{ d: d.slice(0, 2), rotulo: `Capítulo ${d.slice(0, 2)}` }];
        [4, 5, 6].forEach(n => {
            if (d.length > n && dados.posicoes[d.slice(0, n)]) niveis.push({ d: d.slice(0, n), rotulo: formatar(d.slice(0, n)), link: true });
        });
        niveis.push({ d, rotulo: formatar(d), atual: true });
        $('ncm-hierarquia').innerHTML = niveis.map((n, i) => `
            ${i ? '<li aria-hidden="true"><i class="fa-solid fa-chevron-right text-[9px] text-blue-300"></i></li>' : ''}
            <li>${n.link ? `<a href="${urlNcm(n.d)}" class="rounded bg-white/10 px-2 py-0.5 font-medium tabular-nums transition hover:bg-white/20 hover:text-white">${escapeHTML(n.rotulo)}</a>`
                : `<span class="rounded px-2 py-0.5 tabular-nums ${n.atual ? 'bg-white font-semibold text-blue-950' : 'bg-white/10'}">${escapeHTML(n.rotulo)}</span>`}</li>`).join('');
    }

    const card = (id, titulo, icone, corpo) => `
        <section id="${id}" class="cf-card scroll-mt-32" aria-labelledby="${id}-titulo">
            <div class="cf-section-head">
                <h2 id="${id}-titulo" class="cf-section-title"><span class="cf-icon"><i class="fa-solid ${icone}" aria-hidden="true"></i></span>${titulo}</h2>
            </div>
            ${corpo}
        </section>`;

    const tabelaPadrao = (colunas, linhas) => `
        <div class="overflow-x-auto rounded-xl border border-slate-200 max-md:rounded-none max-md:border-0">
            <table class="cf-table">
                <thead><tr>${colunas.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead>
                <tbody>${linhas.map(l => `<tr><td data-label="${colunas[0]}" class="font-semibold whitespace-nowrap text-slate-900 tabular-nums">${escapeHTML(l.codigo)}</td><td data-label="${colunas[1]}" class="cf-table-full">${escapeHTML(l.descricao)}${l.observacao ? `<span class="mt-0.5 block text-xs text-slate-500">${escapeHTML(l.observacao)}</span>` : ''}</td></tr>`).join('')}</tbody>
            </table>
        </div>`;

    // Dados do ato legal (ICMS e ICMS/ST)
    const faixaAto = (x, st) => `
        <div class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span class="min-w-0 basis-full font-semibold text-blue-900 sm:basis-auto"><i class="fa-solid fa-scale-balanced mr-1.5 text-xs" aria-hidden="true"></i>${escapeHTML(x.ato)}</span>
            ${st ? `<span class="whitespace-nowrap text-slate-600">UF remetente <strong class="text-lg text-amber-600">${escapeHTML(x.origem)}</strong></span>
                    <span class="whitespace-nowrap text-slate-600">UF destinatária <strong class="text-lg text-amber-600">${escapeHTML(x.destino)}</strong></span>`
                : `<span class="whitespace-nowrap text-slate-600">UF <strong class="text-lg text-amber-600">${escapeHTML(x.uf)}</strong></span>`}
            <span class="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-blue-800">${escapeHTML(x.responsabilidade)}</span>
            <span class="whitespace-nowrap text-slate-500">Vigência: ${escapeHTML(x.vigencia)}</span>
        </div>`;

    const linhaValor = (rotulo, v, title) => `<div class="cf-row"><dt${title ? ` title="${title}"` : ''}>${rotulo}</dt><dd class="font-semibold text-slate-900 tabular-nums">${v === null || v === undefined ? tracinho : escapeHTML(valorPct(v))}</dd></div>`;

    // Tratamento tributário em abas (mesmo desenho da página de referência)
    function tratamentoEmAbas(prefixo, t) {
        const aviso = t.exemplo ? `
            <div class="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="note">
                <i class="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true"></i>
                <p><strong>Conteúdo de demonstração.</strong> Os textos deste tratamento devem ser substituídos pelo conteúdo da editoria.</p>
            </div>` : '';
        const corpo = s => {
            const v = t[s.chave];
            if (s.colunas) {
                const titulo = s.chave === 'cfop' && t.cfopTitulo ? `<h4 class="mb-3 font-semibold text-blue-900">${escapeHTML(t.cfopTitulo)}</h4>` : '';
                const texto = s.chave === 'crt' && t.crtTexto ? `<p class="mb-3">${escapeHTML(t.crtTexto)}</p>` : '';
                return titulo + texto + (Array.isArray(v) && v.length ? tabelaPadrao(s.colunas, v) : '<p class="text-slate-500">Não informado.</p>');
            }
            return v ? `<div class="space-y-3">${v}</div>` : '<p class="text-slate-500">Não informado.</p>';
        };
        return aviso + `
            <div class="rounded-xl border border-slate-200" data-abas-tratamento>
                <div class="border-b border-slate-200 px-4">
                    <nav class="cf-tabs" role="tablist" aria-label="Tratamento tributário">
                        ${SECOES.map((s, i) => `<button type="button" role="tab" id="${prefixo}-aba-${s.chave}" aria-controls="${prefixo}-${s.chave}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" class="tab-button${i === 0 ? ' active' : ''}">${s.titulo}</button>`).join('')}
                    </nav>
                </div>
                <div class="p-5 text-sm leading-relaxed text-slate-700 sm:p-6">
                    ${SECOES.map((s, i) => `<div id="${prefixo}-${s.chave}" role="tabpanel" aria-labelledby="${prefixo}-aba-${s.chave}" class="${i === 0 ? '' : 'hidden'}" tabindex="0">${corpo(s)}</div>`).join('')}
                </div>
            </div>`;
    }

    // ------------------------------------------------------------------
    // Item (8 dígitos)
    // ------------------------------------------------------------------
    function renderItem(dados, d) {
        const tec = dados.tec.filter(x => x.ncm === d);
        const tipi = tec.find(x => x.tipi);
        const exs = tec.filter(x => x.ex);
        const pis = dados.pis.find(x => x.ncm === d);
        const icms = dados.icms.find(x => x.ncm === d && x.uf === destino);
        const st = dados.st.find(x => x.ncm === d && x.origem === origem && x.destino === destino);
        const classtrib = (dados.classtrib || []).find(x => x.ncm === d);
        // Só com Ex-tarifários a descrição da NCM não está nos dados: usa uma frase neutra em vez do texto de um Ex
        const descricao = tipi?.descricao || pis?.descricao || st?.mercadoria || icms?.mercadoria || (exs.length ? `NCM com ${exs.length} Ex-tarifário${exs.length > 1 ? 's' : ''} relacionado${exs.length > 1 ? 's' : ''} à busca` : '');
        cabecalho(dados, d, descricao, 'Item NCM');
        ligarMonitor(d, descricao);
        const tile = (rotulo, v, sub) => `
            <div class="rounded-xl bg-slate-50 px-4 py-3">
                <dt class="text-xs font-medium text-slate-500">${rotulo}</dt>
                <dd class="mt-1 text-2xl font-bold ${v === null ? 'text-slate-400' : 'text-slate-900'}">${v === null ? '—' : escapeHTML(v)}</dd>
                <dd class="text-xs text-slate-500">${sub}</dd>
            </div>`;
        const legenda = '<p class="mt-3 text-xs text-slate-500">"—" = não informado nesta demonstração. NT = não tributado.</p>';
        const iiItem = tec.find(x => !x.ex);
        const listaEx = () => `
            <h3 class="mt-5 mb-1 text-sm font-semibold text-slate-900">Ex-tarifários (${exs.length})</h3>
            <p class="mb-2 text-sm text-slate-600">Destaques "Ex" desta NCM com redução do Imposto de Importação para bens sem produção nacional equivalente.</p>
            <ul class="divide-y divide-slate-100">${exs.map(x => `
                <li class="py-3 text-sm text-slate-700"><span class="mr-2 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase">${escapeHTML(x.ex)}</span>${escapeHTML(x.descricao.replace(/^Ex\s+\d+\s*/i, ''))}
                    <span class="mt-1 block text-xs text-slate-500">II: ${x.ii === null ? '—' : escapeHTML(valorPct(x.ii))}</span></li>`).join('')}
            </ul>`;

        // Um bloco por tributo (mesmos identificadores das abas da página de resultados).
        // existe: há dado deste tributo para a NCM; html(): conteúdo do bloco.
        const blocos = {
            ipi: {
                titulo: 'IPI', existe: Boolean(tipi),
                html: () => card('ipi', 'IPI', 'fa-industry', `
                    <dl class="grid gap-3 sm:grid-cols-2">${tile('Alíquota do IPI', valorPct(tipi?.ipi ?? null), tipi?.ipi === 'NT' ? 'Não tributado' : 'TIPI')}</dl>
                    <p class="mt-3 text-xs text-slate-500">${escapeHTML(dados.atos.ipi)}. NT = não tributado.</p>`)
            },
            ii: {
                titulo: 'II', existe: tec.length > 0,
                html: () => card('ii', 'II', 'fa-ship', `
                    <dl class="grid gap-3 sm:grid-cols-2">
                        ${tile('Alíquota do II', valorPct(iiItem?.ii ?? null), 'TEC')}
                        ${tile('SSN', iiItem?.ssn ?? null, 'Sem Similar Nacional')}
                    </dl>
                    <p class="mt-3 text-xs text-slate-500">${escapeHTML(dados.atos.ii)} · ${escapeHTML(dados.atos.ssn)}.</p>` + (exs.length ? listaEx() : ''))
            },
            pisimp: {
                titulo: 'PIS/COFINS Importação', existe: Boolean(tipi),
                html: () => card('pisimp', 'PIS/COFINS Importação', 'fa-plane-arrival', `
                    <dl class="grid gap-3 sm:grid-cols-2">
                        ${tile('PIS/PASEP-Importação', null, 'Alíquota')}
                        ${tile('COFINS-Importação', null, 'Alíquota')}
                    </dl>` + legenda)
            },
            pis: {
                titulo: 'PIS/COFINS', existe: Boolean(pis),
                html: () => card('pis', 'PIS/COFINS', 'fa-receipt', `
                    <dl class="grid gap-x-8 sm:grid-cols-2">
                        <div class="cf-row"><dt>Unidade de medida</dt><dd class="font-semibold text-slate-900">${escapeHTML(pis.unidade)}</dd></div>
                        <div class="cf-row"><dt>Tratamentos na venda</dt><dd class="font-semibold text-slate-900 tabular-nums">${pis.tratamentosVenda}</dd></div>
                        <div class="cf-row"><dt>Tratamentos na compra</dt><dd class="font-semibold text-slate-900 tabular-nums">${pis.tratamentosCompra}</dd></div>
                    </dl>
                    <p class="mt-3 text-xs text-slate-500">O enquadramento detalhado (regime, CST e alíquotas) não está disponível nesta demonstração.</p>`)
            },
            icms: {
                titulo: `ICMS · ${destino}`, existe: Boolean(icms),
                html: () => {
                    const t = dados.tratamentos[icms.tratamento];
                    return card('icms', `ICMS · ${escapeHTML(icms.uf)}`, 'fa-landmark', faixaAto(icms, false) + `
                        <dl class="mb-5 grid gap-x-8 sm:grid-cols-2">
                            ${linhaValor('Alíquota de destino', icms.aliquotaDestino)}
                            ${linhaValor('Alíquota FCP', icms.fcp, 'Fundo de Combate à Pobreza')}
                            ${linhaValor('Alíquota efetiva', icms.aliquotaEfetiva)}
                            ${linhaValor('Alíquota interestadual', icms.inter)}
                            ${linhaValor('Alíquota interestadual MI', icms.interMI, 'Mercadoria importada')}
                            ${linhaValor('Carga tributária', icms.cargaTributaria)}
                            ${linhaValor('Base de cálculo reduzida', icms.bcReduzida)}
                            ${linhaValor('Crédito presumido', icms.creditoPresumido)}
                        </dl>` + (t ? tratamentoEmAbas('icms', t) : ''));
                }
            },
            st: {
                titulo: `ICMS/ST · ${origem} → ${destino}`, existe: Boolean(st),
                html: () => {
                    const t = dados.tratamentos[st.tratamento];
                    const nota = st.baseCalculo === 'pauta' ? '<p class="-mt-2 mb-5 text-xs text-slate-500"><i class="fa-solid fa-circle-info mr-1 text-blue-600" aria-hidden="true"></i>Sem MVA: a base de cálculo é o preço máximo de venda a varejo fixado por autoridade ou, na falta dele, a pauta fiscal do Estado de destino (aba Base de Cálculo).</p>' : '';
                    return card('st', `ICMS/ST · ${escapeHTML(st.origem)} → ${escapeHTML(st.destino)}`, 'fa-right-left', faixaAto(st, true) + `
                        <dl class="mb-5 grid gap-x-8 sm:grid-cols-2">
                            <div class="cf-row"><dt title="Código Especificador da Substituição Tributária">CEST</dt><dd class="font-semibold text-slate-900 tabular-nums">${st.cest ? escapeHTML(st.cest) : tracinho}</dd></div>
                            ${linhaValor('Alíquota de destino', st.aliquotaDestino)}
                            ${linhaValor('Alíquota FCP', st.fcp, 'Fundo de Combate à Pobreza')}
                            ${linhaValor('Alíquota efetiva', st.aliquotaEfetiva)}
                            ${linhaValor('Alíquota interestadual', st.inter)}
                            ${linhaValor('Alíquota interestadual MI', st.interMI, 'Mercadoria importada')}
                            ${linhaValor('MVA original', st.mvaOriginal)}
                            ${linhaValor('MVA ajustada', st.mvaAjustada)}
                        </dl>` + nota + (t ? tratamentoEmAbas('st', t) : '') + (t?.calculo ? simuladorSt(st, t.calculo, tipi?.ipi) : ''));
                }
            },
            // Reforma Tributária: CST e cClassTrib ficam no portal Reforma Tributária do Cenofisco (assinantes)
            classtrib: {
                titulo: 'Classificação Tributária', existe: Boolean(classtrib),
                html: () => card('classtrib', 'Classificação Tributária · IBS e CBS', 'fa-tags', `
                    <p class="text-sm text-slate-700">Código de Situação Tributária (<strong>CST</strong>) e Código de Classificação Tributária (<strong>cClassTrib</strong>) do IBS e da CBS para esta NCM, conforme a ${escapeHTML(dados.atos.classtrib)}.</p>
                    <a href="https://reformatributaria.cenofisco.com.br/BuscaTributaria/Detalhes?id=${encodeURIComponent(classtrib.idMercadoria)}&tipo=NCM" target="_blank" rel="noopener" class="cf-btn cf-btn-primary mt-4">Ver CST e cClassTrib <i class="fa-solid fa-arrow-up-right-from-square text-xs" aria-hidden="true"></i><span class="sr-only">(abre o portal Reforma Tributária em nova aba)</span></a>
                    <p class="mt-3 text-xs text-slate-500">Consulta no portal Reforma Tributária do Cenofisco, exclusiva para assinantes.</p>`)
            }
        };

        let html = '';
        const indice = [];
        const escolhido = blocos[tributo];

        if (escolhido) {
            // Veio de uma aba da página de resultados: mostra só aquele tributo
            const urlTodos = urlNcm(d, true);
            html += `
                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm">
                    <p class="text-slate-700"><i class="fa-solid fa-filter mr-1.5 text-xs text-blue-700" aria-hidden="true"></i>Exibindo apenas <strong class="text-slate-900">${escapeHTML(escolhido.titulo)}</strong>, escolhido na Busca Fiscal.</p>
                    <a href="${urlTodos}" class="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-blue-700 hover:text-blue-900 hover:underline">Ver todos os tributos desta NCM <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></a>
                </div>`;
            if (escolhido.existe) {
                html += escolhido.html();
                indice.push({ id: tributo, titulo: escolhido.titulo });
            } else {
                html += `
                    <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <i class="fa-regular fa-file-lines mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                        <p class="font-medium text-slate-700">Não há dados de ${escapeHTML(escolhido.titulo)} para esta NCM.</p>
                        <p class="mt-1 text-sm text-slate-500">Veja os demais tributos ou fale com a Consultoria Cenofisco.</p>
                        <a href="${urlTodos}" class="cf-btn cf-btn-soft mt-4">Ver todos os tributos</a>
                    </div>`;
            }
        } else {
            // Sem tributo escolhido (link direto): visão geral com todos os tributos disponíveis
            indice.push({ id: 'aliquotas', titulo: 'Alíquotas' });
            html += card('aliquotas', 'Alíquotas', 'fa-percent', `
                <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    ${tile('IPI', valorPct(tipi?.ipi ?? null), tipi?.ipi === 'NT' ? 'Não tributado' : 'TIPI')}
                    ${tile('II', valorPct(iiItem?.ii ?? null), exs.length ? `${exs.length} Ex-tarifário${exs.length > 1 ? 's' : ''}` : 'TEC')}
                    ${tile(`ICMS · ${destino}`, valorPct(icms?.aliquotaEfetiva ?? null), icms ? 'Alíquota efetiva' : 'Sem tratamento cadastrado')}
                    ${tile(`ICMS/ST · ${origem} → ${destino}`, valorPct(st?.aliquotaDestino ?? null), st ? 'Alíquota de destino' : 'Sem ST nesta rota')}
                </dl>` + legenda);
            ['ii', 'pis', 'icms', 'st', 'classtrib'].forEach(id => {
                const b = blocos[id];
                // II só entra na visão geral quando há Ex-tarifários (a alíquota já está no resumo acima)
                if (!b.existe || (id === 'ii' && !exs.length)) return;
                html += b.html();
                indice.push({ id, titulo: id === 'ii' ? `II · Ex-tarifários (${exs.length})` : b.titulo });
            });
            if (!icms && !st) {
                html += `
                    <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <i class="fa-regular fa-file-lines mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                        <p class="font-medium text-slate-700">Sem tratamento de ICMS para ${destino} nem de ICMS/ST na rota ${origem} → ${destino}.</p>
                        <p class="mt-1 text-sm text-slate-500">Altere as UFs na Busca Fiscal ou fale com a Consultoria Cenofisco.</p>
                        <a href="index.html#consultoria-cenofisco" class="cf-btn cf-btn-soft mt-4">Falar com a Consultoria</a>
                    </div>`;
            }
        }

        conteudo.innerHTML = html;
        renderIndice(indice);
        ligarAbasTratamento();
        const calculoSt = st && dados.tratamentos[st.tratamento]?.calculo;
        if (calculoSt && document.getElementById('st-simulacao')) ligarSimulador(calculoSt, tipi?.ipi);
    }

    // ------------------------------------------------------------------
    // Simulação do ICMS-ST (cláusula quarta do Protocolo ICMS 11/91):
    // ICMS-ST = pauta × quantidade × alíquota interna − ICMS próprio (valor da operação × alíquota interestadual)
    // ------------------------------------------------------------------
    function simuladorSt(st, calc, ipi) {
        const aliqInterna = st.aliquotaDestino ?? '';
        return `
            <section id="st-simulacao" class="mt-6 scroll-mt-32 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5" aria-labelledby="st-simulacao-titulo">
                <h3 id="st-simulacao-titulo" class="flex items-center gap-2.5 font-semibold text-slate-900"><span class="cf-icon size-8 text-sm"><i class="fa-solid fa-calculator" aria-hidden="true"></i></span><span>Simular cálculo do ICMS-ST · <span class="whitespace-nowrap">${escapeHTML(st.origem)} → ${escapeHTML(st.destino)}</span></span></h3>
                <p class="mt-1 text-sm text-slate-600">ICMS-ST = pauta fiscal × quantidade × alíquota interna de destino − ICMS próprio da operação interestadual.</p>
                <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div><label for="sim-qtd" class="cf-label">Quantidade (unidades)</label><input id="sim-qtd" type="number" min="1" step="1" inputmode="numeric" value="1200" class="cf-input"></div>
                    <div><label for="sim-valor" class="cf-label">Valor unitário da operação (R$)</label><input id="sim-valor" type="number" min="0" step="0.01" inputmode="decimal" value="3.20" class="cf-input"></div>
                    <div>
                        <label for="sim-pauta" class="cf-label">Pauta fiscal unitária (R$)</label>
                        <input id="sim-pauta" type="number" min="0" step="0.01" inputmode="decimal" value="5.90" class="cf-input" aria-describedby="sim-pauta-ajuda">
                        <p id="sim-pauta-ajuda" class="mt-1 text-xs text-amber-800"><i class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i>Valor de exemplo: use o da ${escapeHTML(calc.pautaReferencia)}.</p>
                    </div>
                    <div>
                        <label for="sim-interna" class="cf-label">Alíquota interna de destino (%)</label>
                        <input id="sim-interna" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${escapeHTML(aliqInterna)}" placeholder="Informe" class="cf-input" aria-describedby="sim-interna-ajuda">
                        <p id="sim-interna-ajuda" class="mt-1 text-xs ${aliqInterna ? 'text-slate-500' : 'text-amber-800'}">${aliqInterna ? 'Conforme a Base Legal desta operação.' : 'Não informada para esta mercadoria: confira na Base Legal.'}</p>
                    </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
                    <label class="flex items-center gap-2"><input id="sim-importada" type="checkbox" class="size-4 rounded border-slate-300 accent-blue-900">Mercadoria importada (${calc.aliquotaImportada}%)</label>
                    ${ipi && !isNaN(parseFloat(String(ipi).replace(',', '.'))) ? `<label class="flex items-center gap-2"><input id="sim-ipi" type="checkbox" checked class="size-4 rounded border-slate-300 accent-blue-900">Somar IPI (${escapeHTML(pct(ipi))}) no total da nota</label>` : ''}
                </div>
                <div class="mt-5 grid gap-3 sm:grid-cols-3" aria-live="polite">
                    <div class="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200"><p class="text-xs font-medium text-slate-500">ICMS próprio (<span id="sim-aliq-inter">${calc.aliquotaInter}</span>%)</p><p id="sim-proprio" class="mt-1 text-xl font-bold text-slate-900">—</p></div>
                    <div class="rounded-xl bg-blue-950 px-4 py-3 text-white"><p class="text-xs font-medium text-blue-100">ICMS-ST a recolher (${escapeHTML(calc.recolhimento)})</p><p id="sim-st" class="mt-1 text-xl font-bold">—</p></div>
                    <div class="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200"><p class="text-xs font-medium text-slate-500">Total da nota fiscal</p><p id="sim-total" class="mt-1 text-xl font-bold text-slate-900">—</p></div>
                </div>
                <details class="group mt-4" open>
                    <summary class="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 [&::-webkit-details-marker]:hidden"><i class="fa-solid fa-list-ol text-xs" aria-hidden="true"></i>Memória de cálculo<i class="fa-solid fa-chevron-down text-[10px] transition group-open:rotate-180" aria-hidden="true"></i></summary>
                    <div class="mt-3 overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
                        <table class="w-full text-sm"><caption class="sr-only">Memória de cálculo do ICMS-ST</caption><tbody id="sim-memoria" class="divide-y divide-slate-100"></tbody></table>
                    </div>
                </details>
                <p class="mt-3 text-xs text-slate-500">Simulação de apoio. Confira a pauta vigente, eventuais benefícios e as hipóteses de inaplicabilidade antes de emitir a nota.</p>
            </section>`;
    }

    function ligarSimulador(calc, ipiTexto) {
        const num = id => {
            const el = $(id);
            if (!el || el.value === '') return null;
            const v = parseFloat(String(el.value).replace(',', '.'));
            return Number.isFinite(v) && v >= 0 ? v : null;
        };
        const ipiAliq = parseFloat(String(ipiTexto || '').replace(',', '.'));
        function calcular() {
            const qtd = Math.floor(num('sim-qtd') || 0);
            const valorUnit = num('sim-valor') || 0;
            const pautaUnit = num('sim-pauta') || 0;
            const interna = num('sim-interna');
            const importada = $('sim-importada').checked;
            const somaIpi = $('sim-ipi')?.checked && Number.isFinite(ipiAliq);
            const aliqInter = importada ? calc.aliquotaImportada : calc.aliquotaInter;
            const valorOp = qtd * valorUnit;
            const proprio = valorOp * aliqInter / 100;
            $('sim-aliq-inter').textContent = aliqInter;
            $('sim-proprio').textContent = brl(proprio);
            const memoria = [['Valor da operação', `${qtd.toLocaleString('pt-BR')} × ${brl(valorUnit)}`, brl(valorOp)],
                [`ICMS próprio (${pct(aliqInter)}${importada ? ', importada' : ''})`, `${brl(valorOp)} × ${pct(aliqInter)}`, brl(proprio)]];
            if (interna === null) {
                $('sim-st').textContent = '—';
                $('sim-total').textContent = '—';
                memoria.push(['ICMS-ST a recolher', 'informe a alíquota interna de destino', '—', true]);
            } else {
                const base = qtd * pautaUnit;
                const bruto = base * interna / 100;
                const icmsSt = Math.max(0, bruto - proprio);
                const ipi = somaIpi ? valorOp * ipiAliq / 100 : 0;
                const total = valorOp + ipi + icmsSt;
                $('sim-st').textContent = brl(icmsSt);
                $('sim-total').textContent = brl(total);
                memoria.push(['Base de cálculo da ST (pauta fiscal)', `${qtd.toLocaleString('pt-BR')} × ${brl(pautaUnit)}`, brl(base)],
                    [`ICMS sobre a base da ST (${pct(interna)})`, `${brl(base)} × ${pct(interna)}`, brl(bruto)],
                    ['ICMS-ST a recolher', `${brl(bruto)} − ${brl(proprio)}`, brl(icmsSt), true]);
                if (somaIpi) memoria.push([`IPI (${pct(ipiAliq)}, TIPI)`, `${brl(valorOp)} × ${pct(ipiAliq)}`, brl(ipi)]);
                memoria.push(['Total da nota fiscal', `operação${somaIpi ? ' + IPI' : ''} + ICMS-ST`, brl(total), true]);
                if (bruto < proprio && qtd > 0) memoria.push(['O ICMS próprio é maior que o imposto calculado sobre a pauta: não há ICMS-ST a recolher.', '', '', false, true]);
            }
            $('sim-memoria').innerHTML = memoria.map(([rotulo, conta, v, destaque, aviso]) => aviso
                ? `<tr><td colspan="3" class="px-3 py-2 text-xs text-amber-800">${rotulo}</td></tr>`
                : `<tr class="${destaque ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'}">
                    <th scope="row" class="px-3 py-2 text-left font-[inherit]">${rotulo}<span class="mt-0.5 block text-xs font-normal text-slate-500 tabular-nums sm:hidden">${conta}</span></th>
                    <td class="hidden px-3 py-2 whitespace-nowrap text-slate-500 tabular-nums sm:table-cell">${conta}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap tabular-nums">${v}</td></tr>`).join('');
        }
        ['sim-qtd', 'sim-valor', 'sim-pauta', 'sim-interna', 'sim-importada', 'sim-ipi'].forEach(id => {
            $(id)?.addEventListener('input', calcular);
            $(id)?.addEventListener('change', calcular);
        });
        calcular();
    }

    // Abas do tratamento: clique e teclado (setas, Home, End), independentes por seção
    function ligarAbasTratamento() {
        document.querySelectorAll('[data-abas-tratamento]').forEach(box => {
            const tabs = [...box.querySelectorAll('[role="tab"]')];
            const ativar = (tab, focar) => {
                tabs.forEach(t => {
                    const on = t === tab;
                    t.classList.toggle('active', on);
                    t.setAttribute('aria-selected', String(on));
                    t.tabIndex = on ? 0 : -1;
                    $(t.getAttribute('aria-controls')).classList.toggle('hidden', !on);
                });
                if (focar) tab.focus();
            };
            box.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) ativar(t, false); });
            box.addEventListener('keydown', e => {
                const i = tabs.indexOf(document.activeElement);
                if (i < 0) return;
                const alvo = { ArrowRight: tabs[(i + 1) % tabs.length], ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length], Home: tabs[0], End: tabs[tabs.length - 1] }[e.key];
                if (alvo) { e.preventDefault(); ativar(alvo, true); }
            });
            // Indicador de rolagem das abas no celular (estilo em input.css)
            const nav = box.querySelector('.cf-tabs');
            const hint = () => {
                const max = nav.scrollWidth - nav.clientWidth;
                if (max <= 1) { nav.removeAttribute('data-overflow'); return; }
                nav.dataset.overflow = nav.scrollLeft <= 1 ? 'end' : nav.scrollLeft >= max - 1 ? 'start' : 'both';
            };
            nav.addEventListener('scroll', hint, { passive: true });
            window.addEventListener('resize', hint);
            hint();
        });
    }

    // ------------------------------------------------------------------
    // Posição / subposição: itens contidos
    // ------------------------------------------------------------------
    function renderPosicao(dados, d) {
        cabecalho(dados, d, dados.posicoes[d] || dados.tec.find(x => x.ncm === d)?.descricao || '', d.length === 4 ? 'Posição NCM' : 'Subposição NCM');
        ligarMonitor(d, dados.posicoes[d] || '');
        const itens = [...new Map(dados.tec.filter(x => x.ncm.length === 8 && x.ncm.startsWith(d) && !x.ex).map(x => [x.ncm, x])).values()].sort((a, b) => a.ncm.localeCompare(b.ncm));
        conteudo.innerHTML = card('itens', 'Itens desta classificação', 'fa-sitemap', itens.length ? `
            <ul class="divide-y divide-slate-100">${itens.map(x => `
                <li><a href="${urlNcm(x.ncm)}" class="group flex items-start gap-4 rounded-lg px-2 py-3 transition hover:bg-blue-50">
                    <span class="w-24 shrink-0 font-semibold text-blue-800 tabular-nums">${formatar(x.ncm)}</span>
                    <span class="min-w-0 flex-1 text-sm text-slate-700 group-hover:text-slate-900">${escapeHTML(x.descricao)}</span>
                    <i class="fa-solid fa-chevron-right mt-1 text-xs text-slate-400 group-hover:text-blue-700" aria-hidden="true"></i>
                </a></li>`).join('')}
            </ul>` : '<p class="text-sm text-slate-500">Nenhum item desta classificação consta nos resultados da busca.</p>');
    }

    function renderNaoEncontrado() {
        $('ncm-titulo').textContent = codigo ? formatar(codigo) : 'NCM não informada';
        $('crumb-codigo').textContent = codigo ? formatar(codigo) : '—';
        $('ncm-descricao').textContent = '';
        conteudo.innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <i class="fa-solid fa-magnifying-glass mb-3 text-3xl text-slate-300" aria-hidden="true"></i>
                <p class="font-medium text-slate-700">Não encontramos o detalhamento desta NCM.</p>
                <p class="mt-1 text-sm text-slate-500">Confira o código ou faça uma nova busca.</p>
                <a href="index.html#titulo-busca-fiscal" class="cf-btn cf-btn-primary mt-4">Nova busca fiscal</a>
            </div>`;
    }

    // ------------------------------------------------------------------
    // Índice "Nesta página" e compartilhar
    // ------------------------------------------------------------------
    function renderIndice(itens) {
        if (!itens.length) return;
        $('indice').innerHTML = itens.map(i => `
            <li><a href="#${i.id}" class="block rounded-lg px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-800">${escapeHTML(i.titulo)}</a></li>`).join('');
        $('indice-wrap').classList.remove('hidden');
    }

    // Monitorar NCM (monitor-ncm.js): botão de destaque em "Ações"; a lista fica em Meu Perfil › Meus documentos
    function ligarMonitor(d, descricao) {
        const btn = $('monitor-btn');
        const monitor = window.CFMonitorNcm;
        if (!btn || !monitor) return;
        const pintar = on => {
            btn.setAttribute('aria-pressed', String(on));
            btn.className = `cf-btn ${on ? 'cf-btn-soft' : 'cf-btn-accent'} w-full`;
            btn.innerHTML = `<i class="${on ? 'fa-solid' : 'fa-regular'} fa-bell" aria-hidden="true"></i><span>${on ? 'NCM monitorada' : 'Monitorar NCM'}</span>`;
            btn.title = on ? 'Clique para deixar de monitorar' : 'Salvar esta NCM para monitoramento';
        };
        pintar(monitor.monitorada(d));
        btn.addEventListener('click', () => {
            const on = monitor.alternar(d, descricao);
            pintar(on);
            $('share-msg').innerHTML = on
                ? 'NCM salva para monitoramento. <a href="meu-perfil.html#documentos" class="underline">Ver em Meu Perfil</a>'
                : 'NCM removida do monitoramento.';
            $('share-msg').classList.remove('hidden');
        });
    }

    $('share-btn').addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({ title: document.title, url: location.href }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(location.href).then(() => {
                $('share-msg').textContent = 'Link copiado para a área de transferência.';
                $('share-msg').classList.remove('hidden');
                setTimeout(() => $('share-msg').classList.add('hidden'), 3000);
            });
        }
    });
});
