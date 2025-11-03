// Объявление констант для кодов клавиш
const KeyCodes = {
    CHANNEL_UP: [166, 427, 27, 33, 402],
    CHANNEL_DOWN: [167, 428, 28, 34, 403],
    KEY_0: [48, 96, 11],
    KEY_5: [53, 101, 6],
    KEY_8: [56, 104, 9]
};

function log(...args) {
    console.log('Hotkeys', ...args);
}

Lampa.Platform.tv();
log('Hotkeys 1.7.1 loaded');

function openPanel(elementSelector) {
    const currentVersion = parseFloat(Lampa.Manifest.app_version);

    if (currentVersion >= 1.7) {
        Lampa.Utils.trigger(document.querySelector(elementSelector), 'click');
    } else {
        document.querySelector(elementSelector).click();
    }
};

function listenDestroy() {
    document.removeEventListener("keydown", listenHotkeys);
    Lampa.Player.listener.remove('destroy', listenDestroy); 
};

function startHotkeys() {
    document.addEventListener("keydown", listenHotkeys);
    Lampa.Player.listener.follow('destroy', listenDestroy);
};

function handleSpecificKey(e, selector, keyName) {
    // Общая логика для 0, 5, 8
    if (!document.querySelector('body.selectbox--open')) {
        openPanel(selector);
    } else {
        history.back();
    }
    
    // Предотвращение стандартного поведения после обработки
    e.preventDefault();
    e.stopPropagation();
}

function listenHotkeys(e) {
    const keyCode = e.keyCode;

    switch(true) {
        // Channel Up
        case KeyCodes.CHANNEL_UP.includes(keyCode):
            openPanel('.player-panel__next.button.selector');
            e.preventDefault();
            e.stopPropagation();
            break;

        // Channel Down
        case KeyCodes.CHANNEL_DOWN.includes(keyCode):
            openPanel('.player-panel__prev.button.selector');
            e.preventDefault();
            e.stopPropagation();
            break;

        // 0 (Субтитры)
        case KeyCodes.KEY_0.includes(keyCode):
            // Используем новую вспомогательную функцию для обработки и предотвращения
            handleSpecificKey(e, '.player-panel__subs.button.selector', '0');
            break;

        // 5 (Плейлист/Серии)
        case KeyCodes.KEY_5.includes(keyCode):
            handleSpecificKey(e, '.player-panel__playlist.button.selector', '5');
            break;

        // 8 (Аудиодорожки)
        case KeyCodes.KEY_8.includes(keyCode):
            handleSpecificKey(e, '.player-panel__tracks.button.selector', '8');
            break;
            
        default:
            // Для необработанных клавиш ничего не делаем
            return; 
    }
}

Lampa.Player.listener.follow('ready', startHotkeys);
