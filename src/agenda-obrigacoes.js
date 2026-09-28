document.addEventListener('DOMContentLoaded', function () {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');
    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function () {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- Elementos do DOM ---
    const savedAgendaDaysList = document.getElementById('saved-agenda-days-list');
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarContainer = document.querySelector('.calendar-container');
    const obligationFilterInput = document.getElementById('obligation-filter');

    // Variáveis de estado
    let allEvents = [];
    let displayDate = new Date(2026, 4, 1); // Inicializa para Maio de 2026 para exibir eventos do agenda.json
    const monthNames = [ // Nomes dos meses para exibição
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // --- Funções Auxiliares de Data ---
    function parseBRDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const [day, month, year] = dateStr.split('/'); // Formato DD/MM/YYYY
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) { // Valida se são números
            return new Date(year, month - 1, day);
        }
        return null;
    }

    function getDaysRemaining(futureDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureDate = parseBRDate(futureDateStr); // Converte a string de data para objeto Date
        if (!futureDate) return "";
        futureDate.setHours(0, 0, 0, 0);

        const diffTime = futureDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Calcula a diferença em dias

        if (diffDays === 0) return "Hoje"; // Se for o mesmo dia
        if (diffDays === 1) return "Amanhã"; // Se for o dia seguinte
        if (diffDays > 1) return `Faltam ${diffDays} dias`; // Dias futuros
        return ""; // Se a data já passou (será filtrado de qualquer forma)
    }

    function getEventsByDate(date) {
        return allEvents.filter(event => {
            const eventDate = parseBRDate(event.date);
            return eventDate && (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        });
    }

    // --- Lógica de Salvar/Excluir Obrigações ---
    function saveObligation(dateStr, obligation) { // Salva uma obrigação no localStorage
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let savedObligations = (JSON.parse(localStorage.getItem('savedObligations')) || []).filter(o => {
                const obligationDate = parseBRDate(o.date);
                if (obligationDate) {
                    obligationDate.setHours(0, 0, 0, 0);
                    return obligationDate >= today;
                }
                return false;
            });

        const newObligation = { date: dateStr, ...obligation }; // Cria a nova obrigação
        savedObligations = savedObligations.filter(o => !(o.date === newObligation.date && o.title === newObligation.title)); // Evita duplicatas
        savedObligations.unshift(newObligation); // Adiciona no início da lista

        localStorage.setItem('savedObligations', JSON.stringify(savedObligations));
        alert(`Obrigação "${obligation.title}" de ${dateStr} salva com sucesso!`);
        renderSavedAgendaDays();
    }

    function deleteObligation(dateStr, title) {
        // Exclui uma obrigação específica (por data e título)
        let savedObligations = (JSON.parse(localStorage.getItem('savedObligations')) || []);
        savedObligations = savedObligations.filter(o => !(o.date === dateStr && o.title === title));
        localStorage.setItem('savedObligations', JSON.stringify(savedObligations));
        renderSavedAgendaDays();
    }

    function deleteAllObligationsForDay(dateStr) { // Exclui todas as obrigações de um determinado dia
        let savedObligations = (JSON.parse(localStorage.getItem('savedObligations')) || []);
        savedObligations = savedObligations.filter(o => o.date !== dateStr);
        localStorage.setItem('savedObligations', JSON.stringify(savedObligations));
        renderSavedAgendaDays();
    }

    function renderSavedAgendaDays() { // Renderiza a lista de obrigações salvas na barra lateral
        if (!savedAgendaDaysList) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let savedObligations = (JSON.parse(localStorage.getItem('savedObligations')) || []).filter(obligation => {
            const obligationDate = parseBRDate(obligation.date);
            if (obligationDate) {
                obligationDate.setHours(0, 0, 0, 0);
                return obligationDate >= today;
            }
            return false;
        });

        localStorage.setItem('savedObligations', JSON.stringify(savedObligations)); // Atualiza o localStorage com a lista filtrada
        savedAgendaDaysList.innerHTML = '';
        if (savedObligations.length === 0) {
            savedAgendaDaysList.innerHTML = '<li class="text-gray-500 italic text-xs p-2">Nenhuma obrigação salva.</li>';
            return;
        }

        const groupedObligations = savedObligations.reduce((acc, obligation) => {
            if (!acc[obligation.date]) {
                acc[obligation.date] = [];
            }
            acc[obligation.date].push(obligation);
            return acc;
        }, {});
        const sortedDates = Object.keys(groupedObligations).sort((a, b) => parseBRDate(a) - parseBRDate(b));

        sortedDates.forEach(dateStr => {
            const obligationsForDate = groupedObligations[dateStr];
            const li = document.createElement('li');
            li.className = 'border-b border-gray-100 last:border-b-0';
            const eventTitles = obligationsForDate.map(o => o.title).join('; ');
            const daysRemainingText = getDaysRemaining(dateStr);

            const anchorId = `dia-${dateStr.replace(/\//g, '-')}`;

            li.innerHTML = `
                <a href="#${anchorId}" class="flex justify-between items-center p-2 rounded-md hover:bg-blue-50 group text-blue-600">
                    <div>
                        <p class="font-medium group-hover:text-blue-700" title="${dateStr}: ${eventTitles}">${dateStr} - ${eventTitles}</p>
                        <span class="text-xs text-gray-500">${daysRemainingText}</span>
                    </div>
                    <button class="delete-saved-day-btn text-red-500 hover:text-red-700 ml-2" data-date="${dateStr}" title="Remover todas as obrigações deste dia">
                        <i class="fas fa-times"></i>
                    </button>
                </a>
            `;
            savedAgendaDaysList.appendChild(li);
        });
        document.querySelectorAll('.delete-saved-day-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const dateToDelete = e.currentTarget.dataset.date;
                deleteAllObligationsForDay(dateToDelete);
            });
        });
    }

    // --- Funções do Calendário ---
    async function loadAndRenderCalendar() {
        try {
            const response = await fetch('./agenda.json');
            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status}`);
            }
            allEvents = await response.json();
            if (calendarDays && currentMonthYear) {
                renderCalendar();
            }
        } catch (error) {
            console.error('Erro ao carregar eventos da agenda:', error);
        }
    }

    function renderCalendar() {
        if (!calendarDays || !currentMonthYear) return;
        calendarDays.innerHTML = ''; // Limpa os dias existentes

        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        currentMonthYear.textContent = `${monthNames[month]} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay();

        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'p-2 text-center text-gray-400';
            calendarDays.appendChild(emptyDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            const fullDate = new Date(year, month, day);
            const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
            const dayEvents = getEventsByDate(fullDate);

            dayDiv.className = 'p-2 text-center rounded-md';

            if (dayEvents.length > 0) { // Apenas adiciona a classe visual, sem listener
                const anchorId = `dia-${dateStr.replace(/\//g, '-')}`;
                dayDiv.innerHTML = `<a href="#${anchorId}" class="block w-full h-full  transition">${day}</a>`;
                dayDiv.classList.add('has-event', 'font-bold');
            } else {
                dayDiv.textContent = day;
            }

            const today = new Date();
            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('bg-blue-600', 'text-white');
                dayDiv.classList.remove('hover:bg-blue-50');
            } else {
                dayDiv.classList.add('text-gray-700');
            }
            calendarDays.appendChild(dayDiv);
        }
    }

    // --- Event Listeners ---
    prevMonthBtn?.addEventListener('click', () => { displayDate.setMonth(displayDate.getMonth() - 1); renderCalendar(); }); // Botão mês anterior
    nextMonthBtn?.addEventListener('click', () => { displayDate.setMonth(displayDate.getMonth() + 1); renderCalendar(); }); // Botão próximo mês

    // --- Listener para botões de salvar obrigação na tabela estática ---
    // Adiciona um listener a todos os botões com a classe 'save-obligation-btn' que não estão dentro do popup
    document.querySelectorAll('button.save-obligation-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const dateStr = e.currentTarget.dataset.date;
            const obligationToSave = {
                title: e.currentTarget.dataset.title,
                description: e.currentTarget.dataset.description,
                type: e.currentTarget.dataset.type
            };
            saveObligation(dateStr, obligationToSave);
        });
    });

    // --- Lógica de Filtragem da Agenda ---
    function applyAgendaFilters() {
        const filterText = obligationFilterInput.value.toLowerCase();

        // Seleciona todos os cabeçalhos de data e tabelas
        const dateHeaders = document.querySelectorAll('.md\\:col-span-3 h1');

        dateHeaders.forEach(header => {
            const table = header.nextElementSibling;
            if (table && table.tagName === 'TABLE') {
                const rows = table.querySelectorAll('tbody tr');
                let hasVisibleRows = false;

                rows.forEach(row => {
                    const title = row.cells[1].textContent.toLowerCase();
                    const description = row.cells[2].textContent.toLowerCase();

                    if (title.includes(filterText) || description.includes(filterText)) {
                        row.style.display = '';
                        hasVisibleRows = true;
                    } else {
                        row.style.display = 'none';
                    }
                });

                // Esconde o cabeçalho e a tabela se nenhuma linha for visível
                header.style.display = hasVisibleRows ? '' : 'none';
                table.style.display = hasVisibleRows ? '' : 'none';
            }
        });
    }

    obligationFilterInput?.addEventListener('input', applyAgendaFilters);

    // --- Inicialização ---
    loadAndRenderCalendar(); // Carrega eventos e renderiza o calendário
    renderSavedAgendaDays(); // Renderiza a lista de obrigações salvas na barra lateral
});