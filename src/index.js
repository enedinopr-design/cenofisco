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

    // Códigos › CST/cClassTrib: a busca abre a página própria (cst-cclasstrib.html)
    const codigosForm = document.getElementById('codigos-form');
    if (codigosForm) {
        codigosForm.addEventListener('submit', e => {
            const painel = document.getElementById('cclasstrib');
            if (!painel || painel.classList.contains('hidden')) return;
            e.preventDefault();
            const q = painel.querySelector('input[name="q"]').value.trim();
            location.href = 'cst-cclasstrib.html' + (q ? '?q=' + encodeURIComponent(q) : '');
        });
    }

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
     * Faixa de novidades: manchete + obrigações salvas na Agenda que vencem
     * nos próximos dias (localStorage "savedObligations", gravado por
     * agenda-obrigacoes.js). Alterna as mensagens a cada 7s; pausa com mouse
     * ou foco, tem botão de pausar (WCAG 2.2.2) e setas; sem troca automática
     * para quem prefere menos movimento.
     * ------------------------------------------------------------------ */
    const novidades = document.getElementById('novidades');
    if (novidades) {
        const JANELA_DIAS = 15;       // obrigações que vencem de hoje até daqui a 15 dias
        const MAX_OBRIGACOES = 5;
        const INTERVALO_MS = 7000;
        const link = document.getElementById('novidades-link');
        const badge = document.getElementById('novidades-badge');
        const texto = document.getElementById('novidades-texto');
        const cta = document.getElementById('novidades-cta');
        const controles = document.getElementById('novidades-controles');
        const contador = document.getElementById('novidades-contador');
        const btnAnterior = document.getElementById('novidades-anterior');
        const btnProxima = document.getElementById('novidades-proxima');
        const btnPausa = document.getElementById('novidades-pausa');
        const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // 1ª mensagem: a manchete que já está no HTML
        const manchete = {
            badge: badge.textContent.trim(),
            texto: texto.textContent.trim(),
            href: link.getAttribute('href'),
            cta: 'Leia mais',
            urgente: false
        };

        const parseBR = str => {
            const [d, m, a] = String(str || '').split('/').map(Number);
            return d && m && a ? new Date(a, m - 1, d) : null;
        };
        const quandoVence = dias => (dias === 0 ? 'Vence hoje' : dias === 1 ? 'Vence amanhã' : `Vence em ${dias} dias`);

        function obrigacoesAVencer() {
            let salvas = [];
            try {
                const data = JSON.parse(localStorage.getItem('savedObligations'));
                if (Array.isArray(data)) salvas = data;
            } catch (_) { /* localStorage indisponível */ }
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            return salvas
                .map(o => ({ o, data: parseBR(o.date) }))
                .filter(({ data }) => data)
                .map(({ o, data }) => ({ o, dias: Math.round((data - hoje) / 86400000) }))
                .filter(({ dias }) => dias >= 0 && dias <= JANELA_DIAS)
                .sort((a, b) => a.dias - b.dias)
                .slice(0, MAX_OBRIGACOES)
                .map(({ o, dias }) => ({
                    badge: quandoVence(dias),
                    texto: [o.title, o.subtitle].filter(Boolean).join(' – ') + ` · ${o.type ? o.type + ' · ' : ''}vencimento em ${o.date}`,
                    href: `agenda-obrigacoes.html#${o.rowId || 'dia-' + String(o.date).replace(/\//g, '-')}`,
                    cta: 'Ver na agenda',
                    urgente: dias <= 1
                }));
        }

        let mensagens = [];
        let atual = 0;
        let timer = null;
        let pausadoPeloUsuario = reduzMovimento;
        let pausadoPorInteracao = false;

        function mostrar(i, { anunciar = false } = {}) {
            atual = (i + mensagens.length) % mensagens.length;
            const m = mensagens[atual];
            const aplicar = () => {
                badge.textContent = m.badge;
                // Vencimento hoje/amanhã: selo em vermelho para chamar atenção (o texto do selo já diz a urgência)
                badge.classList.toggle('bg-amber-400', !m.urgente);
                badge.classList.toggle('text-blue-950', !m.urgente);
                badge.classList.toggle('bg-red-600', m.urgente);
                badge.classList.toggle('text-white', m.urgente);
                texto.textContent = m.texto;
                link.setAttribute('href', m.href);
                cta.firstChild.nodeValue = m.cta + ' ';
                contador.textContent = `${atual + 1}/${mensagens.length}`;
                link.style.opacity = '';
            };
            // Leitores de tela só são avisados quando a troca é feita pelo usuário (setas), nunca na troca automática
            novidades.setAttribute('aria-live', anunciar ? 'polite' : 'off');
            if (reduzMovimento || mensagens.length < 2) aplicar();
            else { link.style.opacity = '0'; setTimeout(aplicar, 200); }
        }

        function agendar() {
            clearInterval(timer);
            timer = null;
            if (mensagens.length > 1 && !pausadoPeloUsuario && !pausadoPorInteracao) {
                timer = setInterval(() => mostrar(atual + 1), INTERVALO_MS);
            }
        }

        function atualizarBotaoPausa() {
            btnPausa.setAttribute('aria-pressed', String(pausadoPeloUsuario));
            btnPausa.setAttribute('aria-label', pausadoPeloUsuario ? 'Retomar troca automática' : 'Pausar troca automática');
            btnPausa.innerHTML = `<i class="fa-solid ${pausadoPeloUsuario ? 'fa-play' : 'fa-pause'} text-xs" aria-hidden="true"></i>`;
        }

        function montar() {
            const anterior = mensagens[atual];
            mensagens = [manchete, ...obrigacoesAVencer()];
            const varias = mensagens.length > 1;
            controles.classList.toggle('hidden', !varias);
            controles.classList.toggle('flex', varias);
            // Mantém a mensagem que estava na tela, se ela ainda existir
            const idx = anterior ? mensagens.findIndex(m => m.href === anterior.href && m.texto === anterior.texto) : 0;
            mostrar(Math.max(0, idx));
            atualizarBotaoPausa();
            agendar();
        }

        btnAnterior.addEventListener('click', () => { mostrar(atual - 1, { anunciar: true }); agendar(); });
        btnProxima.addEventListener('click', () => { mostrar(atual + 1, { anunciar: true }); agendar(); });
        btnPausa.addEventListener('click', () => {
            pausadoPeloUsuario = !pausadoPeloUsuario;
            atualizarBotaoPausa();
            agendar();
        });
        // Pausa enquanto o usuário lê (mouse em cima) ou navega por teclado dentro da faixa
        const pausar = () => { pausadoPorInteracao = true; agendar(); };
        const retomar = () => { pausadoPorInteracao = false; agendar(); };
        novidades.addEventListener('mouseenter', pausar);
        novidades.addEventListener('mouseleave', retomar);
        novidades.addEventListener('focusin', pausar);
        novidades.addEventListener('focusout', e => { if (!novidades.contains(e.relatedTarget)) retomar(); });
        // Obrigação salva/removida na Agenda em outra aba: atualiza a faixa
        window.addEventListener('storage', e => { if (e.key === 'savedObligations') montar(); });
        // Volta para a aba depois de dias: recalcula "vence hoje/amanhã"
        document.addEventListener('visibilitychange', () => { if (!document.hidden) montar(); });

        montar();
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

        // Mesmo critério da página da Agenda: abre no mês atual se ele tiver obrigações;
        // senão, no mês com obrigações mais próximo de hoje
        function pickInitialMonth() {
            const months = [...new Set(agendaEvents
                .map(e => String(e.date || '').split('/'))
                .filter(p => p.length === 3)
                .map(([, m, y]) => `${y}-${m}`))];
            if (!months.length) return;
            const current = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
            const dist = key => Math.abs(new Date(`${key}-01T00:00:00`) - today);
            const chosen = months.includes(current) ? current : months.reduce((best, m) => (dist(m) < dist(best) ? m : best));
            const [y, m] = chosen.split('-').map(Number);
            currentYear = y;
            currentMonth = m - 1;
        }

        async function loadAgendaEvents() {
            try {
                const response = await fetch('./agenda.json');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                agendaEvents = await response.json();
                pickInitialMonth();
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

    /* ------------------------------------------------------------------
     * Notícias da home (abas "Destaque" e "Notícias") a partir de noticias.json.
     * Se o arquivo não carregar, fica o conteúdo estático do HTML.
     * ------------------------------------------------------------------ */
    const destaqueEl = document.getElementById('destaque');
    const noticiasTabEl = document.getElementById('noticias');
    if (destaqueEl && noticiasTabEl) {
        const corArea = { 'Tributário': 'text-emerald-700', 'Trabalhista': 'text-orange-700', 'Federal': 'text-blue-700', 'Previdenciário': 'text-violet-700' };
        const urlNoticia = n => (n.link && n.link !== '#' ? n.link : `noticia.html?id=${encodeURIComponent(n.id)}`);
        const isoData = d => d.split('/').reverse().join('-');
        const eyebrow = n => `<span class="cf-eyebrow ${corArea[n.area] || 'text-blue-700'}">${escapeHtml(n.area)} <span class="text-slate-400">·</span> <time datetime="${isoData(n.date)}" class="text-slate-500">${escapeHtml(n.date)}</time></span>`;
        const img = (url, w) => url.replace(/([?&])w=\d+/, `$1w=${w}`);

        fetch('noticias.json')
            .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(lista => {
                if (!Array.isArray(lista) || !lista.length) return;
                lista = lista.slice().sort((a, b) => isoData(b.date).localeCompare(isoData(a.date)));
                const [principal, ...demais] = lista;

                destaqueEl.innerHTML = `
                    <a href="${escapeHtml(urlNoticia(principal))}" class="group grid grid-cols-1 items-center gap-6 md:grid-cols-5">
                        ${principal.image ? `<div class="aspect-video overflow-hidden rounded-xl bg-slate-200 md:col-span-2 md:aspect-[4/3]">
                            <img src="${escapeHtml(principal.image)}" srcset="${escapeHtml(img(principal.image, 480))} 480w, ${escapeHtml(principal.image)} 800w" sizes="(min-width: 768px) 320px, 100vw"
                                 alt="" width="800" height="600" fetchpriority="high" decoding="async" class="h-full w-full object-cover transition duration-500 group-hover:scale-105">
                        </div>` : ''}
                        <div class="${principal.image ? 'md:col-span-3' : 'md:col-span-5'}">
                            ${eyebrow(principal)}
                            <h3 class="mt-2 mb-3 text-2xl leading-tight font-bold tracking-tight text-slate-900 transition group-hover:text-blue-800 lg:text-[1.75rem]">${escapeHtml(principal.title)}</h3>
                            <p class="text-slate-600">${escapeHtml(principal.summary)}</p>
                        </div>
                    </a>
                    <div class="mt-8 grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
                        ${demais.slice(0, 3).map(n => `
                        <a href="${escapeHtml(urlNoticia(n))}" class="group block">
                            ${eyebrow(n)}
                            <h3 class="mt-1.5 leading-snug font-semibold text-slate-900 transition group-hover:text-blue-800">${escapeHtml(n.title)}</h3>
                            <p class="mt-2 line-clamp-3 text-sm text-slate-500">${escapeHtml(n.summary)}</p>
                        </a>`).join('')}
                    </div>`;

                const proximas = demais.slice(3, 7);
                if (proximas.length) {
                    noticiasTabEl.innerHTML = `
                        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            ${proximas.map(n => `
                            <a href="${escapeHtml(urlNoticia(n))}" class="group block rounded-xl border border-slate-200 p-5 transition hover:border-blue-200 hover:bg-blue-50/40">
                                ${eyebrow(n)}
                                <h3 class="mt-1.5 leading-snug font-semibold text-slate-900 transition group-hover:text-blue-800">${escapeHtml(n.title)}</h3>
                                <p class="mt-2 line-clamp-3 text-sm text-slate-500">${escapeHtml(n.summary)}</p>
                            </a>`).join('')}
                        </div>`;
                }
            })
            .catch(() => { /* mantém o conteúdo estático */ });
    }

    /* ------------------------------------------------------------------
     * Últimos Procedimentos (3 mais recentes de procedimentos.json).
     * Se o arquivo não carregar, fica o conteúdo estático do HTML.
     * ------------------------------------------------------------------ */
    const homeProcEl = document.getElementById('home-procedimentos');
    if (homeProcEl) {
        const corProc = { 'Contabilidade': 'text-sky-700', 'ICMS e Outros': 'text-emerald-700', 'Prev/Trab': 'text-orange-700', 'IR': 'text-red-700', 'Federal': 'text-violet-700', 'ISS e Outros': 'text-amber-700' };
        const chaveData = d => String(d || '').split('/').reverse().join('');
        fetch('procedimentos.json')
            .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(lista => {
                if (!Array.isArray(lista) || !lista.length) return;
                homeProcEl.innerHTML = lista.slice().sort((a, b) => chaveData(b.date).localeCompare(chaveData(a.date))).slice(0, 3).map(p => `
                    <article class="py-4 first:pt-0 last:pb-0">
                        <span class="cf-eyebrow ${corProc[p.area] || 'text-blue-700'}">${escapeHtml(p.area)}</span>
                        <h3 class="mt-1 text-[1.05rem] font-semibold"><a href="${p.link && p.link !== '#' ? escapeHtml(p.link) : `procedimento.html?id=${encodeURIComponent(p.id)}`}" class="transition hover:text-blue-800">${escapeHtml(p.title)}</a></h3>
                        <p class="mt-1 line-clamp-3 text-sm text-slate-600">${escapeHtml(p.summary)}</p>
                        <p class="mt-2 text-xs text-slate-500">${escapeHtml([p.assunto, p.date, p.numero ? `Número: ${p.numero}` : ''].filter(Boolean).join(' · '))}</p>
                    </article>`).join('');
            })
            .catch(() => { /* mantém o conteúdo estático */ });
    }
});
