// Rodapé compartilhado por todas as páginas do portal (exceto assine.html e checkout.html, que têm rodapé próprio):
// ano atual no copyright e feedback da newsletter (integrar ao back-end quando houver).
document.addEventListener('DOMContentLoaded', function () {
    const anoAtual = document.getElementById('ano-atual');
    if (anoAtual) anoAtual.textContent = new Date().getFullYear();

    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', e => {
            e.preventDefault();
            const feedback = document.getElementById('newsletter-feedback');
            if (feedback) {
                feedback.textContent = 'Obrigado! Seu e-mail foi cadastrado.';
                feedback.classList.remove('hidden');
            }
            newsletterForm.reset();
        });
    }
});
