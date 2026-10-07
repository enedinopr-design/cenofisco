// Assistente IA (EXEMPLO / demonstração).
// Botão flutuante "IA" que abre um chat de pesquisa. Nesta versão não há IA real:
// as respostas são montadas por busca simples nos JSONs do portal (buscafiscal, agenda,
// legislação, notícias, procedimentos). Para ligar ao Claude no futuro, troque a função
// responder() por uma chamada ao backend (ex.: POST /api/assistente) — a chave da API
// nunca deve ficar no navegador.
(function () {
    if (document.getElementById('ia-fab')) return;

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const fmtNcm = d => (d.length <= 4 ? d : d.length <= 6 ? `${d.slice(0, 4)}.${d.slice(4)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`);
    const dataBr = s => { const [d, m, a] = String(s).split('/').map(Number); return new Date(a, m - 1, d); };
    const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const PARADAS = new Set('a o as os de da do das dos e em no na nos nas um uma para por com sem qual quais que como sobre ser sao e eh me meu minha the tem ter quero saber aliquota aliquotas imposto impostos tributo tributacao ncm ipi ii pis cofins icms st substituicao tributaria importacao interestadual qual-e mais ate entre noticia noticias legislacao procedimento procedimentos'.split(' '));
    const SUGESTOES = ['IPI da cerveja', 'ICMS-ST cerveja PR → SP', 'Obrigações de novembro', 'Notícias sobre Simples Nacional'];

    // ---------- Interface ----------
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'ia-fab';
    fab.className = 'fixed right-5 bottom-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-blue-900 pr-5 pl-4 font-bold text-white shadow-xl ring-2 ring-amber-400 transition hover:bg-blue-800 print:hidden';
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'ia-painel');
    fab.innerHTML = '<span class="inline-flex size-8 items-center justify-center rounded-full bg-amber-400 text-sm font-extrabold text-blue-950" aria-hidden="true">IA</span><span class="text-sm">Pergunte à IA</span>';

    const painel = document.createElement('section');
    painel.id = 'ia-painel';
    painel.hidden = true;
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-modal', 'false');
    painel.setAttribute('aria-labelledby', 'ia-titulo');
    painel.className = 'fixed inset-x-3 bottom-24 z-50 flex max-h-[min(640px,calc(100dvh-7.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[400px] print:hidden';
    painel.innerHTML = `
        <header class="flex items-center gap-3 bg-blue-900 px-4 py-3 text-white cf-on-dark">
            <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-extrabold text-blue-950" aria-hidden="true">IA</span>
            <div class="min-w-0 flex-1">
                <h2 id="ia-titulo" class="text-base leading-tight font-bold">Assistente Cenofisco</h2>
                <p class="text-xs text-blue-100">Exemplo — pesquisa na base do portal</p>
            </div>
            <button type="button" id="ia-limpar" class="inline-flex size-9 items-center justify-center rounded-full text-blue-100 hover:bg-white/10 hover:text-white" aria-label="Nova conversa" title="Nova conversa"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i></button>
            <button type="button" id="ia-fechar" class="inline-flex size-9 items-center justify-center rounded-full text-blue-100 hover:bg-white/10 hover:text-white" aria-label="Fechar assistente"><i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i></button>
        </header>
        <div id="ia-log" class="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4" role="log" aria-live="polite" aria-label="Conversa com o assistente"></div>
        <form id="ia-form" class="border-t border-slate-200 bg-white p-3">
            <label for="ia-input" class="sr-only">Sua pergunta</label>
            <div class="flex items-end gap-2">
                <textarea id="ia-input" rows="1" maxlength="500" placeholder="Digite sua pergunta…" class="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 focus:outline-none sm:text-sm"></textarea>
                <button type="submit" class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50" aria-label="Enviar pergunta"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
            </div>
            <p class="mt-2 text-[11px] leading-snug text-slate-600">Respostas informativas, não substituem consultoria. Precisa de análise? <a href="consultoria.html" class="font-semibold text-blue-800 underline">Fale com um consultor</a>.</p>
        </form>`;

    document.body.append(painel, fab);
    // O botão "voltar ao topo" (mesmo canto) sobe para não ficar atrás do botão da IA
    document.getElementById('back-to-top')?.classList.replace('bottom-5', 'bottom-24');

    const log = painel.querySelector('#ia-log');
    const form = painel.querySelector('#ia-form');
    const input = painel.querySelector('#ia-input');
    const enviarBtn = form.querySelector('button[type=submit]');

    function abrir() {
        painel.hidden = false;
        fab.setAttribute('aria-expanded', 'true');
        if (!log.children.length) boasVindas();
        input.focus();
        carregarBase();
    }
    function fechar() {
        painel.hidden = true;
        fab.setAttribute('aria-expanded', 'false');
        fab.focus();
    }
    fab.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
    painel.querySelector('#ia-fechar').addEventListener('click', fechar);
    painel.querySelector('#ia-limpar').addEventListener('click', () => { log.innerHTML = ''; boasVindas(); input.focus(); });
    painel.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener('submit', e => { e.preventDefault(); perguntar(input.value); });
    log.addEventListener('click', e => { const b = e.target.closest('[data-sugestao]'); if (b) perguntar(b.dataset.sugestao); });

    function bolha(html, quem) {
        const el = document.createElement('div');
        el.className = quem === 'eu' ? 'flex justify-end' : 'flex gap-2';
        el.innerHTML = quem === 'eu'
            ? `<p class="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-900 px-3.5 py-2 text-sm wrap-break-word text-white"><span class="sr-only">Você: </span>${html}</p>`
            : `<span class="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-extrabold text-blue-950" aria-hidden="true">IA</span><div class="ia-resposta min-w-0 max-w-[88%] space-y-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm [&_a]:font-semibold [&_a]:text-blue-800 [&_a]:underline"><span class="sr-only">Assistente: </span>${html}</div>`;
        log.appendChild(el);
        log.scrollTop = log.scrollHeight;
        return el;
    }
    const chips = lista => `<div class="flex flex-wrap gap-1.5 pt-1">${lista.map(s => `<button type="button" data-sugestao="${esc(s)}" class="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">${esc(s)}</button>`).join('')}</div>`;

    function boasVindas() {
        bolha(`<p>Olá! Sou o assistente do Cenofisco. Posso pesquisar <strong>NCMs e alíquotas</strong>, <strong>ICMS-ST</strong>, <strong>prazos da agenda</strong>, <strong>legislação</strong> e <strong>notícias</strong>.</p>
            <p class="text-xs text-slate-600">Versão de demonstração: as respostas vêm de uma busca na base do portal, ainda sem IA.</p>${chips(SUGESTOES)}`);
    }

    async function perguntar(texto) {
        texto = String(texto || '').trim();
        if (!texto || enviarBtn.disabled) return;
        input.value = '';
        input.style.height = 'auto';
        bolha(esc(texto), 'eu');
        enviarBtn.disabled = true;
        const digitando = bolha('<span class="inline-flex gap-1 py-1" aria-label="Pesquisando"><span class="size-2 animate-bounce rounded-full bg-slate-400"></span><span class="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]"></span><span class="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]"></span></span>');
        let html;
        try {
            const [resp] = await Promise.all([responder(texto), espera(700)]);
            html = resp;
        } catch (e) {
            html = '<p>Não consegui consultar a base agora. Tente novamente em instantes.</p>';
        }
        digitando.remove();
        bolha(html);
        enviarBtn.disabled = false;
        input.focus();
    }

    // ---------- Base (JSONs do portal) ----------
    let basePromise;
    function carregarBase() {
        const get = url => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
        basePromise ||= Promise.all(['buscafiscal.json', 'agenda.json', 'legislacao.json', 'noticias.json', 'procedimentos.json'].map(get))
            .then(([fiscal, agenda, legislacao, noticias, procedimentos]) => ({ fiscal, agenda: agenda || [], legislacao: legislacao || [], noticias: noticias || [], procedimentos: procedimentos || [] }));
        return basePromise;
    }

    const termos = q => norm(q).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3 && !PARADAS.has(t) && !/^\d+$/.test(t));
    const pontuar = (texto, ts) => { const n = norm(texto); return ts.reduce((s, t) => s + (n.includes(t) ? 1 : 0), 0); };

    // ---------- "Cérebro" de demonstração ----------
    async function responder(pergunta) {
        const base = await carregarBase();
        const q = norm(pergunta);
        if (/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(q) && q.length < 20) return `<p>Olá! Em que posso ajudar?</p>${chips(SUGESTOES)}`;
        if (/agenda|obrigac|vencimento|vence|prazo/.test(q)) return respostaAgenda(base, q);
        const fiscal = respostaFiscal(base, pergunta, q);
        if (fiscal) return fiscal;
        return respostaConteudo(base, pergunta);
    }

    function respostaAgenda(base, q) {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const mes = MESES.findIndex(m => q.includes(m));
        let itens = base.agenda.map(a => ({ ...a, d: dataBr(a.date) })).filter(a => !isNaN(a.d));
        itens = mes >= 0 ? itens.filter(a => a.d.getMonth() === mes) : itens.filter(a => a.d >= hoje);
        itens.sort((a, b) => a.d - b.d);
        const vistos = new Set();
        itens = itens.filter(a => { const k = a.date + a.title + a.description; if (vistos.has(k)) return false; vistos.add(k); return true; });
        if (!itens.length) return `<p>Não encontrei obrigações ${mes >= 0 ? 'nesse mês' : 'a vencer'} na agenda.</p><p><a href="agenda-obrigacoes.html">Abrir a Agenda de Obrigações</a></p>`;
        const total = itens.length;
        const linhas = itens.slice(0, 6).map(a => `<li><strong>${esc(a.date.slice(0, 5))}</strong> — ${esc(a.title)}${a.description ? ` <span class="text-slate-600">(${esc(a.description)})</span>` : ''}</li>`).join('');
        return `<p>${mes >= 0 ? `Obrigações de <strong>${MESES[mes].replace('marco', 'março')}</strong>` : 'Próximas obrigações a vencer'} (${total} no total):</p>
            <ul class="list-disc space-y-0.5 pl-5">${linhas}</ul>
            <p><a href="agenda-obrigacoes.html">Ver a agenda completa</a></p>`;
    }

    function respostaFiscal(base, pergunta, q) {
        const f = base.fiscal;
        if (!f) return null;
        const codigo = (pergunta.match(/\b\d{4}(?:\.?\d{2}){0,2}\b/) || [''])[0].replace(/\D/g, '');
        const ts = termos(pergunta);
        const querSt = /\bst\b|substitui/.test(q);
        const querIcms = /icms/.test(q);
        const tributoPedido = querSt ? 'st' : /\bipi\b/.test(q) ? 'ipi' : /\bii\b|importac/.test(q) ? 'ii' : /pis|cofins/.test(q) ? 'pis' : querIcms ? 'icms' : '';
        const casa = (ncm, desc) => (codigo ? String(ncm).startsWith(codigo) : ts.length && pontuar(desc, ts) === ts.length);

        let tec = (f.tec || []).filter(t => t.tipi && casa(t.ncm, t.descricao));
        // Prioriza NCMs em que o produto aparece no início da descrição (ex.: "Cerveja…" antes de "Resíduos… da cerveja")
        const principais = ts.length ? tec.filter(t => norm(t.descricao).indexOf(ts[0]) < 12) : [];
        if (principais.length) tec = principais;
        const st = (f.st || []).filter(s => casa(s.ncm, s.mercadoria));
        if (!tec.length && !st.length && !(codigo || tributoPedido)) return null;
        if (!tec.length && !st.length) {
            return `<p>Não encontrei ${codigo ? `a NCM <strong>${esc(fmtNcm(codigo))}</strong>` : 'esse produto'} na base de demonstração (por enquanto ela tem dados de <em>cerveja</em>).</p>
                <p><a href="buscafiscal-resultados.html${ts[0] ? `?q=${encodeURIComponent(ts.join(' '))}` : ''}">Pesquisar na Busca Fiscal</a></p>${chips(['IPI da cerveja', 'ICMS-ST cerveja PR → SP'])}`;
        }

        const ufs = (pergunta.toUpperCase().match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/g) || []);
        const origem = ufs[0] || 'PR', destino = ufs[1] || 'SP';
        const link = (ncm, tributo) => `ncm.html?codigo=${fmtNcm(ncm)}&origem=${origem}&destino=${destino}${tributo ? `&tributo=${tributo}#${tributo}` : ''}`;
        const partes = [];

        if (tec.length && tributoPedido !== 'st') {
            const linhas = tec.slice(0, 4).map(t => {
                const ipi = t.ipi == null ? '—' : /^nt$/i.test(t.ipi) ? 'NT' : `${t.ipi}%`;
                const ii = t.ii == null ? '—' : `${t.ii}%`;
                return `<li><a href="${link(t.ncm, tributoPedido === 'ipi' || tributoPedido === 'ii' ? tributoPedido : '')}">${esc(fmtNcm(t.ncm))}</a> — ${esc(t.descricao)}<br><span class="text-slate-700">IPI: <strong>${esc(ipi)}</strong>${tributoPedido === 'ipi' ? '' : ` · II: <strong>${esc(ii)}</strong>`}</span></li>`;
            }).join('');
            partes.push(`<p>Encontrei ${tec.length === 1 ? 'esta NCM' : `${tec.length} NCMs`} na TIPI/TEC:</p><ul class="list-disc space-y-1 pl-5">${linhas}</ul>`);
        }

        const stRota = st.filter(s => s.origem === origem && s.destino === destino);
        if ((querSt || querIcms || !tec.length) && st.length) {
            if (!stRota.length) {
                partes.push(`<p>Para ICMS-ST, a base de demonstração só tem a rota <strong>PR → SP</strong>.</p>`);
            } else {
                const t = f.tratamentos?.[stRota[0].tratamento];
                const linhas = stRota.map(s => `<li><a href="${link(s.ncm, 'st')}">${esc(fmtNcm(s.ncm))}</a> — ${esc(s.mercadoria)}<br><span class="text-slate-700">CEST ${esc(s.cest)} · interna ${s.aliquotaDestino ? `<strong>${esc(s.aliquotaDestino)}%</strong>` : '<em>não informada</em>'} · interestadual <strong>${esc(s.inter)}%</strong>${s.interMI && s.interMI !== '-' ? ` (importada ${esc(s.interMI)}%)` : ''} · base: ${esc(s.baseCalculo)}</span></li>`).join('');
                partes.push(`<p><strong>ICMS-ST ${origem} → ${destino}</strong>: ${esc(stRota[0].ato.replace(/, DE .*/, ''))} — responsabilidade do <strong>${esc(stRota[0].responsabilidade.toLowerCase())}</strong>.</p>
                    <ul class="list-disc space-y-1 pl-5">${linhas}</ul>
                    ${t?.calculo ? `<p class="text-slate-700">Recolhimento: ${esc(t.calculo.recolhimento)}. Pauta de referência: ${esc(t.calculo.pautaReferencia)}.</p>` : ''}
                    <p>No detalhe da NCM há um <strong>simulador de ICMS-ST</strong>.</p>`);
            }
        }
        if (!partes.length) return null;

        const termoBusca = ts.join(' ') || fmtNcm(codigo);
        partes.push(`<p><a href="buscafiscal-resultados.html?q=${encodeURIComponent(termoBusca)}&busca_fiscal_tipo=ncm&ncm_tipo_busca=ipi&ncm_tipo_busca=ii&ncm_tipo_busca=icms&icms_tipo_operacao=interestadual&uf_origem=${origem}&uf_destino=${destino}">Ver todos os resultados na Busca Fiscal</a></p>
            <p class="text-xs text-slate-600">Fonte: base Cenofisco (demonstração). Confira a legislação antes de aplicar.</p>`);
        return partes.join('');
    }

    function respostaConteudo(base, pergunta) {
        const ts = termos(pergunta);
        if (!ts.length) return `<p>Pode detalhar um pouco mais a pergunta? Por exemplo, um produto, uma NCM, um tributo ou um mês.</p>${chips(SUGESTOES)}`;
        const fontes = [
            ...base.legislacao.map(x => ({ tipo: 'Legislação', titulo: x.title, resumo: x.summary, data: x.date, url: x.link || `legislacao.html?q=${encodeURIComponent(x.title)}` })),
            ...base.noticias.map(x => ({ tipo: 'Notícia', titulo: x.title, resumo: x.summary, data: x.date, url: x.link && x.link !== '#' ? x.link : `noticia.html?id=${encodeURIComponent(x.id)}` })),
            ...base.procedimentos.map(x => ({ tipo: 'Procedimento', titulo: x.title, resumo: x.summary, data: x.date, url: `procedimentos.html?q=${encodeURIComponent(x.title)}` }))
        ];
        const achados = fontes
            .map(x => ({ ...x, p: pontuar(x.titulo, ts) * 2 + pontuar(x.resumo, ts) }))
            .filter(x => x.p >= Math.min(ts.length, 2))
            .sort((a, b) => b.p - a.p || dataBr(b.data) - dataBr(a.data))
            .slice(0, 4);
        if (!achados.length) {
            return `<p>Não encontrei conteúdo sobre <strong>${esc(pergunta)}</strong> na base do portal.</p>
                <p>Para casos específicos, nossos consultores podem ajudar: <a href="consultoria.html">Consultoria</a>.</p>`;
        }
        const linhas = achados.map(x => `<li><span class="text-xs font-semibold tracking-wide text-slate-600 uppercase">${x.tipo} · ${esc(x.data || '')}</span><br><a href="${esc(x.url)}">${esc(x.titulo)}</a>${x.resumo ? `<br><span class="text-slate-700">${esc(x.resumo.length > 140 ? x.resumo.slice(0, 137) + '…' : x.resumo)}</span>` : ''}</li>`).join('');
        return `<p>Encontrei estes conteúdos relacionados:</p><ul class="space-y-2.5">${linhas}</ul>`;
    }
})();
