// Cálculo de Férias (calculo-ferias.html).
// Cálculos salvos: chave meusCalculos (a mesma da página de Ferramentas). Cada item guarda os dados
// informados e um link (calculo-ferias.html?bruto=…) que reabre a página já calculada.
document.addEventListener('DOMContentLoaded', function() {
    // --- Menu mobile ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function() {
            const hidden = mainMenu.classList.toggle('hidden');
            menuToggle.setAttribute('aria-expanded', String(!hidden));
        });
    }

    // --- Cálculos salvos (lateral) ---
    const savedCalculationsList = document.getElementById('saved-calculations-list');
    const TIPO = 'Cálculo de Férias';
    const escapeHTML = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lerCalculos = () => { try { const l = JSON.parse(localStorage.getItem('meusCalculos')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    const gravarCalculos = l => { try { localStorage.setItem('meusCalculos', JSON.stringify(l)); } catch (e) { /* sem armazenamento */ } };
    const linkCalculo = i => 'calculo-ferias.html?' + new URLSearchParams({ bruto: i.salarioBruto || '', extra: i.horasExtras || '', dias: i.diasFerias || '', dependentes: i.dependentes || '', abono: i.temAbono || 'Sim', decimo: i.adianta13 || 'Sim' }).toString();

    function renderSavedCalculations() {
        if (!savedCalculationsList) return;
        const saved = lerCalculos().filter(c => c.tipo === TIPO);
        if (!saved.length) {
            savedCalculationsList.innerHTML = '<li class="px-1 text-xs text-slate-500">Nenhum cálculo salvo. Use <strong>Salvar cálculo</strong> no resultado.</li>';
            return;
        }
        savedCalculationsList.innerHTML = saved.slice(0, 8).map(c => `
            <li class="group flex items-start gap-1 rounded-lg hover:bg-blue-50">
                <a href="${escapeHTML(c.link || linkCalculo(c.inputs || {}))}" class="min-w-0 flex-1 px-2 py-1.5">
                    <span class="block truncate text-slate-700 group-hover:text-blue-800">Salário R$ ${escapeHTML(c.inputs?.salarioBruto || '—')} · ${escapeHTML(c.inputs?.diasFerias || '—')} dias</span>
                    <span class="block text-[11px] text-slate-400">${escapeHTML([c.dataSalvo, c.resultados?.totalLiquido ? `Líquido ${c.resultados.totalLiquido}` : ''].filter(Boolean).join(' · '))}</span>
                </a>
                <button type="button" class="remove-calc mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(c.id)}" aria-label="Remover cálculo de ${escapeHTML(c.dataSalvo || '')}" title="Remover"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </li>`).join('');
    }
    savedCalculationsList?.addEventListener('click', e => {
        const b = e.target.closest('.remove-calc');
        if (!b) return;
        gravarCalculos(lerCalculos().filter(c => c.id !== b.dataset.id));
        renderSavedCalculations();
    });
    renderSavedCalculations();

    // --- Férias Calculation Form Logic ---
    const calculoFeriasForm = document.getElementById('calculo-ferias-form');
    const resultadosGeral = document.getElementById('resultados-geral');
    const imprimirBtn = document.getElementById('imprimir-btn');
    const salvarBtn = document.getElementById('salvar-calculo-btn');
    const limparBtn = document.getElementById('limpar-btn');

    function showError(inputId, message) {
        const input = document.getElementById(inputId);
        const errorSpan = document.getElementById(`${inputId}-error`);
        input.classList.add('border-red-500', 'ring-2', 'ring-red-100');
        input.setAttribute('aria-invalid', 'true');
        errorSpan.textContent = message;
        errorSpan.classList.remove('hidden');
    }

    function clearError(inputId) {
        const input = document.getElementById(inputId);
        const errorSpan = document.getElementById(`${inputId}-error`);
        input.classList.remove('border-red-500', 'ring-2', 'ring-red-100');
        input.removeAttribute('aria-invalid');
        errorSpan.textContent = '';
        errorSpan.classList.add('hidden');
    }

    function clearAllErrors() {
        ['bruto', 'extra', 'dias', 'dependentes'].forEach(clearError);
    }

    function parseCurrency(value) {
        if (!value) return 0;
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    }

    function formatCurrency(value) {
        if (isNaN(value)) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function validateForm() {
        clearAllErrors();
        let isValid = true;

        const brutoInput = document.getElementById('bruto');
        const diasInput = document.getElementById('dias');
        const extraInput = document.getElementById('extra');
        const dependentesInput = document.getElementById('dependentes');

        const brutoValue = parseCurrency(brutoInput.value);
        if (brutoInput.value.trim() === '' || brutoValue <= 0) {
            showError('bruto', 'O salário bruto é obrigatório.');
            isValid = false;
        }

        const diasValue = parseInt(diasInput.value, 10);
        if (diasInput.value.trim() === '') {
            showError('dias', 'O número de dias é obrigatório.');
            isValid = false;
        } else if (isNaN(diasValue) || diasValue < 1 || diasValue > 30) {
            showError('dias', 'Informe um valor entre 1 e 30.');
            isValid = false;
        }

        if (extraInput.value && isNaN(parseCurrency(extraInput.value))) {
            showError('extra', 'Valor inválido.');
            isValid = false;
        }

        if (dependentesInput.value && (isNaN(parseInt(dependentesInput.value, 10)) || parseInt(dependentesInput.value, 10) < 0)) {
            showError('dependentes', 'Valor inválido.');
            isValid = false;
        }

        return isValid;
    }

    if (calculoFeriasForm) {
        calculoFeriasForm.addEventListener('submit', function(event) {
            event.preventDefault();

            if (!validateForm()) {
                if (resultadosGeral) resultadosGeral.classList.add('hidden');
                if (imprimirBtn) imprimirBtn.classList.add('hidden');
                if (salvarBtn) salvarBtn.classList.add('hidden');
                calculoFeriasForm.querySelector('[aria-invalid="true"]')?.focus();
                return;
            }

            const salarioBruto = parseCurrency(document.getElementById('bruto').value);
            const horasExtras = parseCurrency(document.getElementById('extra').value);
            const diasFerias = parseInt(document.getElementById('dias').value, 10);
            const numDependentes = parseInt(document.getElementById('dependentes').value, 10) || 0;
            const temAbono = document.getElementById('abono').value === 'Sim';
            const adianta13 = document.getElementById('decimo').value === 'Sim';

            const baseCalculoFerias = salarioBruto + horasExtras;
            const valorDia = baseCalculoFerias / 30;

            let diasAbono = 0;
            let diasGozo = diasFerias;

            if (temAbono) {
                diasAbono = Math.floor(diasFerias / 3);
                diasGozo = diasFerias - diasAbono;
            }

            const valorFeriasGozo = diasGozo * valorDia;
            const tercoFeriasGozo = valorFeriasGozo / 3;

            const valorAbono = diasAbono * valorDia;
            const tercoAbono = valorAbono / 3;

            const adiantamento13 = adianta13 ? (salarioBruto / 2) : 0;

            const remuneracaoTotal = valorFeriasGozo + tercoFeriasGozo + valorAbono + tercoAbono + adiantamento13;
            const totalBruto = valorFeriasGozo + tercoFeriasGozo + valorAbono + tercoAbono + adiantamento13;

            // Cálculo INSS (Exemplo - Tabela INSS 2024)
            const baseINSS = valorFeriasGozo + tercoFeriasGozo;
            let descontoINSS = 0;
            if (baseINSS <= 1412.00) descontoINSS = baseINSS * 0.075;
            else if (baseINSS <= 2666.68) descontoINSS = (baseINSS * 0.09) - 21.18;
            else if (baseINSS <= 4000.03) descontoINSS = (baseINSS * 0.12) - 101.18;
            else if (baseINSS <= 7786.02) descontoINSS = (baseINSS * 0.14) - 181.18;
            else descontoINSS = 908.85; // Teto

            // Cálculo IRRF
            const deducaoDependente = numDependentes * 189.59;

            // 1. IRRF com Deduções Legais (Exemplo - Tabela IRRF 2024)
            const baseIRRFLegal = Math.max(0, baseINSS - descontoINSS - deducaoDependente);
            let aliquotaIRRFLegal = 0;
            let parcelaDeduzirIRRFLegal = 0;
            if (baseIRRFLegal > 2259.20 && baseIRRFLegal <= 2826.65) { aliquotaIRRFLegal = 0.075; parcelaDeduzirIRRFLegal = 169.44; }
            else if (baseIRRFLegal > 2826.65 && baseIRRFLegal <= 3751.05) { aliquotaIRRFLegal = 0.15; parcelaDeduzirIRRFLegal = 381.44; }
            else if (baseIRRFLegal > 3751.05 && baseIRRFLegal <= 4664.68) { aliquotaIRRFLegal = 0.225; parcelaDeduzirIRRFLegal = 662.77; }
            else if (baseIRRFLegal > 4664.68) { aliquotaIRRFLegal = 0.275; parcelaDeduzirIRRFLegal = 896.00; }
            const valorIRRFLegal = (baseIRRFLegal * aliquotaIRRFLegal) - parcelaDeduzirIRRFLegal;
            const descontoIRRFLegal = Math.max(0, valorIRRFLegal);

            // 2. IRRF com Desconto Simplificado (Exemplo: 25% da base INSS, limitado a R$564,80)
            const descontoSimplificado = Math.min(baseINSS * 0.25, 564.80);
            const baseIRRFSimplificado = Math.max(0, baseINSS - descontoSimplificado);
            let aliquotaIRRFSimplificado = 0;
            let parcelaDeduzirIRRFSimplificado = 0;
            if (baseIRRFSimplificado > 2259.20 && baseIRRFSimplificado <= 2826.65) { aliquotaIRRFSimplificado = 0.075; parcelaDeduzirIRRFSimplificado = 169.44; }
            else if (baseIRRFSimplificado > 2826.65 && baseIRRFSimplificado <= 3751.05) { aliquotaIRRFSimplificado = 0.15; parcelaDeduzirIRRFSimplificado = 381.44; }
            else if (baseIRRFSimplificado > 3751.05 && baseIRRFSimplificado <= 4664.68) { aliquotaIRRFSimplificado = 0.225; parcelaDeduzirIRRFSimplificado = 662.77; }
            else if (baseIRRFSimplificado > 4664.68) { aliquotaIRRFSimplificado = 0.275; parcelaDeduzirIRRFSimplificado = 896.00; }
            const valorIRRFSimplificado = (baseIRRFSimplificado * aliquotaIRRFSimplificado) - parcelaDeduzirIRRFSimplificado;
            const descontoIRRFSimplificado = Math.max(0, valorIRRFSimplificado);

            // Escolher o IRRF mais vantajoso (menor desconto)
            const descontoIRRFFinal = Math.min(descontoIRRFLegal, descontoIRRFSimplificado);

            const totalLiquido = totalBruto - descontoINSS - descontoIRRFFinal;

            // --- PREENCHIMENTO DOS RESULTADOS ---
            document.getElementById('remuneracaoferias').textContent = formatCurrency(remuneracaoTotal);
            document.getElementById('valorferias').textContent = formatCurrency(valorFeriasGozo);
            document.getElementById('abonopecuniario').textContent = formatCurrency(valorAbono);
            document.getElementById('tercoferias').textContent = formatCurrency(tercoFeriasGozo);
            document.getElementById('tercoabono').textContent = formatCurrency(tercoAbono);
            document.getElementById('salario13adiantamento').textContent = formatCurrency(adiantamento13);
            document.getElementById('totalbruto').textContent = formatCurrency(totalBruto);

            document.getElementById('basecalculoinss').textContent = formatCurrency(baseINSS);
            document.getElementById('valordescontoinss').textContent = formatCurrency(descontoINSS);

            // IRRF Legal
            document.getElementById('remuneracao-irrf-legal').textContent = formatCurrency(baseINSS);
            document.getElementById('deducoes-irrf-legal').textContent = formatCurrency(descontoINSS);
            document.getElementById('dependentes-irrf-legal').textContent = formatCurrency(deducaoDependente);
            document.getElementById('base-calculo-irrf-legal').textContent = formatCurrency(baseIRRFLegal);
            document.getElementById('aliquota-irrf-legal').textContent = `${(aliquotaIRRFLegal * 100).toFixed(2)}%`;
            document.getElementById('valor-irrf-legal').textContent = formatCurrency(baseIRRFLegal * aliquotaIRRFLegal);
            document.getElementById('parcela-deduzir-irrf-legal').textContent = formatCurrency(parcelaDeduzirIRRFLegal);
            document.getElementById('valor-final-irrf-legal').textContent = formatCurrency(descontoIRRFLegal);

            // IRRF Simplificado
            document.getElementById('remuneracao-irrf-simplificado').textContent = formatCurrency(baseINSS);
            document.getElementById('desconto-simplificado-irrf').textContent = formatCurrency(descontoSimplificado);
            document.getElementById('base-calculo-irrf-simplificado').textContent = formatCurrency(baseIRRFSimplificado);
            document.getElementById('aliquota-irrf-simplificado').textContent = `${(aliquotaIRRFSimplificado * 100).toFixed(2)}%`;
            document.getElementById('valor-irrf-simplificado').textContent = formatCurrency(baseIRRFSimplificado * aliquotaIRRFSimplificado);
            document.getElementById('parcela-deduzir-irrf-simplificado').textContent = formatCurrency(parcelaDeduzirIRRFSimplificado);
            document.getElementById('valor-final-irrf-simplificado').textContent = formatCurrency(descontoIRRFSimplificado);

            // Resumo Final
            document.getElementById('resumo-total-bruto').textContent = formatCurrency(totalBruto);
            document.getElementById('resumo-inss').textContent = formatCurrency(descontoINSS);
            document.getElementById('resumo-irrf').textContent = formatCurrency(descontoIRRFFinal);
            document.getElementById('resumo-total-liquido').textContent = formatCurrency(totalLiquido);

            // Exibe a seção de resultados e os botões
            if (resultadosGeral) resultadosGeral.classList.remove('hidden');
            if (salvarBtn) salvarBtn.classList.remove('hidden');
            if (imprimirBtn) imprimirBtn.classList.remove('hidden');
            // Leva o usuário ao resultado (sem rolar quando a página abre já calculada)
            if (!abrindoSalvo && resultadosGeral) {
                resultadosGeral.scrollIntoView({ behavior: 'smooth', block: 'start' });
                resultadosGeral.focus({ preventScroll: true });
            }
        });
    }

    if (limparBtn) {
        limparBtn.addEventListener('click', function() {
            clearAllErrors();
            if (calculoFeriasForm) calculoFeriasForm.reset();
            if (resultadosGeral) resultadosGeral.classList.add('hidden');
            if (salvarBtn) salvarBtn.classList.add('hidden');
            if (imprimirBtn) imprimirBtn.classList.add('hidden');
        });
    }

    if (imprimirBtn) {
        imprimirBtn.addEventListener('click', function() {
            window.print();
        });
    }

    if (salvarBtn) {
        salvarBtn.addEventListener('click', function() {
            const calculo = {
                id: `ferias-${Date.now()}`,
                tipo: 'Cálculo de Férias',
                dataSalvo: new Date().toLocaleDateString('pt-BR'),
                inputs: {
                    salarioBruto: document.getElementById('bruto').value,
                    horasExtras: document.getElementById('extra').value,
                    diasFerias: document.getElementById('dias').value,
                    dependentes: document.getElementById('dependentes').value,
                    temAbono: document.getElementById('abono').value,
                    adianta13: document.getElementById('decimo').value,
                },
                resultados: {
                    totalBruto: document.getElementById('totalbruto').textContent,
                    descontoINSS: document.getElementById('valordescontoinss').textContent,
                    descontoIRRF: document.getElementById('resumo-irrf').textContent,
                    totalLiquido: document.getElementById('resumo-total-liquido').textContent,
                }
            };

            calculo.link = linkCalculo(calculo.inputs);
            gravarCalculos([calculo, ...lerCalculos()]);
            renderSavedCalculations();

            const toast = document.getElementById('save-toast');
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 4000);
        });
    }

    // --- Cálculo salvo: calculo-ferias.html?bruto=…&dias=… abre já calculado ---
    var abrindoSalvo = false;
    const params = new URLSearchParams(location.search);
    if (params.get('bruto') && calculoFeriasForm) {
        ['bruto', 'extra', 'dias', 'dependentes'].forEach(id => { document.getElementById(id).value = params.get(id) || ''; });
        ['abono', 'decimo'].forEach(id => { if (['Sim', 'Não'].includes(params.get(id))) document.getElementById(id).value = params.get(id); });
        abrindoSalvo = true;
        calculoFeriasForm.requestSubmit();
        abrindoSalvo = false;
    }
});
