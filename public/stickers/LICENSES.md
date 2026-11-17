# Stickers

The stickers in this folder are from **Fluent Emoji** by Microsoft
(https://github.com/microsoft/fluentui-emoji), the "Color" style, taken from the
`@iconify-json/fluent-emoji` package. Same license for all of them:

```
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Animated stickers (`animated/`)

The animated stickers are **Noto Animated Emoji** by Google
(https://googlefonts.github.io/noto-emoji-animation/), as Lottie, with the still
emoji of the Noto set (`@iconify-json/noto`, Apache-2.0) beside each as its
thumbnail. The animations are licensed **CC BY 4.0**
(https://creativecommons.org/licenses/by/4.0/), which requires credit: it is in
the app's credits (`CreditsModal`). Fluent's license above covers only the static
ones.

One file per sticker, named by its id (`fire.svg`); the catalog with the
categories is `app/lib/stickers.ts`. Adding a sticker: the file here and its id in
the catalog (and its pt-BR name in `app/lib/sticker-labels.ts`).
