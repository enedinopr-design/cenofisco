// Indicadores (séries do SGS/Banco Central). Sem "tipo": série mensal de variação % no mês;
// tipo 'cambio': cotação diária em R$.
// Compartilhado por indicadores.html (página completa) e index.html (cartão "Indicadores e Taxas").
// Para incluir um índice, acrescente uma linha com o código da série no SGS.
window.CF_INDICADORES = [
    { id: 'igpm', sgs: 189, nome: 'IGP-M', fonte: 'FGV', grupo: 'Inflação', desc: 'Índice Geral de Preços – Mercado. Muito usado no reajuste de aluguéis e contratos.' },
    { id: 'igpdi', sgs: 190, nome: 'IGP-DI', fonte: 'FGV', grupo: 'Inflação', desc: 'Índice Geral de Preços – Disponibilidade Interna.' },
    { id: 'ipca', sgs: 433, nome: 'IPCA', fonte: 'IBGE', grupo: 'Inflação', desc: 'Índice Nacional de Preços ao Consumidor Amplo. É a inflação oficial do país.' },
    { id: 'inpc', sgs: 188, nome: 'INPC', fonte: 'IBGE', grupo: 'Inflação', desc: 'Índice Nacional de Preços ao Consumidor. Referência para reajustes salariais e de benefícios.' },
    { id: 'selic', sgs: 4390, nome: 'Selic', fonte: 'Banco Central', grupo: 'Juros', desc: 'Taxa Selic acumulada no mês. Usada na correção de tributos federais pagos em atraso.' },
    { id: 'tr', sgs: 7811, nome: 'TR', fonte: 'Banco Central', grupo: 'Juros', desc: 'Taxa Referencial (primeiro dia do mês). Usada na correção do FGTS e da poupança.' },
    // Câmbio: série diária (PTAX de venda); a página usa o fechamento de cada mês
    { id: 'dolar', sgs: 1, tipo: 'cambio', nome: 'Dólar', fonte: 'PTAX', grupo: 'Câmbio', desc: 'Dólar americano – taxa PTAX de venda, divulgada diariamente pelo Banco Central. Referência para conversão de valores em moeda estrangeira.' },
    { id: 'euro', sgs: 21619, tipo: 'cambio', nome: 'Euro', fonte: 'PTAX', grupo: 'Câmbio', desc: 'Euro – taxa PTAX de venda, divulgada diariamente pelo Banco Central. Referência para conversão de valores em moeda estrangeira.' }
];
