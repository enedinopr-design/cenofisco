document.addEventListener('DOMContentLoaded', function() {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function() {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- Saved Calculations Sidebar Logic ---
    const savedCalculationsList = document.getElementById('saved-calculations-list');

    function saveCalculation(item) {
        let saved = JSON.parse(localStorage.getItem('savedCalculations')) || [];
        saved = saved.filter(i => i.title !== item.title);
        saved.unshift(item);
        if (saved.length > 5) {
            saved.pop();
        }
        localStorage.setItem('savedCalculations', JSON.stringify(saved));
    }

    function renderSavedCalculations() {
        const saved = JSON.parse(localStorage.getItem('savedCalculations')) || [];
        savedCalculationsList.innerHTML = '';

        if (saved.length === 0) {
            savedCalculationsList.innerHTML = '<li class="text-gray-500 italic text-xs p-2">Nenhum cálculo salvo recentemente.</li>';
            return;
        }

        saved.forEach(item => {
            const li = document.createElement('li');
            li.className = 'border-b border-gray-100 last:border-b-0';
            li.innerHTML = `
                <a href="${item.link}" class="block p-2 rounded-md hover:bg-blue-50 group">
                    <p class="font-medium text-gray-700 group-hover:text-blue-700 truncate" title="${item.title}">${item.title}</p>
                </a>
            `;
            savedCalculationsList.appendChild(li);
        });
    }
    renderSavedCalculations(); // Initial render

    // --- Férias Calculation Form Logic ---
    const calculoFeriasForm = document.getElementById('calculo-ferias-form');
    const resultadosGeral = document.getElementById('resultados-geral');
    const imprimirBtn = document.getElementById('imprimir-btn');
    const salvarBtn = document.getElementById('salvar-calculo-btn');
    const limparBtn = document.getElementById('limpar-btn');

    function showError(inputId, message) {
        const input = document.getElementById(inputId);
        const errorSpan = document.getElementById(`${inputId}-error`);
        input.classList.add('border-red-500');
        input.classList.remove('border-gray-300');
        errorSpan.textContent = message;
        errorSpan.classList.remove('hidden');
    }

    function clearError(inputId) {
        const input = document.getElementById(inputId);
        const errorSpan = document.getElementById(`${inputId}-error`);
        input.classList.remove('border-red-500');
        input.classList.add('border-gray-300');
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

            let calculosSalvos = JSON.parse(localStorage.getItem('meusCalculos')) || [];
            calculosSalvos.unshift(calculo);
            localStorage.setItem('meusCalculos', JSON.stringify(calculosSalvos));

            const toast = document.getElementById('save-toast');
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        });
    }
});