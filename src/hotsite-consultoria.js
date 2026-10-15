// Hotsite da Consultoria Cenofisco, modelo: https://consultoria.cenofisco.com.br/
// Páginas: hotsite-consultoria.html (início) e uma por tipo de consulta, como no site anterior:
// consultoria-telefone.html, consultoria-online.html, consultoria-video.html e consultoria-presencial.html.
// Cada bloco abaixo só roda se a página tiver os elementos dele.
// - Créditos por tipo de consulta: mesmos valores de consultoria.js (manter os dois iguais). Pacotes e pagamento ficam só no checkout (consultoria.html).
// - Formulário de consulta: debita o saldo (creditos.js) e guarda a consulta em "Minhas consultas"
//   (simulação no navegador, chave "consultasHotsite"; integrar ao back-end quando houver).
//   Na página On-line o prazo é escolhido no formulário; nas de Vídeo e Presencial o tipo vem num campo oculto.
// - Consultas respondidas: as 3 mais recentes de consultas.json.
document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // agenda: tipos com data e período (vídeo e presencial)
    const tipos = [
        { id: 'telefone', nome: 'Telefone', icone: 'fa-phone', creditos: 4 },
        { id: 'escrita72', nome: 'Escrita em até 72h', curto: '72 horas', icone: 'fa-pen-to-square', creditos: 4 },
        { id: 'escrita48', nome: 'Escrita em até 48h', curto: '48 horas', icone: 'fa-pen-to-square', creditos: 8 },
        { id: 'escrita24', nome: 'Escrita em até 24h', curto: '24 horas', icone: 'fa-pen-to-square', creditos: 12 },
        { id: 'escrita12', nome: 'Escrita em até 12h', curto: '12 horas', icone: 'fa-pen-to-square', creditos: 24 },
        { id: 'video', nome: 'Videoconferência', icone: 'fa-video', creditos: 48, agenda: true },
        { id: 'presencial', nome: 'Presencial (1 hora)', icone: 'fa-location-dot', creditos: 96, agenda: true }
    ];
    const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

    // --- Menu do celular (fecha ao escolher um link) ---
    const menuToggle = $('menu-toggle');
    const mainMenu = $('main-menu');
    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', () => {
            const oculto = mainMenu.classList.toggle('hidden');
            menuToggle.setAttribute('aria-expanded', String(!oculto));
        });
        mainMenu.addEventListener('click', e => {
            if (e.target.closest('a') && window.matchMedia('(max-width: 1023.98px)').matches) {
                mainMenu.classList.add('hidden');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
    const ano = $('ano-atual');
    if (ano) ano.textContent = new Date().getFullYear();

    // --- Contador de créditos (cabeçalho) e saldo nos blocos [data-saldo] ---
    // O número "corre" até o novo valor quando o saldo muda; o painel mostra quantas consultas o saldo
    // permite por tipo e as últimas movimentações (compras e usos). Atualiza com o evento "cf:creditos" (creditos.js)
    // e quando outra aba muda o saldo.
    const creditos = window.CFCreditos;
    const num = v => v.toLocaleString('pt-BR');
    const dataCurta = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    let saldoExibido = null;

    function animarNumero(el, de, para) {
        if (de === null || de === para || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = num(para); return; }
        const inicio = performance.now(), dur = 700;
        const passo = t => {
            const p = Math.min(1, (t - inicio) / dur);
            el.textContent = num(Math.round(de + (para - de) * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
    }

    const painel = $('creditos-painel');
    const toggle = $('creditos-toggle');
    function renderPainel(dados) {
        if (!painel) return;
        const { saldo } = dados;
        const nivel = saldo < 4 ? ['bg-red-50 text-red-700', 'Saldo insuficiente para consultas']
            : saldo < 24 ? ['bg-amber-50 text-amber-700', 'Saldo baixo'] : ['bg-emerald-50 text-emerald-700', 'Saldo disponível'];
        const rende = tipos.filter(t => ['telefone', 'escrita72', 'escrita24', 'escrita12', 'video', 'presencial'].includes(t.id));
        const movimentos = [
            ...(dados.compras || []).map(c => ({ data: c.data, valor: c.creditos, rotulo: `Compra · pacote ${c.pacote}`, pendente: c.status === 'pendente' })),
            ...(dados.usos || []).map(u => ({ data: u.data, valor: -u.creditos, rotulo: u.descricao }))
        ].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 4);
        painel.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-xs font-medium text-slate-500">Seu saldo</p>
                    <p class="mt-0.5 text-3xl font-extrabold tracking-tight text-blue-900"><span data-saldo class="tabular-nums">${num(saldo)}</span> <span class="text-sm font-medium text-slate-500">créditos</span></p>
                </div>
                <span class="mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${nivel[0]}">${nivel[1]}</span>
            </div>
            <p class="mt-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Com esse saldo você faz até</p>
            <ul class="mt-1">
                ${rende.map(t => `<li class="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-b-0"><span class="flex items-center gap-2 text-slate-700"><i class="fa-solid ${t.icone} w-4 text-center text-xs text-blue-700" aria-hidden="true"></i>${esc(t.nome)}</span><strong class="font-semibold text-slate-900 tabular-nums">${num(Math.floor(saldo / t.creditos))}</strong></li>`).join('')}
            </ul>
            ${movimentos.length ? `
            <p class="mt-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Últimas movimentações</p>
            <ul class="mt-1">
                ${movimentos.map(m => `<li class="flex items-center justify-between gap-3 py-1.5 text-sm"><span class="min-w-0 truncate text-slate-700">${esc(m.rotulo)} <span class="text-xs text-slate-500">· ${dataCurta(m.data)}</span></span><strong class="shrink-0 font-semibold tabular-nums ${m.pendente ? 'text-amber-600' : m.valor > 0 ? 'text-emerald-600' : 'text-red-600'}">${m.pendente ? 'aguardando' : (m.valor > 0 ? '+' : '−') + num(Math.abs(m.valor))}</strong></li>`).join('')}
            </ul>` : ''}
            <div class="mt-4 grid grid-cols-2 gap-2">
                <a href="consultoria.html" class="cf-btn cf-btn-accent"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>Comprar</a>
                <a href="hotsite-consultoria.html#minhas-consultas" class="cf-btn cf-btn-secondary px-2 whitespace-nowrap">Minhas consultas</a>
            </div>`;
    }

    function mostrarSaldo() {
        const dados = creditos ? creditos.ler() : { saldo: 0, compras: [], usos: [] };
        renderPainel(dados);
        document.querySelectorAll('[data-saldo]').forEach(el => {
            if (painel && painel.contains(el)) return;   // o número grande do painel já sai pronto
            animarNumero(el, saldoExibido, dados.saldo);
        });
        // Botão do cabeçalho em vermelho/amarelo quando o saldo está acabando
        if (toggle) {
            toggle.classList.toggle('border-red-300', dados.saldo < 4);
            toggle.classList.toggle('border-amber-300', dados.saldo >= 4 && dados.saldo < 24);
        }
        saldoExibido = dados.saldo;
    }
    mostrarSaldo();
    window.addEventListener('cf:creditos', mostrarSaldo);
    window.addEventListener('storage', e => { if (e.key === 'creditosConsultoria') mostrarSaldo(); });

    if (toggle && painel) {
        const abrir = aberto => {
            painel.classList.toggle('hidden', !aberto);
            toggle.setAttribute('aria-expanded', String(aberto));
        };
        toggle.addEventListener('click', () => abrir(painel.classList.contains('hidden')));
        document.addEventListener('click', e => { if (!e.target.closest('#creditos-widget')) abrir(false); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !painel.classList.contains('hidden')) { abrir(false); toggle.focus(); } });
    }

    // --- Créditos por consulta (início do hotsite) ---
    const custo = $('custo-consultas');
    if (custo) {
        custo.innerHTML = tipos.map(t => `
            <li class="cf-row"><span class="flex items-center gap-2.5"><i class="fa-solid ${t.icone} w-4 text-center text-blue-700" aria-hidden="true"></i>${esc(t.nome)}</span><strong class="shrink-0 font-semibold text-slate-900">${t.creditos} <span class="text-xs font-normal text-slate-500">créditos</span></strong></li>`).join('');
    }

    // --- Minhas consultas (simulação) ---
    const CHAVE = 'consultasHotsite';
    const lerMinhas = () => { try { const l = JSON.parse(localStorage.getItem(CHAVE)); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
    function renderMinhas() {
        const ul = $('minhas-lista');
        const lista = lerMinhas();
        if (!ul || !lista.length) return;
        ul.innerHTML = lista.slice(0, Number(ul.dataset.limite) || 5).map(c => `
            <li class="py-3">
                <p class="font-medium text-slate-800">${esc(c.assunto)}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span class="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">${c.agenda ? 'Aguardando confirmação' : 'Aguardando resposta'}</span>
                    <span>${esc([c.tipo, c.cidade, c.area].filter(Boolean).join(' · '))}</span>
                    <span>Enviada em ${new Date(c.enviada).toLocaleDateString('pt-BR')}</span>
                </p>
            </li>`).join('');
    }
    renderMinhas();

    // --- Formulário de consulta (páginas On-line, Vídeo e Presencial) ---
    const form = $('form-consulta');
    if (form) {
        const escolhas = $('tipos-consulta');
        if (escolhas) {
            const ids = (escolhas.dataset.tipos || '').split(',');
            escolhas.innerHTML = tipos.filter(t => ids.includes(t.id)).map((t, i) => `
                <label class="cursor-pointer"><input type="radio" name="tipo" value="${t.id}" class="peer sr-only" ${i === 0 ? 'checked' : ''}><span class="cf-choice flex-col gap-0.5"><span>${esc(t.curto)}</span><span class="text-[11px] font-normal opacity-80">${t.creditos} créditos</span></span></label>`).join('');
        }
        const uf = $('consulta-uf');
        if (uf) uf.insertAdjacentHTML('beforeend', UFS.map(u => `<option>${u}</option>`).join(''));
        const dataInput = $('consulta-data');
        if (dataInput) {
            const amanha = new Date(Date.now() + 86400000);
            dataInput.min = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
        }

        const tipoAtual = () => tipos.find(t => t.id === form.elements.tipo.value) || tipos[1];
        const atualizarCusto = () => { $('consulta-custo').textContent = `${tipoAtual().creditos} créditos`; };
        form.addEventListener('change', e => { if (e.target.name === 'tipo') atualizarCusto(); });
        atualizarCusto();

        const pergunta = $('consulta-pergunta');
        const contador = $('consulta-contador');
        if (contador) pergunta.addEventListener('input', () => { contador.textContent = pergunta.value.length; });

        const aviso = $('consulta-erro');
        const AVISO_ERRO = 'mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700';
        form.addEventListener('submit', e => {
            e.preventDefault();
            aviso.className = AVISO_ERRO + ' hidden';
            const invalido = [...form.querySelectorAll('[required]')].find(el => !el.value.trim());
            if (invalido) {
                aviso.textContent = 'Preencha os campos obrigatórios (*).';
                aviso.className = AVISO_ERRO;
                invalido.focus();
                return;
            }
            const t = tipoAtual();
            if (!creditos || !creditos.usar(t.creditos, t.nome)) {
                aviso.innerHTML = `Saldo insuficiente para esta consulta (${t.creditos} créditos). <a href="consultoria.html" class="font-semibold underline">Comprar créditos</a>`;
                aviso.className = AVISO_ERRO;
                return;
            }
            const nova = {
                assunto: form.elements.assunto.value.trim(),
                area: form.elements.area.value,
                cidade: form.elements.cidade ? form.elements.cidade.value : '',
                tipo: t.nome,
                agenda: !!t.agenda,
                enviada: new Date().toISOString()
            };
            try { localStorage.setItem(CHAVE, JSON.stringify([nova, ...lerMinhas()].slice(0, 20))); } catch (err) { /* sem armazenamento */ }
            renderMinhas();   // o saldo se atualiza pelo evento cf:creditos
            form.reset();
            if (contador) contador.textContent = '0';
            atualizarCusto();
            aviso.className = 'mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800';
            aviso.textContent = form.dataset.sucesso || 'Consulta enviada!';
            $('minhas-consultas')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

    // --- Consultas respondidas (consultas.json) ---
    const respondidas = $('respondidas-lista');
    if (respondidas) {
        const cor = { 'Imposto de Renda': 'text-blue-700', 'Trabalhista': 'text-orange-700', 'Contabilidade': 'text-teal-700', 'Comércio Exterior': 'text-sky-700', 'Federal': 'text-violet-700', 'Estadual': 'text-emerald-700' };
        const chave = d => String(d || '').split('/').reverse().join('');
        fetch('consultas.json')
            .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(lista => {
                if (!Array.isArray(lista) || !lista.length) throw new Error('vazio');
                respondidas.innerHTML = lista.slice().sort((a, b) => chave(b.date).localeCompare(chave(a.date))).slice(0, 3).map(c => `
                    <article class="cf-card group flex flex-col">
                        <span class="cf-eyebrow ${cor[c.area] || 'text-blue-700'}">${esc(c.area)}</span>
                        <h3 class="mt-2 font-semibold text-pretty"><a href="consulta.html?id=${encodeURIComponent(c.id)}" class="transition group-hover:text-blue-800">${esc(c.title)}</a></h3>
                        <p class="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">${esc(c.summary)}</p>
                        <p class="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>Respondida em ${esc(c.date)}</span><a href="consulta.html?id=${encodeURIComponent(c.id)}" class="font-semibold text-blue-700 hover:underline" tabindex="-1" aria-hidden="true">Ler resposta</a></p>
                    </article>`).join('');
            })
            .catch(() => { respondidas.closest('section').hidden = true; });
    }

    // --- Fale Conosco (simulação) ---
    const contato = $('form-contato');
    if (contato) {
        const feedback = $('contato-feedback');
        contato.addEventListener('submit', e => {
            e.preventDefault();
            const invalido = [...contato.querySelectorAll('[required]')].find(el => !el.value.trim() || (el.type === 'email' && !el.checkValidity()));
            feedback.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-emerald-50', 'text-emerald-800');
            if (invalido) {
                feedback.classList.add('bg-red-50', 'text-red-700');
                feedback.textContent = invalido.type === 'email' && invalido.value ? 'Informe um e-mail válido.' : 'Preencha os campos obrigatórios (*).';
                invalido.focus();
                return;
            }
            feedback.classList.add('bg-emerald-50', 'text-emerald-800');
            feedback.textContent = 'Mensagem enviada! Em breve a equipe Cenofisco entra em contato.';
            contato.reset();
        });
    }
});
