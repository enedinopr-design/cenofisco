// Cálculo de Férias (calculo-ferias.html)
// Campos: salário bruto, média de horas extras e adicionais, dependentes, dias de férias, abono pecuniário e
// adiantamento da 1ª parcela do 13º.
// Regras (CLT, arts. 130, 142, 143 e 145): dia de férias = (salário + médias) ÷ 30; com abono, 1/3 dos dias é vendido
// (abono + 1/3 sem INSS e sem IRRF); INSS e IRRF sobre as férias gozadas + 1/3, separados do salário do mês;
// IRRF pelo mais benéfico entre deduções legais e desconto simplificado (MP 1.171/2023), com a redução da Lei
// 15.270/2025; adiantamento do 13º = metade da remuneração, sem descontos (Lei 4.749/1965).
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas). O link (calculo-ferias.html?bruto=…) é o
// mesmo da versão anterior, para os cálculos já salvos continuarem abrindo.
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

    const form = $('calculo-ferias-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const r2 = v => Math.round(v * 100) / 100;
    const parseMoeda = v => parseFloat(String(v || '').replace(/\s|R\$/g, '').replace(/\./g, '').replace(',', '.')) || 0;

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
        const valorBase = r2(base * faixa[1]);
        const imposto = r2(Math.max(0, valorBase - faixa[2]));
        const red = r2(reducao(rendimentos, imposto));
        return { base, aliquota: faixa[1], valorBase, deduzir: faixa[2], imposto, reducao: red, valor: r2(imposto - red) };
    }

    // ------------------------------------------------------------------
    // Formulário
    // ------------------------------------------------------------------
    ['bruto', 'extra'].forEach(id => $(id).addEventListener('blur', () => {
        const v = parseMoeda($(id).value);
        $(id).value = v ? num(v) : '';
    }));

    // Divisão dos dias entre gozo e abono, já na digitação
    const diasDivididos = (dias, abono) => { const vendidos = abono ? Math.floor(dias / 3) : 0; return { gozo: dias - vendidos, vendidos }; };
    function atualizarPrevia() {
        const dias = parseInt($('dias').value, 10);
        if (!(dias >= 1 && dias <= 30)) { $('previa-dias').textContent = ''; return; }
        const d = diasDivididos(dias, $('abono').value === 'Sim');
        $('previa-dias').textContent = d.vendidos ? `${d.gozo} dias de gozo e ${d.vendidos} dias de abono pecuniário.` : `${d.gozo} dias de gozo.`;
    }
    $('dias').addEventListener('input', atualizarPrevia);
    $('abono').addEventListener('change', atualizarPrevia);

    // Erros por campo
    const CAMPOS = ['bruto', 'dias', 'dependentes'];
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
        if (parseMoeda($('bruto').value) <= 0) { erro('bruto', 'Informe o salário bruto.'); ok = false; }
        const dias = $('dias').value.trim();
        if (!/^\d{1,2}$/.test(dias) || +dias < 1 || +dias > 30) { erro('dias', 'Informe de 1 a 30 dias.'); ok = false; }
        const dep = $('dependentes').value.trim();
        if (dep && !/^\d{1,2}$/.test(dep)) { erro('dependentes', 'Informe um número inteiro.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const salario = parseMoeda($('bruto').value), medias = parseMoeda($('extra').value);
        const dias = parseInt($('dias').value, 10);
        const dependentes = parseInt($('dependentes').value, 10) || 0;
        const abono = $('abono').value === 'Sim', adianta13 = $('decimo').value === 'Sim';

        const remuneracao = r2(salario + medias);
        const diaria = remuneracao / 30;
        const { gozo, vendidos } = diasDivididos(dias, abono);
        const ferias = r2(diaria * gozo);
        const tercoFerias = r2(ferias / 3);
        const valorAbono = r2(diaria * vendidos);
        const tercoAbono = r2(valorAbono / 3);
        const adiantamento = adianta13 ? r2(remuneracao / 2) : 0;

        // Só as férias gozadas + 1/3 sofrem INSS e IRRF
        const baseInss = r2(ferias + tercoFerias);
        const inss = calcInss(baseInss);
        const dedDependentes = r2(dependentes * TABELAS.deducaoDependente);
        const legal = irrf(baseInss, inss + dedDependentes);
        const simpl = irrf(baseInss, TABELAS.descontoSimplificado);
        const simplMelhor = simpl.valor < legal.valor;
        const ir = simplMelhor ? simpl : legal;

        const proventos = [
            ['Férias', `${gozo} ${gozo === 1 ? 'dia' : 'dias'}`, ferias],
            ['1/3 constitucional sobre férias', '', tercoFerias],
            vendidos ? ['Abono pecuniário', `${vendidos} ${vendidos === 1 ? 'dia' : 'dias'}`, valorAbono] : null,
            vendidos ? ['1/3 sobre abono pecuniário', '', tercoAbono] : null,
            adianta13 ? ['13º salário – adiantamento (1ª parcela)', '50%', adiantamento] : null
        ].filter(Boolean);
        const descontos = [
            ['INSS sobre férias + 1/3', '', inss],
            ['IRRF sobre férias + 1/3', ir.valor ? `${(ir.aliquota * 100).toLocaleString('pt-BR')}%` : 'isento', ir.valor]
        ];
        const totalBruto = r2(proventos.reduce((s, p) => s + p[2], 0));
        const totalDescontos = r2(inss + ir.valor);
        return {
            salario, medias, remuneracao, diaria, dias, gozo, vendidos, dependentes, abono, adianta13,
            proventos, descontos, totalBruto, totalDescontos, liquido: r2(totalBruto - totalDescontos),
            baseInss, inss, dedDependentes, legal, simpl, simplMelhor, ir
        };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    const linhas = itens => itens.map(([rot, ref, valor]) => `
        <tr class="border-b border-slate-100 last:border-b-0">
            <td class="py-2.5 pr-3 text-slate-700">${esc(rot)}</td>
            <td class="py-2.5 pr-3 text-right text-xs whitespace-nowrap text-slate-500">${esc(ref)}</td>
            <td class="py-2.5 text-right font-medium whitespace-nowrap text-slate-900 tabular-nums">${brl(valor)}</td>
        </tr>`).join('');
    const aliqTxt = ir => ir.aliquota ? `${(ir.aliquota * 100).toLocaleString('pt-BR')}%` : 'Isento';

    function mostrar(c, rolar) {
        $('res-resumo').textContent = `${c.gozo} dias de gozo${c.vendidos ? ` + ${c.vendidos} de abono` : ''} · Total líquido a receber`;
        $('res-liquido').textContent = brl(c.liquido);
        $('res-bruto').textContent = brl(c.totalBruto);
        $('res-inss').textContent = brl(c.inss);
        $('res-irrf').textContent = brl(c.ir.valor);
        $('res-melhor').textContent = c.legal.valor === c.simpl.valor
            ? 'As deduções legais e o desconto simplificado resultam no mesmo IRRF.'
            : `IRRF ${c.simplMelhor ? 'com o desconto simplificado' : 'pelas deduções legais'}, o mais benéfico ao empregado (MP nº 1.171/2023).`;

        $('tab-proventos').innerHTML = linhas(c.proventos);
        $('tot-proventos').textContent = brl(c.totalBruto);
        $('tab-descontos').innerHTML = linhas(c.descontos);
        $('tot-descontos').textContent = brl(c.totalDescontos);

        const n = c.legal, s = c.simpl;
        $('tab-irrf').innerHTML = [
            ['Remuneração (férias + 1/3)', brl(c.baseInss), brl(c.baseInss)],
            ['Deduções – INSS (−)', brl(c.inss), '—'],
            ['Dependentes (−)', brl(c.dedDependentes), '—'],
            ['Desconto simplificado (−)', '—', brl(TABELAS.descontoSimplificado)],
            ['Base de cálculo', brl(n.base), brl(s.base), true],
            ['Alíquota', aliqTxt(n), aliqTxt(s)],
            ['Valor', brl(n.valorBase), brl(s.valorBase)],
            ['Parcela a deduzir', brl(n.deduzir), brl(s.deduzir)],
            (n.reducao || s.reducao) ? ['Redução (Lei 15.270/2025)', brl(n.reducao), brl(s.reducao)] : null,
            ['Valor do IRRF', brl(n.valor), brl(s.valor), true]
        ].filter(Boolean).map(([rot, a, b, destaque]) => `
            <tr class="border-b border-slate-100 last:border-b-0${destaque ? ' font-semibold text-slate-900' : ''}">
                <td class="py-2.5 pr-3 text-slate-700">${esc(rot)}</td>
                <td class="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums${c.simplMelhor ? ' text-slate-600' : ' text-slate-900'}">${esc(a)}</td>
                <td class="py-2.5 text-right whitespace-nowrap tabular-nums${c.simplMelhor ? ' text-slate-900' : ' text-slate-600'}">${esc(b)}</td>
            </tr>`).join('');

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
        atualizarPrevia();
        resultado.classList.add('hidden');
        ultimo = null;
    });
    $('imprimir-btn').addEventListener('click', () => window.print());

    // --- Cálculos salvos (lateral e página de Ferramentas) ---
    const TIPO = 'Cálculo de Férias';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    // Mesmos nomes de parâmetros e de "inputs" da versão anterior
    const linkCalculo = i => 'calculo-ferias.html?' + new URLSearchParams({ bruto: i.salarioBruto || '', extra: i.horasExtras || '', dias: i.diasFerias || '', dependentes: i.dependentes || '', abono: i.temAbono || 'Não', decimo: i.adianta13 || 'Não' }).toString();

    function renderSalvos() {
        if (!lista) return;
        const salvos = lerCalculos().filter(c => c.tipo === TIPO);
        if (!salvos.length) {
            lista.innerHTML = '<li class="px-1 text-xs text-slate-500">Nenhum cálculo salvo. Use <strong>Salvar cálculo</strong> no resultado.</li>';
            return;
        }
        lista.innerHTML = salvos.slice(0, 8).map(c => `
            <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                <a href="${esc(c.link || linkCalculo(c.inputs || {}))}" class="min-w-0 flex-1 px-2 py-1.5">
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">Salário R$ ${esc(c.inputs?.salarioBruto || '—')} · ${esc(c.inputs?.diasFerias || '—')} dias</span>
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
        const inputs = {
            salarioBruto: $('bruto').value, horasExtras: $('extra').value, diasFerias: $('dias').value,
            dependentes: $('dependentes').value, temAbono: $('abono').value, adianta13: $('decimo').value
        };
        gravarCalculos([{
            id: `ferias-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { totalBruto: brl(ultimo.totalBruto), descontoINSS: brl(ultimo.inss), descontoIRRF: brl(ultimo.ir.valor), totalLiquido: brl(ultimo.liquido) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-ferias.html?bruto=…&dias=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('bruto')) {
        ['bruto', 'extra', 'dias', 'dependentes'].forEach(id => { $(id).value = params.get(id) || ''; });
        ['abono', 'decimo'].forEach(id => { if (['Sim', 'Não'].includes(params.get(id))) $(id).value = params.get(id); });
        atualizarPrevia();
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
