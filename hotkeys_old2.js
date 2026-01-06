(function () {
    Lampa.Platform.tv();

    function log() {
        console.log.apply(console.log, arguments);
    }

    log('Hotkeys', '1.7.1b loaded');

    function listenDestroy() {
        document.removeEventListener("keydown", listenHotkeys);
        Lampa.Player.listener.remove('destroy', listenDestroy);
    }

    function startHotkeys() {
        document.addEventListener("keydown", listenHotkeys);
        Lampa.Player.listener.follow('destroy', listenDestroy);
    } 

    function listenHotkeys(e) {
        // Клавиша 0
        if (e.keyCode === 48 || e.keyCode === 96) {
            if (!document.querySelector('body.selectbox--open')) {
                Lampa.Utils.trigger(document.querySelector('.player-panel__subs.button.selector'), 'click');
                e.preventDefault(); 
                e.stopPropagation();
                return;
            } else {
                history.back();
            }
        } 
        // Клавиша 5
        else if (e.keyCode === 53 || e.keyCode === 101) {
            if (!document.querySelector('body.selectbox--open')) {
                Lampa.Utils.trigger(document.querySelector('.player-panel__playlist.button.selector'), 'click');
                e.preventDefault(); 
                e.stopPropagation();
                return;              
            } else {
                history.back();
            }
        } 
        // Клавиша 8
        else if (e.keyCode === 56 || e.keyCode === 104) {
            if (!document.querySelector('body.selectbox--open')) {
                Lampa.Utils.trigger(document.querySelector('.player-panel__tracks.button.selector'), 'click');
                e.preventDefault(); 
                e.stopPropagation();
                return;             
            } else {
                history.back();
            }
        }
    } 

    Lampa.Player.listener.follow('ready', startHotkeys);
})();
