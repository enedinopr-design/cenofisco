// ICMS Importação (calculo-icms-importacao.html), modelo: aplicativo original do Cenofisco
// Campos como no aplicativo original: UF, valor CIF, alíquotas de II, IPI, PIS, COFINS e ICMS, carga tributária,
// Taxa Siscomex, AFRMM e despesas aduaneiras.
// Regras: II, PIS e COFINS sobre o CIF (Lei 12.865/2013); IPI sobre CIF + II; valor da operação = CIF + tributos +
// despesas; base do ICMS "por dentro" = operação ÷ (1 − alíquota); base reduzida = base × carga ÷ alíquota;
// ICMS = base reduzida × alíquota (LC 87/1996, art. 13, V e § 1º, I).
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas), com link que reabre já calculado.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // UF: valor = id do aplicativo original. "ricms": dispositivo do regulamento estadual citado na nota
    // (só o AC veio do aplicativo original; as demais UFs usam a nota geral até o texto ser informado).
    const UFS = [
        { id: 2, uf: 'AC', nome: 'Acre', ricms: 'art. 5º, inciso II, § 1º, do RICMS/AC – Decreto nº 008/1998' },
        { id: 14, uf: 'AL', nome: 'Alagoas' }, { id: 3, uf: 'AM', nome: 'Amazonas' }, { id: 6, uf: 'AP', nome: 'Amapá' },
        { id: 16, uf: 'BA', nome: 'Bahia' }, { id: 10, uf: 'CE', nome: 'Ceará' }, { id: 27, uf: 'DF', nome: 'Distrito Federal' },
        { id: 18, uf: 'ES', nome: 'Espírito Santo' }, { id: 26, uf: 'GO', nome: 'Goiás' }, { id: 8, uf: 'MA', nome: 'Maranhão' },
        { id: 17, uf: 'MG', nome: 'Minas Gerais' }, { id: 24, uf: 'MS', nome: 'Mato Grosso do Sul' }, { id: 25, uf: 'MT', nome: 'Mato Grosso' },
        { id: 5, uf: 'PA', nome: 'Pará' }, { id: 12, uf: 'PB', nome: 'Paraíba' }, { id: 13, uf: 'PE', nome: 'Pernambuco' },
        { id: 9, uf: 'PI', nome: 'Piauí' }, { id: 21, uf: 'PR', nome: 'Paraná' }, { id: 19, uf: 'RJ', nome: 'Rio de Janeiro' },
        { id: 11, uf: 'RN', nome: 'Rio Grande do Norte' }, { id: 1, uf: 'RO', nome: 'Rondônia' }, { id: 4, uf: 'RR', nome: 'Roraima' },
        { id: 23, uf: 'RS', nome: 'Rio Grande do Sul' }, { id: 22, uf: 'SC', nome: 'Santa Catarina' }, { id: 15, uf: 'SE', nome: 'Sergipe' },
        { id: 20, uf: 'SP', nome: 'São Paulo' }, { id: 7, uf: 'TO', nome: 'Tocantins' }
    ];
    const NOTA_BASE = 'Cálculo elaborado em conformidade com o art. 155, II, § 2º, IX, “a”, e XII, “i”, da Constituição Federal de 1988 e com os arts. 11, I, “d”, e 13, V e § 1º, I, da Lei Complementar nº 87/1996';

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

    const form = $('importacao-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = (v, casas = 2) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
    const r2 = v => Math.round(v * 100) / 100;
    const parseNum = v => parseFloat(String(v || '').replace(/\s|R\$|%/g, '').replace(/\./g, '').replace(',', '.')) || 0;

    // ------------------------------------------------------------------
    // Formulário
    // ------------------------------------------------------------------
    const ufSel = $('uf');
    ufSel.insertAdjacentHTML('beforeend', UFS.map(u => `<option value="${u.id}">${u.uf} – ${esc(u.nome)}</option>`).join(''));
    const ufAtual = () => UFS.find(u => String(u.id) === ufSel.value);
    function atualizarUf() {
        const u = ufAtual();
        $('hero-uf').textContent = u ? ` – ${u.uf}` : '';
        $('nota-uf').textContent = `${NOTA_BASE}${u?.ricms ? ` e com o ${u.ricms}` : ''}.`;
    }
    ufSel.addEventListener('change', atualizarUf);

    // Máscara simples de moeda/percentual
    const NUMERICOS = ['cif', 'aliq-ii', 'aliq-ipi', 'aliq-pis', 'aliq-cofins', 'aliq-icms', 'carga', 'siscomex', 'afrmm', 'despesas'];
    NUMERICOS.forEach(id => $(id).addEventListener('blur', () => {
        const v = parseNum($(id).value);
        $(id).value = v ? num(v) : '';
    }));

    // Erros por campo
    const CAMPOS = ['uf', 'cif', 'aliq-icms', 'carga'];
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
        if (!ufAtual()) { erro('uf', 'Selecione a Unidade Federada.'); ok = false; }
        if (parseNum($('cif').value) <= 0) { erro('cif', 'Informe o valor CIF.'); ok = false; }
        const aliq = parseNum($('aliq-icms').value), carga = parseNum($('carga').value);
        if (aliq <= 0 || aliq >= 100) { erro('aliq-icms', 'Informe a alíquota interna do ICMS.'); ok = false; }
        if (carga && aliq && carga > aliq) { erro('carga', 'A carga tributária não pode ser maior que a alíquota interna.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const v = id => parseNum($(id).value);
        const cif = v('cif');
        const aliqII = v('aliq-ii'), aliqIPI = v('aliq-ipi'), aliqPIS = v('aliq-pis'), aliqCOFINS = v('aliq-cofins');
        const aliqICMS = v('aliq-icms'), carga = v('carga') || aliqICMS;
        const ii = r2(cif * aliqII / 100);
        const ipi = r2((cif + ii) * aliqIPI / 100);
        const pis = r2(cif * aliqPIS / 100);
        const cofins = r2(cif * aliqCOFINS / 100);
        const siscomex = v('siscomex'), afrmm = v('afrmm'), despesas = v('despesas');
        const operacao = r2(cif + ii + ipi + pis + cofins + siscomex + afrmm + despesas);
        const base = r2(operacao / (1 - aliqICMS / 100));
        const reduzida = r2(base * carga / aliqICMS);
        const icms = r2(reduzida * aliqICMS / 100);
        return {
            uf: ufAtual(), cif, aliqII, aliqIPI, aliqPIS, aliqCOFINS, aliqICMS, carga, reducao: carga < aliqICMS,
            ii, ipi, pis, cofins, siscomex, afrmm, despesas, operacao, base, reduzida, icms
        };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    function mostrar(c, rolar) {
        $('res-titulo-uf').textContent = ` – ${c.uf.uf}`;
        $('res-icms').textContent = brl(c.icms);
        $('res-operacao').textContent = brl(c.operacao);
        $('res-base').textContent = brl(c.base);
        $('res-base-reduzida').textContent = brl(c.reduzida);

        $('tab-tributos').innerHTML = [
            ['Valor CIF (mercadoria + frete e seguro internacional)', '', c.cif],
            ['Imposto de Importação (II)', pct(c.aliqII), c.ii],
            ['IPI (CIF + II)', pct(c.aliqIPI), c.ipi],
            ['PIS-Importação', pct(c.aliqPIS), c.pis],
            ['COFINS-Importação', pct(c.aliqCOFINS), c.cofins],
            c.siscomex ? ['Taxa Siscomex', '', c.siscomex] : null,
            c.afrmm ? ['AFRMM', '', c.afrmm] : null,
            c.despesas ? ['Despesas aduaneiras', '', c.despesas] : null
        ].filter(Boolean).map(([rot, ref, valor]) => `
            <tr class="border-b border-slate-100 last:border-b-0">
                <td class="py-2.5 pr-3 text-slate-700">${esc(rot)}</td>
                <td class="py-2.5 pr-3 text-right text-xs whitespace-nowrap text-slate-500">${esc(ref)}</td>
                <td class="py-2.5 text-right font-medium whitespace-nowrap text-slate-900 tabular-nums">${brl(valor)}</td>
            </tr>`).join('');
        $('tot-operacao').textContent = brl(c.operacao);

        $('res-icms-detalhe').innerHTML = [
            ['Valor da operação sem ICMS', brl(c.operacao)],
            [`Base com ICMS por dentro (÷ ${num(1 - c.aliqICMS / 100)})`, brl(c.base), true],
            ['Alíquota interna', pct(c.aliqICMS)],
            ['Carga tributária', c.reducao ? pct(c.carga) : 'Sem redução'],
            c.reducao ? [`Base reduzida (${num(c.carga)} ÷ ${num(c.aliqICMS)} = ${pct(c.carga / c.aliqICMS * 100)})`, brl(c.reduzida), true] : ['Base de cálculo', brl(c.reduzida), true],
            ['ICMS a recolher', brl(c.icms), true]
        ].map(([k, v, destaque]) => `<div class="cf-row${destaque ? ' font-semibold' : ''}"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900 tabular-nums">${esc(v)}</dd></div>`).join('');

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
        atualizarUf();
        resultado.classList.add('hidden');
        ultimo = null;
    });
    $('imprimir-btn').addEventListener('click', () => window.print());

    // --- Cálculos salvos (lateral e página de Ferramentas) ---
    const TIPO = 'ICMS-Importação';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { uf: 'uf', cif: 'cif', ii: 'aliq-ii', ipi: 'aliq-ipi', pis: 'aliq-pis', cofins: 'aliq-cofins', icms: 'aliq-icms', carga: 'carga', siscomex: 'siscomex', afrmm: 'afrmm', despesas: 'despesas' };
    const linkCalculo = inputs => 'calculo-icms-importacao.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc([UFS.find(u => String(u.id) === c.inputs?.uf)?.uf, c.inputs?.cif ? `CIF R$ ${c.inputs.cif}` : ''].filter(Boolean).join(' · ') || 'ICMS Importação')}</span>
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
            id: `icms-importacao-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { resumo: `ICMS ${brl(ultimo.icms)}`, icms: brl(ultimo.icms), baseCalculo: brl(ultimo.reduzida), valorOperacao: brl(ultimo.operacao) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-icms-importacao.html?uf=…&cif=…&icms=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('uf') && params.get('cif') && params.get('icms')) {
        Object.entries(CHAVES).forEach(([k, id]) => { if (params.has(k)) $(id).value = params.get(k); });
        atualizarUf();
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    } else {
        atualizarUf();
    }
});
