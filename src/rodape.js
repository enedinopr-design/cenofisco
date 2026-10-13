// Rodapé compartilhado por todas as páginas do portal (exceto assine.html e checkout.html, que têm rodapé próprio):
// ano atual no copyright e feedback da newsletter (integrar ao back-end quando houver).
document.addEventListener('DOMContentLoaded', function () {
    const anoAtual = document.getElementById('ano-atual');
    if (anoAtual) anoAtual.textContent = new Date().getFullYear();

    // Busca do topo (todas as páginas): envia para busca.html; com o campo vazio, só devolve o foco
    const buscaTopo = document.getElementById('globalSearchForm');
    if (buscaTopo) {
        buscaTopo.addEventListener('submit', e => {
            const campo = document.getElementById('globalSearch');
            if (campo && !campo.value.trim()) { e.preventDefault(); campo.focus(); }
        });
    }

    // Filtros no celular: nas listagens a lateral (filtros + salvos) fica no fim da página abaixo de 1024px.
    // Com <aside data-filtros-mobile="Rótulo do botão">, aparece um botão no topo da lista que abre a lateral
    // numa gaveta (de baixo para cima). No desktop nada muda.
    const lateral = document.querySelector('aside[data-filtros-mobile]');
    const conteudo = lateral && [...lateral.parentElement.children].find(el => el !== lateral && el.tagName !== 'SCRIPT');
    if (lateral && conteudo) {
        const desktop = window.matchMedia('(min-width: 1024px)');
        const GAVETA = ['max-lg:fixed', 'max-lg:inset-x-0', 'max-lg:bottom-0', 'max-lg:z-[70]', 'max-lg:max-h-[85dvh]', 'max-lg:overflow-y-auto', 'max-lg:overscroll-contain', 'max-lg:rounded-t-3xl', 'max-lg:bg-slate-50', 'max-lg:px-4', 'max-lg:pt-3', 'max-lg:pb-6', 'max-lg:shadow-2xl'];
        lateral.id = lateral.id || 'filtros-lateral';
        lateral.classList.add('max-lg:hidden');

        const barra = document.createElement('div');
        barra.className = 'lg:hidden';
        barra.innerHTML = `<button type="button" class="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-200" aria-expanded="false" aria-controls="${lateral.id}">
                <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700" aria-hidden="true"><i class="fa-solid fa-sliders"></i></span>
                <span class="min-w-0 flex-1"><span class="block text-sm font-semibold text-slate-900">${lateral.dataset.filtrosMobile || 'Filtrar'}</span><span class="block truncate text-xs text-slate-500" data-filtro-atual></span></span>
                <i class="fa-solid fa-chevron-up text-xs text-slate-400" aria-hidden="true"></i>
            </button>`;
        conteudo.prepend(barra);
        const botao = barra.querySelector('button');
        const atualEl = barra.querySelector('[data-filtro-atual]');

        const topo = document.createElement('div');
        topo.className = 'sticky -top-3 z-10 -mx-4 mb-3 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 pt-1 pb-3 lg:hidden';
        topo.innerHTML = '<span class="mx-auto block h-1.5 w-10 rounded-full bg-slate-300 absolute left-1/2 -translate-x-1/2 -top-1" aria-hidden="true"></span><span class="font-semibold text-slate-900">Filtros e salvos</span><button type="button" class="cf-btn cf-btn-primary px-4 py-1.5" data-fechar-filtros>Ver resultados</button>';
        lateral.prepend(topo);
        const fundo = document.createElement('div');
        fundo.className = 'fixed inset-0 z-[65] hidden bg-slate-950/50 lg:hidden';
        fundo.setAttribute('aria-hidden', 'true');
        document.body.appendChild(fundo);

        // Resumo do filtro ativo (o botão marcado com aria-pressed="true" na lateral)
        const resumir = () => {
            const ativos = [...lateral.querySelectorAll('[aria-pressed="true"]')].map(b => (b.querySelector('span')?.textContent || b.textContent).replace(/\s+/g, ' ').trim()).filter(Boolean);
            atualEl.textContent = ativos.length ? `Selecionado: ${ativos.join(' › ')}` : 'Toque para escolher';
        };
        new MutationObserver(resumir).observe(lateral, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed'] });
        resumir();

        let aberto = false;
        const abrir = () => {
            aberto = true;
            lateral.classList.remove('max-lg:hidden');
            lateral.classList.add(...GAVETA);
            fundo.classList.remove('hidden');
            document.body.classList.add('max-lg:overflow-hidden');
            botao.setAttribute('aria-expanded', 'true');
            lateral.setAttribute('role', 'dialog');
            lateral.setAttribute('aria-modal', 'true');
            lateral.setAttribute('aria-label', 'Filtros e salvos');
            lateral.querySelector('[data-fechar-filtros]').focus();
        };
        const fechar = (devolverFoco = true) => {
            if (!aberto) return;
            aberto = false;
            lateral.classList.add('max-lg:hidden');
            lateral.classList.remove(...GAVETA);
            fundo.classList.add('hidden');
            document.body.classList.remove('max-lg:overflow-hidden');
            botao.setAttribute('aria-expanded', 'false');
            ['role', 'aria-modal', 'aria-label'].forEach(a => lateral.removeAttribute(a));
            if (devolverFoco) botao.focus();
        };
        botao.addEventListener('click', abrir);
        fundo.addEventListener('click', () => fechar());
        lateral.addEventListener('click', e => { if (e.target.closest('[data-fechar-filtros]')) { fechar(); conteudo.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
        desktop.addEventListener('change', () => fechar(false));   // girou a tela / redimensionou para desktop
    }

    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', e => {
            e.preventDefault();
            const feedback = document.getElementById('newsletter-feedback');
            if (feedback) {
                feedback.textContent = 'Obrigado! Seu e-mail foi cadastrado.';
                feedback.classList.remove('hidden');
            }
            newsletterForm.reset();
        });
    }
});
