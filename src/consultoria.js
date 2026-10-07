// Compra de créditos de Consultoria Cenofisco (simulação, sem backend)
// Pacotes e valores conforme https://checkout.cenofisco.com.br/Consultoria.
// Pacote pré-selecionado pelo endereço: consultoria.html?pacote=36
// Cartão: até 5x sem juros. Boleto: à vista.
// Máscaras, validações, CEP e PF/PJ: checkout-base.js. Saldo e histórico: creditos.js.
document.addEventListener('DOMContentLoaded', function () {
    const $ = id => document.getElementById(id);
    const form = $('checkout-form');
    if (!form || !window.CFCheckout || !window.CFCreditos) return;
    const { brl, num, prepararFormulario, validarDados } = window.CFCheckout;

    // ------------------------------------------------------------------
    // Dados
    // creditos = créditos do pacote; recebe = créditos entregues (com bônus); bonusPct = bônus anunciado;
    // boletim = meses grátis do Boletim Fiscal e Tributário
    // ------------------------------------------------------------------
    const pacotes = [
        { id: '4', creditos: 4, recebe: 4, bonusPct: 0, valor: 100, boletim: 0 },
        { id: '20', creditos: 20, recebe: 24, bonusPct: 20, valor: 500, boletim: 1 },
        { id: '36', creditos: 36, recebe: 48, bonusPct: 30, valor: 900, boletim: 2 },
        { id: '72', creditos: 72, recebe: 108, bonusPct: 50, valor: 1800, boletim: 3 },
        { id: '96', creditos: 96, recebe: 192, bonusPct: 100, valor: 2400, boletim: 4 }
    ];
    const MAX_PARCELAS = 5;

    const consultas = [
        { tipo: 'Telefone', icone: 'fa-phone', creditos: 4 },
        { tipo: 'Escrita em até 72h', icone: 'fa-pen-to-square', creditos: 4 },
        { tipo: 'Escrita em até 48h', icone: 'fa-pen-to-square', creditos: 8 },
        { tipo: 'Escrita em até 24h', icone: 'fa-pen-to-square', creditos: 12 },
        { tipo: 'Escrita em até 12h', icone: 'fa-pen-to-square', creditos: 24 },
        { tipo: 'Videoconferência', icone: 'fa-video', creditos: 48 },
        { tipo: 'Presencial (1 hora)', icone: 'fa-location-dot', creditos: 96 }
    ];

    // Parcela sem juros, truncada no centavo (como na página de referência: 3x de R$ 166,66)
    const valorParcela = (valor, n) => Math.floor((valor * 100) / n) / 100;
    const porCredito = p => p.valor / p.recebe;
    const melhorCusto = pacotes.reduce((a, b) => (porCredito(b) < porCredito(a) ? b : a));
    const mesesBoletim = n => (n === 1 ? '1 mês grátis' : `${n} meses grátis`);

    // ------------------------------------------------------------------
    // Pacotes
    // ------------------------------------------------------------------
    $('pacotes').innerHTML = pacotes.map(p => `
        <label class="block h-full">
            <input type="radio" name="pacote" value="${p.id}" class="peer sr-only">
            <span class="relative flex h-full cursor-pointer flex-col rounded-xl border-2 border-slate-200 p-4 transition hover:border-slate-300 peer-checked:border-blue-900 peer-checked:bg-blue-50/50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2">
                <span class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-sm font-semibold text-slate-600">Pacote ${p.creditos}</span>
                    ${p.bonusPct ? `<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">+${p.bonusPct}% de bônus</span>` : ''}
                </span>
                <span class="mt-2 flex items-baseline gap-1.5"><span class="text-3xl font-bold text-slate-900">${num(p.recebe)}</span><span class="text-sm font-medium text-slate-600">créditos</span></span>
                <span class="text-xs text-slate-500">${p.recebe > p.creditos ? `${p.creditos} + ${p.recebe - p.creditos} de bônus` : 'sem bônus'}</span>
                <span class="mt-3 text-xl font-bold text-slate-900">${brl(p.valor)}</span>
                <span class="text-xs text-slate-500">até ${MAX_PARCELAS}x de ${brl(valorParcela(p.valor, MAX_PARCELAS))} · ${brl(porCredito(p))} por crédito</span>
                <span class="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <span class="flex items-center gap-2"><i class="fa-solid fa-headset w-3.5 text-blue-700" aria-hidden="true"></i>Telefone, escrita, vídeo e presencial</span>
                    ${p.boletim
                        ? `<span class="flex items-center gap-2"><i class="fa-solid fa-gift w-3.5 text-emerald-600" aria-hidden="true"></i>Boletim Fiscal e Tributário: ${mesesBoletim(p.boletim)}</span>`
                        : '<span class="flex items-center gap-2 text-slate-500"><i class="fa-solid fa-minus w-3.5" aria-hidden="true"></i>Sem acesso ao Boletim</span>'}
                </span>
                ${p === melhorCusto ? '<span class="absolute -top-2.5 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold tracking-wide text-blue-950 uppercase">Menor custo por crédito</span>' : ''}
            </span>
        </label>`).join('');

    const pacoteUrl = new URLSearchParams(location.search).get('pacote');
    form.elements.pacote.value = (pacotes.find(p => p.id === pacoteUrl) || pacotes[1]).id;

    const pacoteAtual = () => pacotes.find(p => p.id === form.elements.pacote.value) || pacotes[1];
    const pagamentoAtual = () => form.elements.pagamento.value;

    prepararFormulario(form);

    // Saldo atual do usuário (creditos.js)
    function mostrarSaldo() {
        const { saldo } = window.CFCreditos.ler();
        $('saldo-atual-valor').textContent = num(saldo);
        $('saldo-atual').classList.remove('hidden');
        $('saldo-atual').classList.add('inline-flex');
    }

    // ------------------------------------------------------------------
    // Quanto rende o pacote
    // ------------------------------------------------------------------
    function atualizarRendimento() {
        const p = pacoteAtual();
        $('rende-creditos').textContent = num(p.recebe);
        $('tabela-consultas').innerHTML = consultas.map(c => {
            const qtd = Math.floor(p.recebe / c.creditos);
            return `<tr>
                <th scope="row" class="py-2 pr-2 text-left font-normal text-slate-700 sm:pr-3"><i class="fa-solid ${c.icone} mr-1.5 hidden w-4 text-center text-xs text-slate-400 sm:inline-block" aria-hidden="true"></i>${c.tipo}</th>
                <td class="py-2 pr-2 text-right whitespace-nowrap text-slate-500 tabular-nums sm:pr-3">${c.creditos} créditos</td>
                <td class="py-2 text-right font-semibold whitespace-nowrap tabular-nums ${qtd ? 'text-slate-900' : 'text-slate-500'}">${qtd ? `${qtd} ${qtd === 1 ? 'consulta' : 'consultas'}` : '—'}</td>
            </tr>`;
        }).join('');
    }

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
        const p = pacoteAtual();
        const select = $('parcelas');
        const anterior = select.value;
        const opcoes = pagamentoAtual() === 'boleto' ? [1] : Array.from({ length: MAX_PARCELAS }, (_, i) => MAX_PARCELAS - i);
        select.innerHTML = '';
        opcoes.forEach(n => {
            const texto = n === 1 ? `À vista: ${brl(p.valor)}` : `${n}x de ${brl(valorParcela(p.valor, n))} sem juros`;
            select.add(new Option(texto, n));
        });
        select.value = opcoes.includes(Number(anterior)) ? anterior : '1'; // padrão: à vista
        atualizarResumo();
    }

    // ------------------------------------------------------------------
    // Resumo
    // ------------------------------------------------------------------
    function atualizarResumo() {
        const p = pacoteAtual();
        const n = Number($('parcelas').value) || 1;
        const bonus = p.recebe - p.creditos;
        $('resumo-pacote').textContent = p.creditos;
        $('resumo-base').textContent = num(p.creditos);
        $('resumo-bonus-pct').textContent = p.bonusPct;
        $('resumo-bonus').textContent = `+${num(bonus)}`;
        $('resumo-linha-bonus').classList.toggle('hidden', !bonus);
        $('resumo-total-creditos').textContent = num(p.recebe);
        $('resumo-por-credito').textContent = brl(porCredito(p));
        $('resumo-boletim').classList.toggle('hidden', !p.boletim);
        $('resumo-boletim-texto').textContent = p.boletim ? `+ ${mesesBoletim(p.boletim)} do Boletim` : '';
        $('resumo-total').textContent = brl(p.valor);
        $('resumo-parcelas').textContent = n === 1 ? 'à vista' : `${n}x de ${brl(valorParcela(p.valor, n))} sem juros`;
        atualizarRendimento();

        const url = new URL(location.href);
        url.searchParams.set('pacote', p.id);
        history.replaceState(null, '', url);
    }

    form.addEventListener('change', e => {
        if (e.target.name === 'pacote') preencherParcelas();
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
            const p = pacoteAtual();
            const n = Number($('parcelas').value) || 1;
            const boleto = pagamentoAtual() === 'boleto';
            const email = $('email').value.trim();
            const { saldo } = window.CFCreditos.registrarCompra({
                pacote: p.id, creditos: p.recebe, valor: p.valor, parcelas: n, pagamento: pagamentoAtual()
            });
            const extraBoletim = p.boletim ? ` Os dados de acesso ao Boletim Fiscal e Tributário (${mesesBoletim(p.boletim)}) chegam no mesmo e-mail.` : '';

            if (boleto) {
                $('titulo-confirmacao').textContent = 'Pedido recebido';
                $('texto-confirmacao').textContent = `O boleto de ${brl(p.valor)} foi enviado para ${email}. Os ${num(p.recebe)} créditos entram no seu saldo assim que o pagamento for confirmado.${extraBoletim}`;
                $('confirmacao-icone').className = 'mx-auto inline-flex size-16 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-600';
                $('confirmacao-icone').innerHTML = '<i class="fa-solid fa-barcode" aria-hidden="true"></i>';
            } else {
                $('titulo-confirmacao').textContent = 'Créditos adicionados';
                $('texto-confirmacao').textContent = `Pagamento aprovado: ${num(p.recebe)} créditos já estão no seu saldo. O comprovante e a nota fiscal chegam em ${email}.${extraBoletim}`;
                $('confirmacao-saldo-valor').textContent = num(saldo);
                $('confirmacao-saldo').classList.remove('hidden');
            }
            form.classList.add('hidden');
            const conf = $('confirmacao');
            conf.classList.remove('hidden');
            conf.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 900);
    });

    mostrarSaldo();
    atualizarPagamento();
});
