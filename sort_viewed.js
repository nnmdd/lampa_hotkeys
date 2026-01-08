(function () {
    console.log('[SmartSort] Starting full plugin code...');

    // 1. Добавляем переводы
    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    function start() {
        // Сохраняем ссылку на оригинальный конструктор компонента
        var originalTorrent = Lampa.Component.get('torrent');

        // Перезаписываем регистрацию компонента 'torrent'
        Lampa.Component.add('torrent', function (object) {
            console.log('[SmartSort] Creating new torrent instance...');

            // А. Внедряем кнопку в список фильтров интерфейса
            if (object && object.filter) {
                var hasItem = object.filter.find(function (f) { return f.base === 'custom_smart'; });
                if (!hasItem) {
                    object.filter.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart'
                    });
                    console.log('[SmartSort] Filter item added to UI array');
                }
            }

            // Создаем экземпляр компонента через оригинальный конструктор
            var comp = new originalTorrent(object);

            // Б. Перехватываем метод buildSorted прямо в созданном объекте
            // В lampa-source он обычно определяется как this.buildSorted = function...
            var originalBuild = comp.buildSorted;

            comp.buildSorted = function (items) {
                // Проверяем, какой фильтр сейчас выбран в настройках Lampa
                var currentFilter = Lampa.Storage.get('torrent_filter', 'seeders');
                console.log('[SmartSort] buildSorted triggered. Current filter:', currentFilter);

                if (currentFilter === 'custom_smart') {
                    // Берем список: либо переданный в аргументах, либо из самого компонента
                    var list = items || comp.items || [];

                    if (Array.isArray(list) && list.length > 0) {
                        console.log('[SmartSort] Applying sort logic to', list.length, 'items');

                        list.sort(function (a, b) {
                            // 1. Приоритет просмотренным (Lampa ставит метку в базу)
                            var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                            var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;

                            if (vA !== vB) return vB - vA; // Просмотренные выше

                            // 2. Вторичный приоритет - количество сидов
                            var sA = parseInt(a.seeders || a.seeds || 0);
                            var sB = parseInt(b.seeders || b.seeds || 0);
                            return sB - sA; // Больше сидов — выше
                        });

                        // После сортировки вызываем рендер, чтобы обновить экран
                        if (comp.render) {
                            console.log('[SmartSort] Calling component render');
                            comp.render();
                        }
                        return; // Выходим, чтобы оригинальный метод не пересортировал обратно
                    }
                }

                // Если выбран другой фильтр, вызываем штатную логику
                return originalBuild.apply(this, arguments);
            };

            return comp;
        });

        console.log('[SmartSort] Torrent component wrapped successfully');
    }

    // Запуск после готовности Lampa
    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
