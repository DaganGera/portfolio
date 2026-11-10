# Marcben James Samuel: portfolio

A single-page site. Each flagship project gets its own colour world and a 3D
specimen drawn in code; every sound is synthesised in the browser.

## Run

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # static site in dist/
```

## Edit the content

Everything the site says is in `src/content.ts`.

- **Add a flagship:** append to `flagships`. Choose a `world` (colour set) and a
  `specimen` (`plate`, `dish`, `onion`, `drive`, or `none` for type and colour only).
- **Add a smaller project:** append to `more`.
- **New colour set:** add an entry to `worlds` (ground, ink, accent, soft) and a
  chord for it in `src/audio.ts`.
- **Resume:** replace `public/files/Marcben-James-Samuel-Resume.pdf`.
- **Figures** in the "Read how it works" panel live in `public/img/`.

## Where things are

| File | What |
|---|---|
| `src/content.ts` | All copy, links, numbers, colour sets |
| `src/main.ts` | Page build, scroll choreography, colour floods, fitted titles |
| `src/gl/stage.ts` | Renderer, lights, where each specimen sits in each scene |
| `src/gl/specimens.ts` | The four objects: steel plate, culture dish, onion, hard drive |
| `src/gl/gate.ts` | Entry screen: the name grown by a cellular automaton |
| `src/audio.ts` | Sound engine (Web Audio, no files) |
| `src/styles/main.css` | Type, layout, colour variables |
| `raea/card.tsx` | Share image and teaser clip, rendered with raea |

## Share image and teaser

```sh
cd raea
raea render card.tsx --composition og --frame 0 -o out/og.png
raea render card.tsx --composition teaser -o out/teaser.mp4
```

`public/og.png` is the link-preview image. After deploying, change the
`og:image` tag in `index.html` to the full URL, since most networks ignore
relative paths.

## Type and colour

- Display: Anybody (variable width). Titles are stretched along the width axis
  until each line spans the page.
- Text: Brygada 1918.
- Colour sets are taken from what each project looks at: tempered steel, agar,
  red onion skin, solder mask.
