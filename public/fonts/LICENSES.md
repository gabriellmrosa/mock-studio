# Fonts used for the scene text

Self-hosted so the app makes no request to a font CDN. Latin subset (covers
Portuguese and English, with accents), `.woff`, one file per weight (38 files, ~880 KB
in all, but the app only downloads the weight in use).
Source: the [Fontsource](https://fontsource.org) packages, as served by jsDelivr.
All five are licensed under the SIL Open Font License 1.1, which allows
embedding and redistributing the files with an application.

| Family | Weights | Designer(s) | License |
|---|---|---|---|
| Inter | 100–900 | Rasmus Andersson | OFL 1.1 |
| Poppins | 100–900 | Indian Type Foundry | OFL 1.1 |
| Playfair Display | 400–900 | Claus Eggers Sørensen | OFL 1.1 |
| Oswald | 200–700 | Vernon Adams, Kalapi Gajjar, Cyreal | OFL 1.1 |
| JetBrains Mono | 100–800 | JetBrains | OFL 1.1 |

The troika text renderer reads `.ttf`, `.otf` and `.woff`, not `.woff2`.
