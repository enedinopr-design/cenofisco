// Tour guiado da página inicial: apresenta o novo portal passo a passo, destacando cada área da tela.
// Abre sozinho na primeira visita (localStorage "cfTourVisto") e pode ser refeito por qualquer botão com [data-tour-iniciar].
// Cada passo aponta para o primeiro seletor visível da lista "alvo" (assim funciona no celular e no computador);
// sem alvo visível, o passo aparece centralizado. Teclado: ← → para navegar, Esc para fechar.
// Para incluir um passo novo: acrescente um item em PASSOS.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    const CHAVE = 'cfTourVisto';

    const PASSOS = [
        {
            titulo: 'Boas-vindas ao novo Cenofisco!',
            texto: 'O portal está de cara nova. Em menos de um minuto mostramos onde encontrar cada coisa. Você pode sair quando quiser e refazer o tour depois.',
            icone: 'fa-hand-sparkles'
        },
        {
            alvo: ['#main-menu nav', '#menu-toggle'],
            titulo: 'Menu principal',
            texto: 'Acesse as áreas do portal: Procedimentos, Especiais, Reforma Tributária, Ferramentas, Agendas e Legislação.',
            textoCelular: 'Toque neste botão para abrir o menu com as áreas do portal: Procedimentos, Especiais, Reforma Tributária, Ferramentas, Agendas e Legislação.',
            icone: 'fa-bars'
        },
        {
            alvo: ['#hero-ia-form'],
            titulo: 'Pergunte ao assistente IA',
            texto: 'Escreva sua dúvida do jeito que falaria, como "alíquota de ICMS da cerveja no Acre". O assistente pesquisa NCM, CST/cClassTrib, tabelas, agenda, legislação e procedimentos e indica onde está a resposta.',
            icone: 'fa-robot'
        },
        {
            alvo: ['.cf-hero-atalhos'],
            titulo: 'Acesso rápido',
            texto: 'Atalhos para o que é mais usado no dia a dia: Busca Fiscal, Agenda, Legislação, Procedimentos, Tabelas Práticas, Indicadores e outros.',
            textoCelular: 'Atalhos para o que é mais usado no dia a dia. Deslize a fileira para o lado para ver todos.',
            icone: 'fa-bolt'
        },
        {
            alvo: ['#faixas-lista'],
            titulo: 'Seções da página',
            texto: 'A página inicial é dividida em seções: Destaques, Ferramentas, Conteúdo técnico, Aprenda, Referências e Dúvidas. Clique em uma delas para ir direto até ela; este menu acompanha você enquanto rola a página.',
            icone: 'fa-list'
        },
        {
            alvo: ['#personalizar-abrir'],
            titulo: 'Deixe a página do seu jeito',
            texto: 'Em Personalizar você muda a ordem das seções e esconde as que não usa. A escolha fica salva neste navegador.',
            icone: 'fa-sliders'
        },
        {
            alvo: ['#titulo-busca-fiscal'],
            secao: true,
            titulo: 'Busca Fiscal',
            texto: 'Consulte NCM, CST/cClassTrib, PIS/COFINS e ICMS entre estados. Escolha o tipo de busca e digite o código ou a descrição do produto.',
            icone: 'fa-file-invoice-dollar'
        },
        {
            alvo: ['#consultoria-cenofisco'],
            titulo: 'Consultoria Cenofisco',
            texto: 'Veja as últimas consultas respondidas ou envie a sua para nossos consultores analisarem o seu caso.',
            icone: 'fa-headset'
        },
        {
            alvo: ['.cf-tema-btn'],
            titulo: 'Tema claro ou escuro',
            texto: 'Prefere ler com fundo escuro? Use este botão para alternar o tema.',
            icone: 'fa-moon'
        },
        {
            alvo: ['a[href="meu-perfil.html"]'],
            titulo: 'Meu Perfil e itens salvos',
            texto: 'Use o ícone de salvar nas tabelas, procedimentos, consultas e podcasts. Tudo o que você salvar fica reunido em Meu Perfil, junto com seus documentos.',
            icone: 'fa-bookmark'
        },
        {
            titulo: 'Pronto!',
            texto: 'Agora é só explorar. Para ver este tour de novo, use o botão "Tour" ao lado de Personalizar ou a seção Dúvidas no fim da página.',
            icone: 'fa-circle-check'
        }
    ];

    // --- Estilos (injetados aqui para não depender da recompilação do Tailwind) ---
    const css = document.createElement('style');
    css.textContent = `
    .cf-tour-bloqueio{position:fixed;inset:0;z-index:1000;background:transparent}
    .cf-tour-bloqueio.sem-alvo{background:rgb(2 6 23/.6)}
    .cf-tour-foco{position:fixed;z-index:1001;border-radius:14px;pointer-events:none;box-shadow:0 0 0 4px #fbbf24,0 0 0 9999px rgb(2 6 23/.6);transition:top .25s ease,left .25s ease,width .25s ease,height .25s ease}
    .cf-tour-caixa{position:fixed;z-index:1002;width:min(22rem,calc(100vw - 2rem));background:#fff;color:#0f172a;border-radius:16px;box-shadow:0 20px 50px rgb(2 6 23/.35);padding:1.25rem 1.25rem 1rem;font-size:.9375rem;line-height:1.5;transition:top .25s ease,left .25s ease}
    .cf-tour-caixa:focus{outline:none}
    .cf-tour-topo{display:flex;align-items:flex-start;gap:.75rem;margin-bottom:.5rem}
    .cf-tour-icone{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:2.25rem;height:2.25rem;border-radius:10px;background:#eff6ff;color:#1d4ed8}
    .cf-tour-titulo{flex:1;margin:0;padding-top:.3rem;font-size:1.0625rem;font-weight:700;line-height:1.3}
    .cf-tour-fechar{flex-shrink:0;width:2rem;height:2rem;margin:-.25rem -.5rem 0 0;border:0;border-radius:8px;background:none;color:#64748b;cursor:pointer}
    .cf-tour-fechar:hover{background:#f1f5f9;color:#0f172a}
    .cf-tour-texto{margin:0;color:#334155}
    .cf-tour-rodape{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:1rem}
    .cf-tour-pontos{display:flex;flex-wrap:wrap;gap:4px}
    .cf-tour-pontos span{width:6px;height:6px;border-radius:999px;background:#cbd5e1}
    .cf-tour-pontos span.atual{width:16px;background:#1e3a8a}
    .cf-tour-botoes{display:flex;gap:.5rem;flex-shrink:0}
    .cf-tour-btn{min-height:2.25rem;padding:.4rem .9rem;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#1e293b;font-weight:600;font-size:.875rem;cursor:pointer}
    .cf-tour-btn:hover{background:#f8fafc}
    .cf-tour-btn.primario{border-color:#1e3a8a;background:#1e3a8a;color:#fff}
    .cf-tour-btn.primario:hover{background:#1e40af}
    .cf-tour-btn:focus-visible,.cf-tour-fechar:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
    [data-tema="escuro"] .cf-tour-caixa{background:#0f1d3a;color:#e2e8f0;box-shadow:0 20px 50px rgb(0 0 0/.6);border:1px solid #1e3a8a}
    [data-tema="escuro"] .cf-tour-icone{background:#1e3a8a;color:#bfdbfe}
    [data-tema="escuro"] .cf-tour-texto{color:#cbd5e1}
    [data-tema="escuro"] .cf-tour-fechar{color:#94a3b8}
    [data-tema="escuro"] .cf-tour-fechar:hover{background:#1e293b;color:#fff}
    [data-tema="escuro"] .cf-tour-pontos span{background:#334155}
    [data-tema="escuro"] .cf-tour-pontos span.atual{background:#fbbf24}
    [data-tema="escuro"] .cf-tour-btn{background:transparent;border-color:#334155;color:#e2e8f0}
    [data-tema="escuro"] .cf-tour-btn:hover{background:#1e293b}
    [data-tema="escuro"] .cf-tour-btn.primario{background:#fbbf24;border-color:#fbbf24;color:#0f172a}
    [data-tema="escuro"] .cf-tour-btn.primario:hover{background:#fcd34d}
    @media (prefers-reduced-motion:reduce){.cf-tour-foco,.cf-tour-caixa{transition:none}}`;
    document.head.appendChild(css);

    const visivel = el => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const celular = () => window.matchMedia('(max-width: 767px)').matches;
    const movimentoReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function alvoDo(passo) {
        for (const sel of passo.alvo || []) {
            let el = [...document.querySelectorAll(sel)].find(visivel);
            if (el && passo.secao) el = el.closest('section') || el;
            if (el) return el;
        }
        return null;
    }

    let indice = 0, alvo = null, bloqueio, foco, caixa, focoAnterior, quadro = 0;

    function montar() {
        bloqueio = document.createElement('div');
        bloqueio.className = 'cf-tour-bloqueio';
        foco = document.createElement('div');
        foco.className = 'cf-tour-foco';
        caixa = document.createElement('div');
        caixa.className = 'cf-tour-caixa';
        caixa.setAttribute('role', 'dialog');
        caixa.setAttribute('aria-modal', 'true');
        caixa.setAttribute('aria-labelledby', 'cf-tour-titulo');
        caixa.setAttribute('aria-describedby', 'cf-tour-texto');
        caixa.tabIndex = -1;
        document.body.append(bloqueio, foco, caixa);

        caixa.addEventListener('click', e => {
            const acao = e.target.closest('[data-acao]')?.dataset.acao;
            if (acao === 'proximo') ir(indice + 1);
            else if (acao === 'anterior') ir(indice - 1);
            else if (acao === 'fechar') fechar();
        });
        document.addEventListener('keydown', teclado);
        window.addEventListener('scroll', agendar, { passive: true });
        window.addEventListener('resize', agendar);
    }

    function teclado(e) {
        if (e.key === 'Escape') { e.preventDefault(); fechar(); }
        else if (e.key === 'ArrowRight' && !e.target.closest('input, textarea, select')) ir(indice + 1);
        else if (e.key === 'ArrowLeft' && !e.target.closest('input, textarea, select')) ir(indice - 1);
        else if (e.key === 'Tab') {
            // Mantém o foco dentro da caixa do tour
            const itens = [...caixa.querySelectorAll('button')];
            const primeiro = itens[0], ultimo = itens[itens.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
        }
    }

    function ir(n) {
        if (n < 0) return;
        if (n >= PASSOS.length) { fechar(); return; }
        indice = n;
        const passo = PASSOS[n];
        alvo = alvoDo(passo);
        const total = PASSOS.length;
        const ultimo = n === total - 1;
        const texto = (celular() && passo.textoCelular) || passo.texto;

        caixa.innerHTML = `
            <div class="cf-tour-topo">
                <span class="cf-tour-icone" aria-hidden="true"><i class="fa-solid ${passo.icone || 'fa-circle-info'}"></i></span>
                <h2 id="cf-tour-titulo" class="cf-tour-titulo">${passo.titulo}</h2>
                <button type="button" class="cf-tour-fechar" data-acao="fechar" aria-label="Fechar o tour"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </div>
            <p id="cf-tour-texto" class="cf-tour-texto">${texto}</p>
            <div class="cf-tour-rodape">
                <div class="cf-tour-pontos" role="img" aria-label="Passo ${n + 1} de ${total}">${PASSOS.map((_, i) => `<span class="${i === n ? 'atual' : ''}"></span>`).join('')}</div>
                <div class="cf-tour-botoes">
                    ${n === 0 ? '<button type="button" class="cf-tour-btn" data-acao="fechar">Agora não</button>'
                              : '<button type="button" class="cf-tour-btn" data-acao="anterior">Voltar</button>'}
                    <button type="button" class="cf-tour-btn primario" data-acao="proximo">${n === 0 ? 'Começar' : ultimo ? 'Concluir' : 'Próximo'}</button>
                </div>
            </div>`;

        bloqueio.classList.toggle('sem-alvo', !alvo);
        foco.style.display = alvo ? '' : 'none';
        if (alvo) rolarAte(alvo);
        posicionar();
        caixa.querySelector('.primario').focus({ preventScroll: true });
    }

    // Altura ocupada no topo pelos elementos fixos (cabeçalho e menu das seções)
    function alturaFixa() {
        let h = 0;
        document.querySelectorAll('header.sticky, #faixas-nav').forEach(el => {
            const r = el.getBoundingClientRect();
            if (getComputedStyle(el).position === 'sticky' && r.top <= 1) h = Math.max(h, r.bottom);
        });
        return h || (document.querySelector('header.sticky')?.offsetHeight || 0);
    }

    function rolarAte(el) {
        if (el.closest('header.sticky')) return;   // o cabeçalho fica sempre à vista
        const r = el.getBoundingClientRect();
        const topoLivre = alturaFixa() + 16;
        const espaco = window.innerHeight - topoLivre;
        let destino = r.top + window.scrollY - topoLivre;
        if (r.height < espaco * 0.6) destino -= (espaco - r.height) / 3;   // folga para a caixa abaixo
        window.scrollTo({ top: Math.max(0, destino), behavior: movimentoReduzido() ? 'auto' : 'smooth' });
    }

    function agendar() {
        cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(posicionar);
    }

    function posicionar() {
        if (!caixa) return;
        const vw = document.documentElement.clientWidth, vh = window.innerHeight;
        const cw = caixa.offsetWidth, ch = caixa.offsetHeight, margem = 12;

        if (!alvo) {
            caixa.style.left = `${(vw - cw) / 2}px`;
            caixa.style.top = `${Math.max(margem, (vh - ch) / 2)}px`;
            return;
        }

        const r = alvo.getBoundingClientRect(), folga = 6;
        foco.style.top = `${r.top - folga}px`;
        foco.style.left = `${r.left - folga}px`;
        foco.style.width = `${r.width + folga * 2}px`;
        foco.style.height = `${r.height + folga * 2}px`;

        // Abaixo do alvo se couber; senão acima; senão no rodapé da tela
        let top;
        if (r.bottom + folga + margem + ch <= vh) top = r.bottom + folga + margem;
        else if (r.top - folga - margem - ch >= 0) top = r.top - folga - margem - ch;
        else top = vh - ch - margem;
        const left = Math.min(Math.max(margem, r.left + r.width / 2 - cw / 2), vw - cw - margem);
        caixa.style.top = `${Math.max(margem, top)}px`;
        caixa.style.left = `${left}px`;
    }

    function fechar() {
        try { localStorage.setItem(CHAVE, '1'); } catch (e) { /* sem armazenamento */ }
        document.removeEventListener('keydown', teclado);
        window.removeEventListener('scroll', agendar);
        window.removeEventListener('resize', agendar);
        cancelAnimationFrame(quadro);
        [bloqueio, foco, caixa].forEach(el => el && el.remove());
        bloqueio = foco = caixa = alvo = null;
        if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus({ preventScroll: true });
    }

    function iniciar() {
        if (caixa) return;
        focoAnterior = document.activeElement;
        // Fecha o menu do celular, se estiver aberto, para não cobrir os passos
        const menu = document.getElementById('main-menu');
        const botaoMenu = document.getElementById('menu-toggle');
        if (menu && botaoMenu && celular() && !menu.classList.contains('hidden')) botaoMenu.click();
        montar();
        ir(0);
    }

    document.querySelectorAll('[data-tour-iniciar]').forEach(btn => btn.addEventListener('click', e => {
        e.preventDefault();
        iniciar();
    }));

    // Primeira visita: abre sozinho, depois que a página terminou de se montar
    let visto = true;
    try { visto = localStorage.getItem(CHAVE) === '1'; } catch (e) { /* sem armazenamento: não insiste */ }
    if (!visto) setTimeout(iniciar, 800);
});
