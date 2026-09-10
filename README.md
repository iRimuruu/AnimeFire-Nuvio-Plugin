# AnimeFire para Nuvio

Assista aos animes do **AnimeFire** diretamente no app **Nuvio**, com a sua lista, progresso e legendas organizados em um só lugar.

## O que é

Este repositório é um plugin para o [Nuvio](https://nuvio.tv/) — um app gratuito e de código aberto para organizar e assistir seus filmes e séries. O plugin conecta o catálogo do [AnimeFire](https://animefire.io/) ao Nuvio, então você encontra os episódios dublados e legendados sem sair do app.

## O que você ganha

- 🗣️ Animes **dublados e legendados** em português
- 🎬 Filmes e séries de anime
- 📺 Qualidades até **1080p** (quando disponível na fonte)
- 🔄 Progresso salvo: continue de onde parou em qualquer aparelho
- ⭐ Favoritos, listas e histórico do Nuvio funcionando normalmente

## O que você precisa

- O app **Nuvio** instalado (Android, iPhone, Android TV, Windows, macOS, Linux ou Smart TV)
- Internet para buscar os episódios

> O Nuvio não hospeda nenhum vídeo — ele organiza e reproduz o conteúdo das fontes que você adiciona. Este plugin é mantido pela comunidade e não tem vínculo oficial com o AnimeFire nem com o Nuvio.

## Como instalar

1. Abra o app **Nuvio**.
2. Vá em **Configurações → Plugins** (em algumas versões aparece como **Scrapers locais**).
3. Toque em **Adicionar repositório**.
4. Cole este endereço:
   ```
   https://cdn.jsdelivr.net/gh/iRimuruu/AnimeFire-Nuvio-Plugin@main/manifest.json
   ```
   (Se der erro de repositório inválido, tente o endereço alternativo:
   `https://raw.githubusercontent.com/iRimuruu/AnimeFire-Nuvio-Plugin/main/manifest.json`)
5. Confirme e atualize a lista de provedores.
6. Ative o **AnimeFire** na lista.

> Depois de atualizações do plugin, o app pode demorar a puxar a versão nova (cache). Se isso acontecer, remova o repositório e adicione de novo.

Pronto. Agora é só buscar um anime no Nuvio e dar play — as opções de dublado e legendado aparecem na hora de escolher a fonte.

## Como usar

- Procure o anime normalmente pela lupa do Nuvio.
- Na tela de reprodução, escolha entre as fontes **AnimeFire dublado** ou **AnimeFire legendado**.
- Se um episódio falhar, tente a outra opção de áudio ou aguarde alguns minutos e tente de novo.

## Ajustes do plugin

Dentro do Nuvio, nos ajustes do plugin **AnimeFire**, você encontra:

| Opção | O que faz |
|---|---|
| Áudio preferido | Mostra só dublado, só legendado ou os dois (padrão: os dois) |
| TMDB API Key | Só mexa aqui se nenhum episódio aparecer em anime nenhum — crie uma chave grátis em [themoviedb.org](https://www.themoviedb.org/) (Configurações → API) e cole aqui |
| Modo diagnostico | Mostra na lista de fontes onde a busca parou (ex.: `tmdb-falhou`, `sem-episodio`). Use só para diagnosticar e desative depois |

## Problemas comuns

**Não aparece nenhum episódio**
- Confira se o plugin está ativado na lista de provedores.
- Verifique sua conexão com a internet e tente novamente.

**Um episódio específico não carrega**
- Troque entre dublado e legendado.
- O episódio pode ainda não estar disponível na fonte — tente mais tarde.

**O app diz que o repositório é inválido**
- Confira se o endereço foi colado por completo, sem espaços no início ou no fim.
- Se a rede bloquear o GitHub, use o endereço espelho:
  `https://cdn.jsdelivr.net/gh/iRimuruu/AnimeFire-Nuvio-Plugin@main/manifest.json`

**Nenhum episódio aparece em anime nenhum**
- O plugin usa uma chave pública do TMDB que às vezes atinge o limite em certas redes. Crie uma chave gratuita em [themoviedb.org](https://www.themoviedb.org/) (crie a conta, confirme o e-mail, vá em Configurações → API → crie uma chave) e cole o código de 32 letras e números no ajuste **TMDB API Key** do plugin.

## Aviso

Projeto feito para fins educacionais. Todo o conteúdo pertence aos seus respectivos donos — este repositório só indica onde o app pode encontrar os episódios. Use de acordo com as leis do seu país.

## Licença

Distribuído sob a licença [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html).
