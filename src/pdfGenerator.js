import { jsPDF } from "jspdf";
import { PROCEDURE_SANIFICAZIONE } from "./procedureSanificazione";

// ---------------------------------------------------------------------------
// Genera il PDF di un rapportino chiuso.
// Ritorna { doc, filename } — il chiamante decide se scaricarlo, ecc.
// ---------------------------------------------------------------------------

function riga(doc, y, label, valore) {
  if (!valore) return y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(label, 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(valore), 65, y);
  return y + 6;
}

function titolo(doc, y, testo) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(testo, 14, y);
  doc.setDrawColor(180, 150, 60);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 8;
}

const ETICHETTE_CONFORME = {
  conforme: "Conforme",
  nonConforme: "Non conforme",
  nApplic: "N.Applic.",
  si: "Sì",
  no: "No",
};

// Servizi accessori del Tiraggio — uguali a quelli di App.jsx
const RIGHE_SERVIZI_TIRAGGIO = [
  { key: "filtrazioneCartuccia", label: "Filtrazione cartuccia", testo: true },
  { key: "dosaggioLieviti", label: "Dosaggio lieviti", testo: true },
];

// Fasi di lavorazione dell'Imbottigliamento — uguali a quelle di App.jsx
const RIGHE_FASI_IMBOTTIGLIAMENTO = [
  { key: "risciacquoBottiglie", label: "Risciacquo bottiglie" },
  { key: "soffiaggioBottiglie", label: "Soffiaggio bottiglie aria-azoto" },
  { key: "filtrazioneCartoni", label: "Filtrazione cartoni", testo: true },
  { key: "filtrazioneCartuccia", label: "Filtrazione cartuccia", testo: true },
  { key: "dosaggioGommaArabica", label: "Dosaggio gomma arabica", testo: true },
  { key: "prevaquazione", label: "Prevaquazione" },
  { key: "vuotoImmissAzoto", label: "Vuoto con immis. azoto" },
];

// Righe delle tabelle "Conforme/Non conforme/N.Applic.", diverse per
// lavorazione — devono restare identiche a quelle di App.jsx.
const RIGHE_PRE_OPERATIVI = {
  Confezionamento: [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    { key: "puliziaBottiglia", label: "Pulizia bottiglia" },
    { key: "conformitaCapsule", label: "Conformità capsule" },
    { key: "conformitaEtichette", label: "Conformità etichette" },
  ],
  Sboccatura: [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    { key: "sanificazioneConforme", label: "Sanificazione" },
  ],
  Imbottigliamento: [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    { key: "sanificazioneConforme", label: "Sanificazione" },
    {
      key: "vaporizzazionePreAvvio",
      label: "Vaporizzazione pre-avvio (20' vapore fluente 100 C)",
      orari: true,
    },
    {
      key: "pressioneSciacquatrice",
      label: "Pressione esercizio sciacquatrice >= 1,5 bar (oPRP)",
    },
    {
      key: "deltaPressioneFiltri",
      label: "Delta pressione filtri sciacquatrice (max 1,2 bar)",
    },
    {
      key: "ugelliSciacquatrice",
      label: "Funzionamento ugelli sciacquatrice",
    },
  ],
  "Sboccatura + Confezionamento": [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    { key: "puliziaBottiglia", label: "Pulizia bottiglia" },
    { key: "conformitaCapsule", label: "Conformità capsule" },
    { key: "conformitaEtichette", label: "Conformità etichette" },
    { key: "sanificazioneConforme", label: "Sanificazione" },
  ],
};

// Travaso: pre-operativi e controlli di processo (uguali a App.jsx)
RIGHE_PRE_OPERATIVI.Travaso = [
  { key: "puliziaLinea", label: "Pulizia linea" },
  { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
  { key: "sanificazioneConforme", label: "Sanificazione" },
  { key: "vaporizzazionePreAvvio", label: "Vaporizzazione pre-avvio" },
];
// Tiraggio: stessi controlli pre-operativi dell'Imbottigliamento
RIGHE_PRE_OPERATIVI.Tiraggio = RIGHE_PRE_OPERATIVI.Imbottigliamento;
// Imbottigliamento + Confezionamento: righe di Imbottigliamento + Confezionamento
RIGHE_PRE_OPERATIVI["Imbottigliamento + Confezionamento"] = [
  ...RIGHE_PRE_OPERATIVI.Imbottigliamento,
  ...RIGHE_PRE_OPERATIVI.Confezionamento.slice(2),
];

const RIGHE_CONTROLLI_PROCESSO = {
  Confezionamento: [
    { key: "posizionamentoCapsule", label: "Posizionamento capsule" },
    { key: "posizionamentoEtichette", label: "Posizionamento etichette" },
    { key: "timbraturaLotto", label: "Timbratura lotto" },
    { key: "imballaggio", label: "Imballaggio" },
  ],
  Sboccatura: [
    { key: "avvinamentoLiqueur", label: "Avvinamento liqueur" },
    { key: "dosaggioLiqueur", label: "Dosaggio liqueur" },
    { key: "livelloRiempimento", label: "Livello di riempimento" },
    { key: "chiusuraTappi", label: "Chiusura tappi" },
    { key: "chiusuraGabbiette", label: "Chiusura gabbiette" },
    { key: "lavaggioBottiglie", label: "Lavaggio bottiglie" },
  ],
  Imbottigliamento: [
    { key: "avvinamentoPreAvvio", label: "Avvinamento pre-avvio" },
    { key: "chiusuraTappi", label: "Chiusura tappi" },
    { key: "livelloRiempimento", label: "Livello di riempimento" },
    { key: "integritaCarter", label: "Integrita' carter" },
    {
      key: "pressioneSciacquatrice",
      label: "Pressione esercizio sciacquatrice >= 1,5 bar (oPRP)",
    },
    {
      key: "deltaPressioneFiltri",
      label: "Delta pressione filtri sciacquatrice (max 1,2 bar)",
    },
    {
      key: "ugelliSciacquatrice",
      label: "Funzionamento ugelli sciacquatrice",
    },
  ],
  "Sboccatura + Confezionamento": [
    { key: "avvinamentoLiqueur", label: "Avvinamento liqueur" },
    { key: "dosaggioLiqueur", label: "Dosaggio liqueur" },
    { key: "livelloRiempimento", label: "Livello di riempimento" },
    { key: "chiusuraTappi", label: "Chiusura tappi" },
    { key: "chiusuraGabbiette", label: "Chiusura gabbiette" },
    { key: "lavaggioBottiglie", label: "Lavaggio bottiglie" },
    { key: "posizionamentoCapsule", label: "Posizionamento capsule" },
    { key: "posizionamentoEtichette", label: "Posizionamento etichette" },
    { key: "timbraturaLotto", label: "Timbratura lotto" },
    { key: "imballaggio", label: "Imballaggio" },
  ],
};

// Tiraggio: stesse righe dell'Imbottigliamento, con "Timbratura lotto su tappi"
// al posto di "Integrita' carter"
RIGHE_CONTROLLI_PROCESSO.Travaso = [
  { key: "temperaturaProdotto", label: "Temperatura prodotto" },
  { key: "valorePressione", label: "Valore pressione" },
  { key: "livelloRiempimento", label: "Livello di riempimento" },
  { key: "chiusuraTappi", label: "Chiusura tappi" },
  { key: "chiusuraGabbiette", label: "Chiusura gabbiette" },
];
const RIGHE_SERVIZI_TRAVASO = [
  { key: "filtrazioneLiqueur", label: "Filtrazione liqueur" },
  { key: "svuotamentoBottiglie", label: "Svuotamento bottiglie" },
  { key: "dosaggioManualeLiqueur", label: "Dosaggio manuale liqueur" },
  { key: "livelloRiempimentoServizio", label: "Livello riempimento" },
  { key: "pressioneRiempitrice", label: "Pressione riempitrice" },
];
const MATERIALI_TRAVASO_FISSI = ["Filtri Becopad 450", "Tappi a fungo", "Gabbiette"];
RIGHE_CONTROLLI_PROCESSO["Imbottigliamento + Confezionamento"] = [
  ...RIGHE_CONTROLLI_PROCESSO.Imbottigliamento,
  ...RIGHE_CONTROLLI_PROCESSO.Confezionamento,
];
RIGHE_CONTROLLI_PROCESSO.Tiraggio = [
  { key: "avvinamentoPreAvvio", label: "Avvinamento pre-avvio" },
  { key: "chiusuraTappi", label: "Chiusura tappi" },
  { key: "livelloRiempimento", label: "Livello di riempimento" },
  { key: "timbraturaLotto", label: "Timbratura lotto su tappi" },
  ...RIGHE_CONTROLLI_PROCESSO.Imbottigliamento.slice(4),
];

// Stampa in forma compatta l'esito di una tabella "Conforme/Non conforme/
// N.Applic." (solo le righe compilate, come per la tabella controlli).
function stampaControlliConforme(doc, y, titoloBlocco, righeLabel, valori) {
  const orariDi = (r) =>
    r.orari
      ? [
          valori[`${r.key}Inizio`] && `inizio ${valori[`${r.key}Inizio`]}`,
          valori[`${r.key}Fine`] && `fine ${valori[`${r.key}Fine`]}`,
        ]
          .filter(Boolean)
          .join(" ")
      : "";
  const testoDi = (r) => (r.testo ? valori[`${r.key}Testo`] || "" : "");
  const compilate = righeLabel.filter((r) => valori[r.key] || orariDi(r) || testoDi(r));
  if (!compilate.length) return y;
  y = checkNuovaPagina(doc, y + 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(titoloBlocco, 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  compilate.forEach((r) => {
    y = checkNuovaPagina(doc, y);
    const esito = ETICHETTE_CONFORME[valori[r.key]] || "—";
    const orari = orariDi(r);
    const testo = testoDi(r);
    doc.text(
      `${r.label}: ${esito}${orari ? ` (${orari})` : ""}${testo ? ` — ${testo}` : ""}`,
      14,
      y
    );
    y += 4.5;
  });
  return y + 2;
}

function checkNuovaPagina(doc, y, margine = 270) {
  if (y > margine) {
    doc.addPage();
    return 20;
  }
  return y;
}

// Aggiunge, come pagina a sé, la scheda di sanificazione della lavorazione
// indicata (se esiste). Non fa nulla se non c'è ancora una scheda per
// quella lavorazione (le altre arriveranno più avanti).
function aggiungiSchedaSanificazione(doc, lavorazioneId) {
  const scheda = PROCEDURE_SANIFICAZIONE[lavorazioneId];
  if (!scheda) return;

  doc.addPage();
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(scheda.titolo, 14, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(scheda.revisione, 196, y, { align: "right" });
  y += 7;

  doc.setDrawColor(180, 150, 60);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(scheda.linea, 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  if (scheda.reparti?.length) {
    doc.text("Reparto: " + scheda.reparti.join("  /  "), 14, y);
    y += 6;
  }
  if (scheda.responsabile) {
    doc.text("Responsabile: " + scheda.responsabile, 14, y);
    y += 6;
  }
  if (scheda.frequenza) {
    doc.text("Frequenza: " + scheda.frequenza, 14, y);
    y += 6;
  }
  y += 3;

  if (scheda.tabella?.righe?.length) {
    const colX = [14, 90, 150];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    scheda.tabella.intestazioni.forEach((h, i) => doc.text(h, colX[i], y));
    y += 5;
    doc.setFont("helvetica", "normal");
    scheda.tabella.righe.forEach((riga) => {
      riga.forEach((cella, i) => doc.text(String(cella), colX[i], y));
      y += 5.5;
    });
    y += 4;
  }

  if (scheda.procedura?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Procedura", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    scheda.procedura.forEach((passo, i) => {
      const testo = doc.splitTextToSize(`${i + 1}. ${passo}`, 182);
      doc.text(testo, 14, y);
      y += 5 * testo.length;
    });
    y += 2;
  }

  if (scheda.notaFinale) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    const testo = doc.splitTextToSize(scheda.notaFinale, 182);
    doc.text(testo, 14, y);
    y += 4.5 * testo.length + 4;
  }

  if (scheda.errori?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Errori più comuni da evitare", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    scheda.errori.forEach((errore) => {
      const testo = doc.splitTextToSize(`• ${errore}`, 182);
      doc.text(testo, 14, y);
      y += 5 * testo.length;
    });
  }
}

export function generaRapportinoPDF({
  lavorazioneId,
  lavorazioneLabel,
  cliente,
  data,
  sanificazione,
  fasiImbottigliamento,
  serviziAccessori,
  controlliPreOperativi,
  oraInizio,
  oraFine,
  oreViaggioAndata,
  oreViaggioRitorno,
  altriOperatori,
  prodotti, // array, oppure null se "Altri lavori"
  vinoSemplice,
  noteSemplice,
  noteFinali,
  foto,
  oreOperatori,
  firmaOperatore,
  nomeOperatore,
  firmaCliente,
  nomeCliente,
  emailAggiuntiva,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 20;
  // "Sboccatura Hub" / "Confezionamento Hub" hanno la stessa struttura delle
  // lavorazioni di base: per le tabelle si confronta il nome senza " Hub".
  const labelBase = String(lavorazioneLabel || "").replace(/ Hub$/, "");
  // "Sboccatura + Confezionamento Hub": struttura di Sboccatura con in più i
  // controlli di Confezionamento (incartonamento, 6 spunte di linea, ecc.)
  const isCombo = labelBase === "Sboccatura + Confezionamento";
  // "Imbottigliamento + Confezionamento": struttura di Imbottigliamento con in
  // più i controlli di Confezionamento. `baseImb` = parti dell'Imbottigliamento.
  const isComboImb = labelBase === "Imbottigliamento + Confezionamento";
  const baseImb = labelBase === "Imbottigliamento" || isComboImb;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RAPPORTINI OS", 14, y);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("registro interventi di cantina", 14, y + 5);
  doc.setTextColor(20, 20, 20);
  y += 16;

  y = titolo(doc, y, lavorazioneLabel || "Intervento");
  y = riga(doc, y, "Cliente", cliente);
  y = riga(doc, y, "Data", data);
  if (lavorazioneLabel !== "Altri lavori") {
    y = riga(doc, y, "Sanificazione", sanificazione ? "Sì" : "No");
  }
  if (serviziAccessori) {
    const servizi = [
      serviziAccessori.filtrazioneLiqueur &&
        [
          "Filtrazione liqueur",
          serviziAccessori.filtrazioneTipo &&
            `tipo ${serviziAccessori.filtrazioneTipo}`,
          serviziAccessori.filtrazioneLotto &&
            `lotto ${serviziAccessori.filtrazioneLotto}`,
        ]
          .filter(Boolean)
          .join(" — "),
      serviziAccessori.jetting && "Jetting",
      serviziAccessori.fornituraMateriali &&
        [
          "Fornitura materiali",
          serviziAccessori.fornituraMaterialiNote,
        ]
          .filter(Boolean)
          .join(" — "),
    ].filter(Boolean);
    if (servizi.length) {
      y = riga(doc, y, "Servizi accessori", servizi.join(", "));
    }
  }
  y += 2;

  if (RIGHE_PRE_OPERATIVI[labelBase] && controlliPreOperativi) {
    y = stampaControlliConforme(
      doc,
      y,
      "Controlli pre-operativi impianto/attrezzatura",
      RIGHE_PRE_OPERATIVI[labelBase],
      controlliPreOperativi
    );
  }

  if (prodotti && prodotti.length) {
    prodotti.forEach((p, idx) => {
      y = checkNuovaPagina(doc, y);
      y = titolo(doc, y + 4, `Vino ${idx + 1}`);
      y = riga(doc, y, "Nome vino", p.vino);
      y = riga(doc, y, "BIO", p.bio ? "Sì" : "");
      y = riga(doc, y, "Lotto vino", p.lottoVino);
      const isTrav = labelBase === "Travaso";
      if (isTrav) {
        y = riga(doc, y, "Quantità", p.quantita);
        y = riga(doc, y, "Formato bottiglia", p.bottFormato);
        y = riga(doc, y, "Capacità", p.capacita);
        y = riga(doc, y, "Bottiglie perse", p.bottigliePerse);
        if (p.serviziImbott) {
          y = stampaControlliConforme(
            doc,
            y,
            "Servizi accessori",
            RIGHE_SERVIZI_TRAVASO,
            p.serviziImbott
          );
        }
        (p.materialiTravaso || []).forEach((m, mi) => {
          const nome = mi < MATERIALI_TRAVASO_FISSI.length ? MATERIALI_TRAVASO_FISSI[mi] : m.nome;
          if (nome && (m.lotto || m.quantita)) {
            y = riga(
              doc,
              y,
              nome,
              [m.lotto && `lotto ${m.lotto}`, m.quantita && `quantità ${m.quantita}`]
                .filter(Boolean)
                .join(" — ")
            );
          }
        });
        y = riga(doc, y, "Lotto bottiglie", p.lottoBottiglie);
      }
      if ((baseImb || labelBase === "Tiraggio") && p.serviziImbott) {
        y = stampaControlliConforme(
          doc,
          y,
          "Servizi accessori",
          labelBase === "Tiraggio" ? RIGHE_SERVIZI_TIRAGGIO : RIGHE_FASI_IMBOTTIGLIAMENTO,
          p.serviziImbott
        );
      }
      if (!isTrav) {
        y = riga(
          doc,
          y,
          labelBase === "Confezionamento" ? "Capsula" : "Tappo",
          [p.tappoTipo, p.tappoMarca, p.tappoLotto].filter(Boolean).join(" — ")
        );
      }
      if (labelBase !== "Confezionamento" && !isTrav) {
        y = riga(
          doc,
          y,
          labelBase === "Tiraggio"
            ? "Bidule"
            : baseImb
            ? "Vetri"
            : "Gabbietta",
          [p.gabbiettaTipo, p.gabbiettaMarca, p.gabbiettaLotto]
            .filter(Boolean)
            .join(" — ")
        );
      }
      if (labelBase !== "Tiraggio" && labelBase !== "Confezionamento" && !isTrav) {
      y = riga(
        doc,
        y,
        baseImb ? "Dosaggio gomma arabica" : "Liqueur",
        baseImb
          ? [
              p.liqueurDosaggio,
              p.liqueurFiltrazione && `filtrazione ${p.liqueurFiltrazione}`,
            ]
              .filter(Boolean)
              .join(" — ")
          : [
              p.liqueurDosaggio && `dosaggio ${p.liqueurDosaggio}`,
              p.liqueurFiltrazione && `filtrazione ${p.liqueurFiltrazione}`,
            ]
              .filter(Boolean)
              .join(" — ")
      );
      if (!baseImb) y = riga(doc, y, "Sedimento", p.sedimento);
      }
      if (!baseImb && !isTrav) {
        y = riga(
          doc,
          y,
          "Bottiglie",
          [p.bottFormato, p.bottLotto].filter(Boolean).join(" — ")
        );
      }
      if (labelBase === "Confezionamento" || isCombo || isComboImb) {
        y = riga(
          doc,
          y,
          "Incartonamento",
          [p.incartonamento ? "Sì" : "No", p.incartonamentoTipo]
            .filter(Boolean)
            .join(" — ")
        );
      }
      y = riga(doc, y, "Note", p.note);

      if (RIGHE_CONTROLLI_PROCESSO[labelBase] && p.controlliProcesso) {
        y = stampaControlliConforme(
          doc,
          y,
          "Controlli di processo",
          RIGHE_CONTROLLI_PROCESSO[labelBase],
          p.controlliProcesso
        );
      }

      const isConfezionamento = labelBase === "Confezionamento";
      // Tiraggio, Imbottigliamento e Travaso usano la tabella senza le
      // colonne "bidule"/"chiusura" (solo Sboccatura le mantiene, come era).
      const isSemplice = labelBase === "Sboccatura" || isCombo || isTrav;
      if (isTrav) {
        const aero = [
          p.aerometroInizio && "inizio lavoro",
          p.aerometroMeta && "metà lavoro",
          p.aerometroFine && "fine lavoro",
        ]
          .filter(Boolean)
          .join(", ");
        y = riga(doc, y, "Sovrapr. partenza (bar)", p.sovrapressionePartenza);
        y = riga(doc, y, "Aerometro (+/- 1 bar)", aero);
        y = riga(doc, y, "Sovrapr. finale (bar)", p.sovrapressioneFinale);
      }
      const isImbott = baseImb;
      const isTir = labelBase === "Tiraggio";

      const righeCompilate = (p.controlli || []).filter((r) =>
        isTir
          ? r.bottiglieProdotte ||
            r.conformi ||
            r.nonConformi ||
            r.bidule ||
            r.livello
          : isImbott
          ? r.bottiglieProdotte ||
            r.filtrazioneBar ||
            r.verificaDosaggio ||
            r.tappoRaso ||
            r.integritaTappo ||
            r.presenzaVuoto ||
            (isComboImb &&
              (r.capsula || r.fronte || r.retro || r.collare || r.fascetta || r.lotto)) ||
            r.livello
          : isConfezionamento
          ? r.bottiglieProdotte ||
            r.capsula ||
            r.fronte ||
            r.retro ||
            r.collare ||
            r.fascetta ||
            r.lotto
          : r.bottiglieProdotte ||
            (isCombo &&
              (r.capsula || r.fronte || r.retro || r.collare || r.fascetta || r.lotto)) ||
            r.livello ||
            r.dosaggio ||
            r.inserimentoTappo ||
            r.integritaTappo ||
            r.posizionamentoGabbietta ||
            r.bidule ||
            r.chiusura
      );

      if (righeCompilate.length) {
        y = checkNuovaPagina(doc, y + 2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text("Tabella controlli (righe compilate)", 14, y);
        y += 5;

        const headers = isTir
          ? ["Ora", "Bott.prod.", "Conformi", "Non conf.", "Pres.bidule", "Valore (mm)"]
          : isImbott
          ? ["Ora", "Bott.prod.", "Filtr.bar", "Verif.dos.", "Tappo raso", "Integr.", "Vuoto", "Liv.riemp.",
              ...(isComboImb ? ["Caps.", "Fronte", "Retro", "Coll.", "Fasc.", "Lotto"] : [])]
          : isConfezionamento
          ? ["Ora", "Bott.prod.", "Caps.", "Fronte", "Retro", "Collare", "Fasc.", "Lotto"]
          : isCombo
          ? ["Ora", "Bott.", "Dos.liq", "Ins.t.", "Integ.", "Gabb.", "Liv.", "Caps.", "Fronte", "Retro", "Coll.", "Fasc.", "Lotto"]
          : isSemplice
          ? [
              "Ora",
              "Bott.prod.",
              "Dos.liq.",
              "Ins.tappo",
              "Integr.",
              "Pos.gabb.",
              "Liv.riemp.",
            ]
          : [
              "Ora",
              "Bott.prod.",
              "Liv.",
              "Dos.",
              "Ins.tappo",
              "Integr.",
              isImbott ? "Vetri" : "Gabb.",
              "Bidule",
              "Chius.",
            ];
        const colX = isTir
          ? [14, 30, 56, 82, 106, 140]
          : isImbott
          ? isComboImb
            ? [14, 24, 36, 48, 62, 77, 88, 98, 112, 128, 142, 156, 170, 184]
            : [14, 30, 52, 72, 94, 118, 138, 156]
          : isConfezionamento
          ? [14, 30, 52, 76, 100, 124, 152, 176]
          : isCombo
          ? [14, 26, 38, 52, 65, 78, 91, 104, 118, 134, 148, 162, 176]
          : isSemplice
          ? [14, 30, 52, 80, 104, 132, 156]
          : [14, 30, 46, 60, 74, 96, 114, 132, 150];
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        headers.forEach((h, i) => doc.text(h, colX[i], y));
        y += 4;
        doc.setFont("helvetica", "normal");

        righeCompilate.forEach((r) => {
          y = checkNuovaPagina(doc, y);
          // Il font standard di jsPDF non ha il glifo "✓": con "X" il segno di
          // spunta si vede sempre, su qualsiasi lettore PDF.
          const vals = isTir
            ? [
                r.ora,
                r.bottiglieProdotte || "",
                r.conformi ? "X" : "",
                r.nonConformi ? "X" : "",
                r.bidule ? "X" : "",
                r.livello || "",
              ]
            : isImbott
            ? [
                r.ora,
                r.bottiglieProdotte || "",
                r.filtrazioneBar || "",
                r.verificaDosaggio ? "X" : "",
                r.tappoRaso ? "X" : "",
                r.integritaTappo ? "X" : "",
                r.presenzaVuoto ? "X" : "",
                r.livello || "",
                ...(isComboImb
                  ? [
                      r.capsula ? "X" : "",
                      r.fronte ? "X" : "",
                      r.retro ? "X" : "",
                      r.collare ? "X" : "",
                      r.fascetta ? "X" : "",
                      r.lotto ? "X" : "",
                    ]
                  : []),
              ]
            : isConfezionamento
            ? [
                r.ora,
                r.bottiglieProdotte || "",
                r.capsula ? "X" : "",
                r.fronte ? "X" : "",
                r.retro ? "X" : "",
                r.collare ? "X" : "",
                r.fascetta ? "X" : "",
                r.lotto ? "X" : "",
              ]
            : isCombo
            ? [
                r.ora,
                r.bottiglieProdotte || "",
                r.dosaggio || "",
                r.inserimentoTappo || "",
                r.integritaTappo ? "X" : "",
                r.posizionamentoGabbietta ? "X" : "",
                r.livello || "",
                r.capsula ? "X" : "",
                r.fronte ? "X" : "",
                r.retro ? "X" : "",
                r.collare ? "X" : "",
                r.fascetta ? "X" : "",
                r.lotto ? "X" : "",
              ]
            : isSemplice
            ? [
                r.ora,
                r.bottiglieProdotte || "",
                r.dosaggio || "",
                r.inserimentoTappo || "",
                r.integritaTappo ? "X" : "",
                r.posizionamentoGabbietta ? "X" : "",
                r.livello || "",
              ]
            : [
                r.ora,
                r.bottiglieProdotte || "",
                r.livello || "",
                r.dosaggio || "",
                r.inserimentoTappo || "",
                r.integritaTappo ? "X" : "",
                r.posizionamentoGabbietta ? "X" : "",
                r.bidule ? "X" : "",
                r.chiusura ? "X" : "",
              ];
          vals.forEach((v, i) => doc.text(String(v), colX[i], y));
          y += 4.5;
        });
        y += 4;
      }

      // Solo Sboccatura: bottiglie per colmatura e bottiglie rotte, per vino
      if (isSemplice && (p.bottigliePerColmatura || p.bottiglieRotte)) {
        y = checkNuovaPagina(doc, y + 2);
        y = riga(doc, y, "Bott. per colmatura", p.bottigliePerColmatura || "—");
        y = riga(doc, y, "Bottiglie rotte", p.bottiglieRotte || "—");
        y += 2;
      }

      // Registro rotture vetri (oPRP, PT 8.5.3) — per ogni vino
      const righeVetri = (p.registroVetri || []).filter((r) => r.rotte || r.segregate);
      if (righeVetri.length || p.registroVetriNote || p.okAssentiVetro) {
        y = checkNuovaPagina(doc, y + 2, 245);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text("Registro rotture vetri (oPRP) — PT 8.5.3", 14, y);
        y += 5;
        if (righeVetri.length) {
          doc.setFontSize(8);
          doc.text("Nr. bottiglie rotte", 14, y);
          doc.text("Nr. bottiglie segregate", 70, y);
          y += 4;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          righeVetri.forEach((r) => {
            y = checkNuovaPagina(doc, y);
            doc.text(String(r.rotte || "—"), 14, y);
            doc.text(String(r.segregate || "—"), 70, y);
            y += 4.5;
          });
        }
        if (p.registroVetriNote) {
          y = riga(doc, y + 1, "Note", p.registroVetriNote);
        }
        if (p.okAssentiVetro) {
          y = riga(doc, y + 1, "Frammenti di vetro", "OK, assenti");
        }
        y += 3;
      }
    });
  } else {
    y = riga(doc, y, "Vino", vinoSemplice);
    y = riga(doc, y, "Note", noteSemplice);
  }

  // Quantità bottiglie fatte (colonne: Bottiglia, Magnum, Altro)
  if (prodotti && prodotti.length) {
    y = checkNuovaPagina(doc, y + 4, 240);
    y = titolo(doc, y + 2, "Quantità bottiglie fatte");
    const colX = [140, 166, 194]; // allineamento a destra
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Vino", 14, y);
    doc.text("Bottiglia", colX[0], y, { align: "right" });
    doc.text("Magnum", colX[1], y, { align: "right" });
    doc.text("Altro", colX[2], y, { align: "right" });
    y += 5;
    doc.setFontSize(9.5);
    prodotti.forEach((p, idx) => {
      y = checkNuovaPagina(doc, y);
      doc.setFont("helvetica", "normal");
      const etichetta = `Vino ${idx + 1}${p.vino ? " — " + p.vino : ""}`;
      doc.text(doc.splitTextToSize(etichetta, 95)[0], 14, y);
      doc.setFont("helvetica", "bold");
      doc.text(String(p.bottiglieFatte || "—"), colX[0], y, { align: "right" });
      doc.text(String(p.qtaMagnum || "—"), colX[1], y, { align: "right" });
      doc.text(String(p.qtaAltro || "—"), colX[2], y, { align: "right" });
      y += 6;
    });
    y += 2;
  }

  // Note libere e foto (solo lavorazioni complete)
  if (noteFinali && String(noteFinali).trim()) {
    y = checkNuovaPagina(doc, y + 4, 240);
    y = titolo(doc, y + 2, "Note");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.splitTextToSize(String(noteFinali).trim(), 182).forEach((r) => {
      y = checkNuovaPagina(doc, y);
      doc.text(r, 14, y);
      y += 5;
    });
    y += 2;
  }
  if (Array.isArray(foto) && foto.length) {
    const maxL = 56; // lato lungo massimo di ogni foto (mm)
    let x = 14;
    let altRiga = 0;
    y = checkNuovaPagina(doc, y + 2, 215);
    foto.forEach((f) => {
      const ratio = f.w && f.h ? f.w / f.h : 4 / 3;
      const w = ratio >= 1 ? maxL : maxL * ratio;
      const h = ratio >= 1 ? maxL / ratio : maxL;
      if (x + w > 196) {
        x = 14;
        y += altRiga + 4;
        altRiga = 0;
      }
      if (y + h > 275) {
        doc.addPage();
        y = 20;
        x = 14;
        altRiga = 0;
      }
      doc.addImage(f.dataUrl, "JPEG", x, y, w, h);
      x += w + 4;
      altRiga = Math.max(altRiga, h);
    });
    y += altRiga + 4;
  }

  if (oraInizio || oraFine) {
    y = checkNuovaPagina(doc, y + 2);
    y = riga(
      doc,
      y,
      "Orario",
      [oraInizio && `inizio ${oraInizio}`, oraFine && `fine ${oraFine}`]
        .filter(Boolean)
        .join(" — ")
    );
    y += 2;
  }

  if (oreViaggioAndata || oreViaggioRitorno) {
    y = checkNuovaPagina(doc, y + 2);
    y = riga(
      doc,
      y,
      "Ore viaggio",
      [
        oreViaggioAndata && `andata ${oreViaggioAndata}`,
        oreViaggioRitorno && `ritorno ${oreViaggioRitorno}`,
      ]
        .filter(Boolean)
        .join(" — ")
    );
    y += 2;
  }

  if (altriOperatori) {
    y = checkNuovaPagina(doc, y + 2);
    y = riga(doc, y, "Altro operatore", altriOperatori);
    y += 2;
  }

  // Ore per operatore (solo rapportini Hub)
  if (Array.isArray(oreOperatori) && oreOperatori.length) {
    y = checkNuovaPagina(doc, y + 4, 240);
    y = titolo(doc, y + 2, "Ore operatori");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Operatore", 14, y);
    doc.text("Totale ore", 194, y, { align: "right" });
    y += 5;
    doc.setFontSize(9.5);
    let totale = 0;
    oreOperatori.forEach((o) => {
      y = checkNuovaPagina(doc, y);
      totale += parseFloat(o.ore) || 0;
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(o.nome || "—", 140)[0], 14, y);
      doc.setFont("helvetica", "bold");
      doc.text(String(o.ore || "—").replace(".", ","), 194, y, { align: "right" });
      y += 6;
    });
    doc.setFont("helvetica", "bold");
    doc.text("Totale ore squadra", 14, y);
    doc.text(String(totale).replace(".", ","), 194, y, { align: "right" });
    y += 8;
  }

  // Firme
  y = checkNuovaPagina(doc, y + 6, 230);
  y = titolo(doc, y, "Firme");

  const sigY = y + 2;
  if (firmaOperatore) {
    try {
      doc.addImage(firmaOperatore, "PNG", 14, sigY, 70, 25);
    } catch (e) {
      /* ignora se l'immagine non è valida */
    }
  }
  if (firmaCliente) {
    try {
      doc.addImage(firmaCliente, "PNG", 110, sigY, 70, 25);
    } catch (e) {
      /* ignora se l'immagine non è valida */
    }
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Operatore: ${nomeOperatore || "—"}`, 14, sigY + 30);
  doc.text(`Cliente: ${nomeCliente || "—"}`, 110, sigY + 30);

  if (emailAggiuntiva) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Email aggiuntiva: ${emailAggiuntiva}`, 14, sigY + 38);
  }

  if (sanificazione && lavorazioneId) {
    aggiungiSchedaSanificazione(doc, lavorazioneId);
  }

  const filename = `${(cliente || "cliente")
    .toLowerCase()
    .replace(/\s+/g, "-")}_${(lavorazioneLabel || "intervento")
    .toLowerCase()
    .replace(/\s+/g, "-")}_${(data || "").replace(/\//g, "-")}.pdf`;

  return { doc, filename };
}

// Apre l'app Mail con destinatario/oggetto già pronti.
// Il PDF va allegato manualmente da chi invia (limite dei link mailto).
// Il destinatario è il cliente (email dall'elenco clienti o digitata a mano).
export function apriEmailConDestinatari({ filename, cliente, lavorazioneLabel, emailAggiuntiva }) {
  if (!emailAggiuntiva) return; // nessuna email cliente nota: non apriamo nulla

  const destinatari = [emailAggiuntiva];

  const oggetto = encodeURIComponent(
    `Rapportino ${lavorazioneLabel || ""} — ${cliente || ""}`.trim()
  );
  const corpo = encodeURIComponent(
    `In allegato il rapportino "${filename}".\n\nRicordati di allegare il PDF appena scaricato prima di inviare questa email.`
  );
  const mailto = `mailto:${destinatari.join(",")}?subject=${oggetto}&body=${corpo}`;
  window.location.href = mailto;
}
