document.addEventListener("keydown", listenFilter);
function listenFilter(e) {
  if (e.keyCode === 49) {
  //    log('Hotkeys', '1 pressed');
    log('Filter', Storage.get('torrents_filter', '{}'));
    }
};
listenFilter;
log('Filter',  Storage.get('torrents_filter', '{}'));
