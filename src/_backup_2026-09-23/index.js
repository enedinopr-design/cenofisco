document.addEventListener('DOMContentLoaded', function () {
    // --- Global Header/Footer JS ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function() {
            mainMenu.classList.toggle('hidden');
        });
    }

    // --- Tab Logic (General) ---
    function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tab-button");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }
    window.openTab = openTab; // Expose to global scope

    // Estilo para as abas (moved from inline style tag)
    const style = document.createElement('style');
    style.innerHTML = `
        .tab-button {
            padding: 8px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-weight: 600;
            color: #4B5563; /* text-gray-600 */
            transition: all 0.2s;
        }
        .tab-button:hover {
            color: #2563EB; /* text-blue-600 */
        }
        .tab-button.active {
            color: #2563EB; /* text-blue-600 */
            border-bottom-color: #2563EB; /* border-blue-600 */
        }
    `;
    document.head.appendChild(style);

    // --- Tab Logic (Consultoria) ---
    function openConsultoriaTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("consultoria-tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("consultoria-tab-button");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }
    window.openConsultoriaTab = openConsultoriaTab; // Expose to global scope
    // Ativar a primeira aba de consultoria por padrão, se existir
    if (document.querySelector('.consultoria-tab-button.active')) {
        document.querySelector('.consultoria-tab-button.active').click();
    }

    // --- Tab Logic (Códigos) ---
    function openCodigosTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("codigos-tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("codigos-tab-button");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }
    window.openCodigosTab = openCodigosTab; // Expose to global scope
    if (document.querySelector('.codigos-tab-button.active')) {
        document.querySelector('.codigos-tab-button.active').click();
    }

    // --- Practical Tables Filtering ---
    const filtroInput = document.getElementById('tabelas-praticas-filtro');
    const lista = document.getElementById('tabelas-praticas-lista');
    const itens = Array.from(lista.getElementsByTagName('li'));

    function atualizarVisibilidade() {
        const termoBusca = filtroInput.value.toLowerCase();

        if (termoBusca) {
            itens.forEach(item => {
                const textoItem = item.textContent.toLowerCase();
                item.style.display = textoItem.includes(termoBusca) ? '' : 'none';
            });
        } else {
            // Only show the first 5 items if no search term
            itens.forEach((item, index) => {
                item.style.display = index < 5 ? '' : 'none';
            });
        }
    }

    filtroInput.addEventListener('input', atualizarVisibilidade);
    atualizarVisibilidade(); // Chama a função para o estado inicial

    // --- Podcast Player Logic ---
    const audio = document.getElementById('podcast-audio');
    const playPauseBtn = document.getElementById('play-pause-btn'); // This element is missing in HTML, assuming it's `play-icon` and `pause-icon` combined
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');

    // Format time helper
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Play/Pause
    if (playIcon && pauseIcon && audio) {
        playIcon.addEventListener('click', () => {
            audio.play();
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        });
        pauseIcon.addEventListener('click', () => {
            audio.pause();
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        });

        // Update progress bar
        audio.addEventListener('timeupdate', () => {
            const progressPercent = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        });

        // Set duration on metadata load
        audio.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audio.duration);
        });

        // Seek
        progressContainer.addEventListener('click', (e) => {
            const width = progressContainer.clientWidth;
            const clickX = e.offsetX;
            const duration = audio.duration;
            audio.currentTime = (clickX / width) * duration;
        });

        // Reset when audio ends
        audio.addEventListener('ended', () => {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        });
    }

    // --- Image Slider Logic ---
    const sliderImagesContainer = document.querySelector('#image-slider .slider-images');
    const images = document.querySelectorAll('#image-slider .slider-images img');
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');
    const dots = document.querySelectorAll('#image-slider .dot');

    let currentIndex = 0;
    const totalImages = images.length;
    let isDragging = false,
        startPos = 0,
        currentTranslate = 0,
        prevTranslate = 0;

    if (sliderImagesContainer && images.length > 0) {
        function updateSlider() {
            const translateX = -currentIndex * (100 / totalImages);
            sliderImagesContainer.style.transform = `translateX(${translateX}%)`;
            dots.forEach((dot, index) => {
                if (index === currentIndex) {
                    dot.classList.add('opacity-100');
                    dot.classList.remove('opacity-50');
                } else {
                    dot.classList.remove('opacity-100');
                    dot.classList.add('opacity-50');
                }
            });
        }

        // Define a largura total do contêiner de imagens para acomodar todas as imagens
        sliderImagesContainer.style.width = `${totalImages * 100}%`;
        images.forEach(img => {
            img.style.width = `${100 / totalImages}%`;
        });

        function showNextSlide() {
            currentIndex = (currentIndex + 1) % totalImages;
            updateSlider();
        }

        function showPrevSlide() {
            currentIndex = (currentIndex - 1 + totalImages) % totalImages;
            updateSlider();
        }

        prevBtn.addEventListener('click', showPrevSlide);
        nextBtn.addEventListener('click', showNextSlide);

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                currentIndex = parseInt(e.target.dataset.slide);
                updateSlider();
            });
        });

        // --- Swipe/Drag Logic ---
        sliderImagesContainer.addEventListener('mousedown', dragStart);
        sliderImagesContainer.addEventListener('touchstart', dragStart);

        sliderImagesContainer.addEventListener('mouseup', dragEnd);
        sliderImagesContainer.addEventListener('touchend', dragEnd);

        sliderImagesContainer.addEventListener('mouseleave', dragEnd);

        sliderImagesContainer.addEventListener('mousemove', drag);
        sliderImagesContainer.addEventListener('touchmove', drag);

        function getPositionX(event) {
            return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        }

        function dragStart(event) {
            isDragging = true;
            startPos = getPositionX(event);
            sliderImagesContainer.classList.remove('transition-transform'); // Remove a transição para o arrastar ser instantâneo
        }

        function drag(event) {
            if (isDragging) {
                const currentPosition = getPositionX(event);
                // Calcula o movimento e converte para percentual da largura do slider
                const move = (currentPosition - startPos) / sliderImagesContainer.parentElement.offsetWidth * 100;
                currentTranslate = prevTranslate + move;
                sliderImagesContainer.style.transform = `translateX(${currentTranslate}%)`;
            }
        }

        function dragEnd() {
            if (!isDragging) return;
            isDragging = false;
            const movedBy = currentTranslate - prevTranslate;

            // Se moveu mais de 20% para a direita ou esquerda, muda o slide
            if (movedBy < -20 && currentIndex < totalImages - 1) {
                currentIndex += 1;
            }

            if (movedBy > 20 && currentIndex > 0) {
                currentIndex -= 1;
            }

            // Volta para a posição correta com transição
            sliderImagesContainer.classList.add('transition-transform');
            const targetTranslate = -currentIndex * (100 / totalImages);
            sliderImagesContainer.style.transform = `translateX(${targetTranslate}%)`;
            prevTranslate = targetTranslate;
            updateSlider(); // Atualiza os dots
        }

        // Initial state
        updateSlider();
    }

    // --- Legislation Filtering Logic ---
    // Load legislation data from JSON file
    fetch('./legislacao.json')
        .then(response => response.json())
        .then(legislacaoData => {
            let allLegislacaoData = legislacaoData;
            const legislacaoArticlesContainer = document.getElementById('legislacao-articles');
            const legislacaoCheckboxes = document.querySelectorAll('input[name="legislacao_tipo"]');
            const advEstadoSelect = document.getElementById('adv-estado');
            const advAreaSelect = document.getElementById('adv-area');
            const advMunicipioSelect = document.getElementById('adv-municipio');
            const advTipoPublicacaoSelect = document.getElementById('adv-tipo-publicacao');

            // Helper function to parse date string DD/MM/YYYY (already exists in agenda-obrigacoes.js)
            const parseDate = (dateStr) => {
                const [day, month, year] = dateStr.trim().split('/');
                return new Date(`${year}-${month}-${day}`);
            };

            // Populate state, area, and tipo_de_publicacao selects
            const uniqueEstados = new Set();
            const uniqueAreas = new Set();
            const uniqueMunicipios = new Set();
            const uniqueTiposPublicacao = new Set();

            allLegislacaoData.forEach(item => {
                if (item.estado) uniqueEstados.add(item.estado);
                if (item.area) uniqueAreas.add(item.area);
                if (item.tipo_de_publicacao) uniqueTiposPublicacao.add(item.tipo_de_publicacao);
                if (item.municipio) uniqueMunicipios.add(item.municipio);
            });

            advEstadoSelect.innerHTML = '<option value="">Todos</option>';
            Array.from(uniqueEstados).sort().forEach(estado => {
                const option = document.createElement('option');
                option.value = estado;
                option.textContent = estado;
                advEstadoSelect.appendChild(option);
            });

            advAreaSelect.innerHTML = '<option value="">Todas</option>';
            Array.from(uniqueAreas).sort().forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                advAreaSelect.appendChild(option);
            });

            advMunicipioSelect.innerHTML = '<option value="">Todos</option>';
            Array.from(uniqueMunicipios).sort().forEach(municipio => {
                const option = document.createElement('option');
                option.value = municipio;
                option.textContent = municipio;
                advMunicipioSelect.appendChild(option);
            });

            advTipoPublicacaoSelect.innerHTML = '<option value="">Todas</option>';
            Array.from(uniqueTiposPublicacao).sort().forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo;
                option.textContent = tipo;
                advTipoPublicacaoSelect.appendChild(option);
            });

            function saveAccessedLegislation(item) {
                let accessed = JSON.parse(localStorage.getItem('recentlyAccessed')) || [];
                accessed = accessed.filter(i => i.title !== item.title);
                accessed.unshift(item);
                if (accessed.length > 5) {
                    accessed.pop();
                }
                localStorage.setItem('recentlyAccessed', JSON.stringify(accessed));
            }

            function renderLegislacao(dataToRender) {
                legislacaoArticlesContainer.innerHTML = ''; // Clear previous articles
                dataToRender.forEach(item => {
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
                    if (item.area) metaInfoParts.push(item.area);
                    if (item.tipo_de_publicacao) metaInfoParts.push(item.tipo_de_publicacao);

                    let metaInfoHtml = metaInfoParts.length > 0 ? `<span class="mx-1">|</span> ${metaInfoParts.join(' <span class="mx-1">|</span> ')}` : '';

                    article.innerHTML = `
                        <span class="text-xs font-semibold ${colorClass} uppercase">${typeLabel}</span>
                        <a href="${item.link}" class="text-lg font-semibold hover:text-blue-600 cursor-pointer block">${item.title}</a>
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
                        });
                    }
                    legislacaoArticlesContainer.appendChild(article);
                });
            }

            function applyAllFilters() {
                let filteredData = [...allLegislacaoData]; // Start with a copy of all data

                // 1. Filter by type checkboxes (Federal, Estadual, Municipal)
                const advMunicipioContainer = document.getElementById('adv-municipio-container');
                const checkedTypes = Array.from(legislacaoCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
                if (checkedTypes.length > 0) {
                    filteredData = filteredData.filter(item => checkedTypes.includes(item.type));
                }

                // Show/hide municipio filter
                if (checkedTypes.includes('municipal')) {
                    advMunicipioContainer.classList.remove('hidden');
                } else {
                    advMunicipioContainer.classList.add('hidden');
                    advMunicipioSelect.value = ''; // Reset municipio filter if not visible
                }

                // 2. Filter by advanced search criteria
                const numero = document.getElementById('adv-numero-decreto').value.toLowerCase();
                const selectedArea = advAreaSelect.value;
                const selectedTipoPublicacao = advTipoPublicacaoSelect.value;
                const selectedEstado = advEstadoSelect.value;
                const dataDe = document.getElementById('adv-data-de').value;
                const dataAte = document.getElementById('adv-data-ate').value;
                const selectedMunicipio = advMunicipioSelect.value;

                filteredData = filteredData.filter(item => {
                    const title = item.title.toLowerCase();
                    const itemArea = item.area ? item.area.toLowerCase() : '';
                    const itemTipoPublicacao = item.tipo_de_publicacao ? item.tipo_de_publicacao.toLowerCase() : '';
                    const itemEstado = item.estado ? item.estado.toLowerCase() : '';
                    const itemMunicipio = item.municipio ? item.municipio.toLowerCase() : '';

                    // Convert item.date (DD/MM/YYYY) to YYYY-MM-DD for comparison
                    let itemDateFormatted = '';
                    if (item.date) {
                        const [day, month, year] = item.date.trim().split('/');
                        itemDateFormatted = `${year}-${month}-${day}`;
                    }

                    let match = true;

                    if (numero && !title.includes(numero)) match = false;
                    if (selectedArea && itemArea !== selectedArea.toLowerCase()) match = false;
                    if (selectedTipoPublicacao && itemTipoPublicacao !== selectedTipoPublicacao.toLowerCase()) match = false;
                    if (selectedEstado && itemEstado !== selectedEstado.toLowerCase()) match = false;
                    if (dataDe && itemDateFormatted < dataDe) match = false;
                    if (selectedMunicipio && itemMunicipio !== selectedMunicipio.toLowerCase()) match = false;
                    if (dataAte && itemDateFormatted > dataAte) match = false;

                    return match;
                });

                // 3. Sort by date descending
                filteredData.sort((a, b) => parseDate(b.date) - parseDate(a.date));

                // 4. Limit to the last 5 norms
                const finalData = filteredData.slice(0, 5);

                renderLegislacao(finalData);
            }

            // Event listeners for filters
            legislacaoCheckboxes.forEach(cb => cb.addEventListener('change', applyAllFilters));
            advAreaSelect.addEventListener('change', applyAllFilters);
            advTipoPublicacaoSelect.addEventListener('change', applyAllFilters);
            advEstadoSelect.addEventListener('change', applyAllFilters);
            advMunicipioSelect.addEventListener('change', applyAllFilters);

            applyAllFilters(); // Initial render

            // Busca Avançada logic
            const btnBuscaAvancada = document.getElementById('busca-avancada-btn');
            const secaoBuscaAvancada = document.getElementById('legislacao-busca-avancada');
            const btnAplicarAvancada = document.getElementById('adv-aplicar');
            const btnLimparAvancada = document.getElementById('adv-limpar');

            btnBuscaAvancada.addEventListener('click', () => {
                secaoBuscaAvancada.classList.toggle('hidden');
            });

            btnAplicarAvancada.addEventListener('click', () => {
                applyAllFilters();
            });

            btnLimparAvancada.addEventListener('click', () => {
                document.getElementById('adv-numero-decreto').value = '';
                document.getElementById('adv-area').value = '';
                document.getElementById('adv-tipo-publicacao').value = '';
                document.getElementById('adv-municipio').value = '';
                document.getElementById('adv-estado').value = '';
                document.getElementById('adv-data-de').value = '';
                document.getElementById('adv-data-ate').value = '';
                applyAllFilters(); // Re-apply filters after clearing
            });
        })
        .catch(error => console.error('Erro ao carregar legislação:', error));

    // --- Calendar Logic ---
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const eventPopup = document.getElementById('eventDetailsPopup');
    const eventDateEl = document.getElementById('eventDate');
    const eventListEl = document.getElementById('eventList');
    const closeEventDetailsBtn = document.getElementById('closeEventDetails');

    let allEvents = []; // Store all events loaded from JSON

    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Fetch and process events
    async function loadAgendaEvents() {
        try {
            const response = await fetch('./agenda.json'); // Changed to agenda.json
            allEvents = await response.json();
            renderCalendar();
        } catch (error) {
            console.error('Erro ao carregar eventos da agenda:', error);
        }
    }

    function parseBRDate(dateStr) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
    }

    function getEventsByDate(date) {
        const dateFormatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        return allEvents.filter(event => event.date === dateFormatted);
    }

    function renderCalendar() {
        calendarDays.innerHTML = '';
        eventPopup.classList.add('hidden');
        currentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay();

        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'p-2 text-center text-gray-400';
            calendarDays.appendChild(emptyDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'p-2 text-center rounded-md cursor-pointer hover:bg-blue-50 transition';
            dayDiv.textContent = day;

            const dateStr = `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
            const dayEvents = getEventsByDate(parseBRDate(dateStr));

            if (dayEvents.length > 0) {
                dayDiv.classList.add('has-event', 'font-bold');
                dayDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showEventDetailsPopup(dateStr, dayEvents, e.target);
                });
            }

            const today = new Date();
            if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                dayDiv.classList.add('bg-blue-600', 'text-white');
                dayDiv.classList.remove('hover:bg-blue-50');
            } else {
                dayDiv.classList.add('text-gray-700');
            }
            calendarDays.appendChild(dayDiv);
        }
    }

    function showEventDetailsPopup(dateStr, events, element) {
        eventDateEl.textContent = dateStr;
        eventListEl.innerHTML = '';
        events.forEach(event => {
            const li = document.createElement('li');
            li.innerHTML = `${event.title}<br><span class="text-xs">${event.description}</span>`;
            eventListEl.appendChild(li);
        });

        eventPopup.classList.remove('hidden');

        const rect = element.getBoundingClientRect();
        const popupWidth = eventPopup.offsetWidth;
        const viewportWidth = window.innerWidth;

        let left = rect.left;
        let top = rect.bottom + window.scrollY;

        if (left + popupWidth > viewportWidth) {
            left = viewportWidth - popupWidth - 10;
        }
        if (left < 10) {
            left = 10;
        }

        eventPopup.style.top = top + 'px';
        eventPopup.style.left = left + 'px';
    }

    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    closeEventDetailsBtn.addEventListener('click', () => {
        eventPopup.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!eventPopup.contains(e.target) && !e.target.classList.contains('has-event')) {
            eventPopup.classList.add('hidden');
        }
    });

    loadAgendaEvents(); // Initial load of events and calendar render
});