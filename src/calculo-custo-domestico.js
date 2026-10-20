// Custo Mensal - Empregado Doméstico (calculo-custo-domestico.html), modelo: aplicativo original do Cenofisco
// Campos como no aplicativo original: salário bruto, dependentes, pensão alimentícia, previdência privada (deduções do
// IRPF) e percentual do vale-transporte.
// Regras (LC 150/2015): empregado — CP progressiva, IRRF (deduções legais × desconto simplificado, o menor) e VT;
// empregador — CP 8%, GILRAT 0,8%, FGTS 8% e multa do FGTS antecipada 3,2%, todos no DAE com a CP e o IRRF do empregado.
// Custo mensal = salário líquido + DAE + provisão do 13º (1/12) + provisão do 1/3 de férias (1/3 de 1/12).
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas), com link que reabre já calculado.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ------------------------------------------------------------------
    // Tabelas de 2026 — conferir a cada atualização oficial (as mesmas de calculo-rescisao.js)
    // ------------------------------------------------------------------
    const TABELAS = {
        inss: [[1621.00, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]],   // faixas progressivas; o último limite é o teto
        irrf: [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]],
        deducaoDependente: 189.59,
        descontoSimplificado: 607.20,
        reducao: { isencaoAte: 5000.00, limite: 7350.00, maxima: 312.89, a: 978.62, b: 0.133145 },
        vtMaximo: 6
    };
    // Encargos do empregador doméstico (LC 150/2015, art. 34)
    const ENCARGOS = [
        ['cpEmpregador', 'Contribuição previdenciária', 8],
        ['fgts', 'FGTS', 8],
        ['multaFgts', 'Multa – FGTS (antecipação)', 3.2],
        ['gilrat', 'GILRAT', 0.8]
    ];

    const $ = id => document.getElementById(id);

    // Menu do celular
    const menuToggle = $('menu-toggle'), mainMenu = $('main-menu');
    menuToggle?.addEventListener('click', () => {
        const oculto = mainMenu.classList.toggle('hidden');
        menuToggle.setAttribute('aria-expanded', String(!oculto));
    });

    // Notas Cenofisco: "Ver mais" / "Ver menos"
    const notas = $('notas-conteudo');
    const notasBtn = $('notas-toggle');
    const RECOLHIDO = ['max-h-64', 'mask-[linear-gradient(to_bottom,black_55%,transparent)]'];
    notasBtn?.addEventListener('click', function () {
        const abrir = notasBtn.getAttribute('aria-expanded') !== 'true';
        RECOLHIDO.forEach(c => notas.classList.toggle(c, !abrir));
        notasBtn.setAttribute('aria-expanded', String(abrir));
        notasBtn.querySelector('span').textContent = abrir ? 'Ver menos' : 'Ver mais';
        notasBtn.querySelector('i').classList.toggle('rotate-180', abrir);
        if (!abrir) notas.parentElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    const form = $('custo-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = v => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    const r2 = v => Math.round(v * 100) / 100;
    const parseNum = v => parseFloat(String(v || '').replace(/\s|R\$|%/g, '').replace(/\./g, '').replace(',', '.')) || 0;

    // --- INSS e IRRF ---
    function calcInss(base) {
        let desconto = 0, anterior = 0;
        for (const [limite, aliquota] of TABELAS.inss) {
            if (base <= anterior) break;
            desconto += (Math.min(base, limite) - anterior) * aliquota;
            anterior = limite;
        }
        return r2(desconto);
    }
    function reducao(rendimentos, imposto) {
        const r = TABELAS.reducao;
        if (rendimentos <= r.isencaoAte) return Math.min(imposto, r.maxima);
        if (rendimentos <= r.limite) return Math.min(imposto, Math.max(0, r.a - r.b * rendimentos));
        return 0;
    }
    function irrf(rendimentos, deducoes) {
        const base = r2(Math.max(0, rendimentos - deducoes));
        const faixa = TABELAS.irrf.find(([limite]) => base <= limite);
        const imposto = r2(Math.max(0, base * faixa[1] - faixa[2]));
        const red = r2(reducao(rendimentos, imposto));
        return { base, aliquota: faixa[1], deduzir: faixa[2], imposto, reducao: red, valor: r2(imposto - red), deducoes: r2(deducoes) };
    }

    // Máscara simples de moeda/percentual
    ['salario', 'vt', 'pensao', 'previdencia'].forEach(id => $(id).addEventListener('blur', () => {
        const v = parseNum($(id).value);
        $(id).value = v ? num(v) : '';
    }));

    // Erros por campo
    const CAMPOS = ['salario', 'vt', 'dependentes'];
    function erro(id, msg) {
        const el = $(id), span = $(`${id}-erro`);
        el.classList.add('border-red-500', 'ring-2', 'ring-red-100');
        el.setAttribute('aria-invalid', 'true');
        span.textContent = msg;
        span.classList.remove('hidden');
    }
    function limparErros() {
        CAMPOS.forEach(id => {
            const el = $(id), span = $(`${id}-erro`);
            el.classList.remove('border-red-500', 'ring-2', 'ring-red-100');
            el.removeAttribute('aria-invalid');
            span.textContent = '';
            span.classList.add('hidden');
        });
    }
    function validar() {
        limparErros();
        let ok = true;
        if (parseNum($('salario').value) <= 0) { erro('salario', 'Informe o salário bruto.'); ok = false; }
        if (parseNum($('vt').value) > TABELAS.vtMaximo) { erro('vt', `O desconto do vale-transporte é de até ${TABELAS.vtMaximo}%.`); ok = false; }
        const dep = $('dependentes').value.trim();
        if (dep && !/^\d{1,2}$/.test(dep)) { erro('dependentes', 'Informe um número inteiro.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const salario = parseNum($('salario').value);
        const dependentes = parseInt($('dependentes').value, 10) || 0;
        const pensao = parseNum($('pensao').value), previdencia = parseNum($('previdencia').value);
        const vtPct = parseNum($('vt').value);

        const cp = calcInss(salario);
        const dedDependentes = r2(dependentes * TABELAS.deducaoDependente);
        const legal = irrf(salario, cp + dedDependentes + pensao + previdencia);
        const simpl = irrf(salario, TABELAS.descontoSimplificado);
        const usarSimpl = simpl.valor < legal.valor;              // o mais benéfico ao empregado
        const ir = usarSimpl ? simpl : legal;
        const vt = r2(salario * vtPct / 100);
        const liquido = r2(salario - cp - ir.valor - vt);

        const encargos = ENCARGOS.map(([chave, nome, aliquota]) => ({ chave, nome, aliquota, valor: r2(salario * aliquota / 100) }));
        const dae = r2(cp + ir.valor + encargos.reduce((s, e) => s + e.valor, 0));
        const prov13 = r2(salario / 12);
        const provTerco = r2(salario / 3 / 12);
        const liquidoEncargos = r2(liquido + dae);
        return {
            salario, dependentes, pensao, previdencia, vtPct, cp, dedDependentes, legal, simpl, usarSimpl, ir, vt, liquido,
            encargos, dae, prov13, provTerco, liquidoEncargos, custo: r2(liquidoEncargos + prov13 + provTerco)
        };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    const linhas = itens => itens.filter(Boolean).map(([k, v, destaque]) => `<div class="cf-row${destaque ? ' font-semibold' : ''}"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900 tabular-nums">${esc(v)}</dd></div>`).join('');

    function mostrar(c, rolar) {
        $('res-custo').textContent = brl(c.custo);
        $('res-liquido').textContent = brl(c.liquido);
        $('res-dae').textContent = brl(c.dae);
        $('res-provisoes').textContent = brl(r2(c.prov13 + c.provTerco));

        const ir = c.ir;
        $('res-descontos').innerHTML = linhas([
            ['Salário bruto', brl(c.salario)],
            ['(−) Contribuição previdenciária (CP)', brl(c.cp)],
            c.usarSimpl ? ['Desconto simplificado (IRPF)', brl(TABELAS.descontoSimplificado)] : null,
            !c.usarSimpl && c.dependentes ? [`Dependentes (${c.dependentes} × ${num(TABELAS.deducaoDependente)})`, brl(c.dedDependentes)] : null,
            !c.usarSimpl && c.pensao ? ['Pensão alimentícia', brl(c.pensao)] : null,
            !c.usarSimpl && c.previdencia ? ['Previdência privada', brl(c.previdencia)] : null,
            ['Base de cálculo do IRPF', brl(ir.base)],
            ['Alíquota', ir.aliquota ? pct(ir.aliquota * 100) : 'Isento'],
            ['Parcela a deduzir', brl(ir.deduzir)],
            ir.reducao ? ['Redução (Lei 15.270/2025)', brl(ir.reducao)] : null,
            ['(−) IR apurado', brl(ir.valor)],
            [`(−) Vale-transporte (${pct(c.vtPct)})`, brl(c.vt)],
            ['Salário líquido', brl(c.liquido), true]
        ]);
        const outro = c.usarSimpl ? c.legal : c.simpl;
        $('res-ir-modo').textContent = c.legal.valor === c.simpl.valor
            ? `As deduções legais e o desconto simplificado resultam no mesmo IRRF (${brl(ir.valor)}).`
            : `IRRF calculado ${c.usarSimpl ? 'com o desconto simplificado' : 'pelas deduções legais'}, o mais benéfico. Pela outra forma, seria de ${brl(outro.valor)}. Pensão alimentícia e previdência privada entram apenas como deduções do IRPF.`;

        $('tab-encargos').innerHTML = [
            ['grupo', 'Empregado'],
            ['Contribuição previdenciária', '', c.cp],
            ['IRPF', '', ir.valor],
            ['grupo', 'Empregador'],
            ...c.encargos.map(e => [e.nome, pct(e.aliquota), e.valor])
        ].map(([rot, ref, valor]) => rot === 'grupo'
            ? `<tr><th scope="rowgroup" colspan="3" class="pt-3 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">${esc(ref)}</th></tr>`
            : `<tr class="border-b border-slate-100">
                <td class="py-2.5 pr-3 text-slate-700">${esc(rot)}</td>
                <td class="py-2.5 pr-3 text-right text-xs whitespace-nowrap text-slate-500">${esc(ref)}</td>
                <td class="py-2.5 text-right font-medium whitespace-nowrap text-slate-900 tabular-nums">${brl(valor)}</td>
            </tr>`).join('');
        $('tot-dae').textContent = brl(c.dae);

        $('res-custo-detalhe').innerHTML = linhas([
            ['Salário líquido + encargos', brl(c.liquidoEncargos)],
            ['Provisão – 13º salário (1/12)', brl(c.prov13)],
            ['Provisão – 1/3 de férias (1/3 de 1/12)', brl(c.provTerco)],
            ['Custo mensal total', brl(c.custo), true]
        ]);

        resultado.classList.remove('hidden');
        if (rolar) {
            resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
            resultado.focus({ preventScroll: true });
        }
    }

    let ultimo = null, abrindoSalvo = false;
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!validar()) {
            resultado.classList.add('hidden');
            form.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }
        ultimo = calcular();
        mostrar(ultimo, !abrindoSalvo);
    });

    $('limpar-btn').addEventListener('click', () => {
        form.reset();
        limparErros();
        resultado.classList.add('hidden');
        ultimo = null;
    });
    $('imprimir-btn').addEventListener('click', () => window.print());

    // --- Cálculos salvos (lateral e página de Ferramentas) ---
    const TIPO = 'Custo Mensal - Empregado Doméstico';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { salario: 'salario', dependentes: 'dependentes', pensao: 'pensao', previdencia: 'previdencia', vt: 'vt' };
    const linkCalculo = inputs => 'calculo-custo-domestico.html?' + new URLSearchParams(inputs).toString();

    function renderSalvos() {
        if (!lista) return;
        const salvos = lerCalculos().filter(c => c.tipo === TIPO);
        if (!salvos.length) {
            lista.innerHTML = '<li class="px-1 text-xs text-slate-500">Nenhum cálculo salvo. Use <strong>Salvar cálculo</strong> no resultado.</li>';
            return;
        }
        lista.innerHTML = salvos.slice(0, 8).map(c => `
            <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                <a href="${esc(c.link)}" class="min-w-0 flex-1 px-2 py-1.5">
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(c.inputs?.salario ? `Salário R$ ${c.inputs.salario}` : 'Empregado doméstico')}</span>
                    <span class="block text-[11px] text-slate-400">${esc([c.dataSalvo, c.resultados?.resumo].filter(Boolean).join(' · '))}</span>
                </a>
                <button type="button" class="remove-calc mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${esc(c.id)}" aria-label="Remover cálculo de ${esc(c.dataSalvo || '')}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </li>`).join('');
    }
    lista?.addEventListener('click', e => {
        const b = e.target.closest('.remove-calc');
        if (!b) return;
        gravarCalculos(lerCalculos().filter(c => c.id !== b.dataset.id));
        renderSalvos();
    });
    renderSalvos();

    $('salvar-calculo-btn').addEventListener('click', () => {
        if (!ultimo) return;
        const inputs = {};
        Object.entries(CHAVES).forEach(([k, id]) => { inputs[k] = $(id).value; });
        gravarCalculos([{
            id: `domestico-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { resumo: `Custo ${brl(ultimo.custo)}`, custoMensal: brl(ultimo.custo), dae: brl(ultimo.dae), salarioLiquido: brl(ultimo.liquido) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-custo-domestico.html?salario=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('salario')) {
        Object.entries(CHAVES).forEach(([k, id]) => { if (params.has(k)) $(id).value = params.get(k); });
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
