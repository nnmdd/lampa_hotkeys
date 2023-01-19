Lampa.Platform.tv();
function log() {
        console.log.apply(console.log, arguments);
      }
log('Hotkeys', 'Hotkeys 1.7.0 loaded');

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
			Lampa.Utils.trigger(document.querySelector('.player-panel__subs.button.selector'), 'click');
		} else {
		      history.back();
    		}
	}
	if (e.keyCode === 53 || e.keyCode === 101) {
  		//log('Hotkeys', '5 pressed');
		if (!document.querySelector('body.selectbox--open')) {
			//log('Hotkeys', 'playlist not visible');
			Lampa.Utils.trigger(document.querySelector('.player-panel__playlist.button.selector'), 'click');
    		} else {
      			history.back();
    		}
  	}
  	if (e.keyCode === 56 || e.keyCode === 104) {
    		//log('Hotkeys', '8 pressed');
    		if (!document.querySelector('body.selectbox--open')) {
			//log('Hotkeys', 'audio list not visible');
			Lampa.Utils.trigger(document.querySelector('.player-panel__tracks.button.selector'), 'click');
    		} else {
      			history.back();
		}
  	}
};
Lampa.Player.listener.follow('ready',startHotkeys);
