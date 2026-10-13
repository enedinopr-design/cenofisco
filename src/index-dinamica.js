// Página inicial dinâmica (index-dinamica.html): menu de seções preso abaixo do cabeçalho,
// marcação da faixa visível e entrada suave das faixas. O conteúdo dos blocos vem de index.js.
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const raiz = document.documentElement;
    const cabecalho = document.querySelector('header.sticky');
    const nav = document.getElementById('faixas-nav');

    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // ---------- Personalizar a página: ordem e visibilidade das seções ----------
    // Cada bloco móvel tem data-bloco/data-rotulo/data-icone. A escolha fica no navegador (localStorage "cfHomeLayout").
    const conteiner = document.getElementById('home-blocos');
    const CHAVE_LAYOUT = 'cfHomeLayout';
    const blocos = conteiner ? [...conteiner.querySelectorAll(':scope > [data-bloco]')] : [];
    const PADRAO = blocos.map(el => el.dataset.bloco);
    const porId = new Map(blocos.map(el => [el.dataset.bloco, el]));
    function lerLayout() {
        let l = null;
        try { l = JSON.parse(localStorage.getItem(CHAVE_LAYOUT)); } catch (e) { /* sem armazenamento */ }
        const ordem = (Array.isArray(l?.ordem) ? l.ordem : []).filter(id => porId.has(id));
        PADRAO.forEach(id => { if (!ordem.includes(id)) ordem.splice(Math.min(PADRAO.indexOf(id), ordem.length), 0, id); });  // seções novas entram na posição padrão
        return { ordem: [...new Set(ordem)], ocultos: (Array.isArray(l?.ocultos) ? l.ocultos : []).filter(id => porId.has(id)) };
    }
    let layout = lerLayout();
    function gravarLayout() {
        try {
            const padrao = !layout.ocultos.length && layout.ordem.every((id, i) => id === PADRAO[i]);
            padrao ? localStorage.removeItem(CHAVE_LAYOUT) : localStorage.setItem(CHAVE_LAYOUT, JSON.stringify(layout));
        } catch (e) { /* sem armazenamento: vale só até recarregar */ }
    }
    function aplicarLayout() {
        if (!conteiner) return;
        layout.ordem.forEach(id => conteiner.appendChild(porId.get(id)));
        porId.forEach((el, id) => { el.hidden = layout.ocultos.includes(id); });
        // Fundo alternado entre as faixas visíveis (branco, cinza, branco...)
        [...conteiner.querySelectorAll(':scope > [data-faixa]:not([hidden])')].forEach((el, i) => el.classList.toggle('cf-faixa-destaque', i % 2 === 1));
        // Menu de seções na mesma ordem, sem as escondidas
        const lista = document.getElementById('faixas-lista');
        if (lista) layout.ordem.forEach(id => {
            const li = lista.querySelector(`[data-alvo="faixa-${id}"]`)?.closest('li');
            if (li) { lista.appendChild(li); li.hidden = layout.ocultos.includes(id); }
        });
    }
    aplicarLayout();

    const dialogo = document.getElementById('personalizar-dialog');
    const listaP = document.getElementById('personalizar-lista');
    const aviso = document.getElementById('personalizar-aviso');
    function renderPersonalizar(foco) {
        if (!listaP) return;
        const n = layout.ordem.length;
        listaP.innerHTML = layout.ordem.map((id, i) => {
            const el = porId.get(id);
            const rot = esc(el.dataset.rotulo);
            const visivel = !layout.ocultos.includes(id);
            return `<li draggable="true" data-id="${esc(id)}" class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2 pr-2 pl-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-opacity">
                <span class="cursor-grab px-1 text-slate-400 active:cursor-grabbing" title="Arraste para mudar a ordem" aria-hidden="true"><i class="fa-solid fa-grip-vertical"></i></span>
                <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-xs ${visivel ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}" aria-hidden="true"><i class="fa-solid ${esc(el.dataset.icone)}"></i></span>
                <span class="min-w-0 flex-1 text-sm font-medium ${visivel ? 'text-slate-800' : 'text-slate-400 line-through'}">${rot}</span>
                <button type="button" data-mover="-1" class="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Mover ${rot} para cima" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-up text-xs" aria-hidden="true"></i></button>
                <button type="button" data-mover="1" class="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Mover ${rot} para baixo" ${i === n - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-down text-xs" aria-hidden="true"></i></button>
                <label class="relative ml-1 inline-flex shrink-0 cursor-pointer items-center" title="${visivel ? 'Esconder' : 'Mostrar'}">
                    <input type="checkbox" class="peer sr-only" data-visivel ${visivel ? 'checked' : ''}>
                    <span class="sr-only">Mostrar ${rot}</span>
                    <span class="h-6 w-10 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-700 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2" aria-hidden="true"></span>
                    <span class="absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" aria-hidden="true"></span>
                </label>
            </li>`;
        }).join('');
        if (foco) {
            const alvo = listaP.querySelector(`li[data-id="${foco.id}"] ${foco.sel}`);
            (alvo && !alvo.disabled ? alvo : listaP.querySelector(`li[data-id="${foco.id}"] [data-mover]:not([disabled])`))?.focus();
        }
    }
    function mudou(msg, foco) {
        gravarLayout();
        aplicarLayout();
        renderPersonalizar(foco);
        if (aviso && msg) aviso.textContent = msg;
    }
    function mover(id, para) {
        const de = layout.ordem.indexOf(id);
        if (de < 0 || para < 0 || para >= layout.ordem.length || para === de) return false;
        layout.ordem.splice(para, 0, layout.ordem.splice(de, 1)[0]);
        return true;
    }
    const rotulo = id => porId.get(id)?.dataset.rotulo || id;
    if (dialogo && listaP) {
        document.getElementById('personalizar-abrir')?.addEventListener('click', () => { renderPersonalizar(); dialogo.showModal(); });
        dialogo.addEventListener('click', e => {
            if (e.target === dialogo || e.target.closest('[data-personalizar-fechar]')) dialogo.close();   // clique fora ou "Concluir"
        });
        listaP.addEventListener('click', e => {
            const btn = e.target.closest('[data-mover]');
            if (!btn) return;
            const id = btn.closest('li').dataset.id;
            const para = layout.ordem.indexOf(id) + Number(btn.dataset.mover);
            if (mover(id, para)) mudou(`${rotulo(id)}: posição ${para + 1} de ${layout.ordem.length}`, { id, sel: `[data-mover="${btn.dataset.mover}"]` });
        });
        listaP.addEventListener('change', e => {
            if (!e.target.matches('[data-visivel]')) return;
            const id = e.target.closest('li').dataset.id;
            layout.ocultos = e.target.checked ? layout.ocultos.filter(x => x !== id) : [...layout.ocultos, id];
            mudou(`${rotulo(id)} ${e.target.checked ? 'visível' : 'escondida'}`, { id, sel: '[data-visivel]' });
        });
        document.getElementById('personalizar-restaurar')?.addEventListener('click', () => {
            layout = { ordem: [...PADRAO], ocultos: [] };
            mudou('Ordem padrão restaurada');
        });
        // Arrastar e soltar (mouse; no celular use as setas)
        let arrastando = null;
        listaP.addEventListener('dragstart', e => {
            const li = e.target.closest('li[data-id]');
            if (!li) return;
            arrastando = li.dataset.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', arrastando);
            requestAnimationFrame(() => li.classList.add('opacity-40'));
        });
        listaP.addEventListener('dragover', e => {
            if (!arrastando) return;
            e.preventDefault();
            const li = e.target.closest('li[data-id]');
            if (!li || li.dataset.id === arrastando) return;
            const atual = listaP.querySelector(`li[data-id="${arrastando}"]`);
            const r = li.getBoundingClientRect();
            listaP.insertBefore(atual, e.clientY > r.top + r.height / 2 ? li.nextSibling : li);   // só mexe na lista; grava ao soltar
        });
        listaP.addEventListener('dragend', () => {
            if (!arrastando) return;
            const id = arrastando;
            arrastando = null;
            layout.ordem = [...listaP.querySelectorAll('li[data-id]')].map(li => li.dataset.id);
            mudou(`${rotulo(id)}: posição ${layout.ordem.indexOf(id) + 1} de ${layout.ordem.length}`);
        });
    }

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
        faixas.filter(f => !f.hidden).slice(1).forEach(f => {
            // Só anima o que ainda está abaixo da tela
            if (f.getBoundingClientRect().top > window.innerHeight) {
                f.classList.add('cf-revelar');
                revelar.observe(f);
            }
        });
    }
});
