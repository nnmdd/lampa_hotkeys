(function () {
    // 1. Добавляем название нового метода сортировки в локализацию Lampa
    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    function start() {
        var originalTorrent = Lampa.Component.get('torrent');

        // Перехватываем компонент торрентов
        Lampa.Component.add('torrent', function (object) {
            // 2. Инъекция нового пункта в список фильтров перед созданием компонента
            if (object.filter) {
                var hasSmartSort = object.filter.some(function(f) { return f.base === 'custom_smart'; });
                
                if (!hasSmartSort) {
                    object.filter.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +', // Добавляем символ "+"
                        base: 'custom_smart',
                        active: false
                    });
                }
            }

            var comp = new originalTorrent(object);
            var originalOnRecived = comp.onRecived;

            // 3. Перехватываем метод получения данных
            comp.onRecived = function (items) {
                // Узнаем, какой метод сортировки выбран в данный момент
                // Lampa сохраняет выбор фильтра в Storage под ключом 'torrent_filter'
                var currentFilter = Lampa.Storage.get('torrent_filter', 'seeders');

                if (currentFilter === 'custom_smart' && items && Array.isArray(items)) {
                    
                    // ПРИМЕНЯЕМ ВАШУ ЛОГИКУ
                    items.sort(function (a, b) {
                        // Сначала проверяем статус просмотра
                        var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                        var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;

                        if (vA !== vB) {
                            return vB - vA; // Просмотренные (1) будут выше непросмотренных (0)
                        }

                        // Если статус просмотра одинаковый — сортируем по сидам
                        var sA = parseInt(a.seeders || a.seeds || 0);
                        var sB = parseInt(b.seeders || b.seeds || 0);
                        return sB - sA; // По убыванию
                    });
                    
                    // Визуальное подтверждение в консоли (для отладки)
                    console.log('Lampa Smart Sort: Applied custom sorting');
                }

                // Передаем данные дальше (оригинальному компоненту)
                return originalOnRecived.apply(this, [items]);
            };

            return comp;
        });
    }

    // Запуск плагина при готовности системы
    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
