// Script para controlar a Busca Fiscal
document.addEventListener('DOMContentLoaded', function() {
    // Controlar os ícones de check nos botões principais
    const buscaFiscalRadios = document.querySelectorAll('input[name="busca_fiscal_tipo"]');
    const ncmTipoBuscaContainer = document.getElementById('ncm-tipo-busca-container');
    const pisCofinsContainer = document.getElementById('pis-cofins-tipo-venda-container');
    const icmsContainer = document.getElementById('icms-tipo-operacao-container');
    
    // Mostrar o container correto baseado na seleção inicial
    updateBuscaFiscalContainers();
    
    // Adicionar listener para mudanças de tipo de busca
    buscaFiscalRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateBuscaFiscalContainers();
            updateCheckIcons('busca_fiscal_tipo');
        });
    });
    
    // Controlar checkboxes de NCM (múltipla seleção)
    const ncmTipoBuscaCheckboxes = document.querySelectorAll('input[name="ncm_tipo_busca"]');
    const pisCofinsContainer2 = document.getElementById('pis-cofins-tipo-venda-container');
    const icmsContainer2 = document.getElementById('icms-tipo-operacao-container');
    
    ncmTipoBuscaCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateCheckIcons('ncm_tipo_busca');
            
            // Mostrar/ocultar containers baseado em seleções
            const pisCofinsChecked = document.querySelector('input[name="ncm_tipo_busca"][value="piscofins"]:checked');
            const icmsChecked = document.querySelector('input[name="ncm_tipo_busca"][value="icms"]:checked');
            
            if (pisCofinsChecked) {
                pisCofinsContainer2.classList.remove('hidden');
            } else {
                pisCofinsContainer2.classList.add('hidden');
            }
            
            if (icmsChecked) {
                icmsContainer2.classList.remove('hidden');
            } else {
                icmsContainer2.classList.add('hidden');
            }
        });
    });
    
    // Controlar PIS/COFINS - Tipo de Venda
    const pisCofinsRadios = document.querySelectorAll('input[name="pis_cofins_tipo_venda"]');
    const vendaInternaRegimeContainer = document.getElementById('venda-interna-regime-container');
    
    pisCofinsRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateCheckIcons('pis_cofins_tipo_venda');
            
            // Mostrar/ocultar regime de venda interna
            if (this.value === 'venda_interna') {
                vendaInternaRegimeContainer.classList.remove('hidden');
            } else {
                vendaInternaRegimeContainer.classList.add('hidden');
            }
        });
    });
    
    // Controlar regime de venda interna
    const vendaInternaRadios = document.querySelectorAll('input[name="venda_interna_regime"]');
    vendaInternaRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateCheckIcons('venda_interna_regime');
        });
    });
    
    // Controlar ICMS - Tipo de Operação
    const icmsOperacaoRadios = document.querySelectorAll('input[name="icms_tipo_operacao"]');
    const icmsEstadosContainer = document.getElementById('icms-estados-container');
    const estadoOrigemContainer = document.getElementById('estado-origem-container');
    
    icmsOperacaoRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateCheckIcons('icms_tipo_operacao');
            
            // Mostrar/ocultar seleção de estados
            if (this.value === 'interestadual') {
                // Interestadual: mostrar origem e destino
                icmsEstadosContainer.classList.remove('hidden');
                estadoOrigemContainer.classList.remove('hidden');
            } else if (this.value === 'interna') {
                // Interna: mostrar apenas destino (sem origem)
                icmsEstadosContainer.classList.remove('hidden');
                estadoOrigemContainer.classList.add('hidden');
            }
        });
    });
    
    // Função para atualizar visibilidade dos ícones
    function updateCheckIcons(fieldName) {
        const elements = document.querySelectorAll(`input[name="${fieldName}"]`);
        elements.forEach(element => {
            const span = element.nextElementSibling;
            const icon = span ? span.querySelector('i.fa-check') : null;
            
            if (icon) {
                if (element.checked) {
                    icon.classList.remove('opacity-0');
                    icon.classList.add('opacity-100');
                } else {
                    icon.classList.remove('opacity-100');
                    icon.classList.add('opacity-0');
                }
            }
        });
    }
    
    // Função para mostrar/ocultar containers baseado na seleção de tipo de busca
    function updateBuscaFiscalContainers() {
        const selectedType = document.querySelector('input[name="busca_fiscal_tipo"]:checked');
        
        // Ocultar todos os containers
        ncmTipoBuscaContainer.classList.add('hidden');
        pisCofinsContainer.classList.add('hidden');
        icmsContainer.classList.add('hidden');
        
        // Mostrar o container selecionado
        if (selectedType && selectedType.value === 'ncm') {
            ncmTipoBuscaContainer.classList.remove('hidden');
        }
    }
});
