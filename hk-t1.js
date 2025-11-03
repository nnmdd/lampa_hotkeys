Lampa.Platform.tv();

function log(...args) {
    console.log('Hotkeys:', ...args);
}

function HKopenPanel(element) {
    const el = document.querySelector(element);
    if (!el) {
        log('Error', `Element not found: ${element}`);
        return;
    }
    
    if (parseFloat(Lampa.Manifest.app_version) >= 1.7) {
        Lampa.Utils.trigger(el, 'click');
    } else {
        el.click();
    }
};

function listenHK(e) {
    log('Event', e.keyCode);
    
    // Маппинг для кнопок "Следующий/Предыдущий"
    const simpleActions = {
        '166,427,27,33,892,68': '.player-panel__next.button.selector',
        '167,428,28,34,893,65': '.player-panel__prev.button.selector'
    };

    // 2.1. Проверяем простые действия
    for (const codes in simpleActions) {
        if (codes.split(',').includes(String(e.keyCode))) {
            HKopenPanel(simpleActions[codes]); 
            
            // Прерываем после успешной обработки
            e.preventDefault(); 
            e.stopPropagation();
            
            return;
        }
    }

    // 2.2. Обработка сложных действий (списки)
    if (!document.querySelector('body.selectbox--open')) {
        const listActions = {
            // Кнопки для Субтитров (0, 96, 17)
            '48,96,17': '.player-panel__subs.button.selector',
            // Кнопки для Плейлиста (53, 101, 9)
            '53,101,9': '.player-panel__playlist.button.selector',
            // Кнопки для Аудиодорожек (56, 104) - Код 13 (Enter) удален
            '56,104': '.player-panel__tracks.button.selector'
        };

        for (const codes in listActions) {
            if (codes.split(',').includes(String(e.keyCode))) {
                HKopenPanel(listActions[codes]); 
                
                e.preventDefault(); 
                e.stopPropagation();
                
                return;
            }
        }
    } else {
        // Если открыт селектбокс, и нажата одна из клавиш списков, то history.back()
        // КОД 13 (ENTER) УДАЛЕН, чтобы Lampa могла его использовать для выбора элемента
        const closeKeys = [48, 96, 17, 53, 101, 9, 56, 104]; 
        
        if (closeKeys.includes(e.keyCode)) {
             history.back(); 
             
             e.preventDefault(); 
             e.stopPropagation();
             
             return;
        }
    }
};

function ListenHKDestroy() {
    document.removeEventListener("keydown", listenHK);
    Lampa.Player.listener.remove('destroy', ListenHKDestroy);    
};

function StartHK() {
    document.addEventListener("keydown", listenHK);
    Lampa.Player.listener.follow('destroy', ListenHKDestroy);
};

Lampa.Player.listener.follow('ready',StartHK);
