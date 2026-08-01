# Every claim on the page, and where it came from

Checked 2026-07-31. Nothing appears on the page that is not in this table.
If a line here turns out to be wrong, the copy in `src/content.mjs` changes, not this file.

| on the page | source | note |
|---|---|---|
| „Plötubúð og útgáfa · Skólavörðustígur 15 · frá 1998" | finna.is, Wikipedia, their own listings | consistent across all three |
| „Búðin opnaði á Skólavörðustíg árið 1998" | same | |
| „Fimm árum síðar hófst útgáfan" (2003) | Wikipedia, 12tonar.is history | |
| „Árið 2018 setti blaðamaðurinn Marcus Barnes 12 Tóna í fyrsta sæti á lista NME yfir tíu bestu plötubúðir heims" | mbl.is 2018-10-22, Iceland Monitor 2018-10-23, nutiminn.is | **Deliberately precise.** The award is one journalist's ranked list for NME, not an institutional prize. „Valin besta plötubúð heims" on its own is an overclaim and is checkable in one search. |
| „Tvær hæðir af plötum" | their standing shop description; TripAdvisor reviews | |
| „plötuspilari og espresso í boði hússins" | same | described as free espresso or tea, listening on two floors |
| „Þú mátt hlusta á allt áður en þú kaupir" | same | |
| „Opið alla daga vikunnar" | 1819.is listing | see the hours caveat below |
| label artists: Mugison, Jóhann Jóhannsson, Hildur Guðnadóttir, Skúli Sverrisson, Ólöf Arnalds, Eivör, Samaris | the label’s documented release list, re-checked 2026-08-01 | section 05 carries no artwork at all, so no sleeve can sit beside the word utgafan and imply a signing |
| nearly eighty releases on the label | same source | |
| upstairs is jazz and classical, the basement alternative, indie and electronic | the shop’s own standing description | |
| concerts in the shop and in the backyard | same | |
| every sleeve, artist, title, format and price in the crate and on the lower floor | their own `products.json`, harvested 2026-07-31 | caption and file are emitted from the same record by `tools/assets.py`, so a title can never drift onto the wrong picture |
| 297 plötur á vínyl · 25 geisladiskar · 153 flytjendur · 311 titlar til á lager · miðverð 5.000 kr · verðbil 2.500 til 9.000 | computed from the same export | the page says so: „lesnar beint úr vöruskrá búðarinnar 31. júlí 2026" |
| „322 titlar í búðinni" (hero) | 297 vinyl + 25 CD | excludes their 21 own-brand t-shirts and tote bags |
| sími 511 5656 | já.is, 1819.is, their own listings | |
| 12tonar@12tonar.is | 1819.is; MX verified live at Microsoft 365 | the address resolves and receives |
| Kt. 600298-2169 | keldan.is, finna.is, já.is | |
| the shopfront photograph and the interior photograph | their own Shopify CDN (`files/12_Tonar.jpg`, `collections/isl_vinyll.jpg`) | served at 1728×1152 and 640×480 natively |
| the logo in the header | their own Shopify CDN (`files/Logo.jpg`), 1102×360 | the storefront renders it at 120px wide; the CDN serves the original |

## The accuracy line

The 153 artists in the catalogue are artists whose records 12 Tónar **sell**. The
12 Tónar label is a separate, smaller roster. The page keeps these apart structurally,
not with a disclaimer:

- section 03 is titled **Í rekkunum** and says „Þetta er lagerinn í búðinni."
- it carries an explicit note: „Plötur sem búðin selur. Útgáfulisti 12 Tóna er annar
  listi og hann er hér fyrir neðan."
- section 05 is **type only**, and closes with „Þetta er útgáfulistinn. Listinn hér
  fyrir ofan er lagerinn í búðinni og hann er annað."

Nowhere does the page imply that Kaleo, Laufey, Bubbi or Víkingur Ólafsson record for
12 Tónar.

## Two things that must be confirmed by the owners before this goes anywhere near live

1. **The opening hours** (Mon–Sat 10:00–18:00, Sun 12:00–18:00) come from their **1819
   listing**, not from them. Their own site publishes no hours at all, which is why the
   page makes a point of showing them, and the page says where they came from
   („Opnunartími skráður hjá 1819. Staðfestist af eigendum."). The live „opið núna"
   status in the header is computed from those hours, so if they are wrong, it is wrong
   seven days a week.
2. **Photograph credit and licence.** Both photographs come from their own Shopify
   media library. Who shot them, and whether 12 Tónar hold the rights, is unknown. Fine
   for a preview shown to them; it must be settled before a production launch.

## Corrections to the brief this build was given

Three things in the brief turned out to be wrong when the assets were actually fetched,
and all three loosened a constraint rather than tightening it:

1. **The logo is not a 120×39 JPEG.** That is the size the Dawn theme *renders* it at.
   `cdn.shopify.com/.../files/Logo.jpg` with no `width=` parameter returns the original
   at **1102×360**: flat #F9F500 with a black keyline and black type, no compression
   damage, entirely usable. It is on the page.
2. **The shopfront photograph is not 429×286.** Same cause: it is **1728×1152**, and it
   carries the full band as the page's only full-bleed photograph.
3. **The "brand blues" (#284ADF / #122476 / #334FB4) are Dawn's stock `color-scheme-5`,
   not 12 Tónar's colours.** `#284ADF` appears exactly once in the storefront HTML, as
   `.color-scheme-5 { --color-background: 40,74,223 }`, and the other two are Dawn's own
   derived contrast and button-text values. Blue is nevertheless genuinely theirs: their
   shopfront sign has a blue keyline and blue type, their roof is blue corrugated iron
   and their record shelving is blue, all visible in their own photograph, where the
   sign's blue measures a mean of `#1E306A` under dusk light. So the locked yellow/blue
   direction is right; the provenance of the exact hex was not. `#122476` from the
   locked list is used because it matches the photographed sign, and the **yellow is
   sampled from their own logo file** (#F9F500, 45.5% of its pixels).

**The album-image constraint in the brief was exactly right** and is unchanged: only 29
of 345 covers are ≥1000px and 138 are 225×225. That is what the whole resolution law in
`DESIGN.md` is built around.

## Corrections from the fact-check pass, 2026-08-01

**LOW ROAR WAS WRONG AND IS GONE.** An earlier draft named Low Roar among the label’s
artists. It is not on the label’s documented release list, which reads: Mugison,
Trabant, Singapore Sling, Apparat Organ Quartet, Petur Ben, Eivor Palsdottir,
Ragnheidur Grondal, Johann Johannsson, Hildur Gudnadottir, Skuli Sverrisson, Olof
Arnalds, Pink Street Boys, Samaris and Jakobinarina, across nearly 80 releases. Four of
the five names originally used were right; that one was not, and it is exactly the sort
of claim the owners would catch in the first thirty seconds of a meeting.

**Bjork, Sigur Ros and mum are NOT named anywhere on this page**, and that is
deliberate. They are documented as musicians who used the shop as a meeting point, and
several third-party write-ups blur that into "the shop is also a label for Bjork and
Sigur Ros". It is not. That is the same distinction section 05 exists to hold: what is
in the racks versus what the label put out.

**Their own contact page was re-read on 2026-08-01** and is still a bare form: name,
email, phone number, comment. No address, no telephone number, no opening hours and no
email address anywhere on it. Every practical detail this prototype shows is one their
live site does not currently publish.
