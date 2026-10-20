// SUP - Sociedades de Profissionais (calculo-sup.html): ISS das sociedades de profissionais do Município de São Paulo
// Campos como no aplicativo original: serviço (alíquota, código de serviço e item da lista), trimestre, data de
// pagamento, nº de profissionais e faixa.
// Regras (art. 15 da Lei 13.701/2003, §§ 12 e 13, acrescentados pela Lei 17.719/2021): a base mensal é progressiva —
// cada profissional entra na faixa da sua posição (1º ao 5º na faixa I, 6º ao 10º na II…) e soma a receita da faixa;
// ISS mensal = base × alíquota; trimestral = 3 × mensal; vencimento no dia 10 do mês seguinte ao trimestre.
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas), com link que reabre já calculado.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ------------------------------------------------------------------
    // Tabela progressiva — atualizada anualmente pelo IPCA (art. 2º da Lei 13.105/2000)
    // ------------------------------------------------------------------
    // [faixa, até N profissionais, receita bruta mensal por profissional]
    const FAIXAS = [
        ['I', 5, 2413.62],
        ['II', 10, 6048.39],
        ['III', 20, 12096.79],
        ['IV', 30, 24193.60],
        ['V', 50, 36290.39],
        ['VI', 100, 48387.19],
        ['VII', Infinity, 72580.80]
    ];

    // Serviços do regime especial – sociedade (ids do aplicativo original).
    // Item da lista: subitem da LC 116/2003. Alíquota e código de serviço: só o 21 veio do aplicativo original;
    // os marcados com "conferir" estão com 5% e sem código até a confirmação na tabela da Prefeitura.
    const SERVICOS = [
        { id: 21, nome: 'Agrimensura e congêneres', aliquota: 5, codigo: '1628', item: '7.01' },
        { id: 22, nome: 'Agronomia e congêneres', aliquota: 5, codigo: '', item: '7.01', conferir: true },
        { id: 23, nome: 'Análises clínicas, patologia, eletricidade médica, radioterapia, quimioterapia, ultrassonografia, ressonância magnética, radiologia, tomografia e congêneres', aliquota: 5, codigo: '', item: '4.02', conferir: true },
        { id: 24, nome: 'Arquitetura, urbanismo e congêneres', aliquota: 5, codigo: '', item: '7.01', conferir: true },
        { id: 25, nome: 'Auditoria', aliquota: 5, codigo: '', item: '17.16', conferir: true },
        { id: 26, nome: 'Contador, técnico em contabilidade, guarda-livros e congêneres', aliquota: 5, codigo: '', item: '17.19', conferir: true },
        { id: 27, nome: 'Economistas', aliquota: 5, codigo: '', item: '17.20', conferir: true },
        { id: 28, nome: 'Enfermagem, inclusive serviços auxiliares', aliquota: 5, codigo: '', item: '4.06', conferir: true },
        { id: 29, nome: 'Engenharia e congêneres', aliquota: 5, codigo: '', item: '7.01', conferir: true },
        { id: 30, nome: 'Fisioterapia', aliquota: 5, codigo: '', item: '4.08', conferir: true },
        { id: 31, nome: 'Fonoaudiologia', aliquota: 5, codigo: '', item: '4.08', conferir: true },
        { id: 32, nome: 'Geologia e congêneres', aliquota: 5, codigo: '', item: '7.01', conferir: true },
        { id: 33, nome: 'Medicina e biomedicina', aliquota: 5, codigo: '', item: '4.01', conferir: true },
        { id: 34, nome: 'Medicina veterinária e zootecnia', aliquota: 5, codigo: '', item: '5.01', conferir: true },
        { id: 35, nome: 'Obstetrícia', aliquota: 5, codigo: '', item: '4.11', conferir: true },
        { id: 36, nome: 'Odontologia', aliquota: 5, codigo: '', item: '4.12', conferir: true },
        { id: 37, nome: 'Ortóptica', aliquota: 5, codigo: '', item: '4.13', conferir: true },
        { id: 38, nome: 'Próteses sob encomenda', aliquota: 5, codigo: '', item: '4.14', conferir: true },
        { id: 39, nome: 'Psicologia, clínica ou não', aliquota: 5, codigo: '', item: '4.16', conferir: true },
        { id: 40, nome: 'Terapia ocupacional', aliquota: 5, codigo: '', item: '4.08', conferir: true }
    ];
    const TRIMESTRES = {
        1: { nome: '1º trimestre (janeiro a março)', vence: [0, 3] },    // [anos a somar, mês (0 = janeiro)] do dia 10
        2: { nome: '2º trimestre (abril a junho)', vence: [0, 6] },
        3: { nome: '3º trimestre (julho a setembro)', vence: [0, 9] },
        4: { nome: '4º trimestre (outubro a dezembro)', vence: [1, 0] }
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

    const form = $('sup-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const pct = v => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    const r2 = v => Math.round(v * 100) / 100;

    // ------------------------------------------------------------------
    // Formulário
    // ------------------------------------------------------------------
    const servicoSel = $('servico'), trimestreSel = $('trimestre'), profInput = $('profissionais');
    servicoSel.insertAdjacentHTML('beforeend', SERVICOS.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join(''));
    const servicoAtual = () => SERVICOS.find(s => String(s.id) === servicoSel.value);

    function atualizarServico() {
        const s = servicoAtual();
        $('info-aliquota').textContent = s ? pct(s.aliquota) : '—';
        $('info-codigo').textContent = s?.codigo || '—';
        $('info-item').textContent = s ? s.item : '—';
    }
    // Vencimento: dia 10 do mês seguinte ao trimestre, no ano corrente (o 4º trimestre vence em janeiro do ano seguinte)
    function vencimento(t) {
        const tri = TRIMESTRES[t];
        if (!tri) return null;
        return new Date(new Date().getFullYear() + tri.vence[0], tri.vence[1], 10);
    }
    const fmtData = d => d ? d.toLocaleDateString('pt-BR') : '—';
    const atualizarData = () => { $('data-pagamento').textContent = fmtData(vencimento(trimestreSel.value)); };
    const faixaDe = n => FAIXAS.find(([, ate]) => n <= ate);
    function atualizarFaixa() {
        const n = parseInt(profInput.value, 10);
        $('faixa-previa').textContent = n > 0 ? `Faixa ${faixaDe(n)[0]}` : '—';
    }
    servicoSel.addEventListener('change', atualizarServico);
    trimestreSel.addEventListener('change', atualizarData);
    profInput.addEventListener('input', atualizarFaixa);

    // Erros por campo
    const CAMPOS = ['servico', 'trimestre', 'profissionais'];
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
        if (!servicoAtual()) { erro('servico', 'Selecione o serviço.'); ok = false; }
        if (!TRIMESTRES[trimestreSel.value]) { erro('trimestre', 'Selecione o trimestre.'); ok = false; }
        if (!/^\d{1,5}$/.test(profInput.value.trim()) || +profInput.value === 0) { erro('profissionais', 'Informe o número de profissionais (inteiro, a partir de 1).'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const servico = servicoAtual();
        const n = parseInt(profInput.value, 10);
        const linhas = [];
        let anterior = 0;
        for (const [nome, ate, receita] of FAIXAS) {
            if (n <= anterior) break;
            const qtd = Math.min(n, ate) - anterior;
            const base = r2(qtd * receita);
            linhas.push({ nome, qtd, receita, base, iss: r2(base * servico.aliquota / 100) });
            anterior = ate;
        }
        const base = r2(linhas.reduce((s, l) => s + l.base, 0));
        const mensal = r2(base * servico.aliquota / 100);
        return {
            servico, n, linhas, base, mensal, trimestral: r2(mensal * 3),
            faixa: faixaDe(n)[0], trimestre: TRIMESTRES[trimestreSel.value], vence: vencimento(trimestreSel.value)
        };
    }

    // ------------------------------------------------------------------
    // Resultado
    // ------------------------------------------------------------------
    const resultado = $('resultado');
    function mostrar(c, rolar) {
        $('res-resumo').textContent = `${c.trimestre.nome} · ISS trimestral a pagar`;
        $('res-trimestral').textContent = brl(c.trimestral);
        $('res-qtd').textContent = String(c.n);
        $('res-mensal').textContent = brl(c.mensal);
        $('res-vencimento').textContent = fmtData(c.vence);

        $('tab-faixas').innerHTML = c.linhas.map(l => `
            <tr class="border-b border-slate-100 last:border-b-0">
                <td class="py-2.5 pr-3 font-medium text-slate-900">Faixa ${l.nome}</td>
                <td class="py-2.5 pr-3 text-right tabular-nums text-slate-700">${l.qtd}</td>
                <td class="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums text-slate-700">${brl(l.receita)}</td>
                <td class="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums text-slate-700">${brl(l.base)}</td>
                <td class="py-2.5 text-right font-medium whitespace-nowrap tabular-nums text-slate-900">${brl(l.iss)}</td>
            </tr>`).join('');
        $('tot-base').textContent = brl(c.base);
        $('tot-iss').textContent = brl(c.mensal);

        $('res-dados').innerHTML = [
            ['Serviço', c.servico.nome],
            ['Alíquota', pct(c.servico.aliquota)],
            ['Código de serviço', c.servico.codigo || '—'],
            ['Item da lista (LC 116/2003)', c.servico.item],
            ['Trimestre', c.trimestre.nome],
            ['Data de pagamento', fmtData(c.vence)],
            ['Faixa alcançada', `Faixa ${c.faixa}`]
        ].map(([k, v]) => `<div class="cf-row"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900">${esc(v)}</dd></div>`).join('');

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
        atualizarServico();
        atualizarData();
        atualizarFaixa();
        resultado.classList.add('hidden');
        ultimo = null;
    });
    $('imprimir-btn').addEventListener('click', () => window.print());

    // --- Cálculos salvos (lateral e página de Ferramentas) ---
    const TIPO = 'SUP - Sociedades de Profissionais';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { servico: 'servico', trimestre: 'trimestre', profissionais: 'profissionais' };
    const linkCalculo = inputs => 'calculo-sup.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(SERVICOS.find(s => String(s.id) === c.inputs?.servico)?.nome || 'Sociedade de profissionais')}</span>
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
            id: `sup-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { resumo: `${ultimo.n} prof. · ISS trimestral ${brl(ultimo.trimestral)}`, issMensal: brl(ultimo.mensal), issTrimestral: brl(ultimo.trimestral) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-sup.html?servico=…&trimestre=…&profissionais=… abre já calculado ---
    const params = new URLSearchParams(location.search);
    if (params.get('servico') && params.get('profissionais')) {
        Object.entries(CHAVES).forEach(([k, id]) => { if (params.has(k)) $(id).value = params.get(k); });
        atualizarServico();
        atualizarData();
        atualizarFaixa();
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }
});
