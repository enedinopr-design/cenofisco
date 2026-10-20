// Cálculo de Seguro-Desemprego (calculo-seguro-desemprego.html), modelo: aplicativo original do Cenofisco
// Campos como no aplicativo original: solicitação do benefício, meses trabalhados e os três últimos salários brutos.
// Regras (Lei 7.998/1990, com a Lei 13.134/2015): carência de 12 meses (1ª solicitação), 9 (2ª) ou 6 (3ª ou mais);
// parcelas: 3 (6 a 11 meses, só a partir da 2ª), 4 (12 a 23) ou 5 (24 ou mais). Valor pela média dos salários
// informados, na tabela do MTE; nunca abaixo do salário mínimo.
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas), com link que reabre já calculado.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ------------------------------------------------------------------
    // Tabela de 2026 (vigente a partir de 11/01/2026) — conferir a cada reajuste pelo INPC
    // ------------------------------------------------------------------
    const TABELA = {
        salarioMinimo: 1621.00,
        faixa1: 2222.17,          // até aqui: média × 0,8
        faixa2: 3703.99,          // até aqui: (média − faixa1) × 0,5 + fixo2
        fixo2: 1777.74,
        teto: 2518.65             // acima da faixa 2: valor fixo
    };
    // Carência e parcelas por solicitação: [meses mínimos, parcelas]
    const PARCELAS = {
        1: { nome: '1ª solicitação', minimo: 12, faixas: [[24, 5], [12, 4]] },
        2: { nome: '2ª solicitação', minimo: 9, faixas: [[24, 5], [12, 4], [9, 3]] },
        3: { nome: '3ª solicitação ou mais', minimo: 6, faixas: [[24, 5], [12, 4], [6, 3]] }
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

    const form = $('seguro-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const r2 = v => Math.round(v * 100) / 100;
    const parseMoeda = v => parseFloat(String(v || '').replace(/\s|R\$/g, '').replace(/\./g, '').replace(',', '.')) || 0;

    // Máscara simples de moeda nos salários
    const SALARIOS = ['salario1', 'salario2', 'salario3'];
    SALARIOS.forEach(id => $(id).addEventListener('blur', () => {
        const v = parseMoeda($(id).value);
        $(id).value = v ? num(v) : '';
    }));

    // Erros por campo
    const CAMPOS = ['solicitacao', 'meses', 'salario1'];
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
        if (!PARCELAS[$('solicitacao').value]) { erro('solicitacao', 'Selecione a solicitação.'); ok = false; }
        const meses = $('meses').value.trim();
        if (!/^\d{1,3}$/.test(meses)) { erro('meses', 'Informe um número inteiro de meses.'); ok = false; }
        else if (+meses > 36) { erro('meses', 'Considere no máximo os últimos 36 meses.'); ok = false; }
        if (parseMoeda($('salario1').value) <= 0) { erro('salario1', 'Informe o último salário.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function valorParcela(media) {
        const t = TABELA;
        let valor, regra;
        if (media <= t.faixa1) { valor = media * 0.8; regra = `${num(media)} × 0,8`; }
        else if (media <= t.faixa2) { valor = (media - t.faixa1) * 0.5 + t.fixo2; regra = `(${num(media)} − ${num(t.faixa1)}) × 0,5 + ${num(t.fixo2)}`; }
        else { valor = t.teto; regra = 'Valor fixo (teto)'; }
        valor = r2(valor);
        const piso = valor < t.salarioMinimo;
        return { valor: piso ? t.salarioMinimo : valor, calculado: valor, regra, piso };
    }

    function calcular() {
        const sol = PARCELAS[$('solicitacao').value];
        const meses = parseInt($('meses').value, 10);
        const salarios = SALARIOS.map(id => parseMoeda($(id).value)).filter(v => v > 0);
        const media = r2(salarios.reduce((s, v) => s + v, 0) / salarios.length);
        const faixa = sol.faixas.find(([min]) => meses >= min);
        const qtd = faixa ? faixa[1] : 0;
        const p = valorParcela(media);
        return { sol, meses, salarios, media, qtd, ...p, total: r2(p.valor * qtd) };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    const linhas = itens => itens.filter(Boolean).map(([k, v]) => `<div class="cf-row"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900 tabular-nums">${esc(v)}</dd></div>`).join('');

    function mostrar(c, rolar) {
        const temDireito = c.qtd > 0;
        $('res-resumo').textContent = temDireito ? `${c.sol.nome} · Valor da parcela` : `${c.sol.nome} · Sem direito ao benefício`;
        $('res-parcela').textContent = temDireito ? brl(c.valor) : brl(0);
        $('res-media').textContent = brl(c.media);
        $('res-qtd').textContent = temDireito ? `${c.qtd} parcelas` : '0';
        $('res-total').textContent = brl(c.total);

        const aviso = $('res-sem-direito');
        aviso.classList.toggle('hidden', temDireito);
        aviso.innerHTML = temDireito ? '' : `<strong>Sem direito ao benefício.</strong> Na ${esc(c.sol.nome.toLowerCase())} é preciso ter trabalhado pelo menos <strong>${c.sol.minimo} meses</strong>; foram informados ${c.meses}.`;

        $('res-calculo').innerHTML = linhas([
            [`Média de ${c.salarios.length} ${c.salarios.length === 1 ? 'salário' : 'salários'}`, brl(c.media)],
            ['Fórmula aplicada', c.regra],
            c.regra !== 'Valor fixo (teto)' ? ['Resultado da fórmula', brl(c.calculado)] : null,
            c.piso ? ['Ajuste ao salário mínimo', brl(TABELA.salarioMinimo)] : null,
            ['Valor da parcela', brl(c.valor)]
        ]);
        $('res-dados').innerHTML = linhas([
            ['Solicitação', c.sol.nome],
            ['Meses trabalhados', String(c.meses)],
            ['Carência exigida', `${c.sol.minimo} meses`],
            ['Último salário', brl(parseMoeda($('salario1').value))],
            parseMoeda($('salario2').value) ? ['Penúltimo salário', brl(parseMoeda($('salario2').value))] : null,
            parseMoeda($('salario3').value) ? ['Antepenúltimo salário', brl(parseMoeda($('salario3').value))] : null
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
    const TIPO = 'Cálculo de Seguro-Desemprego';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { solicitacao: 'solicitacao', meses: 'meses', salario1: 'salario1', salario2: 'salario2', salario3: 'salario3' };
    const linkCalculo = inputs => 'calculo-seguro-desemprego.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(PARCELAS[c.inputs?.solicitacao]?.nome || 'Seguro-desemprego')}</span>
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
            id: `seguro-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: {
                resumo: ultimo.qtd ? `${ultimo.qtd} × ${brl(ultimo.valor)}` : 'Sem direito',
                valorParcela: brl(ultimo.valor), parcelas: ultimo.qtd, mediaSalarial: brl(ultimo.media)
            }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-seguro-desemprego.html?solicitacao=…&meses=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('solicitacao') && params.get('meses')) {
        Object.entries(CHAVES).forEach(([k, id]) => { if (params.has(k)) $(id).value = params.get(k); });
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
