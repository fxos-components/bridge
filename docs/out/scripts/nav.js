(function setActiveLinks() {
  var links = document.querySelectorAll('nav a');
  for (var i = links.length - 1; i >= 0; i--) {
    if (links[i].pathname === location.pathname) {
      links[i].classList.add('active');
    }
  }
})();
