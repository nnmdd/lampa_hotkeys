(function () {
    // Регистрация метаданных плагина для системы Lampa
    window.torrent_smart_sort = {
        name: 'Smart Torrent Sort',
        version: '1.1.0',
        description: 'Мгновенная сортировка: сначала просмотренные, затем по сидам'
    };

    function start() {
        // Подписываемся на основной поток событий торрент-компонента
        Lampa.Listener.follow('torrent', function (e) {
            // 'complite' - это ключевое событие, когда данные получены и готовы к выводу
            if (e.type === 'complite') {
                if (e.items && Array.isArray(e.items)) {
                    applySmartSort(e.items);
                }
            }
        });
    }

    /**
     * Применяет логику сортировки к массиву объектов
     * @param {Array} items - оригинальный массив торрентов из события
     */
    function applySmartSort(items) {
        items.sort(function (a, b) {
            // 1. Проверка на статус "Просмотрено"
            // Lampa сопоставляет торренты по названию/хешу в локальной базе истории
            var viewedA = Lampa.Arrays.isViewed(a) ? 1 : 0;
            var viewedB = Lampa.Arrays.isViewed(b) ? 1 : 0;

            // Сначала просмотренные (значение 1 выше чем 0)
            if (viewedA !== viewedB) {
                return viewedB - viewedA; 
            }

            // 2. Если оба просмотрены или оба нет — сортируем по сидам
            // Используем parseInt, так как некоторые парсеры отдают сиды строкой
            var seedsA = parseInt(a.seeders || 0);
            var seedsB = parseInt(b.seeders || 0);

            // По убыванию сидов
            return seedsB - seedsA;
        });
        
        // Массив изменен по ссылке, Lampa подхватит изменения автоматически при отрисовке
    }

    // Ожидаем готовности приложения для запуска
    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
