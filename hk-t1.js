Lampa.Platform.tv();
function log(...args) {
    console.log('Hotkeys:', ...args); // Принимаем аргументы и добавляем префикс
}
function HKopenPanel(element) {
	if (parseFloat(Lampa.Manifest.app_version) >= 1.7) {
        //log('Hotkeys', '1.7.0');
		Lampa.Utils.trigger(document.querySelector(element), 'click');
	} else {
        //log('Hotkeys', 'old version');
		document.querySelector(element).click();
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

function listenHK(e) {
    log('Hotkeys', e.keyCode);
    
    // Маппинг для кнопок "Следующий/Предыдущий"
    const simpleActions = {
        // Кнопки для "Следующий" (e.keyCode === 166 || ... || 68)
        '166,427,27,33,892,68': '.player-panel__next.button.selector',
        // Кнопки для "Предыдущий" (e.keyCode === 167 || ... || 65)
        '167,428,28,34,893,65': '.player-panel__prev.button.selector'
    };

    // Проверяем простые действия
    for (const codes in simpleActions) {
        if (codes.split(',').includes(String(e.keyCode))) {
            Lampa.Utils.trigger(document.querySelector(simpleActions[codes]), 'click');
            return; // Выходим после обработки хоткея
        }
    }

    // Обработка сложных действий (списки)
    if (!document.querySelector('body.selectbox--open')) {
        const listActions = {
            // Кнопки для Субтитров (0, 96, 17)
            '48,96,17': '.player-panel__subs.button.selector',
            // Кнопки для Плейлиста (53, 101, 9)
            '53,101,9': '.player-panel__playlist.button.selector',
            // Кнопки для Аудиодорожек (56, 104, 13)
            '56,104,13': '.player-panel__tracks.button.selector'
        };

        for (const codes in listActions) {
            if (codes.split(',').includes(String(e.keyCode))) {
                Lampa.Utils.trigger(document.querySelector(listActions[codes]), 'click');
                return;
            }
        }
    } else {
        // Если открыт селектбокс, и нажата одна из клавиш списков, то history.back()
        if ([48,96,17, 53,101,9, 56,104,13].includes(e.keyCode)) {
             history.back();
        }
    }
};

Lampa.Player.listener.follow('ready',StartHK);
