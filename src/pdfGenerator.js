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
};

// Stampa in forma compatta l'esito di una tabella "Conforme/Non conforme/
// N.Applic." (solo le righe compilate, come per la tabella controlli).
function stampaControlliConforme(doc, y, titoloBlocco, righeLabel, valori) {
  const compilate = righeLabel.filter((r) => valori[r.key]);
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
    doc.text(`${r.label}: ${ETICHETTE_CONFORME[valori[r.key]]}`, 14, y);
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
  oraInizio,
  oraFine,
  oreViaggioAndata,
  oreViaggioRitorno,
  altriOperatori,
  prodotti, // array, oppure null se "Altri lavori"
  vinoSemplice,
  noteSemplice,
  firmaOperatore,
  nomeOperatore,
  firmaCliente,
  nomeCliente,
  emailAggiuntiva,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 20;

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
  y += 2;

  if (lavorazioneLabel === "Confezionamento" && controlliPreOperativi) {
    y = stampaControlliConforme(
      doc,
      y,
      "Controlli pre-operativi impianto/attrezzatura",
      [
        { key: "verificaPulizia", label: "Verifica pulizia" },
        {
          key: "assenzaPartiDanneggiate",
          label: "Assenza parti danneggiate",
        },
        { key: "puliziaBottiglia", label: "Pulizia bottiglia" },
        { key: "conformitaCapsule", label: "Conformità capsule" },
        { key: "conformitaEtichette", label: "Conformità etichette" },
      ],
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
      y = riga(
        doc,
        y,
        lavorazioneLabel === "Confezionamento" ? "Capsula" : "Tappo",
        [p.tappoTipo, p.tappoMarca, p.tappoLotto].filter(Boolean).join(" — ")
      );
      if (lavorazioneLabel !== "Confezionamento") {
        y = riga(
          doc,
          y,
          lavorazioneLabel === "Tiraggio" ? "Bidule" : "Gabbietta",
          [p.gabbiettaTipo, p.gabbiettaMarca, p.gabbiettaLotto]
            .filter(Boolean)
            .join(" — ")
        );
      }
      if (lavorazioneLabel !== "Tiraggio" && lavorazioneLabel !== "Confezionamento") {
      y = riga(
        doc,
        y,
        "Liqueur",
        [
          p.liqueurDosaggio && `dosaggio ${p.liqueurDosaggio}`,
          p.liqueurFiltrazione && `filtrazione ${p.liqueurFiltrazione}`,
        ]
          .filter(Boolean)
          .join(" — ")
      );
      y = riga(doc, y, "Sedimento", p.sedimento);
      }
      y = riga(
        doc,
        y,
        "Bottiglie",
        [p.bottFormato, p.bottLotto].filter(Boolean).join(" — ")
      );
      if (lavorazioneLabel === "Confezionamento") {
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

      const isConfezionamento = lavorazioneLabel === "Confezionamento";

      const righeCompilate = (p.controlli || []).filter((r) =>
        isConfezionamento
          ? r.bottiglieProdotte ||
            r.capsula ||
            r.fronte ||
            r.retro ||
            r.collare ||
            r.fascetta ||
            r.lotto
          : r.bottiglieProdotte ||
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

        const headers = isConfezionamento
          ? ["Ora", "Bott.prod.", "Caps.", "Fronte", "Retro", "Collare", "Fasc.", "Lotto"]
          : [
              "Ora",
              "Bott.prod.",
              "Liv.",
              "Dos.",
              "Ins.tappo",
              "Integr.",
              lavorazioneLabel === "Tiraggio" ? "Pos.bid." : "Gabb.",
              "Bidule",
              "Chius.",
            ];
        const colX = isConfezionamento
          ? [14, 30, 52, 76, 100, 124, 152, 176]
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
          const vals = isConfezionamento
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
