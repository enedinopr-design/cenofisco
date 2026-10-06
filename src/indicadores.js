// Página de Indicadores e Taxas: índices mensais (variação %) e câmbio (cotação PTAX), com gráfico, acumulados e tabela.
// Dados ao vivo do SGS (Banco Central): https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json
// O indicador e o período ficam no endereço (ex.: indicadores.html?indicador=ipca&periodo=24).
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
    const chartEl = $('chart');
    if (!chartEl) return;
    const listEl = $('ind-list');
    const eyebrowEl = $('ind-eyebrow');
    const titleEl = $('ind-title');
    const descEl = $('ind-desc');
    const statsEl = $('ind-stats');
    const periodoEl = $('periodo');
    const captionEl = $('chart-caption');
    const tooltipEl = $('chart-tooltip');
    const statusEl = $('ind-status');
    const theadEl = $('ind-thead');
    const tableEl = $('ind-table');
    const csvBtn = $('csv-btn');

    // Séries em indicadores-series.js (compartilhado com o cartão da página inicial)
    const INDICADORES = window.CF_INDICADORES || [];
    const PERIODOS = [12, 24, 60];
    const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const BAR = '#1d4ed8';        // blue-700 (cor da série)
    const BAR_HOVER = '#1e3a8a';  // blue-900
    const GRID = '#e2e8f0';       // slate-200
    const AXIS_TEXT = '#64748b';  // slate-500
    const INK = '#0f172a';        // slate-900

    const fmt = (v, casas = 2) => v == null || isNaN(v) ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    const pct = (v, casas) => (v == null || isNaN(v) ? '—' : `${fmt(v, casas)}%`);
    const brl = v => (v == null || isNaN(v) ? '—' : `R$ ${fmt(v, 4)}`);
    const isCambio = ind => ind.tipo === 'cambio';
    const casasOf = ind => (ind.id === 'tr' ? 4 : 2);
    const mesLabel = p => `${MESES[p.m]}/${String(p.y).slice(2)}`;
    const mesExtenso = p => `${MESES[p.m]}/${p.y}`;
    // Valor principal de um mês: cotação (câmbio) ou variação % (índices)
    const valorOf = (ind, p) => (isCambio(ind) ? brl(p.cot) : pct(p.v, casasOf(ind)));

    const series = {};   // id -> [{ y, m, v, ano, doze }] (+ cot e dia no câmbio)
    const state = { indicador: 'igpm', periodo: 24 };
    const p0 = new URLSearchParams(location.search);
    if (INDICADORES.some(i => i.id === p0.get('indicador'))) state.indicador = p0.get('indicador');
    if (PERIODOS.includes(Number(p0.get('periodo')))) state.periodo = Number(p0.get('periodo'));

    // --- Dados ---
    // Busca 6 anos (5 exibíveis + 1 para o acumulado em 12 meses do primeiro mês)
    const inicio = new Date();
    inicio.setFullYear(inicio.getFullYear() - 6, 0, 1);
    const dataInicial = `01/01/${inicio.getFullYear()}`;

    function carregar(ind) {
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${ind.sgs}/dados?formato=json&dataInicial=${dataInicial}`;
        const buscar = () => fetch(url).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });
        // A API do BCB às vezes falha numa requisição isolada: tenta mais uma vez após 1,5 s
        return buscar()
            .catch(() => new Promise(res => setTimeout(res, 1500)).then(buscar))
            .then(rows => {
                const diarios = rows
                    .map(r => {
                        const [dd, mm, yyyy] = r.data.split('/');
                        return { y: Number(yyyy), m: Number(mm) - 1, d: Number(dd), v: parseFloat(r.valor) };
                    })
                    .filter(p => !isNaN(p.v))
                    .sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
                series[ind.id] = isCambio(ind) ? mensalCambio(diarios) : mensalIndice(diarios);
            });
    }

    // Índices: o valor já é a variação % do mês; acumulados por capitalização composta
    function mensalIndice(pts) {
        pts.forEach((p, i) => {
            let ano = 1;
            for (let j = i; j >= 0 && pts[j].y === p.y; j--) ano *= 1 + pts[j].v / 100;
            p.ano = (ano - 1) * 100;
            if (i >= 11) {
                let doze = 1;
                for (let j = i - 11; j <= i; j++) doze *= 1 + pts[j].v / 100;
                p.doze = (doze - 1) * 100;
            }
        });
        return pts;
    }

    // Câmbio: cotação do último dia útil de cada mês (o mês corrente fica com a cotação mais recente);
    // variações em relação ao fechamento do mês anterior, de dezembro do ano anterior e de 12 meses antes
    function mensalCambio(diarios) {
        const meses = [];
        diarios.forEach(p => {
            const last = meses[meses.length - 1];
            const dia = `${String(p.d).padStart(2, '0')}/${String(p.m + 1).padStart(2, '0')}/${p.y}`;
            if (last && last.y === p.y && last.m === p.m) { last.cot = p.v; last.dia = dia; }
            else meses.push({ y: p.y, m: p.m, cot: p.v, dia });
        });
        const varia = (a, b) => (a && b ? (a.cot / b.cot - 1) * 100 : null);
        meses.forEach((p, i) => {
            p.v = varia(p, meses[i - 1]);
            p.ano = varia(p, meses.find(q => q.y === p.y - 1 && q.m === 11));
            p.doze = varia(p, meses[i - 12]);
        });
        return meses;
    }

    renderList();
    Promise.allSettled(INDICADORES.map(carregar)).then(() => {
        renderList();
        render();
    });

    // --- Lateral ---
    function renderList() {
        let grupo = '';
        listEl.innerHTML = INDICADORES.map(ind => {
            const pts = series[ind.id];
            const last = pts && pts[pts.length - 1];
            const on = state.indicador === ind.id;
            const head = ind.grupo !== grupo
                ? `<li class="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase first:pt-0">${(grupo = ind.grupo)}</li>`
                : '';
            return `${head}<li><button type="button" data-ind="${ind.id}" class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'}" aria-pressed="${on}">
                <span>${ind.nome} <span class="text-xs font-normal ${on ? 'text-blue-600' : 'text-slate-400'}">(${ind.fonte})</span></span>
                <span class="text-xs tabular-nums ${on ? 'text-blue-700' : 'text-slate-500'}">${last ? valorOf(ind, last) : pts === undefined ? '…' : '—'}</span>
            </button></li>`;
        }).join('');
    }

    // --- Indicador selecionado ---
    function render() {
        const ind = INDICADORES.find(i => i.id === state.indicador);
        const pts = series[ind.id];
        const cambio = isCambio(ind);
        const casas = casasOf(ind);
        writeParams();
        document.title = `${ind.nome} - Indicadores e Taxas - Cenofisco`;
        eyebrowEl.textContent = `${ind.grupo} · ${ind.fonte}`;
        titleEl.textContent = ind.nome;
        descEl.textContent = ind.desc;
        periodoEl.querySelectorAll('[data-periodo]').forEach(b => {
            const on = Number(b.dataset.periodo) === state.periodo;
            b.className = `cursor-pointer rounded-md px-3 py-1.5 transition ${on ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`;
            b.setAttribute('aria-pressed', String(on));
        });
        const th = (txt, right = true) => `<th scope="col" class="px-5 py-3${right ? ' text-right' : ''}">${txt}</th>`;
        theadEl.innerHTML = th('Mês', false) + (cambio ? th('Fechamento') : '') + th('No mês') + th('No ano') + th('12 meses');

        if (!pts || !pts.length) {
            statusEl.textContent = 'Não foi possível consultar os dados no Banco Central agora. Tente novamente em alguns minutos.';
            statusEl.classList.remove('hidden');
            statsEl.innerHTML = '';
            chartEl.innerHTML = '';
            captionEl.textContent = '';
            tableEl.innerHTML = '';
            return;
        }
        statusEl.classList.add('hidden');

        const last = pts[pts.length - 1];
        const tile = (label, value, sub) => `
            <div class="rounded-xl bg-slate-50 px-4 py-3">
                <dt class="text-xs font-medium text-slate-500">${label}</dt>
                <dd class="mt-1 text-2xl font-bold text-slate-900">${value}</dd>
                <dd class="text-xs text-slate-400">${sub}</dd>
            </div>`;
        statsEl.innerHTML = cambio
            ? tile('Cotação atual', brl(last.cot), `PTAX venda · ${last.dia}`) +
              tile('Variação no ano', pct(last.ano, 2), `desde o fechamento de dez/${last.y - 1}`) +
              tile('Variação em 12 meses', pct(last.doze, 2), `em relação a ${MESES[last.m]}/${last.y - 1}`)
            : tile('Último mês', pct(last.v, casas), mesExtenso(last)) +
              tile('Acumulado no ano', pct(last.ano, 2), `jan a ${MESES[last.m]}/${last.y}`) +
              tile('Acumulado em 12 meses', pct(last.doze, 2), `até ${mesExtenso(last)}`);

        const view = pts.slice(-state.periodo);
        captionEl.textContent = cambio
            ? `Cotação de fechamento do mês (R$) · ${mesExtenso(view[0])} a ${mesExtenso(last)} · mês atual até ${last.dia}`
            : `Variação mensal (%) · ${mesExtenso(view[0])} a ${mesExtenso(last)}`;
        current = { pts: view, ind };
        drawChart();

        const td = (txt, cls = 'text-slate-600') => `<td class="px-5 py-2.5 text-right ${cls}">${txt}</td>`;
        tableEl.innerHTML = view.slice().reverse().map(p => `
            <tr class="hover:bg-slate-50">
                <th scope="row" class="px-5 py-2.5 text-left font-medium text-slate-700">${mesExtenso(p)}${cambio ? `<span class="block text-[11px] font-normal text-slate-400">${p.dia}</span>` : ''}</th>
                ${cambio ? td(brl(p.cot), 'text-slate-900') : ''}
                ${td(pct(p.v, casas), p.v < 0 ? 'text-red-600' : cambio ? 'text-slate-600' : 'text-slate-900')}
                ${td(pct(p.ano, 2))}
                ${td(pct(p.doze, 2))}
            </tr>`).join('');
    }

    // --- Gráfico (SVG): colunas de variação % nos índices; linha da cotação no câmbio ---
    let current = { pts: [], ind: null };
    function drawChart() {
        const { pts, ind } = current;
        const W = chartEl.clientWidth;
        const H = chartEl.clientHeight;
        if (!W || !H || !pts.length) return;
        const cambio = isCambio(ind);
        const casas = casasOf(ind);
        const pad = { top: 22, right: cambio ? 16 : 8, bottom: 28, left: cambio ? 56 : 44 };
        const iw = W - pad.left - pad.right;
        const ih = H - pad.top - pad.bottom;

        // Escala com marcas "redondas"; nas colunas o zero fica sempre visível
        const vals = pts.map(p => (cambio ? p.cot : p.v)).filter(v => v != null);
        let min = Math.min(...vals, ...(cambio ? [] : [0]));
        let max = Math.max(...vals, ...(cambio ? [] : [0]));
        if (min === max) { min -= 1; max += 1; }
        const step = niceStep((max - min) / 4);
        min = Math.floor(min / step) * step;
        max = Math.ceil(max / step) * step;
        const y = v => pad.top + ((max - v) / (max - min)) * ih;
        const ticks = [];
        for (let t = min; t <= max + step / 2; t += step) ticks.push(+t.toFixed(6));
        const tickCasas = step < 0.1 ? 2 : step < 1 ? 1 : 0;
        const tickLabel = t => (cambio ? `R$ ${fmt(t, Math.max(tickCasas, 2))}` : `${fmt(t, tickCasas)}%`);

        const slot = iw / pts.length;
        const cxOf = i => pad.left + slot * i + slot / 2;
        // Rótulos do eixo X sem colisão: todo mês, a cada 3 meses (contando do último) ou o ano em janeiro
        const every = slot >= 46 ? 1 : slot >= 16 ? 3 : 12;

        let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, ui-sans-serif, system-ui, sans-serif">`;
        ticks.forEach(t => {
            svg += `<line x1="${pad.left}" x2="${W - pad.right}" y1="${y(t)}" y2="${y(t)}" stroke="${!cambio && t === 0 ? '#94a3b8' : GRID}" stroke-width="1" shape-rendering="crispEdges"/>`;
            svg += `<text x="${pad.left - 8}" y="${y(t)}" dy="0.32em" text-anchor="end" font-size="11" fill="${AXIS_TEXT}" style="font-variant-numeric: tabular-nums">${tickLabel(t)}</text>`;
        });

        if (cambio) {
            // Linha 2px; guia vertical e marcador aparecem no hover
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${cxOf(i)},${y(p.cot)}`).join(' ');
            svg += `<line id="chart-guide" x1="0" x2="0" y1="${pad.top}" y2="${pad.top + ih}" stroke="#94a3b8" stroke-width="1" visibility="hidden"/>`;
            svg += `<path d="${d}" fill="none" stroke="${BAR}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
            svg += `<circle id="chart-dot" r="5" fill="${BAR}" stroke="#fff" stroke-width="2" visibility="hidden"/>`;
        } else {
            const bw = Math.max(2, Math.min(24, slot * 0.7, slot - 2));
            const r = Math.min(4, bw / 2);
            pts.forEach((p, i) => {
                const x0 = cxOf(i) - bw / 2;
                const y0 = y(0);
                const y1 = y(p.v);
                const h = Math.abs(y1 - y0);
                const k = Math.min(r, h);
                // Coluna com ponta arredondada (4px) e base reta no zero
                const path = h < 0.5 ? '' : p.v >= 0
                    ? `M${x0},${y0} V${y1 + k} Q${x0},${y1} ${x0 + k},${y1} H${x0 + bw - k} Q${x0 + bw},${y1} ${x0 + bw},${y1 + k} V${y0} Z`
                    : `M${x0},${y0} V${y1 - k} Q${x0},${y1} ${x0 + k},${y1} H${x0 + bw - k} Q${x0 + bw},${y1} ${x0 + bw},${y1 - k} V${y0} Z`;
                svg += `<path d="${path}" fill="${BAR}" data-bar="${i}"/>`;
            });
        }

        pts.forEach((p, i) => {
            // Área de interação: a faixa inteira do mês
            svg += `<rect x="${pad.left + slot * i}" y="${pad.top}" width="${slot}" height="${ih}" fill="transparent" data-hit="${i}" tabindex="0" aria-label="${mesExtenso(p)}: ${valorOf(ind, p)}"/>`;
            if (every === 12 ? p.m === 0 : (pts.length - 1 - i) % every === 0) {
                svg += `<text x="${cxOf(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${AXIS_TEXT}">${every === 12 ? p.y : mesLabel(p)}</text>`;
            }
        });

        // Rótulo só no último mês (no câmbio, com ponto final na linha)
        const lp = pts[pts.length - 1];
        const lx = cxOf(pts.length - 1);
        const lv = cambio ? lp.cot : lp.v;
        if (cambio) svg += `<circle cx="${lx}" cy="${y(lv)}" r="4" fill="${BAR}" stroke="#fff" stroke-width="2"/>`;
        // Na linha, o rótulo vai do lado oposto ao trecho que chega no último ponto (não cruza a linha)
        const prevV = cambio && pts.length > 1 ? pts[pts.length - 2].cot : null;
        const ly = cambio ? (prevV != null && prevV > lv ? y(lv) + 18 : y(lv) - 10) : lv >= 0 ? y(lv) - 6 : y(lv) + 14;
        const lbl = cambio ? fmt(lv, 4) : pct(lv, casas);
        svg += `<text x="${Math.min(lx, W - 2)}" y="${ly}" text-anchor="${lx > W - 40 ? 'end' : 'middle'}" font-size="11" font-weight="600" fill="${INK}">${lbl}</text>`;
        svg += '</svg>';
        chartEl.innerHTML = svg;
        current.y = y;
        current.cxOf = cxOf;
    }

    function niceStep(raw) {
        const pow = Math.pow(10, Math.floor(Math.log10(raw)));
        const n = raw / pow;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
    }

    // --- Tooltip ---
    let hovered = null;
    function showTip(i) {
        const { pts, ind } = current;
        const p = pts[i];
        if (!p) return;
        const cambio = isCambio(ind);
        if (cambio) {
            const x = current.cxOf(i);
            const guide = chartEl.querySelector('#chart-guide');
            const dot = chartEl.querySelector('#chart-dot');
            guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.setAttribute('visibility', 'visible');
            dot.setAttribute('cx', x); dot.setAttribute('cy', current.y(p.cot)); dot.setAttribute('visibility', 'visible');
        } else {
            if (hovered !== null) chartEl.querySelector(`[data-bar="${hovered}"]`)?.setAttribute('fill', BAR);
            chartEl.querySelector(`[data-bar="${i}"]`)?.setAttribute('fill', BAR_HOVER);
        }
        hovered = i;
        tooltipEl.replaceChildren();
        const strong = document.createElement('strong');
        strong.className = 'block text-sm text-slate-900';
        strong.textContent = valorOf(ind, p);
        const mes = document.createElement('span');
        mes.className = 'block text-slate-500';
        mes.textContent = cambio ? `${mesExtenso(p)} · fechamento em ${p.dia}` : mesExtenso(p);
        const acc = document.createElement('span');
        acc.className = 'mt-1 block text-slate-500';
        acc.textContent = cambio
            ? `No mês: ${pct(p.v, 2)} · 12 meses: ${pct(p.doze, 2)}`
            : `No ano: ${pct(p.ano, 2)} · 12 meses: ${pct(p.doze, 2)}`;
        tooltipEl.append(strong, mes, acc);
        tooltipEl.classList.remove('hidden');

        const hit = chartEl.querySelector(`[data-hit="${i}"]`).getBoundingClientRect();
        const box = tooltipEl.parentElement.getBoundingClientRect();
        const tw = tooltipEl.offsetWidth;
        let left = hit.left - box.left + hit.width / 2 - tw / 2;
        left = Math.max(0, Math.min(left, box.width - tw));
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${chartEl.offsetTop - tooltipEl.offsetHeight + 8}px`;
    }
    function hideTip() {
        if (hovered !== null) chartEl.querySelector(`[data-bar="${hovered}"]`)?.setAttribute('fill', BAR);
        chartEl.querySelector('#chart-guide')?.setAttribute('visibility', 'hidden');
        chartEl.querySelector('#chart-dot')?.setAttribute('visibility', 'hidden');
        hovered = null;
        tooltipEl.classList.add('hidden');
    }
    chartEl.addEventListener('pointermove', e => {
        const hit = e.target.closest('[data-hit]');
        if (hit) showTip(Number(hit.dataset.hit));
        else hideTip();
    });
    chartEl.addEventListener('pointerleave', hideTip);
    chartEl.addEventListener('focusin', e => {
        const hit = e.target.closest('[data-hit]');
        if (hit) showTip(Number(hit.dataset.hit));
    });
    chartEl.addEventListener('focusout', hideTip);

    // Redesenha ao mudar a largura
    let lastW = 0;
    new ResizeObserver(() => {
        if (chartEl.clientWidth !== lastW && current.pts.length) {
            lastW = chartEl.clientWidth;
            drawChart();
        }
    }).observe(chartEl);

    // --- Endereço ---
    function writeParams() {
        const p = new URLSearchParams();
        if (state.indicador !== 'igpm') p.set('indicador', state.indicador);
        if (state.periodo !== 24) p.set('periodo', state.periodo);
        const qs = p.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    // --- Eventos ---
    listEl.addEventListener('click', e => {
        const b = e.target.closest('[data-ind]');
        if (!b) return;
        state.indicador = b.dataset.ind;
        renderList();
        render();
    });
    periodoEl.addEventListener('click', e => {
        const b = e.target.closest('[data-periodo]');
        if (!b) return;
        state.periodo = Number(b.dataset.periodo);
        render();
    });
    csvBtn.addEventListener('click', () => {
        const ind = INDICADORES.find(i => i.id === state.indicador);
        const pts = series[ind.id];
        if (!pts) return;
        const n = v => (v == null ? '' : v.toFixed(4).replace('.', ','));
        const mes = p => `${String(p.m + 1).padStart(2, '0')}/${p.y}`;
        const linhas = isCambio(ind)
            ? ['Mês;Data do fechamento;Fechamento (R$);No mês (%);No ano (%);12 meses (%)']
                .concat(pts.map(p => `${mes(p)};${p.dia};${n(p.cot)};${n(p.v)};${n(p.ano)};${n(p.doze)}`))
            : ['Mês;No mês (%);No ano (%);12 meses (%)']
                .concat(pts.map(p => `${mes(p)};${n(p.v)};${n(p.ano)};${n(p.doze)}`));
        const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${ind.id}-mensal.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    });
});
