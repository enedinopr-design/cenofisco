// Landing page de assinatura Cenofisco — abas e menu mobile
(function () {
  const tabs = document.querySelectorAll('.lp-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    });
    tab.addEventListener('keydown', (e) => {
      const list = [...tabs];
      const i = list.indexOf(tab);
      let next = null;
      if (e.key === 'ArrowRight') next = list[(i + 1) % list.length];
      if (e.key === 'ArrowLeft') next = list[(i - 1 + list.length) % list.length];
      if (next) { next.click(); next.focus(); }
    });
  });

  const btn = document.getElementById('lp-menu-btn');
  const nav = document.getElementById('lp-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
    });
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }));
  }
})();
