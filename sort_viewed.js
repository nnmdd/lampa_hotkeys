(function () {
    console.log('[SmartSort] Plugin loading...');

    // 1. Добавляем перевод
    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    // 2. Глобальный перехват сортировки
    // Это "мозг" плагина. Если массив содержит сиды и выбран наш метод - сортируем.
    var originalSort = Lampa.Arrays.sort;
    Lampa.Arrays.sort = function (items, method) {
        if (method === 'custom_smart') {
            console.log('[SmartSort] Global Sort triggered for custom_smart');
            
            items.sort(function (a, b) {
                var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;

                // Сначала просмотренные
                if (vA !== vB) return vB - vA;

                // Затем по сидам
                var sA = parseInt(a.seeders || a.seeds || 0);
                var sB = parseInt(b.seeders || b.seeds || 0);
                return sB - sA;
            });
            
            console.log('[SmartSort] Sorting finished. First item:', items[0] ? items[0].title : 'empty');
            return; // Прерываем стандартную сортировку
        }
        return originalSort.apply(this, arguments);
    };

    function start() {
        console.log('[SmartSort] Setting up UI Listeners...');

        // 3. Подписываемся на события всех торрент-компонентов
        Lampa.Listener.follow('torrent', function (e) {
            // Тип 'render' или 'complite' - идеальный момент для внедрения в меню
            if (e.type === 'render' || e.type === 'complite' || e.type === 'ready') {
                console.log('[SmartSort] Torrent event detected:', e.type);

                // Ищем объект фильтра в компоненте
                var component = e.object;
                if (component && component.filter) {
                    var hasItem = component.filter.some(function (f) { return f.base === 'custom_smart'; });
                    
                    if (!hasItem) {
                        console.log('[SmartSort] Injecting item into filter menu');
                        component.filter.push({
                            title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                            base: 'custom_smart',
                            active: Lampa.Storage.get('torrent_filter', 'seeders') === 'custom_smart'
                        });
                    }
                }
            }
        });
        
        console.log('[SmartSort] UI Listeners Ready');
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
