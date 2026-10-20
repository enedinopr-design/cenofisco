// Cálculo do 13º Salário (calculo-13-salario.html), modelo: aplicativo original do Cenofisco
// Campos como no aplicativo original: salário, meses trabalhados, dependentes e, para cada parcela, horas extras,
// adicional e comissões + DSR (1ª: janeiro a outubro; 2ª: janeiro a novembro).
// Regras (Lei 4.090/1962, Lei 4.749/1965, Decreto 57.155/1965): médias = total ÷ meses do período (10 ou 11);
// hora normal = salário ÷ 220; 1ª parcela = metade do 13º proporcional, sem descontos; 2ª = 13º integral − adiantamento
// − INSS − IRRF (tributação exclusiva sobre o 13º integral). IRRF pelas deduções legais e pelo desconto simplificado;
// o simplificado é obrigatório quando mais benéfico (MP 1.171/2023). Valores tributados truncados (eSocial).
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
    const HORAS_MES = 220;

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

    const form = $('decimo-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const r2 = v => Math.round(v * 100) / 100;
    const t2 = v => Math.floor(v * 100 + 1e-7) / 100;   // truncamento em 2 casas, como no eSocial
    const parseNum = v => parseFloat(String(v || '').replace(/\s|R\$/g, '').replace(/\./g, '').replace(',', '.')) || 0;

    // --- INSS e IRRF (truncados) ---
    function calcInss(base) {
        let desconto = 0, anterior = 0;
        for (const [limite, aliquota] of TABELAS.inss) {
            if (base <= anterior) break;
            desconto += t2((Math.min(base, limite) - anterior) * aliquota);
            anterior = limite;
        }
        return t2(desconto);
    }
    function reducao(rendimentos, imposto) {
        const r = TABELAS.reducao;
        if (rendimentos <= r.isencaoAte) return Math.min(imposto, r.maxima);
        if (rendimentos <= r.limite) return Math.min(imposto, Math.max(0, r.a - r.b * rendimentos));
        return 0;
    }
    function irrf(rendimentos, deducoes) {
        const base = t2(Math.max(0, rendimentos - deducoes));
        const faixa = TABELAS.irrf.find(([limite]) => base <= limite);
        const valorBase = t2(base * faixa[1]);
        const imposto = t2(Math.max(0, valorBase - faixa[2]));
        const red = t2(reducao(rendimentos, imposto));
        return { base, aliquota: faixa[1], valorBase, deduzir: faixa[2], imposto, reducao: red, valor: t2(imposto - red) };
    }

    // Máscara simples de moeda/horas
    ['salario', 'he1', 'comissoes1', 'he2', 'comissoes2'].forEach(id => $(id).addEventListener('blur', () => {
        const v = parseNum($(id).value);
        $(id).value = v ? num(v) : '';
    }));

    // Erros por campo
    const CAMPOS = ['salario', 'dependentes'];
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
        if (parseNum($('salario').value) <= 0) { erro('salario', 'Informe o salário.'); ok = false; }
        const dep = $('dependentes').value.trim();
        if (dep && !/^\d{1,2}$/.test(dep)) { erro('dependentes', 'Informe um número inteiro.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    // Remuneração da parcela: salário + média de horas extras + média de comissões no período
    function remuneracao(salario, horas, adicional, comissoes, mesesPeriodo) {
        const mediaHoras = horas / mesesPeriodo;
        const mediaHe = r2(mediaHoras * (salario / HORAS_MES) * (1 + adicional / 100));
        const mediaCom = r2(comissoes / mesesPeriodo);
        return { mediaHoras, mediaHe, mediaCom, total: r2(salario + mediaHe + mediaCom) };
    }

    function calcular() {
        const salario = parseNum($('salario').value);
        const meses = parseInt($('meses').value, 10);
        const dependentes = parseInt($('dependentes').value, 10) || 0;

        const p1 = remuneracao(salario, parseNum($('he1').value), +$('adicional1').value, parseNum($('comissoes1').value), 10);
        const adiantamento = r2(p1.total / 12 * meses / 2);

        const p2 = remuneracao(salario, parseNum($('he2').value), +$('adicional2').value, parseNum($('comissoes2').value), 11);
        const integral = r2(p2.total / 12 * meses);
        const segundaBruta = r2(integral - adiantamento);

        const inss = calcInss(integral);
        const dedDependentes = r2(dependentes * TABELAS.deducaoDependente);
        const irNormal = irrf(integral, inss + dedDependentes);
        const irSimpl = irrf(integral, TABELAS.descontoSimplificado);
        const liquidoNormal = r2(segundaBruta - inss - irNormal.valor);
        const liquidoSimpl = r2(segundaBruta - inss - irSimpl.valor);
        const simplMelhor = irSimpl.valor < irNormal.valor;

        return {
            salario, meses, dependentes, p1, p2, adiantamento, integral, segundaBruta, inss, dedDependentes,
            irNormal, irSimpl, liquidoNormal, liquidoSimpl, simplMelhor,
            liquidoAplicavel: simplMelhor ? liquidoSimpl : liquidoNormal,
            fgts1: r2(adiantamento * 0.08), fgts2: r2(segundaBruta * 0.08)
        };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    const linhas = itens => itens.filter(Boolean).map(([k, v, destaque]) => `<div class="cf-row${destaque ? ' font-semibold' : ''}"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900 tabular-nums">${esc(v)}</dd></div>`).join('');
    const horasTxt = h => `${h.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h/mês`;
    const aliqTxt = ir => ir.aliquota ? `${(ir.aliquota * 100).toLocaleString('pt-BR')}%` : 'Isento';

    function mostrar(c, rolar) {
        const total = r2(c.adiantamento + c.liquidoAplicavel);
        $('res-total').textContent = brl(total);
        $('res-resumo').textContent = `${c.meses}/12 avos · Total líquido (1ª + 2ª parcela)`;
        $('res-primeira').textContent = brl(c.adiantamento);
        $('res-segunda-normal').textContent = brl(c.liquidoNormal);
        $('res-segunda-simpl').textContent = brl(c.liquidoSimpl);
        $('res-melhor').textContent = c.irNormal.valor === c.irSimpl.valor
            ? 'As duas apurações resultam no mesmo IRRF.'
            : `A apuração ${c.simplMelhor ? 'com desconto simplificado' : 'pelo IR normal'} é a mais benéfica ao trabalhador e é a usada no total (MP nº 1.171/2023).`;

        $('res-p1').innerHTML = linhas([
            ['Salário', brl(c.salario)],
            ['Quantidade de horas extras (média)', horasTxt(c.p1.mediaHoras)],
            ['Valor da média de hora extra', brl(c.p1.mediaHe)],
            ['Valor da média de comissões', brl(c.p1.mediaCom)],
            ['Remuneração – 1ª parcela', brl(c.p1.total), true],
            [`1ª parcela – adiantamento (${c.meses}/12 ÷ 2)`, brl(c.adiantamento), true]
        ]);
        $('res-p2').innerHTML = linhas([
            ['Salário', brl(c.salario)],
            ['Quantidade de horas extras (média)', horasTxt(c.p2.mediaHoras)],
            ['Valor da média de hora extra', brl(c.p2.mediaHe)],
            ['Valor da média de comissões', brl(c.p2.mediaCom)],
            ['Remuneração – 2ª parcela', brl(c.p2.total), true],
            [`13º integral (${c.meses}/12)`, brl(c.integral)],
            ['(−) 1ª parcela – adiantamento', brl(c.adiantamento)],
            ['Valor da 2ª parcela (antes dos descontos)', brl(c.segundaBruta), true]
        ]);

        const n = c.irNormal, s = c.irSimpl;
        const linhasIr = [
            ['Remuneração (13º integral)', brl(c.integral), brl(c.integral)],
            ['Desconto CP (INSS)', brl(c.inss), brl(c.inss)],
            ['Deduções (−)', brl(c.inss), '—'],
            ['Dependentes (−)', brl(c.dedDependentes), '—'],
            ['Desconto simplificado (−)', '—', brl(TABELAS.descontoSimplificado)],
            ['Base de cálculo', brl(n.base), brl(s.base), true],
            ['Alíquota IRRF', aliqTxt(n), aliqTxt(s)],
            ['Valor', brl(n.valorBase), brl(s.valorBase)],
            ['Parcela a deduzir', brl(n.deduzir), brl(s.deduzir)],
            (n.reducao || s.reducao) ? ['Redução (Lei 15.270/2025)', brl(n.reducao), brl(s.reducao)] : null,
            ['Valor IRRF', brl(n.valor), brl(s.valor), true],
            ['Total líquido – 2ª parcela', brl(c.liquidoNormal), brl(c.liquidoSimpl), true]
        ].filter(Boolean);
        $('tab-irrf').innerHTML = linhasIr.map(([rot, a, b, destaque]) => `
            <tr class="border-b border-slate-100 last:border-b-0${destaque ? ' font-semibold text-slate-900' : ''}">
                <td class="py-2.5 pr-3 text-slate-700">${esc(rot)}</td>
                <td class="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums${!c.simplMelhor ? ' text-slate-900' : ' text-slate-600'}">${esc(a)}</td>
                <td class="py-2.5 text-right whitespace-nowrap tabular-nums${c.simplMelhor ? ' text-slate-900' : ' text-slate-600'}">${esc(b)}</td>
            </tr>`).join('');

        $('res-fgts').innerHTML = linhas([
            ['1ª parcela (8%)', brl(c.fgts1)],
            ['2ª parcela – normal (8%)', brl(c.fgts2)],
            ['Total do FGTS sobre o 13º', brl(r2(c.fgts1 + c.fgts2)), true]
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
    const TIPO = 'Cálculo do 13º Salário';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { salario: 'salario', meses: 'meses', dependentes: 'dependentes', he1: 'he1', adicional1: 'adicional1', comissoes1: 'comissoes1', he2: 'he2', adicional2: 'adicional2', comissoes2: 'comissoes2' };
    const linkCalculo = inputs => 'calculo-13-salario.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(c.inputs?.salario ? `Salário R$ ${c.inputs.salario} · ${c.inputs.meses}/12` : '13º salário')}</span>
                    <span class="block text-[11px] text-slate-400">${esc([c.dataSalvo, c.resultados?.totalLiquido ? `Líquido ${c.resultados.totalLiquido}` : ''].filter(Boolean).join(' · '))}</span>
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
            id: `decimo-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: {
                totalBruto: brl(ultimo.integral),
                totalDescontos: brl(r2(ultimo.inss + (ultimo.simplMelhor ? ultimo.irSimpl.valor : ultimo.irNormal.valor))),
                totalLiquido: brl(r2(ultimo.adiantamento + ultimo.liquidoAplicavel))
            }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-13-salario.html?salario=…&meses=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('salario')) {
        Object.entries(CHAVES).forEach(([k, id]) => {
            if (!params.has(k)) return;
            const el = $(id);
            if (el.tagName === 'SELECT' && ![...el.options].some(o => (o.value || o.text) === params.get(k))) return;
            el.value = params.get(k);
        });
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
