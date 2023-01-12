function log() {
        console.log.apply(console.log, arguments);
      }
log('Hotkeys', 'Hotkeys loaded');
function listenDestroy() {
	document.removeEventListener("keydown", listenHotkeys);
	Lampa.Player.listener.remove('destroy', listenDestroy);	
};

function startHotkeys() {
	document.addEventListener("keydown", listenHotkeys);
	Lampa.Player.listener.follow('destroy', listenDestroy);
};

function listenHotkeys(e) {
	
  if (e.keyCode === 48) {
    log('Hotkeys', '0 pressed');
    if (document.querySelector('.selectbox--open') == undefined) {
      document.querySelector('.player-panel__subs.button.selector').click();
    } else {
      history.back();
    }
  }
  if (e.keyCode === 53) {
    log('Hotkeys', '5 pressed');
    if (document.querySelector('.selectbox--open') == undefined) {
      document.querySelector('.player-panel__playlist.button.selector').click();
    } else {
      history.back();
    }
  }
  if (e.keyCode === 56) {
    log('Hotkeys', '8 pressed');
    if (document.querySelector('.selectbox--open') == undefined) {
      document.querySelector('.player-panel__tracks.button.selector').click();
    } else {
      history.back();
    }
  }
};

Lampa.Player.listener.follow('ready',startHotkeys);
