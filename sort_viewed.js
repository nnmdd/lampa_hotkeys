(function () {
    /**
     * Плагин для принудительной сортировки торрентов
     * Приоритет: 1. Просмотренные, 2. Кол-во сидов
     */
    
    function start() {
        // Сохраняем оригинальный компонент торрентов
        var originalTorrent = Lampa.Component.get('torrent');

        // Переопределяем компонент
        Lampa.Component.add('torrent', function (object) {
            var comp = new originalTorrent(object);
            var originalRender = comp.render;

            // Перехватываем метод рендера
            comp.render = function () {
                if (comp.items && Array.isArray(comp.items) && comp.items.length > 0) {
                    
                    comp.items.sort(function (a, b) {
                        // 1. Проверка на статус просмотра
                        // Lampa помечает торрент просмотренным, если его открывали
                        var viewedA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                        var viewedB = Lampa.Arrays.isViewed(b) ? 1 : 0;

                        if (viewedA !== viewedB) {
                            return viewedB - viewedA; // Сначала просмотренные (1 > 0)
                        }

                        // 2. Сортировка по сидам
                        var seedA = parseInt(a.seeders || a.seeds || 0);
                        var seedB = parseInt(b.seeders || b.seeds || 0);

                        return seedB - seedA; // По убыванию
                    });
                }
                
                // Вызываем оригинальный рендер с уже отсортированными данными
                return originalRender.apply(comp, arguments);
            };

            return comp;
        });
    }

    // Запуск плагина
    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
