// Simulador MVA Ajustado (calculo-mva-ajustado.html), modelo: simulador original do Cenofisco
// Campos como no simulador original: MVA/IVA-ST original, alíquota interestadual e alíquota interna (destino).
// Regra (cláusula nona do Convênio ICMS 142/2018): MVA ajustada = [(1 + MVA original) × (1 − ALQ inter) / (1 − ALQ intra)] − 1;
// se a alíquota interestadual for igual ou maior que a interna, vale a MVA original.
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas), com link que reabre já calculado.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

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

    const form = $('mva-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pct = (v, casas = 2) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
    const dec = (v, casas = 4) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    const parsePct = v => parseFloat(String(v || '').replace(/\s|%/g, '').replace(/\./g, '').replace(',', '.'));

    // Máscara simples de percentual
    const CAMPOS = ['mva-original', 'aliquota-inter', 'aliquota-intra'];
    CAMPOS.forEach(id => $(id).addEventListener('blur', () => {
        const v = parsePct($(id).value);
        $(id).value = Number.isFinite(v) ? pct(v).replace('%', '') : '';
    }));
    // Atalhos de alíquota interestadual (4%, 7%, 12%)
    document.querySelectorAll('.cf-inter').forEach(b => b.addEventListener('click', () => {
        $('aliquota-inter').value = b.dataset.valor;
        $('aliquota-intra').focus();
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
        const mva = parsePct($('mva-original').value), inter = parsePct($('aliquota-inter').value), intra = parsePct($('aliquota-intra').value);
        if (!Number.isFinite(mva) || mva < 0) { erro('mva-original', 'Informe a MVA original.'); ok = false; }
        if (!Number.isFinite(inter) || inter <= 0 || inter >= 100) { erro('aliquota-inter', 'Informe a alíquota interestadual (ex.: 4, 7 ou 12).'); ok = false; }
        if (!Number.isFinite(intra) || intra <= 0 || intra >= 100) { erro('aliquota-intra', 'Informe a alíquota interna, menor que 100%.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const mva = parsePct($('mva-original').value), inter = parsePct($('aliquota-inter').value), intra = parsePct($('aliquota-intra').value);
        const semAjuste = inter >= intra;
        const fator = (1 + mva / 100) * (1 - inter / 100) / (1 - intra / 100);
        const ajustada = semAjuste ? mva : (fator - 1) * 100;
        return { mva, inter, intra, semAjuste, fator, ajustada, ajustada2: Math.round(ajustada * 100) / 100 };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    function mostrar(c, rolar) {
        $('res-mva').textContent = pct(c.ajustada2);
        $('res-resumo').textContent = c.semAjuste ? 'Sem ajuste: aplica-se a MVA original' : 'Margem a aplicar na base de cálculo do ICMS-ST';
        $('res-original').textContent = pct(c.mva);
        $('res-aliquotas').textContent = `${pct(c.inter)} / ${pct(c.intra)}`;
        $('res-acrescimo').textContent = `${c.ajustada2 - c.mva >= 0 ? '+' : ''}${pct(c.ajustada2 - c.mva)} p.p.`.replace('% p.p.', ' p.p.');

        const aviso = $('res-sem-ajuste');
        aviso.classList.toggle('hidden', !c.semAjuste);
        aviso.innerHTML = c.semAjuste ? `<strong>Sem ajuste.</strong> A alíquota interestadual (${esc(pct(c.inter))}) é igual ou maior que a interna (${esc(pct(c.intra))}), então vale a MVA original.` : '';

        const um = v => dec(1 + v / 100);
        const menos = v => dec(1 - v / 100);
        $('res-calculo').innerHTML = [
            ['1 + MVA original', `1 + ${dec(c.mva / 100)} = ${um(c.mva)}`],
            ['1 − ALQ inter', `1 − ${dec(c.inter / 100)} = ${menos(c.inter)}`],
            ['1 − ALQ intra', `1 − ${dec(c.intra / 100)} = ${menos(c.intra)}`],
            ['Fator', `${um(c.mva)} × ${menos(c.inter)} ÷ ${menos(c.intra)} = ${dec(c.fator, 6)}`],
            c.semAjuste ? null : ['Fator − 1', `${dec(c.fator - 1, 6)} = ${pct(c.ajustada, 4)}`],
            ['MVA ajustada', pct(c.ajustada2)]
        ].filter(Boolean).map(([k, v], i, a) => `<div class="cf-row${i === a.length - 1 ? ' font-semibold' : ''}"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900 tabular-nums">${esc(v)}</dd></div>`).join('');

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
    const TIPO = 'MVA-Ajustado';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { mva: 'mva-original', inter: 'aliquota-inter', intra: 'aliquota-intra' };
    const linkCalculo = inputs => 'calculo-mva-ajustado.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(c.inputs ? `MVA ${c.inputs.mva}% · ${c.inputs.inter}% / ${c.inputs.intra}%` : 'MVA ajustado')}</span>
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
            id: `mva-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { resumo: `Ajustada ${pct(ultimo.ajustada2)}`, mvaAjustada: pct(ultimo.ajustada2) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-mva-ajustado.html?mva=…&inter=…&intra=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('mva') && params.get('inter') && params.get('intra')) {
        Object.entries(CHAVES).forEach(([k, id]) => { $(id).value = params.get(k); });
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
