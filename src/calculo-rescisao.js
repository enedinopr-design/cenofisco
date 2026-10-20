// Cálculo de Rescisão (calculo-rescisao.html), modelo: https://www.cenofisco.com.br/AplicativoCalculoRescisao
// Campos como no aplicativo original: motivo, tipo de aviso prévio, férias vencidas, nome, admissão, data da dispensa,
// data do aviso prévio, salário e dependentes. O tempo de serviço aparece assim que as datas são preenchidas.
// Regras (CLT): saldo de salário em mês comercial de 30 dias; aviso prévio de 30 dias + 3 por ano completo, até 90
// (Lei 12.506/2011); o aviso indenizado projeta o contrato para 13º e férias; fração de 15 dias ou mais conta 1/12;
// na justa causa não há 13º nem férias proporcionais; no acordo (art. 484-A) o aviso indenizado e a multa do FGTS
// caem pela metade. INSS e IRRF incidem sobre saldo de salário e 13º (separadamente); aviso indenizado e férias
// indenizadas não têm desconto.
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas), com link que reabre já calculado.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ------------------------------------------------------------------
    // Tabelas de 2026 — conferir a cada atualização oficial
    // ------------------------------------------------------------------
    const TABELAS = {
        inss: [[1621.00, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]],   // faixas progressivas; o último limite é o teto
        irrf: [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]],
        deducaoDependente: 189.59,
        descontoSimplificado: 607.20,
        // Redução do IR (Lei 15.270/2025): zera o imposto até R$ 5.000,00 de rendimentos; reduz gradualmente até R$ 7.350,00
        reducao: { isencaoAte: 5000.00, limite: 7350.00, maxima: 312.89, a: 978.62, b: 0.133145 }
    };

    // Motivos: avisos possíveis, % da multa do FGTS, saque do FGTS e se há 13º/férias proporcionais
    const MOTIVOS = {
        'sem-justa-causa': { nome: 'Sem Justa Causa', avisos: ['trabalhado', 'indenizado'], multa: 0.40, saque: 'Sim (100%)', seguro: true, proporcionais: true },
        'pedido-demissao': { nome: 'Pedido de Demissão', avisos: ['trabalhado', 'nao-cumprido', 'dispensado'], multa: 0, saque: 'Não', seguro: false, proporcionais: true },
        'justa-causa': { nome: 'Com Justa Causa', avisos: [], multa: 0, saque: 'Não', seguro: false, proporcionais: false },
        'acordo': { nome: 'Acordo entre as partes (art. 484-A)', avisos: ['trabalhado', 'indenizado'], multa: 0.20, saque: 'Sim (até 80%)', seguro: false, proporcionais: true, metade: true },
        'rescisao-indireta': { nome: 'Rescisão Indireta', avisos: ['indenizado'], multa: 0.40, saque: 'Sim (100%)', seguro: true, proporcionais: true },
        'termino-contrato': { nome: 'Término do Contrato de Experiência', avisos: [], multa: 0, saque: 'Sim (100%)', seguro: false, proporcionais: true }
    };
    const AVISOS = {
        trabalhado: 'Trabalhado',
        indenizado: 'Indenizado',
        'nao-cumprido': 'Não cumprido (desconto)',
        dispensado: 'Dispensado pelo empregador'
    };

    const $ = id => document.getElementById(id);

    // Menu do celular
    const menuToggle = $('menu-toggle'), mainMenu = $('main-menu');
    menuToggle?.addEventListener('click', () => {
        const oculto = mainMenu.classList.toggle('hidden');
        menuToggle.setAttribute('aria-expanded', String(!oculto));
    });

    const form = $('rescisao-form');
    if (!form) return;
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = v => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const r2 = v => Math.round(v * 100) / 100;
    const parseMoeda = v => parseFloat(String(v || '').replace(/\s|R\$/g, '').replace(/\./g, '').replace(',', '.')) || 0;

    // --- Datas (UTC, para não sofrer com fuso/horário de verão) ---
    const lerData = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
    const fmtData = d => d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
    const addDias = (d, n) => new Date(d.getTime() + n * 86400000);
    const diasNoMes = (a, m) => new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
    function addMeses(d, n) {
        const a = d.getUTCFullYear(), m = d.getUTCMonth() + n;
        const alvo = new Date(Date.UTC(a, m, 1));
        alvo.setUTCDate(Math.min(d.getUTCDate(), diasNoMes(alvo.getUTCFullYear(), alvo.getUTCMonth())));
        return alvo;
    }
    const diffDias = (a, b) => Math.round((b - a) / 86400000);

    // Tempo de serviço de "ini" até "fim" (inclusive): anos, meses e dias
    function tempoServico(ini, fim) {
        let anos = 0, meses = 0, cursor = ini;
        while (addMeses(ini, (anos * 12) + 12) <= addDias(fim, 1)) anos++;
        cursor = addMeses(ini, anos * 12);
        while (addMeses(cursor, meses + 1) <= addDias(fim, 1)) meses++;
        cursor = addMeses(cursor, meses);
        return { anos, meses, dias: diffDias(cursor, addDias(fim, 1)) };
    }
    const textoTempo = t => [
        t.anos ? `${t.anos} ${t.anos === 1 ? 'ano' : 'anos'}` : '',
        t.meses ? `${t.meses} ${t.meses === 1 ? 'mês' : 'meses'}` : '',
        t.dias ? `${t.dias} ${t.dias === 1 ? 'dia' : 'dias'}` : ''
    ].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' e $1') || '0 dia';

    // 13º: meses do ano da saída com 15 dias ou mais de trabalho
    function avos13(adm, fim) {
        const ano = fim.getUTCFullYear();
        const ini = adm > new Date(Date.UTC(ano, 0, 1)) ? adm : new Date(Date.UTC(ano, 0, 1));
        let avos = 0;
        for (let m = ini.getUTCMonth(); m <= fim.getUTCMonth(); m++) {
            const primeiro = m === ini.getUTCMonth() ? ini.getUTCDate() : 1;
            const ultimo = m === fim.getUTCMonth() ? fim.getUTCDate() : diasNoMes(ano, m);
            if (ultimo - primeiro + 1 >= 15) avos++;
        }
        return avos;
    }
    // Férias proporcionais: meses do período aquisitivo em curso (fração de 15 dias ou mais conta 1/12)
    function avosFerias(adm, fim) {
        let anos = 0;
        while (addMeses(adm, (anos + 1) * 12) <= fim) anos++;
        const ini = addMeses(adm, anos * 12);
        let avos = 0;
        while (avos < 12 && addMeses(ini, avos + 1) <= addDias(fim, 1)) avos++;
        const resto = diffDias(addMeses(ini, avos), addDias(fim, 1));
        if (avos < 12 && resto >= 15) avos++;
        return { avos, inicio: ini };
    }

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
    function impostoTabela(base) {
        const faixa = TABELAS.irrf.find(([limite]) => base <= limite);
        return { aliquota: faixa[1], deduzir: faixa[2], valor: Math.max(0, base * faixa[1] - faixa[2]) };
    }
    function reducao(rendimentos, imposto) {
        const r = TABELAS.reducao;
        if (rendimentos <= r.isencaoAte) return Math.min(imposto, r.maxima);
        if (rendimentos <= r.limite) return Math.min(imposto, Math.max(0, r.a - r.b * rendimentos));
        return 0;
    }
    // simplificado: usa o desconto simplificado quando ele for mais vantajoso que as deduções legais
    function calcIrrf(rendimentos, inss, dependentes, simplificado) {
        if (rendimentos <= 0) return { valor: 0, base: 0, aliquota: 0, deducoes: 0, modo: '—' };
        const legais = inss + dependentes * TABELAS.deducaoDependente;
        const usarSimpl = simplificado && TABELAS.descontoSimplificado > legais;
        const deducoes = usarSimpl ? TABELAS.descontoSimplificado : legais;
        const base = Math.max(0, rendimentos - deducoes);
        const t = impostoTabela(base);
        const valor = r2(Math.max(0, t.valor - reducao(rendimentos, t.valor)));
        return { valor, base: r2(base), aliquota: t.aliquota, deducoes: r2(deducoes), modo: usarSimpl ? 'desconto simplificado' : 'deduções legais' };
    }

    // ------------------------------------------------------------------
    // Formulário
    // ------------------------------------------------------------------
    const motivoSel = $('motivo'), avisoSel = $('tipo-aviso');
    function atualizarAvisos() {
        const m = MOTIVOS[motivoSel.value];
        const atual = avisoSel.value;
        avisoSel.innerHTML = m.avisos.length
            ? m.avisos.map(a => `<option value="${a}">${AVISOS[a]}</option>`).join('')
            : '<option value="">Não se aplica</option>';
        if (m.avisos.includes(atual)) avisoSel.value = atual;
        avisoSel.disabled = !m.avisos.length;
        atualizarDataAviso();
    }
    function atualizarDataAviso() {
        const usa = !!avisoSel.value;   // sem aviso (justa causa, término de contrato) a data não se aplica
        $('data-aviso').disabled = !usa;
        $('grupo-data-aviso').classList.toggle('opacity-50', !usa);
    }
    function atualizarTempo() {
        const adm = lerData($('admissao').value), fim = lerData($('dispensa').value);
        $('tempo-servico').textContent = adm && fim && fim >= adm ? textoTempo(tempoServico(adm, fim)) : '—';
    }
    motivoSel.addEventListener('change', atualizarAvisos);
    avisoSel.addEventListener('change', atualizarDataAviso);
    ['admissao', 'dispensa'].forEach(id => $(id).addEventListener('change', atualizarTempo));
    atualizarAvisos();

    // Máscara simples de moeda no salário
    const salarioInput = $('salario');
    salarioInput.addEventListener('blur', () => {
        const v = parseMoeda(salarioInput.value);
        salarioInput.value = v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    });

    // Erros por campo
    const CAMPOS = ['admissao', 'dispensa', 'data-aviso', 'salario', 'dependentes'];
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
        const adm = lerData($('admissao').value), fim = lerData($('dispensa').value), aviso = lerData($('data-aviso').value);
        if (!adm) { erro('admissao', 'Informe a data de admissão.'); ok = false; }
        if (!fim) { erro('dispensa', 'Informe a data da dispensa.'); ok = false; }
        if (adm && fim && fim < adm) { erro('dispensa', 'A dispensa deve ser depois da admissão.'); ok = false; }
        if (avisoSel.value === 'trabalhado' && !aviso) { erro('data-aviso', 'No aviso trabalhado, informe a data do aviso.'); ok = false; }
        if (aviso && fim && aviso > fim) { erro('data-aviso', 'O aviso não pode ser depois da dispensa.'); ok = false; }
        if (aviso && adm && aviso < adm) { erro('data-aviso', 'O aviso não pode ser antes da admissão.'); ok = false; }
        if (parseMoeda(salarioInput.value) <= 0) { erro('salario', 'Informe o salário.'); ok = false; }
        const dep = $('dependentes').value.trim();
        if (dep && !/^\d{1,2}$/.test(dep)) { erro('dependentes', 'Informe um número inteiro.'); ok = false; }
        return ok;
    }

    // ------------------------------------------------------------------
    // Cálculo
    // ------------------------------------------------------------------
    function calcular() {
        const motivo = MOTIVOS[motivoSel.value];
        const tipoAviso = avisoSel.value;
        const adm = lerData($('admissao').value), fim = lerData($('dispensa').value);
        const dataAviso = lerData($('data-aviso').value) || fim;
        const salario = parseMoeda(salarioInput.value);
        const dependentes = parseInt($('dependentes').value, 10) || 0;
        const feriasVencidas = $('ferias-vencidas').value === 'sim';
        const diaria = salario / 30;

        // Saldo de salário (mês comercial de 30 dias)
        const inicioMes = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), 1));
        const desde = adm > inicioMes ? adm : inicioMes;
        const mesInteiro = desde.getTime() === inicioMes.getTime() && fim.getUTCDate() === diasNoMes(fim.getUTCFullYear(), fim.getUTCMonth());
        const diasSaldo = mesInteiro ? 30 : Math.min(30, diffDias(desde, fim) + 1);

        // Aviso prévio
        const anos = tempoServico(adm, fim).anos;
        const diasLei = Math.min(90, 30 + 3 * anos);
        let diasIndenizados = 0;
        if (motivoSel.value === 'pedido-demissao') diasIndenizados = 0;
        else if (tipoAviso === 'indenizado') diasIndenizados = diasLei;
        else if (tipoAviso === 'trabalhado') diasIndenizados = diasLei - 30;   // dias acrescidos pela Lei 12.506 são indenizados
        const fatorAviso = motivo.metade ? 0.5 : 1;
        const valorAviso = r2(diaria * diasIndenizados * fatorAviso);
        const fimProjetado = addDias(fim, diasIndenizados);

        // 13º e férias
        const a13 = motivo.proporcionais ? avos13(adm, fimProjetado) : 0;
        const fer = avosFerias(adm, fimProjetado);
        const aFerias = motivo.proporcionais ? fer.avos : 0;
        const valorSaldo = r2(diaria * diasSaldo);
        const valor13 = r2(salario / 12 * a13);
        const valorFeriasVenc = feriasVencidas ? r2(salario) : 0;
        const tercoVenc = r2(valorFeriasVenc / 3);
        const valorFeriasProp = r2(salario / 12 * aFerias);
        const tercoProp = r2(valorFeriasProp / 3);
        const descontoAviso = motivoSel.value === 'pedido-demissao' && tipoAviso === 'nao-cumprido' ? r2(salario) : 0;

        // Descontos legais
        const inssSaldo = calcInss(valorSaldo);
        const inss13 = calcInss(valor13);
        const irSaldo = calcIrrf(valorSaldo, inssSaldo, dependentes, true);
        const ir13 = calcIrrf(valor13, inss13, dependentes, false);

        const proventos = [
            ['Saldo de salário', `${diasSaldo} ${diasSaldo === 1 ? 'dia' : 'dias'}`, valorSaldo],
            diasIndenizados ? [motivo.metade ? 'Aviso prévio indenizado (metade – art. 484-A)' : (tipoAviso === 'trabalhado' ? 'Aviso prévio indenizado (dias da Lei 12.506)' : 'Aviso prévio indenizado'), `${diasIndenizados} dias`, valorAviso] : null,
            motivo.proporcionais ? ['13º salário proporcional', `${a13}/12`, valor13] : null,
            feriasVencidas ? ['Férias vencidas', '30 dias', valorFeriasVenc] : null,
            feriasVencidas ? ['1/3 sobre férias vencidas', '', tercoVenc] : null,
            motivo.proporcionais ? ['Férias proporcionais', `${aFerias}/12`, valorFeriasProp] : null,
            motivo.proporcionais ? ['1/3 sobre férias proporcionais', '', tercoProp] : null
        ].filter(Boolean);
        const descontos = [
            descontoAviso ? ['Aviso prévio não cumprido', '30 dias', descontoAviso] : null,
            ['INSS sobre saldo de salário', '', inssSaldo],
            motivo.proporcionais ? ['INSS sobre 13º salário', '', inss13] : null,
            ['IRRF sobre saldo de salário', irSaldo.valor ? `${(irSaldo.aliquota * 100).toLocaleString('pt-BR')}%` : 'isento', irSaldo.valor],
            motivo.proporcionais ? ['IRRF sobre 13º salário', ir13.valor ? `${(ir13.aliquota * 100).toLocaleString('pt-BR')}%` : 'isento', ir13.valor] : null
        ].filter(Boolean);
        const totalProventos = r2(proventos.reduce((s, p) => s + p[2], 0));
        const totalDescontos = r2(descontos.reduce((s, d) => s + d[2], 0));

        // FGTS (informativo): depósito do mês e estimativa da multa sobre o saldo da conta
        const fgtsMes = r2((valorSaldo + valorAviso + valor13) * 0.08);
        const mesesContrato = (() => { const t = tempoServico(adm, fimProjetado); return t.anos * 12 + t.meses + (t.dias >= 15 ? 1 : 0); })();
        const saldoFgtsEstimado = r2(salario * 0.08 * mesesContrato * 13 / 12);
        const multa = r2(saldoFgtsEstimado * motivo.multa);

        return {
            motivo, tipoAviso, adm, fim, dataAviso, fimProjetado, diasLei, diasIndenizados, anos,
            proventos, descontos, totalProventos, totalDescontos, liquido: r2(totalProventos - totalDescontos),
            irSaldo, ir13, inssSaldo, inss13, valorSaldo, valor13,
            fgtsMes, saldoFgtsEstimado, multa, inicioAquisitivo: fer.inicio
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

    function mostrar(c, rolar) {
        const nome = $('nome').value.trim();
        $('res-titulo-nome').textContent = nome ? ` – ${nome}` : '';
        $('res-liquido').textContent = brl(c.liquido);
        $('res-proventos').textContent = brl(c.totalProventos);
        $('res-descontos').textContent = brl(c.totalDescontos);
        $('res-motivo').textContent = c.motivo.nome;

        $('tab-proventos').innerHTML = linhas(c.proventos);
        $('tot-proventos').textContent = brl(c.totalProventos);
        $('tab-descontos').innerHTML = linhas(c.descontos);
        $('tot-descontos').textContent = brl(c.totalDescontos);

        const avisoTxt = c.motivo.avisos.length ? `${AVISOS[c.tipoAviso]}${c.motivoKey === 'pedido-demissao' ? '' : ` · ${c.diasLei} dias pela Lei 12.506`}` : 'Não se aplica';
        $('res-dados').innerHTML = [
            nome ? ['Empregado', nome] : null,
            ['Motivo', c.motivo.nome],
            ['Admissão', fmtData(c.adm)],
            ['Data da dispensa', fmtData(c.fim)],
            c.motivo.avisos.length ? ['Data do aviso prévio', fmtData(c.dataAviso)] : null,
            ['Aviso prévio', avisoTxt],
            c.diasIndenizados ? ['Data projetada (com aviso indenizado)', fmtData(c.fimProjetado)] : null,
            ['Tempo de serviço', textoTempo(tempoServico(c.adm, c.fim))],
            ['Período aquisitivo em curso desde', fmtData(c.inicioAquisitivo)]
        ].filter(Boolean).map(([k, v]) => `<div class="cf-row"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900">${esc(v)}</dd></div>`).join('');

        $('res-impostos').innerHTML = [
            ['Base do INSS (saldo de salário)', brl(c.valorSaldo)],
            ['Base do INSS (13º salário)', brl(c.valor13)],
            [`Base do IRRF – saldo (${c.irSaldo.modo})`, brl(c.irSaldo.base)],
            ['Base do IRRF – 13º (deduções legais)', brl(c.ir13.base)]
        ].map(([k, v]) => `<div class="cf-row"><dt>${esc(k)}</dt><dd class="font-medium text-slate-900 tabular-nums">${v}</dd></div>`).join('');

        $('res-fgts').innerHTML = [
            ['Depósito do FGTS do mês da rescisão (8%)', brl(c.fgtsMes)],
            [`Multa rescisória (${Math.round(c.motivo.multa * 100)}%) – estimativa`, c.motivo.multa ? brl(c.multa) : 'Não se aplica'],
            ['Saque do FGTS', c.motivo.saque],
            ['Seguro-desemprego', c.motivo.seguro ? 'Tem direito, se cumprir os requisitos' : 'Não']
        ].map(([k, v]) => `<div class="cf-row"><dt>${esc(k)}</dt><dd class="text-right font-medium text-slate-900">${esc(v)}</dd></div>`).join('');

        resultado.classList.remove('hidden');
        if (rolar) {
            resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
            resultado.focus({ preventScroll: true });
        }
    }

    let ultimo = null;
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!validar()) {
            resultado.classList.add('hidden');
            form.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }
        ultimo = calcular();
        ultimo.motivoKey = motivoSel.value;
        mostrar(ultimo, !abrindoSalvo);
    });

    $('limpar-btn').addEventListener('click', () => {
        form.reset();
        limparErros();
        atualizarAvisos();
        atualizarTempo();
        resultado.classList.add('hidden');
        ultimo = null;
    });
    $('imprimir-btn').addEventListener('click', () => window.print());

    // --- Cálculos salvos (lateral e página de Ferramentas) ---
    const TIPO = 'Cálculo de Rescisão';
    const lista = $('saved-calculations-list');
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const CHAVES = { motivo: 'motivo', aviso: 'tipo-aviso', ferias: 'ferias-vencidas', nome: 'nome', admissao: 'admissao', dispensa: 'dispensa', dataAviso: 'data-aviso', salario: 'salario', dependentes: 'dependentes' };
    const linkCalculo = inputs => 'calculo-rescisao.html?' + new URLSearchParams(inputs).toString();

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
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">${esc(c.inputs?.nome || MOTIVOS[c.inputs?.motivo]?.nome || 'Rescisão')}</span>
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
            id: `rescisao-${Date.now()}`,
            tipo: TIPO,
            dataSalvo: new Date().toLocaleDateString('pt-BR'),
            inputs,
            link: linkCalculo(inputs),
            resultados: { totalBruto: brl(ultimo.totalProventos), totalDescontos: brl(ultimo.totalDescontos), totalLiquido: brl(ultimo.liquido) }
        }, ...lerCalculos()]);
        renderSalvos();
        const toast = $('save-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    });

    // --- Cálculo salvo: calculo-rescisao.html?motivo=…&admissao=… abre já calculado ---
    let abrindoSalvo = false;
    const params = new URLSearchParams(location.search);
    if (params.get('admissao') && params.get('dispensa')) {
        if (MOTIVOS[params.get('motivo')]) motivoSel.value = params.get('motivo');
        atualizarAvisos();
        Object.entries(CHAVES).forEach(([k, id]) => {
            if (k === 'motivo' || !params.has(k)) return;
            const el = $(id);
            if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === params.get(k))) return;
            el.value = params.get(k);
        });
        atualizarDataAviso();
        atualizarTempo();
        abrindoSalvo = true;
        form.requestSubmit();
        abrindoSalvo = false;
    }

    // ------------------------------------------------------------------
    // Notas Cenofisco: "Ver mais" / "Ver menos"
    // ------------------------------------------------------------------
    const notas = $('notas-conteudo');
    const notasBtn = $('notas-toggle');
    const RECOLHIDO = ['max-h-64', 'mask-[linear-gradient(to_bottom,black_55%,transparent)]'];
    notasBtn.addEventListener('click', function () {
        const abrir = notasBtn.getAttribute('aria-expanded') !== 'true';
        RECOLHIDO.forEach(c => notas.classList.toggle(c, !abrir));
        notasBtn.setAttribute('aria-expanded', String(abrir));
        notasBtn.querySelector('span').textContent = abrir ? 'Ver menos' : 'Ver mais';
        notasBtn.querySelector('i').classList.toggle('rotate-180', abrir);
        if (!abrir) notas.parentElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
});
