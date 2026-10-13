// Tema claro/escuro do portal.
// Carregado no <head> (sem defer) para aplicar o tema antes de desenhar a página, sem "piscar" em branco.
// Escolha salva em localStorage ("tema": "escuro" | "claro"); sem escolha, segue o sistema operacional.
// O botão sol/lua é inserido na barra superior (ao lado de "Meu Perfil") das páginas que a têm.
(function () {
    'use strict';
    const raiz = document.documentElement;
    const sistemaEscuro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const salvo = () => { try { return localStorage.getItem('tema'); } catch (e) { return null; } };
    const atual = () => salvo() || (sistemaEscuro && sistemaEscuro.matches ? 'escuro' : 'claro');

    function aplicar(tema) {
        if (tema === 'escuro') raiz.setAttribute('data-tema', 'escuro');
        else raiz.removeAttribute('data-tema');
        document.querySelectorAll('.cf-tema-btn').forEach(atualizarBotao);
        // Avisa as páginas que desenham com cores próprias (ex.: gráficos de indicadores.js)
        document.dispatchEvent(new CustomEvent('cf-tema', { detail: { tema } }));
    }
    aplicar(atual());

    // Sem escolha salva, acompanha a mudança do sistema
    if (sistemaEscuro && sistemaEscuro.addEventListener) {
        sistemaEscuro.addEventListener('change', () => { if (!salvo()) aplicar(atual()); });
    }

    function atualizarBotao(btn) {
        const escuro = raiz.getAttribute('data-tema') === 'escuro';
        btn.setAttribute('aria-pressed', String(escuro));
        btn.setAttribute('aria-label', escuro ? 'Usar tema claro' : 'Usar tema escuro');
        btn.title = escuro ? 'Tema claro' : 'Tema escuro';
        btn.innerHTML = `<i class="fa-solid ${escuro ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Barra superior padrão: insere o botão antes de "Meu Perfil"
        const perfil = [...document.querySelectorAll('a[href="meu-perfil.html"]')].find(a => !a.closest('header, main, footer, nav, aside'));
        if (!perfil) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cf-tema-btn inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-blue-100 transition hover:bg-white/10 hover:text-white';
        atualizarBotao(btn);
        btn.addEventListener('click', () => {
            const novo = raiz.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
            try { localStorage.setItem('tema', novo); } catch (e) { /* sem armazenamento: vale só nesta página */ }
            aplicar(novo);
        });
        perfil.parentElement.insertBefore(btn, perfil);
    });
})();
