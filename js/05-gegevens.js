// Gegevens: koppeling nummerplan en call-flow, verzamelen van alle invoer, validatie per stap.
// (Klassiek script: deelt de globale variabelen en functies met de andere bestanden in js/; laadvolgorde: zie index.html.)

/* ======================================================================
 * GEGEVENS: koppeling nummerplan <-> call-flow, verzamelen en controleren per stap
 * ====================================================================== */

// Leesbare naam van een gebruiker via het interne ID ("r"+rijnummer), bv. "201 – Jan Peeters".
function ulab(id) {
  var u = ppl().filter(function (x) {
    return "r" + x.x === id;
  })[0];
  return u ? u.i + " – " + u.v + " " + u.f : "(gebruiker verwijderd)";
}
// Verwijdert uit een schema leden/voicemail-ontvangers die niet meer in het nummerplan staan.
function clean(n) {
  if (n.t === "ext") {
    if (n.usr && D.users.indexOf(n.usr) < 0) n.usr = ""; // gebruiker bestaat niet meer
    if (n.int && allNums().indexOf(n.int) < 0) n.int = ""; // nummer staat niet meer in de nummerlijst
  }
  if (n.sel)
    n.sel = n.sel.filter(function (u) {
      return D.users.indexOf(u) >= 0;
    });
  if (n.vmu)
    n.vmu = n.vmu.filter(function (u) {
      return D.users.indexOf(u) >= 0;
    });
  slots(n).forEach(function (s) {
    var c = s.g();
    if (c) clean(c);
  });
}
// Welke nummers zijn rechtstreeks nummer van een gebruiker? (die krijgen geen eigen call-flow)
function usedMap() {
  var m = {};
  ppl().forEach(function (u) {
    if (u.r) m[u.r] = u.i + (u.v || u.f ? " – " + u.v + " " + u.f : "");
  });
  return m;
}
// Begint het schema van het gekozen nummer opnieuw.
function fresh() {
  FL[cur] = mk("nr");
  FL[cur].nr = cur;
  root = FL[cur];
  SEL = null;
}
// Wordt uitgevoerd bij het openen van stap 5: synchroniseert nummers en gebruikers met de stappen ervoor.
function initFlow() {
  var um = usedMap(),
    cn = {};
  D.users = ppl().map(function (u) {
    return "r" + u.x;
  });
  nrsList().forEach(function (r) {
    cn[r[2]] = r[0];
  });
  Object.keys(cn).forEach(function (id) {
    var o = NM[id],
      nw = cn[id];
    if (o && o !== nw && FL[o] && !FL[nw]) {
      FL[nw] = FL[o];
      FL[nw].nr = nw;
      delete FL[o];
      if (cur === o) cur = nw;
    }
  });
  NM = cn;
  Object.keys(FL).forEach(function (k) {
    clean(FL[k]);
  });
  D.nrs = nrsList()
    .map(function (r) {
      return r[0];
    })
    .filter(function (n) {
      return !um[n];
    });
  if (D.nrs.indexOf(cur) < 0) cur = D.nrs.length === 1 ? D.nrs[0] : "";
  $("fNone").textContent = D.nrs.length
    ? ""
    : "Alle ingegeven nummers zijn het rechtstreeks nummer van een gebruiker: er is geen call-flow in te stellen.";
  $("pick").style.display = D.nrs.length ? "" : "none";
  flowVis();
  if (cur) {
    if (!FL[cur]) {
      FL[cur] = mk("nr");
      FL[cur].nr = cur;
    }
    root = FL[cur];
    SEL = null;
    render();
  } else {
    root = null;
    SEL = null;
    panel();
    fillPick();
  }
}
// "Opnieuw beginnen": wist het schema van het gekozen nummer (met bevestiging).
$("bNew").onclick = function () {
  var b = this,
    t = "Opnieuw beginnen voor dit nummer";
  if (root && root.kid && b.textContent === t) {
    b.textContent = "Zeker? Dit wist het schema van dit nummer";
    setTimeout(function () {
      b.textContent = t;
    }, 4000);
    return;
  }
  b.textContent = t;
  fresh();
  render();
};
// Leest het nummerplan uit de tabel; volledig lege rijen worden genegeerd.
function ppl() {
  var P = [];
  document.querySelectorAll("#ppl tr").forEach(function (r, x) {
    var q = function (c) {
        return r.querySelector(c);
      },
      app = [];
    if (q(".pc").checked) app.push("PC");
    if (q(".gm").checked) app.push("GSM");
    var u = {
      x: x + 1,
      i: q(".in").value.trim(),
      r: q(".rn").value.trim(),
      v: q(".vn").value.trim(),
      f: q(".fn").value.trim(),
      app: app.join(" + ") || "-",
      g: q(".gn").value.trim(),
      m: q(".ml").value.trim(),
    };
    if (u.i || u.r || u.v || u.f || u.m || u.g || app.length) P.push(u);
  });
  return P;
}
// Leest de nummerlijst uit stap 2: [nummer of reeks, omschrijving, rij-ID].
function nrsList() {
  var n = [];
  document.querySelectorAll("#nrs .row").forEach(function (r) {
    var v = r.querySelector(".nr").value.trim();
    if (v) n.push([v, r.querySelector(".nd").value.trim(), r.dataset.id]);
  });
  return n;
}
// Verzamelt alle ingevulde gegevens in één object voor het overzicht en de PDF.
function gather() {
  var o = {
    bedrijf: val("bedrijf"),
    adres: val("adres"),
    contact: val("contact"),
    nrs: nrsList(),
    ppl: ppl(),
  };
  var f = "Nee";
  if (val("fax") === "Ja") {
    f = "Ja – nr. " + val("faxNr") + ", " + val("faxHoe");
    if (val("faxHoe") === "Fax2mail") f += " (naar " + val("faxMail") + ")";
    if (val("faxHoe") === "Andere") f += " (" + val("faxAnd") + ")";
  }
  var p = "Nee";
  if (val("parlo") === "Ja") {
    p =
      val("parloPbx") === "Ja"
        ? "Ja – gekoppeld met PBX, " +
          (val("parloType") === "Andere" ? "andere: " + val("parloAnd") : val("parloType")) +
          ", model: " +
          val("parloModel")
        : "Ja – niet gekoppeld met PBX";
  }
  var a = "Nee";
  if (val("alarm") === "Ja") {
    a = "Ja – " + (val("alarmHoe") === "Andere" ? "andere: " + val("alarmAnd") : val("alarmHoe"));
    if (val("alarmHoe") === "Analoge lijn") a += " (nr. " + val("alarmNr") + ")";
  }
  o.ap = [
    ["Fax", f],
    ["Parlofoon", p],
    ["Alarm", a],
  ];
  var um = usedMap();
  o.flows = o.nrs.map(function (r) {
    return [
      r[0],
      um[r[0]]
        ? "Rechtstreeks nummer van " + um[r[0]]
        : FL[r[0]] && FL[r[0]].kid
          ? outline(FL[r[0]], 0, "")
          : "Niet ingesteld",
    ];
  });
  return o;
}
// True als minstens één van de velden leeg is.
function need(a) {
  return a.some(function (i) {
    return val(i) === "";
  });
}
// Valideert een stap; geeft een foutmelding of "" als alles in orde is.
function check(s) {
  if (s === 0 && need(["bedrijf", "adres", "contact"]))
    return "Vul bedrijfsnaam, adres en contactpersoon in.";
  if (s === 1) {
    var bd = "";
    document.querySelectorAll("#nrs .row").forEach(function (d) {
      var i = d.querySelector(".nr");
      if (d.classList.contains("rng")) {
        syncRng(d);
        var r2 = fmtNr(i.value),
          f = d.querySelector(".rf"),
          t = d.querySelector(".rt");
        if (i.value && !(f.value.trim() && t.value.trim() && r2.ok && r2.range)) {
          if (!bd) bd = "reeks " + (f.value.trim() || "?") + " - " + (t.value.trim() || "?");
          f.classList.add("bad");
          t.classList.add("bad");
        } else if (r2.ok && r2.range) {
          var q = r2.txt.split(" – ");
          f.value = q[0];
          t.value = q[1];
          syncRng(d);
        }
      } else {
        var r = fmtNr(i.value);
        if (!r.ok) {
          if (!bd) bd = i.value;
        } else i.value = r.txt;
      }
    });
    if (bd)
      return (
        "Geen geldig Belgisch telefoonnummer: " +
        bd +
        " (bijvoorbeeld 02 334 88 44, 015 45 18 25 of een reeks 02 334 88 40 – 49; een reeks telt maximaal 1000 nummers)."
      );
    if (!nrsList().length) return "Geef minstens één telefoonnummer in.";
  }
  if (s === 2) {
    if (need(["fax", "parlo", "alarm"])) return "Beantwoord alle vragen over de randapparatuur.";
    var bad = false,
      v = val;
    if (v("fax") === "Ja")
      bad =
        need(["faxNr", "faxHoe"]) ||
        (v("faxHoe") === "Fax2mail" && need(["faxMail"])) ||
        (v("faxHoe") === "Andere" && need(["faxAnd"]));
    if (v("parlo") === "Ja")
      bad =
        bad ||
        need(["parloPbx"]) ||
        (v("parloPbx") === "Ja" &&
          (need(["parloType", "parloModel"]) || (v("parloType") === "Andere" && need(["parloAnd"]))));
    if (v("alarm") === "Ja")
      bad =
        bad ||
        need(["alarmHoe"]) ||
        (v("alarmHoe") === "Analoge lijn" && need(["alarmNr"])) ||
        (v("alarmHoe") === "Andere" && need(["alarmAnd"]));
    if (bad) return "Vul alle verplichte velden bij de randapparatuur in.";
    var ck = [];
    if (v("fax") === "Ja") ck.push("faxNr");
    if (v("alarm") === "Ja" && v("alarmHoe") === "Analoge lijn") ck.push("alarmNr");
    for (var qq = 0; qq < ck.length; qq++) {
      var rr = fmtBE($(ck[qq]).value);
      if (!rr.ok || !rr.txt)
        return (
          "Geen geldig Belgisch telefoonnummer bij " +
          (ck[qq] === "faxNr" ? "de fax" : "het alarm") +
          " (bijvoorbeeld 02 334 88 44)."
        );
      $(ck[qq]).value = rr.txt;
    }
  }
  if (s === 3) {
    var P = ppl(),
      seen = {};
    if (!P.length) return "Voeg minstens één gebruiker toe.";
    for (var j = 0; j < P.length; j++) {
      var u = P[j],
        n = " (gebruiker " + u.x + ")";
      if (!u.i || !u.v || !u.f) return "Intern nummer, voornaam en familienaam zijn verplicht" + n + ".";
      if (!/^\S+@\S+\.\S+$/.test(u.m)) return "Een geldig e-mailadres is verplicht" + n + ".";
      if (u.app === "-") return "Duid minstens PC of GSM aan" + n + ".";
      if (u.app.indexOf("GSM") >= 0 && !u.g)
        return "GSM-nummer is verplicht bij een GSM-applicatie" + n + ".";
      if (u.g) {
        var rg = fmtBE(u.g);
        if (!rg.ok || rg.t !== "gsm")
          return "Geen geldig Belgisch GSM-nummer" + n + " (bijvoorbeeld 0470 12 34 56).";
        document.querySelectorAll("#ppl tr")[u.x - 1].querySelector(".gn").value = rg.txt;
      }
      if (seen[u.i]) return "Intern nummer " + u.i + " komt meer dan één keer voor.";
      seen[u.i] = 1;
    }
  }
  if (s === 4) {
    for (var k = 0; k < D.nrs.length; k++) {
      var nr = D.nrs[k],
        r = FL[nr],
        e = "";
      if (r && r.kid) {
        var is = issues(r, []);
        if (is.length) e = is[0];
      }
      if (e) {
        setCur(nr);
        return "Nummer " + nr + ": " + e + ".";
      }
    }
  }
  return "";
}
