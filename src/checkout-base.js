// Base compartilhada pelos checkouts (checkout.html: assinatura; consultoria.html: créditos de consultoria).
// Simulação, sem backend: nada é enviado ou guardado. O CEP preenche o endereço pela API pública ViaCEP.
// Os campos de cadastro e de cartão usam os mesmos ids nas duas páginas.
window.CFCheckout = (function () {
    const $ = id => document.getElementById(id);

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

    // ------------------------------------------------------------------
    // Preparação do formulário: selects de endereço, máscaras, bandeira,
    // PF/PJ, IE isento, estrangeiro, CEP e limpeza de erros ao digitar
    // ------------------------------------------------------------------
    function prepararFormulario(form) {
        const tipoSelect = $('logradouro-tipo');
        tipoSelect.add(new Option('Selecione', ''));
        tiposLogradouro.forEach(t => tipoSelect.add(new Option(t, t)));
        const ufSelect = $('uf');
        ufSelect.add(new Option('--', ''));
        ufs.forEach(u => ufSelect.add(new Option(u, u)));

        form.querySelectorAll('[data-mask]').forEach(input => {
            input.addEventListener('input', () => { input.value = mascaras[input.dataset.mask](input.value); });
        });
        $('cartao-numero').addEventListener('input', e => { $('cartao-bandeira').textContent = bandeira(e.target.value); });

        function atualizarPessoa() {
            const pj = form.elements.pessoa.value === 'pj';
            $('campos-pj').classList.toggle('hidden', !pj);
            $('campos-pj').classList.toggle('grid', pj);
            form.querySelectorAll('[data-pj-label]').forEach(el => {
                el.dataset.pfLabel = el.dataset.pfLabel || el.textContent;
                el.textContent = pj ? el.dataset.pjLabel : el.dataset.pfLabel;
            });
        }
        form.addEventListener('change', e => { if (e.target.name === 'pessoa') atualizarPessoa(); });
        $('ie-isento').addEventListener('change', e => {
            $('ie').disabled = e.target.checked;
            if (e.target.checked) $('ie').value = '';
        });
        $('estrangeiro').addEventListener('change', e => {
            $('grupo-cpf-titular').classList.toggle('hidden', e.target.checked);
        });

        // CEP (ViaCEP)
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

        form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid')) limparErro(e.target); });
        atualizarPessoa();
    }

    // Valida cadastro, endereço e (se for o caso) cartão; devolve os ids dos campos com erro, na ordem da tela
    function validarDados(form, { cartao }) {
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

        if (cartao) {
            checar('cartao-numero', cartaoValido(v('cartao-numero')), 'Número de cartão inválido.');
            checar('cartao-nome', v('cartao-nome').length >= 3, 'Informe o nome como está no cartão.');
            checar('cartao-validade', validadeValida(v('cartao-validade')), 'Validade inválida ou vencida.');
            checar('cartao-cvv', /^\d{3,4}$/.test(v('cartao-cvv')), 'CVV inválido.');
            if (!$('estrangeiro').checked) checar('cartao-cpf', cpfValido(v('cartao-cpf')), 'Informe um CPF válido.');
        }
        return erros;
    }

    return { brl, num, digitos, marcarErro, limparErro, prepararFormulario, validarDados };
})();
