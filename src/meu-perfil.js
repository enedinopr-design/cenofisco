// Página Meu Perfil (simulação, sem backend)
// - Dados do perfil: chave perfilUsuario (editados pelo diálogo "Editar perfil").
// - Usuários da conta: chave perfilUsuarios (começa com os exemplos abaixo).
// - Meus documentos: lê as listas "Salvar" das demais páginas (savedLegislacao, savedNoticias,
//   savedProcedimentos, savedRegulations, savedAplicativos, savedObligations) e permite remover itens.
// O menu mobile e a busca global ficam em index.js.
document.addEventListener('DOMContentLoaded', function () {
    const $ = id => document.getElementById(id);

    function escapeHTML(text) {
        return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function readList(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }
    function writeList(key, list) {
        try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* sem armazenamento */ }
    }

    // Aviso discreto no canto da tela
    let toastTimer = null;
    function showToast(message, type) {
        let toast = $('perfil-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'perfil-toast';
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

    const setResumo = (name, value) => document.querySelectorAll(`[data-resumo="${name}"]`).forEach(el => { el.textContent = value; });

    // ------------------------------------------------------------------
    // Perfil
    // ------------------------------------------------------------------
    const PERFIL_KEY = 'perfilUsuario';
    const perfilPadrao = { nome: 'Enedino', email: 'enedino.pr@multieditoras.com.br', telefone: '', empresa: '' };

    function readPerfil() {
        try {
            return { ...perfilPadrao, ...(JSON.parse(localStorage.getItem(PERFIL_KEY)) || {}) };
        } catch (e) {
            return { ...perfilPadrao };
        }
    }

    function iniciais(nome) {
        const partes = nome.trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return '?';
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    function renderPerfil() {
        const p = readPerfil();
        document.querySelectorAll('[data-perfil]').forEach(el => {
            el.textContent = p[el.dataset.perfil] || '—';
        });
        document.querySelectorAll('[data-perfil-primeiro-nome]').forEach(el => {
            el.textContent = p.nome.trim().split(/\s+/)[0] || p.nome;
        });
        $('perfil-avatar').textContent = iniciais(p.nome);
    }

    const dialog = $('dialog-perfil');
    const formPerfil = $('form-perfil');

    function abrirEdicao() {
        const p = readPerfil();
        Object.keys(perfilPadrao).forEach(k => { formPerfil.elements[k].value = p[k]; });
        dialog.showModal();
    }

    $('btn-editar-perfil').addEventListener('click', abrirEdicao);
    document.querySelectorAll('[data-editar-perfil]').forEach(b => b.addEventListener('click', abrirEdicao));
    $('cancelar-perfil').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

    formPerfil.addEventListener('submit', e => {
        if (!formPerfil.checkValidity()) {
            e.preventDefault();
            formPerfil.reportValidity();
            return;
        }
        const dados = {};
        Object.keys(perfilPadrao).forEach(k => { dados[k] = formPerfil.elements[k].value.trim(); });
        writeList(PERFIL_KEY, dados);
        renderPerfil();
        showToast('Perfil atualizado.', 'success');
    });

    // ------------------------------------------------------------------
    // Meus documentos
    // ------------------------------------------------------------------
    const tiposDoc = [
        { key: 'savedLegislacao', label: 'Legislação', icon: 'fa-scale-balanced', pagina: 'legislacao.html', meta: d => d.date },
        { key: 'savedNoticias', label: 'Notícias', icon: 'fa-newspaper', pagina: 'noticias.html', meta: d => [d.area, d.date].filter(Boolean).join(' · ') },
        { key: 'savedProcedimentos', label: 'Procedimentos', icon: 'fa-list-check', pagina: 'procedimentos.html', meta: d => [d.area, d.date].filter(Boolean).join(' · ') },
        { key: 'savedRegulations', label: 'Regulamentos', icon: 'fa-book', pagina: 'regulamentos.html', meta: d => d.sigla },
        { key: 'savedAplicativos', label: 'Ferramentas', icon: 'fa-screwdriver-wrench', pagina: 'aplicativos.html', meta: () => '' },
        { key: 'monitorNcm', label: 'NCMs monitoradas', icon: 'fa-bell', pagina: 'buscafiscal-resultados.html', meta: d => d.date ? `Monitorada desde ${d.date}` : '' },
        {
            key: 'savedObligations', label: 'Obrigações', icon: 'fa-calendar-check', pagina: 'agenda-obrigacoes.html',
            id: d => d.key,
            link: d => `agenda-obrigacoes.html#${d.rowId || 'dia-' + String(d.date || '').replace(/\//g, '-')}`,
            meta: d => [d.date, d.subtitle].filter(Boolean).join(' · ')
        }
    ];
    const idDe = (tipo, d) => (tipo.id ? tipo.id(d) : d.id || d.link || d.title);

    const tabsEl = $('doc-tabs');
    const docList = $('doc-list');
    let tipoAtivo = tiposDoc[0].key;

    function renderDocs() {
        const contagens = tiposDoc.map(t => readList(t.key).length);
        setResumo('documentos', contagens.reduce((a, b) => a + b, 0));

        tabsEl.innerHTML = tiposDoc.map((t, i) => {
            const ativo = t.key === tipoAtivo;
            return `<button type="button" role="tab" id="tab-${t.key}" aria-controls="doc-list" aria-selected="${ativo}" tabindex="${ativo ? 0 : -1}"
                class="tab-button cursor-pointer${ativo ? ' active' : ''}" data-tipo="${t.key}">${t.label}
                <span class="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">${contagens[i]}</span></button>`;
        }).join('');
        docList.setAttribute('aria-labelledby', `tab-${tipoAtivo}`);

        const tipo = tiposDoc.find(t => t.key === tipoAtivo);
        const itens = readList(tipo.key);
        if (!itens.length) {
            docList.innerHTML = `<li class="py-8 text-center text-sm text-slate-500">
                <i class="fa-regular fa-bookmark mb-2 block text-2xl text-slate-300" aria-hidden="true"></i>
                Nenhum item salvo em ${tipo.label}.
                <a href="${tipo.pagina}" class="font-semibold text-blue-700 hover:underline">Ir para ${tipo.label}</a></li>`;
            return;
        }
        docList.innerHTML = itens.map(d => {
            const link = tipo.link ? tipo.link(d) : d.link;
            const meta = tipo.meta(d);
            const titulo = link
                ? `<a href="${escapeHTML(link)}" class="font-medium text-slate-900 hover:text-blue-800 hover:underline">${escapeHTML(d.title)}</a>`
                : `<span class="font-medium text-slate-900">${escapeHTML(d.title)}</span>`;
            return `<li class="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
                <span class="cf-icon size-8! text-sm"><i class="fa-solid ${tipo.icon}" aria-hidden="true"></i></span>
                <div class="min-w-0 flex-1">${titulo}${meta ? `<p class="mt-0.5 text-xs text-slate-500">${escapeHTML(meta)}</p>` : ''}</div>
                <button type="button" class="remove-doc inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    data-id="${escapeHTML(idDe(tipo, d))}" aria-label="Remover ${escapeHTML(d.title)}" title="Remover"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button>
            </li>`;
        }).join('');
    }

    tabsEl.addEventListener('click', e => {
        const b = e.target.closest('[data-tipo]');
        if (!b) return;
        tipoAtivo = b.dataset.tipo;
        renderDocs();
        $(`tab-${tipoAtivo}`).focus();
    });
    tabsEl.addEventListener('keydown', e => {
        const i = tiposDoc.findIndex(t => t.key === tipoAtivo);
        const passos = { ArrowRight: 1, ArrowLeft: -1 };
        let j = null;
        if (e.key in passos) j = (i + passos[e.key] + tiposDoc.length) % tiposDoc.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tiposDoc.length - 1;
        if (j === null) return;
        e.preventDefault();
        tipoAtivo = tiposDoc[j].key;
        renderDocs();
        $(`tab-${tipoAtivo}`).focus();
    });
    docList.addEventListener('click', e => {
        const b = e.target.closest('.remove-doc');
        if (!b) return;
        const tipo = tiposDoc.find(t => t.key === tipoAtivo);
        writeList(tipo.key, readList(tipo.key).filter(d => idDe(tipo, d) !== b.dataset.id));
        renderDocs();
        showToast('Item removido de Meus documentos.');
    });

    // Abre na primeira aba que tiver itens
    const primeiraComItens = tiposDoc.find(t => readList(t.key).length);
    if (primeiraComItens) tipoAtivo = primeiraComItens.key;

    // ------------------------------------------------------------------
    // Usuários da conta
    // ------------------------------------------------------------------
    const USERS_KEY = 'perfilUsuarios';
    const usuariosPadrao = [
        { id: 'u1', nome: 'João Silva', email: 'joao.silva@empresa.com', status: 'ativo' },
        { id: 'u2', nome: 'Maria Oliveira', email: 'maria.o@empresa.com', status: 'inativo' },
        { id: 'u3', nome: 'Carlos Souza', email: 'carlos.s@empresa.com', status: 'ativo' }
    ];
    const readUsers = () => (localStorage.getItem(USERS_KEY) === null ? usuariosPadrao : readList(USERS_KEY));

    const usersBody = $('users-tbody');
    const addForm = $('add-user-form');
    const toggleAdd = $('toggle-add-user-form');
    const addError = $('add-user-error');

    function renderUsers() {
        const users = readUsers();
        setResumo('usuarios', users.filter(u => u.status === 'ativo').length);
        if (!users.length) {
            usersBody.innerHTML = '<tr><td colspan="3" class="py-6 text-center text-slate-500">Nenhum usuário cadastrado.</td></tr>';
            return;
        }
        usersBody.innerHTML = users.map(u => {
            const ativo = u.status === 'ativo';
            return `<tr>
                <td class="py-3 pr-4">
                    <div class="flex items-center gap-3">
                        <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600" aria-hidden="true">${escapeHTML(iniciais(u.nome))}</span>
                        <div class="min-w-0"><p class="font-medium text-slate-900">${escapeHTML(u.nome)}</p><p class="truncate text-xs text-slate-500">${escapeHTML(u.email)}</p></div>
                    </div>
                </td>
                <td class="py-3 pr-4">
                    <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                        <span class="size-1.5 rounded-full ${ativo ? 'bg-emerald-500' : 'bg-slate-400'}" aria-hidden="true"></span>${ativo ? 'Ativo' : 'Bloqueado'}</span>
                </td>
                <td class="py-3 text-right whitespace-nowrap">
                    <button type="button" class="toggle-user cf-btn ${ativo ? 'cf-btn-secondary' : 'cf-btn-soft'} px-3 py-1.5 text-xs" data-id="${escapeHTML(u.id)}">${ativo ? 'Bloquear' : 'Liberar'}</button>
                    <button type="button" class="remove-user inline-flex size-8 cursor-pointer items-center justify-center rounded-lg align-middle text-slate-400 transition hover:bg-red-50 hover:text-red-600" data-id="${escapeHTML(u.id)}" aria-label="Excluir ${escapeHTML(u.nome)}" title="Excluir"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    function mostrarFormulario(abrir) {
        addForm.classList.toggle('hidden', !abrir);
        toggleAdd.setAttribute('aria-expanded', String(abrir));
        addError.classList.add('hidden');
        if (abrir) $('new-user-name').focus();
        else addForm.reset();
    }

    toggleAdd.addEventListener('click', () => mostrarFormulario(addForm.classList.contains('hidden')));
    $('cancel-add-user').addEventListener('click', () => mostrarFormulario(false));

    $('gerar-senha').addEventListener('click', () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        const bytes = crypto.getRandomValues(new Uint32Array(10));
        $('new-user-password').value = Array.from(bytes, n => chars[n % chars.length]).join('');
    });

    addForm.addEventListener('submit', e => {
        e.preventDefault();
        const nome = addForm.elements.name.value.trim();
        const email = addForm.elements.email.value.trim().toLowerCase();
        const users = readUsers();
        let erro = '';
        if (!nome) erro = 'Informe o nome completo.';
        else if (!addForm.elements.email.checkValidity() || !email) erro = 'Informe um e-mail válido.';
        else if (users.some(u => u.email.toLowerCase() === email)) erro = 'Já existe um usuário com este e-mail.';
        else if (addForm.elements.password.value.length < 8) erro = 'A senha provisória deve ter ao menos 8 caracteres.';
        if (erro) {
            addError.textContent = erro;
            addError.classList.remove('hidden');
            return;
        }
        users.push({ id: 'u' + Date.now(), nome, email, status: addForm.elements.status.value });
        writeList(USERS_KEY, users);
        mostrarFormulario(false);
        renderUsers();
        showToast(`${nome} foi adicionado(a).`, 'success');
    });

    usersBody.addEventListener('click', e => {
        const toggle = e.target.closest('.toggle-user');
        const remove = e.target.closest('.remove-user');
        if (!toggle && !remove) return;
        const id = (toggle || remove).dataset.id;
        let users = readUsers();
        const user = users.find(u => u.id === id);
        if (!user) return;
        if (remove) {
            if (!confirm(`Excluir o usuário ${user.nome}?`)) return;
            users = users.filter(u => u.id !== id);
            showToast(`${user.nome} foi excluído(a).`);
        } else {
            user.status = user.status === 'ativo' ? 'inativo' : 'ativo';
            showToast(`${user.nome} foi ${user.status === 'ativo' ? 'liberado(a)' : 'bloqueado(a)'}.`, user.status === 'ativo' ? 'success' : undefined);
        }
        writeList(USERS_KEY, users);
        renderUsers();
    });

    // ------------------------------------------------------------------
    // Créditos de consultoria: saldo e últimas compras (creditos.js; compra em consultoria.html)
    // ------------------------------------------------------------------
    const comprasList = $('compras-creditos');
    function renderCreditos() {
        if (!window.CFCreditos) return;
        const { saldo, compras } = window.CFCreditos.ler();
        setResumo('creditos', saldo.toLocaleString('pt-BR'));
        if (!comprasList) return;
        const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        comprasList.innerHTML = compras.length
            ? compras.slice(0, 3).map(c => `
                <li class="flex items-start justify-between gap-3 py-2">
                    <span class="min-w-0">
                        <span class="block font-medium text-slate-800">+${c.creditos.toLocaleString('pt-BR')} créditos</span>
                        <span class="block text-xs text-slate-500">${new Date(c.data).toLocaleDateString('pt-BR')} · ${brl(c.valor)} · ${c.pagamento === 'boleto' ? 'boleto' : c.parcelas > 1 ? `cartão em ${c.parcelas}x` : 'cartão à vista'}</span>
                    </span>
                    <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.status === 'pendente' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}">${c.status === 'pendente' ? 'Aguardando pagamento' : 'Aprovada'}</span>
                </li>`).join('')
            : '<li class="py-2 text-xs text-slate-500">Nenhuma compra de créditos ainda.</li>';
    }

    // Atualiza se outra aba salvar/remover algo
    window.addEventListener('storage', () => { renderPerfil(); renderDocs(); renderUsers(); renderCreditos(); });

    renderPerfil();
    renderDocs();
    renderUsers();
    renderCreditos();
});
