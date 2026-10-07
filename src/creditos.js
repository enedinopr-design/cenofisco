// Saldo de créditos de consultoria e histórico de compras (simulação no navegador, chave "creditosConsultoria").
// Usado por consultoria.html (compra) e meu-perfil.html (saldo e últimas compras).
// Compra no cartão soma ao saldo na hora; no boleto fica "pendente" até a confirmação do pagamento.
window.CFCreditos = (function () {
    const KEY = 'creditosConsultoria';
    const SALDO_INICIAL = 150; // saldo de demonstração do usuário logado

    function ler() {
        try {
            const data = JSON.parse(localStorage.getItem(KEY));
            if (data && typeof data.saldo === 'number' && Array.isArray(data.compras)) return data;
        } catch (e) { /* armazenamento indisponível ou corrompido */ }
        return { saldo: SALDO_INICIAL, compras: [] };
    }

    function gravar(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
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

    return { ler, registrarCompra };
})();
