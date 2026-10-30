import React, { useState, useRef, useEffect, useCallback } from "react";
import oenoLogo from "./oeno-logo.png";
import { generaRapportinoPDF } from "./pdfGenerator";
import { supabase } from "./supabaseClient";
import { useRegisterSW } from "virtual:pwa-register/react";

// Amministratori — vedono il pulsante "Archivio rapportini" in home
const AMMINISTRATORI = ["Stefano Gerardi", "Simona Gussago", "Valentina Erović", "Raffaele Santini", "Admin"];
// Profili con PIN fisso: non chiedono mai di cambiare il PIN e non compaiono
// in "Gestione PIN" (il PIN si cambia solo modificando OPERATORI qui sotto).
const PROFILI_PIN_FISSO = ["Admin"];

// Su iPhone, quando l'app è installata sulla schermata Home, Safari a volte
// blocca in modo casuale le richieste di rete verso siti esterni (errore
// "Load failed") — è un bug noto di iOS, non del nostro codice. Riprovare
// dopo una breve pausa di solito risolve.
async function conRiprovaDiRete(azione, tentativi = 3, attesaMs = 900) {
  let ultimoErrore;
  for (let i = 0; i < tentativi; i++) {
    try {
      return await azione();
    } catch (e) {
      ultimoErrore = e;
      if (i < tentativi - 1) {
        await new Promise((r) => setTimeout(r, attesaMs));
      }
    }
  }
  throw ultimoErrore;
}

// ---------------------------------------------------------------------------
// RAPPORTINI OS
// Registro interventi da cantina — un pannello di controllo, non un modulo.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ELENCO OPERATORI — modifica qui nome e PIN di ognuno (4 cifre consigliate).
// Per aggiungere/rimuovere un operatore, aggiungi/rimuovi una riga.
// ---------------------------------------------------------------------------
const OPERATORI = [
  { nome: "Stefano Gerardi", pin: "2910" },
  { nome: "Simona Gussago", pin: "1234" },
  { nome: "Valentina Erović", pin: "1234" },
  { nome: "Marco Santillo", pin: "1310" },
  { nome: "Giacomo Savardi", pin: "1205" },
  { nome: "Raffaele Santini", pin: "2612" },
  { nome: "Dario Marchi", pin: "1605" },
  { nome: "Matteo Gnali", pin: "0911" },
  { nome: "Bogdan Afloroaiei", pin: "3004" },
  { nome: "Gheorghe Munteanu", pin: "1303" },
  { nome: "Fabio Borboni", pin: "1007" },
  { nome: "Admin", pin: "1966" },
];

const CLIENTI = [
  { nome: "ABBAZIA NOVACELLA", email: "celestino.lucin@abbazianovacella.it, lukas.ploner@kloster-neustift.it, celestino.lucin@kloster-neustift.it" },
  { nome: "Acetaia del Balsamico Trentino", email: "" },
  { nome: "AD ASTRA SRL", email: "" },
  { nome: "AGRARIA RIVA DEL GARDA s.c.a.", email: "furio@agririva.it" },
  { nome: "AGRIAMO SRL", email: "" },
  { nome: "AGRICOLA MONCHIERI", email: "" },
  { nome: "Agricola Vittoria s.s.", email: "" },
  { nome: "AGRIVAR Soc.Agr. S.r.l.", email: "alessandro.locatelli@agrivar.com, amministrazione@agrivar.com" },
  { nome: "AGWines di Giacomelli Andrea", email: "" },
  { nome: "AL CANTARA SOC.AGR.SRL", email: "" },
  { nome: "Al Rocol S.S. Società Agricola", email: "info@alrocol.com" },
  { nome: "ALOIS OCHSENREITER AZ. AGR. HADERBURG", email: "" },
  { nome: "AMBROSIA SRL", email: "" },
  { nome: "ANTICA CANTINA FRATTA S.p.a.", email: "francesco.ziliani@anticafratta.it, simone.bresciani@anticafratta.it" },
  { nome: "ANTICHE TERRE VENETE SRL", email: "" },
  { nome: "ANTICHI VINAI 1877 S.R.L.", email: "" },
  { nome: "APANI INTELLECTUAL PROPERTIES AG", email: "" },
  { nome: "AR.PE.PE. S.r.l.", email: "info@arpepe.com" },
  { nome: "ARCARI + DANESI S.S.", email: "" },
  { nome: "ATER COLLIS SOCIETA' AGRICOLA S.S.", email: "" },
  { nome: "AUTOCTONA srl", email: "" },
  { nome: "AVANZI CAV. GIOVANNI S.S. SOC. AGRICOLA", email: "" },
  { nome: "AZ AGR AGRILU DI LUISA PEZZINI", email: "" },
  { nome: "AZ AGR CARLO TANGANELLI", email: "" },
  { nome: "AZ AGR DAVIDE SPILLARE", email: "" },
  { nome: "AZ AGR DRAGA", email: "" },
  { nome: "AZ AGR GABRIELE MAZZESCHI", email: "" },
  { nome: "AZ AGR IL POGGIOLO DI DELMONTE PIETRO", email: "" },
  { nome: "AZ AGR MONTE MALETTO", email: "" },
  { nome: "AZ AGR RADIS DI BANA ALESSANDRO", email: "" },
  { nome: "AZ AGR TERRAZZI ALTI DI SIRO BUZZETTI", email: "" },
  { nome: "AZ AGR VIOLA ALESSANDRO", email: "" },
  { nome: "AZ AGRICOLA MALVIRà DEI F.LLI DAMONTE", email: "" },
  { nome: "AZ AGRICOLA SPAGNOLLI FRANCESCO", email: "" },
  { nome: "AZ VITIV CONTRADA MICHELE", email: "" },
  { nome: "Az. Agr. \"DELAI\"", email: "" },
  { nome: "AZ. AGR. \"MARUGIAT\"", email: "" },
  { nome: "Az. Agr. \"PILANDRO\"", email: "info@pilandro.com" },
  { nome: "Az. Agr. Angelinetta Emanuele", email: "" },
  { nome: "Az. Agr. Antico Gelso", email: "" },
  { nome: "Az. Agr. Bertagna", email: "" },
  { nome: "AZ. AGR. BORGO LA GALLINACCIA Sas", email: "" },
  { nome: "Az. Agr. Cà dell'Orsa", email: "" },
  { nome: "A.B. WINE", email: "" },
  { nome: "Angelini Wines & Estates Soc.Agr. a r.l.", email: "rinaldo.turus@angeliniwinestates.com, martina.logiudice@angeliniwinestates.com" },
  { nome: "AGRICOLA AGRIBEL SRL", email: "pietro.margotti@agribel.it, lisa.denardi@calzedonia.it" },
  { nome: "AZ. AGR. CASA DIVINA PROVVIDENZA", email: "commerciale@casadivinaprovvidenza.it" },
  { nome: "AZ. AGR. CASTEL FAGLIA SRL", email: "" },
  { nome: "AZ. AGR. CENTANNI GIACOMO", email: "" },
  { nome: "AZ. AGR. COFFELE ALBERTO", email: "" },
  { nome: "Az. Agr. Comincioli", email: "roberto@comincioli.it" },
  { nome: "Az. Agr. CONSOLATI MARIO GIUSEPPE", email: "" },
  { nome: "AZ. AGR. DE VESCOVI ULZBACH", email: "" },
  { nome: "Az. Agr. Deltetto S.S.A.", email: "" },
  { nome: "AZ. AGR. DOMINIO di BAGNOLI s.s.", email: "" },
  { nome: "AZ. AGR. E VITIVIN. DI SAOTTINI CESARE", email: "" },
  { nome: "AZ. AGR. FACCOLI LORENZO", email: "info@faccolifranciacorta.it" },
  { nome: "Az. Agr. FRANCA CONTEA", email: "info@francacontea.it" },
  { nome: "AZ. AGR. FRANCESCA VALENTE", email: "" },
  { nome: "AZ. AGR. FRATELLI MURATORI S.S.", email: "" },
  { nome: "Az. Agr. FURLETTI GABRIELE", email: "" },
  { nome: "AZ. AGR. IL MAIOLO DI TORRE FRANCESCO", email: "" },
  { nome: "Az. Agr. La Pietra di Tommasone", email: "" },
  { nome: "AZ. AGR. LA RONDINERA di Paderni Ada", email: "" },
  { nome: "Az. Agr. LA TORRE di Corsini Massimo", email: "" },
  { nome: "AZ. AGR. LANTIERI DE PARATICO", email: "info@lantierideparatico.it" },
  { nome: "AZ. AGR. LE CHIUSURE", email: "info@lechiusure.net" },
  { nome: "AZ. AGR. LE DUE QUERCE", email: "" },
  { nome: "AZ. AGR. LE MARCHESINE S. S.", email: "info@lemarchesine.it, acquisti@lemarchesine.it" },
  { nome: "Az. Agr. MACULAN soc. semplice", email: "" },
  { nome: "Az. Agr. Marco Carpineti", email: "francesco@marcocarpineti.com" },
  { nome: "AZ. AGR. MIRABELLA S.R.L.", email: "" },
  { nome: "AZ. AGR. MONZIO COMPAGNONI S.r.l.", email: "stefano.graffi@monziocompagnoni.com" },
  { nome: "AZ. AGR. NETTARE DEI SANTI", email: "info@viniriccardi.com" },
  { nome: "AZ. AGR. NOVENTA PIERANGELO", email: "" },
  { nome: "AZ. AGR. PICCININ DANIELE", email: "piccinindaniele@tiscali.it, danielepiccinin80@gmail.com" },
  { nome: "Az. Agr. Piona Albino & Figli", email: "" },
  { nome: "AZ. AGR. POJER & SANDRI", email: "federico@pojeresandri.it, amministrazione@pojeresandri.it" },
  { nome: "AZ. AGR. SAN BERNARDO di Botti Luigi", email: "" },
  { nome: "Az. Agr. Scalvi Pierino", email: "" },
  { nome: "Az. Agr. Stangoni Francesca", email: "" },
  { nome: "Az. Agr. Torti L'Eleganza del Vino", email: "" },
  { nome: "Az. Agr. Zymè di Celestino Gaspari", email: "cantina@zyme.it" },
  { nome: "AZ. AGR.BORGO DEI POSSERI S.S.", email: "cantina@borgodeiposseri.com, info@borgodeiposseri.com" },
  { nome: "AZ. AGR.RICCHI F.LLI STEFANONI", email: "" },
  { nome: "Az. Agricola CHIUSA GRANDE", email: "" },
  { nome: "Az. Agricola FRATELLI BERLUCCHI S.r.l.", email: "" },
  { nome: "Az. Agricola Manara s.s. Soc. Agr.", email: "" },
  { nome: "Az. Agricola Zappaglia", email: "" },
  { nome: "AZ. VITIV. MEDOLAGO ALBANI EMANUELE", email: "info@medolagoalbani.it" },
  { nome: "Az. Vitivinicola IL CALEPINO F.M.", email: "" },
  { nome: "AZ.AGR. ABRAMI ELISABETTA", email: "" },
  { nome: "AZ.AGR. BALDELLI GREGORIO", email: "" },
  { nome: "AZ.AGR. BOFFALORA", email: "" },
  { nome: "AZ.AGR. BRANDOLINI ALESSIO", email: "" },
  { nome: "AZ.AGR. CA'LOJERA di", email: "info@calojera.com" },
  { nome: "AZ.AGR. CANTRINA di Cristina Inganni", email: "" },
  { nome: "AZ.AGR. CASTELLO DEGLI ANGELI S.S.", email: "" },
  { nome: "AZ.AGR. CENTORAME", email: "" },
  { nome: "AZ.AGR. CESCONI s.s.", email: "" },
  { nome: "AZ.AGR. CONTE COLLALTO sarl a s.u.", email: "" },
  { nome: "AZ.AGR. CONTRINI PASQUINA", email: "" },
  { nome: "AZ.AGR. DE TARCZAL", email: "matteo@detarczal.com" },
  { nome: "AZ.AGR. F.LLI GIORGIO E FEDERICO", email: "" },
  { nome: "AZ.AGR. GIOVANNI", email: "" },
  { nome: "AZ.AGR. GIOVANNI BOROLI", email: "" },
  { nome: "Az.Agr. IL PENDIO", email: "" },
  { nome: "AZ.AGR. LA CONTEA", email: "" },
  { nome: "Az.Agr. La Fiuma di Pedrazzoli Valentina", email: "" },
  { nome: "AZ.AGR. LA GHIDINA", email: "" },
  { nome: "Az.Agr. La Rocchetta S.r.l", email: "" },
  { nome: "Az.Agr. La Tordera S.S.", email: "" },
  { nome: "AZ.AGR. LE GAINE", email: "" },
  { nome: "AZ.AGR. LE GATTE", email: "" },
  { nome: "AZ.AGR. LICCIARDELLO", email: "" },
  { nome: "AZ.AGR. LIVIANI CLARA AGNESE", email: "" },
  { nome: "AZ.AGR. MAROTTI DANIELA S.S.", email: "" },
  { nome: "AZ.AGR. MASO MARTIS", email: "" },
  { nome: "AZ.AGR. MENEGOLA WALTER", email: "walter.menegola@virgilio.it" },
  { nome: "AZ.AGR. PRAVIS S.S.", email: "" },
  { nome: "AZ.AGR. PREVOSTINI PAOLO", email: "" },
  { nome: "AZ.AGR. ROBERTO LUCARELLI", email: "" },
  { nome: "AZ.AGR. ROENO di Fugatti R & C. S.S.", email: "" },
  { nome: "AZ.AGR. SALIZZONI VALTER", email: "info@salizzoni.info" },
  { nome: "AZ.AGR. SANTUS MARIALUISA", email: "" },
  { nome: "AZ.AGR. SIAR", email: "" },
  { nome: "AZ.AGR. TENUTA degli ANGELI", email: "" },
  { nome: "Az.Agr. Terradesa di Battaglioli", email: "m.falcetti@icloud.com" },
  { nome: "AZ.AGR. TORRE FORNELLO", email: "" },
  { nome: "AZ.AGR. TRIGONA VINCENZO", email: "" },
  { nome: "Az.Agr. VALBA di Micheli Laura", email: "" },
  { nome: "AZ.AGR. VALLAROM", email: "" },
  { nome: "AZ.AGR. VIGNETI ALTMANN", email: "" },
  { nome: "AZ.AGR. ZENI R. s.s.", email: "" },
  { nome: "AZ.AGR.BANA DAVIDE", email: "" },
  { nome: "AZ.AGR.BRIGALDARA", email: "" },
  { nome: "Az.Agr.Bulgarini Fausto", email: "" },
  { nome: "Az.Agr.Cavalli Faletti Soc.Agr.semplice", email: "" },
  { nome: "AZ.AGR.LA VITE DEI F.LLI LIZZIO s.s.", email: "" },
  { nome: "AZ.AGR.MONTONALE Soc.Agr. S.S.", email: "roberto@montonale.com, amministrazione@montonale.com" },
  { nome: "AZ.AGR.PRATELLO di BERTOLA VINCENZO S.S.", email: "cantina@pratello.com" },
  { nome: "AZ.AGR.SACCARDI MARCO", email: "" },
  { nome: "AZ.AGR.VIT. LA MUROLA srl Soc.Agr.", email: "" },
  { nome: "Az.Agricola Balgera Luca", email: "" },
  { nome: "Az.Agricola Cavallini Damiano", email: "" },
  { nome: "AZ.AGRICOLA CECCHIN ING.RENATO", email: "" },
  { nome: "AZ.AGRICOLA DARIO D'ALLO'", email: "" },
  { nome: "Az.Agricola Massussi Luigi", email: "" },
  { nome: "AZ.AGRICOLA UBERTI G. &  G. A.", email: "info@ubertivini.it" },
  { nome: "AZ.VIN.FALESCO s.r.l.", email: "" },
  { nome: "AZ.VITIV. DI LEGAMI", email: "" },
  { nome: "AZIENDA AGRICOLA ALFIO MOZZI", email: "" },
  { nome: "AZIENDA AGRICOLA ANDREOLA", email: "" },
  { nome: "Azienda Agricola Angeletti Raffaele", email: "" },
  { nome: "AZIENDA AGRICOLA BALDETTI ALFONSO", email: "" },
  { nome: "Azienda Agricola BENAZZOLI ONORIO", email: "" },
  { nome: "Azienda Agricola BRUNELLO", email: "" },
  { nome: "Azienda Agricola CARONA", email: "" },
  { nome: "Azienda Agricola CITARI S.S.", email: "" },
  { nome: "Azienda Agricola Colli Vaibò", email: "" },
  { nome: "AZIENDA AGRICOLA COMAI", email: "" },
  { nome: "AZIENDA AGRICOLA DAMOLI BRUNO", email: "" },
  { nome: "Azienda Agricola Ferrari Marco", email: "" },
  { nome: "AZIENDA AGRICOLA FORMOLO MATTEO", email: "tiziano.formolo@gmail.com" },
  { nome: "Azienda Agricola Gambino s.s.", email: "" },
  { nome: "Azienda Agricola Giuseppe Mannino", email: "" },
  { nome: "Azienda Agricola LA GINESTRA", email: "" },
  { nome: "AZIENDA AGRICOLA LA MESMA S.R.L.", email: "rossi.agro@gmail.com" },
  { nome: "Azienda Agricola Maccaboni p.a Francesco", email: "gmaccaboni@gmail.com" },
  { nome: "Azienda Agricola Marzaghe", email: "" },
  { nome: "AZIENDA AGRICOLA MASO BERGAMINI", email: "" },
  { nome: "Azienda Agricola Mattia Filippi", email: "" },
  { nome: "AZIENDA AGRICOLA MIOTTI FIRMINO", email: "" },
  { nome: "Azienda Agricola MONTE TONDO", email: "marta@montetondo.it, info@montetondo.it" },
  { nome: "AZIENDA AGRICOLA PANCHERI PIETRO", email: "" },
  { nome: "AZIENDA AGRICOLA POLI SOC SEMPLICE", email: "" },
  { nome: "AZIENDA AGRICOLA SAN CASSIANO", email: "" },
  { nome: "AZIENDA AGRICOLA SGREVA", email: "" },
  { nome: "AZIENDA AGRICOLA TENUTA ROCCA", email: "" },
  { nome: "AZIENDA SCERSCE' SOC.AGRICOLA SRL", email: "" },
  { nome: "AZIENDA VINICOLA FEDERICI S.R.L.", email: "" },
  { nome: "AZIENDA VINICOLA UMANI RONCHI SPA", email: "g.mattioli@umanironchi.it" },
  { nome: "AZIENDA VITIVINICOLA CASTELLO RAMETZ SRL", email: "info@rametz.com" },
  { nome: "AZIENDA VITIVINICOLA ERMES PAVESE", email: "" },
  { nome: "BACCOLO srl", email: "" },
  { nome: "BAGLIO DEL CRISTO", email: "" },
  { nome: "BALGERA VINI", email: "" },
  { nome: "BALIA DI ZOLA DI ELUCI VERUSKA", email: "" },
  { nome: "BARACCHI SOC.AGR. S.S.", email: "info@baracchiwinery.com" },
  { nome: "Azienda Agricola Cà del Gè", email: "info@cadelge.it" },
  { nome: "BARONE PIZZINI S.AGR.R.L.", email: "bonardi@baronepizzini.it, cantina@baronepizzini.it" },
  { nome: "BATTAGLIA GRAZIELLA", email: "" },
  { nome: "BEBRALAB SRL", email: "" },
  { nome: "BELLAVEDER DI LUCHETTA TRANQUILLO & FIGL", email: "info@bellaveder.it" },
  { nome: "BENANTI VITICOLTORI SRL", email: "" },
  { nome: "Benazzoli Fulvio Soc.Agr. Semplice", email: "" },
  { nome: "BERSANO VINI SRL", email: "" },
  { nome: "BERTAZZO 1840", email: "" },
  { nome: "BETTILI CRISTIANA AZIENDA AGRICOLA", email: "" },
  { nome: "BINE' Società Agricola", email: "" },
  { nome: "Boccafosca s.c.a.", email: "frontoffice@colonnara.it" },
  { nome: "Bonaldi - Cascina del Bosco Srl", email: "" },
  { nome: "BONERA REFRIGERAZIONI SRL", email: "" },
  { nome: "BONIOTTI ANGELA", email: "guidorizzini@virgilio.it" },
  { nome: "BORGO STAJNBECH SS AGR", email: "" },
  { nome: "BORTOLOMIOL S.p.A.", email: "" },
  { nome: "BREDASOLE dei F.lli Ferrari", email: "ferrari@bredasole.it" },
  { nome: "CA' CAPERDICCHI  F.lli Gessaroli", email: "" },
  { nome: "CACCIA AL PIANO 1868 Soc.Agr. srl", email: "claudio.santini@cacciaalpiano.it" },
  { nome: "CACCIANEMICI BIOAUTOCTONA S.S.Soc.Agr.", email: "" },
  { nome: "CAMILUCCI S.R.L. Società Agricola", email: "" },
  { nome: "CAMILUCCI Società Agricola S.S.", email: "" },
  { nome: "Canove S.r.l.", email: "" },
  { nome: "CANT CONEGLIANO, VITT VENETO E CASARSA", email: "" },
  { nome: "CANT.PROD.SAN PAOLO SOC.AGR.COOP.", email: "" },
  { nome: "Cantina Aldeno S.c.a", email: "" },
  { nome: "CANTINA COLLI DEL SOLIGO Soc.Agr.Coop", email: "laboratorio@collisoligo.com" },
  { nome: "CANTINA DI CUSTOZA Soc.Agr.Coop.", email: "" },
  { nome: "CANTINA DI LA-VIS E VALLE DI CEMBRA SCA", email: "" },
  { nome: "CANTINA DI MONTEFORTE D'ALPONE S.C.A.", email: "" },
  { nome: "Cantina di SOLOPACA Soc. Coop.", email: "" },
  { nome: "Cantina Dryas", email: "" },
  { nome: "CANTINA FALON di Silvano Falone", email: "" },
  { nome: "CANTINA FRANZOSI", email: "" },
  { nome: "CANTINA I MAGREDI SRL", email: "" },
  { nome: "Cantina Lurani Cernuschi", email: "" },
  { nome: "Cantina Merano Burggräfler Soc.Agr.Coop.", email: "Stefan.Kapfinger@kellereimeran.it" },
  { nome: "CANTINA MODICA DI SAN GIOVANNI", email: "" },
  { nome: "CANTINA PROD.BOLZANO soc coop", email: "" },
  { nome: "CANTINA RESOM S.A.S. MOSER MARCELLO E F.", email: "" },
  { nome: "CANTINA ROTALIANA DI MEZZOLOMBARDO SOCIE", email: "" },
  { nome: "CANTINA SOCIALE BERGAMASCA", email: "" },
  { nome: "CANTINA SOCIALE DI AVIO", email: "" },
  { nome: "Cantina Sociale di Isera Soc.Coop.Agr.", email: "" },
  { nome: "CANTINA SOCIALE DI TRENTO S.C.A.", email: "giorgia.brugnara@cantinasocialetrento.it" },
  { nome: "CANTINA SOCIALE MORI COLLI ZUGNA", email: "alberto.butterini@cantinamoricollizugna.it" },
  { nome: "CANTINA SOCIALE ROVERE' DELLA LUNA", email: "" },
  { nome: "CANTINA SPERANZA di Speranza E.", email: "" },
  { nome: "CANTINA TOBLINO SCA", email: "" },
  { nome: "CANTINA TOLLO Soc.Coop.Agricola", email: "" },
  { nome: "CANTINA TONIOLLI DI TONIOLLI TOMASO", email: "" },
  { nome: "CANTINA VILLA CORNIOLE Soc.Agr.SRL", email: "info@villacorniole.com" },
  { nome: "Cantina Zehnhof di Rossi Giacomo", email: "" },
  { nome: "Cantine Biondelli Soc. Agr. S.r.l.", email: "" },
  { nome: "CANTINE DAFFARA E GRASSO SNC", email: "" },
  { nome: "CANTINE DI NESSUNO Soc.Agr. a r.l.", email: "" },
  { nome: "Cantine Ermes Soc. Coop. Agr.", email: "" },
  { nome: "CANTINE FRANCESCO MININI S.p.A.", email: "" },
  { nome: "CANTINE MONFORT SRL", email: "federicosimoni@cantinemonfort.it" },
  { nome: "CANTINE SARDUS PATER SOC.COOP.AGR.", email: "" },
  { nome: "CANTINE SCOLARI SRL", email: "" },
  { nome: "CANTINE SILVESTRI S.R.L.", email: "" },
  { nome: "CANTINE VIRGILI SRL", email: "" },
  { nome: "CANTINE VITEVIS - Soc. Coop.Agricola", email: "" },
  { nome: "CARLO ZADRA S.n.c.", email: "" },
  { nome: "Carpenè Malvolti S.p.a.", email: "" },
  { nome: "CARROZZERIA M.C. CAR SNC", email: "" },
  { nome: "CASA DEL BERE SRL", email: "zini.alessandro@zini-it.com" },
  { nome: "CASA ROMA  VINI S.R.L.", email: "" },
  { nome: "CASA VIN.FEUDO RUDINI SRL", email: "" },
  { nome: "CASA VINICOLA ALDO RAINOLDI S.r.l.", email: "stefano.cattaneo@rainoldi.com, aldo.rainoldi@rainoldi.com" },
  { nome: "CASA VINICOLA BENNATI S.p.A.", email: "" },
  { nome: "Casa Vinicola Ettore Sammarco snc", email: "" },
  { nome: "CASA VINICOLA F.LLI BETTINI", email: "" },
  { nome: "CASA VINICOLA MORANDO srl", email: "" },
  { nome: "CASA VINICOLA SARTORI S.P.A.", email: "" },
  { nome: "CASA ZUFFADA Soc.Agr. SRL", email: "" },
  { nome: "Cascina Le Preseglie", email: "" },
  { nome: "CASTELLO BONOMI Tenute in Franciacorta", email: "" },
  { nome: "CASTELLO DEL TREBBIO", email: "" },
  { nome: "CASTELLO DI CANTONE SA", email: "" },
  { nome: "CAVE MONT BLANC DE MORGEX ET LA SALLE", email: "" },
  { nome: "CAVIT s.c.", email: "" },
  { nome: "CAVITRIA Casa Vinicola Triacca S.r.l.", email: "info@triacca.com" },
  { nome: "CENTANNI SRL", email: "" },
  { nome: "Centinari S.a.", email: "Francesco.Lenza@centinari.it" },
  { nome: "CESARINI SFORZA SPUMANTI S.p.A.", email: "" },
  { nome: "CINCINNATO Soc. Coop. Agr. Arl", email: "" },
  { nome: "COL TAMARIE", email: "" },
  { nome: "COLLEFRISIO srl", email: "" },
  { nome: "COLOMBA BIANCA cantine", email: "" },
  { nome: "COLOMBO ANTONIO E FIGLI CASCINA PASTORI", email: "" },
  { nome: "COLOMBO SORMANI Soc.Semplice Agricola", email: "" },
  { nome: "COLTIVARE SRL", email: "" },
  { nome: "CONSORZIO CITRA", email: "" },
  { nome: "CONSORZIO VINI I.G.T. TERRE LARIANE", email: "" },
  { nome: "CONTADI CASTALDI S.r.l.", email: "" },
  { nome: "CONTESA di Pasetti & C.", email: "" },
  { nome: "COOP.AGR.TRIASSO e SASSELLA", email: "" },
  { nome: "Coop.Vitiv.Cellatica-Gussago Soc.Coop.Ag", email: "ufficiotecnicocvcg@gmail.com" },
  { nome: "COPPO S.R.L.", email: "" },
  { nome: "Corte Sermana Soc. Agr. S.s.", email: "" },
  { nome: "CORVÉE SRL", email: "produzione@corvee.wine, mario.esposito@corvee.wine" },
  { nome: "COTTANERA SOC.AGR. ARL", email: "" },
  { nome: "CRISTIANA MEGGIOLARO", email: "" },
  { nome: "CUVAGE srl", email: "" },
  { nome: "DAL BOSCO GIULIETTA", email: "" },
  { nome: "DAL CERO F.LLI Società Agricola", email: "" },
  { nome: "DAMILANO AZIENDA AGRICOLA SRL", email: "" },
  { nome: "DANTE RIVETTI", email: "" },
  { nome: "DARIO STAZZONELLI VIGNAIOLO", email: "" },
  { nome: "DE STEFANI s.s.a.", email: "" },
  { nome: "DE.CO WINE SRL", email: "" },
  { nome: "DELBO' SOCIETA' AGRICOLA", email: "" },
  { nome: "DISTILLERIA  FRATELLI PISONI SRL", email: "" },
  { nome: "DOLOMIS SRL", email: "" },
  { nome: "DONELLI VINI S.p.A.", email: "" },
  { nome: "EMME E EMME WINES SRL", email: "" },
  { nome: "ENDRIZZI SRL", email: "tiziana.piffer@endrizzi.it, amministrazione@endrizzi.it" },
  { nome: "ENO CACCIA", email: "" },
  { nome: "ENOILTECH S.R.L.", email: "tecnico.commerciale@enoiltech.com" },
  { nome: "ENOSERVICE ITALIA SRL", email: "" },
  { nome: "ENOSOL S.a.s. di Dogliotti Francesco & C", email: "" },
  { nome: "ENRICO SERAFINO S.R.L.", email: "" },
  { nome: "EREDI LEGONZIANO S.C.A.", email: "" },
  { nome: "F.LLI ROMANESE SOC.AGR.", email: "" },
  { nome: "FACCINELLI LUCA", email: "" },
  { nome: "Fattoria di Calcinaia", email: "" },
  { nome: "FATTORIA POGGERINO SOCIETA' AGRICOLA", email: "" },
  { nome: "FATTORIA VILLA LIGI", email: "" },
  { nome: "FELSINA S.P.A. Società Agricola", email: "stefano.rossi@felsina.it, claudia.semboloni@felsina.it" },
  { nome: "FERRARELLE SPA", email: "" },
  { nome: "FERRARI F.LLI LUNELLI S.p.A.", email: "" },
  { nome: "FERRI PAOLO", email: "" },
  { nome: "FEUDI di SAN GREGORIO SOC.AGRICOLA SPA", email: "" },
  { nome: "FEUDI SPADA srl", email: "" },
  { nome: "FINIGETO AZ.AGR. di Dallavalle Aldo", email: "" },
  { nome: "FONDAZIONE EDMUND MACH", email: "" },
  { nome: "FONGARO SOCIETA' AGRICOLA S.S.", email: "" },
  { nome: "FONTANAFREDDA SRL", email: "" },
  { nome: "FRATELLI PANCHER SOCIETà SEMPLICE AGRI", email: "" },
  { nome: "G.S.A. SRL", email: "" },
  { nome: "GAIERHOF srl", email: "" },
  { nome: "GALLI FRANCO AZ. AGR.", email: "" },
  { nome: "GARZOL SRL SOCIETA' AGRICOLA", email: "" },
  { nome: "GENAGRICOLA S.P.A.", email: "" },
  { nome: "GIACOMELLI SPUMANTI - SOC AGR S.S.", email: "" },
  { nome: "Gian Paolo e Giovanni Cavalleri Società", email: "" },
  { nome: "GIANNITESSARI SOCIETA' AGRICOLA SRL", email: "" },
  { nome: "GUIDO BERLUCCHI & C. S.p.A.", email: "laboratorio@berlucchi.it" },
  { nome: "HAAS FRANZISKUS EREDI", email: "davide.baldessari@franz-haas.it, stefano@franz-haas.it" },
  { nome: "HADERBURG S.A.S. Az. Agr.", email: "" },
  { nome: "HIC ET NUNC srl Soc.Agr.", email: "" },
  { nome: "HORA AZ. AGR. DI ROMINA CALVETTI", email: "" },
  { nome: "ICARO VINO SRL", email: "" },
  { nome: "IDROTEC S.R.L.", email: "" },
  { nome: "IDROTERMO DI VAGLIO MASSIMO SRL", email: "" },
  { nome: "IL MORALIZZATORE SOCIETA' AGRICOLA", email: "info@ilmoralizzatore.it" },
  { nome: "IL MOSNEL di E. Barboglio e Figli", email: "f.polenghi@mosnel.com" },
  { nome: "ILLICA VINI", email: "" },
  { nome: "Jasci  & Marchesani Az. Agro Biologica", email: "" },
  { nome: "JOSEF BRIGL SRL", email: "" },
  { nome: "JURIJ FIORE & FIGLIA Società Agricola SS", email: "" },
  { nome: "KELLEREI KALTERN - CALDARO Soc.agr.coop.", email: "thomas.scarizuola@kellereikaltern.com" },
  { nome: "KELLEREI TERLAN", email: "" },
  { nome: "La Boscaiola - Vigneti Cenci S.S.Soc.Agr", email: "" },
  { nome: "LA COSTA SRL SOC. AGR.", email: "prenotazionilacosta@gmail.com" },
  { nome: "LA FORTEZZA SOC.AGR. srl", email: "" },
  { nome: "LA GRAZIA srl SOC. AGR.", email: "" },
  { nome: "LA MADONNA SRL", email: "" },
  { nome: "LA PERLA", email: "" },
  { nome: "LA RICCAFANA", email: "" },
  { nome: "LA SPIA SRL Soc.Agricola", email: "" },
  { nome: "LA TRAVAGLINA srl", email: "" },
  { nome: "LA VALLE Società Agricola", email: "" },
  { nome: "LAUDAV Società Agricola Semplice", email: "" },
  { nome: "LE CANTORIE AZIENDA AGRICOLA", email: "amministrazione@lecantorie.com, info@lecantorie.com" },
  { nome: "LE GUAITE DI NOEMI SO CIETA' AGRICOLA SS", email: "" },
  { nome: "LE MORETTE LUGANA", email: "" },
  { nome: "LE VEDUTE di Manenti Graziano e C.", email: "" },
  { nome: "LEVIDE srl", email: "antonio@largaiolli.biz" },
  { nome: "LEVII srl Societa Agricola", email: "info@levii.it" },
  { nome: "LO SPARVIERE GUSSALLI BERETTA", email: "" },
  { nome: "l'Unicorno di Becchetti Corrado Giacinto", email: "" },
  { nome: "MADONNA DELLE VITTORIE S.S.-S.A.", email: "enologomdv@madonnadellevittorie.it" },
  { nome: "MAELI SOCIETA' AGRICOLA S.S.", email: "" },
  { nome: "MAJOLINI S.r.l.", email: "" },
  { nome: "MANINCOR Srl Soc.Agricola", email: "" },
  { nome: "MARCHEDOC Soc.Coop.Agricola", email: "" },
  { nome: "MARCHESI FRESCOBALDI Soc.Agr. s.r.l.", email: "" },
  { nome: "Masiero Soc.Agricola Semplice", email: "" },
  { nome: "MASO SALIM SRL SOC AGRICOLA", email: "" },
  { nome: "MASSERIA CAMPITO S.A.R.L.", email: "" },
  { nome: "MASTROBERNARDINO SOC AGR SRL", email: "" },
  { nome: "MELAXA S.r.l. con unico socio", email: "" },
  { nome: "MENOMENO SRL", email: "" },
  { nome: "Metelli Angelo", email: "" },
  { nome: "MGM Mondo del vino srl", email: "daniele.martino@mondodelvino.com, loris.gava@mondodelvino.com" },
  { nome: "MOBIL FILL GROUP", email: "" },
  { nome: "MONSUPELLO EREDI DI BOATTI CARLO", email: "" },
  { nome: "MONTE SALINE Società Agricola S.r.l.", email: "" },
  { nome: "MONTEROTONDO AZIENDA AGRICOLA", email: "" },
  { nome: "MONTORFANO DE FILIPPO S.R.L.", email: "" },
  { nome: "Moser Francesco Soc.Semplice Agricola", email: "matteo.moser@mosertrento.com, info@mosertrento.com" },
  { nome: "NEMESI SRL", email: "" },
  { nome: "NENO SRL", email: "vito.piffer@gmail.com, plodari@oenoitalia.com, isaia.cerisara@melaxa.com" },
  { nome: "NEVIO SCALA Soc.Agr. S.S.", email: "" },
  { nome: "NICOLA GATTA SRL AGRICOLA", email: "" },
  { nome: "NICOLA NOBILI", email: "" },
  { nome: "NICOLAS SECONDE'", email: "" },
  { nome: "NICOSIA S.p.A.", email: "" },
  { nome: "NOSIO S.P.A", email: "" },
  { nome: "NUZZELLA AZ.AGR.", email: "" },
  { nome: "Oeno Piemonte srl", email: "alessandro@oenopiemonte.it, francesco@oenopiemonte.it, federico@oenopiemonte.it, info@oenopiemonte.it" },
  { nome: "OENO S.R.L.", email: "" },
  { nome: "OENO SOLUZIONI SRL", email: "" },
  { nome: "OENOITALIA S.R.L.", email: "assistente.faustini@oenoitalia.com, vezzoli@oenoitalia.com" },
  { nome: "OIKOS Coop.Soc. a.r.l.", email: "" },
  { nome: "OPERA VITIVINICOLA IN VALDICEMBRA SRL", email: "" },
  { nome: "ORION WINES SRL", email: "" },
  { nome: "ORTICOLTURA SONZOGNI GIULIANO", email: "michele.ruggeri@castellodigrumello.it, paolo.zadra@gmail.com" },
  { nome: "OTTIN ELIO S.S.A", email: "" },
  { nome: "PACHERHOF", email: "" },
  { nome: "PALMENTO COSTANZO SRL Soc.Agr.", email: "" },
  { nome: "PAOLO TIEFENTHALER", email: "stefano@franz-haas.it" },
  { nome: "Pasini Giuseppe e Maurizio S.S.", email: "" },
  { nome: "PECIS ING. ANGELO AZ. AGR.", email: "" },
  { nome: "PENTAFIN-AGRAR SRL", email: "info@pentafin-agrar.it" },
  { nome: "PERLAGE SRL", email: "" },
  { nome: "PIAN DI ROCCA SRL", email: "" },
  { nome: "PIERA MARTELLOZZO S.P.A. P. M.", email: "" },
  { nome: "PIEVALTA soc.agr.r.l.", email: "" },
  { nome: "PILIEGO FEDERICO", email: "" },
  { nome: "PITARS S.N.C. DI PITTARO PAOLO E F.LLI", email: "" },
  { nome: "PIUBELLO ANDREA", email: "" },
  { nome: "PODERE DELLA CAVAGA S.r.l.", email: "andrea.cavaga@gmail.com, vanessa@verdoni.it" },
  { nome: "PODERE DELLA TORRE snc", email: "" },
  { nome: "PODERE VECCIANO", email: "" },
  { nome: "PODERI ELIA S.S.", email: "" },
  { nome: "Poggio Azienda Vinicola snc", email: "" },
  { nome: "POLINI GROUP S.r.l.", email: "" },
  { nome: "POLINI PRODUZIONI SRL", email: "" },
  { nome: "QUADRA S.r.l.", email: "" },
  { nome: "Quartomoro di Sardegna", email: "" },
  { nome: "RECHOF SOCIETÀ SEMPLICE AGRICOLA", email: "" },
  { nome: "ROBERTA PAMBIANCO PAM", email: "" },
  { nome: "Rocche dei Vignali Soc.Coop.Agricola", email: "" },
  { nome: "ROMANTICA Società Agricola", email: "" },
  { nome: "RONCO CALINO Soc.Agricola S.r.l.", email: "" },
  { nome: "RUARO GIANNI", email: "" },
  { nome: "S.a. DIRUPI S.s.", email: "" },
  { nome: "S.S. AGRICOLA DI CHINI GRAZIANO", email: "" },
  { nome: "S.S.AGR. RESS LUIGI & FIGLI", email: "marco.ress@tin.it" },
  { nome: "S.V. Franciacorta Belon S.R.L.", email: "" },
  { nome: "Salvadori Sabrina", email: "" },
  { nome: "San Michele Società Agricola S.s.", email: "" },
  { nome: "SANTA MARGHERITA S.p.A.", email: "" },
  { nome: "SANTINI   RAFFAELE", email: "" },
  { nome: "SARTIRANO FIGLI CANTINE e VIGNETI s.r.l.", email: "" },
  { nome: "SAV - CANTINA VIVALLIS", email: "luca.moser@vivallis.it, saharon.marzadro@vivallis.it" },
  { nome: "SCHENK ITALIA SPA", email: "alberto.benazzoli@schenk.it, tania.ferrari@schenk.it" },
  { nome: "Schlosskellerei Turmhof", email: "" },
  { nome: "SERENE srl Soc.Agr.", email: "" },
  { nome: "SESTERZIO Soc.Agricola Srl Unipersonale", email: "" },
  { nome: "Sicily & Co. S.r.l.", email: "" },
  { nome: "SO.VI.PI. di Lovisolo Massimo e C. SAS", email: "" },
  { nome: "SOC AGR FOSSA MALA SRL", email: "" },
  { nome: "SOC AGR VAL DEL MELO SRL", email: "d_platanova@hotmail.com, info@valdelmelo-maremma.com, v.folgaretti@gmail.com" },
  { nome: "SOC SEMP AGR PPM CIDER", email: "" },
  { nome: "SOC. AGR. BARBOGLIO DE GAIONCELLI", email: "info@barbogliodegaioncelli.it, andreabarboglio@gmail.com" },
  { nome: "Soc. Agr. Brambilla Vigne Olcru Srl", email: "" },
  { nome: "Soc. Agr. CA' DI RAJO", email: "" },
  { nome: "SOC. AGR. CASTELVEDER", email: "" },
  { nome: "SOC. AGR. CELINATE S.R.L.", email: "" },
  { nome: "SOC. AGR. CORTE POLFRANCESCHI SRL", email: "" },
  { nome: "Soc. Agr. Le Tenute del Leone Alato Spa", email: "" },
  { nome: "Soc. Agr. Lucangeli Aymerich S.s.", email: "produzione@tenutaditavignano.it" },
  { nome: "SOC. AGR. MARZAGHE FRANCIACORTA S.S.", email: "" },
  { nome: "SOC. AGR. MONTEROSSA  S.r.l.", email: "" },
  { nome: "SOC. AGR. SEVERNICO", email: "" },
  { nome: "Soc. Agr. Villa Giuliana s.s.", email: "" },
  { nome: "Soc. Agr. Villa San Carlo", email: "" },
  { nome: "SOC. AGR. ZAMICHELE S.S.", email: "" },
  { nome: "SOC. AGRICOLA CA' RUGATE", email: "produzione@carugate.it, contabilita@carugate.it" },
  { nome: "SOC. AGRICOLA PODERE LA REGOLA s.s.", email: "" },
  { nome: "SOC.AGR. EREDI di DANIELE ZAMUNER s.s.", email: "info@zamuner.it" },
  { nome: "Soc.Agr. GODIO di Zuffellato Elena", email: "" },
  { nome: "SOC.AGR. LA CA' srl", email: "" },
  { nome: "Soc.Agr. LE QUATTRO TERRE s.s.", email: "" },
  { nome: "SOC.AGR. RIOFAVARA di PADOVA M.& C. S.S.", email: "" },
  { nome: "SOC.AGR. SANTA MARIA LA NAVE s.s.", email: "" },
  { nome: "SOC.AGR. VENTURINI BALDINI s.r.l.", email: "" },
  { nome: "Soc.Agr. Zanotelli Elio & Fratelli S.S.", email: "" },
  { nome: "SOC.AGR.F.LLI CORVEZZO SRL", email: "" },
  { nome: "Soc.Agr.LAZZARI S.S.", email: "" },
  { nome: "SOC.AGR.LE MURAGLIE DI VICENTINI S.S.", email: "" },
  { nome: "Soc.Agr.Terre d'Aenor S.a.s.", email: "ermesvianelli7@gmail.com" },
  { nome: "Soc.Agr.Valluna s.s.", email: "cappe.davide@libero.it" },
  { nome: "SOC.COOP.AGR.ALESSANDRO di CAMPOREALE", email: "" },
  { nome: "SOC.AGR.F.LLI PELZ s.s.", email: "fratelli.pelz@gmail.com" },
  { nome: "SOCIETA'  AGRICOLA CARUNA S.S.", email: "info@carunafranciacorta.com" },
  { nome: "SOCIETA'  AGRICOLA CONTI DUCCO S.S.", email: "" },
  { nome: "Società Agricola \"Il Ceresé\"", email: "" },
  { nome: "SOCIETA' AGRICOLA BALZE GRIGIE SRL", email: "info@balzegrigie.it" },
  { nome: "SOCIETA' AGRICOLA BELLAVISTA S.S.", email: "" },
  { nome: "Società Agricola BERSI SERLINI S.r.l.", email: "" },
  { nome: "Società Agricola Boccadoro", email: "" },
  { nome: "Società Agricola Cà dei Colli Srl", email: "" },
  { nome: "SOCIETA' AGRICOLA COLLINA DELLE FATE SRL", email: "ludovica@collinadellefate.com" },
  { nome: "SOCIETA' AGRICOLA DUE PINI", email: "" },
  { nome: "Società Agricola ERIAN s.r.l.", email: "" },
  { nome: "Società Agricola F.lli LAMBERTI s.s.", email: "" },
  { nome: "SOCIETA' AGRICOLA GOTTARDI SRL", email: "" },
  { nome: "SOCIETA' AGRICOLA LA FIOCA S.r.l.", email: "" },
  { nome: "Società Agricola Le Driadi SS", email: "" },
  { nome: "SOCIETA' AGRICOLA MARCHI", email: "marchiagricola@gmail.com" },
  { nome: "Società Agricola OLIVINI S.S.", email: "botti@olivini.net" },
  { nome: "SOCIETA' AGRICOLA POGGIO AL GARDA S.S.", email: "" },
  { nome: "Società Agricola QUADRIVIUM S.S.", email: "" },
  { nome: "SOCIETA' AGRICOLA SEMPLICE GOTTARDI", email: "" },
  { nome: "SOCIETA' AGRICOLA VALIANO S.R.L.", email: "" },
  { nome: "SOCIETA’ AGRICOLA LA MERIDIANA DI LEALI", email: "" },
  { nome: "Sorsasso Lago di Como S.a.s", email: "" },
  { nome: "SPUMANTI VALDO SRL", email: "eugenio.pallotta@valdo.com" },
  { nome: "TALLARINI Soc.Agricola s.r.l.", email: "" },
  { nome: "TECNOBOLLE srl", email: "info@tecnobolle.com, contabilita@tecnobolle.com" },
  { nome: "TENIMENTI CIVA SOCIETA' AGRICOLA S.R.L.", email: "" },
  { nome: "Tenuta Belvedere di Cabrini Gianluca", email: "" },
  { nome: "TENUTA CARRETTA", email: "" },
  { nome: "TENUTA CASTELLO DI GRUMELLO SRL Soc.Agr.", email: "" },
  { nome: "TENUTA DEL GELSO SOC AGR SS", email: "" },
  { nome: "Tenuta delle Terre Nere", email: "" },
  { nome: "TENUTA DI DONNAFUGATA Srl Soc. Agr.", email: "" },
  { nome: "TENUTA DI FRASSINETO SRL Soc.Agricola", email: "" },
  { nome: "TENUTA FORCIROLA S.r.l.", email: "" },
  { nome: "TENUTA HOFSTATTER", email: "markus.heinel@hofstatter.com" },
  { nome: "TENUTA LA FIAMINGA SOC.AGR.S.S.", email: "" },
  { nome: "TENUTA LA PENNITA", email: "" },
  { nome: "Tenuta Martinelli Soc. Agr. srl", email: "" },
  { nome: "TENUTA NATALINA GRANDI SOCIETA' AGRICOLA", email: "" },
  { nome: "TENUTA PETER SOLVA", email: "" },
  { nome: "TENUTA PIANO DI RUSTANO SOC. AGR.", email: "" },
  { nome: "TENUTA ROLETTO SRL", email: "" },
  { nome: "TENUTA SAN PIETRO", email: "" },
  { nome: "TENUTA SCERSCE' s.r.l. Unipersonale", email: "direzione@tenutascersce.it" },
  { nome: "TENUTA ULISSE Società agricola a R.L.", email: "" },
  { nome: "Tenuta Vini Bessererhof Mair Otmar", email: "" },
  { nome: "TENUTE COSSIGNANI SOC.AGR.S.", email: "" },
  { nome: "TENUTE DEL CERRO S.p.A.", email: "" },
  { nome: "Tenute Sajni Fasanotti", email: "" },
  { nome: "TENUTE SELLA & MOSCA S.p.A.", email: "" },
  { nome: "TENUTE VIDI", email: "" },
  { nome: "TERACELL SRL", email: "" },
  { nome: "TERRAZZE DI MONTEVECCHIA sas", email: "" },
  { nome: "TERRAZZI ALTI", email: "" },
  { nome: "TERRE DEL BAROLO", email: "" },
  { nome: "TERRE DEL LAGORAI SRL", email: "" },
  { nome: "Terre di Cerealto Soc. Agr. Semplice", email: "reniero@oenoitalia.com" },
  { nome: "TERRULENTA SOCIETA' AGRICOLA COOPERATIVA", email: "" },
  { nome: "TORREVILLA", email: "" },
  { nome: "UGO VEZZOLI", email: "" },
  { nome: "UVA SAPIENS", email: "" },
  { nome: "VALDIBELLA COOPERATIVA AGRICOLA", email: "" },
  { nome: "VALLE DELLA VERSA SRL", email: "" },
  { nome: "VALLEBELBO S.C.A.", email: "" },
  { nome: "VALLEPICCIOLA S.R.L. Soc.Agricola", email: "" },
  { nome: "VELENOSI s.r.l.", email: "" },
  { nome: "VERMENA di Simone Pizzato", email: "" },
  { nome: "VIGNETI DI ETTORE Soc. Agr. Semplice", email: "" },
  { nome: "VILLA FONTANA Soc. Agr. srl", email: "" },
  { nome: "VILLA FRANCIACORTA di Bianchi Alessandro", email: "alessandro@villafranciacorta.it, fornitori@villafranciacorta.it" },
  { nome: "VILLA MATILDE s.s.", email: "" },
  { nome: "VINCENZO MUNì", email: "" },
  { nome: "VITE COLTE Spa", email: "" },
  { nome: "Viticultori Lariani Sca", email: "bennatoluca@gmail.com" },
  { nome: "VIVALLIS S.C.A.", email: "" },
  { nome: "WALDNER JOSEF LANDWIRTSCHAFT", email: "" },
  { nome: "WANELA MANOR DI EMANUELA NOVELLO", email: "" },
  { nome: "WEINBERGHOF ROMEN", email: "" },
  { nome: "WEINGUT PFOESTL SNC DI GEORG WEGER & CO.", email: "info@weingutpfoestl.com" },
  { nome: "Weingut Steinhaus srl", email: "" },
  { nome: "LE TRE TALESTRI SOC.AGRICOLA", email: "info@talestri.com" },
  { nome: "SARTIRANO FIGLI CANTINE E VIGNETI SRL", email: "" },
  { nome: "Moncalisse Soc. Agr. A.r.l.", email: "s.bolognani@walch.it, contabilita@walch.it" },
  { nome: "AZ.AGR. TURRA", email: "vittoria.barbieri@turrafranciacorta.it" },
  { nome: "FERIE", email: "lavorazionisoluzioni@oenoitalia.com, soluzioni@oenoitalia.com" },
  { nome: "CA' DEL VENT Società Agricola S.r.l", email: "f.faliva@cadelvent.com" },
  { nome: "Zadra Alcide S.r.l.", email: "commerciale@zadralcide.it, andrea.zadra@zadralcide.it" },
  { nome: "Cadore Patrizia Soc. Agr.", email: "info@vinicadore.com, luigibiemmi1960@gmail.com" },
  { nome: "SICILIA", email: "" },
  { nome: "CANTINA LUNAE", email: "diego.bosoni@cantinelunae.com, francesca.vigo@cantinelunae.com" },
  { nome: "MEDICI ERMETE", email: "gabriele@medici.it" },
  { nome: "Azienda Agricola Contrada Palui S.S. Agr", email: "info@marcosignorinienologo.it, hkp@contradapalui.com" },
  { nome: "CASTELLO DI SPESSA", email: "" },
  { nome: "CANTINE RIUNITE", email: "igiannotti@riuniteciv.it, mgiacomazzi@riunite.it, ecampani@riunite.it" },
  { nome: "Soc. Agr. Savoldi s.r.l.", email: "info@savoldifranciacorta.it" },
  { nome: "IVONNE BELOTTI", email: "lacarossagrumello@gmail.com" },
  { nome: "VILLA DEGLI OLMI SPA", email: "thomas.zocca@villadegliolmi.it, anna.castello@villadegliolmi.it" },
  { nome: "TERRANOVA SRL", email: "info@terredisanrocco.it" },
  { nome: "TENUTA VOLPARE SOC.AGR. SRL", email: "info@tenutavolpare.com" },
  { nome: "GIARDINI CONTI THUN SOC. AGR. A.R.L.", email: "cristian.lavello@thun.it" },
  { nome: "VALLE ISARCO", email: "stefan.dona@eisacktalerkellerei.it" },
  { nome: "Az. Agr. TENUTA MASO CORNO", email: "info@tenutamasocorno.it" },
  { nome: "GRUPPO ITALIANO VINI S.p.A.", email: "P.Berte@giv.it" },
  { nome: "AZ AGR I CAMPI", email: "export@icampi.it" },
  { nome: "SANDRO DE BRUNO", email: "accoglienza@sandrodebruno.it, info@sandrodebruno.it" },
  { nome: "CANTINE RIUNITE - MASCHIO", email: "ggava.maschio@riuniteciv.it, mbrescacin@riuniteciv.iT" },
];

// Testo del corpo della mail inviata al cliente col PDF allegato.
function testoEmailCliente({ filename, lavorazioneLabel, cliente, data, hub }) {
  if (hub) {
    return `Buongiorno,\n\nin allegato il rapportino ${lavorazioneLabel || ""} del cliente ${cliente || ""}${data ? ` (${data})` : ""}.\n\nCordiali saluti.`;
  }
  return `Gentile Cliente,\n\nLa ringraziamo per la collaborazione.\n\nIn allegato trova il rapportino di chiusura della giornata.\n\nCordiali saluti e buon lavoro.`;
}

const LAVORAZIONI = [
  { id: "tiraggio", label: "Tiraggio", cifra: "01" },
  { id: "sboccatura", label: "Sboccatura", cifra: "02" },
  { id: "sboccatura-confezionamento", label: "Sboccatura + Confezionamento", cifra: "03" },
  { id: "confezionamento", label: "Confezionamento", cifra: "04" },
  { id: "imbottigliamento", label: "Imbottigliamento", cifra: "05" },
  { id: "imbottigliamento-confezionamento", label: "Imbottigliamento + Confezionamento", cifra: "06" },
  { id: "travaso", label: "Travaso", cifra: "07" },
  { id: "altri", label: "Altri lavori", cifra: "08" },
  { id: "sboccatura-hub", label: "Sboccatura Hub", cifra: "09", hub: true },
  { id: "confezionamento-hub", label: "Confezionamento Hub", cifra: "10", hub: true },
  { id: "sboccatura-confezionamento-hub", label: "Sboccatura + Confezionamento Hub", cifra: "11", hub: true },
];

// Nome della lavorazione "di base" di un rapportino archiviato: le versioni
// Hub contano nei contatori come quelle normali; "Sboccatura + Confezionamento
// Hub" conta come Sboccatura (una sola volta, non due).
function lavorazioneBase(etichetta) {
  return String(etichetta || "")
    .replace(/ Hub$/, "")
    .replace(/^Sboccatura \+ Confezionamento$/, "Sboccatura")
    .replace(/^Imbottigliamento \+ Confezionamento$/, "Imbottigliamento");
}

const HAS_FULL_MASK = new Set([
  "tiraggio",
  "sboccatura",
  "imbottigliamento",
  "confezionamento",
  "travaso",
  "sboccatura-hub",
  "confezionamento-hub",
  "sboccatura-confezionamento-hub",
  "sboccatura-confezionamento",
  "imbottigliamento-confezionamento",
]);

// Destinatari fissi dei rapportini "Hub" (al posto dell'email del cliente)
const HUB_DESTINATARI = [
  "Cantina@oenoitalia.com",
  "Vezzoli@oenoitalia.com",
  "Assistente.faustini@oenoitalia.com",
].join(", ");

// Griglia controlli: ogni 15 minuti dalle 7:00 alle 18:00
function buildControlSlots() {
  const slots = [];
  for (let h = 7; h <= 18; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 18 && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}
const CONTROL_SLOTS = buildControlSlots();

function emptyControlRows() {
  return CONTROL_SLOTS.map((t) => ({
    ora: t,
    bottiglieProdotte: "",
    livello: "",
    dosaggio: "",
    inserimentoTappo: "",
    integritaTappo: false,
    posizionamentoGabbietta: false,
    bidule: false,
    chiusura: false,
    // colonne usate solo nel foglio Imbottigliamento
    // colonne usate solo nel foglio Tiraggio (la presenza bidule è `bidule`)
    conformi: false,
    nonConformi: false,
    filtrazioneBar: "",
    verificaDosaggio: false,
    tappoRaso: false,
    presenzaVuoto: false,
    // colonne usate solo nel foglio Confezionamento
    capsula: false,
    fronte: false,
    retro: false,
    collare: false,
    fascetta: false,
    lotto: false,
  }));
}

function emptyProdotto() {
  return {
    vino: "",
    bio: false,
    lottoVino: "",
    // Solo Imbottigliamento: "Servizi accessori" (Sì / No + testo) per vino
    serviziImbott: {},
    tappoTipo: "",
    tappoMarca: "",
    tappoLotto: "",
    gabbiettaTipo: "",
    gabbiettaMarca: "",
    gabbiettaLotto: "",
    liqueurDosaggio: "",
    liqueurFiltrazione: "",
    sedimento: "",
    bottFormato: "",
    bottLotto: "",
    bottiglieFatte: "", // colonna "Bottiglia"
    qtaMagnum: "",
    qtaAltro: "",
    incartonamento: false, // solo Confezionamento
    incartonamentoTipo: "", // solo Confezionamento
    // Solo Sboccatura: paragrafo dopo i controlli di linea, uno per ogni vino
    bottigliePerColmatura: "",
    bottiglieRotte: "",
    // "Registro rotture vetri (oPRP)" — tutti i vini di tutti i rapportini
    // completi (PT 8.5.3): 4 righe rotte/segregate, note, conferma assenza vetro
    registroVetri: [
      { rotte: "", segregate: "" },
      { rotte: "", segregate: "" },
      { rotte: "", segregate: "" },
      { rotte: "", segregate: "" },
    ],
    registroVetriNote: "",
    okAssentiVetro: false,
    // Solo Travaso (foglio cartaceo): dati prodotto, materiali, lotto bottiglie
    // e sovrapressione, uno per ogni vino
    quantita: "",
    capacita: "",
    bottigliePerse: "",
    lottoBottiglie: "",
    materialiTravaso: [0, 1, 2, 3, 4, 5].map(() => ({ nome: "", lotto: "", quantita: "" })),
    sovrapressionePartenza: "",
    aerometroInizio: false,
    aerometroMeta: false,
    aerometroFine: false,
    sovrapressioneFinale: "",
    note: "",
    controlli: emptyControlRows(),
    // "Controlli di processo" — Confezionamento e Sboccatura, uno per ogni
    // vino (righe diverse per lavorazione, vedi RIGHE_CONTROLLI_PROCESSO)
    controlliProcesso: {
      posizionamentoCapsule: "",
      posizionamentoEtichette: "",
      timbraturaLotto: "",
      imballaggio: "",
      avvinamentoLiqueur: "",
      dosaggioLiqueur: "",
      livelloRiempimento: "",
      chiusuraTappi: "",
      chiusuraGabbiette: "",
      lavaggioBottiglie: "",
      // solo Imbottigliamento
      avvinamentoPreAvvio: "",
      integritaCarter: "",
      pressioneSciacquatrice: "",
      deltaPressioneFiltri: "",
      ugelliSciacquatrice: "",
    },
  };
}

function emptyFullForm() {
  return {
    cliente: "",
    data: "",
    sanificazione: false,
    // "Servizi accessori" — solo Sboccatura, 3 caselle indipendenti
    serviziAccessori: {
      filtrazioneLiqueur: false,
      filtrazioneTipo: "",
      filtrazioneLotto: "",
      jetting: false,
      fornituraMateriali: false,
      fornituraMaterialiNote: "",
    },
    // "Controlli pre-operativi impianto/attrezzatura" — Confezionamento e
    // Sboccatura (righe diverse per lavorazione, vedi RIGHE_PRE_OPERATIVI)
    controlliPreOperativi: {
      verificaPulizia: "",
      assenzaPartiDanneggiate: "",
      puliziaBottiglia: "",
      conformitaCapsule: "",
      conformitaEtichette: "",
      sanificazioneConforme: "",
      // solo Imbottigliamento
      vaporizzazionePreAvvio: "",
      vaporizzazionePreAvvioInizio: "",
      vaporizzazionePreAvvioFine: "",
      pressioneSciacquatrice: "",
      deltaPressioneFiltri: "",
      ugelliSciacquatrice: "",
    },
    prodotti: [emptyProdotto()],
    // Solo Imbottigliamento: fasi di lavorazione (Sì / No), dopo "Sanificazione"
    fasiImbottigliamento: {
      risciacquoBottiglie: "",
      soffiaggioBottiglie: "",
      filtrazioneCartoni: "",
      filtrazioneCartuccia: "",
      dosaggioGommaArabica: "",
      prevaquazione: "",
      vuotoImmissAzoto: "",
    },
    // Note libere + foto (dopo "Quantità bottiglie fatte")
    noteFinali: "",
    foto: [],
  };
}

// Legge una foto scelta dall'operatore, la riduce (max 1000px sul lato lungo)
// e la restituisce come JPEG in base64: così bozza, PDF e archivio restano leggeri.
function riduciFoto(file, maxLato = 1000, qualita = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lettura foto non riuscita"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Foto non valida"));
      img.onload = () => {
        const scala = Math.min(1, maxLato / Math.max(img.width, img.height));
        const w = Math.round(img.width * scala);
        const h = Math.round(img.height * scala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", qualita), w, h });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function emptyAltriForm() {
  return { cliente: "", data: "", vino: "", note: "" };
}

// Una bozza salvata prima dell'aggiunta di un campo nuovo (es. "bottiglie
// prodotte", le tabelle "Conforme/Non conforme" di Confezionamento) non ha
// quella proprietà: senza questa funzione, riaprendola dà pagina bianca
// perché il componente legge un valore undefined. Qui si riempiono solo i
// pezzi mancanti, senza toccare quello che l'operatore aveva già scritto.
function formConDefaultSicuri(formSalvato, full) {
  const base = full ? emptyFullForm() : emptyAltriForm();
  if (!formSalvato) return base;
  if (!full) return { ...base, ...formSalvato };

  const prodottiSalvati =
    Array.isArray(formSalvato.prodotti) && formSalvato.prodotti.length > 0
      ? formSalvato.prodotti
      : base.prodotti;

  return {
    ...base,
    ...formSalvato,
    controlliPreOperativi: {
      ...base.controlliPreOperativi,
      ...(formSalvato.controlliPreOperativi || {}),
    },
    serviziAccessori: {
      ...base.serviziAccessori,
      ...(formSalvato.serviziAccessori || {}),
    },
    prodotti: prodottiSalvati.map((p) => {
      const pBase = emptyProdotto();
      const righeBase = pBase.controlli;
      const righeSalvate = Array.isArray(p?.controlli) ? p.controlli : righeBase;
      return {
        ...pBase,
        ...p,
        controlliProcesso: {
          ...pBase.controlliProcesso,
          ...(p?.controlliProcesso || {}),
        },
        serviziImbott: { ...(p?.serviziImbott || {}) },
        controlli: righeBase.map((rigaBase, i) => ({
          ...rigaBase,
          ...(righeSalvate[i] || {}),
        })),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Firma — pad a canvas, nessuna libreria esterna
// ---------------------------------------------------------------------------
function SignaturePad({ label, value, onChange, nome, onNomeChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#EDE8DD";
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, [value]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: ((t.clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((t.clientY - rect.top) / rect.height) * canvasRef.current.height,
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL());
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={styles.fieldLabel}>{label}</span>
        <button type="button" onClick={clear} style={styles.linkBtn}>
          cancella
        </button>
      </div>
      <input
        type="text"
        value={nome}
        onChange={(e) => onNomeChange(e.target.value)}
        placeholder="Nome e cognome"
        style={styles.input}
      />
      <canvas
        ref={canvasRef}
        width={700}
        height={250}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={styles.sigCanvas}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabella controlli — rotolo di rilevazioni ogni 15'
// ---------------------------------------------------------------------------
// Righe delle tabelle "Conforme / Non conforme / N.Applic.", diverse per
// lavorazione (solo Confezionamento e Sboccatura le usano).
const RIGHE_PRE_OPERATIVI = {
  confezionamento: [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    { key: "puliziaBottiglia", label: "Pulizia bottiglia" },
    { key: "conformitaCapsule", label: "Conformità capsule" },
    { key: "conformitaEtichette", label: "Conformità etichette" },
  ],
  sboccatura: [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    { key: "sanificazioneConforme", label: "Sanificazione" },
  ],
  imbottigliamento: [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    {
      key: "sanificazioneConforme",
      label: "Sanificazione",
      nota: "(Risciacquo con acqua, invaso e allagamento con formulato igienizzante, risciacquo)",
    },
    {
      key: "vaporizzazionePreAvvio",
      label: "Vaporizzazione pre-avvio",
      nota: "20' di vapore fluente 100°C",
      orari: true,
    },
    {
      key: "pressioneSciacquatrice",
      label: "Verifica pressione di esercizio della sciacquatrice ≥ 1,5 bar * (oPRP)",
      nota: "Se valore non rispettato verificare il corretto funzionamento dell'impianto prima dell'inizio delle lavorazioni",
    },
    {
      key: "deltaPressioneFiltri",
      label: "Verifica Δ pressione filtri sciacquatrice",
      nota: "(Δ max 1,2 bar)",
    },
    {
      key: "ugelliSciacquatrice",
      label: "Verifica corretto funzionamento ugelli sciacquatrice",
    },
  ],
  "sboccatura-confezionamento": [
    { key: "verificaPulizia", label: "Verifica pulizia" },
    { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
    { key: "puliziaBottiglia", label: "Pulizia bottiglia" },
    { key: "conformitaCapsule", label: "Conformità capsule" },
    { key: "conformitaEtichette", label: "Conformità etichette" },
    { key: "sanificazioneConforme", label: "Sanificazione" },
  ],
};

// Travaso (foto del foglio): pre-operativi e controlli di processo
RIGHE_PRE_OPERATIVI.travaso = [
  { key: "puliziaLinea", label: "Pulizia linea" },
  { key: "assenzaPartiDanneggiate", label: "Assenza parti danneggiate" },
  { key: "sanificazioneConforme", label: "Sanificazione" },
  { key: "vaporizzazionePreAvvio", label: "Vaporizzazione pre-avvio" },
];
// Tiraggio: stessi controlli pre-operativi dell'Imbottigliamento (foto del foglio)
RIGHE_PRE_OPERATIVI.tiraggio = RIGHE_PRE_OPERATIVI.imbottigliamento;
// Imbottigliamento + Confezionamento: righe dell'Imbottigliamento + quelle di
// Confezionamento (pulizia bottiglia, capsule, etichette)
RIGHE_PRE_OPERATIVI["imbottigliamento-confezionamento"] = [
  ...RIGHE_PRE_OPERATIVI.imbottigliamento,
  ...RIGHE_PRE_OPERATIVI.confezionamento.slice(2),
];

const RIGHE_CONTROLLI_PROCESSO = {
  confezionamento: [
    { key: "posizionamentoCapsule", label: "Posizionamento capsule" },
    { key: "posizionamentoEtichette", label: "Posizionamento etichette" },
    { key: "timbraturaLotto", label: "Timbratura lotto" },
    { key: "imballaggio", label: "Imballaggio" },
  ],
  sboccatura: [
    { key: "avvinamentoLiqueur", label: "Avvinamento liqueur" },
    { key: "dosaggioLiqueur", label: "Dosaggio liqueur" },
    { key: "livelloRiempimento", label: "Livello di riempimento" },
    { key: "chiusuraTappi", label: "Chiusura tappi" },
    { key: "chiusuraGabbiette", label: "Chiusura gabbiette" },
    { key: "lavaggioBottiglie", label: "Lavaggio bottiglie" },
  ],
  imbottigliamento: [
    { key: "avvinamentoPreAvvio", label: "Avvinamento pre-avvio" },
    { key: "chiusuraTappi", label: "Chiusura tappi" },
    { key: "livelloRiempimento", label: "Livello di riempimento" },
    { key: "integritaCarter", label: "Integrità carter" },
    {
      key: "pressioneSciacquatrice",
      label: "Verifica pressione di esercizio della sciacquatrice ≥ 1,5 bar (oPRP)",
      nota: "Se valore non rispettato interrompere le lavorazioni e verificare il corretto funzionamento dell'impianto prima del riavvio",
    },
    {
      key: "deltaPressioneFiltri",
      label: "Verifica Δ pressione filtri sciacquatrice",
      nota: "(Δ max 1,2 bar)",
    },
    {
      key: "ugelliSciacquatrice",
      label: "Verifica corretto funzionamento ugelli sciacquatrice",
    },
  ],
  "sboccatura-confezionamento": [
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

// Tiraggio: controlli di processo (foto del foglio) — stesse righe
// dell'Imbottigliamento, con "Timbratura lotto su tappi" al posto di "Integrità carter"
RIGHE_CONTROLLI_PROCESSO.travaso = [
  { key: "temperaturaProdotto", label: "Temperatura prodotto" },
  { key: "valorePressione", label: "Valore pressione" },
  { key: "livelloRiempimento", label: "Livello di riempimento" },
  { key: "chiusuraTappi", label: "Chiusura tappi" },
  { key: "chiusuraGabbiette", label: "Chiusura gabbiette" },
];
RIGHE_CONTROLLI_PROCESSO["imbottigliamento-confezionamento"] = [
  ...RIGHE_CONTROLLI_PROCESSO.imbottigliamento,
  ...RIGHE_CONTROLLI_PROCESSO.confezionamento,
];
RIGHE_CONTROLLI_PROCESSO.tiraggio = [
  { key: "avvinamentoPreAvvio", label: "Avvinamento pre-avvio" },
  { key: "chiusuraTappi", label: "Chiusura tappi" },
  { key: "livelloRiempimento", label: "Livello di riempimento" },
  { key: "timbraturaLotto", label: "Timbratura lotto su tappi" },
  ...RIGHE_CONTROLLI_PROCESSO.imbottigliamento.slice(4),
];

// ---------------------------------------------------------------------------
// Tabella "Conforme / Non conforme / N.Applic." a scelta singola per riga.
// Usata per i controlli pre-operativi e i controlli di processo.
const OPZIONI_CONFORME = [
  { value: "conforme", label: "Conforme" },
  { value: "nonConforme", label: "Non conforme" },
  { value: "nApplic", label: "N.Applic." },
];

// Fasi di lavorazione dell'Imbottigliamento (tabella a due colonne Sì / No)
const OPZIONI_SI_NO = [
  { value: "si", label: "Sì" },
  { value: "no", label: "No" },
];
const RIGHE_FASI_IMBOTTIGLIAMENTO = [
  { key: "risciacquoBottiglie", label: "Risciacquo bottiglie" },
  { key: "soffiaggioBottiglie", label: "Soffiaggio bottiglie aria-azoto" },
  { key: "filtrazioneCartoni", label: "Filtrazione cartoni", testo: true },
  { key: "filtrazioneCartuccia", label: "Filtrazione cartuccia", testo: true },
  { key: "dosaggioGommaArabica", label: "Dosaggio gomma arabica", testo: true },
  { key: "prevaquazione", label: "Prevaquazione" },
  { key: "vuotoImmissAzoto", label: "Vuoto con immis. azoto" },
];

// Travaso: "Servizi accessori" per vino (Sì / No) e materiali (lotto + quantità)
const RIGHE_SERVIZI_TRAVASO = [
  { key: "filtrazioneLiqueur", label: "Filtrazione liqueur" },
  { key: "svuotamentoBottiglie", label: "Svuotamento bottiglie" },
  { key: "dosaggioManualeLiqueur", label: "Dosaggio manuale liqueur" },
  { key: "livelloRiempimentoServizio", label: "Livello riempimento" },
  { key: "pressioneRiempitrice", label: "Pressione riempitrice" },
];
// Le prime tre righe dei materiali hanno il nome fisso, le altre sono libere
const MATERIALI_TRAVASO_FISSI = ["Filtri cartone Becopad 450", "Tappi a fungo", "Gabbiette"];

// Tiraggio: "Servizi accessori" per vino (Sì / No + testo), come Imbottigliamento
const RIGHE_SERVIZI_TIRAGGIO = [
  { key: "filtrazioneCartuccia", label: "Filtrazione cartuccia", testo: true },
  { key: "dosaggioLieviti", label: "Dosaggio lieviti", testo: true },
];

function TabellaControlliConforme({ titolo, righe, valori, onChange, opzioni = OPZIONI_CONFORME }) {
  return (
    <div style={styles.qtaBlock}>
      <div style={styles.sectionLabel}>{titolo}</div>
      <div style={styles.qtaTable}>
        <div style={styles.qtaHead}>
          <span style={{ flex: 1 }}>tipo controllo</span>
          {opzioni.map((o) => (
            <span key={o.value} style={styles.qtaColHead}>
              {o.label}
            </span>
          ))}
        </div>
        {righe.map((r) => (
          <div key={r.key} style={styles.controlRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.qtaLabel}>{r.label}</span>
              {r.nota && (
                <div style={{ fontSize: 11.5, fontStyle: "italic", color: COLORS.textMuted, marginTop: 2 }}>
                  {r.nota}
                </div>
              )}
              {r.testo && (
                <input
                  type="text"
                  placeholder="scrivi qui"
                  value={valori[`${r.key}Testo`] || ""}
                  onChange={(e) =>
                    onChange({ ...valori, [`${r.key}Testo`]: e.target.value })
                  }
                  style={{ ...styles.input, padding: "6px 8px", marginTop: 6 }}
                />
              )}
              {r.orari && (
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {[["Inizio", "Inizio"], ["Fine", "Fine"]].map(([et, suf]) => (
                    <label key={suf} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMuted }}>
                      Ora {et.toLowerCase()}
                      <input
                        type="time"
                        value={valori[`${r.key}${suf}`] || ""}
                        onChange={(e) =>
                          onChange({ ...valori, [`${r.key}${suf}`]: e.target.value })
                        }
                        style={{ ...styles.input, padding: "6px 8px", width: 104 }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
            {opzioni.map((o) => (
              <label key={o.value} style={{ ...styles.checkCell, width: 62 }}>
                <input
                  type="checkbox"
                  checked={valori[r.key] === o.value}
                  onChange={() =>
                    onChange({
                      ...valori,
                      [r.key]: valori[r.key] === o.value ? "" : o.value,
                    })
                  }
                  style={styles.checkbox}
                />
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Colonne della tabella combinata (Sboccatura + 6 spunte di Confezionamento)
const stileGrigliaCombinato = {
  gridTemplateColumns: "64px 76px 1fr 1fr 70px 70px 1fr repeat(6, 60px)",
};

function ControlTable({ rows, onChange, tiraggio, confezionamento, semplice, combinato, vetri, imbottigliamento }) {
  const update = (idx, patch) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const filledCount = tiraggio
    ? rows.filter((r) => r.bottiglieProdotte !== "" || r.livello !== "").length
    : imbottigliamento
    ? rows.filter(
        (r) => r.bottiglieProdotte !== "" || r.filtrazioneBar !== "" || r.livello !== ""
      ).length
    : confezionamento
    ? rows.filter(
        (r) => r.capsula || r.fronte || r.retro || r.collare || r.fascetta || r.lotto
      ).length
    : rows.filter((r) => r.livello !== "").length;

  return (
    <div style={styles.controlBlock}>
      <div style={styles.controlHeaderRow}>
        <div>
          <div style={styles.sectionLabel}>Controlli di linea</div>
          <div style={styles.sectionSub}>
            rilevazione ogni 15 minuti · 07:00 – 18:00
          </div>
        </div>
        <div style={styles.controlProgress}>
          {filledCount}/{rows.length}
        </div>
      </div>

      {tiraggio ? (
        <div style={styles.controlTableWrap}>
          <div style={styles.controlTableScrollX}>
            <div
              style={{
                ...styles.controlTableHead,
                ...styles.gridSemplice,
                gridTemplateColumns: "64px 76px 64px 64px 64px 1fr",
                minWidth: 560,
              }}
            >
              <span>ora</span>
              <span>bottiglie prodotte</span>
              <span style={{ textAlign: "center" }}>conformi</span>
              <span style={{ textAlign: "center" }}>non conformi</span>
              <span style={{ textAlign: "center" }}>presenza bidule</span>
              <span>valore riscontrato (mm)</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.ora}
                style={{
                  ...styles.controlRow,
                  ...styles.gridSemplice,
                  gridTemplateColumns: "64px 76px 64px 64px 64px 1fr",
                  minWidth: 560,
                  background:
                    r.bottiglieProdotte !== "" || r.livello !== ""
                      ? "rgba(201,162,39,0.06)"
                      : "transparent",
                }}
              >
                <span style={styles.controlTime}>{r.ora}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={r.bottiglieProdotte}
                  onChange={(e) => update(i, { bottiglieProdotte: e.target.value })}
                  style={{ ...styles.controlInput, width: "100%" }}
                />
                {["conformi", "nonConformi", "bidule"].map((c) => (
                  <label key={c} style={{ ...styles.checkCell, width: "auto" }}>
                    <input
                      type="checkbox"
                      checked={!!r[c]}
                      onChange={(e) => update(i, { [c]: e.target.checked })}
                      style={styles.checkbox}
                    />
                  </label>
                ))}
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={r.livello}
                  onChange={(e) => update(i, { livello: e.target.value })}
                  style={{ ...styles.controlInput, width: "100%" }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : imbottigliamento ? (
        <div style={styles.controlTableWrap}>
          <div style={styles.controlTableScrollX}>
            <div
              style={{
                ...styles.controlTableHead,
                ...styles.gridSemplice,
                gridTemplateColumns: combinato
                  ? "64px 76px 1fr 70px 70px 70px 70px 1fr repeat(6, 60px)"
                  : "64px 76px 1fr 70px 70px 70px 70px 1fr",
                minWidth: combinato ? 1120 : 760,
              }}
            >
              <span>ora</span>
              <span>bottiglie prodotte</span>
              <span>filtrazione (bar ≤ 0,8)</span>
              <span style={{ textAlign: "center" }}>verifica dosaggio</span>
              <span style={{ textAlign: "center" }}>tappo raso</span>
              <span style={{ textAlign: "center" }}>integr. tappo</span>
              <span style={{ textAlign: "center" }}>presenza vuoto</span>
              <span>livello riempimento (mm)</span>
              {combinato &&
                ["capsula", "fronte", "retro", "collare", "fascetta", "lotto"].map((c) => (
                  <span key={c} style={{ textAlign: "center" }}>{c}</span>
                ))}
            </div>
            {rows.map((r, i) => (
              <div
                key={r.ora}
                style={{
                  ...styles.controlRow,
                  ...styles.gridSemplice,
                  gridTemplateColumns: combinato
                    ? "64px 76px 1fr 70px 70px 70px 70px 1fr repeat(6, 60px)"
                    : "64px 76px 1fr 70px 70px 70px 70px 1fr",
                  minWidth: combinato ? 1120 : 760,
                  background:
                    r.bottiglieProdotte !== "" || r.filtrazioneBar !== "" || r.livello !== ""
                      ? "rgba(201,162,39,0.06)"
                      : "transparent",
                }}
              >
                <span style={styles.controlTime}>{r.ora}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={r.bottiglieProdotte}
                  onChange={(e) => update(i, { bottiglieProdotte: e.target.value })}
                  style={{ ...styles.controlInput, width: "100%" }}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="—"
                  value={r.filtrazioneBar}
                  onChange={(e) => update(i, { filtrazioneBar: e.target.value })}
                  style={{ ...styles.controlInput, width: "100%" }}
                />
                {["verificaDosaggio", "tappoRaso", "integritaTappo", "presenzaVuoto"].map((c) => (
                  <label key={c} style={{ ...styles.checkCell, width: "auto" }}>
                    <input
                      type="checkbox"
                      checked={!!r[c]}
                      onChange={(e) => update(i, { [c]: e.target.checked })}
                      style={styles.checkbox}
                    />
                  </label>
                ))}
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={r.livello}
                  onChange={(e) => update(i, { livello: e.target.value })}
                  style={{ ...styles.controlInput, width: "100%" }}
                />
                {combinato &&
                  ["capsula", "fronte", "retro", "collare", "fascetta", "lotto"].map((c) => (
                    <label key={c} style={{ ...styles.checkCell, width: "auto" }}>
                      <input
                        type="checkbox"
                        checked={!!r[c]}
                        onChange={(e) => update(i, { [c]: e.target.checked })}
                        style={styles.checkbox}
                      />
                    </label>
                  ))}
              </div>
            ))}
          </div>
        </div>
      ) : confezionamento ? (
        <div style={styles.controlTableWrap}>
          <div style={styles.controlTableHead}>
            <span style={{ width: 64 }}>ora</span>
            <span style={{ width: 76 }}>bottiglie prodotte</span>
            <span style={{ flex: 1, textAlign: "center" }}>capsula</span>
            <span style={{ flex: 1, textAlign: "center" }}>fronte</span>
            <span style={{ flex: 1, textAlign: "center" }}>retro</span>
            <span style={{ flex: 1, textAlign: "center" }}>collare</span>
            <span style={{ flex: 1, textAlign: "center" }}>fascetta</span>
            <span style={{ flex: 1, textAlign: "center" }}>lotto</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.ora}
              style={{
                ...styles.controlRow,
                background:
                  r.capsula || r.fronte || r.retro || r.collare || r.fascetta || r.lotto
                    ? "rgba(201,162,39,0.06)"
                    : "transparent",
              }}
            >
              <span style={styles.controlTime}>{r.ora}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.bottiglieProdotte}
                onChange={(e) =>
                  update(i, { bottiglieProdotte: e.target.value })
                }
                style={{ ...styles.controlInput, width: 76, flex: "none" }}
              />
              {["capsula", "fronte", "retro", "collare", "fascetta", "lotto"].map(
                (campo) => (
                  <label key={campo} style={{ ...styles.checkCell, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={r[campo]}
                      onChange={(e) => update(i, { [campo]: e.target.checked })}
                      style={styles.checkbox}
                    />
                  </label>
                )
              )}
            </div>
          ))}
        </div>
      ) : semplice ? (
        // Sboccatura: ordine esatto richiesto — ora, bottiglie prodotte,
        // dosaggio liqueur, inserimento tappo, integrità tappo (flag),
        // posizionamento gabbietta (flag), livello riempimento.
        // Griglia CSS a colonne fisse: stessa definizione per intestazione e
        // righe, così le caselle non possono più finire sotto la colonna
        // sbagliata (bug visto con flexbox).
        <div style={styles.controlTableWrap}>
          {/* Intestazione e righe scorrono INSIEME in orizzontale (un unico
              contenitore con overflowX): su schermi stretti la tabella è più
              larga della pagina, e senza questo le due parti possono
              scrollare in modo indipendente/incoerente — è quello che
              causava i flag che sembravano sotto la colonna sbagliata. */}
          <div style={styles.controlTableScrollX}>
            <div
              style={{
                ...styles.controlTableHead,
                ...styles.gridSemplice,
                ...(combinato ? stileGrigliaCombinato : null),
                minWidth: combinato ? 1060 : 660,
              }}
            >
              <span>ora</span>
              <span>bottiglie prodotte</span>
              <span>dosaggio liqueur (ml)</span>
              <span>inserimento tappo (mm)</span>
              <span style={{ textAlign: "center" }}>integr. tappo</span>
              <span style={{ textAlign: "center" }}>posiz. gabbietta</span>
              <span>livello riempimento (mm)</span>
              {combinato &&
                ["capsula", "fronte", "retro", "collare", "fascetta", "lotto"].map((c) => (
                  <span key={c} style={{ textAlign: "center" }}>{c}</span>
                ))}
            </div>
            {rows.map((r, i) => (
              <div
                key={r.ora}
                style={{
                  ...styles.controlRow,
                  ...styles.gridSemplice,
                  ...(combinato ? stileGrigliaCombinato : null),
                  minWidth: combinato ? 1060 : 660,
                  background: r.livello !== "" ? "rgba(201,162,39,0.06)" : "transparent",
                }}
              >
              <span style={styles.controlTime}>{r.ora}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.bottiglieProdotte}
                onChange={(e) =>
                  update(i, { bottiglieProdotte: e.target.value })
                }
                style={{ ...styles.controlInput, width: "100%" }}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.dosaggio}
                onChange={(e) => update(i, { dosaggio: e.target.value })}
                style={{ ...styles.controlInput, width: "100%" }}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.inserimentoTappo}
                onChange={(e) => update(i, { inserimentoTappo: e.target.value })}
                style={{ ...styles.controlInput, width: "100%" }}
              />
              <label style={{ ...styles.checkCell, width: "auto" }}>
                <input
                  type="checkbox"
                  checked={r.integritaTappo}
                  onChange={(e) =>
                    update(i, { integritaTappo: e.target.checked })
                  }
                  style={styles.checkbox}
                />
              </label>
              <label style={{ ...styles.checkCell, width: "auto" }}>
                <input
                  type="checkbox"
                  checked={r.posizionamentoGabbietta}
                  onChange={(e) =>
                    update(i, { posizionamentoGabbietta: e.target.checked })
                  }
                  style={styles.checkbox}
                />
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.livello}
                onChange={(e) => update(i, { livello: e.target.value })}
                style={{ ...styles.controlInput, width: "100%" }}
              />
              {combinato &&
                ["capsula", "fronte", "retro", "collare", "fascetta", "lotto"].map((c) => (
                  <label key={c} style={{ ...styles.checkCell, width: "auto" }}>
                    <input
                      type="checkbox"
                      checked={!!r[c]}
                      onChange={(e) => update(i, { [c]: e.target.checked })}
                      style={styles.checkbox}
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={styles.controlTableWrap}>
          <div style={styles.controlTableHead}>
            <span style={{ width: 64 }}>ora</span>
            <span style={{ width: 76 }}>bottiglie prodotte</span>
            <span style={{ flex: 1 }}>livello (mm)</span>
            <span style={{ flex: 1 }}>dosaggio (ml)</span>
            <span style={{ flex: 1 }}>inser. tappo (mm)</span>
            <span style={{ width: 76, textAlign: "center" }}>bidule</span>
            <span style={{ width: 76, textAlign: "center" }}>tappo</span>
            <span style={{ width: 76, textAlign: "center" }}>integr. tappo</span>
            <span style={{ width: 76, textAlign: "center" }}>
              {tiraggio ? "posiz. bidule" : vetri ? "vetri" : "gabbietta"}
            </span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.ora}
              style={{
                ...styles.controlRow,
                background: r.livello !== "" ? "rgba(201,162,39,0.06)" : "transparent",
              }}
            >
              <span style={styles.controlTime}>{r.ora}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.bottiglieProdotte}
                onChange={(e) =>
                  update(i, { bottiglieProdotte: e.target.value })
                }
                style={{ ...styles.controlInput, width: 76, flex: "none" }}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.livello}
                onChange={(e) => update(i, { livello: e.target.value })}
                style={styles.controlInput}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.dosaggio}
                onChange={(e) => update(i, { dosaggio: e.target.value })}
                style={styles.controlInput}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={r.inserimentoTappo}
                onChange={(e) => update(i, { inserimentoTappo: e.target.value })}
                style={styles.controlInput}
              />
              <label style={styles.checkCell}>
                <input
                  type="checkbox"
                  checked={r.bidule}
                  onChange={(e) => update(i, { bidule: e.target.checked })}
                  style={styles.checkbox}
                />
              </label>
              <label style={styles.checkCell}>
                <input
                  type="checkbox"
                  checked={r.chiusura}
                  onChange={(e) => update(i, { chiusura: e.target.checked })}
                  style={styles.checkbox}
                />
              </label>
              <label style={styles.checkCell}>
                <input
                  type="checkbox"
                  checked={r.integritaTappo}
                  onChange={(e) =>
                    update(i, { integritaTappo: e.target.checked })
                  }
                  style={styles.checkbox}
                />
              </label>
              <label style={styles.checkCell}>
                <input
                  type="checkbox"
                  checked={r.posizionamentoGabbietta}
                  onChange={(e) =>
                    update(i, { posizionamentoGabbietta: e.target.checked })
                  }
                  style={styles.checkbox}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home — elenco lavorazioni
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Archivio rapportini — solo amministratori, legge dal database condiviso
// ---------------------------------------------------------------------------
function ArchivioRapportini({ onBack }) {
  const [righe, setRighe] = useState([]);
  const [stato, setStato] = useState("carico"); // carico | ok | errore
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    let annullato = false;
    conRiprovaDiRete(async () => {
      const { data, error } = await supabase
        .from("rapportini")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    })
      .then((data) => {
        if (annullato) return;
        setRighe(data || []);
        setStato("ok");
      })
      .catch((e) => {
        if (annullato) return;
        console.error("Errore lettura archivio:", e.message);
        setStato("errore");
      });
    return () => {
      annullato = true;
    };
  }, []);

  // iPhone/iPad: un link "data:" con download non funziona (soprattutto con
  // l'app installata sulla Home). Si crea quindi un vero file PDF (Blob) e,
  // dove possibile, si apre il foglio di condivisione di iOS ("Salva su File",
  // AirDrop, Mail…); altrimenti si apre il PDF in una scheda.
  const scarica = async (riga) => {
    if (!riga.pdf_base64) return;
    const dataFile = riga.created_at
      ? new Date(riga.created_at).toISOString().slice(0, 10)
      : "rapportino";
    const nomeFile = `${(riga.cliente || "cliente")
      .toLowerCase()
      .replace(/\s+/g, "-")}_${(riga.lavorazione || "rapportino")
      .toLowerCase()
      .replace(/\s+/g, "-")}_${dataFile}.pdf`;

    let blob;
    try {
      const bin = atob(riga.pdf_base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blob = new Blob([bytes], { type: "application/pdf" });
    } catch (e) {
      console.error("PDF non leggibile:", e);
      return;
    }

    const file = new File([blob], nomeFile, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: nomeFile });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // l'utente ha chiuso il foglio
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeFile;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const righeFiltrate = righe.filter((r) => {
    if (!filtro.trim()) return true;
    const t = filtro.toLowerCase();
    return (
      (r.cliente || "").toLowerCase().includes(t) ||
      (r.vino || "").toLowerCase().includes(t) ||
      (r.operatore || "").toLowerCase().includes(t) ||
      (r.lavorazione || "").toLowerCase().includes(t)
    );
  });

  return (
    <div style={styles.formWrap}>
      <div style={styles.formHeader}>
        <button onClick={onBack} style={styles.backBtnGrande}>
          ← Torna alla home
        </button>
        <div style={styles.formTitleRow}>
          <h2 style={styles.formTitle}>Archivio rapportini</h2>
        </div>
      </div>

      <input
        type="text"
        placeholder="Cerca per cliente, vino, operatore, lavorazione..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ ...styles.input, marginBottom: 16 }}
      />

      {stato === "carico" && (
        <p style={{ color: COLORS.textMuted }}>Carico l'archivio…</p>
      )}
      {stato === "errore" && (
        <p style={{ color: "#D98F7A" }}>
          Non riesco a leggere l'archivio (controlla la connessione). Riprova
          tornando indietro e riaprendo.
        </p>
      )}
      {stato === "ok" && righeFiltrate.length === 0 && (
        <p style={{ color: COLORS.textMuted }}>Nessun rapportino trovato.</p>
      )}

      <div style={styles.archivioList}>
        {righeFiltrate.map((r) => (
          <div key={r.id} style={styles.archivioRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.archivioLav}>{r.lavorazione}</div>
              <div style={styles.archivioCliente}>{r.cliente || "—"}</div>
              <div style={styles.archivioMeta}>
                {r.vino ? `${r.vino} · ` : ""}
                {r.operatore || "—"}
                {r.created_at
                  ? " · " +
                    new Date(r.created_at).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </div>
            </div>
            <button
              onClick={() => scarica(r)}
              style={styles.homeBtn}
              disabled={!r.pdf_base64}
            >
              Scarica PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carica rapportino manualmente — per recuperare in archivio un PDF già
// generato e inviato (es. per mancanza di rete al momento del salvataggio),
// senza doverlo compilare di nuovo da zero. Solo amministratori.
// ---------------------------------------------------------------------------
function CaricaManuale({ onBack }) {
  const [lavorazione, setLavorazione] = useState(LAVORAZIONI[0].label);
  const [cliente, setCliente] = useState("");
  const [vino, setVino] = useState("");
  const [operatoreRapportino, setOperatoreRapportino] = useState("");
  const [data, setData] = useState("");
  const [file, setFile] = useState(null);
  const [fileNome, setFileNome] = useState("");
  const [caricando, setCaricando] = useState(false);
  const [esito, setEsito] = useState(""); // "" | "ok" | errore testuale

  const leggiFileComeBase64 = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const puoCaricare =
    cliente.trim().length > 0 && !!file && !caricando;

  const handleCarica = async () => {
    if (!puoCaricare) return;
    setCaricando(true);
    setEsito("");
    try {
      const pdfBase64 = await leggiFileComeBase64(file);
      // Se il PDF è stato generato dall'app, ne leggo bottiglie e magnum
      const quantita = leggiQuantitaDaPdf(pdfBase64);
      await conRiprovaDiRete(async () => {
        const { error } = await supabase.from("rapportini").insert({
          lavorazione,
          cliente,
          vino,
          operatore: operatoreRapportino,
          dettagli: `Data intervento: ${data || "—"} [caricato manualmente]`,
          pdf_base64: pdfBase64,
          bottiglie: quantita ? quantita.bottiglie : null,
          magnum: quantita ? quantita.magnum : null,
        });
        if (error) throw error;
      });
      inviaNotificaArchiviazione({ cliente, lavorazione, operatore: operatoreRapportino });
      setEsito("ok");
      setCliente("");
      setVino("");
      setOperatoreRapportino("");
      setData("");
      setFile(null);
      setFileNome("");
    } catch (e) {
      console.error("Errore caricamento manuale:", e);
      setEsito(
        "Nessuna connessione o errore nel salvataggio. Riprova quando hai rete."
      );
    } finally {
      setCaricando(false);
    }
  };

  return (
    <div style={styles.formWrap}>
      <div style={styles.formHeader}>
        <button onClick={onBack} style={styles.backBtn}>
          ← home
        </button>
        <div style={styles.formTitleRow}>
          <h2 style={styles.formTitle}>Carica rapportino (PDF già fatto)</h2>
        </div>
      </div>

      <div style={styles.formBody}>
        <p style={{ color: COLORS.textMuted, marginTop: 0 }}>
          Usa questa pagina solo per recuperare in archivio un rapportino il
          cui PDF è già stato generato e inviato (es. per mancanza di rete al
          momento del salvataggio). Compila i dati principali e allega il
          file PDF: verrà aggiunto all'archivio condiviso esattamente come un
          rapportino normale.
        </p>

        <Field label="Lavorazione" required>
          <select
            style={styles.input}
            value={lavorazione}
            onChange={(e) => setLavorazione(e.target.value)}
          >
            {LAVORAZIONI.map((l) => (
              <option key={l.id} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cliente" required>
          <input
            style={styles.input}
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />
        </Field>

        <Field label="Vino">
          <input
            style={styles.input}
            value={vino}
            onChange={(e) => setVino(e.target.value)}
          />
        </Field>

        <Field label="Operatore">
          <input
            style={styles.input}
            value={operatoreRapportino}
            onChange={(e) => setOperatoreRapportino(e.target.value)}
          />
        </Field>

        <Field label="Data intervento">
          <input
            type="date"
            style={styles.input}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Field>

        <Field label="File PDF del rapportino" required>
          <input
            type="file"
            accept="application/pdf"
            style={styles.input}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              setFileNome(f ? f.name : "");
            }}
          />
          {fileNome && (
            <span style={{ ...styles.saveHint, display: "block", marginTop: 6 }}>
              {fileNome}
            </span>
          )}
        </Field>

        <div style={styles.saveRow}>
          {esito && esito !== "ok" && (
            <span style={{ ...styles.saveHint, color: "#D98F7A" }}>
              {esito}
            </span>
          )}
          <button
            onClick={handleCarica}
            disabled={!puoCaricare}
            style={{
              ...styles.saveBtn,
              opacity: puoCaricare ? 1 : 0.4,
              cursor: puoCaricare ? "pointer" : "not-allowed",
            }}
          >
            {esito === "ok"
              ? "Caricato in archivio ✓"
              : caricando
              ? "Caricamento in corso…"
              : "Carica in archivio"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifiche push — chi le riceve quando un rapportino viene archiviato.
// ---------------------------------------------------------------------------
const NOTIFICHE_A = ["Valentina Erović"];
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Avvisa chi di dovere che un rapportino è stato archiviato.
// Non blocca mai nulla: se non parte, il rapportino è comunque in archivio.
function inviaNotificaArchiviazione({ cliente, lavorazione, operatore }) {
  fetch("/.netlify/functions/invia-notifica", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cliente, lavorazione, operatore }),
  }).catch((e) => console.error("Notifica non inviata:", e));
}

function PulsanteNotifiche({ operatore }) {
  const [esito, setEsito] = useState("");

  const attiva = async () => {
    setEsito("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEsito(
          "Questo dispositivo non supporta le notifiche. Su iPhone/iPad l'app deve essere installata sulla schermata Home."
        );
        return;
      }
      if (!VAPID_PUBLIC_KEY) {
        setEsito("Notifiche non ancora configurate sul server.");
        return;
      }
      const permesso = await Notification.requestPermission();
      if (permesso !== "granted") {
        setEsito("Permesso negato: abilita le notifiche per l'app dalle impostazioni del dispositivo.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ operatore, endpoint: json.endpoint, subscription: json }, { onConflict: "endpoint" });
      if (error) throw error;
      setEsito("Notifiche attive su questo dispositivo.");
    } catch (e) {
      console.error("Errore attivazione notifiche:", e);
      setEsito("Non sono riuscito ad attivare le notifiche. Riprova.");
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={attiva} style={styles.archivioBtn}>
        🔔 Attiva notifiche rapportini
      </button>
      {esito && (
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 6 }}>{esito}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contatore bottiglie — visibile solo a Stefano Gerardi.
// Bottiglie e Magnum sono sempre conteggiate separatamente.
// ---------------------------------------------------------------------------
const CONTATORE_VISIBILE_A = ["Stefano Gerardi"];

const numeroIntero = (v) => parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10) || 0;
const formatoNumero = (n) => (n || 0).toLocaleString("it-IT");

// Somma Bottiglia e Magnum di tutti i vini del rapportino (separatamente).
function contaQuantita(prodotti) {
  let bottiglie = 0;
  let magnum = 0;
  (prodotti || []).forEach((p) => {
    bottiglie += numeroIntero(p.bottiglieFatte);
    magnum += numeroIntero(p.qtaMagnum);
  });
  return { bottiglie, magnum };
}

// Legge dal PDF già generato la tabella "Quantità bottiglie fatte".
// Ritorna { bottiglie, magnum } oppure null se non la trova.
function leggiQuantitaDaPdf(pdfBase64) {
  try {
    const testo = atob(pdfBase64);
    const voci = [];
    const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
    let m;
    while ((m = re.exec(testo)) !== null) {
      voci.push(m[1].replace(/\\([()\\])/g, "$1"));
    }
    const i = voci.findIndex(
      (v, k) =>
        v === "Vino" &&
        voci[k + 1] === "Bottiglia" &&
        voci[k + 2] === "Magnum" &&
        voci[k + 3] === "Altro"
    );
    if (i < 0) return null;
    let bottiglie = 0;
    let magnum = 0;
    let j = i + 4;
    while (j + 3 < voci.length && /^Vino \d+/.test(voci[j])) {
      bottiglie += numeroIntero(voci[j + 1]);
      magnum += numeroIntero(voci[j + 2]);
      j += 4;
    }
    return { bottiglie, magnum };
  } catch (e) {
    return null;
  }
}

function ContatoreBottiglie({ onBack }) {
  const [righe, setRighe] = useState([]);
  const [stato, setStato] = useState("carico"); // carico | ok | errore
  const [analisi, setAnalisi] = useState(null); // null | { lavorando, elenco }
  const [esito, setEsito] = useState("");
  // Data dell'ultimo reset: i contatori sommano solo i rapportini chiusi dopo.
  // Il reset non cancella nulla dall'archivio, segna solo da quando si riparte.
  const [ultimoReset, setUltimoReset] = useState(null);
  // Categoria aperta per vedere i parziali per operatore
  const [categoriaAperta, setCategoriaAperta] = useState(null);

  // Le versioni Hub e le combinate ("... + Confezionamento") contano nelle
  // categorie di base (vedi lavorazioneBase), quindi non hanno una riga propria.
  const categorie = LAVORAZIONI.filter(
    (l) => HAS_FULL_MASK.has(l.id) && !l.hub && !l.id.includes("-confezionamento")
  );

  const carica = () => {
    setStato("carico");
    conRiprovaDiRete(async () => {
      const { data, error } = await supabase
        .from("rapportini")
        .select("id, cliente, operatore, lavorazione, created_at, bottiglie, magnum");
      if (error) throw error;
      const { data: reset } = await supabase
        .from("contatore_reset")
        .select("data")
        .order("data", { ascending: false })
        .limit(1);
      return { data, reset: reset && reset[0] ? reset[0].data : null };
    })
      .then(({ data, reset }) => {
        setRighe(data || []);
        setUltimoReset(reset ? new Date(reset) : null);
        setStato("ok");
      })
      .catch((e) => {
        console.error("Errore lettura contatori:", e.message);
        setStato("errore");
      });
  };

  useEffect(carica, []);

  const dopoReset = (r) =>
    !ultimoReset || (r.created_at && new Date(r.created_at) >= ultimoReset);

  const resetta = async () => {
    if (
      !window.confirm(
        "Azzerare i contatori? Ripartono da zero da adesso. I rapportini in archivio restano intatti."
      )
    )
      return;
    try {
      await conRiprovaDiRete(async () => {
        const { error } = await supabase
          .from("contatore_reset")
          .insert({ data: new Date().toISOString() });
        if (error) throw error;
      });
      setEsito("Contatori azzerati.");
      setAnalisi(null);
      carica();
    } catch (e) {
      console.error("Errore reset contatore:", e);
      setEsito("Reset non riuscito: controlla la connessione e riprova.");
    }
  };

  const perCategoria = categorie.map((c) => {
    const mie = righe.filter(
      (r) =>
        lavorazioneBase(r.lavorazione) === c.label &&
        r.bottiglie !== null &&
        r.bottiglie !== undefined &&
        dopoReset(r)
    );
    return {
      ...c,
      bottiglie: mie.reduce((s, r) => s + (r.bottiglie || 0), 0),
      magnum: mie.reduce((s, r) => s + (r.magnum || 0), 0),
      rapportini: mie.length,
      perOperatore: Object.values(
        mie.reduce((acc, r) => {
          const nome = r.operatore || "Operatore non indicato";
          acc[nome] = acc[nome] || { nome, bottiglie: 0, magnum: 0, rapportini: 0 };
          acc[nome].bottiglie += r.bottiglie || 0;
          acc[nome].magnum += r.magnum || 0;
          acc[nome].rapportini += 1;
          return acc;
        }, {})
      ).sort((a, b) => b.bottiglie + b.magnum - (a.bottiglie + a.magnum)),
    };
  });
  const totBottiglie = perCategoria.reduce((s, c) => s + c.bottiglie, 0);
  const totMagnum = perCategoria.reduce((s, c) => s + c.magnum, 0);

  const etichetteCategorie = categorie.map((c) => c.label);
  const daRecuperare = righe.filter(
    (r) =>
      etichetteCategorie.includes(lavorazioneBase(r.lavorazione)) &&
      (r.bottiglie === null || r.bottiglie === undefined) &&
      dopoReset(r)
  );

  const analizza = async () => {
    setEsito("");
    const elenco = [];
    setAnalisi({ lavorando: true, elenco: [] });
    for (const r of daRecuperare) {
      try {
        const pdf = await conRiprovaDiRete(async () => {
          const { data, error } = await supabase
            .from("rapportini")
            .select("pdf_base64")
            .eq("id", r.id)
            .single();
          if (error) throw error;
          return data?.pdf_base64;
        });
        const q = pdf ? leggiQuantitaDaPdf(pdf) : null;
        elenco.push({
          id: r.id,
          cliente: r.cliente,
          lavorazione: r.lavorazione,
          data: r.created_at ? new Date(r.created_at).toLocaleDateString("it-IT") : "",
          bottiglie: q ? String(q.bottiglie) : "",
          magnum: q ? String(q.magnum) : "",
          daVerificare: !q,
        });
      } catch (e) {
        elenco.push({
          id: r.id,
          cliente: r.cliente,
          lavorazione: r.lavorazione,
          data: "",
          bottiglie: "",
          magnum: "",
          daVerificare: true,
        });
      }
      setAnalisi({ lavorando: true, elenco: [...elenco] });
    }
    setAnalisi({ lavorando: false, elenco });
  };

  const modificaVoce = (id, campo, valore) =>
    setAnalisi((a) => ({
      ...a,
      elenco: a.elenco.map((v) => (v.id === id ? { ...v, [campo]: valore } : v)),
    }));

  const salvaRecupero = async () => {
    let ok = 0;
    let errori = 0;
    for (const v of analisi.elenco) {
      if (v.bottiglie === "" && v.magnum === "") continue; // lasciato da parte
      try {
        await conRiprovaDiRete(async () => {
          const { error } = await supabase
            .from("rapportini")
            .update({
              bottiglie: numeroIntero(v.bottiglie),
              magnum: numeroIntero(v.magnum),
            })
            .eq("id", v.id);
          if (error) throw error;
        });
        ok++;
      } catch (e) {
        console.error("Errore salvataggio recupero:", e);
        errori++;
      }
    }
    setEsito(
      errori
        ? `Salvati ${ok}, non riusciti ${errori}. Controlla la connessione e i permessi della tabella.`
        : `Salvati ${ok} rapportini.`
    );
    setAnalisi(null);
    carica();
  };

  const numStyle = { fontFamily: FONT_MONO, color: COLORS.text };

  return (
    <div style={styles.formWrap}>
      <div style={styles.formHeader}>
        <button onClick={onBack} style={styles.backBtnGrande}>
          ← Torna alla home
        </button>
        <div style={styles.formTitleRow}>
          <h2 style={styles.formTitle}>Contatore bottiglie</h2>
        </div>
      </div>

      {stato === "carico" && <p style={styles.saveHint}>Caricamento…</p>}
      {stato === "errore" && (
        <p style={{ ...styles.saveHint, color: "#D98F7A" }}>
          Non riesco a leggere i dati. Controlla la connessione e riprova.
        </p>
      )}

      {stato === "ok" && (
        <>
          <div
            style={{
              background: COLORS.surfaceRaised,
              border: `1.5px solid ${COLORS.gold}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: COLORS.textMuted, textAlign: "center" }}>
              Totale
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ ...numStyle, fontSize: 34, color: COLORS.gold }}>{formatoNumero(totBottiglie)}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>bottiglie</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ ...numStyle, fontSize: 34, color: COLORS.gold }}>{formatoNumero(totMagnum)}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>magnum</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {perCategoria.map((c) => (
              <div
                key={c.id}
                onClick={() =>
                  setCategoriaAperta((a) => (a === c.id ? null : c.id))
                }
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${categoriaAperta === c.id ? COLORS.gold : COLORS.border}`,
                  borderRadius: 10,
                  padding: 14,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.gold }}>{c.cifra}</div>
                <div style={{ fontSize: 14, margin: "2px 0 8px" }}>{c.label}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>bottiglie</span>
                  <span style={{ ...numStyle, fontSize: 20 }}>{formatoNumero(c.bottiglie)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>magnum</span>
                  <span style={{ ...numStyle, fontSize: 20 }}>{formatoNumero(c.magnum)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 6 }}>
                  {c.rapportini} rapportini · tocca per i parziali
                </div>
              </div>
            ))}
          </div>

          {categoriaAperta &&
            (() => {
              const c = perCategoria.find((x) => x.id === categoriaAperta);
              if (!c) return null;
              return (
                <div
                  style={{
                    marginTop: 12,
                    background: COLORS.surfaceRaised,
                    border: `1px solid ${COLORS.gold}`,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    {c.label} — parziali per operatore
                  </div>
                  {c.perOperatore.length === 0 && (
                    <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                      Nessun rapportino dopo l'ultimo reset.
                    </div>
                  )}
                  {c.perOperatore.map((o) => (
                    <div
                      key={o.nome}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 8,
                        padding: "8px 0",
                        borderTop: `1px solid ${COLORS.border}`,
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <div>{o.nome}</div>
                        <div style={{ fontSize: 11.5, color: COLORS.textMuted }}>
                          {o.rapportini} rapportini
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: FONT_MONO }}>
                        <div>{formatoNumero(o.bottiglie)} bottiglie</div>
                        <div>{formatoNumero(o.magnum)} magnum</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <button onClick={resetta} style={styles.homeBtnDanger}>
              Reset contatore
            </button>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
              {ultimoReset
                ? `ultimo reset il ${ultimoReset.toLocaleDateString("it-IT")}`
                : "ultimo reset: mai effettuato"}
            </span>
          </div>

          {esito && <p style={{ ...styles.saveHint, marginTop: 14 }}>{esito}</p>}

          {daRecuperare.length > 0 && (
            <div style={{ marginTop: 26, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>Recupero storico</h3>
              <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, margin: "0 0 12px" }}>
                {daRecuperare.length} rapportini in archivio non hanno ancora i numeri di bottiglie e magnum. Posso leggerli dai loro PDF: controlli i valori, correggi se serve e confermi.
              </p>
              {!analisi && (
                <button onClick={analizza} style={styles.saveBtn}>
                  Leggi i PDF archiviati
                </button>
              )}
              {analisi && (
                <>
                  {analisi.lavorando && (
                    <p style={styles.saveHint}>
                      Lettura in corso… {analisi.elenco.length}/{daRecuperare.length}
                    </p>
                  )}
                  {analisi.elenco.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 0",
                        borderBottom: `1px solid ${COLORS.border}`,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>{v.cliente}</div>
                        <div style={{ fontSize: 11.5, color: COLORS.textMuted }}>
                          {v.lavorazione} · {v.data}
                          {v.daVerificare && (
                            <b style={{ color: COLORS.gold }}> · da verificare</b>
                          )}
                        </div>
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="bott."
                        value={v.bottiglie}
                        onChange={(e) => modificaVoce(v.id, "bottiglie", e.target.value)}
                        style={{ ...styles.input, width: 78, textAlign: "right", padding: "7px" }}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="magn."
                        value={v.magnum}
                        onChange={(e) => modificaVoce(v.id, "magnum", e.target.value)}
                        style={{ ...styles.input, width: 78, textAlign: "right", padding: "7px" }}
                      />
                    </div>
                  ))}
                  {!analisi.lavorando && (
                    <button onClick={salvaRecupero} style={{ ...styles.saveBtn, marginTop: 14 }}>
                      Conferma e salva
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Home({ onSelect, storico, operatore, onCambiaOperatore, onArchivio, onCaricaManuale, onContatore, onGestionePin }) {
  const isAdmin = AMMINISTRATORI.includes(operatore);
  const [conteggioArchivio, setConteggioArchivio] = useState(null);

  useEffect(() => {
    let annullato = false;
    conRiprovaDiRete(async () => {
      const { count, error } = await supabase
        .from("rapportini")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count;
    })
      .then((count) => {
        if (!annullato) setConteggioArchivio(count);
      })
      .catch((e) => {
        console.error("Errore conteggio archivio:", e);
      });
    return () => {
      annullato = true;
    };
  }, []);

  return (
    <div style={styles.homeWrap}>
      <header style={styles.homeHeader}>
        <div style={styles.brandRow}>
          <img src={oenoLogo} alt="Oeno Soluzioni" style={styles.brandLogo} />
          <div>
            <h1 style={styles.brandTitle}>RAPPORTINI OS</h1>
            <p style={styles.brandSub}>registro interventi di cantina</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={styles.homeMeta}>
            {new Date().toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <div style={styles.operatoreRow}>
            <span>{operatore}</span>
            <button onClick={onCambiaOperatore} style={styles.linkBtn}>
              cambia operatore
            </button>
          </div>
        </div>
      </header>

      {conteggioArchivio !== null && (
        <div style={styles.contatoreArchivio}>
          Rapportini archiviati: {conteggioArchivio}
        </div>
      )}

      {NOTIFICHE_A.includes(operatore) && <PulsanteNotifiche operatore={operatore} />}

      {isAdmin && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onArchivio} style={styles.archivioBtn}>
            📁 Archivio rapportini
          </button>
          <button onClick={onCaricaManuale} style={styles.archivioBtn}>
            ⬆️ Carica rapportino (PDF)
          </button>
          {CONTATORE_VISIBILE_A.includes(operatore) && (
            <button onClick={onContatore} style={styles.archivioBtn}>
              🔢 Contatore bottiglie
            </button>
          )}
          <button onClick={onGestionePin} style={styles.archivioBtn}>
            🔑 Gestione PIN
          </button>
        </div>
      )}

      <div style={styles.tileGrid}>
        {LAVORAZIONI.map((l) => (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            style={styles.tile}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#C9A227")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(237,232,221,0.14)")
            }
          >
            <span style={styles.tileCifra}>{l.cifra}</span>
            <span style={styles.tileLabel}>{l.label}</span>
            <span style={styles.tileArrow}>→</span>
          </button>
        ))}
      </div>

      {storico.length > 0 && (
        <div style={styles.storicoWrap}>
          <div style={styles.sectionLabel}>Interventi registrati oggi</div>
          <div style={styles.storicoList}>
            {storico.map((s, i) => (
              <div key={i} style={styles.storicoRow}>
                <span style={styles.storicoLav}>{s.lavorazioneLabel}</span>
                <span style={styles.storicoCliente}>{s.cliente || "—"}</span>
                <span style={styles.storicoVino}>{s.vino || ""}</span>
                <span style={styles.storicoOra}>{s.ora}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form — maschera intervento
// ---------------------------------------------------------------------------
// Sessione operatore — resta collegato finché non cambia utente
// ---------------------------------------------------------------------------
const SESSIONE_KEY = "rapportini-os-operatore-loggato";

function loadOperatoreSessione() {
  try {
    return localStorage.getItem(SESSIONE_KEY) || "";
  } catch (e) {
    return "";
  }
}

function saveOperatoreSessione(nome) {
  try {
    localStorage.setItem(SESSIONE_KEY, nome);
  } catch (e) {
    /* ignora */
  }
}

function clearOperatoreSessione() {
  try {
    localStorage.removeItem(SESSIONE_KEY);
  } catch (e) {
    /* ignora */
  }
}

// ---------------------------------------------------------------------------
// PIN personali — dopo il primo accesso ognuno sceglie il proprio PIN.
// Salvati su Supabase (tabella pin_operatori) solo come impronta cifrata
// (SHA-256 con nome operatore), mai in chiaro. Finché un operatore non ha
// cambiato PIN vale quello iniziale scritto in OPERATORI.
// ---------------------------------------------------------------------------
async function impronta(nome, pin) {
  const dati = new TextEncoder().encode(`rapportini-os|${nome}|${pin}`);
  const h = await crypto.subtle.digest("SHA-256", dati);
  return Array.from(new Uint8Array(h))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Esito: "ok" | "cambia" (PIN iniziale/provvisorio, va scelto il nuovo) |
// "errato" | "rete"
async function verificaPin(nome, pin) {
  const p = String(pin || "").trim();
  if (PROFILI_PIN_FISSO.includes(nome)) {
    const fisso = OPERATORI.find((o) => o.nome === nome);
    return fisso && fisso.pin === p ? "ok" : "errato";
  }
  try {
    const riga = await conRiprovaDiRete(async () => {
      const { data, error } = await supabase
        .from("pin_operatori")
        .select("pin_hash, provvisorio")
        .eq("nome", nome)
        .maybeSingle();
      if (error) throw error;
      return data;
    });
    if (riga) {
      const h = await impronta(nome, p);
      if (h !== riga.pin_hash) return "errato";
      return riga.provvisorio ? "cambia" : "ok";
    }
    // Nessun PIN personale ancora: vale quello iniziale
    const op = OPERATORI.find((o) => o.nome === nome);
    return op && op.pin === p ? "cambia" : "errato";
  } catch (e) {
    console.error("Verifica PIN non riuscita:", e);
    return "rete";
  }
}

async function salvaPin(nome, pin, provvisorio) {
  const h = await impronta(nome, pin);
  await conRiprovaDiRete(async () => {
    const { error } = await supabase.from("pin_operatori").upsert({
      nome,
      pin_hash: h,
      provvisorio: !!provvisorio,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  });
}

// Schermata "Scegli il tuo PIN" (primo accesso o dopo un reset)
function CambioPin({ nome, pinAttuale, onFatto, onAnnulla }) {
  const [nuovo, setNuovo] = useState("");
  const [ripeti, setRipeti] = useState("");
  const [errore, setErrore] = useState("");
  const [salvo, setSalvo] = useState(false);

  const conferma = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(nuovo)) return setErrore("Il PIN deve essere di 4 cifre.");
    if (nuovo === String(pinAttuale).trim())
      return setErrore("Scegli un PIN diverso da quello provvisorio.");
    if (nuovo !== ripeti) return setErrore("I due PIN non coincidono.");
    setErrore("");
    setSalvo(true);
    try {
      await salvaPin(nome, nuovo, false);
      onFatto();
    } catch (err) {
      console.error("Salvataggio PIN non riuscito:", err);
      setSalvo(false);
      setErrore("Non sono riuscito a salvare il PIN: controlla la connessione e riprova.");
    }
  };

  return (
    <div style={styles.loginWrap}>
      <img src={oenoLogo} alt="Oeno Soluzioni" style={styles.loginLogo} />
      <h1 style={styles.brandTitle}>Scegli il tuo PIN</h1>
      <p style={styles.brandSub}>
        È il tuo primo accesso: scegli un PIN personale di 4 cifre. Da ora in poi userai solo questo.
      </p>
      <form onSubmit={conferma} style={styles.loginForm}>
        <Field label="Nuovo PIN">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            style={styles.input}
            value={nuovo}
            onChange={(e) => setNuovo(e.target.value)}
            placeholder="4 cifre"
          />
        </Field>
        <Field label="Ripeti il nuovo PIN">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            style={styles.input}
            value={ripeti}
            onChange={(e) => setRipeti(e.target.value)}
            placeholder="4 cifre"
          />
        </Field>
        {errore && <div style={styles.loginError}>{errore}</div>}
        <button type="submit" style={styles.saveBtn} disabled={salvo || !nuovo || !ripeti}>
          {salvo ? "Salvo…" : "Salva ed entra"}
        </button>
        <button type="button" onClick={onAnnulla} style={styles.linkBtn}>
          ← torna all'accesso
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login — nome operatore + PIN personale
// ---------------------------------------------------------------------------
function Login({ onLogin }) {
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [errore, setErrore] = useState("");
  const [verifica, setVerifica] = useState(false);
  const [cambio, setCambio] = useState(false);
  const [dimenticato, setDimenticato] = useState(false);

  const entra = async (e) => {
    e.preventDefault();
    setErrore("");
    setVerifica(true);
    const esito = await verificaPin(nome, pin);
    setVerifica(false);
    if (esito === "ok") onLogin(nome);
    else if (esito === "cambia") setCambio(true);
    else if (esito === "rete")
      setErrore("Nessuna connessione: per accedere serve la rete. Riprova tra poco.");
    else setErrore("PIN non corretto per l'operatore selezionato");
  };

  if (cambio) {
    return (
      <CambioPin
        nome={nome}
        pinAttuale={pin}
        onFatto={() => onLogin(nome)}
        onAnnulla={() => {
          setCambio(false);
          setPin("");
        }}
      />
    );
  }

  if (dimenticato) {
    return (
      <div style={styles.loginWrap}>
        <img src={oenoLogo} alt="Oeno Soluzioni" style={styles.loginLogo} />
        <h1 style={styles.brandTitle}>PIN dimenticato</h1>
        <p style={styles.brandSub}>
          Per sicurezza il PIN non si può reimpostare da soli. Chiedi a uno degli
          amministratori ({AMMINISTRATORI.join(", ")}): ti darà un PIN provvisorio
          e al prossimo accesso ne sceglierai uno nuovo.
        </p>
        <div style={styles.loginForm}>
          <button type="button" style={styles.saveBtn} onClick={() => setDimenticato(false)}>
            ← Torna all'accesso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.loginWrap}>
      <img src={oenoLogo} alt="Oeno Soluzioni" style={styles.loginLogo} />
      <h1 style={styles.brandTitle}>RAPPORTINI OS</h1>
      <p style={styles.brandSub}>accedi per iniziare a compilare</p>

      <form onSubmit={entra} style={styles.loginForm}>
        <Field label="Operatore">
          <select
            style={styles.input}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          >
            <option value="">seleziona il tuo nome</option>
            {OPERATORI.map((o) => (
              <option key={o.nome} value={o.nome}>
                {o.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="PIN">
          <input
            type="password"
            inputMode="numeric"
            style={styles.input}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
          />
        </Field>
        {errore && <div style={styles.loginError}>{errore}</div>}
        <button type="submit" style={styles.saveBtn} disabled={!nome || !pin || verifica}>
          {verifica ? "Controllo…" : "Entra"}
        </button>
        <button type="button" onClick={() => setDimenticato(true)} style={styles.linkBtn}>
          Ho dimenticato il PIN
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gestione PIN — solo amministratori: imposta un PIN provvisorio a chi ha
// dimenticato il suo; al prossimo accesso la persona ne sceglie uno nuovo.
// ---------------------------------------------------------------------------
function GestionePin({ onBack }) {
  const [stati, setStati] = useState({}); // nome -> "personale" | "provvisorio"
  const [caricato, setCaricato] = useState(false);
  const [scelto, setScelto] = useState(null);
  const [tmp, setTmp] = useState("");
  const [esito, setEsito] = useState("");

  const carica = () => {
    conRiprovaDiRete(async () => {
      const { data, error } = await supabase
        .from("pin_operatori")
        .select("nome, provvisorio");
      if (error) throw error;
      return data;
    })
      .then((data) => {
        const m = {};
        (data || []).forEach((r) => {
          m[r.nome] = r.provvisorio ? "provvisorio" : "personale";
        });
        setStati(m);
        setCaricato(true);
      })
      .catch(() => setCaricato(true));
  };
  useEffect(carica, []);

  const imposta = async () => {
    if (!/^\d{4}$/.test(tmp)) return setEsito("Il PIN provvisorio deve essere di 4 cifre.");
    try {
      await salvaPin(scelto, tmp, true);
      setEsito(
        `Fatto. Comunica il PIN provvisorio a ${scelto}: al prossimo accesso dovrà sceglierne uno nuovo.`
      );
      setTmp("");
      carica();
    } catch (e) {
      setEsito("Non riuscito: controlla la connessione e riprova.");
    }
  };

  const etichetta = (nome) =>
    stati[nome] === "personale"
      ? "PIN personale"
      : stati[nome] === "provvisorio"
      ? "PIN provvisorio da cambiare"
      : "PIN iniziale, primo accesso da fare";

  return (
    <div style={styles.formWrap}>
      <div style={styles.formHeader}>
        <button onClick={onBack} style={styles.backBtnGrande}>
          ← Torna alla home
        </button>
        <div style={styles.formTitleRow}>
          <h2 style={styles.formTitle}>Gestione PIN</h2>
        </div>
      </div>
      <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.5 }}>
        Se un operatore ha dimenticato il PIN, imposta un PIN provvisorio: al
        prossimo accesso dovrà sceglierne uno nuovo.
      </p>
      {!caricato && <p style={{ color: COLORS.textMuted }}>Carico…</p>}
      <div style={styles.archivioList}>
        {OPERATORI.filter((o) => !PROFILI_PIN_FISSO.includes(o.nome)).map((o) => (
          <div key={o.nome} style={styles.archivioRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.archivioCliente}>{o.nome}</div>
              <div style={styles.archivioMeta}>{etichetta(o.nome)}</div>
            </div>
            <button
              onClick={() => {
                setScelto(o.nome);
                setTmp("");
                setEsito("");
              }}
              style={styles.homeBtn}
            >
              Reset PIN
            </button>
          </div>
        ))}
      </div>
      {scelto && (
        <div style={{ ...styles.noteBlock, border: `1px solid ${COLORS.gold}`, borderRadius: 10, padding: 14 }}>
          <div style={{ marginBottom: 8 }}>Reset PIN di {scelto}</div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            style={styles.input}
            value={tmp}
            onChange={(e) => setTmp(e.target.value)}
            placeholder="PIN provvisorio (4 cifre)"
          />
          <button onClick={imposta} style={{ ...styles.saveBtn, marginTop: 10 }}>
            Imposta PIN provvisorio
          </button>
          {esito && (
            <div style={{ marginTop: 10, fontSize: 13, color: COLORS.gold }}>{esito}</div>
          )}
        </div>
      )}
    </div>
  );
}

function draftKey(lavorazioneId) {
  return `rapportini-os-bozza-${lavorazioneId}`;
}

function loadDraft(lavorazioneId) {
  try {
    const raw = localStorage.getItem(draftKey(lavorazioneId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveDraft(lavorazioneId, data) {
  try {
    localStorage.setItem(draftKey(lavorazioneId), JSON.stringify(data));
  } catch (e) {
    /* memoria piena o non disponibile: ignora, si perde solo l'autosalvataggio */
  }
}

function clearDraft(lavorazioneId) {
  try {
    localStorage.removeItem(draftKey(lavorazioneId));
  } catch (e) {
    /* ignora */
  }
}

// --- Bozze nel cloud (Supabase, tabella "bozze") ---------------------------
// La bozza resta salvata anche sul dispositivo; la copia nel cloud, legata al
// nome dell'operatore, permette di riprenderla da un altro dispositivo.
async function salvaBozzaCloud(operatore, lavorazioneId, dati) {
  try {
    await supabase.from("bozze").upsert(
      {
        operatore,
        lavorazione_id: lavorazioneId,
        dati,
        updated_at: dati._updatedAt,
      },
      { onConflict: "operatore,lavorazione_id" }
    );
  } catch (e) {
    /* offline: resta la copia locale */
  }
}

async function caricaBozzaCloud(operatore, lavorazioneId) {
  try {
    const richiesta = supabase
      .from("bozze")
      .select("dati, updated_at")
      .eq("operatore", operatore)
      .eq("lavorazione_id", lavorazioneId)
      .maybeSingle();
    const scadenza = new Promise((ok) => setTimeout(() => ok({ timeout: true }), 6000));
    const r = await Promise.race([richiesta, scadenza]);
    if (!r || r.timeout || r.error || !r.data) return null;
    return r.data;
  } catch (e) {
    return null;
  }
}

async function cancellaBozzaCloud(operatore, lavorazioneId) {
  try {
    await supabase
      .from("bozze")
      .delete()
      .eq("operatore", operatore)
      .eq("lavorazione_id", lavorazioneId);
  } catch (e) {
    /* ignora */
  }
}

// ---------------------------------------------------------------------------
function InterventoForm({ lavorazioneId, onBack, onSave, operatore }) {
  const lav = LAVORAZIONI.find((l) => l.id === lavorazioneId);
  const full = HAS_FULL_MASK.has(lavorazioneId);
  // Le versioni "Hub" hanno la stessa maschera della lavorazione di base ma
  // mail di invio fisse (HUB_DESTINATARI) invece di quelle del cliente.
  const tipo = lavorazioneId.replace(/-hub$/, "");
  const isHub = tipo !== lavorazioneId;
  // "Sboccatura + Confezionamento Hub": struttura di Sboccatura con in più i
  // controlli di Confezionamento (incartonamento, 6 spunte di linea, ecc.)
  const combo = tipo === "sboccatura-confezionamento";
  // "Imbottigliamento + Confezionamento": struttura di Imbottigliamento con in
  // più i controlli di Confezionamento. `tb` = tipo "di base" per le parti
  // dell'Imbottigliamento (vetri, servizi accessori, controlli di linea...).
  const comboImb = tipo === "imbottigliamento-confezionamento";
  const tb = comboImb ? "imbottigliamento" : tipo;
  const bozzaIniziale = loadDraft(lavorazioneId);

  const [form, setForm] = useState(
    formConDefaultSicuri(bozzaIniziale?.form, full)
  );
  const [firmaOperatore, setFirmaOperatore] = useState(
    bozzaIniziale?.firmaOperatore || ""
  );
  const [firmaCliente, setFirmaCliente] = useState(
    bozzaIniziale?.firmaCliente || ""
  );
  const [nomeOperatore, setNomeOperatore] = useState(
    bozzaIniziale?.nomeOperatore || operatore || ""
  );
  const [nomeCliente, setNomeCliente] = useState(
    bozzaIniziale?.nomeCliente || ""
  );
  const [emailAggiuntiva, setEmailAggiuntiva] = useState(
    bozzaIniziale?.emailAggiuntiva || ""
  );
  const [oraInizio, setOraInizio] = useState(bozzaIniziale?.oraInizio || "");
  const [oraFine, setOraFine] = useState(bozzaIniziale?.oraFine || "");
  const [oreViaggioAndata, setOreViaggioAndata] = useState(
    bozzaIniziale?.oreViaggioAndata || ""
  );
  const [oreViaggioRitorno, setOreViaggioRitorno] = useState(
    bozzaIniziale?.oreViaggioRitorno || ""
  );
  const [altriOperatori, setAltriOperatori] = useState(
    bozzaIniziale?.altriOperatori || ""
  );
  // Solo Hub: tabella ore per operatore (il primo è chi compila), max 4 nomi
  const [oreOperatori, setOreOperatori] = useState(
    bozzaIniziale?.oreOperatori?.length
      ? bozzaIniziale.oreOperatori
      : [{ nome: operatore || "", ore: "" }]
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Avviso non bloccante: l'intervento è già in archivio e scaricato quando
  // compare, quindi non impedisce nulla — segnala solo che la mail al
  // cliente non è partita (es. nessuna email nota o funzione non raggiungibile).
  const [emailWarning, setEmailWarning] = useState("");
  const [bozzaRipristinata, setBozzaRipristinata] = useState(!!bozzaIniziale);

  // Bozza nel cloud: all'apertura si controlla se ce n'è una più recente di
  // quella del dispositivo (es. iniziata da un altro dispositivo).
  const [bozzaPronta, setBozzaPronta] = useState(false);
  const bozzaChiusa = useRef(false); // true dopo invio o cancellazione
  const ultimoPayload = useRef(null);
  const formVuoto = useRef(JSON.stringify(formConDefaultSicuri(null, full)));
  // Una bozza ancora in bianco non va mandata nel cloud
  const èVuota = (d) =>
    JSON.stringify(d.form) === formVuoto.current &&
    !d.firmaOperatore &&
    !d.firmaCliente &&
    !d.nomeCliente &&
    !d.emailAggiuntiva &&
    !d.oraInizio &&
    !d.oraFine &&
    !d.oreViaggioAndata &&
    !d.oreViaggioRitorno &&
    !d.altriOperatori &&
    !(d.oreOperatori || []).some((o, i) => o.ore || (i > 0 && o.nome));

  useEffect(() => {
    let annullato = false;
    caricaBozzaCloud(operatore, lavorazioneId).then((cloud) => {
      if (annullato) return;
      if (cloud && cloud.dati) {
        const localeQuando = bozzaIniziale?._updatedAt
          ? new Date(bozzaIniziale._updatedAt).getTime()
          : 0;
        const cloudQuando = new Date(cloud.updated_at).getTime();
        if (cloudQuando > localeQuando) {
          const d = cloud.dati;
          setForm(formConDefaultSicuri(d.form, full));
          setFirmaOperatore(d.firmaOperatore || "");
          setFirmaCliente(d.firmaCliente || "");
          setNomeOperatore(d.nomeOperatore || operatore || "");
          setNomeCliente(d.nomeCliente || "");
          setEmailAggiuntiva(d.emailAggiuntiva || "");
          setOraInizio(d.oraInizio || "");
          setOraFine(d.oraFine || "");
          setOreViaggioAndata(d.oreViaggioAndata || "");
          setOreViaggioRitorno(d.oreViaggioRitorno || "");
          setAltriOperatori(d.altriOperatori || "");
          setOreOperatori(
            d.oreOperatori?.length
              ? d.oreOperatori
              : [{ nome: operatore || "", ore: "" }]
          );
          setBozzaRipristinata(true);
        }
      }
      setBozzaPronta(true);
    });
    return () => {
      annullato = true;
    };
  }, []);

  // Chiude la bozza (rapportino inviato o cancellato): via dal dispositivo e dal cloud
  const chiudiBozza = () => {
    bozzaChiusa.current = true;
    clearDraft(lavorazioneId);
    cancellaBozzaCloud(operatore, lavorazioneId);
  };

  // Uscendo dal modulo si manda subito al cloud l'ultima versione
  useEffect(() => {
    return () => {
      if (
        !bozzaChiusa.current &&
        ultimoPayload.current &&
        !èVuota(ultimoPayload.current)
      ) {
        salvaBozzaCloud(operatore, lavorazioneId, ultimoPayload.current);
      }
    };
  }, []);

  // Salva automaticamente la bozza a ogni modifica: subito sul dispositivo
  // (nessuna connessione richiesta), dopo 2 secondi anche nel cloud.
  useEffect(() => {
    if (!bozzaPronta || bozzaChiusa.current) return;
    const dati = {
      form,
      firmaOperatore,
      firmaCliente,
      nomeOperatore,
      nomeCliente,
      emailAggiuntiva,
      oraInizio,
      oraFine,
      oreViaggioAndata,
      oreViaggioRitorno,
      altriOperatori,
      oreOperatori,
      _updatedAt: new Date().toISOString(),
    };
    saveDraft(lavorazioneId, dati);
    ultimoPayload.current = dati;
    const t = setTimeout(() => {
      if (!bozzaChiusa.current && !èVuota(dati)) {
        salvaBozzaCloud(operatore, lavorazioneId, dati);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [
    bozzaPronta,
    lavorazioneId,
    form,
    firmaOperatore,
    firmaCliente,
    nomeOperatore,
    nomeCliente,
    emailAggiuntiva,
    oraInizio,
    oraFine,
    oreViaggioAndata,
    oreViaggioRitorno,
    altriOperatori,
    oreOperatori,
  ]);

  const set = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);

  const setProdotto = useCallback((idx, patch) => {
    setForm((f) => {
      const prodotti = f.prodotti.slice();
      prodotti[idx] = { ...prodotti[idx], ...patch };
      return { ...f, prodotti };
    });
  }, []);

  const addProdotto = () => {
    setForm((f) =>
      f.prodotti.length >= 4
        ? f
        : { ...f, prodotti: [...f.prodotti, emptyProdotto()] }
    );
  };

  const removeProdotto = (idx) => {
    setForm((f) =>
      f.prodotti.length <= 1
        ? f
        : { ...f, prodotti: f.prodotti.filter((_, i) => i !== idx) }
    );
  };

  // Senza le due firme (operatore e cliente) il rapportino non si può
  // inviare: entrambe sono obbligatorie, non solo i dati cliente/data.
  const canSave =
    form.cliente.trim().length > 0 &&
    form.data.trim().length > 0 &&
    !!firmaOperatore &&
    !!firmaCliente;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaveError("");

    // Il rapportino viene considerato "salvato" solo se arriva nell'archivio
    // condiviso (Supabase). Per questo il PDF e la mail vengono preparati
    // dopo, non prima: se non c'è connessione non deve succedere che il PDF
    // parta/arrivi al cliente mentre l'intervento non resta in archivio.
    const vinoRiepilogo = full
      ? form.prodotti.map((p) => p.vino).filter(Boolean).join(", ")
      : form.vino;

    let doc, filename;
    try {
      const generato = generaRapportinoPDF({
        lavorazioneId: combo || comboImb ? "confezionamento" : tipo,
        lavorazioneLabel: lav.label,
        cliente: form.cliente,
        data: form.data,
        sanificazione: form.sanificazione,
        serviziAccessori: full ? form.serviziAccessori : null,
        controlliPreOperativi: full ? form.controlliPreOperativi : null,
        oraInizio,
        oraFine,
        oreViaggioAndata: isHub ? "" : oreViaggioAndata,
        oreViaggioRitorno: isHub ? "" : oreViaggioRitorno,
        altriOperatori: isHub ? "" : altriOperatori,
        oreOperatori: isHub
          ? oreOperatori.filter((o) => o.nome.trim() || o.ore)
          : null,
        prodotti: full ? form.prodotti : null,
        vinoSemplice: form.vino,
        noteSemplice: form.note,
        noteFinali: full ? form.noteFinali : "",
        foto: full ? form.foto : [],
        firmaOperatore,
        nomeOperatore,
        firmaCliente,
        nomeCliente,
        emailAggiuntiva,
      });
      doc = generato.doc;
      filename = generato.filename;
    } catch (e) {
      console.error("Errore nella generazione del PDF:", e);
      setSaveError(
        "Non sono riuscito a generare il PDF. Controlla i dati inseriti e riprova."
      );
      return;
    }

    setSaving(true);
    setEmailWarning("");
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    try {
      await conRiprovaDiRete(async () => {
        const { error } = await supabase.from("rapportini").insert({
          lavorazione: lav.label,
          cliente: form.cliente,
          vino: vinoRiepilogo,
          operatore: nomeOperatore,
          dettagli: `Data intervento: ${form.data || "—"}`,
          pdf_base64: pdfBase64,
          // Contatore bottiglie: Bottiglia e Magnum separati
          bottiglie: full ? contaQuantita(form.prodotti).bottiglie : 0,
          magnum: full ? contaQuantita(form.prodotti).magnum : 0,
        });
        if (error) throw error;
      });
    } catch (e) {
      console.error("Errore salvataggio archivio (dopo i tentativi):", e);
      setSaving(false);
      setSaveError(
        "Nessuna connessione di rete: l'intervento NON è stato salvato in archivio e il PDF non è stato scaricato. La bozza resta qui — riprova a premere \"Salva intervento\" quando hai connessione."
      );
      return;
    }

    // Salvato in archivio: ora sì, scarica il PDF sul dispositivo.
    onSave({
      lavorazioneId,
      lavorazioneLabel: lav.label,
      cliente: form.cliente,
      vino: vinoRiepilogo,
      emailAggiuntiva,
      ora: new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    doc.save(filename);

    inviaNotificaArchiviazione({
      cliente: form.cliente,
      lavorazione: lav.label,
      operatore: nomeOperatore,
    });

    // Invio automatico al cliente, con il PDF allegato, tramite la funzione
    // Netlify collegata alla casella Gmail. Non blocca nulla: l'intervento è
    // già in archivio e scaricato a prescindere dall'esito di questo invio.
    const destinatari = isHub ? HUB_DESTINATARI : emailAggiuntiva.trim();
    if (destinatari) {
      try {
        const risposta = await fetch("/.netlify/functions/invia-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: destinatari,
            subject: `Rapportino ${lav.label} — ${form.cliente}`,
            text: testoEmailCliente({
              filename,
              lavorazioneLabel: lav.label,
              cliente: form.cliente,
              data: form.data,
              hub: isHub,
            }),
            filename,
            pdfBase64,
          }),
        });
        if (!risposta.ok) throw new Error(`risposta ${risposta.status}`);
      } catch (e) {
        console.error("Errore invio email al cliente:", e);
        setEmailWarning(
          "Il rapportino è salvato in archivio e scaricato, ma l'invio automatico della mail al cliente non è riuscito. Puoi inviarlo tu a mano dal PDF scaricato."
        );
      }
    } else {
      setEmailWarning(
        "Il rapportino è salvato in archivio e scaricato, ma non è partita nessuna mail: non è impostata l'email del cliente."
      );
    }

    setSaving(false);
    chiudiBozza();
    setSaved(true);
    setTimeout(() => onBack(), 1400);
  };

  if (!bozzaPronta) {
    return (
      <div style={styles.formWrap}>
        <p style={styles.saveHint}>Caricamento bozza…</p>
      </div>
    );
  }

  return (
    <div style={styles.formWrap}>
      <div style={styles.formHeader}>
        <button onClick={onBack} style={styles.backBtn}>
          ← lavorazioni
        </button>
        <div style={styles.formTitleRow}>
          <span style={styles.formCifra}>{lav.cifra}</span>
          <h2 style={styles.formTitle}>{lav.label}</h2>
        </div>
        {bozzaRipristinata && (
          <div style={styles.draftBanner}>
            bozza ripristinata — riprendi da dove avevi lasciato
          </div>
        )}
      </div>

      <div style={styles.formBody}>
        {/* Campi comuni */}
        <div style={styles.fieldGrid2}>
          <Field label="Cliente" required>
            <input
              style={styles.input}
              value={form.cliente}
              onChange={(e) => {
                const valore = e.target.value;
                set({ cliente: valore });
                const trovato = CLIENTI.find(
                  (c) => c.nome.toLowerCase() === valore.toLowerCase()
                );
                if (trovato && trovato.email) {
                  setEmailAggiuntiva(trovato.email);
                }
              }}
              placeholder="nome azienda / cliente"
              list="elenco-clienti"
            />
            <datalist id="elenco-clienti">
              {CLIENTI.map((c) => (
                <option key={c.nome} value={c.nome} />
              ))}
            </datalist>
          </Field>
          <Field label="Data" required>
            <input
              type="date"
              style={styles.input}
              value={form.data}
              onChange={(e) => set({ data: e.target.value })}
            />
          </Field>
        </div>

        {full && (
          <label style={styles.bioRow}>
            <input
              type="checkbox"
              checked={form.sanificazione}
              onChange={(e) => set({ sanificazione: e.target.checked })}
              style={styles.checkbox}
            />
            <span style={styles.bioText}>SANIFICAZIONE</span>
          </label>
        )}

        {(tipo === "sboccatura" || combo) && (
          <div>
            <div style={styles.sectionLabel}>Servizi accessori</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label style={{ ...styles.bioRow, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={form.serviziAccessori.filtrazioneLiqueur}
                  onChange={(e) =>
                    set({
                      serviziAccessori: {
                        ...form.serviziAccessori,
                        filtrazioneLiqueur: e.target.checked,
                      },
                    })
                  }
                  style={styles.checkbox}
                />
                <span style={styles.bioText}>FILTRAZIONE LIQUEUR</span>
              </label>
              <input
                type="text"
                style={{ ...styles.input, flex: 1, minWidth: 120 }}
                placeholder="tipo di filtro"
                value={form.serviziAccessori.filtrazioneTipo}
                onChange={(e) =>
                  set({
                    serviziAccessori: {
                      ...form.serviziAccessori,
                      filtrazioneTipo: e.target.value,
                    },
                  })
                }
              />
              <input
                type="text"
                style={{ ...styles.input, flex: 1, minWidth: 120 }}
                placeholder="lotto filtro"
                value={form.serviziAccessori.filtrazioneLotto}
                onChange={(e) =>
                  set({
                    serviziAccessori: {
                      ...form.serviziAccessori,
                      filtrazioneLotto: e.target.value,
                    },
                  })
                }
              />
            </div>
            <label style={styles.bioRow}>
              <input
                type="checkbox"
                checked={form.serviziAccessori.jetting}
                onChange={(e) =>
                  set({
                    serviziAccessori: {
                      ...form.serviziAccessori,
                      jetting: e.target.checked,
                    },
                  })
                }
                style={styles.checkbox}
              />
              <span style={styles.bioText}>JETTING</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label style={{ ...styles.bioRow, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={form.serviziAccessori.fornituraMateriali}
                  onChange={(e) =>
                    set({
                      serviziAccessori: {
                        ...form.serviziAccessori,
                        fornituraMateriali: e.target.checked,
                      },
                    })
                  }
                  style={styles.checkbox}
                />
                <span style={styles.bioText}>FORNITURA MATERIALI</span>
              </label>
              <input
                type="text"
                style={{ ...styles.input, flex: 1, minWidth: 140 }}
                placeholder="note"
                value={form.serviziAccessori.fornituraMaterialiNote}
                onChange={(e) =>
                  set({
                    serviziAccessori: {
                      ...form.serviziAccessori,
                      fornituraMaterialiNote: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        )}

        {full ? (
          <>
            {RIGHE_PRE_OPERATIVI[tipo] && (
              <TabellaControlliConforme
                titolo="Controlli pre-operativi impianto/attrezzatura"
                righe={RIGHE_PRE_OPERATIVI[tipo]}
                valori={form.controlliPreOperativi}
                onChange={(v) => set({ controlliPreOperativi: v })}
              />
            )}

            {form.prodotti.map((p, idx) => (
              <div key={idx} style={styles.prodottoBlock}>
                <div style={styles.prodottoHeader}>
                  <span style={styles.prodottoTitle}>Vino {idx + 1}</span>
                  {form.prodotti.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProdotto(idx)}
                      style={styles.linkBtn}
                    >
                      rimuovi
                    </button>
                  )}
                </div>

                <Field label="Vino">
                  <input
                    style={styles.input}
                    value={p.vino}
                    onChange={(e) => setProdotto(idx, { vino: e.target.value })}
                    placeholder="denominazione / partita"
                  />
                </Field>

                <label style={styles.bioRow}>
                  <input
                    type="checkbox"
                    checked={p.bio}
                    onChange={(e) => setProdotto(idx, { bio: e.target.checked })}
                    style={styles.checkbox}
                  />
                  <span style={styles.bioText}>BIO</span>
                </label>

                <Field label="Lotto vino">
                  <input
                    style={styles.input}
                    value={p.lottoVino}
                    onChange={(e) =>
                      setProdotto(idx, { lottoVino: e.target.value })
                    }
                  />
                </Field>

                {tipo === "travaso" && (
                  <>
                    <div style={styles.fieldGrid2}>
                      <Field label="Quantità">
                        <input
                          style={styles.input}
                          value={p.quantita}
                          onChange={(e) => setProdotto(idx, { quantita: e.target.value })}
                        />
                      </Field>
                      <Field label="Formato bottiglia">
                        <input
                          style={styles.input}
                          value={p.bottFormato}
                          onChange={(e) => setProdotto(idx, { bottFormato: e.target.value })}
                          placeholder="es. 0,75 L"
                        />
                      </Field>
                      <Field label="Capacità">
                        <input
                          style={styles.input}
                          value={p.capacita}
                          onChange={(e) => setProdotto(idx, { capacita: e.target.value })}
                        />
                      </Field>
                      <Field label="Bottiglie perse">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          style={styles.input}
                          value={p.bottigliePerse}
                          onChange={(e) => setProdotto(idx, { bottigliePerse: e.target.value })}
                        />
                      </Field>
                    </div>

                    <TabellaControlliConforme
                      titolo="Servizi accessori"
                      righe={RIGHE_SERVIZI_TRAVASO}
                      valori={p.serviziImbott || {}}
                      onChange={(v) => setProdotto(idx, { serviziImbott: v })}
                      opzioni={OPZIONI_SI_NO}
                    />

                    <div style={styles.sectionLabel}>Materiali</div>
                    {(p.materialiTravaso || []).map((m, mi) => (
                      <div key={mi} style={{ marginBottom: 10 }}>
                        {mi < MATERIALI_TRAVASO_FISSI.length ? (
                          <div style={{ fontSize: 13, marginBottom: 4 }}>
                            {MATERIALI_TRAVASO_FISSI[mi]}
                          </div>
                        ) : (
                          <input
                            style={{ ...styles.input, marginBottom: 6 }}
                            placeholder="altro materiale"
                            value={m.nome}
                            onChange={(e) => {
                              const next = p.materialiTravaso.slice();
                              next[mi] = { ...m, nome: e.target.value };
                              setProdotto(idx, { materialiTravaso: next });
                            }}
                          />
                        )}
                        <div style={styles.fieldGrid2}>
                          <input
                            style={styles.input}
                            placeholder="lotto numero"
                            value={m.lotto}
                            onChange={(e) => {
                              const next = p.materialiTravaso.slice();
                              next[mi] = { ...m, lotto: e.target.value };
                              setProdotto(idx, { materialiTravaso: next });
                            }}
                          />
                          <input
                            style={styles.input}
                            placeholder="quantità"
                            value={m.quantita}
                            onChange={(e) => {
                              const next = p.materialiTravaso.slice();
                              next[mi] = { ...m, quantita: e.target.value };
                              setProdotto(idx, { materialiTravaso: next });
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <Field label="Lotto bottiglie">
                      <input
                        style={styles.input}
                        value={p.lottoBottiglie}
                        onChange={(e) => setProdotto(idx, { lottoBottiglie: e.target.value })}
                      />
                    </Field>
                  </>
                )}

                {(tb === "imbottigliamento" || tipo === "tiraggio") && (
                  <TabellaControlliConforme
                    titolo="Servizi accessori"
                    righe={tipo === "tiraggio" ? RIGHE_SERVIZI_TIRAGGIO : RIGHE_FASI_IMBOTTIGLIAMENTO}
                    valori={p.serviziImbott || {}}
                    onChange={(v) => setProdotto(idx, { serviziImbott: v })}
                    opzioni={OPZIONI_SI_NO}
                  />
                )}

                {tipo !== "travaso" && (
                <>
                <div style={styles.sectionLabel}>
                  {tipo === "confezionamento" ? "Capsula" : "Tappo"}
                </div>
                <div style={styles.fieldGrid3}>
                  <Field label="Tipo">
                    <input
                      style={styles.input}
                      value={p.tappoTipo}
                      onChange={(e) =>
                        setProdotto(idx, { tappoTipo: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Marca">
                    <input
                      style={styles.input}
                      value={p.tappoMarca}
                      onChange={(e) =>
                        setProdotto(idx, { tappoMarca: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Lotto">
                    <input
                      style={styles.input}
                      value={p.tappoLotto}
                      onChange={(e) =>
                        setProdotto(idx, { tappoLotto: e.target.value })
                      }
                    />
                  </Field>
                </div>
                </>
                )}

                {tipo !== "confezionamento" && tipo !== "travaso" && (
                  <>
                <div style={styles.sectionLabel}>
                  {tipo === "tiraggio" ? "Bidule" : tb === "imbottigliamento" ? "Vetri" : "Gabbietta"}
                </div>
                <div style={styles.fieldGrid3}>
                  <Field label="Tipo">
                    <input
                      style={styles.input}
                      value={p.gabbiettaTipo}
                      onChange={(e) =>
                        setProdotto(idx, { gabbiettaTipo: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Marca">
                    <input
                      style={styles.input}
                      value={p.gabbiettaMarca}
                      onChange={(e) =>
                        setProdotto(idx, { gabbiettaMarca: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Lotto">
                    <input
                      style={styles.input}
                      value={p.gabbiettaLotto}
                      onChange={(e) =>
                        setProdotto(idx, { gabbiettaLotto: e.target.value })
                      }
                    />
                  </Field>
                </div>
                  </>
                )}

                {tipo !== "tiraggio" && tipo !== "confezionamento" && tipo !== "travaso" && (
                  <>
                {tb !== "imbottigliamento" && (
                  <div style={styles.sectionLabel}>Liqueur</div>
                )}
                <div style={styles.fieldGrid2}>
                  <Field label={tb === "imbottigliamento" ? "Dosaggio gomma arabica" : "Dosaggio"}>
                    <input
                      style={styles.input}
                      value={p.liqueurDosaggio}
                      onChange={(e) =>
                        setProdotto(idx, { liqueurDosaggio: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Filtrazione">
                    <input
                      style={styles.input}
                      value={p.liqueurFiltrazione}
                      onChange={(e) =>
                        setProdotto(idx, { liqueurFiltrazione: e.target.value })
                      }
                    />
                  </Field>
                </div>

                {tb !== "imbottigliamento" && (
                <>
                <div style={styles.sectionLabel}>Sedimento</div>
                <div style={styles.sedimentoRow}>
                  {[
                    { value: "bidule", label: "Dentro bidule" },
                    { value: "baga", label: "Dentro la baga" },
                    { value: "oltreBaga", label: "Oltre la baga" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        ...styles.sedimentoOption,
                        borderColor:
                          p.sedimento === opt.value
                            ? COLORS.gold
                            : COLORS.border,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={p.sedimento === opt.value}
                        onChange={() =>
                          setProdotto(idx, {
                            sedimento: p.sedimento === opt.value ? "" : opt.value,
                          })
                        }
                        style={styles.checkbox}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                </>
                )}
                  </>
                )}

                {tb !== "imbottigliamento" && tipo !== "travaso" && (
                <>
                <div style={styles.sectionLabel}>Bottiglie</div>
                <div style={styles.fieldGrid2}>
                  <Field label="Formato">
                    <input
                      style={styles.input}
                      value={p.bottFormato}
                      onChange={(e) =>
                        setProdotto(idx, { bottFormato: e.target.value })
                      }
                      placeholder="es. 0,75 L"
                    />
                  </Field>
                  <Field label="Lotto">
                    <input
                      style={styles.input}
                      value={p.bottLotto}
                      onChange={(e) =>
                        setProdotto(idx, { bottLotto: e.target.value })
                      }
                    />
                  </Field>
                </div>
                </>
                )}

                {(tipo === "confezionamento" || combo || comboImb) && (
                  <>
                    <label style={styles.bioRow}>
                      <input
                        type="checkbox"
                        checked={p.incartonamento}
                        onChange={(e) =>
                          setProdotto(idx, { incartonamento: e.target.checked })
                        }
                        style={styles.checkbox}
                      />
                      <span style={styles.bioText}>INCARTONAMENTO</span>
                    </label>
                    <div style={styles.sedimentoRow}>
                      {[
                        { value: "nastratrice", label: "Nastratrice" },
                        { value: "automatico", label: "Automatico" },
                        { value: "astuccio", label: "Astuccio" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          style={{
                            ...styles.sedimentoOption,
                            borderColor:
                              p.incartonamentoTipo === opt.value
                                ? COLORS.gold
                                : COLORS.border,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={p.incartonamentoTipo === opt.value}
                            onChange={() =>
                              setProdotto(idx, {
                                incartonamentoTipo:
                                  p.incartonamentoTipo === opt.value
                                    ? ""
                                    : opt.value,
                              })
                            }
                            style={styles.checkbox}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                <Field label="Note">
                  <textarea
                    style={{ ...styles.input, ...styles.textarea }}
                    value={p.note}
                    onChange={(e) => setProdotto(idx, { note: e.target.value })}
                  />
                </Field>

                {RIGHE_CONTROLLI_PROCESSO[tipo] && (
                  <TabellaControlliConforme
                    titolo="Controlli di processo"
                    righe={RIGHE_CONTROLLI_PROCESSO[tipo]}
                    valori={p.controlliProcesso}
                    onChange={(v) => setProdotto(idx, { controlliProcesso: v })}
                  />
                )}

                {tipo === "travaso" && (
                  <div style={{ marginTop: 14 }}>
                    <div style={styles.sectionLabel}>Pressione</div>
                    <Field label="Sovrapressione di partenza (bar)">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        style={styles.input}
                        value={p.sovrapressionePartenza}
                        onChange={(e) =>
                          setProdotto(idx, { sovrapressionePartenza: e.target.value })
                        }
                      />
                    </Field>
                    <div style={{ fontSize: 13, margin: "10px 0 4px" }}>
                      Verifica pressione con aerometro{" "}
                      <span style={{ color: COLORS.textMuted }}>(tolleranza ± 1 bar)</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {[
                        ["aerometroInizio", "Inizio lavoro"],
                        ["aerometroMeta", "Metà lavoro"],
                        ["aerometroFine", "Fine lavoro"],
                      ].map(([k, et]) => (
                        <label key={k} style={{ ...styles.bioRow, marginBottom: 0 }}>
                          <input
                            type="checkbox"
                            checked={!!p[k]}
                            onChange={(e) => setProdotto(idx, { [k]: e.target.checked })}
                            style={styles.checkbox}
                          />
                          <span style={styles.bioText}>{et}</span>
                        </label>
                      ))}
                    </div>
                    <Field label="Sovrapressione finale (bar) — riferimento ≥ 3,5 bar">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        style={styles.input}
                        value={p.sovrapressioneFinale}
                        onChange={(e) =>
                          setProdotto(idx, { sovrapressioneFinale: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                )}

                <ControlTable
                  rows={p.controlli}
                  onChange={(controlli) => setProdotto(idx, { controlli })}
                  tiraggio={tipo === "tiraggio"}
                  vetri={tb === "imbottigliamento"}
                  imbottigliamento={tb === "imbottigliamento"}
                  confezionamento={tipo === "confezionamento"}
                  semplice={tipo === "sboccatura" || combo || tipo === "travaso"}
                  combinato={combo || comboImb}
                />

                {(tipo === "sboccatura" || combo) && (
                  <div style={{ marginTop: 14 }}>
                    <div style={styles.sectionLabel}>Colmatura e rotture</div>
                    <div style={styles.fieldGrid2}>
                      <Field label="Bottiglie per colmatura">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="0"
                          style={styles.input}
                          value={p.bottigliePerColmatura}
                          onChange={(e) =>
                            setProdotto(idx, { bottigliePerColmatura: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Bottiglie rotte">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="0"
                          style={styles.input}
                          value={p.bottiglieRotte}
                          onChange={(e) =>
                            setProdotto(idx, { bottiglieRotte: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                )}

                <div style={styles.vetriBlock}>
                  <div style={styles.sectionLabel}>Registro rotture vetri (oPRP)</div>
                  <div style={styles.sectionSub}>seguire quanto riportato nella PT 8.5.3</div>
                  <div style={styles.vetriTable}>
                    <div style={styles.vetriHead}>
                      <span>Nr. bottiglie rotte</span>
                      <span>Nr. bottiglie segregate</span>
                    </div>
                    {(p.registroVetri || []).map((r, k) => (
                      <div key={k} style={styles.vetriRow}>
                        {["rotte", "segregate"].map((campo) => (
                          <input
                            key={campo}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder="0"
                            style={styles.input}
                            value={r[campo]}
                            onChange={(e) =>
                              setProdotto(idx, {
                                registroVetri: p.registroVetri.map((x, j) =>
                                  j === k ? { ...x, [campo]: e.target.value } : x
                                ),
                              })
                            }
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <Field label="Note">
                    <textarea
                      style={{ ...styles.input, ...styles.textarea }}
                      value={p.registroVetriNote || ""}
                      onChange={(e) =>
                        setProdotto(idx, { registroVetriNote: e.target.value })
                      }
                    />
                  </Field>
                  <label style={styles.vetriOk}>
                    <input
                      type="checkbox"
                      checked={!!p.okAssentiVetro}
                      onChange={(e) =>
                        setProdotto(idx, { okAssentiVetro: e.target.checked })
                      }
                      style={styles.checkbox}
                    />
                    <span>OK assenti frammenti di vetro</span>
                  </label>
                </div>
              </div>
            ))}

            {form.prodotti.length < 4 && (
              <button
                type="button"
                onClick={addProdotto}
                style={styles.addProdottoBtn}
              >
                + Aggiungi vino ({form.prodotti.length}/4)
              </button>
            )}

            <div style={styles.qtaBlock}>
              <div style={styles.sectionLabel}>Quantità bottiglie fatte</div>
              <div style={styles.qtaTable}>
                <div style={styles.qtaHead}>
                  <span style={{ flex: 1 }}>vino</span>
                  <span style={styles.qtaColHead}>Bottiglia</span>
                  <span style={styles.qtaColHead}>Magnum</span>
                  <span style={styles.qtaColHead}>Altro</span>
                </div>
                {form.prodotti.map((p, idx) => (
                  <div key={idx} style={styles.qtaRow}>
                    <div style={styles.qtaLabelWrap}>
                      <span style={styles.qtaLabel}>Vino {idx + 1}</span>
                      {p.vino ? <span style={styles.qtaSub}>{p.vino}</span> : null}
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      value={p.bottiglieFatte || ""}
                      onChange={(e) =>
                        setProdotto(idx, { bottiglieFatte: e.target.value })
                      }
                      style={styles.qtaInput}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      value={p.qtaMagnum || ""}
                      onChange={(e) =>
                        setProdotto(idx, { qtaMagnum: e.target.value })
                      }
                      style={styles.qtaInput}
                    />
                    <input
                      type="text"
                      placeholder="0"
                      value={p.qtaAltro || ""}
                      onChange={(e) =>
                        setProdotto(idx, { qtaAltro: e.target.value })
                      }
                      style={styles.qtaInput}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.noteBlock}>
              <div style={styles.sectionLabel}>Note</div>
              <textarea
                style={{ ...styles.input, ...styles.textarea }}
                value={form.noteFinali || ""}
                onChange={(e) => set({ noteFinali: e.target.value })}
                placeholder="note sull'intervento (facoltativo)"
              />
              <div style={styles.fotoRow}>
                {(form.foto || []).map((f, i) => (
                  <div key={i} style={styles.fotoThumb}>
                    <img src={f.dataUrl} alt={`Foto ${i + 1}`} style={styles.fotoImg} />
                    <button
                      type="button"
                      aria-label="Rimuovi foto"
                      onClick={() =>
                        set({ foto: form.foto.filter((_, k) => k !== i) })
                      }
                      style={styles.fotoRemove}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(form.foto || []).length < 3 && (
                  <label style={styles.fotoAdd}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>📷</span>
                    <span style={{ fontSize: 11.5 }}>Aggiungi foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = "";
                        const posti = 3 - (form.foto || []).length;
                        const nuove = [];
                        for (const file of files.slice(0, posti)) {
                          try {
                            nuove.push(await riduciFoto(file));
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        if (nuove.length)
                          set({ foto: [...(form.foto || []), ...nuove] });
                      }}
                    />
                  </label>
                )}
              </div>
              <div style={styles.fotoHint}>Fino a 3 foto · compaiono nel PDF</div>
            </div>
          </>
        ) : (
          <Field label="Note">
            <textarea
              style={{ ...styles.input, ...styles.textareaLarge }}
              value={form.note}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="descrizione libera dell'intervento"
            />
          </Field>
        )}

        <div style={styles.fieldGrid2}>
          <Field label="Ora inizio">
            <input
              type="time"
              style={styles.input}
              value={oraInizio}
              onChange={(e) => setOraInizio(e.target.value)}
            />
          </Field>
          <Field label="Ora fine">
            <input
              type="time"
              style={styles.input}
              value={oraFine}
              onChange={(e) => setOraFine(e.target.value)}
            />
          </Field>
        </div>

        {!isHub && (
        <div style={styles.fieldGrid2}>
          <Field label="Ore viaggio andata">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="es. 1,5"
              style={styles.input}
              value={oreViaggioAndata}
              onChange={(e) => setOreViaggioAndata(e.target.value)}
            />
          </Field>
          <Field label="Ore viaggio ritorno">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="es. 1,5"
              style={styles.input}
              value={oreViaggioRitorno}
              onChange={(e) => setOreViaggioRitorno(e.target.value)}
            />
          </Field>
        </div>
        )}

        {isHub && (
          <div style={styles.noteBlock}>
            <div style={styles.sectionLabel}>Ore operatori</div>
            <div style={styles.oreTable}>
              <div style={styles.oreHead}>
                <span>Operatore</span>
                <span style={{ textAlign: "right" }}>Totale ore</span>
                <span />
              </div>
              {oreOperatori.map((o, i) => (
                <div key={i} style={styles.oreRow}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="nome e cognome"
                    value={o.nome}
                    readOnly={i === 0}
                    onChange={(e) =>
                      setOreOperatori((l) =>
                        l.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x))
                      )
                    }
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    style={{ ...styles.input, textAlign: "right" }}
                    value={o.ore}
                    onChange={(e) =>
                      setOreOperatori((l) =>
                        l.map((x, k) => (k === i ? { ...x, ore: e.target.value } : x))
                      )
                    }
                  />
                  {i > 0 ? (
                    <button
                      type="button"
                      aria-label="Rimuovi operatore"
                      style={styles.oreRemove}
                      onClick={() =>
                        setOreOperatori((l) => l.filter((_, k) => k !== i))
                      }
                    >
                      ×
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={oreOperatori.length >= 4}
              onClick={() =>
                setOreOperatori((l) => [...l, { nome: "", ore: "" }])
              }
              style={{
                ...styles.addProdottoBtn,
                opacity: oreOperatori.length >= 4 ? 0.4 : 1,
              }}
            >
              + Aggiungi operatore ({oreOperatori.length}/4)
            </button>
            <div style={styles.oreTotale}>
              <span>Totale ore squadra</span>
              <b>
                {String(
                  oreOperatori.reduce((s, o) => s + (parseFloat(o.ore) || 0), 0)
                ).replace(".", ",")}
              </b>
            </div>
          </div>
        )}

        {!isHub && (
        <Field label="Secondo operatore / altro operatore">
          <input
            type="text"
            style={styles.input}
            placeholder="nome e cognome (o più nomi separati da virgola)"
            value={altriOperatori}
            onChange={(e) => setAltriOperatori(e.target.value)}
          />
        </Field>
        )}

        <div style={styles.sigGrid}>
          <SignaturePad
            label="Firma operatore"
            value={firmaOperatore}
            onChange={setFirmaOperatore}
            nome={nomeOperatore}
            onNomeChange={setNomeOperatore}
          />
          <SignaturePad
            label="Firma cliente"
            value={firmaCliente}
            onChange={setFirmaCliente}
            nome={nomeCliente}
            onNomeChange={setNomeCliente}
          />
        </div>

        <div style={styles.homeRow}>
          <button type="button" onClick={onBack} style={styles.homeBtn}>
            ← Torna alla home
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Tornare alla home e cancellare questo rapportino compilato finora?"
                )
              ) {
                chiudiBozza();
                onBack();
              }
            }}
            style={styles.homeBtnDanger}
          >
            Torna alla home e cancella
          </button>
        </div>

        {isHub ? (
          <Field label="Il rapportino verrà inviato a">
            <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
              {HUB_DESTINATARI.split(", ").map((m) => (
                <div key={m}>{m}</div>
              ))}
            </div>
          </Field>
        ) : (
          <Field label="Email cliente (per l'invio del rapportino)">
            <input
              type="email"
              style={styles.input}
              value={emailAggiuntiva}
              onChange={(e) => setEmailAggiuntiva(e.target.value)}
              placeholder="es. destinatario@azienda.it"
            />
          </Field>
        )}

        <div style={styles.saveRow}>
          {!canSave && (
            <span style={styles.saveHint}>
              mancano:{" "}
              {[
                (!form.cliente.trim() || !form.data.trim()) && "cliente e data",
                !firmaOperatore && "firma operatore",
                !firmaCliente && "firma cliente",
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
          {saveError && (
            <span style={{ ...styles.saveHint, color: "#D98F7A" }}>
              {saveError}
            </span>
          )}
          {emailWarning && (
            <span style={{ ...styles.saveHint, color: COLORS.gold }}>
              {emailWarning}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            style={{
              ...styles.saveBtn,
              opacity: canSave && !saving ? 1 : 0.4,
              cursor: canSave && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saved
              ? "Intervento salvato ✓"
              : saving
              ? "Salvataggio in corso…"
              : "Salva intervento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>
        {label}
        {required && <span style={styles.required}> *</span>}
      </span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [view, setView] = useState("home");
  const [storico, setStorico] = useState([]);
  const [operatore, setOperatore] = useState(loadOperatoreSessione());

  // Per aggiornare l'app l'operatore deve digitare il proprio PIN.
  const [chiediPinAggiorna, setChiediPinAggiorna] = useState(false);
  const [pinAggiorna, setPinAggiorna] = useState("");
  const [erroreAggiorna, setErroreAggiorna] = useState(false);

  // Aggiornamento app: quando su Netlify viene caricata una nuova versione,
  // il service worker la scarica in background e qui compare il pulsante
  // "Aggiornamento disponibile". Le bozze sono salvate sul dispositivo, quindi
  // aggiornare non fa perdere quello che si sta compilando.
  // Controlla anche ogni ora, perché una PWA lasciata aperta non cercherebbe
  // da sola nuove versioni.
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  const confermaAggiornamento = async () => {
    // "cambia" = PIN ancora iniziale/provvisorio: per aggiornare l'app basta
    // che sia quello giusto, il cambio avviene al prossimo accesso.
    const esito = await verificaPin(operatore, pinAggiorna);
    if (esito === "ok" || esito === "cambia") {
      updateServiceWorker(true);
    } else {
      setErroreAggiorna(true);
    }
  };

  const cambiaOperatore = () => {
    clearOperatoreSessione();
    setOperatore("");
    setView("home");
  };

  return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: rgba(237,232,221,0.32); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); }
      `}</style>
      {!operatore ? (
        <Login
          onLogin={(nome) => {
            saveOperatoreSessione(nome);
            setOperatore(nome);
          }}
        />
      ) : view === "home" ? (
        <Home
          storico={storico}
          onSelect={(id) => setView(id)}
          operatore={operatore}
          onCambiaOperatore={cambiaOperatore}
          onArchivio={() => setView("archivio")}
          onCaricaManuale={() => setView("carica-manuale")}
          onContatore={() => setView("contatore")}
          onGestionePin={() => setView("pin")}
        />
      ) : view === "pin" && AMMINISTRATORI.includes(operatore) ? (
        <GestionePin onBack={() => setView("home")} />
      ) : view === "archivio" ? (
        <ArchivioRapportini onBack={() => setView("home")} />
      ) : view === "carica-manuale" ? (
        <CaricaManuale onBack={() => setView("home")} />
      ) : view === "contatore" && CONTATORE_VISIBILE_A.includes(operatore) ? (
        <ContatoreBottiglie onBack={() => setView("home")} />
      ) : (
        <InterventoForm
          lavorazioneId={view}
          onBack={() => setView("home")}
          onSave={(entry) => setStorico((s) => [entry, ...s])}
          operatore={operatore}
        />
      )}
      {needRefresh && (
        <div style={styles.updateBanner}>
          {!chiediPinAggiorna ? (
            <>
              <span>Aggiornamento disponibile</span>
              <button
                onClick={() => {
                  setPinAggiorna("");
                  setErroreAggiorna(false);
                  setChiediPinAggiorna(true);
                }}
                style={styles.updateBtn}
              >
                Aggiorna ora
              </button>
            </>
          ) : (
            <>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                placeholder="Il tuo PIN"
                value={pinAggiorna}
                onChange={(e) => {
                  setPinAggiorna(e.target.value);
                  setErroreAggiorna(false);
                }}
                style={{
                  ...styles.input,
                  flex: 1,
                  minWidth: 0,
                  borderColor: erroreAggiorna ? "#D98F7A" : undefined,
                }}
              />
              <button
                onClick={confermaAggiornamento}
                style={styles.updateBtn}
              >
                Conferma
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stile — cantina, non dashboard SaaS
// ---------------------------------------------------------------------------
const FONT_DISPLAY = "'Iowan Old Style', 'Georgia', serif";
const FONT_BODY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
const FONT_MONO = "'SF Mono', 'Menlo', monospace";

const COLORS = {
  bg: "#1C2321",
  surface: "#232B27",
  surfaceRaised: "#2A332E",
  border: "rgba(237,232,221,0.14)",
  borderStrong: "rgba(237,232,221,0.28)",
  text: "#EDE8DD",
  textMuted: "#9BA79D",
  gold: "#C9A227",
  terracotta: "#B5482F",
};

const styles = {
  app: {
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: FONT_BODY,
    padding: "20px 16px 48px",
  },

  // ---- Banner aggiornamento app ----
  updateBanner: {
    position: "fixed",
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 1000,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "11px 14px",
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.gold}`,
    borderRadius: 10,
    color: COLORS.text,
    fontSize: 14,
    boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
  },
  updateBtn: {
    background: COLORS.gold,
    color: "#1C2321",
    border: "none",
    borderRadius: 7,
    padding: "8px 14px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },

  // ---- Login ----
  loginWrap: {
    maxWidth: 340,
    margin: "18vh auto 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 4,
  },
  loginLogo: { height: 56, width: "auto", marginBottom: 14 },
  loginForm: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginTop: 24,
    textAlign: "left",
  },
  loginError: {
    fontSize: 12.5,
    color: "#D98F7A",
    background: "rgba(181,72,47,0.10)",
    border: "1px solid rgba(181,72,47,0.35)",
    borderRadius: 7,
    padding: "8px 11px",
  },
  operatoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // ---- Home ----
  homeWrap: { maxWidth: 640, margin: "0 auto" },
  homeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: 18,
    marginBottom: 22,
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  brandLogo: {
    height: 44,
    width: "auto",
    display: "block",
  },
  brandTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 24,
    margin: 0,
    letterSpacing: 0.3,
  },
  brandSub: {
    margin: "2px 0 0",
    fontSize: 12.5,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  homeMeta: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    textTransform: "capitalize",
  },
  contatoreArchivio: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  archivioBtn: {
    display: "block",
    width: "100%",
    background: "rgba(201,162,39,0.10)",
    border: `1px solid rgba(201,162,39,0.4)`,
    borderRadius: 9,
    padding: "11px 14px",
    color: COLORS.gold,
    fontSize: 13.5,
    fontFamily: FONT_BODY,
    cursor: "pointer",
    marginBottom: 14,
    textAlign: "left",
  },
  archivioList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  archivioRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 9,
    padding: "12px 14px",
    background: COLORS.surface,
  },
  archivioLav: {
    fontSize: 11,
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  archivioCliente: { fontFamily: FONT_DISPLAY, fontSize: 15.5 },
  archivioMeta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },

  tileGrid: { display: "flex", flexDirection: "column", gap: 8 },
  tile: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "16px 16px",
    color: COLORS.text,
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 120ms ease",
  },
  tileCifra: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    color: COLORS.gold,
    width: 22,
  },
  tileLabel: { fontSize: 16.5, flex: 1, fontFamily: FONT_DISPLAY },
  tileArrow: { color: COLORS.textMuted, fontSize: 16 },

  storicoWrap: { marginTop: 32 },
  storicoList: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    marginTop: 10,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  storicoRow: {
    display: "flex",
    gap: 10,
    padding: "9px 12px",
    background: COLORS.surface,
    fontSize: 13,
    alignItems: "center",
  },
  storicoLav: { color: COLORS.gold, width: 130, fontSize: 12.5 },
  storicoCliente: { flex: 1, fontFamily: FONT_DISPLAY },
  storicoVino: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  storicoOra: {
    fontFamily: FONT_MONO,
    fontSize: 11.5,
    color: COLORS.textMuted,
  },

  // ---- Form ----
  formWrap: { maxWidth: 640, margin: "0 auto" },
  formHeader: { marginBottom: 20 },
  draftBanner: {
    marginTop: 10,
    padding: "7px 11px",
    borderRadius: 6,
    background: "rgba(201,162,39,0.12)",
    border: "1px solid rgba(201,162,39,0.35)",
    color: "#C9A227",
    fontSize: 12.5,
    fontStyle: "italic",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: COLORS.textMuted,
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
    marginBottom: 14,
  },
  // Pulsante "Torna alla home" ben visibile e facile da premere (Archivio)
  backBtnGrande: {
    display: "block",
    width: "100%",
    minHeight: 48,
    background: COLORS.surfaceRaised,
    border: `1.5px solid ${COLORS.gold}`,
    borderRadius: 10,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    padding: "12px 16px",
    marginBottom: 16,
    textAlign: "center",
  },
  formTitleRow: { display: "flex", alignItems: "baseline", gap: 10 },
  formCifra: { fontFamily: FONT_MONO, fontSize: 13, color: COLORS.gold },
  formTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    margin: 0,
  },
  formBody: { display: "flex", flexDirection: "column", gap: 16 },

  fieldGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fieldGrid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  required: { color: COLORS.terracotta },
  input: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 7,
    padding: "10px 11px",
    color: COLORS.text,
    fontSize: 14.5,
    fontFamily: FONT_BODY,
    outline: "none",
    width: "100%",
  },
  textarea: { minHeight: 70, resize: "vertical" },
  textareaLarge: { minHeight: 160, resize: "vertical" },

  bioRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    background: "rgba(181,72,47,0.10)",
    border: `1px solid rgba(181,72,47,0.35)`,
    borderRadius: 7,
    padding: "9px 12px",
    width: "fit-content",
    cursor: "pointer",
  },
  bioText: {
    fontSize: 12.5,
    letterSpacing: 1,
    color: "#D98F7A",
    fontWeight: 600,
  },

  sectionLabel: {
    fontSize: 11.5,
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  sectionSub: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },

  prodottoBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 16,
    background: "rgba(0,0,0,0.10)",
  },
  prodottoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  prodottoTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 17,
    color: COLORS.gold,
  },
  addProdottoBtn: {
    background: "transparent",
    border: `1px dashed ${COLORS.borderStrong}`,
    borderRadius: 10,
    padding: "12px 16px",
    color: COLORS.text,
    fontSize: 13.5,
    cursor: "pointer",
    width: "100%",
    fontFamily: FONT_BODY,
  },
  sedimentoRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  sedimentoOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    flex: "1 1 auto",
  },

  checkbox: {
    width: 17,
    height: 17,
    accentColor: COLORS.gold,
    cursor: "pointer",
  },

  // ---- Control table ----
  controlBlock: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 14,
    background: "rgba(0,0,0,0.12)",
  },
  controlHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  controlProgress: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    color: COLORS.gold,
  },
  controlTableWrap: {
    maxHeight: 320,
    overflowY: "auto",
    borderRadius: 6,
    border: `1px solid ${COLORS.border}`,
  },
  // Scroll orizzontale contenuto per la tabella "controlli di linea" di
  // Sboccatura: intestazione e righe sono DENTRO lo stesso contenitore, così
  // scorrono sempre insieme e non possono più sfasarsi su schermi stretti.
  controlTableScrollX: {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
  controlTableHead: {
    display: "flex",
    gap: 8,
    padding: "7px 10px",
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textMuted,
    borderBottom: `1px solid ${COLORS.border}`,
    position: "sticky",
    top: 0,
    background: COLORS.surface,
  },
  controlRow: {
    display: "flex",
    gap: 8,
    padding: "5px 10px",
    alignItems: "center",
    borderBottom: `1px solid rgba(237,232,221,0.06)`,
  },
  // Griglia a colonne fisse per la tabella "controlli di linea" di
  // Sboccatura: stessa definizione su intestazione e righe, garantisce che
  // ogni valore resti sotto la colonna giusta.
  gridSemplice: {
    display: "grid",
    gridTemplateColumns: "64px 76px 1fr 1fr 70px 70px 1fr",
    alignItems: "center",
  },
  controlTime: {
    width: 64,
    fontFamily: FONT_MONO,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  controlInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    fontSize: 13,
    padding: "3px 2px",
    outline: "none",
  },
  checkCell: {
    width: 76,
    display: "flex",
    justifyContent: "center",
    cursor: "pointer",
  },

  // ---- Signature ----
  noteBlock: { marginTop: 18 },
  vetriBlock: {
    marginTop: 16,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "12px 14px",
  },
  vetriTable: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6 },
  vetriHead: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  vetriRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  vetriOk: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    fontSize: 14,
    cursor: "pointer",
  },
  oreTable: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  oreHead: {
    display: "grid",
    gridTemplateColumns: "1fr 110px 34px",
    gap: 8,
    padding: "8px 10px",
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textMuted,
    background: COLORS.surface,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  oreRow: {
    display: "grid",
    gridTemplateColumns: "1fr 110px 34px",
    gap: 8,
    alignItems: "center",
    padding: "8px 10px",
    borderBottom: `1px solid rgba(237,232,221,0.06)`,
  },
  oreRemove: {
    width: 30,
    height: 30,
    borderRadius: 15,
    border: `1px solid ${COLORS.border}`,
    background: "none",
    color: COLORS.textMuted,
    fontSize: 17,
    cursor: "pointer",
    padding: 0,
  },
  oreTotale: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  fotoRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 },
  fotoThumb: {
    position: "relative",
    width: 92,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${COLORS.border}`,
  },
  fotoImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  fotoRemove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 26,
    height: 26,
    borderRadius: 13,
    border: "none",
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontSize: 18,
    lineHeight: "24px",
    padding: 0,
    cursor: "pointer",
  },
  fotoAdd: {
    width: 92,
    height: 92,
    borderRadius: 8,
    border: `1.5px dashed ${COLORS.gold}`,
    color: COLORS.textMuted,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    cursor: "pointer",
    textAlign: "center",
  },
  fotoHint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 6 },
  qtaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 14,
    background: "rgba(0,0,0,0.12)",
  },
  qtaTable: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    overflow: "hidden",
  },
  qtaHead: {
    display: "flex",
    gap: 8,
    padding: "7px 10px",
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textMuted,
    background: COLORS.surface,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  qtaRow: {
    display: "flex",
    gap: 8,
    padding: "6px 10px",
    alignItems: "center",
    borderBottom: "1px solid rgba(237,232,221,0.06)",
  },
  qtaLabelWrap: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  qtaLabel: { fontSize: 13.5, fontFamily: FONT_DISPLAY },
  qtaSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  qtaColHead: { width: 62, textAlign: "right" },
  qtaInput: {
    width: 62,
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${COLORS.borderStrong}`,
    color: COLORS.text,
    fontSize: 14.5,
    padding: "4px 2px",
    textAlign: "right",
    outline: "none",
  },

  // Le due firme una sopra l'altra, a tutta larghezza
  sigGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 22,
    marginTop: 6,
  },
  sigCanvas: {
    width: "100%",
    aspectRatio: "700 / 250",
    minHeight: 150,
    background: "rgba(0,0,0,0.18)",
    border: `1px dashed ${COLORS.borderStrong}`,
    borderRadius: 8,
    touchAction: "none",
    cursor: "crosshair",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: COLORS.gold,
    fontSize: 11,
    cursor: "pointer",
    padding: 0,
  },

  homeRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  homeBtn: {
    flex: "1 1 auto",
    background: COLORS.surface,
    border: `1px solid ${COLORS.borderStrong}`,
    borderRadius: 8,
    padding: "12px 16px",
    color: COLORS.text,
    fontSize: 13.5,
    fontFamily: FONT_BODY,
    cursor: "pointer",
  },
  homeBtnDanger: {
    flex: "1 1 auto",
    background: "rgba(181,72,47,0.10)",
    border: `1px solid rgba(181,72,47,0.45)`,
    borderRadius: 8,
    padding: "12px 16px",
    color: "#D98F7A",
    fontSize: 13.5,
    fontFamily: FONT_BODY,
    cursor: "pointer",
  },

  saveRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    marginTop: 8,
    paddingBottom: 20,
  },
  saveHint: { fontSize: 11.5, color: COLORS.textMuted },
  saveBtn: {
    background: COLORS.gold,
    color: "#1C2321",
    border: "none",
    borderRadius: 8,
    padding: "12px 22px",
    fontSize: 14.5,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
};
