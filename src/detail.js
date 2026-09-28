document.addEventListener('DOMContentLoaded', function() {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function() {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- Legislation Detail Page Logic ---
    const legislationDetailContainer = document.getElementById('legislation-detail');
    const urlParams = new URLSearchParams(window.location.search);
    const legislationTitle = urlParams.get('title');

    if (!legislationTitle) {
        legislationDetailContainer.innerHTML = '<p class="text-red-600">Título da legislação não encontrado na URL.</p>';
        return;
    }

    fetch('./legislacao.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar legislacao.json');
            }
            return response.json();
        })
        .then(data => {
            const decodedTitle = decodeURIComponent(legislationTitle);
            const item = data.find(leg => leg.title === decodedTitle);

            if (item) {
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

                legislationDetailContainer.innerHTML = `
                    <span class="text-xs font-semibold ${colorClass} uppercase">${typeLabel}</span>
                    <h3 class="text-2xl font-bold mt-2">${item.title}</h3>
                    <p class="text-gray-700 text-base mt-4">${item.summary}</p>
                    <p class="text-gray-600 text-sm mt-2">
                        <span class="font-semibold">Publicado em:</span> ${item.date} ${metaInfoHtml}
                    </p>
                    ${item.estado ? `<p class="text-gray-600 text-sm"><span class="font-semibold">Estado:</span> ${item.estado}</p>` : ''}
                    ${item.municipio ? `<p class="text-gray-600 text-sm"><span class="font-semibold">Município:</span> ${item.municipio}</p>` : ''}
                    <div class="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 class="font-semibold text-lg mb-2">Conteúdo Completo (Exemplo)</h4>
                        <p class="text-gray-700">Este é um espaço para o conteúdo completo da legislação. Em um sistema real, este conteúdo viria de um campo 'content' no JSON, ou de um arquivo HTML/Markdown separado referenciado pelo link.</p>
                        <p class="text-gray-700 mt-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                    </div>
                `;
            } else {
                legislationDetailContainer.innerHTML = `<p class="text-red-600">Legislação "${decodedTitle}" não encontrada.</p>`;
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            legislationDetailContainer.innerHTML = `<p class="text-red-600">Ocorreu um erro ao carregar os detalhes da legislação: ${error.message}</p>`;
        });
});