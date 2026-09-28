document.addEventListener('DOMContentLoaded', function () {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function () {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- Regulamentos Page Logic ---
    const regulationsListContainer = document.getElementById('regulations-list');
    const regulationSearchInput = document.getElementById('regulation-search');
    const articlesListContainer = document.getElementById('articles-list');
    const paginationContainer = document.getElementById('pagination-container');

    let allRegulations = [];
    let filteredRegulations = [];
    let currentPage = 1;
    const itemsPerPage = 5;
    const savedRegulationsStorageKey = 'savedRegulations';

    // Load regulations data
    fetch('./regulamentos.json')
        .then(response => response.json())
        .then(data => {
            allRegulations = data;
            applyFilters(); // Initial render
            renderArticlesSidebar(); // Render sidebar articles
        })
        .catch(error => {
            console.error('Erro ao carregar regulamentos:', error);
            regulationsListContainer.innerHTML = '<p class="text-red-500">Não foi possível carregar os regulamentos.</p>';
        });

    function applyFilters() {
        const searchTerm = regulationSearchInput.value.toLowerCase();

        filteredRegulations = allRegulations.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm) || item.summary.toLowerCase().includes(searchTerm);
            return matchesSearch;
        });

        currentPage = 1;
        renderPage(currentPage);
        setupPagination();
    }

    function renderPage(page) {
        regulationsListContainer.innerHTML = '';
        if (filteredRegulations.length === 0) {
            regulationsListContainer.innerHTML = '<p class="text-gray-500 text-center">Nenhum regulamento encontrado com os filtros selecionados.</p>';
            return;
        }

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = filteredRegulations.slice(start, end);

        pageItems.forEach(item => {
            const article = document.createElement('article');
            const isSaved = isRegulationSaved(item);
            article.className = 'group border-b border-gray-200 pb-6 last:border-b-0';

            article.innerHTML = `
                <div class="flex items-start justify-between gap-4 mt-2 mb-3">
                    <h3 class="text-xl font-bold leading-tight group-hover:text-blue-600 transition">${item.title}</h3>
                    <button type="button" class="save-regulation-button shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isSaved ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}" aria-pressed="${isSaved}" title="${isSaved ? 'Remover dos regulamentos salvos' : 'Salvar regulamento'}">
                        <i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i>
                        <span>${isSaved ? 'Salvo' : 'Salvar'}</span>
                    </button>
                </div>
                <div class="text-base text-gray-600">
                    <p>${item.summary}</p>
                </div>
                <span class="text-xs text-gray-500 mt-2 block">Publicado em: ${item.date}</span>
            `;

            article.querySelector('.save-regulation-button').addEventListener('click', (event) => {
                event.stopPropagation();
                toggleSavedRegulation(item);
            });

            article.addEventListener('click', () => {
                if (item.link && item.link !== '#') window.location.href = item.link;
            });
            regulationsListContainer.appendChild(article);
        });
    }

    function setupPagination() {
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredRegulations.length / itemsPerPage);

        if (pageCount <= 1) return;

        // Simplified pagination for brevity, similar to other pages
        for (let i = 1; i <= pageCount; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = 'px-3 py-1 rounded-md text-sm font-medium ' + (i === currentPage ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-100');
            if (i !== currentPage) {
                pageButton.addEventListener('click', () => {
                    currentPage = i;
                    renderPage(currentPage);
                });
            }
            paginationContainer.appendChild(pageButton);
        }
    }

    function renderArticlesSidebar() {
        const savedRegulations = getSavedRegulations();

        articlesListContainer.innerHTML = '';
        if (savedRegulations.length === 0) {
            articlesListContainer.innerHTML = '<li class="text-gray-500 italic text-xs p-2">Nenhum regulamento salvo.</li>';
            return;
        }

        savedRegulations.forEach(regulation => {
            const li = document.createElement('li');
            li.className = 'border-b border-gray-100 last:border-b-0';
            li.innerHTML = `
                <div class="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 group">
                    <a href="${regulation.link || '#'}" class="min-w-0 flex-1 text-gray-700 group-hover:text-blue-700 transition" title="${regulation.title}">
                        <i class="fas fa-file-alt mr-2"></i><span class="align-middle">${regulation.title}</span>
                    </a>
                    <button type="button" class="remove-saved-regulation text-gray-400 hover:text-red-600 p-1" title="Remover regulamento salvo" aria-label="Remover ${regulation.title}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            li.querySelector('.remove-saved-regulation').addEventListener('click', () => {
                removeSavedRegulation(regulation);
            });
            articlesListContainer.appendChild(li);
        });
    }

    function getSavedRegulations() {
        return JSON.parse(localStorage.getItem(savedRegulationsStorageKey)) || [];
    }

    function isRegulationSaved(regulation) {
        return getSavedRegulations().some(saved => saved.title === regulation.title);
    }

    function toggleSavedRegulation(regulation) {
        if (isRegulationSaved(regulation)) {
            removeSavedRegulation(regulation);
            return;
        }

        const savedRegulations = getSavedRegulations().filter(saved => saved.title !== regulation.title);
        savedRegulations.unshift(regulation);
        localStorage.setItem(savedRegulationsStorageKey, JSON.stringify(savedRegulations));
        renderArticlesSidebar();
        renderPage(currentPage);
    }

    function removeSavedRegulation(regulation) {
        const savedRegulations = getSavedRegulations().filter(saved => saved.title !== regulation.title);
        localStorage.setItem(savedRegulationsStorageKey, JSON.stringify(savedRegulations));
        renderArticlesSidebar();
        renderPage(currentPage);
    }

    // Event Listeners
    regulationSearchInput.addEventListener('input', applyFilters);
});