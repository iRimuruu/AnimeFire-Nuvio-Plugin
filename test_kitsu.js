var realFetch = globalThis.fetch;
globalThis.fetch = function (url, opts) {
  if (String(url).indexOf("graphql.anilist.co") !== -1) {
    return Promise.resolve({ ok: false, status: 403, text: function () { return Promise.resolve(""); } });
  }
  return realFetch(url, opts);
};
var mod = require("./providers/animefire-144.js");
function show(tag, streams) {
  console.log("==== " + tag + " (" + streams.length + ") ====");
  streams.forEach(function (s) {
    console.log("- " + s.name + " | " + s.title + " | q=" + s.quality);
  });
  if (!streams.length) console.log("(VAZIO - FALHOU)");
}
(async () => {
  globalThis.SCRAPER_SETTINGS = {};
  var b = await mod.getStreams("330833", "tv", 2, 1);
  show("Solo S2E01 split COM AniList BLOQUEADO (espera via kitsu abs 13)", b);
  var ok = b.length && b[0].title.indexOf("Rank E") !== -1;
  console.log(ok ? "KITSU FALLBACK PASS" : "KITSU FALLBACK FAIL");
  var d = await mod.getStreams("82684", "tv", 1, 1);
  show("Slime S01E01 regressao (AniList bloqueado)", d);
  process.exit(ok ? 0 : 1);
})().catch(function (e) { console.error("FAIL", e); process.exit(1); });
