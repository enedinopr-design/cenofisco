// Página inicial dinâmica (index-dinamica.html): menu de seções preso abaixo do cabeçalho,
// marcação da faixa visível e entrada suave das faixas. O conteúdo dos blocos vem de index.js.
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const raiz = document.documentElement;
    const cabecalho = document.querySelector('header.sticky');
    const nav = document.getElementById('faixas-nav');
    const faixas = [...document.querySelectorAll('[data-faixa]')];
    if (!nav || !faixas.length) return;
    const links = new Map([...nav.querySelectorAll('[data-alvo]')].map(a => [a.dataset.alvo, a]));

    // O menu fica logo abaixo do cabeçalho fixo; as âncoras param abaixo dos dois
    function medir() {
        const topo = cabecalho ? cabecalho.getBoundingClientRect().height : 0;
        raiz.style.setProperty('--cf-topo', `${Math.round(topo)}px`);
        raiz.style.scrollPaddingTop = `${Math.round(topo + nav.getBoundingClientRect().height + 12)}px`;
    }
    medir();
    window.addEventListener('resize', medir, { passive: true });

    // Faixa visível: marca o item do menu (e, no celular, rola o menu até ele)
    let atual = null;
    function marcar(id) {
        if (id === atual) return;
        links.get(atual)?.removeAttribute('aria-current');
        const a = links.get(id);
        if (!a) return;
        a.setAttribute('aria-current', 'true');
        const ul = a.closest('ul');
        if (ul && ul.scrollWidth > ul.clientWidth) ul.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
        atual = id;
    }
    if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(entradas => {
            entradas.filter(e => e.isIntersecting).forEach(e => marcar(e.target.id));
        }, { rootMargin: '-35% 0px -60% 0px' });
        faixas.forEach(f => obs.observe(f));
    }

    // Busca do topo e botões "Pergunte à IA": abrem o assistente (assistente-ia.js) já com a pergunta
    const heroForm = document.getElementById('hero-ia-form');
    const heroInput = document.getElementById('hero-ia-input');
    const ia = () => window.cfAssistenteIA;
    heroForm?.addEventListener('submit', e => {
        e.preventDefault();
        const texto = heroInput.value.trim();
        if (!texto) { heroInput.focus(); return; }
        if (!ia()) return;
        ia().perguntar(texto);
        heroInput.value = '';
    });
    document.addEventListener('click', e => {
        const chip = e.target.closest('[data-pergunta]');
        if (chip && ia()) { ia().perguntar(chip.dataset.pergunta); return; }
        if (e.target.closest('[data-abrir-ia]') && ia()) ia().abrir();
    });

    // Obrigações salvas na Agenda (localStorage "savedObligations", gravado por agenda-obrigacoes.js).
    // No desktop o cartão ocupa só a sobra ao lado das notícias: mostra as obrigações que cabem inteiras.
    const salvasLista = document.getElementById('agenda-salvas-lista');
    const salvasTotal = document.getElementById('agenda-salvas-total');
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    function lerSalvas() {
        try { const l = JSON.parse(localStorage.getItem('savedObligations')); return Array.isArray(l) ? l : []; } catch (e) { return []; }
    }
    function renderSalvas() {
        if (!salvasLista) return;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const itens = lerSalvas().map(o => {
            const [d, m, a] = String(o.date || '').split('/').map(Number);
            const data = d && m && a ? new Date(a, m - 1, d) : null;
            return data ? { o, data, dias: Math.round((data - hoje) / 86400000) } : null;
        }).filter(Boolean);
        if (!itens.length) return;   // fica a mensagem do HTML
        // Primeiro as que ainda vão vencer (mais próximas antes), depois as vencidas (mais recentes antes)
        itens.sort((x, y) => (x.dias < 0) - (y.dias < 0) || (x.dias < 0 ? y.dias - x.dias : x.dias - y.dias));
        salvasTotal.textContent = `(${itens.length})`;
        salvasLista.innerHTML = itens.slice(0, 6).map(({ o, data, dias }) => {
            const status = dias < 0 ? ['Vencida', 'text-red-600'] : dias === 0 ? ['Vence hoje', 'text-red-600 font-semibold'] : dias === 1 ? ['Vence amanhã', 'text-amber-600 font-semibold'] : [`Vence em ${dias} dias`, dias <= 7 ? 'text-amber-600' : 'text-slate-500'];
            const titulo = [o.title, o.subtitle].filter(Boolean).join(' – ');
            const href = `agenda-obrigacoes.html#${o.rowId || 'dia-' + String(o.date).replace(/\//g, '-')}`;
            return `<li><a href="${esc(href)}" class="flex items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-slate-50" title="${esc(titulo)}">
                <span class="flex w-11 shrink-0 flex-col items-center rounded-lg bg-blue-50 py-1 leading-none text-blue-800"><span class="text-base font-bold tabular-nums">${String(data.getDate()).padStart(2, '0')}</span><span class="mt-0.5 text-[10px] font-semibold uppercase">${MESES[data.getMonth()]}</span></span>
                <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-slate-800">${esc(titulo)}</span><span class="block text-[11px] ${status[1]}">${status[0]}${o.type ? ' · ' + esc(o.type) : ''}</span></span>
            </a></li>`;
        }).join('');
        ajustarSalvas();
    }
    // Esconde as obrigações que não cabem inteiras na altura disponível (só quando o cartão tem altura limitada)
    function ajustarSalvas() {
        if (!salvasLista) return;
        const lis = [...salvasLista.children];
        lis.forEach(li => { li.hidden = false; });
        const limitado = salvasLista.scrollHeight > salvasLista.clientHeight + 1;
        if (!limitado) return;
        const fundo = salvasLista.getBoundingClientRect().bottom;
        lis.forEach((li, i) => { if (i > 0 && li.getBoundingClientRect().bottom > fundo + 1) li.hidden = true; });
    }
    renderSalvas();
    window.addEventListener('resize', ajustarSalvas, { passive: true });
    window.addEventListener('storage', e => { if (e.key === 'savedObligations') renderSalvas(); });
    // A notícias (index.js) termina de carregar depois: a altura disponível muda
    if ('ResizeObserver' in window && salvasLista) new ResizeObserver(() => ajustarSalvas()).observe(salvasLista);

    // Números do portal: contados nos próprios JSONs (o HTML já traz os valores para quem está sem JavaScript)
    const numero = (chave, valor) => {
        const el = document.querySelector(`[data-numero="${chave}"]`);
        if (el && Number.isFinite(valor) && valor > 0) el.textContent = valor.toLocaleString('pt-BR');
    };
    const json = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(r.status)));
    json('tabelas.json').then(j => numero('tabelas', j.tabelas.length)).catch(() => {});
    json('cclasstrib.json').then(j => numero('cclasstrib', j.cst.reduce((n, c) => n + (c.classificacoes || []).length, 0))).catch(() => {});
    // Procedimentos por área (campo "Navegue por área")
    json('procedimentos.json').then(l => document.querySelectorAll('[data-proc-area]').forEach(el => { el.textContent = l.filter(p => p.area === el.dataset.procArea).length; })).catch(() => {});
    json('podcasts.json').then(j => numero('podcast', j.categorias.length)).catch(() => {});

    // Entrada suave (exceto a primeira faixa e para quem prefere menos movimento).
    // Ao terminar, remove o deslocamento: o popup da agenda é posicionado em relação à página.
    const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!menosMovimento && 'IntersectionObserver' in window) {
        const revelar = new IntersectionObserver(entradas => {
            entradas.filter(e => e.isIntersecting).forEach(e => {
                const el = e.target;
                el.classList.add('cf-visivel');
                el.addEventListener('transitionend', () => el.classList.remove('cf-revelar', 'cf-visivel'), { once: true });
                setTimeout(() => el.classList.remove('cf-revelar', 'cf-visivel'), 900);
                revelar.unobserve(el);
            });
        }, { rootMargin: '0px 0px -8% 0px' });
        faixas.slice(1).forEach(f => {
            // Só anima o que ainda está abaixo da tela
            if (f.getBoundingClientRect().top > window.innerHeight) {
                f.classList.add('cf-revelar');
                revelar.observe(f);
            }
        });
    }
});
