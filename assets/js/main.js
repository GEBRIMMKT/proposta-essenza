(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  if (!root.lang) root.lang = 'pt-BR';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  function revealAll() { revealEls.forEach(function (el) { el.classList.remove('pre-fade', 'pre-slide'); }); }

  /* Entrada discreta: a primeira tela surge ao carregar; o resto desliza de leve, sem nunca ficar invisível */
  if (!reduce && 'IntersectionObserver' in window) {
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove('pre-slide'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) { el.classList.add('pre-fade'); }
      else { el.classList.add('pre-slide'); io.observe(el); }
    });
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        revealEls.forEach(function (el) { el.classList.remove('pre-fade'); });
      });
    });
  }

  /* Seção ativa no menu */
  var links = Array.prototype.slice.call(document.querySelectorAll('.menu a'));
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach(function (s) { so.observe(s); });
  }

  /* Barra de progresso e borda do cabeçalho */
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress');
  var ticking = false;
  function onScroll() {
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = 'scaleX(' + p + ')';
    header.classList.toggle('scrolled', window.scrollY > 8);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* Menu no celular e tablet */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* PDF
     Arquivo local: o botão abre a impressão do navegador ("Salvar como PDF").
     Link publicado (claude.ai): a impressão é bloqueada, então o botão oferece o PDF pronto,
     publicado junto com a página, pelo download do próprio visualizador. */
  var pdfBtns = Array.prototype.slice.call(document.querySelectorAll('[data-print]'));
  var dica = document.querySelector('[data-pdf-dica]');
  var aviso = document.querySelector('[data-pdf-status]');
  function avisar(msg) { if (aviso) { aviso.textContent = msg; aviso.hidden = !msg; } }

  function baixar(downloads, btn) {
    setMenu(false);
    avisar('');
    btn.disabled = true;
    fetch('proposta-essenza.pdf')
      .then(function (r) { if (!r.ok) throw { code: 'fetch' }; return r.blob(); })
      .then(function (blob) {
        return downloads.save({ filename: 'Proposta Comercial Essenza - Laila Gebrim.pdf', data: blob });
      })
      .catch(function (e) {
        var c = e && e.code;
        if (c === 'declined') return;
        if (c === 'rate_limited') { avisar('Já existe um download aguardando confirmação.'); return; }
        if (c === 'fetch') { avisar('Não foi possível carregar o PDF agora. Tente de novo em instantes.'); return; }
        avisar('O download do PDF não está disponível nesta visualização.');
        pdfBtns.forEach(function (b) { b.hidden = true; });
      })
      .then(function () { btn.disabled = false; });
  }

  if (window.claude && typeof window.claude.use === 'function') {
    pdfBtns.forEach(function (b) { b.hidden = true; });
    if (dica) dica.hidden = true;
    window.claude.use('downloads').then(function (downloads) {
      if (!downloads) return;
      pdfBtns.forEach(function (b) {
        var l = b.querySelector('[data-pdf-label]');
        if (l) l.innerHTML = b.classList.contains('btn-pdf') ? 'Baixar<span class="longo"> PDF</span>' : 'Baixar PDF';
        b.hidden = false;
        b.addEventListener('click', function () { baixar(downloads, b); });
      });
      if (dica) { dica.textContent = 'Versão A4 da proposta, para imprimir ou enviar.'; dica.hidden = false; }
    }, function () {});
  } else if (/^https?:$/.test(location.protocol)) {
    /* Site publicado (GitHub Pages): o botão entrega o PDF A4 pronto, que abre bem em qualquer
       celular e no navegador do WhatsApp. Sem o PDF no servidor, volta para a impressão. */
    var pdfWeb = 'proposta-essenza.pdf';
    var temPdf = true;
    var dicaOriginal = dica ? dica.textContent : '';
    if (dica) dica.textContent = 'Versão A4 da proposta, para imprimir ou enviar.';
    fetch(pdfWeb, { method: 'HEAD', cache: 'no-store' })
      .then(function (r) { temPdf = r.ok; }, function () { temPdf = false; })
      .then(function () { if (!temPdf && dica) dica.textContent = dicaOriginal; });
    pdfBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        setMenu(false);
        if (!temPdf) { revealAll(); window.print(); return; }
        var a = document.createElement('a');
        a.href = pdfWeb;
        a.download = 'Proposta Comercial Essenza - Laila Gebrim.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    });
  } else {
    pdfBtns.forEach(function (b) {
      b.addEventListener('click', function () { setMenu(false); revealAll(); window.print(); });
    });
  }
  window.addEventListener('beforeprint', revealAll);
})();
