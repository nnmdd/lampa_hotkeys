document.addEventListener("keydown", function(inEvent){
log('Hotkeys', 'Hotkeys loaded');
Lampa.Platform.tv();
function isElementVisible(element) {
        if (element.offsetWidth || 
            element.offsetHeight || 
            element.getClientRects().length)
            return true;
        else
            return false;
    };

	if (isElementVisible(document.querySelector('player')) === true) {
		log('Hotkeys', 'player found');

		if (inEvent.keyCode === 48) {
			log('Hotkeys', '0 pressed');
			if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
			  document.querySelector('.player-panel__subs.button.selector').click();
			} else {
			  history.back();
			}
		  }
		  if (inEvent.keyCode === 53) {
			  log('Hotkeys', '5 pressed');
			if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
			  document.querySelector('.player-panel__playlist.button.selector').click();
			} else {
			  history.back();
			}
		  }
		  if (inEvent.keyCode === 56) {
			  log('Hotkeys', '8 pressed');
			if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
			  document.querySelector('.player-panel__tracks.button.selector').click();
			} else {
			  history.back();
			}
		  }
	}
});
