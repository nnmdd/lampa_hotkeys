(function () {
    "use strict";

    if (typeof Lampa === 'undefined') return;

    Lampa.Platform.tv();

    function log() {
        if (window.console && console.log) {
            console.log.apply(console, arguments);
        }
    }

    log('Hotkeys', '1.7.1b');

    function listenDestroy() {
        document.removeEventListener("keydown", listenHotkeys);
        Lampa.Player.listener.remove('destroy', listenDestroy);
    }

    function startHotkeys() {
        document.addEventListener("keydown", listenHotkeys);
        Lampa.Player.listener.follow('destroy', listenDestroy);
    }

    function listenHotkeys(e) {
        var keyCode = e.keyCode || e.which;
        var isMenuOpen = document.body.classList.contains('selectbox--open');
        var targetSelector = '';

        if (keyCode === 48 || keyCode === 96) {
            targetSelector = '.player-panel__subs.button.selector';
        } else if (keyCode === 53 || keyCode === 101) {
            targetSelector = '.player-panel__playlist.button.selector';
        } else if (keyCode === 56 || keyCode === 104) {
            targetSelector = '.player-panel__tracks.button.selector';
        }

        if (targetSelector) {
            if (!isMenuOpen) {
                var element = document.querySelector(targetSelector);
                if (element) {
                    Lampa.Utils.trigger(element, 'click');
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else {
                window.history.back();
            }
        }
    }

    Lampa.Player.listener.follow('ready', startHotkeys);
})();
