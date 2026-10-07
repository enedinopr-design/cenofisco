// NCMs salvas para monitoramento (simulação no navegador, chave "monitorNcm").
// Usado pela Busca Fiscal (buscafiscal-resultados.html e ncm.html); a lista aparece em
// Meu Perfil › Meus documentos › NCMs monitoradas (mesmo formato dos outros itens salvos: title, link).
window.CFMonitorNcm = (function () {
    const KEY = 'monitorNcm';
    const digitos = v => String(v || '').replace(/\D/g, '');
    const formatar = d => (d.length <= 4 ? d : d.length <= 6 ? `${d.slice(0, 4)}.${d.slice(4)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`);

    function lista() {
        try {
            const data = JSON.parse(localStorage.getItem(KEY));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }
    function gravar(itens) {
        try { localStorage.setItem(KEY, JSON.stringify(itens)); return true; } catch (e) { return false; }
    }

    const monitorada = ncm => lista().some(i => i.id === digitos(ncm));

    // Alterna o monitoramento; devolve true se a NCM passou a ser monitorada
    function alternar(ncm, descricao) {
        const id = digitos(ncm);
        let itens = lista();
        if (itens.some(i => i.id === id)) {
            gravar(itens.filter(i => i.id !== id));
            return false;
        }
        const texto = String(descricao || '').replace(/\s+/g, ' ').trim();
        itens.unshift({
            id,
            title: `NCM ${formatar(id)}${texto ? ` – ${texto.length > 90 ? texto.slice(0, 87) + '…' : texto}` : ''}`,
            link: `ncm.html?codigo=${formatar(id)}`,
            date: new Date().toLocaleDateString('pt-BR')
        });
        gravar(itens);
        return true;
    }

    return { lista, monitorada, alternar };
})();
