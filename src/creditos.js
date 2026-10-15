// Saldo de créditos de consultoria e histórico de compras (simulação no navegador, chave "creditosConsultoria").
// Usado por consultoria.html (compra), meu-perfil.html (saldo e últimas compras) e hotsite-consultoria.html (uso nas consultas).
// Compra no cartão soma ao saldo na hora; no boleto fica "pendente" até a confirmação do pagamento.
// Cada gravação avisa a página com o evento "cf:creditos" (o contador de créditos do hotsite se atualiza).
window.CFCreditos = (function () {
    const KEY = 'creditosConsultoria';
    const SALDO_INICIAL = 150; // saldo de demonstração do usuário logado

    function ler() {
        try {
            const data = JSON.parse(localStorage.getItem(KEY));
            if (data && typeof data.saldo === 'number' && Array.isArray(data.compras)) return { usos: [], ...data };
        } catch (e) { /* armazenamento indisponível ou corrompido */ }
        return { saldo: SALDO_INICIAL, compras: [], usos: [] };
    }

    function gravar(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
            window.dispatchEvent(new CustomEvent('cf:creditos', { detail: data }));
            return true;
        } catch (e) {
            return false;
        }
    }

    // compra: { pacote, creditos, valor, parcelas, pagamento: 'cartao' | 'boleto' }
    function registrarCompra(compra) {
        const data = ler();
        const status = compra.pagamento === 'boleto' ? 'pendente' : 'aprovado';
        data.compras.unshift({ ...compra, status, data: new Date().toISOString() });
        data.compras = data.compras.slice(0, 20);
        if (status === 'aprovado') data.saldo += compra.creditos;
        gravar(data);
        return data;
    }

    // Debita créditos de uma consulta (hotsite-consultoria.html) e registra o uso. Retorna false se o saldo não cobre.
    function usar(creditos, descricao) {
        const data = ler();
        if (data.saldo < creditos) return false;
        data.saldo -= creditos;
        data.usos.unshift({ creditos, descricao: descricao || 'Consulta', data: new Date().toISOString() });
        data.usos = data.usos.slice(0, 20);
        gravar(data);
        return data;
    }

    return { ler, registrarCompra, usar };
})();
