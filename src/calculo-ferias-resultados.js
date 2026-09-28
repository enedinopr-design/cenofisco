document.addEventListener('DOMContentLoaded', function() {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function() {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- App Search Logic (copied from aplicativos.html, likely not needed here but kept for consistency) ---
    const searchInput = document.getElementById('app-search');
    const appGrid = document.getElementById('app-grid'); // This element might not exist on this page
    const appCards = appGrid ? Array.from(appGrid.getElementsByClassName('app-card')) : [];
    const noResults = document.getElementById('no-results');

    if (searchInput && appGrid) { // Check if elements exist before adding listeners
        searchInput.addEventListener('input', function() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            let found = false;

            appCards.forEach(card => {
                const appName = card.querySelector('span').textContent.toLowerCase();
                if (appName.includes(searchTerm)) {
                    card.style.display = 'flex';
                    found = true;
                } else {
                    card.style.display = 'none';
                }
            });

            if (noResults) {
                if (found) {
                    noResults.classList.add('hidden');
                } else {
                    noResults.classList.remove('hidden');
                }
            }
        });
    }

    // --- Saved Calculations Sidebar Logic ---
    const savedCalculationsList = document.getElementById('saved-calculations-list');

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

    renderSavedCalculations(); // Initial render of saved calculations
});