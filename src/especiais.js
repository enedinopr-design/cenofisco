document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('especiais-list');
    const searchInput = document.getElementById('especial-search');
    const areaFilters = document.getElementById('area-filters');
    const resultCount = document.getElementById('result-count');

    // Cores por área (mesmas dos banners dos especiais)
    const areaStyles = {
        'Tributário': { badge: 'bg-emerald-50 text-emerald-700', banner: 'from-emerald-500 to-emerald-700' },
        'Trabalhista e Previdenciário': { badge: 'bg-orange-50 text-orange-700', banner: 'from-orange-500 to-orange-600' },
        'Contábil': { badge: 'bg-sky-50 text-sky-700', banner: 'from-sky-600 to-sky-800' },
        'Federal': { badge: 'bg-blue-50 text-blue-700', banner: 'from-blue-800 to-blue-950' }
    };
    const defaultStyle = { badge: 'bg-slate-100 text-slate-700', banner: 'from-slate-600 to-slate-800' };

    let allEspeciais = [];
    let selectedArea = 'todas';

    fetch('./especiais.json')
        .then(response => response.json())
        .then(data => {
            allEspeciais = data;
            // Busca vinda de outro lugar (ex.: slider da home: especiais.html?q=DIRPF)
            const q = new URLSearchParams(window.location.search).get('q');
            if (q) searchInput.value = q;
            renderAreaFilters();
            applyFilters();
        })
        .catch(error => {
            console.error('Erro ao carregar especiais:', error);
            list.innerHTML = '<p class="col-span-full text-red-500">Não foi possível carregar os especiais.</p>';
        });

    function renderAreaFilters() {
        const areas = [...new Set(allEspeciais.map(item => item.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const options = [{ value: 'todas', label: 'Todas' }].concat(areas.map(a => ({ value: a, label: a })));

        areaFilters.innerHTML = '';
        options.forEach(opt => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.area = opt.value;
            button.textContent = opt.label;
            button.addEventListener('click', () => {
                selectedArea = opt.value;
                applyFilters();
            });
            areaFilters.appendChild(button);
        });
    }

    function updateAreaButtons() {
        areaFilters.querySelectorAll('button').forEach(button => {
            const active = button.dataset.area === selectedArea;
            button.setAttribute('aria-pressed', String(active));
            button.className = 'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition ' +
                (active
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-blue-900');
        });
    }

    function normalize(text) {
        return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    function applyFilters() {
        const term = normalize(searchInput.value.trim());

        const filtered = allEspeciais.filter(item => {
            const matchesSearch = !term ||
                normalize(item.title).includes(term) ||
                normalize(item.sigla).includes(term) ||
                normalize(item.summary).includes(term);
            const matchesArea = selectedArea === 'todas' || item.area === selectedArea;
            return matchesSearch && matchesArea;
        });

        updateAreaButtons();
        render(filtered);
    }

    function render(items) {
        list.innerHTML = '';
        resultCount.textContent = items.length === 1 ? '1 especial' : `${items.length} especiais`;

        if (items.length === 0) {
            list.innerHTML = '<p class="col-span-full py-10 text-center text-slate-500">Nenhum especial encontrado com os filtros selecionados.</p>';
            return;
        }

        items.forEach(item => {
            const style = areaStyles[item.area] || defaultStyle;
            const available = item.link && item.link !== '#';

            const card = document.createElement(available ? 'a' : 'div');
            card.className = 'group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition' +
                (available ? ' hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5' : '');
            if (available) card.href = item.link;

            const banner = item.image
                ? `<img src="${item.image}" alt="" loading="lazy" class="aspect-[550/250] w-full object-cover">`
                : `<div class="flex aspect-[550/250] w-full flex-col items-center justify-center bg-gradient-to-br ${style.banner} px-4 text-center text-white">
                       <span class="text-xl font-medium">Especial</span>
                       <span class="text-5xl leading-tight font-bold tracking-tight">${item.sigla}</span>
                       <span class="mt-1 h-1.5 w-1/2 bg-amber-400" aria-hidden="true"></span>
                       <span class="mt-3 text-sm">${item.area}</span>
                   </div>`;

            const meta = [];
            if (item.chapters) meta.push(`${item.chapters} capítulos`);
            if (item.updated) meta.push(`Atualizado em ${item.updated}`);

            const footer = available
                ? `<span class="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition-colors group-hover:text-blue-900">Acessar especial <i class="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-0.5" aria-hidden="true"></i></span>`
                : `<span class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400"><i class="fa-regular fa-clock text-xs" aria-hidden="true"></i>Em breve</span>`;

            card.innerHTML = `
                ${banner}
                <div class="flex flex-1 flex-col p-5">
                    <span class="self-start rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${style.badge}">${item.area}</span>
                    <h2 class="mt-3 mb-2 text-lg leading-snug font-semibold text-slate-900 ${available ? 'group-hover:text-blue-700' : ''}">${item.title}</h2>
                    <p class="mb-4 text-sm leading-relaxed text-slate-600">${item.summary}</p>
                    <div class="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <span class="text-xs text-slate-500">${meta.join(' · ')}</span>
                        ${footer}
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    searchInput.addEventListener('input', applyFilters);

    // Menu mobile
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');
    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', () => {
            const hidden = mainMenu.classList.toggle('hidden');
            menuToggle.setAttribute('aria-expanded', String(!hidden));
        });
    }
});
