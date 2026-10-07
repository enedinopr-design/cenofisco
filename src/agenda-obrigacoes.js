document.addEventListener('DOMContentLoaded', function () {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');
    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function () {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- Tabelas de vencimentos no celular ---
    // Copia o título de cada coluna (1ª linha da tabela) para as células (data-label).
    // Abaixo de 1280px o CSS mostra cada linha como um cartão, com o rótulo acima do valor (ver .tabela-agenda em input.css).
    document.querySelectorAll('table.tabela-agenda').forEach(table => {
        const rows = Array.from(table.rows);
        if (!rows.length) return;
        const labels = Array.from(rows[0].cells).map(cell => cell.textContent.replace(/\s+/g, ' ').trim());
        rows.slice(1).forEach(row => {
            Array.from(row.cells).forEach((cell, i) => {
                if (labels[i]) cell.dataset.label = labels[i];
            });
        });
        // Títulos como "Formulário/Programa/Guia" não quebram e travam a largura das colunas:
        // um espaço de largura zero após cada "/" permite quebrar ali (sem mudar o texto visível).
        Array.from(rows[0].cells).forEach(cell => {
            const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                node.nodeValue = node.nodeValue.replace(/\/(?!​)/g, '/​');
            }
        });
    });

    // --- Elementos do DOM ---
    const savedAgendaDaysList = document.getElementById('saved-agenda-days-list');
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarSummary = document.getElementById('calendar-summary');
    const obligationFilterInput = document.getElementById('obligation-filter');

    // Variáveis de estado
    let allEvents = [];
    let eventMonths = [];        // Meses com obrigações no agenda.json, em ordem ("AAAA-MM")
    let displayDate = null;      // Mês exibido; definido após carregar o agenda.json
    let selectedDateStr = null;  // Dia selecionado no calendário (DD/MM/AAAA)
    let ignoreScrollUntil = 0;   // Pausa o acompanhamento da rolagem logo após clicar em um dia
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
    // Cada obrigação salva guarda uma chave única (data + título + descrição + ordem),
    // pois o mesmo dia pode ter várias linhas com o mesmo título (ex.: três "SCANC").
    // Obrigações vencidas NÃO são apagadas automaticamente: aparecem como "Vencida" até o usuário remover.
    const STORAGE_KEY = 'savedObligations';
    const saveButtons = Array.from(document.querySelectorAll('button.save-obligation-btn'));

    function escapeHTML(text) {
        return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function readSaved() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    function writeSaved(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            showToast('Não foi possível salvar neste navegador.', 'error');
        }
    }

    // Prepara cada botão: chave única, id da linha (para o link da lista) e subtítulo da obrigação
    const keyCount = {};
    saveButtons.forEach((button, i) => {
        const row = button.closest('tr');
        const subtitle = row?.cells[2]?.querySelector('strong')?.textContent.replace(/\s+/g, ' ').trim() || '';
        const base = `${button.dataset.date}|${button.dataset.title}|${subtitle}`;
        keyCount[base] = (keyCount[base] || 0) + 1;
        button.dataset.key = `${base}|${keyCount[base]}`;
        button.dataset.subtitle = subtitle;
        if (row && !row.id) row.id = `obrigacao-${i + 1}`;
        button.dataset.rowId = row ? row.id : '';
        button.type = 'button';
    });

    // Compatibilidade: itens salvos pela versão anterior (sem chave) passam a apontar para a 1ª linha com a mesma data e título
    (function migrateOldItems() {
        const list = readSaved();
        let changed = false;
        list.forEach(item => {
            if (item.key) return;
            const match = saveButtons.find(b => b.dataset.date === item.date && b.dataset.title === item.title);
            if (match) {
                item.key = match.dataset.key;
                item.subtitle = match.dataset.subtitle;
                item.rowId = match.dataset.rowId;
                changed = true;
            }
        });
        if (changed) writeSaved(list);
    })();

    function toggleObligation(button) {
        const key = button.dataset.key;
        let list = readSaved();
        if (list.some(o => o.key === key)) {
            list = list.filter(o => o.key !== key);
            writeSaved(list);
            showToast(`"${button.dataset.title}" removida das obrigações salvas.`);
        } else {
            list.push({
                key,
                date: button.dataset.date,
                title: button.dataset.title,
                subtitle: button.dataset.subtitle,
                description: button.dataset.description,
                type: button.dataset.type,
                rowId: button.dataset.rowId
            });
            writeSaved(list);
            showToast(`"${button.dataset.title}" de ${button.dataset.date} salva.`, 'success');
        }
        refreshSavedUI();
    }

    function removeObligation(key) {
        writeSaved(readSaved().filter(o => o.key !== key));
        refreshSavedUI();
    }

    function removeAllObligations() {
        writeSaved([]);
        refreshSavedUI();
    }

    // Atualiza o visual de cada botão "Salvar" (salvo / não salvo)
    function updateSaveButtons() {
        const savedKeys = new Set(readSaved().map(o => o.key));
        saveButtons.forEach(button => {
            const saved = savedKeys.has(button.dataset.key);
            button.setAttribute('aria-pressed', String(saved));
            button.classList.toggle('bg-blue-600', !saved);
            button.classList.toggle('hover:bg-blue-700', !saved);
            button.classList.toggle('bg-emerald-600', saved);
            button.classList.toggle('hover:bg-emerald-700', saved);
            button.classList.add('inline-flex', 'items-center', 'gap-1.5', 'whitespace-nowrap', 'cursor-pointer');
            button.innerHTML = saved
                ? '<i class="fa-solid fa-check" aria-hidden="true"></i>Salva'
                : '<i class="fa-regular fa-bookmark" aria-hidden="true"></i>Salvar';
            button.title = saved ? 'Clique para remover das obrigações salvas' : 'Salvar nas suas obrigações';
        });
    }

    function getStatus(dateStr) {
        const text = getDaysRemaining(dateStr);
        if (text) {
            const urgent = text === 'Hoje' || text === 'Amanhã';
            return { text, className: urgent ? 'text-amber-700 font-semibold' : 'text-gray-500' };
        }
        const date = parseBRDate(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = date ? Math.round((today - date) / 86400000) : 0;
        return { text: days === 1 ? 'Venceu ontem' : `Vencida há ${days} dias`, className: 'text-red-600' };
    }

    function renderSavedAgendaDays() { // Renderiza a lista de obrigações salvas na barra lateral
        if (!savedAgendaDaysList) return;
        const list = readSaved();
        savedAgendaDaysList.innerHTML = '';

        if (list.length === 0) {
            savedAgendaDaysList.innerHTML = '<li class="text-gray-500 text-xs p-2">Nenhuma obrigação salva. Use o botão <strong>Salvar</strong> ao lado de cada obrigação.</li>';
            return;
        }

        // Agrupa por data, em ordem cronológica
        const grouped = list.reduce((acc, o) => {
            (acc[o.date] = acc[o.date] || []).push(o);
            return acc;
        }, {});
        const sortedDates = Object.keys(grouped).sort((a, b) => parseBRDate(a) - parseBRDate(b));

        sortedDates.forEach(dateStr => {
            const status = getStatus(dateStr);
            const group = document.createElement('li');
            group.className = 'border-b border-gray-100 pb-2 last:border-b-0 last:pb-0';
            group.innerHTML = `
                <div class="flex items-baseline justify-between gap-2 px-2 pt-1">
                    <span class="text-xs font-semibold text-gray-700">${escapeHTML(dateStr)}</span>
                    <span class="text-[11px] ${status.className}">${escapeHTML(status.text)}</span>
                </div>
                <ul class="mt-1 space-y-0.5"></ul>
            `;
            const itemsList = group.querySelector('ul');

            grouped[dateStr].forEach(o => {
                const item = document.createElement('li');
                item.className = 'group flex items-start gap-1 rounded-md hover:bg-blue-50';
                const target = o.rowId || `dia-${dateStr.replace(/\//g, '-')}`;
                item.innerHTML = `
                    <a href="#${escapeHTML(target)}" class="saved-link min-w-0 flex-1 px-2 py-1.5 text-blue-700 group-hover:text-blue-900" data-row="${escapeHTML(o.rowId || '')}">
                        <span class="block font-medium leading-snug">${escapeHTML(o.title)}</span>
                        ${o.subtitle ? `<span class="block truncate text-xs text-gray-500" title="${escapeHTML(o.subtitle)}">${escapeHTML(o.subtitle)}</span>` : ''}
                    </a>
                    <button type="button" class="remove-saved-btn mt-1 mr-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-600" data-key="${escapeHTML(o.key || '')}" aria-label="Remover ${escapeHTML(o.title)} de ${escapeHTML(dateStr)}" title="Remover">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                `;
                itemsList.appendChild(item);
            });
            savedAgendaDaysList.appendChild(group);
        });

        // Remover todas
        const clearItem = document.createElement('li');
        clearItem.className = 'pt-2 text-right';
        clearItem.innerHTML = '<button type="button" id="clear-saved-btn" class="cursor-pointer text-xs font-medium text-gray-500 hover:text-red-600 hover:underline">Remover todas</button>';
        savedAgendaDaysList.appendChild(clearItem);
    }

    function refreshSavedUI() {
        renderSavedAgendaDays();
        updateSaveButtons();
        renderCalendar(); // marca no calendário os dias com obrigação salva
    }

    // Destaca a linha da obrigação ao clicar na lista de salvas
    function highlightRow(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;
        row.classList.add('bg-amber-50');
        setTimeout(() => row.classList.remove('bg-amber-50'), 2000);
    }

    // Aviso discreto no canto da tela (substitui o alert)
    let toastTimer = null;
    function showToast(message, type) {
        let toast = document.getElementById('agenda-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'agenda-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        const color = type === 'success' ? 'bg-emerald-700' : type === 'error' ? 'bg-red-700' : 'bg-slate-800';
        toast.className = `fixed right-4 bottom-4 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg transition ${color}`;
        toast.textContent = message;
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
    }

    // Delegação de eventos na lista de salvas (remover, remover todas e destacar)
    savedAgendaDaysList?.addEventListener('click', e => {
        const removeBtn = e.target.closest('.remove-saved-btn');
        if (removeBtn) {
            removeObligation(removeBtn.dataset.key);
            return;
        }
        if (e.target.closest('#clear-saved-btn')) {
            if (confirm('Remover todas as obrigações salvas?')) removeAllObligations();
            return;
        }
        const link = e.target.closest('.saved-link');
        if (link && link.dataset.row) highlightRow(link.dataset.row);
    });

    // --- Funções do Calendário ---
    async function loadAndRenderCalendar() {
        try {
            const response = await fetch('./agenda.json');
            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status}`);
            }
            allEvents = await response.json();

            // Meses que têm obrigações (a navegação fica limitada a eles)
            eventMonths = [...new Set(allEvents
                .map(e => parseBRDate(e.date))
                .filter(Boolean)
                .map(d => monthKey(d)))].sort();

            displayDate = pickInitialMonth();
            if (calendarDays && currentMonthYear) renderCalendar();
            observeDayHeadings();
        } catch (error) {
            console.error('Erro ao carregar eventos da agenda:', error);
            if (calendarSummary) calendarSummary.textContent = 'Não foi possível carregar o calendário.';
        }
    }

    function monthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    function toDateStr(date) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    // Abre no mês atual, se ele tiver obrigações; senão, no mês publicado mais próximo de hoje
    function pickInitialMonth() {
        const today = new Date();
        if (eventMonths.length === 0) return new Date(today.getFullYear(), today.getMonth(), 1);
        const current = monthKey(today);
        const chosen = eventMonths.includes(current)
            ? current
            : eventMonths.reduce((best, m) => {
                const dist = k => Math.abs(new Date(`${k}-01T00:00:00`) - today);
                return dist(m) < dist(best) ? m : best;
            });
        const [y, m] = chosen.split('-').map(Number);
        return new Date(y, m - 1, 1);
    }

    function renderCalendar() {
        if (!calendarDays || !currentMonthYear || !displayDate) return;
        calendarDays.innerHTML = '';

        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        currentMonthYear.textContent = `${monthNames[month]} ${year}`;

        // Setas só navegam entre os meses que têm obrigações
        const idx = eventMonths.indexOf(monthKey(displayDate));
        if (prevMonthBtn) prevMonthBtn.disabled = idx <= 0;
        if (nextMonthBtn) nextMonthBtn.disabled = idx === -1 || idx >= eventMonths.length - 1;

        const savedDates = new Set(readSaved().map(o => o.date));
        const todayStr = toDateStr(new Date());
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const frag = document.createDocumentFragment();
        let monthTotal = 0, monthDays = 0;

        for (let i = 0; i < firstDayOfWeek; i++) {
            frag.appendChild(document.createElement('span'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = toDateStr(date);
            const count = getEventsByDate(date).length;
            const isToday = dateStr === todayStr;
            const isSaved = savedDates.has(dateStr);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            let cell;
            if (count > 0) {
                monthTotal += count;
                monthDays++;
                const selected = dateStr === selectedDateStr;
                cell = document.createElement('button');
                cell.type = 'button';
                cell.dataset.date = dateStr;
                cell.className = 'relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg font-semibold transition ' +
                    (selected
                        ? 'bg-blue-900 text-white shadow-sm'
                        : 'bg-blue-50 text-blue-900 ring-1 ring-blue-200 hover:bg-blue-100');
                const label = `${dateStr}: ${count} ${count === 1 ? 'obrigação' : 'obrigações'}${isSaved ? ', com obrigação salva' : ''}`;
                cell.title = label;
                cell.setAttribute('aria-label', label);
                if (selected) cell.setAttribute('aria-current', 'date');
                cell.innerHTML = `
                    <span class="leading-none">${day}</span>
                    <span class="mt-0.5 text-[9px] leading-none font-medium ${selected ? 'text-blue-100' : 'text-blue-600'}">${count}</span>
                    ${isSaved ? '<span class="absolute top-1 right-1 size-1.5 rounded-full bg-amber-400" aria-hidden="true"></span>' : ''}
                `;
            } else {
                cell = document.createElement('span');
                cell.className = 'flex aspect-square items-center justify-center rounded-lg ' + (isWeekend ? 'text-slate-300' : 'text-slate-400');
                cell.textContent = day;
            }
            if (isToday) cell.classList.add('ring-2', 'ring-blue-600');
            frag.appendChild(cell);
        }
        calendarDays.appendChild(frag);

        if (calendarSummary) {
            calendarSummary.textContent = monthTotal > 0
                ? `${monthTotal} obrigações em ${monthDays} datas de vencimento. Clique em um dia para ir até ele.`
                : 'Nenhuma obrigação publicada para este mês.';
        }
    }

    // Seleciona um dia: rola até o cabeçalho do dia na agenda
    function goToDay(dateStr) {
        const heading = document.getElementById(`dia-${dateStr.replace(/\//g, '-')}`);
        if (!heading) return;
        // Se o filtro estiver escondendo o dia, limpa o filtro
        if (heading.style.display === 'none' && obligationFilterInput) {
            obligationFilterInput.value = '';
            applyAgendaFilters();
        }
        selectedDateStr = dateStr;
        ignoreScrollUntil = Date.now() + 1200; // a rolagem suave não deve trocar a seleção no caminho
        renderCalendar();
        history.replaceState(null, '', `#${heading.id}`);
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Ao rolar a agenda, o calendário acompanha o dia visível
    function observeDayHeadings() {
        if (!('IntersectionObserver' in window)) return;
        const headings = document.querySelectorAll('h1[id^="dia-"]');
        const observer = new IntersectionObserver(entries => {
            if (Date.now() < ignoreScrollUntil) return;
            const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (!visible) return;
            const dateStr = visible.target.id.replace('dia-', '').replace(/-/g, '/');
            if (dateStr === selectedDateStr) return;
            selectedDateStr = dateStr;
            const d = parseBRDate(dateStr);
            if (d && monthKey(d) === monthKey(displayDate)) renderCalendar();
        }, { rootMargin: '-140px 0px -60% 0px' });
        headings.forEach(h => observer.observe(h));
    }

    // --- Event Listeners ---
    calendarDays?.addEventListener('click', e => {
        const dayBtn = e.target.closest('button[data-date]');
        if (dayBtn) goToDay(dayBtn.dataset.date);
    });

    function changeMonth(step) {
        const idx = eventMonths.indexOf(monthKey(displayDate));
        const next = eventMonths[idx + step];
        if (!next) return;
        const [y, m] = next.split('-').map(Number);
        displayDate = new Date(y, m - 1, 1);
        renderCalendar();
    }
    prevMonthBtn?.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn?.addEventListener('click', () => changeMonth(1));

    // --- Botões "Salvar" da tabela: salvam ou removem a obrigação (alternam) ---
    saveButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleObligation(e.currentTarget);
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
    refreshSavedUI(); // Lista de obrigações salvas na lateral + estado dos botões "Salvar"
});