// Checkout do Boletim Fiscal e Tributário (simulação, sem backend)
// Planos e valores conforme https://checkout.cenofisco.com.br/Portal.
// Plano pré-selecionado pelo endereço: checkout.html?plano=basico
// Cartão: parcelamento da tabela do plano. Boleto: somente à vista.
// Máscaras, validações, CEP e PF/PJ ficam em checkout-base.js (compartilhado com consultoria.html).
// Nenhum dado é enviado ou guardado: ao finalizar, a página só mostra a confirmação.
document.addEventListener('DOMContentLoaded', function () {
    const $ = id => document.getElementById(id);
    const form = $('checkout-form');
    if (!form || !window.CFCheckout) return;
    const { brl, num, prepararFormulario, validarDados } = window.CFCheckout;

    // ------------------------------------------------------------------
    // Dados
    // ------------------------------------------------------------------
    const planos = [
        { id: 'individual', nome: 'Individual', codigo: '270010', acessos: '1 usuário', creditos: 40, monitor: 100, trial: true,
          parcelas: { 12: 296, 10: 351, 7: 497, 5: 688, 3: 1136, 1: 3374 } },
        { id: 'basico', nome: 'Básico', codigo: '270009', acessos: '2 acessos simultâneos', creditos: 120, monitor: 500,
          parcelas: { 12: 432, 10: 510, 7: 720, 5: 995, 3: 1642, 1: 4871 } },
        { id: 'economico', nome: 'Econômico', codigo: '270008', acessos: '3 acessos simultâneos', creditos: 240, monitor: 1000,
          parcelas: { 12: 604, 10: 712, 7: 1008, 5: 1394, 3: 2296, 1: 6820 } },
        { id: 'standard', nome: 'Standard', codigo: '270012', acessos: '4 acessos simultâneos', creditos: 360, monitor: 2000,
          parcelas: { 12: 778, 10: 914, 7: 1292, 5: 1791, 3: 2953, 1: 8767 } },
        { id: 'profissional', nome: 'Profissional', codigo: '270013', acessos: '6 acessos simultâneos', creditos: 480, monitor: 3000,
          parcelas: { 12: 909, 10: 1068, 7: 1509, 5: 2092, 3: 3451, 1: 10246 } }
    ];

    // ------------------------------------------------------------------
    // Planos
    // ------------------------------------------------------------------
    const planosEl = $('planos');
    planosEl.innerHTML = planos.map(p => `
        <label class="block h-full">
            <input type="radio" name="plano" value="${p.id}" class="peer sr-only">
            <span class="flex h-full cursor-pointer flex-col rounded-xl border-2 border-slate-200 p-4 transition hover:border-slate-300 peer-checked:border-blue-900 peer-checked:bg-blue-50/50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2">
                <span class="flex items-start justify-between gap-2">
                    <span class="font-bold text-slate-900 uppercase">${p.nome}</span>
                    ${p.trial ? '<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">7 dias grátis</span>' : ''}
                </span>
                <span class="mt-1 text-sm text-slate-600">${p.acessos}</span>
                <span class="mt-3 text-2xl font-bold text-slate-900">12x ${brl(p.parcelas[12])}</span>
                <span class="text-xs text-slate-500">ou ${brl(p.parcelas[1])} à vista</span>
                <span class="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <span class="flex items-center gap-2"><i class="fa-solid fa-coins w-3.5 text-amber-500" aria-hidden="true"></i>${p.creditos} créditos de consultoria</span>
                    <span class="flex items-center gap-2"><i class="fa-solid fa-chart-line w-3.5 text-blue-700" aria-hidden="true"></i>Monitor ST: ${num(p.monitor)} operações</span>
                    <span class="flex items-center gap-2"><i class="fa-solid fa-chart-line w-3.5 text-blue-700" aria-hidden="true"></i>Monitor PIS/COFINS: ${num(p.monitor)} operações</span>
                </span>
            </span>
        </label>`).join('');

    const planoUrl = new URLSearchParams(location.search).get('plano');
    const inicial = planos.find(p => p.id === planoUrl) || planos[0];
    form.elements.plano.value = inicial.id;

    const planoAtual = () => planos.find(p => p.id === form.elements.plano.value) || planos[0];
    const pagamentoAtual = () => form.elements.pagamento.value;

    prepararFormulario(form);

    // ------------------------------------------------------------------
    // Cartão / boleto e parcelas
    // ------------------------------------------------------------------
    function atualizarPagamento() {
        const boleto = pagamentoAtual() === 'boleto';
        $('campos-cartao').classList.toggle('hidden', boleto);
        $('info-boleto').classList.toggle('hidden', !boleto);
        preencherParcelas();
    }

    function preencherParcelas() {
        const p = planoAtual();
        const select = $('parcelas');
        const anterior = select.value;
        const opcoes = pagamentoAtual() === 'boleto' ? [1] : Object.keys(p.parcelas).map(Number).sort((a, b) => b - a);
        select.innerHTML = '';
        opcoes.forEach(n => {
            const valor = p.parcelas[n];
            const texto = n === 1 ? `À vista: ${brl(valor)}` : `${n}x de ${brl(valor)} (total ${brl(valor * n)})`;
            select.add(new Option(texto, n));
        });
        if (opcoes.includes(Number(anterior))) select.value = anterior;
        atualizarResumo();
    }

    // ------------------------------------------------------------------
    // Resumo
    // ------------------------------------------------------------------
    function atualizarResumo() {
        const p = planoAtual();
        const n = Number($('parcelas').value) || 1;
        const valor = p.parcelas[n];
        $('resumo-plano').textContent = p.nome;
        $('resumo-codigo').textContent = p.codigo;
        $('resumo-itens').innerHTML = [
            ['fa-users', p.acessos],
            ['fa-coins', `${p.creditos} créditos de consultoria`],
            ['fa-chart-line', `Monitor ST e PIS/COFINS: ${num(p.monitor)} operações cada`]
        ].map(([icone, texto]) => `<li class="flex items-center gap-2 py-1 text-sm text-slate-700"><i class="fa-solid ${icone} w-4 text-xs text-slate-400" aria-hidden="true"></i>${texto}</li>`).join('');
        $('resumo-total').textContent = brl(valor * n);
        $('resumo-parcelas').textContent = n === 1 ? 'à vista' : `${n}x de ${brl(valor)}`;
        $('resumo-trial').classList.toggle('hidden', !p.trial);
        $('btn-finalizar-texto').textContent = p.trial ? 'Começar 7 dias grátis' : 'Finalizar assinatura';

        const url = new URL(location.href);
        url.searchParams.set('plano', p.id);
        history.replaceState(null, '', url);
    }

    form.addEventListener('change', e => {
        if (e.target.name === 'plano') preencherParcelas();
        if (e.target.name === 'pagamento') atualizarPagamento();
        if (e.target.name === 'parcelas') atualizarResumo();
    });

    // ------------------------------------------------------------------
    // Finalizar
    // ------------------------------------------------------------------
    const erroGeral = $('form-erro');
    form.addEventListener('submit', e => {
        e.preventDefault();
        erroGeral.classList.add('hidden');
        const erros = validarDados(form, { cartao: pagamentoAtual() === 'cartao' });
        if (!$('aceite').checked) {
            erroGeral.textContent = 'Para continuar, aceite o Termo de adesão.';
            erroGeral.classList.remove('hidden');
            if (!erros.length) return;
        }
        if (erros.length) {
            erroGeral.textContent = `Revise ${erros.length === 1 ? 'o campo destacado' : `os ${erros.length} campos destacados`}.`;
            erroGeral.classList.remove('hidden');
            $(erros[0]).focus();
            return;
        }

        const btn = $('btn-finalizar');
        btn.disabled = true;
        btn.classList.add('opacity-70');
        $('btn-finalizar-texto').textContent = 'Processando...';

        // Simulação do envio
        setTimeout(() => {
            const p = planoAtual();
            const email = $('email').value.trim();
            let titulo, texto;
            if (pagamentoAtual() === 'boleto') {
                titulo = 'Pedido recebido';
                texto = `O boleto do plano ${p.nome} foi enviado para ${email}. O acesso é liberado após a confirmação do pagamento.`;
            } else if (p.trial) {
                titulo = 'Seus 7 dias grátis começaram';
                texto = `Em instantes você recebe em ${email} os dados de acesso ao Boletim Fiscal e Tributário.`;
            } else {
                titulo = 'Assinatura ativa';
                texto = `Pagamento do plano ${p.nome} enviado à operadora. Em instantes você recebe em ${email} os dados de acesso; a nota fiscal chega no mesmo e-mail.`;
            }
            $('titulo-confirmacao').textContent = titulo;
            $('texto-confirmacao').textContent = texto;
            form.classList.add('hidden');
            const conf = $('confirmacao');
            conf.classList.remove('hidden');
            conf.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 900);
    });

    // ------------------------------------------------------------------
    // Diálogo de créditos
    // ------------------------------------------------------------------
    const dialog = $('dialog-creditos');
    $('ver-creditos').addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', e => {
        if (e.target === dialog || e.target.closest('[data-fechar]')) dialog.close();
    });

    atualizarPagamento();
});
