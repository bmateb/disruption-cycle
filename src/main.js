(function () {
  const P = new URLSearchParams(location.hash.slice(1));
  const h = ['light', 'dark'].indexOf(P.get('theme')) >= 0 ? P.get('theme') : null; if (h) document.documentElement.dataset.theme = h;
  if (P.get('host')) hostEntry(P); else if (P.get('r')) clientStart(P); else clientLanding(P);
})();
