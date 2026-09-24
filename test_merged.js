var mod = require("./providers/animefire-144.js");
function show(tag, streams) {
  console.log("==== " + tag + " (" + streams.length + ") ====");
  streams.slice(0, 4).forEach(function (s) {
    console.log("- " + s.name + " | " + s.title + " | q=" + s.quality);
  });
  if (!streams.length) console.log("(VAZIO - FALHOU)");
}
(async () => {
  globalThis.SCRAPER_SETTINGS = {};
  // CASO DO USUARIO: S2 pedida no id principal 127532 (TMDB fundido, Nuvio dividido)
  var a = await mod.getStreams("127532", "tv", 2, 1);
  show("Solo S2E01 no id principal (127532 S2E1 -> esperado abs 13)", a);
  var okA = a.length && a[0].title.indexOf("Rank E") !== -1;
  console.log(okA ? "MAIN-ID-S2 PASS" : "MAIN-ID-S2 FAIL");
  // regressoes
  var b = await mod.getStreams("127532", "tv", 1, 1);
  show("Solo S1E01 (127532 S1E1)", b);
  var c = await mod.getStreams("330833", "tv", 2, 1);
  show("Solo S2E01 split (330833 S2E1 -> abs 13)", c);
  var okC = c.length && c[0].title.indexOf("Rank E") !== -1;
  console.log(okC ? "SPLIT-ID-S2 PASS" : "SPLIT-ID-S2 FAIL");
  var d = await mod.getStreams("82684", "tv", 1, 1);
  show("Slime S01E01", d);
  process.exit(okA && okC ? 0 : 1);
})().catch(function (e) { console.error("FAIL", e); process.exit(1); });
