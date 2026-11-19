// sort_viewed.js — v2.1.0
(function () {
    'use strict';

    var PLUGIN_VERSION = '2.1.0';
    var STORAGE_KEY = 'torrents_viewed_on_top';

    function isViewedOnTopEnabled() {
        if (window.Lampa && Lampa.Storage) {
            var val = Lampa.Storage.get(STORAGE_KEY, 'true');
            return val === true || val === 'true';
        }
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw === null || raw === undefined || raw === '') return true;
            return raw === 'true';
        } catch (e) {
            return true;
        }
    }

    function setViewedOnTopEnabled(enabled) {
        var val = enabled ? 'true' : 'false';
        if (window.Lampa && Lampa.Storage) {
            Lampa.Storage.set(STORAGE_KEY, val);
        }
        try {
            window.localStorage.setItem(STORAGE_KEY, val);
        } catch (e) {}
    }

    function findInArray(arr, predicate) {
        if (!Array.isArray(arr)) return null;
        for (var i = 0; i < arr.length; i++) {
            if (predicate(arr[i], i)) return arr[i];
        }
        return null;
    }

    function initPlugin() {
        if (window.lampa_sort_viewed_plugin) return;
        window.lampa_sort_viewed_plugin = PLUGIN_VERSION;

        Lampa.Lang.add({
            torrent_viewed_on_top_title: {
                ru: 'Опции',
                en: 'Options',
                uk: 'Опції'
            },
            torrent_viewed_on_top: {
                ru: 'Просмотренные сверху',
                en: 'Viewed on top',
                uk: 'Переглянуті зверху'
            }
        });

        var activeTorrentsComp = null;
        var lastParserData = null;

        function buildViewedMap() {
            var viewedList = Lampa.Storage.cache('torrents_view', 5000, []);
            var map = {};
            if (Array.isArray(viewedList)) {
                for (var i = 0; i < viewedList.length; i++) {
                    map[viewedList[i]] = true;
                }
            }
            return map;
        }

        function checkItemViewed(item, viewedMap) {
            if (!item) return false;
            if (item.viewed) return true;

            var title = item.Title || item.title || '';
            var hash = item.hash || (title ? Lampa.Utils.hash(title) : '');
            if (hash && viewedMap[hash]) {
                item.viewed = true;
                return true;
            }
            return false;
        }

        // 1. Перехватываем Lampa.Parser.get
        if (Lampa.Parser && typeof Lampa.Parser.get === 'function') {
            var origParserGet = Lampa.Parser.get;

            Lampa.Parser.get = function (params, oncomplite, onerror) {
                return origParserGet.call(this, params, function (data) {
                    lastParserData = data;
                    if (params && typeof params === 'object') {
                        params._torrents_results = data;
                    }
                    if (oncomplite) oncomplite(data);
                }, onerror);
            };
        }

        // 2. Оборачиваем компонент 'torrents'
        var origTorrents = Lampa.Component.get('torrents');

        if (origTorrents) {
            Lampa.Component.add('torrents', function (object) {
                var comp = new origTorrents(object);
                activeTorrentsComp = comp;

                var origSortWithPopular = comp.sortWithPopular;
                var origSortWithViewed =
