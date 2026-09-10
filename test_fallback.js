// Forca a queda da API TMDB para exercitar o fallback do site.
var realFetch = globalThis.fetch;
globalThis.fetch = function (url, opts) {
  if (String(url).indexOf("api.themoviedb.org") !== -1) {
    return Promise.resolve({ ok: false, status: 403, text: function () { return Promise.resolve(""); } });
  }
  return realFetch(url, opts);
};
var mod = require("./providers/animefire.js");
mod.getStreams("82684", "tv", 1, 1).then(function (s) {
  console.log("fallback streams:", s.length);
  s.forEach(function (x) { console.log("-", x.name, "|", x.title); });
});
