var realFetch = globalThis.fetch;
globalThis.fetch = function (url, opts) {
  if (String(url).indexOf("graphql.anilist.co") !== -1) {
    return Promise.resolve({ ok: false, status: 403, text: function () { return Promise.resolve(""); } });
  }
  return realFetch(url, opts);
};
var mod = require("./providers/animefire-144.js");
(async () => {
  globalThis.SCRAPER_SETTINGS = {};
  // mergedMismatch + AniList bloqueado => cadeia via Kitsu
  var a = await mod.getStreams("127532", "tv", 2, 1);
  console.log("streams:", a.length, "|", a[0] && (a[0].name + " | " + a[0].title));
  var ok = a.length && a[0].title.indexOf("Rank E") !== -1;
  console.log(ok ? "MERGED-KITSU PASS" : "MERGED-KITSU FAIL");
  process.exit(ok ? 0 : 1);
})().catch(function (e) { console.error("FAIL", e); process.exit(1); });
