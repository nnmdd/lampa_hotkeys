(function () {
    function start() {
        var originalTorrent = Lampa.Component.get('torrent');

        Lampa.Component.add('torrent', function (object) {
            var comp = new originalTorrent(object);
            
            // Перехватываем метод обработки полученных данных
            var originalOnRecived = comp.onRecived;

            comp.onRecived = function (items) {
                if (items && Array.isArray(items)) {
                    // 1. Сначала базовая сортировка по сидам для всех
                    items.sort(function (a, b) {
                        var sA = parseInt(a.seeders || a.seeds || 0);
                        var sB = parseInt(b.seeders || b.seeds || 0);
                        return sB - sA;
                    });

                    // 2. Затем стабильная сортировка: выносим просмотренные вверх
                    // Мы используем .sort еще раз или один сложный sort
                    items.sort(function (a, b) {
                        var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                        var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                        
                        if (vA !== vB) {
                            return vB - vA; // Просмотренные (1) выше непросмотренных (0)
                        }
                        return 0; // Сохраняем порядок сидов внутри групп
                    });
                }

                // Передаем уже отсортированный список в оригинальный метод
                return originalOnRecived.apply(this, arguments);
            };

            return comp;
        });
    }

    // Ожидание готовности
    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
