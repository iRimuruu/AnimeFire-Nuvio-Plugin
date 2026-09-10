// Bloqueia tudo de themoviedb.org para exercitar a sonda de rede.
var realFetch = globalThis.fetch;
globalThis.SCRAPER_SETTINGS = { diagMode: true, tmdbApiKey: "c4631a7605e879bd315bc58a97768035" };
globalThis.fetch = function (url, opts) {
  if (String(url).indexOf("themoviedb.org") !== -1) {
    return Promise.resolve({ ok: false, status: 403, text: function () { return Promise.resolve(""); } });
  }
  return realFetch(url, opts);
};
var mod = require("./providers/animefire.js");
mod.getStreams("82684", "tv", 1, 1).then(function (s) {
  console.log("entradas:", s.length);
  s.forEach(function (x) { console.log("-", x.name, "| q =", x.quality); });
});
