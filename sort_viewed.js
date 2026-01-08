(function () {
    console.log('[SmartSort] Hooking into buildSorted...');

    // 1. Добавляем перевод для интерфейса
    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    function start() {
        var originalTorrent = Lampa.Component.get('torrent');

        // Переопределяем компонент торрентов
        Lampa.Component.add('torrent', function (object) {
            // Добавляем пункт в массив фильтров
            if (object.filter && !object.filter.find(function(f){ return f.base === 'custom_smart' })) {
                object.filter.push({
                    title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                    base: 'custom_smart'
                });
            }

            var comp = new originalTorrent(object);

            // СОХРАНЯЕМ ОРИГИНАЛЬНЫЙ buildSorted
            var originalBuildSorted = comp.buildSorted;

            // ПЕРЕХВАТЫВАЕМ buildSorted
            comp.buildSorted = function (items) {
                var filter = Lampa.Storage.get('torrent_filter', 'seeders');
                
                console.log('[SmartSort] buildSorted called! Filter:', filter);

                if (filter === 'custom_smart') {
                    // Используем переданные items или те, что уже есть в компоненте
                    var list = items || comp.items;

                    if (list && Array.isArray(list)) {
                        console.log('[SmartSort] Sorting logic applied to', list.length, 'items');
                        
                        list.sort(function (a, b) {
                            // 1. Сначала просмотренные (глаз)
                            var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                            var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;

                            if (vA !== vB) return vB - vA;

                            // 2. Затем по сидам
                            var sA = parseInt(a.seeders || a.seeds || 0);
                            var sB = parseInt(b.seeders || b.seeds || 0);
                            return sB - sA;
                        });

                        // После ручной сортировки вызываем рендер
                        // Мы не вызываем originalBuildSorted, чтобы он не перетер нашу сортировку
                        if (comp.render) {
                            comp.render();
                        }
                        return; 
                    }
                }

                // Если выбран другой фильтр — работаем в штатном режиме
                return originalBuildSorted.apply(this, arguments);
            };

            return comp;
        });
        
        console.log('[SmartSort] buildSorted hook injected successfully');
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
