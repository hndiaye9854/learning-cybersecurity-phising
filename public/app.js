// Affiche le message d'erreur si le serveur a refusé le pseudo.
(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  if (params.get('erreur') === 'pseudo') {
    var el = document.getElementById('form-error');
    if (el) el.hidden = false;
  }
})();
