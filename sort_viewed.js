(function () {
    console.log('[SmartSort] DOM Observer version started');

    // 1. Добавляем переводы
    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed'
        }
    });

    // 2. Функция самой сортировки
    function applySmartSort() {
        var activity = Lampa.Activity.active();
        if (activity && activity.component === 'torrent') {
            // Пытаемся достать элементы из разных мест (зависит от версии)
            var items = activity.items || (activity.instance ? activity.instance.items : null);
            
            if (items && Array.isArray(items)) {
                console.log('[SmartSort] Sorting ' + items.length + ' items...');
                items.sort(function (a, b) {
                    var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                    var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                    if (vA !== vB) return vB - vA;
                    
                    var sA = parseInt(a.seeders || a.seeds || 0);
                    var sB = parseInt(b.seeders || b.seeds || 0);
                    return sB - sA;
                });

                // Принудительный рендер
                if (activity.instance && activity.instance.render) activity.instance.render();
                else if (activity.render) activity.render();
            }
        }
    }

    // 3. Следим за появлением меню в DOM
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Ищем элементы меню (в Lampa это обычно селекторы .select-item или .filter--item)
                    var items = node.querySelectorAll('.select-item, .filter--item, .selector');
                    
                    // Если нашли элементы и среди них есть стандартные методы сортировки
                    var isSortMenu = false;
                    for(var i=0; i<items.length; i++) {
                        var txt = items[i].innerText.toLowerCase();
                        if (txt.indexOf('сидам') > -1 || txt.indexOf('seeds') > -1 || txt.indexOf('раздающим') > -1) {
                            isSortMenu = true;
                            break;
                        }
                    }

                    if (isSortMenu && !node.querySelector('.smart-sort-item')) {
                        console.log('[SmartSort] Sort menu detected in DOM, injecting button...');
                        
                        // Создаем новую кнопку меню
                        var newItem = document.createElement('div');
                        newItem.className = items[0].className + ' smart-sort-item';
                        newItem.innerHTML = '<div class="select-item__title">' + Lampa.Lang.translate('torrent_sort_smart') + ' +</div>';
                        
                        // Стиль для визуализации
                        newItem.style.color = '#ffeb3b'; 

                        newItem.addEventListener('click', function() {
                            console.log('[SmartSort] Clicked custom sort!');
                            Lampa.Storage.set('torrent_filter', 'custom_smart');
                            applySmartSort();
                            
                            // Закрываем меню (эмулируем нажатие назад или клик по фону)
                            var back = document.querySelector('.selector--back, .select__back');
                            if (back) back.click();
                        });

                        // Добавляем в конец списка
                        items[0].parentNode.appendChild(newItem);
                    }
                }
            });
        });
    });

    // Запускаем слежку за всем документом
    observer.observe(document.body, { childList: true, subtree: true });

    // 4. Также подменяем глобальный метод на случай, если Lampa его вызовет сама
    var originalSort = Lampa.Arrays.sort;
    Lampa.Arrays.sort = function(items, method) {
        if (method === 'custom_smart' || Lampa.Storage.get('torrent_filter') === 'custom_smart') {
            if (items && items.length && (items[0].seeders !== undefined || items[0].seeds !== undefined)) {
                items.sort(function (a, b) {
                    var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                    var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                    if (vA !== vB) return vB - vA;
                    return parseInt(b.seeders || 0) - parseInt(a.seeders || 0);
                });
                return;
            }
        }
        return originalSort.apply(this, arguments);
    };

    console.log('[SmartSort] DOM Observer Ready');
})();
