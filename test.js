document.addEventListener("keydown", listenFilter);
function listenFilter(e) {
  if (e.keyCode === 49) {
  //    log('Hotkeys', '1 pressed');
    log('Filter', this.selectedFilter);
    }
};
listenFilter();
