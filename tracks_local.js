// Извлекаем hash, id файла и базовый URL прямо из ссылки на видеопоток TorrServer
    function resolveTorrentParams(params) {
        var streamUrl = params.url || params.path || '';
        var hash = params.torrent_hash || params.hash || (params.torrent && params.torrent.hash) || '';
        var id = '';

        if (params.id !== undefined && params.id !== null) id = params.id;
        else if (params.index !== undefined && params.index !== null) id = params.index;
        else if (params.torrent && params.torrent.index !== undefined) id = params.torrent.index;

        // В Lampa самый надежный источник — сам URL потока (например: http://192.168.1.50:8090/stream/fname.mkv?link=HASH&index=1&play)
        if (streamUrl) {
            var mLink = streamUrl.match(/[?&]link=([a-fA-F0-9]{40})/i);
            if (mLink && !hash) hash = mLink[1];

            var mIndex = streamUrl.match(/[?&]index=(\d+)/i);
            if (mIndex && id === '') id = mIndex[1];
        }

        // Определяем адрес TorrServer: приоритетно берем тот же хост и порт, с которого играет само видео!
        var baseUrl = '';
        if (streamUrl && /^https?:\/\//i.test(streamUrl)) {
            var mHost = streamUrl.match(/^(https?:\/\/[^\/]+)/i);
            if (mHost) baseUrl = mHost[1];
        }
        if (!baseUrl) {
            baseUrl = getTorrServerUrl();
        }

        // В TorrServer /ffp/{hash}/{id} индексация файлов начинается с 1
        var numericId = parseInt(id, 10);
        if (isNaN(numericId) || numericId < 1) numericId = 1;

        return {
            hash: hash,
            id: numericId,
            baseUrl: baseUrl
        };
    }

    // Запрос к встроенному в TorrServer ffprobe: GET /ffp/{hash}/{id}
    function reguest(params, callback) {
        if (!params) return function () {};

        // 1. Если ffprobe уже получен самой Lampa при открытии карточки торрента
        if (params.ffprobe && Array.isArray(params.ffprobe) && params.ffprobe.length) {
            console.log('Tracks', 'Using cached params.ffprobe from Lampa');
            var timer = setTimeout(function () {
                callback({ streams: params.ffprobe });
            }, 50);
            return function () { clearTimeout(timer); };
        }

        var info = resolveTorrentParams(params);
        if (!info.hash || !info.baseUrl) {
            console.log('Tracks', 'Cannot resolve TorrServer hash or baseUrl:', info, params);
            return function () {};
        }

        var cacheKey = info.hash + '_' + info.id;
        if (ffprobe_cache[cacheKey]) {
            var cachedTimer = setTimeout(function () {
                callback(ffprobe_cache[cacheKey]);
            }, 50);
            return function () { clearTimeout(cachedTimer); };
        }

        var ffpUrl = info.baseUrl + '/ffp/' + info.hash + '/' + info.id;
        console.log('Tracks', 'Requesting TorrServer ffprobe:', ffpUrl);

        // Используем штатный сетевой модуль Lampa.Reguest (обходит платформенные ограничения ТВ)
        var network = new Lampa.Reguest();
        var authHeaders = getTorrServerHeaders();
        var hasAuth = Boolean(authHeaders['Authorization']);

        network.timeout(15000);
        network.native(
            ffpUrl,
            function (json) {
                if (typeof json === 'string') {
                    try { json = JSON.parse(json); } catch (e) {}
                }
                if (json && Array.isArray(json.streams)) {
                    ffprobe_cache[cacheKey] = json;
                    callback(json);
                } else {
                    console.log('Tracks', 'Empty or invalid /ffp/ response:', json);
                }
            },
            function (a, c) {
                console.log('Tracks', 'TorrServer /ffp/ error:', a && a.status, c, ffpUrl);
            },
            false,
            hasAuth ? { headers: authHeaders } : undefined
        );

        return function () {
            if (network && network.clear) network.clear();
        };
    }
