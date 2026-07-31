# 12 TÓNAR — design lock

Spec redesign for **12 tónar ehf** (kt. 600298-2169), Skólavörðustígur 15, 101 Reykjavík.
Structure transplanted from the Alda Music build; **nothing else is shared with it** — see
"Why this cannot read as Alda's sibling" at the bottom.

---

## 1. The concept: SKILTIÐ (the sign)

12 Tónar's identity is not a logotype, it is **a sign**: a yellow plate with a blue
keyline and blue type. It is in their window twice, on the door, on the lower windows,
and the same plate is their logo file. Their shelving is blue, their roof is blue
corrugated iron, their walls are pale yellow. The whole shop is already art-directed.

**So the page is built out of their sign, and the sign is a window.**

The hero is that plate at architectural scale. The words `12 TÓNAR` are knocked
*through* it, and behind the knockout is a wall made from **every single record in the
shop** — all 345 sleeves, their real stock, in one image. Scroll drifts the wall behind
the letters. The sign becomes what the real shopfront is: a yellow sign on a lit window
full of records.

One sentence to the owner:
> „Skiltið ykkar er glugginn. Í gegnum stafina sérðu hverja einustu plötu sem er til í
> búðinni."

## 2. The structural system: twelve

A twelve-column hairline grid, visible, and sections numbered `01`–`12` in mono.
This clears the ledger's "instruments must be earned" bar trivially: **twelve is their
name**, not an invented metric.

## 3. The signature interaction: RÖKKIN (the crate)

A horizontally scrolling crate of sleeves at their true size, with alphabetical divider
cards, exactly like flipping through a rack. Each card is cover · artist · title ·
format · price, straight from their own catalogue.

**It is a native scroller, not a pinned scroll-jack.** `overflow-x: auto` + scroll-snap,
with pointer drag and inertia added on fine pointers only. Touch gets the browser's own
compositor-driven scrolling and therefore moves at exactly 1.00× the finger with zero
JS in the path. This is the direct answer to the Alda build's still-open trap 13 (a
JS-transformed sticky roster driven from scroll events stutters on iOS at any tau).

## 4. The resolution law

**A sleeve's display size is decided by its own true pixels. Nothing is ever upscaled.**
Their catalogue is 345 covers of which only 29 are ≥1000px and 138 are 225×225. Rather
than fight that, the tier a record lands in is computed at build time from its real
dimensions:

| tier | source | rendered | ratio |
|---|---|---|---|
| the crate | ≥540px (44 records) | 260 CSS px | 1.0× at dpr2 |
| the lower floor | 225–480px (78 records) | ≤104 CSS px | ≈1.0× at dpr2 |
| the wall | all 345, 88px cells | inside glyph counters | <1.0× |

`tools/assets.py` asserts `max(emitted / source) <= 1.000` and the QA harness re-asserts
it against the rendered DOM.

## 5. Tokens

| token | value | provenance |
|---|---|---|
| `--t12-yellow` | `#F9F500` | **sampled from their own logo file** — 45.5% of its pixels |
| `--t12-ink` | `#122476` | the sign's keyline/type blue (photographed mean `#1E306A` at dusk) |
| `--t12-live` | `#284ADF` | brighter blue, interactive states only |
| `--t12-black` | `#0A0A0A` | second colour of the logo (20.9% of its pixels) |
| `--t12-paper` | `#FBFAF4` | reading grounds |

Type, both from `~/Design fonts/`, subsetted to Latin + the Icelandic set (49 KB total):
- **Overused Grotesk** (Black / Bold / Medium / Book) — one family for everything. A
  neo-grotesk with just enough character; their sign is set in a plain bold grotesk, so
  a single-typeface page *is* the brand. Verified: Á Ð É Í Ó Ú Ý Þ Æ Ö all present.
- **Martian Mono** (500/700) — tone numbers, catalogue meta, labels only.

## 6. Sections

```
01 Skiltið        the sign as a window onto all 345 sleeves      [signature]
02 Síðan 1998     the claim, with the NME 2018 line attributed
03 Í rekkunum     the crate                                      [signature interaction]
04 Sestu niður    the listening floor, free espresso, two floors
05 Útgáfan        the label since 2003 — TYPE ONLY, no covers    [accuracy device]
06 Neðri hæðin    78 small sleeves at 104px, honestly small
07 Í tölum        real catalogue figures
08 Búðin          shopfront full-bleed, hours, live open status
09 Hafðu samband  phone, email, address
```

## 7. The accuracy line, solved structurally

The 153 artists in the catalogue are records they **sell**. The 12 Tónar label is a
separate, smaller roster. Rather than trusting a caption to carry that distinction:

- section 03 is titled **Í rekkunum** and states „Þetta er lagerinn í búðinni."
- section 05 is **type only, with no artwork at all**, so no sleeve can ever sit next to
  the word „útgáfan" and imply a signing.

Superlative checked before it shipped (ledger #24): the 2018 award is *Marcus Barnes,
writing for NME, placing 12 Tónar first in his top ten record shops in the world* — the
page says exactly that, with his name on it, not „valin besta plötubúð heims".

## 8. Motion

One idle-cancelling rAF engine, zero dependencies. Traps applied from the first line,
not discovered again:

1. **No custom property is ever written to the root element.** An unregistered custom
   property inherits, so a per-frame write on `<html>` dirties the whole document. Every
   channel is written on the element that reads it.
2. **Every per-frame write is guarded on its value.**
3. **All rect reads are batched before all style writes**, once per frame.
4. **Primary content moves at exactly 1.00×.** The crate is a native scroller; the only
   things that move at another rate are the hero wall (0.06×) and one parallax band —
   both decoration, both nothing you are reading.
5. **No damping on touch.** Damping is what turns discrete wheel notches into motion; on
   a finger it is just content refusing to be where you put it. `pointer: coarse` writes
   targets directly.
6. Infinite animations pause off-screen with `animation-play-state: paused !important`
   (the `animation:` shorthand re-sets play-state, so `!important` is required).
7. No `content-visibility` / `display:none` on anything that crossfades.
8. No `will-change` on a stack of full-bleed plates.
9. Reveals are scrubbed and therefore reversible; phones reveal by the LINE, desktop by
   the character.
10. Masked line reveals are padded (`padding-top:.18em; margin-top:-.18em`) so Í Á Ó Ú Ý
    are not sheared.

## 9. Why this cannot read as Alda's sibling

| | Alda Music | 12 Tónar |
|---|---|---|
| ground | near-black `#0A0A0B` | acid yellow `#F9F500` |
| ink | chalk + red `#DF3F5C` | deep blue `#122476` |
| type | Humane + Archivo Narrow + Departure Mono | Overused Grotesk + Martian Mono |
| hero fill | a sea video composited in canvas | a still wall of their own stock, `background-clip:text` |
| roster | 54 full-bleed portraits, vertically pinned | 44 sleeves as objects, natively scrolled sideways |
| grid | free | a visible twelve-column rule |
| structure | one plate at a time | a crate you push |

The mechanism differs too: Alda needed canvas because `background-clip:text` cannot take
a `<video>` and `mix-blend-mode` over a composited video is ignored on WebKit. The fill
here is a **still image**, so CSS does it — one style write on one element, no canvas, no
retained bitmaps, and none of Alda's 280 MB mobile memory problem.
