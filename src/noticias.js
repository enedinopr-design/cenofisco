document.addEventListener('DOMContentLoaded', function() {
    const noticiasList = document.getElementById('noticias-list');
    const searchInput = document.getElementById('noticia-search');
    const areaCheckboxes = document.querySelectorAll('input[name="area"]');
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const paginationContainer = document.getElementById('pagination-container');

    let allNoticias = [];
    let filteredNoticias = [];
    let currentPage = 1;
    const itemsPerPage = 4;

    // Fetch data
    fetch('./noticias.json')
        .then(response => response.json())
        .then(data => {
            allNoticias = data.map(item => ({
                ...item,
                // Convert DD/MM/YYYY to a comparable format YYYY-MM-DD
                dateComparable: item.date.split('/').reverse().join('-')
            }));
            applyFilters();
        })
        .catch(error => {
            console.error('Erro ao carregar notícias:', error);
            noticiasList.innerHTML = '<p class="text-red-500">Não foi possível carregar as notícias.</p>';
        });

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedAreas = Array.from(areaCheckboxes)
            .filter(cb => cb.checked && cb.value !== 'todos')
            .map(cb => cb.value);
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;

        filteredNoticias = allNoticias.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm) || item.summary.toLowerCase().includes(searchTerm);
            const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(item.area);
            const matchesDate = 
                (!dateFrom || item.dateComparable >= dateFrom) &&
                (!dateTo || item.dateComparable <= dateTo);

            return matchesSearch && matchesArea && matchesDate;
        });

        currentPage = 1;
        renderPage(currentPage);
        setupPagination();
    }

    function renderPage(page) {
        noticiasList.innerHTML = '';
        if (filteredNoticias.length === 0) {
            noticiasList.innerHTML = '<p class="text-gray-500 text-center">Nenhuma notícia encontrada com os filtros selecionados.</p>';
            return;
        }

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = filteredNoticias.slice(start, end);

        pageItems.forEach(item => {
            const article = document.createElement('article');
            article.className = 'group cursor-pointer border-b border-gray-200 pb-6 last:border-b-0';

            let areaColor = 'text-gray-600';
            switch (item.area) {
                case 'Tributário': areaColor = 'text-green-600'; break;
                case 'Trabalhista': areaColor = 'text-orange-600'; break;
                case 'Federal': areaColor = 'text-red-600'; break;
                case 'Previdenciário': areaColor = 'text-purple-600'; break;
            }

            article.innerHTML = `
                <span class="text-sm font-bold ${areaColor} uppercase">${item.area} | ${item.date}</span>
                <h2 class="text-xl font-bold leading-tight group-hover:text-blue-600 transition mt-2 mb-3">${item.title}</h2>
                <p class="text-base text-gray-600">${item.summary}</p>
            `;
            article.addEventListener('click', () => {
                if(item.link && item.link !== '#') window.location.href = item.link;
            });
            noticiasList.appendChild(article);
        });
    }

    function setupPagination() {
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredNoticias.length / itemsPerPage);

        if (pageCount <= 1) return;

        const prevButton = createPaginationButton('&laquo; Anterior', currentPage > 1 ? currentPage - 1 : null);
        paginationContainer.appendChild(prevButton);

        for (let i = 1; i <= pageCount; i++) {
            const pageButton = createPaginationButton(i, i);
            if (i === currentPage) {
                pageButton.className += ' bg-blue-600 text-white';
            }
            paginationContainer.appendChild(pageButton);
        }

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
                window.scrollTo(0, 0);
            });
        }
        return button;
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);
    dateFromInput.addEventListener('change', applyFilters);
    dateToInput.addEventListener('change', applyFilters);

    areaCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const todosCheckbox = document.querySelector('input[name="area"][value="todos"]');
            if (e.target.value === 'todos' && e.target.checked) {
                areaCheckboxes.forEach(cb => { if (cb.value !== 'todos') cb.checked = false; });
            } else if (e.target.value !== 'todos' && e.target.checked) {
                todosCheckbox.checked = false;
            }

            const anyAreaChecked = Array.from(areaCheckboxes).some(cb => cb.checked && cb.value !== 'todos');
            if (!anyAreaChecked) {
                todosCheckbox.checked = true;
            }
            applyFilters();
        });
    });
});