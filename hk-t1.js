Lampa.Platform.tv();

/**
 * Универсальная функция логирования с префиксом.
 */
function log(...args) {
    console.log('Hotkeys', ...args);
}

/**
 * Открывает панель по селектору.
 * Включает проверку на существование элемента и обработку версий Lampa.
 */
function openPanel(elementSelector) {
    const el = document.querySelector(elementSelector);
    if (!el) {
        log('Error', `Element not found: ${elementSelector}`);
        return;
    }
    
    // Сравнение версий
    if (parseFloat(Lampa.Manifest.app_version) >= 1.7) {
        Lampa.Utils.trigger(el, 'click');
    } else {
        el.click();
    }
};

/**
 * Удаляет обработчики событий при уничтожении плеера.
 */
function listenDestroy() {
    document.removeEventListener("keydown", listenHotkeys);
    Lampa.Player.listener.remove('destroy', listenDestroy);    
    // log('Hotkeys', 'Destroy listener removed'); 
};

/**
 * Запускает прослушивание горячих клавиш.
 */
function startHotkeys() {
    document.addEventListener("keydown", listenHotkeys);
    Lampa.Player.listener.follow('destroy', listenDestroy);
    log('Hotkeys', 'Hotkeys listener started');
};


// --- КОНСТАНТЫ ДЛЯ ОБРАБОТКИ КЛАВИШ ---
// Использование массивов чисел вместо строк повышает производительность и чистоту
const SIMPLE_ACTIONS = {
    // Channel Up / Page Up / Next Episode
    next: {
        codes: [166, 427, 27, 33, 892, 68], 
        selector: '.player-panel__next.button.selector'
    },
    // Channel Down / Page Down / Previous Episode
    prev: {
        codes: [167, 428, 28, 34, 893, 65], 
        selector: '.player-panel__prev.button.selector'
    }
};

const LIST_ACTIONS = {
    // 0 (Субтитры)
    subs: {
        codes: [48, 96, 17], 
        selector: '.player-panel__subs.button.selector'
    },
    // 5 (Плейлист/Серии)
    playlist: {
        codes: [53, 101, 9], 
        selector: '.player-panel__playlist.button.selector'
    },
    // 8 (Аудиодорожки)
    tracks: {
        codes: [56, 104], 
        selector: '.player-panel__tracks.button.selector'
    }
};

// Все клавиши, которые должны закрывать selectbox, если он открыт
const CLOSE_KEYS = [
    ...LIST_ACTIONS.subs.codes, 
    ...LIST_ACTIONS.playlist.codes, 
    ...LIST_ACTIONS.tracks.codes
];
// ----------------------------------------


/**
 * Основной обработчик события keydown.
 */
function listenHotkeys(e) {
    // log('Event', e.keyCode);
    const keyCode = e.keyCode;

    // 1. Проверяем, открыт ли selectbox
    if (document.querySelector('body.selectbox--open')) {
        
        // Если открыт и нажата одна из клавиш списка (0, 5, 8), закрываем его.
        if (CLOSE_KEYS.includes(keyCode)) {
            history.back();
            
            e.preventDefault(); 
            e.stopPropagation();
            return;
        }
        
        // Если открыт, но нажата не клавиша закрытия, то ничего не делаем, 
        // чтобы не мешать навигации по selectbox.
        return;
    }

    // 2. Если selectbox НЕ открыт, обрабатываем простые действия
    // Используем Object.values для итерации по объекту-маппингу
    for (const action of Object.values(SIMPLE_ACTIONS)) {
        if (action.codes.includes(keyCode)) {
            openPanel(action.selector);
            
            // Прерываем после успешной обработки
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    }

    // 3. Обработка действий со списками (открытие)
    for (const action of Object.values(LIST_ACTIONS)) {
        if (action.codes.includes(keyCode)) {
            openPanel(action.selector);
            
            // Прерываем после успешной обработки
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    }
    
    // Если клавиша не обработана, позволяем событию пройти дальше.
};

// Запуск горячих клавиш при готовности плеера
Lampa.Player.listener.follow('ready', startHotkeys);
