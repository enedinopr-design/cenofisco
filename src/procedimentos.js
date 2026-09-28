document.addEventListener('DOMContentLoaded', function() {
    const procedimentosList = document.getElementById('procedimentos-list');
    const searchInput = document.getElementById('procedimento-search');
    const areaCheckboxes = document.querySelectorAll('input[name="area"]');
    const paginationContainer = document.getElementById('pagination-container');

    let allProcedimentos = [];
    let filteredProcedimentos = [];
    let currentPage = 1;
    const itemsPerPage = 5;

    // Fetch data
    fetch('./procedimentos.json')
        .then(response => response.json())
        .then(data => {
            allProcedimentos = data;
            applyFilters();
        })
        .catch(error => {
            console.error('Erro ao carregar procedimentos:', error);
            procedimentosList.innerHTML = '<p class="text-red-500">Não foi possível carregar os procedimentos.</p>';
        });

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedAreas = Array.from(areaCheckboxes)
            .filter(cb => cb.checked && cb.value !== 'todos')
            .map(cb => cb.value);

        filteredProcedimentos = allProcedimentos.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm) || item.summary.toLowerCase().includes(searchTerm);
            const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(item.area);
            return matchesSearch && matchesArea;
        });

        currentPage = 1;
        renderPage(currentPage);
        setupPagination();
    }

    function renderPage(page) {
        procedimentosList.innerHTML = '';
        if (filteredProcedimentos.length === 0) {
            procedimentosList.innerHTML = '<p class="text-gray-500 text-center">Nenhum procedimento encontrado.</p>';
            return;
        }

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = filteredProcedimentos.slice(start, end);

        pageItems.forEach(item => {
            const article = document.createElement('article');
            article.className = 'border-b border-gray-200 pb-4 last:border-b-0';

            let areaColor = 'text-gray-600';
            switch (item.area) {
                case 'Contabilidade': areaColor = 'text-blue-600'; break;
                case 'ICMS e Outros': areaColor = 'text-green-600'; break;
                case 'Prev/Trab': areaColor = 'text-orange-600'; break;
                case 'IR': areaColor = 'text-red-600'; break;
                case 'Federal': areaColor = 'text-purple-600'; break;
                case 'ISS e Outros': areaColor = 'text-yellow-600'; break;
            }

            article.innerHTML = `
                <span class="text-xs font-semibold ${areaColor} uppercase">${item.area}</span>
                <a href="${item.link}" class="text-lg font-semibold hover:text-blue-600 cursor-pointer block mt-1">${item.title}</a>
                <p class="text-gray-600 text-sm mt-1">${item.summary}</p>
                <span class="text-xs text-gray-400 mt-2 block">${item.details}</span>
            `;
            procedimentosList.appendChild(article);
        });
    }

    function setupPagination() {
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredProcedimentos.length / itemsPerPage);

        if (pageCount <= 1) return;

        // Previous button
        const prevButton = createPaginationButton('&laquo; Anterior', currentPage > 1 ? currentPage - 1 : null);
        paginationContainer.appendChild(prevButton);

        // Page number buttons
        for (let i = 1; i <= pageCount; i++) {
            const pageButton = createPaginationButton(i, i);
            if (i === currentPage) {
                pageButton.className += ' bg-blue-600 text-white';
            }
            paginationContainer.appendChild(pageButton);
        }

        // Next button
        const nextButton = createPaginationButton('Próximo &raquo;', currentPage < pageCount ? currentPage + 1 : null);
        paginationContainer.appendChild(nextButton);
    }

    function createPaginationButton(text, page) {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.className = 'px-3 py-1 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-100';
        if (!page) {
            button.disabled = true;
            button.className = 'px-3 py-1 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed';
        } else {
            button.addEventListener('click', () => {
                currentPage = page;
                renderPage(currentPage);
                setupPagination();
            });
        }
        return button;
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);

    areaCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const todosCheckbox = document.querySelector('input[name="area"][value="todos"]');
            if (e.target.value === 'todos') {
                // If "Todos" is checked, uncheck others
                if (e.target.checked) {
                    areaCheckboxes.forEach(cb => {
                        if (cb.value !== 'todos') cb.checked = false;
                    });
                }
            } else {
                // If another checkbox is checked, uncheck "Todos"
                if (e.target.checked) {
                    todosCheckbox.checked = false;
                }
            }

            // If no specific area is checked, check "Todos"
            const anyAreaChecked = Array.from(areaCheckboxes).some(cb => cb.checked && cb.value !== 'todos');
            if (!anyAreaChecked) {
                todosCheckbox.checked = true;
            }

            applyFilters();
        });
    });
});