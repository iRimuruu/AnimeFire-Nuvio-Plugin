# AnimeFire para Nuvio

Plugin (manifesto + scraper local) que leva o **AnimeFire** (`animefire.io`) para o **Nuvio** (`nuvio.tv`).

- Filmes e series de anime, **dublado e legendado (PT-BR)**
- Streams **DASH** (`format: "mpd"`, ex.: dublado 1080p) com headers de playback
- Mapeamento automatico **TMDB -> AnimeFire** (titulo + ano + poster)

## Arquivos

```
manifest.json
providers/animefire.js
test_animefire.js
```

## Como funciona

1. O Nuvio chama `getStreams(tmdbId, mediaType, season, episode)`.
2. O provider busca o titulo no TMDB (`/3/{tv|movie}/{id}`).
3. Pesquisa no AnimeFire (`api.animefire.io/animes/pesquisar?q=...`).
4. Abre o anime (`/anime/{id}`), casa temporada/episodio, abre o episodio (`/episode/{id}`).
5. Devolve 1 stream por audio (dublado/legendado) apontando para o manifesto DASH.

## Testar local

```bash
node test_animefire.js
```

Esperado: 2 streams para Slime S01E01 (`82684`), Suzume (`916224`) e Jujutsu S01E01 (`95479`).

## Instalar no Nuvio

1. Suba esta pasta para um repositório público no GitHub (ex.: `seu-user/animefire-nuvio`).
2. No app Nuvio: **Configurações → Plugins** (ou **Scrapers locais**) → **Adicionar repositório**.
3. Cole a URL raw do manifesto:
   `https://raw.githubusercontent.com/seu-user/animefire-nuvio/main/manifest.json`
4. Atualize, ative o **AnimeFire** e dê play em qualquer anime.

## Configurações (no Nuvio)

O provider tem tela de ajustes (`hasSettings`):

- **TMDB API Key** — opcional; só preencha se a chave embutida parar de funcionar (pegue em themoviedb.org).
- **Áudio preferido** — `both` (padrão), `dublado` ou `legendado`.

## Notas

- O AnimeFire entrega DASH (`application/dash+xml` via `akumast.net`). O Nuvio/ExoPlayer detecta pelo `format: "mpd"` e pelo probe do content-type.
- Headers de playback enviados: `Referer: https://animefire.io/`, `Origin: https://animefire.io`.
- Código Hermes-safe (só `Promise.then`, sem `async/await`), testado em Node 24.
