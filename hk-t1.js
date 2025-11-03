Lampa.Platform.tv();

function log(...args) {
    console.log('Hotkeys:', ...args); // Логирование
}

// 1. Унифицированная функция для клика по элементу
function HKopenPanel(element) {
    const el = document.querySelector(element);
    if (!el) {
        log('Error', `Element not found: ${element}`);
        return;
    }
    
    // В новой версии Lampa (>= 1.7) используем Lampa.Utils.trigger
    if (parseFloat(Lampa.Manifest.app_version) >= 1.7) {
        // Дополнительный совет: иногда нужно сфокусироваться перед триггером
        // el.focus(); 
        Lampa.Utils.trigger(el, 'click');
    } else {
        // Для старых версий
        el.click();
    }
};

// 2. Обработчик нажатия клавиш
function listenHK(e) {
    log('Event', e.keyCode);
    
    // --- ВАЖНОЕ ИСПРАВЛЕНИЕ: Предотвращение конфликтов событий ---
    // Это нужно, чтобы Lampa или другие обработчики не перехватили клавишу
    e.preventDefault(); 
    e.stopPropagation();

    // Маппинг для кнопок "Следующий/Предыдущий"
    const simpleActions = {
        // Следующий: 166, 427, 27, 33, 892, 68
        '166,427,27,33,892,68': '.player-panel__next.button.selector',
        // Предыдущий: 167, 428, 28, 34, 893, 65
        '167,428,28,34,893,65': '.player-panel__prev.button.selector'
    };

    // 2.1. Проверяем простые действия
    for (const codes in simpleActions) {
        if (codes.split(',').includes(String(e.keyCode))) {
            HKopenPanel(simpleActions[codes]); // Использование HKopenPanel
            return;
        }
    }

    // 2.2. Обработка сложных действий (списки)
    // Проверка, что selectbox НЕ открыт
    if (!document.querySelector('body.selectbox--open')) {
        const listActions = {
            // Субтитры: 48, 96, 17
            '48,96,17': '.player-panel__subs.button.selector',
            // Плейлист: 53, 101, 9
            '53,101,9': '.player-panel__playlist.button.selector',
            // Аудиодорожки: 56, 104, 13
            '56,104,13': '.player-panel__tracks.button.selector'
        };

        for (const codes in listActions) {
            if (codes.split(',').includes(String(e.keyCode))) {
                HKopenPanel(listActions[codes]); // Использование HKopenPanel
                return;
            }
        }
    } else {
        // Если открыт селектбокс, и нажата одна из клавиш списков, то history.back()
        const closeKeys = [48, 96, 17, 53, 101, 9, 56, 104, 13];
        if (closeKeys.includes(e.keyCode)) {
             // Закрытие работает. history.back() должен работать, если Lampa не изменила этот механизм.
             history.back(); 
             return;
        }
    }
};

// 3. Управление слушателями
function ListenHKDestroy() {
    document.removeEventListener("keydown", listenHK);
    Lampa.Player.listener.remove('destroy', ListenHKDestroy);    
};

function StartHK() {
    document.addEventListener("keydown", listenHK);
    Lampa.Player.listener.follow('destroy', ListenHKDestroy);
};

// 4. Запуск после готовности плеера
Lampa.Player.listener.follow('ready',StartHK);
