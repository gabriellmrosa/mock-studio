# Fonts used for the scene text

Self-hosted so the app makes no request to a font CDN. Latin subset (covers
Portuguese and English, with accents), `.woff`, regular (400) and bold (700).
Source: the [Fontsource](https://fontsource.org) packages, as served by jsDelivr.
All five are licensed under the SIL Open Font License 1.1, which allows
embedding and redistributing the files with an application.

| Family | Designer(s) | License |
|---|---|---|
| Inter | Rasmus Andersson | OFL 1.1 |
| Poppins | Indian Type Foundry | OFL 1.1 |
| Playfair Display | Claus Eggers Sørensen | OFL 1.1 |
| Oswald | Vernon Adams, Kalapi Gajjar, Cyreal | OFL 1.1 |
| JetBrains Mono | JetBrains | OFL 1.1 |

The troika text renderer reads `.ttf`, `.otf` and `.woff`, not `.woff2`.
