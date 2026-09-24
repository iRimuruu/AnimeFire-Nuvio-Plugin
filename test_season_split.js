var mod = require("./providers/animefire.js");

function show(tag, streams) {
  console.log("==== " + tag + " (" + streams.length + ") ====");
  streams.forEach(function (s) {
    console.log(
      "- " + s.name + " | " + s.title + " | q=" + s.quality + " | fmt=" + s.format + "\n  " + String(s.url).slice(0, 120)
    );
  });
}

function isFail(streams) {
  return streams.length === 0 || (streams[0].name || "").indexOf("DIAG") !== -1;
}

(async () => {
  let fail = 0;
  // 1. Regressao: S1 normal continua funcionando
  let a = await mod.getStreams("127532", "tv", 1, 1);
  show("Solo Leveling S1E01 (tmdb 127532, junto)", a);
  if (isFail(a)) { console.log("FAIL: S1E01 deveria funcionar"); fail++; }

  // 2. BUG PRINCIPAL: S2 em ID separado (tmdb 330833, seasons=[S2]) -> AF ep 13
  globalThis.SCRAPER_SETTINGS = {};
  let b = await mod.getStreams("330833", "tv", 2, 1);
  show("Solo Leveling S2E01 via ID split (tmdb 330833 S2E1 -> abs 13)", b);
  if (isFail(b)) { console.log("FAIL: S2E01 via split deveria funcionar"); fail++; }

  // 3. Mesmo ID split mas normalizado p/ S1E1 pelo app -> ainda deve dar ep 13, nao ep 1
  let c = await mod.getStreams("330833", "tv", 1, 1);
  show("Solo Leveling split normalizado (tmdb 330833 S1E1 -> abs 13)", c);

  // 4. Regressao: Slime S01E01
  let d = await mod.getStreams("82684", "tv", 1, 1);
  show("Slime S01E01 (tmdb 82684)", d);
  if (isFail(d)) { console.log("FAIL: Slime S1E1"); fail++; }

  console.log(fail === 0 ? "\nALL CRITICAL PASS" : "\nFAILURES: " + fail);
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error("TEST FAIL", e); process.exit(1); });
