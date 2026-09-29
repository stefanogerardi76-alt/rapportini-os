import { jsPDF } from "jspdf";

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

function checkNuovaPagina(doc, y, margine = 270) {
  if (y > margine) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generaRapportinoPDF({
  lavorazioneLabel,
  cliente,
  data,
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
  y += 2;

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
          ? r.capsula || r.fronte || r.retro || r.collare || r.fascetta || r.lotto
          : r.livello ||
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
          ? ["Ora", "Caps.", "Fronte", "Retro", "Collare", "Fasc.", "Lotto"]
          : [
              "Ora",
              "Liv.",
              "Dos.",
              "Ins.tappo",
              "Integr.",
              lavorazioneLabel === "Tiraggio" ? "Pos.bid." : "Gabb.",
              "Bidule",
              "Chius.",
            ];
        const colX = isConfezionamento
          ? [14, 32, 56, 82, 108, 138, 164]
          : [14, 32, 46, 60, 82, 100, 118, 138];
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        headers.forEach((h, i) => doc.text(h, colX[i], y));
        y += 4;
        doc.setFont("helvetica", "normal");

        righeCompilate.forEach((r) => {
          y = checkNuovaPagina(doc, y);
          const vals = isConfezionamento
            ? [
                r.ora,
                r.capsula ? "✓" : "",
                r.fronte ? "✓" : "",
                r.retro ? "✓" : "",
                r.collare ? "✓" : "",
                r.fascetta ? "✓" : "",
                r.lotto ? "✓" : "",
              ]
            : [
                r.ora,
                r.livello || "",
                r.dosaggio || "",
                r.inserimentoTappo || "",
                r.integritaTappo ? "✓" : "",
                r.posizionamentoGabbietta ? "✓" : "",
                r.bidule ? "✓" : "",
                r.chiusura ? "✓" : "",
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

  const filename = `rapportino_${(lavorazioneLabel || "intervento")
    .toLowerCase()
    .replace(/\s+/g, "-")}_${(cliente || "cliente")
    .toLowerCase()
    .replace(/\s+/g, "-")}_${(data || "").replace(/\//g, "-")}.pdf`;

  return { doc, filename };
}

// Apre l'app Mail con destinatario/oggetto già pronti.
// Il PDF va allegato manualmente da chi invia (limite dei link mailto).
export function apriEmailConDestinatari({ filename, cliente, lavorazioneLabel, emailAggiuntiva }) {
  const destinatari = ["soluzioni@oenoitalia.com"];
  if (emailAggiuntiva) destinatari.push(emailAggiuntiva);

  const oggetto = encodeURIComponent(
    `Rapportino ${lavorazioneLabel || ""} — ${cliente || ""}`.trim()
  );
  const corpo = encodeURIComponent(
    `In allegato il rapportino "${filename}".\n\nRicordati di allegare il PDF appena scaricato prima di inviare questa email.`
  );
  const mailto = `mailto:${destinatari.join(",")}?subject=${oggetto}&body=${corpo}`;
  window.location.href = mailto;
}
