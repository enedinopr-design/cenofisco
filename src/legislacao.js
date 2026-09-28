document.addEventListener('DOMContentLoaded', function() {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function() {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- Legislation Page Logic ---
    const legislacaoArticles = document.getElementById('legislacao-articles');
    const buscaAvancadaBtn = document.getElementById('busca-avancada-btn');
    const buscaAvancadaDiv = document.getElementById('legislacao-busca-avancada');
    const btnAplicarAvancada = document.getElementById('adv-aplicar');
    const btnLimparAvancada = document.getElementById('adv-limpar');
    const advAreaSelect = document.getElementById('adv-area');
    const advTipoPublicacaoSelect = document.getElementById('adv-tipo-publicacao');
    const advEstadoSelect = document.getElementById('adv-estado');
    const advMunicipioContainer = document.getElementById('adv-municipio-container');
    const advMunicipioSelect = document.getElementById('adv-municipio');
    const recentlyAccessedList = document.getElementById('recently-accessed-list');

    let allLegislacaoData = [];
    let filteredLegislacaoData = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // Load all legislation data
    fetch('./legislacao.json')
        .then(response => response.json())
        .then(data => {
            allLegislacaoData = data;
            filteredLegislacaoData = data;
            populateDropdowns();
            renderRecentlyAccessed();
            renderArticles(data);
        })
        .catch(error => console.error('Erro ao carregar legislação:', error));

    function populateDropdowns() {
        const uniqueAreas = new Set();
        const uniqueTiposPublicacao = new Set();
        const uniqueEstados = new Set();
        const uniqueMunicipios = new Set();

        allLegislacaoData.forEach(item => {
            if (item.area) uniqueAreas.add(item.area);
            if (item.tipo_de_publicacao) uniqueTiposPublicacao.add(item.tipo_de_publicacao);
            if (item.estado) uniqueEstados.add(item.estado);
            if (item.municipio) uniqueMunicipios.add(item.municipio);
        });

        advAreaSelect.innerHTML = '<option value="">Todas</option>';
        Array.from(uniqueAreas).sort().forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            advAreaSelect.appendChild(option);
        });

        advTipoPublicacaoSelect.innerHTML = '<option value="">Todas</option>';
        Array.from(uniqueTiposPublicacao).sort().forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = tipo;
            advTipoPublicacaoSelect.appendChild(option);
        });

        advEstadoSelect.innerHTML = '<option value="">Todos</option>';
        Array.from(uniqueEstados).sort().forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            advEstadoSelect.appendChild(option);
        });

        advMunicipioSelect.innerHTML = '<option value="">Todos</option>';
        Array.from(uniqueMunicipios).sort().forEach(municipio => {
            const option = document.createElement('option');
            option.value = municipio;
            option.textContent = municipio;
            advMunicipioSelect.appendChild(option);
        });
    }

    function renderPage(page) {
        currentPage = page;
        legislacaoArticles.innerHTML = '';

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const articles = filteredLegislacaoData.slice(start, end);

        articles.forEach(item => {
            const article = document.createElement('article');
            article.className = 'border-b border-gray-200 pb-4';
            article.setAttribute('data-type', item.type);
            article.setAttribute('data-date', item.date);
            article.setAttribute('data-area', item.area || '');
            article.setAttribute('data-publicacao', item.publicacao || '');
            if (item.estado) {
                article.setAttribute('data-estado', item.estado);
            }

            let typeLabel = 'Federal';
            if (item.type === 'estadual') {
                typeLabel = `Estadual - ${item.estado}`;
            } else if (item.type === 'municipal') {
                typeLabel = `Municipal - ${item.municipio} - ${item.estado}`;
            }

            const colorClass = item.type === 'federal' ? 'text-blue-600' : item.type === 'estadual' ? 'text-green-600' : 'text-orange-600';

            let metaInfoParts = [];
            if (item.area && item.area.trim()) metaInfoParts.push(item.area);
            if (item.tipo_de_publicacao) metaInfoParts.push(item.tipo_de_publicacao);

            let metaInfoHtml = metaInfoParts.length > 0 ? `<span class="mx-1">|</span> ${metaInfoParts.join(' <span class="mx-1">|</span> ')}` : '';

            article.innerHTML = `
                <span class="text-xs font-semibold ${colorClass} uppercase">${typeLabel}</span>
                <a href="${item.link}" class="block p-2 rounded-md hover:bg-blue-50 group">
                    <p class="font-medium text-gray-700 group-hover:text-blue-700 truncate" title="${item.title}">${item.title}</p>
                </a>
                <p class="text-gray-600 text-sm mt-1">${item.summary}</p>
                <span class="text-xs text-gray-400 mt-2 block">Publicado em ${item.date} ${metaInfoHtml}</span>
            `;
            const linkElement = article.querySelector('a');
            if (linkElement) {
                linkElement.addEventListener('click', () => {
                    saveAccessedLegislation({
                        title: item.title,
                        date: item.date,
                        link: item.link
                    });
                    renderRecentlyAccessed();
                });
            }
            legislacaoArticles.appendChild(article);
        });

        setupPagination();
    }

    function setupPagination() {
        const paginationContainer = document.getElementById('pagination-container');
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredLegislacaoData.length / itemsPerPage);

        if (pageCount <= 1) return;

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo; Anterior';
        prevButton.className = 'px-3 py-1 rounded-md text-sm font-medium ' + (currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100');
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => renderPage(currentPage - 1));
        paginationContainer.appendChild(prevButton);

        // Page number buttons
        for (let i = 1; i <= pageCount; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = 'px-3 py-1 rounded-md text-sm font-medium ' + (i === currentPage ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-100');
            if (i !== currentPage) {
                pageButton.addEventListener('click', () => renderPage(i));
            }
            paginationContainer.appendChild(pageButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = 'Próximo &raquo;';
        nextButton.className = 'px-3 py-1 rounded-md text-sm font-medium ' + (currentPage === pageCount ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100');
        nextButton.disabled = currentPage === pageCount;
        nextButton.addEventListener('click', () => renderPage(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    }

    function renderArticles(articles) {
        filteredLegislacaoData = articles.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateB - dateA;
        });
        renderPage(1);
    }

    function saveAccessedLegislation(item) {
        let accessed = JSON.parse(localStorage.getItem('recentlyAccessed')) || [];
        accessed = accessed.filter(i => i.title !== item.title);
        accessed.unshift(item);
        if (accessed.length > 5) {
            accessed.pop();
        }
        localStorage.setItem('recentlyAccessed', JSON.stringify(accessed));
    }

    function renderRecentlyAccessed() {
        const accessed = JSON.parse(localStorage.getItem('recentlyAccessed')) || [];
        recentlyAccessedList.innerHTML = '';

        if (accessed.length === 0) {
            recentlyAccessedList.innerHTML = '<li class="text-gray-500 italic text-xs p-2">Nenhuma legislação acessada recentemente.</li>';
            return;
        }

        accessed.forEach(item => {
            const li = document.createElement('li');
            li.className = 'border-b border-gray-100 last:border-b-0';
            li.innerHTML = `
                <a href="${item.link}" class="block p-2 rounded-md hover:bg-blue-50 group">
                    <p class="font-medium text-gray-700 group-hover:text-blue-700 truncate" title="${item.title}">${item.title}</p>
                    <span class="text-xs text-gray-400">${item.date}</span>
                </a>
            `;
            recentlyAccessedList.appendChild(li);
        });
    }

    function applyAllFilters() {
        const numero = document.getElementById('adv-numero-decreto').value.toLowerCase();
        const area = advAreaSelect.value;
        const tipoPublicacao = advTipoPublicacaoSelect.value;
        const estado = advEstadoSelect.value;
        const dataDe = document.getElementById('adv-data-de').value;
        const dataAte = document.getElementById('adv-data-ate').value;

        if (estado) {
            advMunicipioContainer.classList.remove('hidden');
        } else {
            advMunicipioContainer.classList.add('hidden');
            advMunicipioSelect.value = '';
        }
        const municipio = advMunicipioSelect.value;

        filteredLegislacaoData = allLegislacaoData.filter(item => {
            if (numero && !item.title?.toLowerCase().includes(numero)) return false;
            if (area && item.area !== area) return false;
            if (tipoPublicacao && item.tipo_de_publicacao !== tipoPublicacao) return false;
            if (estado && item.estado !== estado) return false;
            if (dataDe) {
                const itemDate = new Date(item.date.split('/').reverse().join('-'));
                if (itemDate < new Date(dataDe)) return false;
            }
            if (dataAte) {
                const itemDate = new Date(item.date.split('/').reverse().join('-'));
                if (itemDate > new Date(dataAte)) return false;
            }
            if (municipio && item.municipio !== municipio) return false;
            if (estado && item.estado !== estado) {
                return false;
            }
            return true;
        });

        renderArticles(filteredLegislacaoData);
    }

    // Event listeners for filters
    advAreaSelect.addEventListener('change', applyAllFilters);
    advTipoPublicacaoSelect.addEventListener('change', applyAllFilters);
    advEstadoSelect.addEventListener('change', applyAllFilters);
    advMunicipioSelect.addEventListener('change', applyAllFilters);
    document.getElementById('adv-numero-decreto').addEventListener('input', applyAllFilters);
    document.getElementById('adv-data-de').addEventListener('change', applyAllFilters);
    document.getElementById('adv-data-ate').addEventListener('change', applyAllFilters);

    btnAplicarAvancada.addEventListener('click', applyAllFilters);

    btnLimparAvancada.addEventListener('click', () => {
        document.getElementById('adv-numero-decreto').value = '';
        advAreaSelect.value = '';
        advTipoPublicacaoSelect.value = '';
        advMunicipioSelect.value = '';
        advEstadoSelect.value = '';
        document.getElementById('adv-data-de').value = '';
        document.getElementById('adv-data-ate').value = '';
        applyAllFilters(); // Re-apply filters after clearing
    });
});