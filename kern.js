/*
 * Rekenkern "Zonnepanelen na 2027". Geen DOM; werkt in de browser (globalThis.ZonRekenaar)
 * en in Node (module.exports). Alle percentages zijn breuken (0,30 = 30%).
 * Getallen komen uit references/research/2026-10-12-zonnepanelen-rekengetallen.md
 * en zijn NOG NIET door de controleur goedgekeurd: pas ze hieronder aan, alleen hier.
 */
(function (root) {
  'use strict';

  var STANDAARD = {
    datumCijfers: '12 oktober 2026', // datum van het onderzoek waar deze getallen uit komen
    aantalPanelen: 10,               // aanname: Milieu Centraal rekent met 10 panelen als voorbeeld (10-9-2026)
    wpPerPaneel: 435,                // Milieu Centraal, kosten en opbrengst, 10-9-2026
    prijsPerWp: 0.87,                // euro/Wp; Milieu Centraal 2025, pagina van 10-9-2026 (3.800 euro voor 10 x 435 Wp). De bron zegt niet of installatie en omvormer zijn inbegrepen. Bandbreedte 0,87-0,96.
    opbrengstPerWp: 0.87,            // kWh per Wp per jaar (basis voor de ligging-factor 1,00); Milieu Centraal, 10-9-2026 (3.800 kWh voor 10 panelen). Of dat "ideaal" of "gemiddeld" is, is niet vastgesteld.
    jaarverbruik: 2700,              // kWh per jaar; GEEN bron in het rapport, aanname gemiddeld huishouden (invullen met eigen verbruik)
    stroomprijs: 0.28,               // euro/kWh all-in; CBS-jaargemiddelde 2025 via ANWB, sept 2026. Bandbreedte 0,26 (CBS aug 2026) tot 0,30 (ANWB sept 2026)
    deelEigenVerbruik: 0.30,         // Milieu Centraal, 24-6-2026 en zonnepanelen-overzicht: 30% zonder sturing
    nettoTerugleverwaarde: 0.0125,   // euro/kWh netto na 2027; Milieu Centraal, kosten en opbrengst, 10-9-2026 ("ongeveer 1,25 cent"). Dezelfde organisatie noemt op de pagina over de salderingsstop (24-6-2026) netto rond 0,5 cent na terugleverkosten. Verschilt per leverancier.
    prijsstijging: 0,                // per jaar; standaard 0% (opdracht), bewust voorzichtig
    degradatie: 0,                   // per jaar; het rapport noemt GEEN degradatiecijfer, dus 0. Zelf in te vullen (vaak genoemd: 0,5%, maar niet uit het rapport).
    levensduur: 25,                  // jaren; Milieu Centraal, 10-9-2026
    maxJaren: 30                     // zoekgrens voor de terugverdientijd
  };

  // Opbrengstfactor t.o.v. zuid (dak 30 of 45 graden); Milieu Centraal "Hoe geschikt is je dak", 29-6-2026 (oost/west en noord bij 30 graden).
  var LIGGING = {
    zuid:       { factor: 1.00, label: 'Zuid' },
    zuidoostwest: { factor: 0.95, label: 'Zuidoost of zuidwest' },
    oostwest:   { factor: 0.80, label: 'Oost en west (verdeeld over beide daken)' },
    noord:      { factor: 0.60, label: 'Noord (afgeraden)' }
  };

  // Keuzes eigen verbruik; Milieu Centraal "Zonnestroom als de saldering stopt", 24-6-2026
  var EIGEN_VERBRUIK = {
    zonder: { deel: 0.30, label: 'Zonder sturing (30%)' },
    slim:   { deel: 0.35, label: 'Met slim gebruik van apparaten (35%)' },
    groot:  { deel: 0.45, label: 'Met warmtepomp met voorraadvat (45%)' }
  };

  function isGetal(x) { return typeof x === 'number' && isFinite(x); }
  function gegeven(x) { return x !== undefined && x !== null && x !== ''; }

  function vul(invoer) {
    var o = {}, k;
    for (k in STANDAARD) o[k] = STANDAARD[k];
    o.ligging = 'zuid';
    o.totalePrijs = null;
    for (k in (invoer || {})) if (gegeven(invoer[k])) o[k] = invoer[k];
    return o;
  }

  function controleer(o) {
    var f = [];
    if (!isGetal(o.aantalPanelen) || o.aantalPanelen < 1 || o.aantalPanelen !== Math.floor(o.aantalPanelen))
      f.push('Het aantal panelen moet een geheel getal van minimaal 1 zijn.');
    else if (o.aantalPanelen > 1000) f.push('Het aantal panelen is onwaarschijnlijk hoog (maximaal 1000).');
    if (!isGetal(o.wpPerPaneel) || o.wpPerPaneel < 50 || o.wpPerPaneel > 1000)
      f.push('Het vermogen per paneel (Wp) moet tussen 50 en 1000 liggen.');
    if (o.totalePrijs !== null && !(isGetal(o.totalePrijs) && o.totalePrijs > 0))
      f.push('De totale prijs moet hoger zijn dan 0 euro.');
    if (!isGetal(o.prijsPerWp) || o.prijsPerWp <= 0 || o.prijsPerWp > 10)
      f.push('De prijs per Wp moet hoger zijn dan 0 euro (en lager dan 10).');
    if (!LIGGING[o.ligging]) f.push('Kies een ligging van het dak.');
    if (!isGetal(o.jaarverbruik) || o.jaarverbruik <= 0 || o.jaarverbruik > 100000)
      f.push('Het jaarverbruik moet hoger zijn dan 0 kWh.');
    if (!isGetal(o.stroomprijs) || o.stroomprijs <= 0 || o.stroomprijs > 2)
      f.push('De stroomprijs moet hoger zijn dan 0 euro per kWh.');
    if (!isGetal(o.deelEigenVerbruik) || o.deelEigenVerbruik < 0 || o.deelEigenVerbruik > 1)
      f.push('Het deel eigen verbruik moet tussen 0% en 100% liggen.');
    if (!isGetal(o.nettoTerugleverwaarde) || o.nettoTerugleverwaarde < -0.1 || o.nettoTerugleverwaarde > 2)
      f.push('De waarde per teruggeleverde kWh moet tussen -0,10 en 2 euro liggen.');
    if (!isGetal(o.prijsstijging) || o.prijsstijging < -0.2 || o.prijsstijging > 0.2)
      f.push('De prijsstijging per jaar moet tussen -20% en 20% liggen.');
    if (!isGetal(o.degradatie) || o.degradatie < 0 || o.degradatie > 0.05)
      f.push('De afname van de opbrengst per jaar moet tussen 0% en 5% liggen.');
    return f;
  }

  // Besparing in jaar j (1 = eerste jaar), met prijsstijging op de stroomprijs en degradatie op de opbrengst.
  // De netto terugleverwaarde blijft vast (voorzichtig).
  function jaarCijfers(o, opbrengst1, j) {
    var opb = opbrengst1 * Math.pow(1 - o.degradatie, j - 1);
    // Aanname: het eigen-verbruikdeel geldt over het deel van de opbrengst dat binnen je jaarverbruik past.
    var zelf = o.deelEigenVerbruik * Math.min(opb, o.jaarverbruik);
    var terug = opb - zelf;
    var prijs = o.stroomprijs * Math.pow(1 + o.prijsstijging, j - 1);
    return { opbrengst: opb, zelf: zelf, terug: terug, besparing: zelf * prijs + terug * o.nettoTerugleverwaarde, prijs: prijs };
  }

  function bereken(invoer) {
    var o = vul(invoer);
    var fouten = controleer(o);
    if (fouten.length) return { ok: false, fouten: fouten };

    var wp = o.aantalPanelen * o.wpPerPaneel;
    var opbrengst = wp * o.opbrengstPerWp * LIGGING[o.ligging].factor;
    var investering = o.totalePrijs !== null ? o.totalePrijs : wp * o.prijsPerWp;
    var j1 = jaarCijfers(o, opbrengst, 1);

    var terugverdientijd = null, cum = -investering, j, c, totaal25 = 0;
    for (j = 1; j <= Math.max(o.maxJaren, o.levensduur); j++) {
      c = jaarCijfers(o, opbrengst, j);
      if (j <= o.maxJaren && terugverdientijd === null && cum + c.besparing >= 0)
        terugverdientijd = (j - 1) + (-cum) / c.besparing;
      cum += c.besparing;
      if (j <= o.levensduur) totaal25 += c.besparing;
    }

    // Ter vergelijking: als je nog wel zou salderen, tegen de volle stroomprijs, tot het jaarverbruik.
    var saldering = Math.min(opbrengst, o.jaarverbruik) * o.stroomprijs;

    var uit = {
      ok: true, invoer: o,
      wp: wp,
      jaaropbrengstKwh: opbrengst,
      zelfGebruiktKwh: j1.zelf,
      teruggeleverdKwh: j1.terug,
      besparingPerJaar: j1.besparing,
      investering: investering,
      terugverdientijd: terugverdientijd,            // jaren, of null = niet binnen maxJaren
      winstNa25Jaar: totaal25 - investering,          // opbrengst over de levensduur min investering
      besparingMetSaldering: saldering,
      verliesDoorEindeSaldering: saldering - j1.besparing
    };
    uit.advies = advies(uit);
    return uit;
  }

  function afr(x, d) { var m = Math.pow(10, d || 0); return Math.round(x * m) / m; }
  function nl(x, d) { return afr(x, d).toLocaleString('nl-NL', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  function advies(u) {
    var o = u.invoer, r = [];
    if (u.terugverdientijd === null || u.terugverdientijd > o.levensduur)
      r.push('Volgens deze schatting verdien je de panelen niet binnen ' + o.levensduur + ' jaar terug. Kijk of de prijs of het aantal panelen anders kan, of dat je meer van de stroom zelf kunt gebruiken.');
    else
      r.push('Volgens deze schatting verdien je ze terug in ongeveer ' + nl(u.terugverdientijd, 1) + ' jaar. Het meeste levert het op als je de stroom overdag zelf gebruikt.');
    if (u.teruggeleverdKwh > 2 * u.zelfGebruiktKwh)
      r.push('Je levert veel meer terug dan je zelf gebruikt. Na 2027 is teruggeleverde stroom weinig waard: overweeg minder panelen, of meer stroom overdag zelf gebruiken (wasmachine, vaatwasser, warmtepomp overdag laten draaien).');
    if (o.ligging === 'noord')
      r.push('Panelen op het noorden leveren aanzienlijk minder op; dat wordt afgeraden.');
    if (u.jaaropbrengstKwh > o.jaarverbruik)
      r.push('De panelen leveren meer op dan je in een jaar verbruikt. Het deel boven je verbruik is na 2027 nog maar weinig waard.');
    else
      r.push('Je panelen wekken minder op dan je in een jaar verbruikt. Deze rekenhulp rekent dan met een vast deel eigen verbruik en een vaste prijs per Wp, waardoor meer of minder vermogen of verbruik de terugverdientijd niet verandert. Vul je offerteprijs in en kies bij "Hoeveel stroom gebruik je zelf?" wat bij jou past voor een schatting op maat.');
    if (o.degradatie === 0)
      r.push('We rekenen zonder afname van de opbrengst per jaar; vul dit zelf in bij "meer opties" als je dat wilt meenemen.');
    return r;
  }

  var api = { STANDAARD: STANDAARD, LIGGING: LIGGING, EIGEN_VERBRUIK: EIGEN_VERBRUIK, bereken: bereken, controleer: controleer, nl: nl };
  root.ZonRekenaar = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
