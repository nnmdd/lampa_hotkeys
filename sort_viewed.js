(function () {
    window.torrent_sort_viewed = {
        name: 'Sort Torrents by Viewed',
        version: '1.0.0',
        description: 'Сортировка: сначала просмотренные, затем по количеству сидов'
    };

    function start() {
        // Подписываемся на события компонента торрентов
        Lampa.Listener.follow('torrent', function (e) {
            // Тип 'complite' или 'received' обычно означает, что список торрентов загружен
            if (e.type === 'complite' || e.type === 'received') {
                if (e.items && Array.isArray(e.items)) {
                    sortItems(e.items);
                }
            }
        });
    }

    /**
     * Логика сортировки
     * @param {Array} items - массив объектов торрентов
     */
    function sortItems(items) {
        items.sort(function (a, b) {
            // 1. Проверяем статус "Просмотрено"
            // Lampa хранит историю просмотров, функция Arrays.isViewed возвращает true/false
            var viewedA = Lampa.Arrays.isViewed(a) ? 1 : 0;
            var viewedB = Lampa.Arrays.isViewed(b) ? 1 : 0;

            // Сначала просмотренные (1), потом непросмотренные (0)
            if (viewedA !== viewedB) {
                return viewedB - viewedA; 
            }

            // 2. Если статус просмотра одинаковый, сортируем по сидам (по убыванию)
            var seedsA = parseInt(a.seeders || 0);
            var seedsB = parseInt(b.seeders || 0);

            return seedsB - seedsA;
        });
    }

    // Инициализация плагина после готовности приложения
    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
