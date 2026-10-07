/**
 * Cenofisco — scripts da Home (index.html)
 *
 * Também é carregado por meu-perfil.html e buscafiscal-resultados.html,
 * por isso cada módulo verifica se os elementos existem antes de rodar.
 */
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const UFS = [
        { uf: 'AC', nome: 'Acre', bandeira: 'acre' },
        { uf: 'AL', nome: 'Alagoas', bandeira: 'alagoas' },
        { uf: 'AP', nome: 'Amapá', bandeira: 'amapa' },
        { uf: 'AM', nome: 'Amazonas', bandeira: 'amazonas' },
        { uf: 'BA', nome: 'Bahia', bandeira: 'bahia' },
        { uf: 'CE', nome: 'Ceará', bandeira: 'ceara' },
        { uf: 'DF', nome: 'Distrito Federal', bandeira: 'df' },
        { uf: 'ES', nome: 'Espírito Santo', bandeira: 'espiritosanto' },
        { uf: 'GO', nome: 'Goiás', bandeira: 'goias' },
        { uf: 'MA', nome: 'Maranhão', bandeira: 'maranhao' },
        { uf: 'MT', nome: 'Mato Grosso', bandeira: 'matogrosso' },
        { uf: 'MS', nome: 'Mato Grosso do Sul', bandeira: 'matogrossodosul' },
        { uf: 'MG', nome: 'Minas Gerais', bandeira: 'minasgerais' },
        { uf: 'PA', nome: 'Pará', bandeira: 'para' },
        { uf: 'PB', nome: 'Paraíba', bandeira: 'paraiba' },
        { uf: 'PR', nome: 'Paraná', bandeira: 'parana', link: 'regulamento-pr.html' },
        { uf: 'PE', nome: 'Pernambuco', bandeira: 'pernambuco' },
        { uf: 'PI', nome: 'Piauí', bandeira: 'piaui' },
        { uf: 'RJ', nome: 'Rio de Janeiro', bandeira: 'riodejaneiro' },
        { uf: 'RN', nome: 'Rio Grande do Norte', bandeira: 'riograndedonorte' },
        { uf: 'RS', nome: 'Rio Grande do Sul', bandeira: 'riograndedosul' },
        { uf: 'RO', nome: 'Rondônia', bandeira: 'rondonia' },
        { uf: 'RR', nome: 'Roraima', bandeira: 'roraima' },
        { uf: 'SC', nome: 'Santa Catarina', bandeira: 'santacatarina' },
        { uf: 'SP', nome: 'São Paulo', bandeira: 'saopaulo' },
        { uf: 'SE', nome: 'Sergipe', bandeira: 'sergipe' },
        { uf: 'TO', nome: 'Tocantins', bandeira: 'tocantins' }
    ];

    const CAPITAIS = [
        { uf: 'AC', nome: 'Rio Branco' }, { uf: 'AL', nome: 'Maceió' },
        { uf: 'AP', nome: 'Macapá' }, { uf: 'AM', nome: 'Manaus' },
        { uf: 'BA', nome: 'Salvador' }, { uf: 'CE', nome: 'Fortaleza' },
        { uf: 'DF', nome: 'Brasília' }, { uf: 'ES', nome: 'Vitória' },
        { uf: 'GO', nome: 'Goiânia' }, { uf: 'MA', nome: 'São Luís' },
        { uf: 'MT', nome: 'Cuiabá' }, { uf: 'MS', nome: 'Campo Grande' },
        { uf: 'MG', nome: 'Belo Horizonte' }, { uf: 'PA', nome: 'Belém' },
        { uf: 'PB', nome: 'João Pessoa' }, { uf: 'PR', nome: 'Curitiba' },
        { uf: 'PE', nome: 'Recife' }, { uf: 'PI', nome: 'Teresina' },
        { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Natal' },
        { uf: 'RS', nome: 'Porto Alegre' }, { uf: 'RO', nome: 'Porto Velho' },
        { uf: 'RR', nome: 'Boa Vista' }, { uf: 'SC', nome: 'Florianópolis' },
        { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Aracaju' },
        { uf: 'TO', nome: 'Palmas' }
    ];

    // Evita injeção de HTML ao montar conteúdo vindo de JSON
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[ch]);
    }

    /* ------------------------------------------------------------------
     * Menu mobile
     * ------------------------------------------------------------------ */
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');
    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function () {
            const isHidden = mainMenu.classList.toggle('hidden');
            menuToggle.setAttribute('aria-expanded', String(!isHidden));
        });
    }

    /* ------------------------------------------------------------------
     * Abas
     * Cada grupo de abas funciona de forma independente. (Antes, clicar em
     * uma aba de Notícias removia o destaque das abas de Consultoria e
     * Códigos, pois todas compartilhavam a classe .tab-button.)
     * ------------------------------------------------------------------ */
    function activateTab(button, panelId, contentClass) {
        const panel = document.getElementById(panelId);
        if (!button || !panel) return;

        const group = button.closest('[role="tablist"], nav') || button.parentElement;
        $$('.tab-button', group).forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        button.setAttribute('tabindex', '0');

        Array.from(panel.parentElement.children)
            .filter(el => el.classList.contains(contentClass))
            .forEach(el => {
                el.classList.add('hidden');
                el.style.display = '';
            });
        panel.classList.remove('hidden');
    }

    window.openTab = (evt, id) => activateTab(evt.currentTarget, id, 'tab-content');
    window.openConsultoriaTab = (evt, id) => activateTab(evt.currentTarget, id, 'consultoria-tab-content');
    window.openCodigosTab = (evt, id) => activateTab(evt.currentTarget, id, 'codigos-tab-content');

    // Estado inicial de ARIA + navegação por teclado (setas ←/→, Home, End)
    $$('[role="tablist"]').forEach(list => {
        const tabs = $$('[role="tab"]', list);
        tabs.forEach(tab => {
            const active = tab.classList.contains('active');
            tab.setAttribute('aria-selected', String(active));
            tab.setAttribute('tabindex', active ? '0' : '-1');
        });
        list.addEventListener('keydown', e => {
            const i = tabs.indexOf(document.activeElement);
            if (i < 0) return;
            let next = null;
            if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
            if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
            if (e.key === 'Home') next = tabs[0];
            if (e.key === 'End') next = tabs[tabs.length - 1];
            if (next) {
                e.preventDefault();
                next.focus();
                next.click();
            }
        });
    });

    /* ------------------------------------------------------------------
     * Listas que rolam na horizontal (abas e áreas da consultoria):
     * data-overflow="start|end|both" esmaece a borda onde ainda há conteúdo,
     * indicando que dá para rolar (estilo em input.css). Sem rolagem, nada muda.
     * ------------------------------------------------------------------ */
    const scrollHints = $$('.cf-tabs, [data-scroll-hint]');
    if (scrollHints.length) {
        const updateHint = el => {
            const max = el.scrollWidth - el.clientWidth;
            if (max <= 1) { el.removeAttribute('data-overflow'); return; }
            const atStart = el.scrollLeft <= 1;
            const atEnd = el.scrollLeft >= max - 1;
            el.dataset.overflow = atStart ? 'end' : atEnd ? 'start' : 'both';
        };
        scrollHints.forEach(el => {
            el.addEventListener('scroll', () => updateHint(el), { passive: true });
            updateHint(el);
        });
        if ('ResizeObserver' in window) {
            const ro = new ResizeObserver(entries => entries.forEach(entry => updateHint(entry.target)));
            scrollHints.forEach(el => ro.observe(el));
        }
    }

    /* ------------------------------------------------------------------
     * Busca global (placeholder até existir página de resultados)
     * ------------------------------------------------------------------ */
    const globalSearchForm = document.getElementById('globalSearchForm');
    if (globalSearchForm) {
        globalSearchForm.addEventListener('submit', e => {
            const input = document.getElementById('globalSearch');
            if (!input || !input.value.trim()) {
                e.preventDefault();
                input && input.focus();
            }
        });
    }

    /* ------------------------------------------------------------------
     * Selects de UF (Busca Fiscal › ICMS)
     * ------------------------------------------------------------------ */
    $$('.js-uf-select').forEach(select => {
        UFS.forEach(({ uf, nome }) => select.add(new Option(nome, uf)));
    });

    /* ------------------------------------------------------------------
     * Regulamentos Estaduais (bandeiras)
     * ------------------------------------------------------------------ */
    const regulamentosEstados = document.getElementById('regulamentos-estados');
    if (regulamentosEstados) {
        regulamentosEstados.innerHTML = UFS.map(({ uf, nome, bandeira, link }) => `
            <a href="${link || `regulamentos.html?esfera=estadual&uf=${uf}`}" class="group state-item" title="Regulamento do ICMS – ${nome}" aria-label="Regulamento do ICMS – ${nome}">
                <span class="state-abbr rounded-md bg-slate-100 text-xs font-semibold text-slate-600 transition-all duration-300 group-hover:scale-90 group-hover:opacity-0 group-focus-visible:opacity-0">${uf}</span>
                <img class="state-flag rounded-md object-cover shadow-sm transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" src="img/bandeiras/${bandeira}.png" alt="" loading="lazy">
            </a>`).join('');
    }

    /* ------------------------------------------------------------------
     * Tabelas Práticas — filtro + "ver todas"
     * ------------------------------------------------------------------ */
    const filtroInput = document.getElementById('tabelas-praticas-filtro');
    const lista = document.getElementById('tabelas-praticas-lista');
    if (filtroInput && lista) {
        const itens = Array.from(lista.getElementsByTagName('li'));
        const vazio = document.getElementById('tabelas-praticas-vazio');
        const toggle = document.getElementById('tabelas-praticas-toggle');
        const LIMITE_INICIAL = 5;
        let expandido = false;

        const normalizar = txt => txt.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

        function atualizarVisibilidade() {
            const termo = normalizar(filtroInput.value.trim());
            let visiveis = 0;

            itens.forEach((item, index) => {
                const mostrar = termo
                    ? normalizar(item.textContent).includes(termo)
                    : (expandido || index < LIMITE_INICIAL);
                item.style.display = mostrar ? '' : 'none';
                if (mostrar) visiveis++;
            });

            if (vazio) vazio.classList.toggle('hidden', visiveis > 0);
            if (toggle) {
                toggle.classList.toggle('hidden', Boolean(termo));
                toggle.textContent = expandido ? 'Mostrar menos' : `Ver todas as tabelas (${itens.length})`;
            }
        }

        filtroInput.addEventListener('input', atualizarVisibilidade);
        if (toggle) {
            toggle.addEventListener('click', () => {
                expandido = !expandido;
                atualizarVisibilidade();
            });
        }
        atualizarVisibilidade();
    }

    /* ------------------------------------------------------------------
     * Player do podcast
     * ------------------------------------------------------------------ */
    const audio = document.getElementById('podcast-audio');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    if (audio && playIcon && pauseIcon) {
        const setPlaying = playing => {
            playIcon.classList.toggle('hidden', playing);
            playIcon.classList.toggle('inline-flex', !playing);
            pauseIcon.classList.toggle('hidden', !playing);
            pauseIcon.classList.toggle('inline-flex', playing);
        };

        playIcon.addEventListener('click', () => {
            audio.play().then(() => {
                setPlaying(true);
                pauseIcon.focus();
            }).catch(err => console.error('Não foi possível reproduzir o áudio:', err));
        });
        pauseIcon.addEventListener('click', () => {
            audio.pause();
            setPlaying(false);
            playIcon.focus();
        });
        audio.addEventListener('ended', () => setPlaying(false));

        audio.addEventListener('timeupdate', () => {
            const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressContainer) progressContainer.setAttribute('aria-valuenow', String(Math.round(pct)));
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        });
        audio.addEventListener('loadedmetadata', () => {
            if (durationEl) durationEl.textContent = formatTime(audio.duration);
        });

        if (progressContainer) {
            progressContainer.addEventListener('click', e => {
                if (!audio.duration) return;
                const rect = progressContainer.getBoundingClientRect();
                audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
            });
            // Teclado: ←/→ avançam ou voltam 10 segundos
            progressContainer.addEventListener('keydown', e => {
                if (!audio.duration) return;
                if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
                if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 10);
            });
        }

        const shareBtn = document.getElementById('podcast-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const data = { title: 'Cenofisco Orienta', url: window.location.href };
                try {
                    if (navigator.share) await navigator.share(data);
                    else if (navigator.clipboard) await navigator.clipboard.writeText(data.url);
                } catch (_) { /* compartilhamento cancelado pelo usuário */ }
            });
        }
    }

    /* ------------------------------------------------------------------
     * Slider de Especiais (setas, indicadores, arrastar e autoplay)
     * ------------------------------------------------------------------ */
    const slider = document.getElementById('image-slider');
    const sliderTrack = slider && $('.slider-images', slider);
    // Cada slide é um filho direto da trilha (link com a imagem do especial)
    const slides = sliderTrack ? Array.from(sliderTrack.children) : [];

    if (sliderTrack && slides.length > 0) {
        const total = slides.length;
        const dots = $$('#slider-dots .dot');
        const prevBtn = document.getElementById('prev-slide');
        const nextBtn = document.getElementById('next-slide');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let index = 0;
        let autoplay = null;

        sliderTrack.style.width = `${total * 100}%`;
        slides.forEach(slide => { slide.style.width = `${100 / total}%`; });

        function goTo(i) {
            index = (i + total) % total;
            sliderTrack.style.transform = `translateX(${-index * (100 / total)}%)`;
            dots.forEach((dot, d) => {
                const active = d === index;
                dot.classList.toggle('w-5', active);
                dot.classList.toggle('bg-blue-900', active);
                dot.classList.toggle('w-2', !active);
                dot.classList.toggle('bg-slate-300', !active);
                dot.setAttribute('aria-current', d === index ? 'true' : 'false');
            });
        }

        const startAutoplay = () => {
            if (reduceMotion || autoplay) return;
            autoplay = setInterval(() => goTo(index + 1), 6000);
        };
        const stopAutoplay = () => { clearInterval(autoplay); autoplay = null; };

        if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));
        dots.forEach(dot => dot.addEventListener('click', () => goTo(parseInt(dot.dataset.slide, 10))));

        slider.addEventListener('mouseenter', stopAutoplay);
        slider.addEventListener('mouseleave', startAutoplay);
        slider.addEventListener('focusin', stopAutoplay);
        slider.addEventListener('focusout', startAutoplay);

        // Arrastar (mouse e toque)
        let dragging = false, startX = 0, deltaPct = 0;
        const pointX = e => (e.touches ? e.touches[0].clientX : e.clientX);

        function dragStart(e) {
            dragging = true;
            startX = pointX(e);
            deltaPct = 0;
            sliderTrack.classList.remove('transition-transform');
            stopAutoplay();
        }
        function dragMove(e) {
            if (!dragging) return;
            deltaPct = ((pointX(e) - startX) / slider.offsetWidth) * 100;
            const base = -index * 100;
            sliderTrack.style.transform = `translateX(${(base + deltaPct) / total}%)`;
        }
        function dragEnd() {
            if (!dragging) return;
            dragging = false;
            sliderTrack.classList.add('transition-transform');
            if (deltaPct < -20) goTo(index + 1);
            else if (deltaPct > 20) goTo(index - 1);
            else goTo(index);
        }

        sliderTrack.addEventListener('mousedown', dragStart);
        sliderTrack.addEventListener('touchstart', dragStart, { passive: true });
        window.addEventListener('mousemove', dragMove);
        sliderTrack.addEventListener('touchmove', dragMove, { passive: true });
        window.addEventListener('mouseup', dragEnd);
        sliderTrack.addEventListener('touchend', dragEnd);

        // Arrastar não deve abrir o especial do slide
        sliderTrack.addEventListener('click', e => {
            if (Math.abs(deltaPct) > 3) e.preventDefault();
        });

        goTo(0);
        startAutoplay();
    }

    /* ------------------------------------------------------------------
     * Slider de banners da lateral (setas, indicadores, arrastar e autoplay)
     * ------------------------------------------------------------------ */
    const bannerSlider = document.getElementById('banner-slider');
    const bannerTrack = bannerSlider && $('.banner-track', bannerSlider);
    const bannerSlides = bannerTrack ? Array.from(bannerTrack.children) : [];

    if (bannerTrack && bannerSlides.length > 0) {
        const total = bannerSlides.length;
        const dotsBox = $('.banner-dots', bannerSlider);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let index = 0;
        let autoplay = null;

        // Indicadores gerados conforme a quantidade de slides
        const dots = bannerSlides.map((_, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'h-1.5 cursor-pointer rounded-full transition-all';
            dot.setAttribute('aria-label', `Ir para o banner ${i + 1}`);
            dot.addEventListener('click', () => goTo(i));
            dotsBox.appendChild(dot);
            return dot;
        });
        if (total < 2) dotsBox.classList.add('hidden');

        function goTo(i) {
            index = (i + total) % total;
            bannerTrack.style.transform = `translateX(${-index * 100}%)`;
            bannerSlides.forEach((slide, s) => {
                slide.setAttribute('aria-hidden', s === index ? 'false' : 'true');
                slide.tabIndex = s === index ? 0 : -1;
            });
            dots.forEach((dot, d) => {
                const active = d === index;
                dot.classList.toggle('w-5', active);
                dot.classList.toggle('bg-white', active);
                dot.classList.toggle('w-1.5', !active);
                dot.classList.toggle('bg-white/50', !active);
                dot.setAttribute('aria-current', active ? 'true' : 'false');
            });
        }

        const startAutoplay = () => {
            if (reduceMotion || autoplay || total < 2) return;
            autoplay = setInterval(() => goTo(index + 1), 5000);
        };
        const stopAutoplay = () => { clearInterval(autoplay); autoplay = null; };

        $('.banner-prev', bannerSlider)?.addEventListener('click', () => goTo(index - 1));
        $('.banner-next', bannerSlider)?.addEventListener('click', () => goTo(index + 1));

        bannerSlider.addEventListener('mouseenter', stopAutoplay);
        bannerSlider.addEventListener('mouseleave', startAutoplay);
        bannerSlider.addEventListener('focusin', stopAutoplay);
        bannerSlider.addEventListener('focusout', startAutoplay);

        // Arrastar (mouse e toque)
        let dragging = false, startX = 0, deltaPct = 0;
        const pointX = e => (e.touches ? e.touches[0].clientX : e.clientX);

        bannerTrack.addEventListener('mousedown', e => { dragging = true; startX = pointX(e); deltaPct = 0; bannerTrack.classList.remove('transition-transform'); stopAutoplay(); });
        bannerTrack.addEventListener('touchstart', e => { dragging = true; startX = pointX(e); deltaPct = 0; bannerTrack.classList.remove('transition-transform'); stopAutoplay(); }, { passive: true });
        const bannerMove = e => {
            if (!dragging) return;
            deltaPct = ((pointX(e) - startX) / bannerSlider.offsetWidth) * 100;
            bannerTrack.style.transform = `translateX(${-index * 100 + deltaPct}%)`;
        };
        const bannerEnd = () => {
            if (!dragging) return;
            dragging = false;
            bannerTrack.classList.add('transition-transform');
            if (deltaPct < -20) goTo(index + 1);
            else if (deltaPct > 20) goTo(index - 1);
            else goTo(index);
        };
        window.addEventListener('mousemove', bannerMove);
        bannerTrack.addEventListener('touchmove', bannerMove, { passive: true });
        window.addEventListener('mouseup', bannerEnd);
        bannerTrack.addEventListener('touchend', bannerEnd);

        // Arrastar não deve abrir o link do banner
        bannerTrack.addEventListener('click', e => {
            if (Math.abs(deltaPct) > 3) e.preventDefault();
        });

        goTo(0);
        startAutoplay();
    }

    /* ------------------------------------------------------------------
     * Legislação (filtros + busca avançada) — dados em legislacao.json
     * ------------------------------------------------------------------ */
    const legislacaoArticlesContainer = document.getElementById('legislacao-articles');
    if (legislacaoArticlesContainer) {
        legislacaoArticlesContainer.innerHTML = Array.from({ length: 3 }, () => `
            <div class="animate-pulse space-y-2 border-b border-slate-100 pb-4">
                <div class="h-3 w-24 rounded bg-slate-200"></div>
                <div class="h-4 w-3/4 rounded bg-slate-200"></div>
                <div class="h-3 w-full rounded bg-slate-100"></div>
            </div>`).join('');

        fetch('./legislacao.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(initLegislacao)
            .catch(error => {
                console.error('Erro ao carregar legislação:', error);
                legislacaoArticlesContainer.innerHTML =
                    '<p class="py-6 text-center text-sm text-slate-500">Não foi possível carregar a legislação no momento.</p>';
            });
    }

    function initLegislacao(allLegislacaoData) {
        const legislacaoCheckboxes = $$('input[name="legislacao_tipo"]');
        const advEstadoSelect = document.getElementById('adv-estado');
        const advAreaSelect = document.getElementById('adv-area');
        const advMunicipioSelect = document.getElementById('adv-municipio');
        const advTipoPublicacaoSelect = document.getElementById('adv-tipo-publicacao');
        const advMunicipioContainer = document.getElementById('adv-municipio-container');

        const toISO = dateStr => {
            const [day, month, year] = String(dateStr).trim().split('/');
            return `${year}-${month}-${day}`;
        };

        function fillSelect(select, values, emptyLabel) {
            if (!select) return;
            select.innerHTML = '';
            select.add(new Option(emptyLabel, ''));
            Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .forEach(v => select.add(new Option(v, v)));
        }

        const uniq = key => new Set(allLegislacaoData.map(i => i[key]).filter(Boolean));
        fillSelect(advEstadoSelect, uniq('estado'), 'Todos');
        fillSelect(advAreaSelect, uniq('area'), 'Todas');
        fillSelect(advMunicipioSelect, uniq('municipio'), 'Todos');
        fillSelect(advTipoPublicacaoSelect, uniq('tipo_de_publicacao'), 'Todas');

        function saveAccessedLegislation(item) {
            try {
                let accessed = JSON.parse(localStorage.getItem('recentlyAccessed')) || [];
                accessed = accessed.filter(i => i.title !== item.title);
                accessed.unshift(item);
                localStorage.setItem('recentlyAccessed', JSON.stringify(accessed.slice(0, 5)));
            } catch (_) { /* localStorage indisponível */ }
        }

        const tipoInfo = {
            federal: { label: () => 'Federal', cor: 'text-blue-700' },
            estadual: { label: i => `Estadual · ${i.estado}`, cor: 'text-emerald-700' },
            municipal: { label: i => `Municipal · ${i.municipio} · ${i.estado}`, cor: 'text-orange-700' }
        };

        function renderLegislacao(data) {
            if (data.length === 0) {
                legislacaoArticlesContainer.innerHTML =
                    '<p class="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">Nenhuma norma encontrada com os filtros selecionados.</p>';
                return;
            }

            legislacaoArticlesContainer.innerHTML = '';
            data.forEach(item => {
                const info = tipoInfo[item.type] || tipoInfo.federal;
                const meta = [item.area, item.tipo_de_publicacao].filter(Boolean).map(escapeHtml).join(' · ');

                const article = document.createElement('article');
                article.className = 'border-b border-slate-100 pb-4 last:border-b-0 last:pb-0';
                article.dataset.type = item.type || '';
                article.dataset.date = item.date || '';
                article.dataset.area = item.area || '';
                article.dataset.publicacao = item.publicacao || '';
                if (item.estado) article.dataset.estado = item.estado;

                article.innerHTML = `
                    <span class="cf-eyebrow ${info.cor}">${escapeHtml(info.label(item))}</span>
                    <h3 class="mt-1 text-[1.05rem] font-semibold"><a href="${escapeHtml(item.link)}" class="transition hover:text-blue-800">${escapeHtml(item.title)}</a></h3>
                    <p class="mt-1 text-sm text-slate-600">${escapeHtml(item.summary)}</p>
                    <p class="mt-2 text-xs text-slate-500">Publicado em ${escapeHtml(item.date)}${meta ? ' · ' + meta : ''}</p>`;

                article.querySelector('a').addEventListener('click', () => {
                    saveAccessedLegislation({ title: item.title, date: item.date, link: item.link });
                });
                legislacaoArticlesContainer.appendChild(article);
            });
        }

        function applyAllFilters() {
            const checkedTypes = legislacaoCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
            const municipalAtivo = checkedTypes.includes('municipal');
            if (advMunicipioContainer) advMunicipioContainer.classList.toggle('hidden', !municipalAtivo);
            if (!municipalAtivo && advMunicipioSelect) advMunicipioSelect.value = '';

            const val = id => (document.getElementById(id)?.value || '').toLowerCase();
            const numero = val('adv-numero-decreto');
            const area = val('adv-area');
            const tipoPub = val('adv-tipo-publicacao');
            const estado = val('adv-estado');
            const municipio = val('adv-municipio');
            const dataDe = document.getElementById('adv-data-de')?.value || '';
            const dataAte = document.getElementById('adv-data-ate')?.value || '';
            const lc = v => (v || '').toLowerCase();

            const filtered = allLegislacaoData.filter(item => {
                const iso = item.date ? toISO(item.date) : '';
                if (checkedTypes.length && !checkedTypes.includes(item.type)) return false;
                if (numero && !lc(item.title).includes(numero)) return false;
                if (area && lc(item.area) !== area) return false;
                if (tipoPub && lc(item.tipo_de_publicacao) !== tipoPub) return false;
                if (estado && lc(item.estado) !== estado) return false;
                if (municipio && lc(item.municipio) !== municipio) return false;
                if (dataDe && iso < dataDe) return false;
                if (dataAte && iso > dataAte) return false;
                return true;
            });

            filtered.sort((a, b) => toISO(b.date).localeCompare(toISO(a.date)));
            renderLegislacao(filtered.slice(0, 5)); // últimas 5 normas
        }

        legislacaoCheckboxes.forEach(cb => cb.addEventListener('change', applyAllFilters));
        [advAreaSelect, advTipoPublicacaoSelect, advEstadoSelect, advMunicipioSelect]
            .forEach(sel => sel && sel.addEventListener('change', applyAllFilters));
        applyAllFilters();

        const btnBuscaAvancada = document.getElementById('busca-avancada-btn');
        const secaoBuscaAvancada = document.getElementById('legislacao-busca-avancada');
        if (btnBuscaAvancada && secaoBuscaAvancada) {
            btnBuscaAvancada.addEventListener('click', () => {
                const aberto = !secaoBuscaAvancada.classList.toggle('hidden');
                btnBuscaAvancada.setAttribute('aria-expanded', String(aberto));
            });
        }

        document.getElementById('adv-aplicar')?.addEventListener('click', applyAllFilters);
        document.getElementById('adv-numero-decreto')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') applyAllFilters();
        });
        document.getElementById('adv-limpar')?.addEventListener('click', () => {
            ['adv-numero-decreto', 'adv-area', 'adv-tipo-publicacao', 'adv-municipio',
             'adv-estado', 'adv-data-de', 'adv-data-ate'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            applyAllFilters();
        });
    }

    /* ------------------------------------------------------------------
     * Calendário de obrigações — dados em agenda.json
     * ------------------------------------------------------------------ */
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const eventPopup = document.getElementById('eventDetailsPopup');
    const eventDateEl = document.getElementById('eventDate');
    const eventListEl = document.getElementById('eventList');
    const closeEventDetailsBtn = document.getElementById('closeEventDetails');
    const agendaTypeSelect = document.getElementById('agenda-tipo');
    const agendaStateContainer = document.getElementById('agenda-estado-container');
    const agendaStateSelect = document.getElementById('agenda-estado');
    const agendaCapitalContainer = document.getElementById('agenda-capital-container');
    const agendaCapitalSelect = document.getElementById('agenda-capital');

    if (calendarDays && currentMonthYear && eventPopup) {
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const today = new Date();
        let currentMonth = today.getMonth();
        let currentYear = today.getFullYear();
        let eventsByDate = new Map();
        let agendaEvents = [];

        const pad = n => String(n).padStart(2, '0');
        const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const hidePopup = () => eventPopup.classList.add('hidden');

        function populateAgendaFilters() {
            if (agendaStateSelect) {
                UFS.forEach(({ uf, nome }) => agendaStateSelect.add(new Option(nome, uf)));
            }
            if (agendaCapitalSelect) {
                CAPITAIS.forEach(({ uf, nome }) => agendaCapitalSelect.add(new Option(`${nome} - ${uf}`, nome)));
            }
        }

        function updateAgendaFilters() {
            const type = agendaTypeSelect?.value || 'federal';
            const isState = type === 'estadual';
            const isMunicipal = type === 'municipal';
            agendaStateContainer?.classList.toggle('hidden', !isState);
            agendaCapitalContainer?.classList.toggle('hidden', !isMunicipal);
            if (!isState && agendaStateSelect) agendaStateSelect.value = '';
            if (!isMunicipal && agendaCapitalSelect) agendaCapitalSelect.value = '';
        }

        function filterAgendaEvents() {
            const type = agendaTypeSelect?.value || 'federal';
            const state = agendaStateSelect?.value || '';
            const capital = agendaCapitalSelect?.value || '';

            const filteredEvents = agendaEvents.filter(event => {
                if (normalize(event.type) !== type) return false;
                if (type === 'estadual' && state) {
                    return event.uf === state || event.estado === state || event.state === state;
                }
                if (type === 'municipal' && capital) {
                    return event.capital === capital || event.municipio === capital || event.city === capital;
                }
                return true;
            });

            eventsByDate = filteredEvents.reduce((map, event) => {
                if (!map.has(event.date)) map.set(event.date, []);
                map.get(event.date).push(event);
                return map;
            }, new Map());
            renderCalendar();
        }

        async function loadAgendaEvents() {
            try {
                const response = await fetch('./agenda.json');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                agendaEvents = await response.json();
            } catch (error) {
                console.error('Erro ao carregar eventos da agenda:', error);
            }
            filterAgendaEvents();
        }

        function renderCalendar() {
            calendarDays.innerHTML = '';
            hidePopup();
            currentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

            const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const frag = document.createDocumentFragment();

            for (let i = 0; i < firstDayOfWeek; i++) {
                frag.appendChild(document.createElement('div'));
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${pad(day)}/${pad(currentMonth + 1)}/${currentYear}`;
                const dayEvents = eventsByDate.get(dateStr) || [];
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                const cell = document.createElement(dayEvents.length ? 'button' : 'div');
                cell.className = 'p-2 text-center rounded-md transition';
                cell.textContent = day;

                if (dayEvents.length) {
                    cell.type = 'button';
                    cell.classList.add('has-event', 'font-bold', 'cursor-pointer', 'hover:bg-blue-50');
                    cell.setAttribute('aria-label', `${dateStr}: ${dayEvents.length} obrigação(ões)`);
                    cell.addEventListener('click', e => {
                        e.stopPropagation();
                        showEventDetailsPopup(dateStr, dayEvents, cell);
                    });
                }

                if (isToday) {
                    cell.classList.add('bg-blue-600', 'text-white');
                    cell.classList.remove('hover:bg-blue-50');
                    cell.setAttribute('aria-current', 'date');
                } else {
                    cell.classList.add('text-slate-700');
                }
                frag.appendChild(cell);
            }
            calendarDays.appendChild(frag);
        }

        function showEventDetailsPopup(dateStr, events, element) {
            eventDateEl.textContent = dateStr;
            eventListEl.innerHTML = events.map(ev => `
                <li><span class="font-medium text-slate-900">${escapeHtml(ev.title)}</span>
                ${ev.description ? `<br><span class="text-xs text-slate-500">${escapeHtml(ev.description)}</span>` : ''}</li>`).join('');

            eventPopup.classList.remove('hidden');

            const rect = element.getBoundingClientRect();
            const popupWidth = eventPopup.offsetWidth;
            const maxLeft = window.innerWidth - popupWidth - 10;
            const left = Math.max(10, Math.min(rect.left + window.scrollX, maxLeft));

            eventPopup.style.top = `${rect.bottom + window.scrollY}px`;
            eventPopup.style.left = `${left}px`;
            closeEventDetailsBtn && closeEventDetailsBtn.focus({ preventScroll: true });
        }

        prevMonthBtn && prevMonthBtn.addEventListener('click', () => {
            if (--currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar();
        });
        nextMonthBtn && nextMonthBtn.addEventListener('click', () => {
            if (++currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar();
        });
        closeEventDetailsBtn && closeEventDetailsBtn.addEventListener('click', hidePopup);
        agendaTypeSelect && agendaTypeSelect.addEventListener('change', () => {
            updateAgendaFilters();
            filterAgendaEvents();
        });
        agendaStateSelect && agendaStateSelect.addEventListener('change', filterAgendaEvents);
        agendaCapitalSelect && agendaCapitalSelect.addEventListener('change', filterAgendaEvents);

        document.addEventListener('click', e => {
            if (!eventPopup.contains(e.target) && !e.target.classList.contains('has-event')) hidePopup();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') hidePopup();
        });

        populateAgendaFilters();
        updateAgendaFilters();
        loadAgendaEvents();
    }

    /* ------------------------------------------------------------------
     * Indicadores e Taxas: último mês de cada série (SGS/Banco Central),
     * seta comparando com o mês anterior; cada linha abre indicadores.html
     * ------------------------------------------------------------------ */
    const homeIndicadores = document.getElementById('home-indicadores');
    if (homeIndicadores && window.CF_INDICADORES) {
        const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const fmt = (v, casas) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
        const buscar = url => fetch(url).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });
        // A API do BCB às vezes falha numa requisição isolada: tenta mais uma vez após 1,5 s
        const ultimos = ind => {
            const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${ind.sgs}/dados/ultimos/2?formato=json`;
            return buscar(url)
                .catch(() => new Promise(res => setTimeout(res, 1500)).then(() => buscar(url)))
                // A API nem sempre devolve em ordem: ordena por data (DD/MM/AAAA)
                .then(rows => rows.map(r => ({ data: r.data.split('/').reverse().join('-'), v: parseFloat(r.valor) }))
                    .sort((a, b) => a.data.localeCompare(b.data)));
        };

        Promise.allSettled(window.CF_INDICADORES.map(ultimos)).then(results => {
            const rows = window.CF_INDICADORES.map((ind, i) => {
                const pts = results[i].status === 'fulfilled' ? results[i].value : [];
                const last = pts[pts.length - 1];
                const prev = pts[pts.length - 2];
                const href = `indicadores.html?indicador=${ind.id}`;
                const nome = `<a href="${href}" class="after:absolute after:inset-0 group-hover:text-blue-800">${ind.nome}</a> <span class="text-xs text-slate-500">(${ind.fonte})</span>`;
                if (!last) {
                    return `<div class="cf-row group relative"><dt>${nome}</dt><dd class="text-xs text-slate-500">indisponível</dd></div>`;
                }
                const [ano, mes, dia] = last.data.split('-');
                const cambio = ind.tipo === 'cambio';
                // Câmbio: cotação do dia em R$ (seta vs. dia anterior); índices: variação % do mês (seta vs. mês anterior)
                const quando = cambio ? `${dia}/${mes}/${ano}` : `${MESES[Number(mes) - 1]}/${ano}`;
                const valor = cambio
                    ? `R$ ${last.v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                    : fmt(last.v, ind.id === 'tr' ? 4 : 2);
                const sobe = prev && last.v > prev.v;
                const desce = prev && last.v < prev.v;
                const seta = sobe ? '<i class="fa-solid fa-arrow-trend-up text-xs" aria-label="em alta"></i>'
                    : desce ? '<i class="fa-solid fa-arrow-trend-down text-xs" aria-label="em queda"></i>'
                        : '<i class="fa-solid fa-minus text-xs" aria-label="estável"></i>';
                const cor = sobe ? 'text-emerald-700' : desce ? 'text-red-600' : 'text-slate-500';
                return `<div class="cf-row group relative transition hover:bg-slate-50">
                    <dt>${nome}<span class="block text-xs text-slate-500">${quando}</span></dt>
                    <dd class="flex items-center gap-1.5 font-semibold tabular-nums ${cor}">${valor} ${seta}</dd>
                </div>`;
            });
            homeIndicadores.innerHTML = rows.join('');
        });
    }

    /* ------------------------------------------------------------------
     * Botão "voltar ao topo" (ano do rodapé e newsletter ficam em rodape.js)
     * ------------------------------------------------------------------ */
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        const onScroll = () => {
            const show = window.scrollY > 600;
            backToTop.classList.toggle('opacity-0', !show);
            backToTop.classList.toggle('translate-y-3', !show);
            backToTop.classList.toggle('pointer-events-none', !show);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0 }));
        onScroll();
    }
});
