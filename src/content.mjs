export { ARTISTS, RELEASES } from './roster.mjs';

/* Every fact here was read off a primary source: their own storefront and logo file,
   their directory listings, or a dated news article. The audit trail is in FACTS.md.
   Icelandic copy carries no em-dashes and no en-dashes by rule, so ranges are written
   with „til" rather than with a stroke. */

export const META = {
  name: '12 Tónar',
  domain: '12tonar.is',
  title: '12 Tónar · plötubúð og útgáfa á Skólavörðustíg síðan 1998',
  description:
    'Plötubúð, útgáfa og bar á Skólavörðustíg 15 í Reykjavík. Tvær hæðir af plötum, '
    + 'plötuspilari og espresso í boði hússins. Opnunartími, staðsetning og lagerinn í búðinni.',
  address: 'Skólavörðustígur 15, 101 Reykjavík',
  kt: '600298-2169',
  email: '12tonar@12tonar.is',
  phone: '+354 511 5656',
  phoneHref: '+3545115656',
  shop: 'https://12tonar.myshopify.com/',
  /* From their 1819 listing. Their own website publishes no opening hours at all,
     which is the loudest single finding in the audit, so these are shown here AND
     flagged for the owners to confirm. */
  hours: [
    ['Mánudaga til laugardaga', '10 til 18'],
    ['Sunnudaga', '12 til 18'],
  ],
  social: [
    ['Instagram', 'https://www.instagram.com/12_tonar/'],
    ['Facebook', 'https://www.facebook.com/12-T%C3%B3nar-28436755255/'],
  ],
};

export const NAV = [
  ['Plötur', '#plotur'],
  ['Í rekkunum', '#rekkarnir'],
  ['Sagan', '#sagan'],
  ['Netverslun', META.shop],
];

export const HERO = {
  /* Two lines so the mark can sit as one solid word and one hollow word. Their own
     sign sets the numeral and the word on a single line, but the two-line lockup is
     what makes the film readable inside the letters. */
  markLines: ['12', 'TÓNAR'],
  eyebrow: 'Skólavörðustígur 15 · síðan 1998',
  lead:
    'Plötubúð, útgáfa og bar á Skólavörðustíg. Tvær hæðir af plötum, plötuspilari og '
    + 'espresso í boði hússins. Þú mátt hlusta á allt áður en þú kaupir.',
  scroll: 'Skruna',
  play: 'Hlusta',
  tickerLabel: 'Nýtt í rekkunum',
};

export const SHOP = {
  eyebrow: 'Plötubúðin',
  title: 'Plötur',
  lead:
    'Allt sem hér stendur er til í búðinni á Skólavörðustíg og í netversluninni. '
    + 'Dragðu röðina til hliðar.',
  drag: 'Dragðu',
  cta: 'Opna netverslun',
  priceNote: 'Verð og lager lesin úr netversluninni 31. júlí 2026.',
};

export const ROSTER = {
  eyebrow: 'Lagerinn',
  title: 'Í rekkunum',
  lead:
    'Sextíu flytjendur af þeim hundrað fimmtíu og þremur sem eiga plötu í búðinni '
    + 'núna. Skrunaðu niður listann.',
  hint: 'Nafnið í miðjunni er valið',
  countLabel: 'af 60',
  /* The accuracy line, carried by the section itself rather than by a caption:
     these are records the shop SELLS. The label is a separate, smaller roster and it
     gets its own section further down. */
  note:
    'Þetta eru plötur sem búðin selur. Útgáfulisti 12 Tóna er annar listi og hann er '
    + 'hér fyrir neðan.',
};

export const HISTORY = {
  eyebrow: 'Sagan',
  /* Short on purpose. "Tuttugu og átta ár" orphaned "ár" onto its own line at 390px in
     a display face this large, and the fact itself reads better in the lead anyway. */
  title: 'Frá 1998',
  lead:
    'Tuttugu og átta ár í sömu búðinni á sama horninu, frá opnun að lista NME yfir '
    + 'bestu plötubúðir heims. Dragðu tímalínuna til hliðar.',
  drag: 'Dragðu tímalínuna',
  items: [
    {
      year: '1998',
      head: 'Búðin opnar',
      tag: 'Skólavörðustígur',
      body:
        'Búðin opnar á Skólavörðustíg og verður fljótt samkomustaður tónlistarfólks í '
        + 'Reykjavík. Fólk kemur til að hlusta, ekki bara til að kaupa.',
    },
    {
      year: '2003',
      head: 'Útgáfan hefst',
      tag: 'Eigin plötur',
      body:
        'Búðin fer að gefa út sjálf. Meðal þeirra sem gefa út hjá 12 Tónum næstu árin '
        + 'eru Jóhann Jóhannsson, Hildur Guðnadóttir, Ólöf Arnalds, Samaris og Low Roar.',
    },
    {
      year: '2018',
      head: 'Fyrsta sæti hjá NME',
      tag: 'Tuttugu ára',
      body:
        'Blaðamaðurinn Marcus Barnes setur 12 Tóna í fyrsta sæti á lista NME yfir tíu '
        + 'bestu plötubúðir heims, sama ár og búðin verður tuttugu ára.',
    },
    {
      year: '2019',
      head: 'Barinn',
      tag: 'Og kaffihúsið',
      body:
        'Bar og kaffihús bætast við. Búðin verður staður sem fólk situr á, ekki bara '
        + 'staður sem það kemur í, og bakgarðurinn fyllist á tónleikakvöldum.',
    },
    {
      year: 'Núna',
      head: 'Tvær hæðir',
      tag: 'Reykjavík 101',
      body:
        'Þrjú hundruð og tuttugu titlar í rekkunum, hundrað fimmtíu og þrír flytjendur, '
        + 'plötuspilari á staðnum og opið alla daga vikunnar.',
    },
  ],
};

/* Structurally this is where Alda's parent-company band sat. Here it carries the
   label, and it carries NO ARTWORK: a sleeve beside the word „útgáfan" would imply a
   signing, and most of the sleeves in the shop are other labels' records. */
export const LABEL = {
  eyebrow: 'Útgáfan',
  title: 'Það sem búðin gefur sjálf út',
  body:
    'Útgáfan hefur starfað frá 2003. Meðal þeirra sem hafa gefið út hjá 12 Tónum eru '
    + 'Jóhann Jóhannsson, Hildur Guðnadóttir, Ólöf Arnalds, Samaris og Low Roar.',
  guard:
    'Listinn hér fyrir ofan er lagerinn í búðinni. Þetta er útgáfan og það er annað.',
  link: ['Netverslunin', META.shop],
};

export const CTA = {
  head: 'Ertu með eitthvað sem við eigum að heyra?',
  body:
    'Sendu okkur hlekk á tónlistina þína, eða komdu bara við. Það er plötuspilari á '
    + 'staðnum og espresso í boði hússins.',
  action: 'Senda tónlist',
  subject: 'Tónlist til 12 Tóna',
  secondary: 'Koma í búðina',
};

export const FOOTER = {
  head: '12 Tónar',
  shopLabel: 'Plötubúðin',
  hoursLabel: 'Opnunartími',
  contactLabel: 'Samband',
  socialLabel: 'Samfélagsmiðlar',
  hoursNote: 'Opnunartími skráður hjá 1819. Staðfestist af eigendum.',
  credit:
    'Frumgerð eftir SNDR Studio og ekki í eigu 12 Tóna. Plötuumslög, verð og merki eru '
    + 'eign 12 tóna ehf. og eru sótt úr þeirra eigin vefverslun. Kvikmyndin í hausnum er '
    + 'tölvugerð. Þetta er ekki opinber vefur fyrirtækisins og hann er ekki skráður hjá '
    + 'leitarvélum.',
};
