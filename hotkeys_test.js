function log() {
        console.log.apply(console.log, arguments);
      }
log('Hotkeys', 'Hotkeys 1.7.0 loaded');
function openPanel(element) {
	if (Lampa.Manifest.app_version == '1.7.0')
		Lampa.Utils.trigger(document.querySelector(element), 'click');
	} else {
		document.querySelector(element).click();
};

function listenDestroy() {
	document.removeEventListener("keydown", listenHotkeys);
	Lampa.Player.listener.remove('destroy', listenDestroy);	
};

function startHotkeys() {
	document.addEventListener("keydown", listenHotkeys);
	Lampa.Player.listener.follow('destroy', listenDestroy);
};

function listenHotkeys(e) {
	
  if (e.keyCode === 48 || e.keyCode === 96) {
    //log('Hotkeys', '0 pressed');
    if (!document.querySelector('body.selectbox--open')) {
	//log('Hotkeys', 'subs list not visible');
	//document.querySelector('.player-panel__subs.button.selector').click();
	//Lampa.Utils.trigger(document.querySelector('.player-panel__subs.button.selector'), 'click');
  openPanel('.player-panel__subs.button.selector');
    } else {
      history.back();
    }
  }
  if (e.keyCode === 53 || e.keyCode === 101) {
    //log('Hotkeys', '5 pressed');
    if (!document.querySelector('body.selectbox--open')) {
	//log('Hotkeys', 'playlist not visible');
	//document.querySelector('.player-panel__playlist.button.selector').click();
	//Lampa.Utils.trigger(document.querySelector('.player-panel__playlist.button.selector'), 'click');
      openPanel('.player-panel__playlist.button.selector');
    } else {
      history.back();
    }
  }
  if (e.keyCode === 56 || e.keyCode === 104) {
    //log('Hotkeys', '8 pressed');
    if (!document.querySelector('body.selectbox--open')) {
	//log('Hotkeys', 'audio list not visible');
	//document.querySelector('.player-panel__tracks.button.selector').click();
	//Lampa.Utils.trigger(document.querySelector('.player-panel__tracks.button.selector'), 'click');
      openPanel('.player-panel__tracks.button.selector');
    } else {
      history.back();
    }
  }
};

Lampa.Player.listener.follow('ready',startHotkeys);
