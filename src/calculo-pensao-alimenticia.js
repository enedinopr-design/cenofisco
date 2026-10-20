// Cálculo de Pensão Alimentícia (calculo-pensao-alimenticia.html), modelo: aplicativo original do Cenofisco
// Campos como no aplicativo original: rendimento bruto, contribuição previdenciária (calculada), percentual da pensão,
// dependentes (sem o alimentando), previdência privada e FAPI.
// Regras: pensão = percentual × (bruto − INSS − IRRF). A pensão é dedutível do IRRF, então imposto e pensão dependem
// um do outro: o cálculo repete até o valor se estabilizar (é o "recalcula ao mudar de faixa" do original).
// Compara deduções legais × desconto simplificado (que substitui todas as deduções, inclusive a pensão) e usa o de
// menor imposto. Redução do IR da Lei 15.270/2025 sobre o rendimento bruto.
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
        reducao: { isencaoAte: 5000.00, limite: 7350.00, maxima: 312.89, a: 978.62, b: 0.133145 }
    };

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

    const form = $('pensao-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = v => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    const r2 = v => Math.round(v * 100) / 100;
    const parseMoeda = v => parseFloat(String(v || '').replace(/\s|R\$|%/g, '').replace(/\./g, '').replace(',', '.')) || 0;

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
        const bruto = Math.max(0, base * faixa[1] - faixa[2]);
        const red = reducao(rendimentos, bruto);
        return { base, aliquota: faixa[1], deduzir: faixa[2], imposto: r2(bruto), reducao: r2(red), valor: r2(bruto - red) };
    }

    // Pensão com deduções legais: a pensão entra nas deduções, então repete até estabilizar
    function porDeducoesLegais(bruto, inss, fator, outras) {
        let pensao = 0, ir = irrf(bruto, inss + outras), voltas = 0;
        for (; voltas < 100; voltas++) {
            const nova = r2(fator * (bruto - inss - ir.valor));
            if (Math.abs(nova - pensao) < 0.005) break;
            pensao = nova;
            ir = irrf(bruto, inss + outras + pensao);
        }
        return { modo: 'Deduções legais', pensao, ir, voltas };
    }
    // Desconto simplificado: substitui todas as deduções (INSS, dependentes, pensão, previdência), então não há ciclo
    function porSimplificado(bruto, inss, fator) {
        const ir = irrf(bruto, TABELAS.descontoSimplificado);
        return { modo: 'Desconto simplificado', pensao: r2(fator * (bruto - inss - ir.valor)), ir, voltas: 0 };
    }

    // Prévia da contribuição previdenciária, como no original
    const brutoInput = $('bruto'), percInput = $('percentual');
    const atualizarInss = () => { $('inss-previa').textContent = brl(calcInss(parseMoeda(brutoInput.value))); };
    brutoInput.addEventListener('input', atualizarInss);

    // Máscara simples de moeda/percentual
    ['bruto', 'previdencia', 'fapi', 'percentual'].forEach(id => $(id).addEventListener('blur', () => {
        const v = parseMoeda($(id).value);
        $(id).value = v ? num(v) : '';
        if (id === 'bruto') atualizarInss();
    }));

    // Erros por campo
    const CAMPOS = ['bruto', 'percentual'];
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
        if (parseMoeda(brutoInput.value) <= 0) { erro('bruto', 'Informe o rendimento bruto.'); ok = false; }
        const p = parseMoeda(percInput.value);
        if (p <= 0) { erro('percentual', 'Informe o percentual da pensão.'); ok = false; }
        else if (p >= 100) { erro('percentual', 'O percentual deve ser menor que 100%.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const bruto = parseMoeda(brutoInput.value);
        const percentual = parseMoeda(percInput.value);
        const dependentes = parseInt($('dependentes').value, 10) || 0;
        const previdencia = parseMoeda($('previdencia').value), fapi = parseMoeda($('fapi').value);
        const inss = calcInss(bruto);
        const outras = r2(dependentes * TABELAS.deducaoDependente + previdencia + fapi);
        const legal = porDeducoesLegais(bruto, inss, percentual / 100, outras);
        const simpl = porSimplificado(bruto, inss, percentual / 100);
        const escolhido = simpl.ir.valor < legal.ir.valor ? simpl : legal;   // o mais benéfico ao contribuinte
        const liquido = r2(bruto - inss - escolhido.ir.valor);
        return {
            bruto, percentual, dependentes, previdencia, fapi, inss, outras, legal, simpl, escolhido,
            liquido, pensao: escolhido.pensao, restante: r2(liquido - escolhido.pensao)
        };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    const linhas = itens => itens.filter(Boolean).map(([k, v, destaque]) => `<div class="cf-row${destaque ? ' font-semibold' : ''}"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900 tabular-nums">${esc(v)}</dd></div>`).join('');

    function mostrar(c, rolar) {
        const e = c.escolhido, ir = e.ir;
        $('res-resumo').textContent = `${pct(c.percentual)} do rendimento líquido · Valor da pensão`;
        $('res-pensao').textContent = brl(c.pensao);
        $('res-inss').textContent = brl(c.inss);
        $('res-irrf').textContent = brl(ir.valor);
        $('res-restante').textContent = brl(c.restante);

        $('res-base').innerHTML = linhas([
            ['Rendimento bruto', brl(c.bruto)],
            ['(−) Contribuição previdenciária', brl(c.inss)],
            ['(−) IRRF', brl(ir.valor)],
            ['(=) Rendimento líquido', brl(c.liquido), true],
            [`Pensão (${pct(c.percentual)})`, brl(c.pensao), true],
            ['Restante ao alimentante', brl(c.restante)]
        ]);

        const deducoes = e.modo === 'Desconto simplificado'
            ? [['(−) Desconto simplificado', brl(TABELAS.descontoSimplificado)]]
            : [
                ['(−) Contribuição previdenciária', brl(c.inss)],
                c.dependentes ? [`(−) Dependentes (${c.dependentes} × ${num(TABELAS.deducaoDependente)})`, brl(r2(c.dependentes * TABELAS.deducaoDependente))] : null,
                c.previdencia ? ['(−) Previdência privada', brl(c.previdencia)] : null,
                c.fapi ? ['(−) FAPI', brl(c.fapi)] : null,
                ['(−) Pensão alimentícia', brl(c.pensao)]
            ];
        $('res-ir').innerHTML = linhas([
            ['Forma de dedução', e.modo],
            ['Rendimento tributável', brl(c.bruto)],
            ...deducoes,
            ['(=) Base de cálculo', brl(ir.base), true],
            ['Alíquota', ir.aliquota ? `${pct(ir.aliquota * 100)} (parcela a deduzir ${num(ir.deduzir)})` : 'Isento'],
            ['Imposto pela tabela', brl(ir.imposto)],
            ir.reducao ? ['(−) Redução (Lei 15.270/2025)', brl(ir.reducao)] : null,
            ['(=) IRRF', brl(ir.valor), true]
        ]);

        const outro = e === c.legal ? c.simpl : c.legal;
        $('res-comparacao').textContent = ir.valor === outro.ir.valor
            ? `As duas formas de dedução resultam no mesmo imposto (${brl(ir.valor)}); foram usadas as deduções legais.`
            : `Com ${outro.modo.toLowerCase()}, o IRRF seria de ${brl(outro.ir.valor)} e a pensão, ${brl(outro.pensao)}. Foi usada a forma de menor imposto.`;

        resultado.classList.remove('hidden');
        if (rolar) {
            resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
            resultado.focus({ preventScroll: true });
        }
    }

    let ultimo = null, abrindoSalvo = false;
    form.addEventListener('submit', ev => {
        ev.preventDefault();
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
        atualizarInss();
        resultado.classList.add('hidden');
        ultimo = null;
    });
    $('imprimir-btn').addEventListener('click', () => window.print());

    // --- Cálculos salvos (lateral e página de Ferramentas) ---
    const TIPO = 'Cálculo de Pensão Alimentícia';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { bruto: 'bruto', percentual: 'percentual', dependentes: 'dependentes', previdencia: 'previdencia', fapi: 'fapi' };
    const linkCalculo = inputs => 'calculo-pensao-alimenticia.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(c.inputs?.percentual ? `${c.inputs.percentual}% de R$ ${c.inputs.bruto}` : 'Pensão alimentícia')}</span>
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
            id: `pensao-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { resumo: `Pensão ${brl(ultimo.pensao)}`, valorPensao: brl(ultimo.pensao), irrf: brl(ultimo.escolhido.ir.valor), inss: brl(ultimo.inss) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-pensao-alimenticia.html?bruto=…&percentual=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('bruto') && params.get('percentual')) {
        Object.entries(CHAVES).forEach(([k, id]) => { if (params.has(k)) $(id).value = params.get(k); });
        atualizarInss();
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
