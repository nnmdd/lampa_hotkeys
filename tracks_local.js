// tracks_local.js — v2.4.0
(function () {
    'use strict';

    var PLUGIN_VERSION = '2.4.0';

    if (window.lampa_tracks_local_loaded) return;
    window.lampa_tracks_local_loaded = PLUGIN_VERSION;

    var list_opened = false;
    var ffprobe_cache = {};

    var LANG_MAP = {
        ru: 'rus', rus: 'rus',
        en: 'eng', eng: 'eng',
        uk: 'ukr', ukr: 'ukr',
        ja: 'jpn', jpn: 'jpn',
        de: 'deu', deu: 'deu', ger: 'deu',
        fr: 'fra', fra: 'fra', fre: 'fra',
        es: 'spa', spa: 'spa',
        it: 'ita', ita: 'ita',
        pl: 'pol', pol: 'pol',
        zh: 'zho', zho: 'zho', chi: 'zho',
        ko: 'kor', kor: 'kor',
        pt: 'por', por: 'por',
        tr: 'tur', tur: 'tur',
        cs: 'ces', ces: 'ces', cze: 'ces',
        nl: 'nld', nld: 'nld', dut: 'nld',
        sv: 'swe', swe: 'swe',
        fi: 'fin', fin: 'fin',
        no: 'nor', nor: 'nor',
        da: 'dan', dan: 'dan',
        he: 'heb', heb: 'heb',
        ar: 'ara', ara: 'ara',
        hi: 'hin', hin: 'hin'
    };

    var AUDIO_DROPPABLE = ['truehd', 'dts', 'pcm', 'flac', 'opus', 'vorbis', 'alac', 'wmapro', 'wmav2'];
    var SUB_DROPPABLE = ['pgs', 'vobsub', 'dvbsub', 'xsub'];

    var AUDIO_WEIGHTS = {
        ac3: 10, eac3: 10, aac: 10, mp3: 10, mp2: 8,
        dts: -4, flac: -4, opus: -5, vorbis: -5, pcm: -6,
        alac: -8, wmapro: -10, wmav2: -10, truehd: -12
    };

    var SUB_WEIGHTS = {
        subrip: 10, srt: 10, ass: 10, ssa: 10, webvtt: 10, mov_text: 10, tx3g: 10,
        pgs: -12, vobsub: -12, dvbsub: -12, xsub: -12
    };

    function normLang(lang) {
        if (!lang) return '';
        var clean = String(lang).toLowerCase().trim().split(/[-_]/)[0];
        if (clean === 'und' || clean === 'unk' || clean === 'unknown' || clean === 'mul') return '';
        return LANG_MAP[clean] || clean;
    }

    function getCodecFamily(codecName) {
        var c = (codecName || '').toLowerCase();
        if (c === 'dca' || c === 'dts' || c.indexOf('dts') === 0) return 'dts';
        if (c === 'truehd' || c === 'mlp') return 'truehd';
        if (c.indexOf('pcm_') === 0 || c === 'pcm') return 'pcm';
        if (c === 'e-ac-3' || c === 'ec-3') return 'eac3';
        if (c === 'ac-3') return 'ac3';
        if (c === 'hdmv_pgs_subtitle' || c === 'pgssub') return 'pgs';
        if (c === 'dvd_subtitle' || c === 'vobsub') return 'vobsub';
        if (c === 'dvb_subtitle') return 'dvbsub';
        return c;
    }

    function isBitmapSubtitle(codecName) {
        var fam = getCodecFamily(codecName);
        return fam === 'pgs' || fam === 'vobsub' || fam === 'dvbsub' || fam === 'xsub';
    }

    function getTrackLang(track) {
        var tags = track.tags || {};
        return tags.language || tags.LANGUAGE || '';
    }

    function formatAudioCodec(track) {
        var fam = getCodecFamily(track.codec_name);
        if (fam === 'dts') {
            var profile = String(track.profile || '').toUpperCase();
            if (profile.indexOf('MA') !== -1) return 'DTS-HD MA';
            if (profile.indexOf('HRA') !== -1) return 'DTS-HD HRA';
            if (profile.indexOf('DTS:X') !== -1) return 'DTS:X';
            return 'DTS';
        }
        if (fam === 'truehd') return 'TrueHD';
        if (fam === 'eac3') return 'EAC3';
        if (fam === 'ac3') return 'AC3';
        if (fam === 'pcm') return 'PCM';
        return track.codec_name ? String(track.codec_name).toUpperCase() : '';
    }

    function formatAudioChannels(track) {
        if (track.channels) {
            if (track.channels === 8) return '7.1';
            if (track.channels === 6) return '5.1';
            if (track.channels === 3) return '2.1';
            if (track.channels === 2) return '2.0';
            if (track.channels === 1) return '1.0';
            return track.channels + 'ch';
        }
        if (track.channel_layout) {
            return String(track.channel_layout)
                .replace('(side)', '')
                .replace('stereo', '2.0')
                .replace('mono', '1.0')
                .replace('8 channels (FL+FR+FC+LFE+SL+SR+TFL+TFR)', '7.1')
                .trim();
        }
        return '';
    }

    function getAudioTechTag(track) {
        var parts = [];
        var codec = formatAudioCodec(track);
        var ch = formatAudioChannels(track);
        if (codec) parts.push(codec);
        if (ch) parts.push(ch);
        return parts.length ? '[' + parts.join(' ') + ']' : '';
    }

    function getTrackLabel(track, fallbackPrefix, index, appendAudioTag) {
        var tags = track.tags || {};
        var title = tags.title || tags.TITLE || tags.handler_name || '';
        if (/^(Sound|Video|Subtitle|Media|GPAC|ISO|Core Media).*Handler$/i.test(title)) {
            title = '';
        }

        if (appendAudioTag) {
            var techTag = getAudioTechTag(track);
            if (!title) {
                title = fallbackPrefix + ' ' + (index + 1);
            }
            return techTag ? (title + ' ' + techTag) : title;
        }

        if (!title) {
            var codec = track.codec_name ? track.codec_name.toUpperCase() : '';
            title = fallbackPrefix + ' ' + (index + 1) + (codec ? ' (' + codec + ')' : '');
        }
        return title;
    }

    function matchStreamsToPlayer(streams, nativeTracks, droppableOrder, weightsMap) {
        var N = streams ? streams.length : 0;
        var M = nativeTracks ? nativeTracks.length : 0;

        if (!N) return [];
        if (!M || N <= M) return streams.slice();

        var nativeLangs = [];
        var i, j;
        for (i = 0; i < M; i++) {
            nativeLangs.push(normLang(nativeTracks[i] && nativeTracks[i].language));
        }

        var streamLangs = [];
        var streamFams = [];
        for (j = 0; j < N; j++) {
            streamLangs.push(normLang(getTrackLang(streams[j])));
            streamFams.push(getCodecFamily(streams[j].codec_name));
        }

        var presentDroppable = [];
        for (i = 0; i < droppableOrder.length; i++) {
            var fam = droppableOrder[i];
            if (streamFams.indexOf(fam) !== -1) {
                presentDroppable.push(fam);
            }
        }

        if (presentDroppable.length > 0) {
            var K = Math.min(presentDroppable.length, 8);
            var totalMasks = 1 << K;
            var bestCandidate = null;
            var bestScore = -1e9;

            for (var mask = 1; mask < totalMasks; mask++) {
                var dropMap = {};
                var dropPriorityScore = 0;
                for (var bit = 0; bit < K; bit++) {
                    if (mask & (1 << bit)) {
                        dropMap[presentDroppable[bit]] = true;
                        dropPriorityScore += (K - bit);
                    }
                }

                var cand = [];
                var candLangs = [];
                for (j = 0; j < N; j++) {
                    if (!dropMap[streamFams[j]]) {
                        cand.push(streams[j]);
                        candLangs.push(streamLangs[j]);
                    }
                }

                if (cand.length === M) {
                    var score = dropPriorityScore;
                    for (i = 0; i < M; i++) {
                        if (nativeLangs[i] && candLangs[i]) {
                            score += (nativeLangs[i] === candLangs[i]) ? 15 : -8;
                        }
                    }
                    if (score > bestScore) {
                        bestScore = score;
                        bestCandidate = cand;
                    }
                }
            }

            if (bestCandidate) return bestCandidate;
        }

        var dp = [];
        var take = [];
        for (i = 0; i <= M; i++) {
            dp[i] = [];
            take[i] = [];
            for (j = 0; j <= N; j++) {
                dp[i][j] = (i === 0) ? 0 : -1e9;
                take[i][j] = 0;
            }
        }

        for (i = 1; i <= M; i++) {
            for (j = i; j <= N; j++) {
                var famJ = streamFams[j - 1];
                var cellScore = (weightsMap[famJ] !== undefined) ? weightsMap[famJ] : 0;
                if (nativeLangs[i - 1] && streamLangs[j - 1]) {
                    cellScore += (nativeLangs[i - 1] === streamLangs[j - 1]) ? 15 : -10;
                }

                var valMatch = dp[i - 1][j - 1] + cellScore;
                var valSkip = (j > i) ? dp[i][j - 1] : -1e9;

                if (j === i || valMatch >= valSkip) {
                    dp[i][j] = valMatch;
                    take[i][j] = 1;
                } else {
                    dp[i][j] = valSkip;
                    take[i][j] = 0;
                }
            }
        }

        var matched = [];
        var ci = M;
        var cj = N;
        while (ci > 0 && cj > 0) {
            if (take[ci][cj]) {
                matched.push(streams[cj - 1]);
                ci--;
                cj--;
            } else {
                cj--;
            }
        }
        matched.reverse();
        return matched;
    }

    function getTorrServerUrl() {
        if (Lampa.Torserver && typeof Lampa.Torserver.ip === 'function') {
            var ip = Lampa.Torserver.ip();
            if (ip) return ip.replace(/\/+$/, '');
        }
        var url = Lampa.Storage.get('torrserver_url', '') || Lampa.Storage.field('torrserver_url') || '';
        if (url) {
            if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
            return url.replace(/\/+$/, '');
        }
        return '';
    }

    function getTorrServerHeaders() {
        var headers = {};
        if (Lampa.Storage.field('torrserver_auth')) {
            var login = Lampa.Storage.get('torrserver_login', '');
            var pass = Lampa.Storage.field('torrserver_password') || Lampa.Storage.get('torrserver_password', '');
            if (login && pass && window.btoa) {
                headers['Authorization'] = 'Basic ' + window.btoa(login + ':' + pass);
            }
        }
        return headers;
    }

    function resolveTorrentParams(params) {
        var hash = params.torrent_hash || params.hash || '';
        var id = params.id !== undefined ? params.id : (params.index !== undefined ? params.index : '');
        var streamUrl = params.url || params.path || '';

        if ((!hash || id === '') && streamUrl) {
            var matchQuery = streamUrl.match(/[?&]link=([a-fA-F0-9]{40}).*?[?&]index=(\d+)/i);
            if (matchQuery) {
                hash = hash || matchQuery[1];
                if (id === '') id = matchQuery[2];
            } else {
                var matchPath = streamUrl.match(/\/stream\/[^?]*\?link=([a-fA-F0-9]{40})&index=(\d+)/i);
                if (matchPath) {
                    hash = hash || matchPath[1];
                    if (id === '') id = matchPath[2];
                }
            }
        }

        var baseUrl = getTorrServerUrl();
        if (!baseUrl && streamUrl && /^https?:\/\//i.test(streamUrl)) {
            var mHost = streamUrl.match(/^(https?:\/\/[^\/]+)/i);
            if (mHost) baseUrl = mHost[1];
        }

        return {
            hash: hash,
            id: id !== '' ? id : 1,
            baseUrl: baseUrl
        };
    }

    function reguest(params, callback) {
        if (!params) return function () {};

        if (params.ffprobe && Array.isArray(params.ffprobe) && params.ffprobe.length) {
            var timer = setTimeout(function () {
                callback({ streams: params.ffprobe });
            }, 50);
            return function () { clearTimeout(timer); };
        }

        var info = resolveTorrentParams(params);
        if (!info.hash || !info.baseUrl) {
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

        var xhr = $.ajax({
            url: ffpUrl,
            type: 'GET',
            dataType: 'json',
            headers: getTorrServerHeaders(),
            timeout: 15000,
            success: function (json) {
                if (json && Array.isArray(json.streams)) {
                    ffprobe_cache[cacheKey] = json;
                    callback(json);
                }
            },
            error: function (err) {
                console.log('[Tracks] TorrServer /ffp/ error:', err && err.status);
            }
        });

        return function () {
            if (xhr && xhr.abort) xhr.abort();
        };
    }

    function subscribeTracks(data) {
        var inited = false;
        var inited_parse = false;
        var webos_replace = {};
        var abortRequest = null;
        var retryTimer = null;
        var retryCount = 0;

        function log() {
            var args = ['[Tracks]'];
            for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
            console.log.apply(console, args);
        }

        function getTracks() {
            var video = Lampa.PlayerVideo.video();
            return (video && video.audioTracks) ? video.audioTracks : [];
        }

        function getSubs() {
            var video = Lampa.PlayerVideo.video();
            return (video && video.textTracks) ? video.textTracks : [];
        }

        log('start local v' + PLUGIN_VERSION);

        function setTracks() {
            if (!inited_parse || !Array.isArray(inited_parse.streams)) return;
            if (webos_replace.tracks && webos_replace.tracks.length > 0) {
                setWebosTracks(webos_replace.tracks);
                return;
            }

            var new_tracks = [];
            var video_tracks = getTracks();
            var raw_tracks = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'audio';
            });

            var parse_tracks = matchStreamsToPlayer(raw_tracks, video_tracks, AUDIO_DROPPABLE, AUDIO_WEIGHTS);

            log('set tracks:', video_tracks.length, 'raw:', raw_tracks.length, 'matched:', parse_tracks.map(function (t) {
                return (t.codec_name || '?') + ':' + (getTrackLang(t) || '-');
            }).join(', '));

            parse_tracks.forEach(function (track, idx) {
                var orig = video_tracks[idx];
                var isSelected = orig ? (orig.selected === true || orig.enabled === true) : (idx === 0);
                var fam = getCodecFamily(track.codec_name);
                var isUnsupportedAudio = !orig && (fam === 'truehd');

                var elem = {
                    index: idx,
                    language: getTrackLang(track),
                    label: getTrackLabel(track, 'Audio', idx, true),
                    ghost: video_tracks.length > 0 ? !orig : isUnsupportedAudio,
                    selected: isSelected
                };

                Object.defineProperty(elem, 'enabled', {
                    set: function (v) {
                        elem.selected = Boolean(v);
                        if (v) {
                            if (webos_replace.tracks && webos_replace.tracks[elem.index]) {
                                webos_replace.tracks[elem.index].enabled = true;
                            }

                            var aud = getTracks();
                            var trk = aud[elem.index];

                            for (var i = 0; i < aud.length; i++) {
                                aud[i].enabled = false;
                                aud[i].selected = false;
                            }

                            if (trk) {
                                trk.enabled = true;
                                trk.selected = true;
                            }
                        }
                    },
                    get: function () {
                        return elem.selected;
                    }
                });

                new_tracks.push(elem);
            });

            if (new_tracks.length) Lampa.PlayerPanel.setTracks(new_tracks);

            if (raw_tracks.length > 0 && video_tracks.length === 0) {
                scheduleTrackSync();
            }
        }

        function setSubs() {
            if (!inited_parse || !Array.isArray(inited_parse.streams)) return;
            if (webos_replace.subs && webos_replace.subs.length > 1) {
                setWebosSubs(webos_replace.subs);
                return;
            }

            var new_subs = [];
            var video_subs = getSubs();
            var raw_subs = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'subtitle';
            });

            var parse_subs = matchStreamsToPlayer(raw_subs, video_subs, SUB_DROPPABLE, SUB_WEIGHTS);

            log('set subs:', video_subs.length, 'raw:', raw_subs.length, 'matched:', parse_subs.length);

            parse_subs.forEach(function (track, idx) {
                var orig = video_subs[idx];
                var isSelected = orig ? (orig.selected === true || orig.mode === 'showing') : false;
                var isGhost = !orig && isBitmapSubtitle(track.codec_name);

                var elem = {
                    index: idx,
                    language: getTrackLang(track),
                    label: getTrackLabel(track, 'Subtitles', idx, false),
                    ghost: isGhost,
                    selected: isSelected
                };

                Object.defineProperty(elem, 'mode', {
                    set: function (v) {
                        elem.selected = Boolean(v && v !== 'disabled');
                        if (v) {
                            if (webos_replace.subs) {
                                var wOffset = webos_replace.subs.length === parse_subs.length ? 0 : 1;
                                var wSub = webos_replace.subs[elem.index + wOffset];
                                if (wSub) wSub.mode = v;
                            }

                            var txt = getSubs();
                            var sub = txt[elem.index];

                            for (var i = 0; i < txt.length; i++) {
                                txt[i].mode = 'disabled';
                                txt[i].selected = false;
                            }

                            if (sub) {
                                sub.mode = 'showing';
                                sub.selected = true;
                            }
                        }
                    },
                    get: function () {
                        return elem.selected ? 'showing' : 'disabled';
                    }
                });

                new_subs.push(elem);
            });

            if (new_subs.length) Lampa.PlayerPanel.setSubs(new_subs);

            if (raw_subs.length > 0 && video_subs.length < parse_subs.length) {
                scheduleTrackSync();
            }
        }

        function setWebosTracks(video_tracks) {
            if (!inited_parse || !Array.isArray(inited_parse.streams) || !video_tracks) return;

            var raw_tracks = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'audio';
            });

            var parse_tracks = matchStreamsToPlayer(raw_tracks, video_tracks, AUDIO_DROPPABLE, AUDIO_WEIGHTS);

            log('webos tracks:', video_tracks.length, 'raw:', raw_tracks.length, 'matched:', parse_tracks.map(function (t) {
                return (t.codec_name || '?') + ':' + (getTrackLang(t) || '-');
            }).join(', '));

            for (var k = 0; k < video_tracks.length; k++) {
                video_tracks[k].ghost = false;
            }

            parse_tracks.forEach(function (track, i) {
                if (video_tracks[i]) {
                    video_tracks[i].language = getTrackLang(track);
                    video_tracks[i].label = getTrackLabel(track, 'Audio', i, true);
                    video_tracks[i].ghost = false;
                }
            });

            Lampa.PlayerPanel.setTracks(video_tracks);
        }

        function setWebosSubs(video_subs) {
            if (!inited_parse || !Array.isArray(inited_parse.streams) || !video_subs) return;

            var raw_subs = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'subtitle';
            });

            var offset = (video_subs.length > 0 && video_subs.length !== raw_subs.length) ? 1 : 0;
            var nativeSubsOnly = Array.prototype.slice.call(video_subs, offset);

            var parse_subs = matchStreamsToPlayer(raw_subs, nativeSubsOnly, SUB_DROPPABLE, SUB_WEIGHTS);

            log('webos subs:', video_subs.length, 'raw:', raw_subs.length, 'matched:', parse_subs.length);

            for (var k = 0; k < video_subs.length; k++) {
                video_subs[k].ghost = false;
            }

            parse_subs.forEach(function (track, a) {
                var i = a + offset;
                if (video_subs[i]) {
                    video_subs[i].language = getTrackLang(track);
                    video_subs[i].label = getTrackLabel(track, 'Subtitles', a, false);
                    video_subs[i].ghost = false;
                }
            });

            Lampa.PlayerPanel.setSubs(video_subs);
        }

        function scheduleTrackSync() {
            if (retryTimer || !inited || retryCount >= 25) return;
            retryTimer = setTimeout(function () {
                retryTimer = null;
                if (!inited || !inited_parse || !Array.isArray(inited_parse.streams)) return;
                retryCount++;

                var expectedSubs = inited_parse.streams.filter(function (a) {
                    return a.codec_type === 'subtitle' && !isBitmapSubtitle(a.codec_name);
                }).length;

                var currentSubsCount = (webos_replace.subs && webos_replace.subs.length > 1)
                    ? webos_replace.subs.length - 1
                    : getSubs().length;
                var currentTracksCount = (webos_replace.tracks && webos_replace.tracks.length > 0)
                    ? webos_replace.tracks.length
                    : getTracks().length;

                if (webos_replace.tracks && webos_replace.tracks.length > 0) setWebosTracks(webos_replace.tracks);
                else setTracks();

                if (webos_replace.subs && webos_replace.subs.length > 1) setWebosSubs(webos_replace.subs);
                else setSubs();

                if (currentSubsCount < expectedSubs || currentTracksCount === 0) {
                    scheduleTrackSync();
                }
            }, 700);
        }

        function onNativeTrackAdded() {
            if (!inited) return;
            if (webos_replace.tracks && webos_replace.tracks.length > 0) setWebosTracks(webos_replace.tracks);
            else setTracks();

            if (webos_replace.subs && webos_replace.subs.length > 1) setWebosSubs(webos_replace.subs);
            else setSubs();
        }

        function bindNativeTrackListeners() {
            var video = Lampa.PlayerVideo.video();
            if (!video) return;
            try {
                if (video.textTracks && video.textTracks.addEventListener) {
                    video.textTracks.removeEventListener('addtrack', onNativeTrackAdded);
                    video.textTracks.addEventListener('addtrack', onNativeTrackAdded);
                }
                if (video.audioTracks && video.audioTracks.addEventListener) {
                    video.audioTracks.removeEventListener('addtrack', onNativeTrackAdded);
                    video.audioTracks.addEventListener('addtrack', onNativeTrackAdded);
                }
            } catch (e) {}
        }

        function unbindNativeTrackListeners() {
            var video = Lampa.PlayerVideo.video();
            if (!video) return;
            try {
                if (video.textTracks && video.textTracks.removeEventListener) {
                    video.textTracks.removeEventListener('addtrack', onNativeTrackAdded);
                }
                if (video.audioTracks && video.audioTracks.removeEventListener) {
                    video.audioTracks.removeEventListener('addtrack', onNativeTrackAdded);
                }
            } catch (e) {}
        }

        function listenTracks() { setTracks(); }
        function listenSubs() { setSubs(); }

        function canPlay() {
            bindNativeTrackListeners();
            if (webos_replace.tracks && webos_replace.tracks.length > 0) setWebosTracks(webos_replace.tracks);
            else setTracks();

            if (webos_replace.subs && webos_replace.subs.length > 1) setWebosSubs(webos_replace.subs);
            else setSubs();
        }

        function listenWebosSubs(_data) {
            if (_data && Array.isArray(_data.subs) && _data.subs.length > 0) {
                webos_replace.subs = _data.subs;
                if (inited_parse) {
                    if (_data.subs.length > 1) setWebosSubs(_data.subs);
                    else setSubs();
                }
                if (_data.subs.length <= 1) {
                    scheduleTrackSync();
                }
            }
        }

        function listenWebosTracks(_data) {
            if (_data && Array.isArray(_data.tracks) && _data.tracks.length > 0) {
                webos_replace.tracks = _data.tracks;
                if (inited_parse) setWebosTracks(_data.tracks);
            }
        }

        function listenStart() {
            inited = true;
            retryCount = 0;
            bindNativeTrackListeners();

            abortRequest = reguest(data, function (result) {
                inited_parse = result;

                if (inited) {
                    if (webos_replace.subs && webos_replace.subs.length > 1) {
                        setWebosSubs(webos_replace.subs);
                    } else {
                        setSubs();
                    }

                    if (webos_replace.tracks && webos_replace.tracks.length > 0) {
                        setWebosTracks(webos_replace.tracks);
                    } else {
                        setTracks();
                    }
                }
            });
        }

        function listenDestroy() {
            inited = false;
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
            if (abortRequest) {
                abortRequest();
                abortRequest = null;
            }
            unbindNativeTrackListeners();
            Lampa.Player.listener.remove('destroy', listenDestroy);
            Lampa.PlayerVideo.listener.remove('tracks', listenTracks);
            Lampa.PlayerVideo.listener.remove('subs', listenSubs);
            Lampa.PlayerVideo.listener.remove('webos_subs', listenWebosSubs);
            Lampa.PlayerVideo.listener.remove('webos_tracks', listenWebosTracks);
            Lampa.PlayerVideo.listener.remove('canplay', canPlay);
        }

        Lampa.Player.listener.follow('destroy', listenDestroy);
        Lampa.PlayerVideo.listener.follow('tracks', listenTracks);
        Lampa.PlayerVideo.listener.follow('subs', listenSubs);
        Lampa.PlayerVideo.listener.follow('webos_subs', listenWebosSubs);
        Lampa.PlayerVideo.listener.follow('webos_tracks', listenWebosTracks);
        Lampa.PlayerVideo.listener.follow('canplay', canPlay);
        listenStart();
    }

    function parseMetainfo(data) {
        var loading = Lampa.Template.get('tracks_loading');
        data.item.after(loading);

        reguest(data.element, function (result) {
            if (!list_opened || !result || !Array.isArray(result.streams)) {
                loading.remove();
                return;
            }

            var html = Lampa.Template.get('tracks_metainfo', {});

            var append = function (name, fields) {
                if (fields.length) {
                    var block = Lampa.Template.get('tracks_metainfo_block', {});
                    block.find('.tracks-metainfo__label').text(
                        Lampa.Lang.translate(
                            name === 'video' ? 'extensions_hpu_video' :
                            name === 'audio' ? 'player_tracks' : 'player_' + name
                        )
                    );
                    fields.forEach(function (fieldData) {
                        var item = $('<div class="tracks-metainfo__item tracks-metainfo__item--' + name + ' selector"></div>');
                        item.on('hover:focus', function () {
                            Lampa.Modal.scroll().update(item);
                        });

                        for (var key in fieldData) {
                            if (Object.prototype.hasOwnProperty.call(fieldData, key)) {
                                var div = $('<div class="tracks-metainfo__column--' + key + '"></div>');
                                div.text(fieldData[key]);
                                item.append(div);
                            }
                        }

                        block.find('.tracks-metainfo__info').append(item);
                    });
                    html.append(block);
                }
            };

            var video = [];
            var audio = [];
            var subs = [];

            var codec_video = result.streams.filter(function (a) {
                return a.codec_type === 'video' && a.codec_name !== 'mjpeg' && a.codec_name !== 'png';
            });
            var codec_audio = result.streams.filter(function (a) {
                return a.codec_type === 'audio';
            });
            var codec_subs = result.streams.filter(function (a) {
                return a.codec_type === 'subtitle';
            });

            codec_video.slice(0, 1).forEach(function (v) {
                var line = {};
                if (v.width && v.height) line.video = v.width + 'х' + v.height;

                var durSec = v.duration || (result.format && result.format.duration);
                if (durSec && !isNaN(durSec)) {
                    line.duration = new Date(Number(durSec) * 1000).toISOString().slice(11, 19);
                } else if (v.tags) {
                    var rawDur = v.tags.DURATION || v.tags['DURATION-eng'] || '';
                    if (rawDur) {
                        line.duration = String(rawDur).split('.')[0];
                    }
                }

                if (v.codec_name) line.codec = v.codec_name.toUpperCase();
                if (Boolean(v.is_avc)) line.avc = 'AVC';
                var bit = v.bit_rate ? v.bit_rate : (v.tags && (v.tags.BPS || v.tags['BPS-eng'])) ? (v.tags.BPS || v.tags['BPS-eng']) : (result.format && result.format.bit_rate ? result.format.bit_rate : '--');
                line.rate = bit === '--' ? bit : Math.round(bit / 1000000) + ' ' + Lampa.Lang.translate('speed_mb');
                if (Lampa.Arrays.getKeys(line).length) video.push(line);
            });

            codec_audio.forEach(function (a, i) {
                var line = { num: i + 1 };
                line.lang = getTrackLang(a).toUpperCase();
                line.name = getTrackLabel(a, 'Audio', i, false);
                if (a.codec_name) line.codec = formatAudioCodec(a);
                var ch = formatAudioChannels(a);
                if (ch) line.channels = ch;
                var bit = a.bit_rate ? a.bit_rate : (a.tags && (a.tags.BPS || a.tags['BPS-eng'])) ? (a.tags.BPS || a.tags['BPS-eng']) : '--';
                line.rate = bit === '--' ? bit : Math.round(bit / 1000) + ' ' + Lampa.Lang.translate('speed_kb');
                if (Lampa.Arrays.getKeys(line).length) audio.push(line);
            });

            codec_subs.forEach(function (a, i) {
                var line = { num: i + 1 };
                line.lang = getTrackLang(a).toUpperCase();
                line.name = getTrackLabel(a, 'Subtitles', i, false);
                if (a.codec_name) {
                    line.codec = a.codec_name.toUpperCase()
                        .replace('SUBRIP', 'SRT')
                        .replace('HDMV_PGS_SUBTITLE', 'HDMV PGS')
                        .replace('MOV_TEXT', 'MOV TEXT');
                }
                if (Lampa.Arrays.getKeys(line).length) subs.push(line);
            });

            append('video', video);
            append('audio', audio);
            append('subs', subs);
            loading.remove();

            if (video.length || audio.length || subs.length) {
                data.item.after(html);
            }

            if (Lampa.Controller.enabled().name === 'modal') Lampa.Controller.toggle('modal');
        });
    }

    Lampa.Player.listener.follow('start', function (data) {
        if (data && (data.torrent_hash || (data.url && data.url.indexOf('/stream/') !== -1))) {
            subscribeTracks(data);
        }
    });

    Lampa.Listener.follow('torrent_file', function (data) {
        if (data.type === 'list_open') list_opened = true;
        if (data.type === 'list_close') list_opened = false;

        if (data.type === 'render' && data.items.length === 1 && list_opened) {
            parseMetainfo(data);
        }
    });

    Lampa.Template.add('tracks_loading', "\n    <div class=\"tracks-loading\">\n        <span>#{loading}...</span>\n    </div>\n");
    Lampa.Template.add('tracks_metainfo', "\n    <div class=\"tracks-metainfo\"></div>\n");
    Lampa.Template.add('tracks_metainfo_block', "\n    <div class=\"tracks-metainfo__line\">\n        <div class=\"tracks-metainfo__label\"></div>\n        <div class=\"tracks-metainfo__info\"></div>\n    </div>\n");
    Lampa.Template.add('tracks_css', "\n    <style>\n    .tracks-loading{margin-top:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:start;-webkit-align-items:flex-start;-moz-box-align:start;-ms-flex-align:start;align-items:flex-start}.tracks-loading:before{content:'';display:inline-block;width:1.3em;height:1.3em;background:url('./img/loader.svg') no-repeat 50% 50%;-webkit-background-size:contain;-moz-background-size:contain;-o-background-size:contain;background-size:contain;margin-right:.4em}.tracks-loading>span{font-size:1.1em;line-height:1.1}.tracks-metainfo{margin-top:1em}.tracks-metainfo__line+.tracks-metainfo__line{margin-top:2em}.tracks-metainfo__label{opacity:.5;font-weight:600}.tracks-metainfo__info{padding-top:1em;line-height:1.2}.tracks-metainfo__info>div{background-color:rgba(0,0,0,0.22);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.tracks-metainfo__info>div.focus{background-color:rgba(255,255,255,0.06)}.tracks-metainfo__info>div>div{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.tracks-metainfo__info>div>div:not(:last-child){padding-right:1.5em}.tracks-metainfo__info>div+div{margin-top:1em}.tracks-metainfo__column--video,.tracks-metainfo__column--name{margin-right:auto}.tracks-metainfo__column--num{min-width:3em;padding-right:0}.tracks-metainfo__column--rate{min-width:7em;text-align:right}.tracks-metainfo__column--channels{min-width:5em;text-align:right}\n    </style>\n");
    $('body').append(Lampa.Template.get('tracks_css', {}, true));

    console.log('[Tracks Local] loaded v' + PLUGIN_VERSION);
})();
