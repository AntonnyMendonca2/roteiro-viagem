/* Páginas de texto (privacidade.html, como-e-mantido.html): preenche o nome e o e-mail do
   responsável a partir de DATA.config (js/data.js) e liga o banner/escolha de cookies. */
import './data.js';
import './consent.js';

const D = window.DATA, cfg = D.config || {}, r = cfg.responsavel || {};
const valores = { nome: r.nome, validade: cfg.linkCurtoValidadeDias };
document.querySelectorAll('[data-cfg]').forEach(el => { const v = valores[el.dataset.cfg]; if (v != null && v !== '') el.textContent = v; });
if (r.email) document.querySelectorAll('[data-cfg-email]').forEach(a => { a.href = 'mailto:' + r.email; a.textContent = r.email; });

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act="cookies"]');
  if (t) window.Consent.abrir('config');
});
window.Consent.iniciar();
