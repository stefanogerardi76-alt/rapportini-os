// ---------------------------------------------------------------------------
// Schede di sanificazione — una voce per ogni lavorazione.
// Quando arriva la scheda di una nuova lavorazione, aggiungi una voce qui
// sotto con la stessa struttura: il resto del codice non va toccato.
// ---------------------------------------------------------------------------
export const PROCEDURE_SANIFICAZIONE = {
  confezionamento: {
    titolo: "SANIFICAZIONE MACCHINE E ATTREZZATURE",
    revisione: "Sanif Rev1 del 20/05/2026",
    linea: "LINEA ETICHETTATURA / CONFEZIONAMENTO",
    reparti: ["DEPOSITO OENO SOLUZIONI", "PRESSO CLIENTI"],
    responsabile: "OENO SOLUZIONI SRL",
    frequenza: "INIZIO E FINE IMPIEGO E SECONDO NECESSITÀ",
    tabella: {
      intestazioni: ["ATTREZZATURE", "PRODOTTI", "DILUIZIONI"],
      righe: [
        ["ETICHETTATRICE", "OENOCLEAN DRYPUR", "NESSUNA"],
        ["NASTRATRICE", "OENOCLEAN DRYPUR", "NESSUNA"],
      ],
    },
    procedura: [
      "ACCERTARSI CHE LA PRESA ELETTRICA NON SIA A CONTATTO CON ACQUA",
      "SMONTARE LE PARTI CHE COMPONGONO LA MACCHINA (se necessario)",
      "ASPORTARE MANUALMENTE I RESIDUI GROSSOLANI",
      "LAVARE TUTTE LE PARTI DELLA MACCHINA CON SANIFICANTE",
      "RIMONTARE LA MACCHINA",
      "PROTEGGERE LA MACCHINA NEL PERIODO DI NON UTILIZZO",
    ],
    notaFinale:
      "Al termine delle operazioni verificare sempre l'assenza di residui di prodotti chimici mediante controllo pH con cartina tornasole sulle superfici a contatto con il vino.",
    errori: [
      "DILUIRE I PRODOTTI DIVERSAMENTE DA QUANTO INDICATO",
      "RICONTAMINARE LE SUPERFICI DISINFETTATE CON MANI NON LAVATE O MATERIALI NON DISINFETTATI",
      "UTILIZZARE STRACCI",
    ],
  },

  // tiraggio: { ... }
  // sboccatura: { ... }
  // imbottigliamento: { ... }
  // travaso: { ... }
};
