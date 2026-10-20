// Redução de ICMS na Operação Própria (calculo-reducao-icms.html), modelo: aplicativo original do Cenofisco
// Campos como no aplicativo original: operação (consumidor final × comercialização/industrialização), tipo de desconto,
// valor da operação + frete + seguro, valor do desconto, alíquota interna, carga tributária e IPI.
// Regras: % da base tributada = carga ÷ alíquota; o desconto incondicional sai das bases do ICMS e do IPI (o condicional
// não); o IPI integra a base do ICMS só na venda a consumidor final (CF, art. 155, § 2º, XI).
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas), com link que reabre já calculado.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const OPERACOES = { 1: 'Consumidor ou usuário final', 2: 'Comercialização ou industrialização' };

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

    const form = $('reducao-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = (v, casas = 2) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
    const r2 = v => Math.round(v * 100) / 100;
    const parseNum = v => parseFloat(String(v || '').replace(/\s|R\$|%/g, '').replace(/\./g, '').replace(',', '.')) || 0;

    // Tipo de desconto: o rótulo do valor acompanha a escolha, como no original
    const tipoDesconto = () => form.querySelector('input[name="tipo-desconto"]:checked').value;
    const atualizarNomeDesconto = () => { $('nome-desconto').textContent = tipoDesconto(); };
    form.querySelectorAll('input[name="tipo-desconto"]').forEach(r => r.addEventListener('change', atualizarNomeDesconto));

    // Máscara simples de moeda/percentual
    const CAMPOS = ['valor-operacao', 'valor-desconto', 'aliquota-interna', 'carga-tributaria', 'ipi'];
    CAMPOS.forEach(id => $(id).addEventListener('blur', () => {
        const v = parseNum($(id).value);
        $(id).value = v ? num(v) : '';
    }));

    // Erros por campo
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
        const valor = parseNum($('valor-operacao').value), desconto = parseNum($('valor-desconto').value);
        const aliquota = parseNum($('aliquota-interna').value), carga = parseNum($('carga-tributaria').value), ipi = parseNum($('ipi').value);
        if (valor <= 0) { erro('valor-operacao', 'Informe o valor da operação.'); ok = false; }
        if (desconto && valor && desconto >= valor) { erro('valor-desconto', 'O desconto deve ser menor que o valor da operação.'); ok = false; }
        if (aliquota <= 0 || aliquota >= 100) { erro('aliquota-interna', 'Informe a alíquota interna.'); ok = false; }
        if (carga <= 0) { erro('carga-tributaria', 'Informe a carga tributária.'); ok = false; }
        else if (aliquota && carga > aliquota) { erro('carga-tributaria', 'A carga tributária não pode ser maior que a alíquota interna.'); ok = false; }
        if (ipi >= 100) { erro('ipi', 'Informe um percentual menor que 100%.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const operacao = $('tipo-operacao').value, consumidorFinal = operacao === '1';
        const tipo = tipoDesconto(), incondicional = tipo === 'incondicional';
        const valor = parseNum($('valor-operacao').value), desconto = parseNum($('valor-desconto').value);
        const aliquota = parseNum($('aliquota-interna').value), carga = parseNum($('carga-tributaria').value), ipiPct = parseNum($('ipi').value);

        const descontoBase = incondicional ? desconto : 0;            // só o incondicional reduz as bases
        const baseIpi = r2(valor - descontoBase);
        const ipi = r2(baseIpi * ipiPct / 100);
        const percentual = carga / aliquota * 100;
        const baseCheia = r2(valor - descontoBase + (consumidorFinal ? ipi : 0));
        const baseTributada = r2(baseCheia * percentual / 100);
        const icms = r2(baseTributada * aliquota / 100);
        const totalNf = r2(valor - descontoBase + ipi);
        const faturado = r2(totalNf - (incondicional ? 0 : desconto));   // o condicional é abatido depois, no faturamento
        return {
            operacao, consumidorFinal, tipo, incondicional, valor, desconto, descontoBase, aliquota, carga, ipiPct,
            percentual, baseCheia, baseTributada, icms, baseIpi, ipi, totalNf, faturado,
            icmsSemReducao: r2(baseCheia * aliquota / 100)
        };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    const linhas = itens => itens.filter(Boolean).map(([k, v, destaque]) => `<div class="cf-row${destaque ? ' font-semibold' : ''}"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900 tabular-nums">${esc(v)}</dd></div>`).join('');

    function mostrar(c, rolar) {
        $('res-resumo').textContent = `${OPERACOES[c.operacao]} · ICMS próprio`;
        $('res-icms').textContent = brl(c.icms);
        $('res-percentual').textContent = pct(c.percentual);
        $('res-total-nf').textContent = brl(c.totalNf);
        $('res-faturado').textContent = brl(c.faturado);

        $('res-icms-detalhe').innerHTML = linhas([
            ['Valor da operação + frete + seguro', brl(c.valor)],
            c.descontoBase ? ['(−) Desconto incondicional', brl(c.descontoBase)] : null,
            c.consumidorFinal && c.ipi ? ['(+) IPI (consumidor final)', brl(c.ipi)] : null,
            ['(=) Base de cálculo integral', brl(c.baseCheia)],
            [`% da base tributada (${num(c.carga)} ÷ ${num(c.aliquota)})`, pct(c.percentual, 4)],
            ['Base de cálculo do ICMS tributada', brl(c.baseTributada), true],
            ['Alíquota interna', pct(c.aliquota)],
            ['ICMS próprio', brl(c.icms), true],
            ['ICMS sem a redução', brl(c.icmsSemReducao)],
            ['Economia com a redução', brl(r2(c.icmsSemReducao - c.icms))]
        ]);
        $('res-ipi-detalhe').innerHTML = linhas([
            ['Base de cálculo do IPI', brl(c.baseIpi)],
            ['Alíquota do IPI', pct(c.ipiPct)],
            ['Valor de IPI devido', brl(c.ipi), true],
            ['IPI na base do ICMS', c.consumidorFinal ? 'Sim (consumidor final)' : 'Não (entre contribuintes)'],
            ['Valor total da NF-e', brl(c.totalNf), true],
            c.desconto && !c.incondicional ? ['(−) Desconto condicional', brl(c.desconto)] : null,
            ['Valor faturado com desconto', brl(c.faturado), true]
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
        atualizarNomeDesconto();
        resultado.classList.add('hidden');
        ultimo = null;
    });
    $('imprimir-btn').addEventListener('click', () => window.print());

    // --- Cálculos salvos (lateral e página de Ferramentas) ---
    const TIPO = 'Redução de ICMS na Operação Própria';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { operacao: 'tipo-operacao', valor: 'valor-operacao', desconto: 'valor-desconto', aliquota: 'aliquota-interna', carga: 'carga-tributaria', ipi: 'ipi' };
    const linkCalculo = inputs => 'calculo-reducao-icms.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(c.inputs?.valor ? `R$ ${c.inputs.valor} · carga ${c.inputs.carga}%` : 'Redução de ICMS')}</span>
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
        const inputs = { tipoDesconto: tipoDesconto() };
        Object.entries(CHAVES).forEach(([k, id]) => { inputs[k] = $(id).value; });
        gravarCalculos([{
            id: `reducao-icms-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { resumo: `ICMS ${brl(ultimo.icms)}`, icmsProprio: brl(ultimo.icms), totalNf: brl(ultimo.totalNf), faturado: brl(ultimo.faturado) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-reducao-icms.html?valor=…&aliquota=…&carga=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('valor') && params.get('aliquota') && params.get('carga')) {
        Object.entries(CHAVES).forEach(([k, id]) => {
            if (!params.has(k)) return;
            const el = $(id);
            if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === params.get(k))) return;
            el.value = params.get(k);
        });
        if (params.get('tipoDesconto') === 'incondicional') $('desconto-incondicional').checked = true;
        atualizarNomeDesconto();
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
