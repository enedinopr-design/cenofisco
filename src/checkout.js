// Checkout do Boletim Fiscal e Tributário (simulação, sem backend)
// Planos e valores conforme https://checkout.cenofisco.com.br/Portal.
// Plano pré-selecionado pelo endereço: checkout.html?plano=basico
// Cartão: parcelamento da tabela do plano. Boleto: somente à vista.
// O CEP preenche o endereço pela API pública ViaCEP. Nenhum dado é enviado ou guardado:
// ao finalizar, a página só mostra a confirmação.
document.addEventListener('DOMContentLoaded', function () {
    const $ = id => document.getElementById(id);
    const form = $('checkout-form');
    if (!form) return;

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

    const tiposLogradouro = ['Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça', 'Rodovia', 'Estrada', 'Via', 'Vila', 'Viela', 'Viaduto',
        'Largo', 'Ladeira', 'Jardim', 'Quadra', 'Residencial', 'Condomínio', 'Conjunto', 'Loteamento', 'Setor', 'Núcleo', 'Parque',
        'Pátio', 'Passarela', 'Esplanada', 'Estação', 'Aeroporto', 'Trecho', 'Trevo', 'Vereda', 'Vale', 'Recanto', 'Sítio', 'Chácara',
        'Fazenda', 'Colônia', 'Campo', 'Distrito', 'Área', 'Morro', 'Favela', 'Lago', 'Lagoa', 'Feira', 'Outros'];
    const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

    const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const num = v => v.toLocaleString('pt-BR');
    const digitos = v => String(v || '').replace(/\D/g, '');

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

    // ------------------------------------------------------------------
    // Selects de endereço
    // ------------------------------------------------------------------
    const tipoSelect = $('logradouro-tipo');
    tipoSelect.add(new Option('Selecione', ''));
    tiposLogradouro.forEach(t => tipoSelect.add(new Option(t, t)));
    const ufSelect = $('uf');
    ufSelect.add(new Option('--', ''));
    ufs.forEach(u => ufSelect.add(new Option(u, u)));

    // ------------------------------------------------------------------
    // Máscaras
    // ------------------------------------------------------------------
    const mascaras = {
        cpf: v => digitos(v).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'),
        cnpj: v => digitos(v).slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'),
        cep: v => digitos(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'),
        telefone: v => {
            const d = digitos(v).slice(0, 11);
            if (d.length <= 2) return d ? `(${d}` : '';
            const meio = d.length === 11 ? 5 : 4;
            return `(${d.slice(0, 2)}) ${d.slice(2, 2 + meio)}${d.length > 2 + meio ? '-' + d.slice(2 + meio) : ''}`;
        },
        cartao: v => digitos(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '),
        validade: v => digitos(v).slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2'),
        cvv: v => digitos(v).slice(0, 4),
        digitos: v => digitos(v).slice(0, 15)
    };
    form.querySelectorAll('[data-mask]').forEach(input => {
        input.addEventListener('input', () => { input.value = mascaras[input.dataset.mask](input.value); });
    });

    // ------------------------------------------------------------------
    // Validações
    // ------------------------------------------------------------------
    function cpfValido(v) {
        const d = digitos(v);
        if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
        const dv = n => {
            let soma = 0;
            for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
            const r = (soma * 10) % 11;
            return r === 10 ? 0 : r;
        };
        return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
    }
    function cnpjValido(v) {
        const d = digitos(v);
        if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
        const dv = n => {
            const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            const soma = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0);
            const r = soma % 11;
            return r < 2 ? 0 : 11 - r;
        };
        return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
    }
    function cartaoValido(v) {
        const d = digitos(v);
        if (d.length < 13) return false;
        let soma = 0;
        for (let i = 0; i < d.length; i++) {
            let n = Number(d[d.length - 1 - i]);
            if (i % 2) { n *= 2; if (n > 9) n -= 9; }
            soma += n;
        }
        return soma % 10 === 0;
    }
    function validadeValida(v) {
        const m = /^(\d{2})\/(\d{2})$/.exec(v);
        if (!m || +m[1] < 1 || +m[1] > 12) return false;
        const fim = new Date(2000 + +m[2], +m[1], 1); // primeiro dia do mês seguinte
        return fim > new Date();
    }
    const emailValido = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    function bandeira(v) {
        const d = digitos(v);
        if (/^4/.test(d)) return 'Visa';
        if (/^(5[1-5]|2[2-7])/.test(d)) return 'Master';
        if (/^3[47]/.test(d)) return 'Amex';
        if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return 'Elo';
        if (/^(606282|3841)/.test(d)) return 'Hiper';
        return '';
    }
    $('cartao-numero').addEventListener('input', e => { $('cartao-bandeira').textContent = bandeira(e.target.value); });

    // ------------------------------------------------------------------
    // PF / PJ, cartão / boleto
    // ------------------------------------------------------------------
    function atualizarPessoa() {
        const pj = form.elements.pessoa.value === 'pj';
        $('campos-pj').classList.toggle('hidden', !pj);
        $('campos-pj').classList.toggle('grid', pj);
        form.querySelectorAll('[data-pj-label]').forEach(el => {
            el.dataset.pfLabel = el.dataset.pfLabel || el.textContent;
            el.textContent = pj ? el.dataset.pjLabel : el.dataset.pfLabel;
        });
    }
    $('ie-isento').addEventListener('change', e => {
        $('ie').disabled = e.target.checked;
        if (e.target.checked) $('ie').value = '';
    });
    $('estrangeiro').addEventListener('change', e => {
        $('grupo-cpf-titular').classList.toggle('hidden', e.target.checked);
    });

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
        if (e.target.name === 'pessoa') atualizarPessoa();
        if (e.target.name === 'pagamento') atualizarPagamento();
        if (e.target.name === 'parcelas') atualizarResumo();
    });

    // ------------------------------------------------------------------
    // CEP (ViaCEP)
    // ------------------------------------------------------------------
    const cepInput = $('cep');
    let ultimoCep = '';
    cepInput.addEventListener('input', async () => {
        const cep = digitos(cepInput.value);
        if (cep.length !== 8 || cep === ultimoCep) return;
        ultimoCep = cep;
        $('cep-loading').classList.remove('hidden');
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const dados = await resp.json();
            if (dados.erro) throw new Error('CEP não encontrado');
            const [primeira, ...resto] = (dados.logradouro || '').split(' ');
            if (tiposLogradouro.includes(primeira)) {
                tipoSelect.value = primeira;
                $('endereco').value = resto.join(' ');
            } else {
                $('endereco').value = dados.logradouro || '';
            }
            $('bairro').value = dados.bairro || '';
            $('cidade').value = dados.localidade || '';
            ufSelect.value = dados.uf || '';
            limparErro(cepInput);
            $(dados.logradouro ? 'numero' : 'endereco').focus();
        } catch (e) {
            marcarErro(cepInput, 'CEP não encontrado. Preencha o endereço manualmente.');
        } finally {
            $('cep-loading').classList.add('hidden');
        }
    });

    // ------------------------------------------------------------------
    // Erros por campo
    // ------------------------------------------------------------------
    function marcarErro(input, mensagem) {
        input.classList.add('border-red-500');
        input.setAttribute('aria-invalid', 'true');
        let msg = document.getElementById(`${input.id}-erro`);
        if (!msg) {
            msg = document.createElement('p');
            msg.id = `${input.id}-erro`;
            msg.className = 'mt-1 text-xs text-red-700';
            (input.closest('.relative') || input).insertAdjacentElement('afterend', msg);
            input.setAttribute('aria-describedby', msg.id);
        }
        msg.textContent = mensagem;
    }
    function limparErro(input) {
        input.classList.remove('border-red-500');
        input.removeAttribute('aria-invalid');
        document.getElementById(`${input.id}-erro`)?.remove();
        input.removeAttribute('aria-describedby');
    }
    form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid')) limparErro(e.target); });

    function validar() {
        form.querySelectorAll('[aria-invalid]').forEach(limparErro);
        const erros = [];
        const v = id => $(id).value.trim();
        const checar = (id, ok, mensagem) => { if (!ok) { marcarErro($(id), mensagem); erros.push(id); } };
        const pj = form.elements.pessoa.value === 'pj';

        if (pj) {
            checar('cnpj', cnpjValido(v('cnpj')), 'Informe um CNPJ válido.');
            checar('razao', v('razao'), 'Informe a razão social.');
            checar('simples', v('simples'), 'Selecione uma opção.');
            if (!$('ie-isento').checked) checar('ie', v('ie'), 'Informe a inscrição estadual ou marque "IE isento".');
        }
        checar('nome', v('nome').split(/\s+/).length >= 2, 'Informe o nome completo.');
        checar('cpf', cpfValido(v('cpf')), 'Informe um CPF válido.');
        checar('email', emailValido(v('email')), 'Informe um e-mail válido.');
        checar('celular', digitos(v('celular')).length === 11, 'Informe o celular com DDD.');
        if (v('telefone')) checar('telefone', digitos(v('telefone')).length >= 10, 'Telefone incompleto.');
        checar('cep', digitos(v('cep')).length === 8, 'Informe o CEP.');
        checar('logradouro-tipo', v('logradouro-tipo'), 'Selecione o tipo.');
        checar('endereco', v('endereco'), 'Informe o endereço.');
        checar('numero', v('numero'), 'Informe o número.');
        checar('bairro', v('bairro'), 'Informe o bairro.');
        checar('cidade', v('cidade'), 'Informe a cidade.');
        checar('uf', v('uf'), 'Selecione a UF.');
        if (v('cpf-vendedor')) checar('cpf-vendedor', cpfValido(v('cpf-vendedor')), 'CPF do vendedor inválido.');

        if (pagamentoAtual() === 'cartao') {
            checar('cartao-numero', cartaoValido(v('cartao-numero')), 'Número de cartão inválido.');
            checar('cartao-nome', v('cartao-nome').length >= 3, 'Informe o nome como está no cartão.');
            checar('cartao-validade', validadeValida(v('cartao-validade')), 'Validade inválida ou vencida.');
            checar('cartao-cvv', /^\d{3,4}$/.test(v('cartao-cvv')), 'CVV inválido.');
            if (!$('estrangeiro').checked) checar('cartao-cpf', cpfValido(v('cartao-cpf')), 'Informe um CPF válido.');
        }
        return erros;
    }

    // ------------------------------------------------------------------
    // Finalizar
    // ------------------------------------------------------------------
    const erroGeral = $('form-erro');
    form.addEventListener('submit', e => {
        e.preventDefault();
        erroGeral.classList.add('hidden');
        const erros = validar();
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

    atualizarPessoa();
    atualizarPagamento();
});
