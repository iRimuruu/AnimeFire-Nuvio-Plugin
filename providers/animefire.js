/* AnimeFire provider for Nuvio. v1.1.0
 *
 * Fonte: https://animefire.io (API publica: https://api.animefire.io)
 * - Busca o titulo no TMDB a partir do tmdbId recebido do Nuvio.
 * - Pesquisa no AnimeFire (/animes/pesquisar?q=...).
 * - Resolve o episodio (/anime/{id} -> /episode/{episodeId}).
 * - Devolve os manifests DASH (akumast.net, content-type application/dash+xml)
 *   como streams com format "mpd" (ExoPlayer/mpv resolvem via probe + mime).
 *
 * Hermes-safe: sem async/await, sem optional chaining, sem spread.
 */

var PROVIDER_VERSION = "1.1.0";
var TMDB_API_KEYS_DEFAULT = [
  "3fd2be6f0c70a2a598f084ddfb75487c",
  "8265bd1679663a7ea12ac168da84d2e8"
];
var ANIMEFIRE_API = "https://api.animefire.io";
var SITE_URL = "https://animefire.io/";
var DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function getSettings() {
  try {
    if (typeof globalThis !== "undefined" && globalThis.SCRAPER_SETTINGS) {
      return globalThis.SCRAPER_SETTINGS;
    }
  } catch (e) {}
  return {};
}

function log(msg) {
  try {
    if (typeof console !== "undefined" && console.log) {
      console.log("[AnimeFire] " + msg);
    }
  } catch (e) {}
}

function hasCustomKey() {
  var s = getSettings();
  return !!(s && typeof s.tmdbApiKey === "string" && s.tmdbApiKey.trim() !== "");
}

function getTmdbKeys() {
  var keys = [];
  var s = getSettings();
  if (s && typeof s.tmdbApiKey === "string" && s.tmdbApiKey.trim() !== "") {
    keys.push(s.tmdbApiKey.trim());
  }
  for (var i = 0; i < TMDB_API_KEYS_DEFAULT.length; i++) {
    var k = TMDB_API_KEYS_DEFAULT[i];
    var dup = false;
    for (var j = 0; j < keys.length; j++) {
      if (keys[j] === k) dup = true;
    }
    if (!dup) keys.push(k);
  }
  return keys;
}

function getPreferredAudio() {
  var s = getSettings();
  var v = s && s.preferredAudio;
  if (v === "dublado" || v === "legendado" || v === "both") return v;
  return "both";
}

function apiHeaders() {
  return {
    Accept: "application/json, text/plain, */*",
    "User-Agent": DEFAULT_UA,
    Referer: SITE_URL,
    Origin: "https://animefire.io"
  };
}

function streamHeaders() {
  return {
    Referer: SITE_URL,
    Origin: "https://animefire.io",
    "User-Agent": DEFAULT_UA
  };
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function fetchJsonOnce(url) {
  return fetch(url, { method: "GET", headers: apiHeaders() })
    .then(function (res) {
      if (!res.ok) return null;
      return res.text();
    })
    .then(function (text) {
      if (!text) return null;
      return safeParseJson(text);
    })
    .catch(function () {
      return null;
    });
}

function fetchJson(url) {
  return fetchWithTimeout(url).then(function (first) {
    if (first !== null && first !== undefined) return first;
    return fetchWithTimeout(url);
  });
}

/* Limita cada tentativa a 15s para uma requisicao travada nao comer o tempo
 * total do plugin. Se o runtime nao tiver setTimeout, segue sem limite. */
function fetchWithTimeout(url) {
  var attempt = fetchJsonOnce(url);
  try {
    if (typeof setTimeout !== "function") return attempt;
  } catch (e) {
    return attempt;
  }
  var timer;
  var timeoutP = new Promise(function (resolve) {
    timer = setTimeout(function () {
      resolve(null);
    }, 15000);
  });
  return Promise.race([attempt, timeoutP]).then(function (r) {
    try {
      if (r !== null && r !== undefined && timer) clearTimeout(timer);
    } catch (e2) {}
    return r;
  });
}

/* Fetch que relata o motivo: {data, note} onde note e um de:
 * "ok", "http<status>", "timeout", "erro-rede", "json-invalido". */
function fetchNote(url, headers, raw) {
  var timedOut = false;
  var timer = null;
  try {
    if (typeof setTimeout === "function" && typeof clearTimeout === "function") {
      timer = setTimeout(function () {
        timedOut = true;
      }, 15000);
    }
  } catch (e) {}
  function clear() {
    try {
      if (timer) clearTimeout(timer);
    } catch (e2) {}
  }
  var attempt = fetch(url, { method: "GET", headers: headers || apiHeaders() })
    .then(function (res) {
      if (!res || !res.ok) {
        clear();
        return { data: null, note: "http" + ((res && res.status) || 0) };
      }
      return res.text().then(function (text) {
        clear();
        if (!text) return { data: null, note: "vazio" };
        if (raw) return { data: String(text), note: "ok" };
        var j = safeParseJson(text);
        return { data: j, note: j ? "ok" : "json-invalido" };
      });
    })
    .catch(function () {
      clear();
      return { data: null, note: timedOut ? "timeout" : "erro-rede" };
    });
  if (timer) {
    var timeoutP = new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ data: null, note: "timeout" });
      }, 15000);
    });
    return Promise.race([attempt, timeoutP]);
  }
  return attempt;
}

/* Sonda de conectividade: testa 4 hosts de dentro do app e resume em
 * "T0W0A1J1" (1=ok, 0=falha). T=api TMDB, W=site TMDB, A=api AnimeFire,
 * J=espelho jsDelivr (controle: esse o app ja alcanca). */
function probeOne(url) {
  var attempt = fetch(url, { method: "GET", headers: apiHeaders() })
    .then(function (res) {
      return res && res.ok ? 1 : 0;
    })
    .catch(function () {
      return 0;
    });
  try {
    if (typeof setTimeout === "function") {
      var timeoutP = new Promise(function (resolve) {
        setTimeout(function () {
          resolve(0);
        }, 10000);
      });
      return Promise.race([attempt, timeoutP]);
    }
  } catch (e) {}
  return attempt;
}

function probeNet() {
  return Promise.all([
    probeOne(
      "https://api.themoviedb.org/3/tv/82684?api_key=" +
        encodeURIComponent(TMDB_API_KEYS_DEFAULT[0]) +
        "&language=en-US"
    ),
    probeOne("https://www.themoviedb.org/tv/82684?language=en-US"),
    probeOne(ANIMEFIRE_API + "/animes/pesquisar?q=slime&v=2"),
    probeOne(
      "https://cdn.jsdelivr.net/gh/iRimuruu/AnimeFire-Nuvio-Plugin@main/manifest.json"
    )
  ]).then(function (r) {
    return (
      "T" + (r[0] ? 1 : 0) + "W" + (r[1] ? 1 : 0) + "A" + (r[2] ? 1 : 0) + "J" + (r[3] ? 1 : 0)
    );
  });
}

function diagEnabled() {
  var s = getSettings();
  return !!(s && s.diagMode === true);
}

/* O app exibe nome (grande) + quality (pequeno); o diagnostico vai no
 * quality para ficar visivel, e a mensagem completa no title. */
function diagEntry(short, full) {
  return {
    name: "AnimeFire DIAG",
    title: String(full),
    url: SITE_URL,
    quality: String(short),
    provider: "animefire",
    format: "mpd",
    headers: streamHeaders()
  };
}

function uniqueStrings(arr) {
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var v = arr[i];
    if (typeof v !== "string") continue;
    v = v.trim();
    if (!v || seen[v]) continue;
    seen[v] = true;
    out.push(v);
  }
  return out;
}

/* Normaliza para comparacao: minusculas, sem acentos, so [a-z0-9 ]. */
function normalizeTitle(s) {
  var t = String(s || "").toLowerCase();
  try {
    if (typeof t.normalize === "function") {
      t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  } catch (e) {}
  t = t.replace(/[^a-z0-9 ]+/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/* 0..100 */
function titleScore(a, b) {
  var x = normalizeTitle(a);
  var y = normalizeTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 100;
  if (x.indexOf(y) !== -1 || y.indexOf(x) !== -1) {
    var shortLen = Math.min(x.length, y.length);
    var longLen = Math.max(x.length, y.length);
    return Math.round(70 + (30 * shortLen) / longLen);
  }
  var xw = x.split(" ");
  var yw = y.split(" ");
  var setY = {};
  var i;
  for (i = 0; i < yw.length; i++) setY[yw[i]] = true;
  var inter = 0;
  var seen = {};
  for (i = 0; i < xw.length; i++) {
    if (setY[xw[i]] && !seen[xw[i]]) {
      seen[xw[i]] = true;
      inter++;
    }
  }
  var unionMap = {};
  var union = 0;
  for (i = 0; i < xw.length; i++) {
    if (!unionMap[xw[i]]) {
      unionMap[xw[i]] = true;
      union++;
    }
  }
  for (i = 0; i < yw.length; i++) {
    if (!unionMap[yw[i]]) {
      unionMap[yw[i]] = true;
      union++;
    }
  }
  if (!union) return 0;
  return Math.round((60 * inter) / union);
}

function bestTitleScore(titles, candidate) {
  var best = 0;
  for (var i = 0; i < titles.length; i++) {
    var s = titleScore(titles[i], candidate);
    if (s > best) best = s;
  }
  return best;
}

function parseQualityNum(v) {
  var m = String(v == null ? "" : v).match(/(2160|1440|1080|720|480|360|240)/);
  return m ? parseInt(m[1], 10) : 0;
}

function maxQuality(qualities) {
  var best = 0;
  if (!Array.isArray(qualities)) return 0;
  for (var i = 0; i < qualities.length; i++) {
    var q = parseQualityNum(qualities[i]);
    if (q > best) best = q;
  }
  return best;
}

function pad2(n) {
  var s = String(n);
  return s.length >= 2 ? s : "0" + s;
}

function fileNameOf(pathOrUrl) {
  var s = String(pathOrUrl || "");
  var idx = s.lastIndexOf("/");
  return idx !== -1 ? s.substr(idx + 1) : s;
}

/* ---------- TMDB ---------- */

function parseTmdb(tmdbType, j) {
  if (!j || j.success === false) return null;
  /* Aceita campos de filme e serie: o /find pode devolver o outro tipo. */
  var titles = [];
  if (j.title) titles.push(j.title);
  if (j.name) titles.push(j.name);
  if (j.original_title) titles.push(j.original_title);
  if (j.original_name) titles.push(j.original_name);
  titles = uniqueStrings(titles);
  if (!titles.length) return null;
  var dateStr = j.first_air_date || j.release_date || "";
  var year =
    typeof dateStr === "string" && dateStr.length >= 4 ? dateStr.substr(0, 4) : "";
  var posterFile = j.poster_path ? fileNameOf(j.poster_path) : "";
  return { titles: titles, year: year, posterFile: posterFile };
}

function isImdbId(s) {
  return /^tt\d+$/i.test(String(s == null ? "" : s).trim());
}

function pickFindResult(tmdbType, j) {
  if (!j || typeof j !== "object") return null;
  var primary = tmdbType === "movie" ? j.movie_results : j.tv_results;
  if (Array.isArray(primary) && primary.length) return primary[0];
  var secondary = tmdbType === "movie" ? j.tv_results : j.movie_results;
  if (Array.isArray(secondary) && secondary.length) return secondary[0];
  return null;
}

/* Converte ID do IMDB (tt...) em dados TMDB via /find. */
function fetchTmdbByImdb(tmdbType, imdbId, notes) {
  var keys = getTmdbKeys();
  var ki = 0;
  function next() {
    if (ki >= keys.length) return Promise.resolve(null);
    var myKi = ki;
    return fetchNote(
      "https://api.themoviedb.org/3/find/" +
        encodeURIComponent(imdbId) +
        "?api_key=" +
        encodeURIComponent(keys[ki]) +
        "&external_source=imdb_id&language=en-US"
    ).then(function (r) {
      var parsed = parseTmdb(tmdbType, pickFindResult(tmdbType, r.data));
      if (parsed) return parsed;
      if (notes) notes.push("imdb-k" + myKi + "-" + r.note);
      ki++;
      return next();
    });
  }
  return next();
}

function fetchTmdb(tmdbType, id, notes) {
  if (isImdbId(id)) {
    log("id IMDB detectado, convertendo via /find");
    return fetchTmdbByImdb(tmdbType, String(id).trim(), notes);
  }
  var keys = getTmdbKeys();
  var langs = ["en-US", "pt-BR"];
  var ki = 0;
  var li = 0;
  var webTried = false;
  function next() {
    if (ki < keys.length) {
      var key = keys[ki];
      var lang = langs[li];
      var myKi = ki;
      /* Sem retry aqui: falha rapida passa para a proxima chave/idioma,
       * evitando rajada que piora rate-limit. */
      return fetchNote(
        "https://api.themoviedb.org/3/" +
          tmdbType +
          "/" +
          encodeURIComponent(id) +
          "?api_key=" +
          encodeURIComponent(key) +
          "&language=" +
          encodeURIComponent(lang)
      ).then(function (r) {
        var parsed = parseTmdb(tmdbType, r.data);
        if (parsed) return parsed;
        if (notes) notes.push("k" + myKi + "-" + r.note);
        li++;
        if (li >= langs.length) {
          li = 0;
          ki++;
        }
        return next();
      });
    }
    /* Ultimo recurso: a pagina do TMDB (host diferente da API). */
    if (!webTried) {
      webTried = true;
      log("tmdb api falhou, tentando site");
      return fetchTmdbWebsite(tmdbType, id, notes);
    }
    return Promise.resolve(null);
  }
  return next();
}

/* Raspa titulo/ano da pagina publica do TMDB (sem precisar de API key). */
function fetchTmdbWebsite(tmdbType, id, notes) {
  var url =
    "https://www.themoviedb.org/" + tmdbType + "/" + encodeURIComponent(id) + "?language=en-US";
  return fetchNote(url, {
    Accept: "text/html,application/xhtml+xml,*/*",
    "User-Agent": DEFAULT_UA,
    Referer: "https://www.themoviedb.org/"
  }, true).then(function (r) {
    if (r.data && typeof r.data === "string") {
      var parsed = parseTmdbWebsite(r.data);
      if (parsed) return parsed;
    }
    if (notes) notes.push("site-" + r.note);
    return null;
  });
}

function parseTmdbWebsite(html) {
  var title = "";
  var m =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);
  if (m) {
    title = m[1].trim();
  } else {
    var t = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (t) {
      title = t[1].replace(/\s+/g, " ").trim();
      title = title.split(" — ")[0].split(" – ")[0].split(" | ")[0].split(" - ")[0].trim();
    }
  }
  if (!title) return null;
  var year = "";
  var y =
    html.match(/"first_air_date"\s*:\s*"(\d{4})/) ||
    html.match(/"release_date"\s*:\s*"(\d{4})/) ||
    html.match(/release_date[^>]*>\s*\(?\s*((?:19|20)\d{2})/i) ||
    title.match(/\((?:TV Series\s+)?(19\d{2}|20\d{2})\)\s*$/);
  if (y) year = y[1];
  title = title
    .replace(/\s*\((?:TV Series\s+)?(19\d{2}|20\d{2})\)\s*$/, "")
    .replace(/\s*\((19\d{2}|20\d{2})\)\s*$/, "")
    .trim();
  var titles = uniqueStrings([title]);
  if (!titles.length) return null;
  return { titles: titles, year: year, posterFile: "" };
}

/* ---------- AnimeFire ---------- */

function searchOne(query) {
  var url = ANIMEFIRE_API + "/animes/pesquisar?q=" + encodeURIComponent(query) + "&v=2";
  return fetchJson(url).then(function (j) {
    var data = j && j.data;
    if (!Array.isArray(data)) return [];
    var out = [];
    for (var i = 0; i < data.length; i++) {
      var it = data[i];
      if (!it || !it.id) continue;
      out.push({
        id: String(it.id),
        title: String(it.title || ""),
        published_at: it.published_at || "",
        poster_src: it.poster_src || ""
      });
    }
    return out;
  });
}

function searchAll(queries) {
  var jobs = [];
  for (var i = 0; i < queries.length; i++) {
    jobs.push(searchOne(queries[i]));
  }
  return Promise.all(jobs).then(function (lists) {
    var seen = {};
    var out = [];
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i] || [];
      for (var k = 0; k < list.length; k++) {
        var c = list[k];
        if (seen[c.id]) continue;
        seen[c.id] = true;
        out.push(c);
      }
    }
    return out;
  });
}

function fetchAnime(animeId) {
  var url = ANIMEFIRE_API + "/anime/" + encodeURIComponent(animeId) + "?v=2";
  return fetchJson(url).then(function (j) {
    if (!j || !j.data) return null;
    return j.data;
  });
}

function fetchAnimeList(candidates) {
  var jobs = [];
  for (var i = 0; i < candidates.length; i++) {
    (function (c) {
      jobs.push(
        fetchAnime(c.id).then(function (data) {
          return { candidate: c, data: data };
        })
      );
    })(candidates[i]);
  }
  return Promise.all(jobs);
}

function heroTitles(hero) {
  var out = [];
  if (!hero) return out;
  var t = hero.titles || hero.title;
  if (typeof t === "string") {
    out.push(t);
  } else if (t && typeof t === "object") {
    for (var k in t) {
      if (Object.prototype.hasOwnProperty.call(t, k) && t[k]) out.push(String(t[k]));
    }
  }
  if (hero.title && typeof hero.title === "string") out.push(hero.title);
  return uniqueStrings(out);
}

function scoreAnime(candidate, data, tmdb, isMovie) {
  var score = candidate.searchScore || 0;
  if (!data) return score - 1000;
  var hero = data.hero || {};
  var ht = heroTitles(hero);
  var hs = bestTitleScore(tmdb.titles, ht.join(" "));
  var hs2 = 0;
  for (var i = 0; i < ht.length; i++) {
    var s = bestTitleScore(tmdb.titles, ht[i]);
    if (s > hs2) hs2 = s;
  }
  score = Math.max(score, hs, hs2);

  var format = String(data.format || "").toLowerCase();
  if (isMovie && format === "movie") score += 30;
  else if (!isMovie && format === "tv") score += 30;
  else if (format) score -= 50;

  var pub = String(hero.published_at || candidate.published_at || "");
  if (tmdb.year && pub.length >= 4) {
    var y = parseInt(pub.substr(0, 4), 10);
    var ty = parseInt(tmdb.year, 10);
    if (y === ty) score += 20;
    else if (Math.abs(y - ty) === 1) score += 10;
    else if (Math.abs(y - ty) > 5) score -= 15;
  }

  if (tmdb.posterFile) {
    var hp = String(hero.poster_src || candidate.poster_src || "");
    if (hp && hp.indexOf(tmdb.posterFile) !== -1) score += 40;
  }
  return score;
}

function findEpisodeId(data, isMovie, season, episode) {
  var eps = data && data.episodes;
  if (!Array.isArray(eps) || !eps.length) return "";
  var i;
  if (isMovie) {
    return eps[0] && eps[0].id ? String(eps[0].id) : "";
  }
  for (i = 0; i < eps.length; i++) {
    var e = eps[i];
    if (!e) continue;
    if (Number(e.season) === season && Number(e.number) === episode) {
      return String(e.id);
    }
  }
  /* Fallback absoluto via seasons[].first_episode_number */
  try {
    var seasons = data.seasons;
    if (Array.isArray(seasons)) {
      for (i = 0; i < seasons.length; i++) {
        if (Number(seasons[i].number) === season && seasons[i].first_episode_number != null) {
          var absIdx =
            Number(seasons[i].first_episode_number) - 1 + (episode - 1);
          if (eps[absIdx] && eps[absIdx].id) return String(eps[absIdx].id);
        }
      }
    }
  } catch (e2) {}
  if (season === 1 && eps[episode - 1] && eps[episode - 1].id) {
    return String(eps[episode - 1].id);
  }
  return "";
}

function fetchEpisode(episodeId) {
  var url = ANIMEFIRE_API + "/episode/" + encodeURIComponent(episodeId) + "?v=2";
  return fetchJson(url).then(function (j) {
    if (!j || !j.data) return null;
    return j.data;
  });
}

function buildNuvioStreams(epData, isMovie, season, episode) {
  var list = (epData && epData.streams) || [];
  var pref = getPreferredAudio();
  var label =
    isMovie === true ? "Filme" : "S" + pad2(season) + "E" + pad2(episode);
  var epTitle = epData && epData.title ? String(epData.title) : "";
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    if (!s || !s.url) continue;
    if (s.is_offline === true) continue;
    var audio = String(s.audio || "").toLowerCase();
    if (pref !== "both" && audio !== pref) continue;
    var q = maxQuality(s.qualities) || 720;
    var audioLabel = audio || "legendado";
    out.push({
      name: "AnimeFire " + audioLabel + " " + q + "p",
      title: epTitle ? label + " - " + epTitle : label,
      url: String(s.url),
      quality: q,
      provider: "animefire",
      format: "mpd",
      headers: streamHeaders()
    });
  }
  out.sort(function (a, b) {
    return (b.quality || 0) - (a.quality || 0);
  });
  return out;
}

/* ---------- entrypoint ---------- */

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  var id = String(tmdbId == null ? "" : tmdbId).trim();
  if (!id) return Promise.resolve([]);
  var isMovie = mediaType === "movie";
  var season = parseInt(seasonNum, 10);
  var episode = parseInt(episodeNum, 10);
  if (!(season > 0)) season = 1;
  if (!(episode > 0)) episode = 1;
  var tmdbType = isMovie ? "movie" : "tv";

  log("v" + PROVIDER_VERSION + " req tmdb=" + id + " type=" + mediaType + " s=" + season + " e=" + episode);
  var diag = diagEnabled();
  var customKey = hasCustomKey();
  var notes = [tmdbType + "/" + id + "-s" + season + "e" + episode];
  function doneFail(short, note) {
    log(note);
    if (diag) return [diagEntry(short, note)];
    return [];
  }
  return fetchTmdb(tmdbType, id, notes)
    .then(function (tmdb) {
      if (!tmdb) {
        var keyNote = customKey ? "chave personalizada recebida" : "chave personalizada NAO recebida";
        if (!diag) {
          log("tmdb sem resposta para " + tmdbType + "/" + id + " (" + keyNote + ")");
          return [];
        }
        return probeNet().then(function (map) {
          var note =
            "tmdb sem resposta (" + keyNote + ") | tentativas " + notes.join(",") +
            " | rede " + map +
            " (T=api tmdb, W=site tmdb, A=api animefire, J=espelho)";
          log(note);
          return [
            diagEntry("tent-" + notes.join(",").slice(0, 40), note),
            diagEntry("net-" + map, note)
          ];
        });
      }
      log("tmdb ok: " + tmdb.titles.join(" / ") + " (" + tmdb.year + ")");
      var queries = tmdb.titles.slice(0, 3);
      return searchAll(queries).then(function (candidates) {
        if (!candidates.length) {
          return doneFail("busca-0", "tmdb ok (" + tmdb.titles[0] + ") | buscas: 0 resultados");
        }
        for (var i = 0; i < candidates.length; i++) {
          candidates[i].searchScore = bestTitleScore(
            tmdb.titles,
            candidates[i].title
          );
        }
        candidates.sort(function (a, b) {
          return (b.searchScore || 0) - (a.searchScore || 0);
        });
        var top = candidates.slice(0, 4);
        return fetchAnimeList(top).then(function (details) {
          var best = null;
          var bestScore = -100000;
          for (var i = 0; i < details.length; i++) {
            var d = details[i];
            if (!d || !d.data) continue;
            var sc = scoreAnime(d.candidate, d.data, tmdb, isMovie);
            var epId = findEpisodeId(d.data, isMovie, season, episode);
            if (!epId) sc -= 200;
            if (sc > bestScore) {
              bestScore = sc;
              best = { data: d.data, episodeId: epId, score: sc };
            }
          }
          if (!best || !best.episodeId) {
            return doneFail(
              "sem-episodio",
              "tmdb ok | " + candidates.length + " resultados" +
              (best ? " | melhor score=" + best.score + " SEM EPISODIO s=" + season + " e=" + episode : " | sem detalhes")
            );
          }
          log("anime ok score=" + best.score + " ep=" + best.episodeId);
          return fetchEpisode(best.episodeId).then(function (epData) {
            if (!epData) {
              return doneFail("ep-falhou", "tmdb ok | ep " + best.episodeId + " SEM RESPOSTA");
            }
            var streams = buildNuvioStreams(epData, isMovie, season, episode);
            log("streams: " + streams.length);
            if (!streams.length) {
              return doneFail("sem-audio", "tmdb ok | ep " + best.episodeId + " | 0 audios compativeis");
            }
            if (diag) {
              streams.unshift(
                diagEntry(
                  "ok-" + streams.length,
                  "tmdb ok | ep " + best.episodeId + " | " + streams.length + " streams"
                )
              );
            }
            return streams;
          });
        });
      });
    })
    .catch(function (e) {
      var msg = "erro interno: " + ((e && e.message) || e);
      try {
        console.error("[AnimeFire] " + msg);
      } catch (e2) {}
      if (diagEnabled()) return [diagEntry("erro", msg)];
      return [];
    });
}

function onSettings() {
  return [
    { type: "header", label: "AnimeFire" },
    {
      type: "info",
      label: "Usa o TMDB para descobrir o titulo e o AnimeFire para os streams (DASH)."
    },
    {
      type: "text",
      key: "tmdbApiKey",
      label: "TMDB API Key",
      placeholder: "Deixe vazio para usar a chave embutida",
      description: "Opcional. Obtenha em themoviedb.org se a padrao parar de funcionar."
    },
    {
      type: "select",
      key: "preferredAudio",
      label: "Audio preferido",
      options: [
        { label: "Dublado + Legendado", value: "both" },
        { label: "Somente Dublado", value: "dublado" },
        { label: "Somente Legendado", value: "legendado" }
      ],
      defaultValue: "both"
    },
    {
      type: "toggle",
      key: "diagMode",
      label: "Modo diagnostico",
      description: "Mostra na lista de fontes em que etapa a busca parou. Desative depois de testar.",
      defaultValue: false
    }
  ];
}

module.exports = { getStreams: getStreams, onSettings: onSettings };
