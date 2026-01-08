(function () {
    console.log('[SmartSort] Global Prototype Hooking...');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    function start() {
        // 1. Пытаемся найти прототип компонента торрентов
        var torrentComponent = Lampa.Component.get('torrent');
        
        if (torrentComponent && torrentComponent.prototype) {
            
            // Сохраняем оригинальный метод создания
            var originalCreate = torrentComponent.prototype.create;

            torrentComponent.prototype.create = function() {
                var self = this;
                console.log('[SmartSort] Torrent instance created, injecting logic...');

                // А. Внедряем пункт в фильтр конкретного экземпляра
                if (this.object && this.object.filter) {
                    var hasItem = this.object.filter.find(function(f){ return f.base === 'custom_smart' });
                    if (!hasItem) {
                        this.object.filter.push({
                            title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                            base: 'custom_smart'
                        });
                        console.log('[SmartSort] Filter item injected into UI');
                    }
                }

                // Б. Перехватываем buildSorted
                var originalBuild = this.buildSorted;
                this.buildSorted = function(items) {
                    var currentFilter = Lampa.Storage.get('torrent_filter', 'seeders');
                    
                    if (currentFilter === 'custom_smart') {
                        console.log('[SmartSort] Sorting active!');
                        var list = items || self.items || [];
                        
                        list.sort(function (a, b) {
                            var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                            var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                            if (vA !== vB) return vB - vA;
                            
                            var sA = parseInt(a.seeders || a.seeds || 0);
                            var sB = parseInt(b.seeders || b.seeds || 0);
                            return sB - sA;
                        });

                        if (self.render) self.render();
                        return;
                    }
                    return originalBuild.apply(this, arguments);
                };

                return originalCreate.apply(this, arguments);
            };
            
            console.log('[SmartSort] Prototype successfully patched');
        } else {
            console.error('[SmartSort] Could not find Torrent prototype. Trying fallback...');
            // Фолбек: если прототипа нет, пробуем через старый метод
            Lampa.Component.add('torrent', function(object){
                 // Ваш предыдущий код здесь (как запасной вариант)
            });
        }
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
