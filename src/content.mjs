/* Every fact on this page and where it came from. Nothing is asserted here that was not
   read off a primary source — their own storefront, their own logo file, their own
   photographs, a dated news article, or their directory listing. See FACTS.md for the
   audit trail. Icelandic copy contains no em-dashes by rule. */

export const SHOP = {
  name: '12 Tónar',
  kt: '600298-2169',
  street: 'Skólavörðustígur 15',
  postcode: '101 Reykjavík',
  phone: '511 5656',
  phoneHref: '+3545115656',
  email: '12tonar@12tonar.is',
  founded: 1998,
  labelFrom: 2003,
  maps: 'https://www.google.com/maps/search/?api=1&query=Sk%C3%B3lav%C3%B6r%C3%B0ust%C3%ADgur+15%2C+101+Reykjav%C3%ADk',
};

/* Source: their 1819.is listing (1819.is/12-tonar-ehf-verslun). Their own website
   publishes no opening hours at all, which is the single loudest finding in the audit,
   so these must be confirmed by the owners before anything goes live. Iceland stays on
   UTC all year, so the live status can be computed from UTC with no timezone data. */
export const HOURS = [
  { d: 'Mánudagur', i: 1, o: 600, c: 1080 },
  { d: 'Þriðjudagur', i: 2, o: 600, c: 1080 },
  { d: 'Miðvikudagur', i: 3, o: 600, c: 1080 },
  { d: 'Fimmtudagur', i: 4, o: 600, c: 1080 },
  { d: 'Föstudagur', i: 5, o: 600, c: 1080 },
  { d: 'Laugardagur', i: 6, o: 600, c: 1080 },
  { d: 'Sunnudagur', i: 0, o: 720, c: 1080 },
];

export const NAV = [
  { id: 'rekkarnir', label: 'Rekkarnir' },
  { id: 'klefinn', label: 'Búðin' },
  { id: 'utgafan', label: 'Útgáfan' },
  { id: 'nedri', label: 'Neðri hæðin' },
  { id: 'hafa-samband', label: 'Hafa samband' },
];

export const HERO = {
  eyebrow: 'Plötubúð og útgáfa · Skólavörðustígur 15 · frá 1998',
  mark: '12 TÓNAR',
  lead: 'Á bak við stafina er hver einasta plata sem er til í búðinni.',
  cta: [
    { href: '#rekkarnir', label: 'Farðu í gegnum rekkana', primary: true },
    { href: '#budin', label: 'Opnunartími og staðsetning' },
  ],
};

/* 1998 opening + label from 2003: 12tonar.is / Wikipedia / finna.is, all agreeing.
   The 2018 line is deliberately precise. What happened is that Marcus Barnes, writing
   for NME in October 2018, put 12 Tónar first in his top ten record shops in the world.
   „Valin besta plötubúð heims" without his name on it is an overclaim, and overclaims
   are checkable. mbl.is/folk/frettir/2018/10/22 and nutiminn.is both carry it. */
export const STORY = {
  tone: '02',
  kicker: 'Síðan 1998',
  head: 'Búð sem fólk kemur aftur í',
  body: [
    'Búðin opnaði á Skólavörðustíg árið 1998 og varð fljótt samkomustaður tónlistarfólks í Reykjavík. Fimm árum síðar hófst útgáfan.',
    'Árið 2018 setti blaðamaðurinn Marcus Barnes 12 Tóna í fyrsta sæti á lista NME yfir tíu bestu plötubúðir heims. Ekkert af þessu stendur á vefnum þeirra í dag.',
  ],
  marks: [
    { n: '1998', t: 'Búðin opnar' },
    { n: '2003', t: 'Útgáfan hefst' },
    { n: '2018', t: 'Fyrsta sæti hjá NME' },
    { n: '2', t: 'Hæðir af plötum' },
  ],
};

export const CRATE = {
  tone: '03',
  kicker: 'Í rekkunum',
  head: 'Farðu í gegnum rekkana',
  lead: 'Þetta er lagerinn í búðinni, með verðunum sem standa á honum. Dragðu til hliðar.',
  note: 'Plötur sem búðin selur. Útgáfulisti 12 Tóna er annar listi og hann er hér fyrir neðan.',
  hint: 'Dragðu eða strjúktu',
};

/* Two floors, listening, free espresso: described in their own listings and in the
   shop's standing description. Nothing here claims a service they do not offer. */
export const LISTEN = {
  tone: '04',
  kicker: 'Sestu niður',
  head: 'Þú mátt hlusta á allt áður en þú kaupir',
  body: [
    'Tvær hæðir af plötum, plötuspilari og espresso í boði hússins. Fólk sest niður, hlustar og fer svo aftur upp í rekkana.',
    'Þetta er ástæðan fyrir því að búðin er á lista yfir það sem fólk vill sjá í Reykjavík, og það er ekki hægt að lesa það neins staðar á vefnum þeirra.',
  ],
  caption: 'Efri hæðin á Skólavörðustíg 15. Ljósmynd frá 12 Tónum.',
  specs: [
    ['Hæðir af plötum', 'Tvær'],
    ['Plötuspilari', 'Á staðnum'],
    ['Espresso og te', 'Í boði hússins'],
    ['Opið', 'Alla daga vikunnar'],
  ],
};

/* Label artists: Wikipedia's 12 Tónar entry lists Jóhann Jóhannsson, Hildur
   Guðnadóttir, Ólöf Arnalds, Samaris and Low Roar among the label's releases.
   NO ARTWORK IN THIS SECTION. A sleeve next to the word „útgáfan" would imply a
   signing, and most of the sleeves in the shop are other labels' records. */
export const LABEL = {
  tone: '05',
  kicker: 'Útgáfan',
  head: 'Það sem búðin gefur sjálf út',
  body: [
    'Útgáfan hefur starfað frá 2003. Meðal þeirra sem hafa gefið út hjá 12 Tónum eru Jóhann Jóhannsson, Hildur Guðnadóttir, Ólöf Arnalds, Samaris og Low Roar.',
  ],
  names: ['Jóhann Jóhannsson', 'Hildur Guðnadóttir', 'Ólöf Arnalds', 'Samaris', 'Low Roar'],
  guard: 'Þetta er útgáfulistinn. Listinn hér fyrir ofan er lagerinn í búðinni og hann er annað.',
};

export const LOWER = {
  tone: '06',
  kicker: 'Neðri hæðin',
  head: 'Kassarnir sem taka tíma',
  lead: 'Það sem finnst þegar farið er alla leið í gegnum stæðurnar.',
};

export const NUMBERS = {
  tone: '07',
  kicker: 'Í tölum',
  head: 'Búðin eins og hún stendur í dag',
  note: 'Tölurnar eru lesnar beint úr vöruskrá búðarinnar 31. júlí 2026.',
};

export const SHOPSEC = {
  tone: '08',
  kicker: 'Búðin',
  head: 'Skólavörðustígur 15',
  body: 'Hvorki heimilisfang, símanúmer né opnunartími stendur nokkurs staðar á vefnum þeirra í dag. Þetta er allt sem gestur þarf.',
  caption: 'Skólavörðustígur 15 að kvöldi. Ljósmynd frá 12 Tónum.',
  hoursNote: 'Opnunartími skráður hjá 1819. Staðfestist af eigendum.',
};

export const CONTACT = {
  tone: '09',
  kicker: 'Hafðu samband',
  head: 'Sendu okkur línu',
  body: 'Vantar þig plötu sem er ekki í rekkunum, eða viltu senda okkur upptöku? Hringdu, skrifaðu eða komdu við.',
  fields: [
    { id: 'nafn', label: 'Nafn', type: 'text', auto: 'name' },
    { id: 'netfang', label: 'Netfang', type: 'email', auto: 'email' },
    { id: 'erindi', label: 'Erindið', type: 'textarea', auto: 'off' },
  ],
  submit: 'Senda',
};

/* This is a spec redesign on a URL that is not theirs. It says so, in Icelandic, in the
   footer, on the page itself, not only in a robots directive. */
export const DISCLOSURE =
  'Þetta er sýnishorn af endurhönnun, unnið af SNDR Studio og ekki í eigu 12 Tóna. ' +
  'Allar plötuumslög, ljósmyndir, verð og merki eru eign 12 tóna ehf. og eru sótt úr ' +
  'þeirra eigin vefverslun. Síðan er ekki skráð hjá leitarvélum.';

export const FOOTER = {
  built: 'SNDR Studio',
  builtHref: 'https://sndr-studio.pages.dev',
};
