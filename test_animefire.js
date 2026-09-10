var mod = require("./providers/animefire.js");

function show(tag, streams) {
  console.log("==== " + tag + " (" + streams.length + ") ====");
  streams.forEach(function (s) {
    console.log(
      "- " + s.name + " | " + s.title + " | q=" + s.quality + " | fmt=" + s.format + "\n  " + s.url
    );
  });
}

mod
  .getStreams("82684", "tv", 1, 1)
  .then(function (a) {
    show("Slime S01E01 (tmdb 82684)", a);
    return mod.getStreams("916224", "movie", null, null);
  })
  .then(function (b) {
    show("Suzume filme (tmdb 916224)", b);
    return mod.getStreams("95479", "tv", 1, 1);
  })
  .then(function (c) {
    show("Jujutsu S01E01 (tmdb 95479)", c);
  })
  .catch(function (e) {
    console.error("TEST FAIL", e);
    process.exit(1);
  });
