import React, { useState, useRef, useEffect, useCallback } from "react";
import oenoLogo from "./oeno-logo.png";
import { generaRapportinoPDF, apriEmailConDestinatari } from "./pdfGenerator";
import { supabase } from "./supabaseClient";

// Amministratori — vedono il pulsante "Archivio rapportini" in home
const AMMINISTRATORI = ["Stefano Gerardi", "Simona Gussago", "Valentina Erović"];

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

const LAVORAZIONI = [
  { id: "tiraggio", label: "Tiraggio", cifra: "01" },
  { id: "sboccatura", label: "Sboccatura", cifra: "02" },
  { id: "imbottigliamento", label: "Imbottigliamento", cifra: "03" },
  { id: "confezionamento", label: "Confezionamento", cifra: "04" },
  { id: "travaso", label: "Travaso", cifra: "05" },
  { id: "altri", label: "Altri lavori", cifra: "06" },
];

const HAS_FULL_MASK = new Set([
  "tiraggio",
  "sboccatura",
  "imbottigliamento",
  "confezionamento",
  "travaso",
]);

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
    livello: "",
    dosaggio: "",
    inserimentoTappo: "",
    integritaTappo: false,
    posizionamentoGabbietta: false,
    bidule: false,
    chiusura: false,
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
    note: "",
    controlli: emptyControlRows(),
  };
}

function emptyFullForm() {
  return {
    cliente: "",
    data: "",
    sanificazione: false,
    prodotti: [emptyProdotto()],
  };
}

function emptyAltriForm() {
  return { cliente: "", data: "", vino: "", note: "" };
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
        width={520}
        height={140}
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
function ControlTable({ rows, onChange, tiraggio, confezionamento }) {
  const update = (idx, patch) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const filledCount = confezionamento
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

      {confezionamento ? (
        <div style={styles.controlTableWrap}>
          <div style={styles.controlTableHead}>
            <span style={{ width: 64 }}>ora</span>
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
      ) : (
        <div style={styles.controlTableWrap}>
          <div style={styles.controlTableHead}>
            <span style={{ width: 64 }}>ora</span>
            <span style={{ flex: 1 }}>livello (mm)</span>
            <span style={{ flex: 1 }}>dosaggio (ml)</span>
            <span style={{ flex: 1 }}>inser. tappo (mm)</span>
            <span style={{ width: 76, textAlign: "center" }}>bidule</span>
            <span style={{ width: 76, textAlign: "center" }}>tappo</span>
            <span style={{ width: 76, textAlign: "center" }}>integr. tappo</span>
            <span style={{ width: 76, textAlign: "center" }}>
              {tiraggio ? "posiz. bidule" : "gabbietta"}
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

  const scarica = (riga) => {
    if (!riga.pdf_base64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${riga.pdf_base64}`;
    const dataFile = riga.created_at
      ? new Date(riga.created_at).toISOString().slice(0, 10)
      : "rapportino";
    link.download = `${(riga.cliente || "cliente")
      .toLowerCase()
      .replace(/\s+/g, "-")}_${(riga.lavorazione || "rapportino")
      .toLowerCase()
      .replace(/\s+/g, "-")}_${dataFile}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <button onClick={onBack} style={styles.backBtn}>
          ← home
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

function Home({ onSelect, storico, operatore, onCambiaOperatore, onArchivio }) {
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

      {isAdmin && (
        <button onClick={onArchivio} style={styles.archivioBtn}>
          📁 Archivio rapportini
        </button>
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
// Login — nome operatore + PIN personale
// ---------------------------------------------------------------------------
function Login({ onLogin }) {
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [errore, setErrore] = useState("");

  const entra = (e) => {
    e.preventDefault();
    const trovato = OPERATORI.find(
      (o) => o.nome === nome && o.pin === pin.trim()
    );
    if (trovato) {
      setErrore("");
      onLogin(trovato.nome);
    } else {
      setErrore("PIN non corretto per l'operatore selezionato");
    }
  };

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
        <button type="submit" style={styles.saveBtn} disabled={!nome || !pin}>
          Entra
        </button>
      </form>
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

// ---------------------------------------------------------------------------
function InterventoForm({ lavorazioneId, onBack, onSave, operatore }) {
  const lav = LAVORAZIONI.find((l) => l.id === lavorazioneId);
  const full = HAS_FULL_MASK.has(lavorazioneId);
  const bozzaIniziale = loadDraft(lavorazioneId);

  const [form, setForm] = useState(
    bozzaIniziale?.form || (full ? emptyFullForm() : emptyAltriForm())
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
  const [saved, setSaved] = useState(false);
  const [bozzaRipristinata] = useState(!!bozzaIniziale);

  // Salva automaticamente la bozza a ogni modifica (nessuna connessione richiesta)
  useEffect(() => {
    saveDraft(lavorazioneId, {
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
    });
  }, [
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

  const canSave = form.cliente.trim().length > 0 && form.data.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      lavorazioneId,
      lavorazioneLabel: lav.label,
      cliente: form.cliente,
      vino: full
        ? form.prodotti.map((p) => p.vino).filter(Boolean).join(", ")
        : form.vino,
      emailAggiuntiva,
      ora: new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    // Genera il PDF del rapportino, lo scarica e apre l'email pronta
    try {
      const { doc, filename } = generaRapportinoPDF({
        lavorazioneId,
        lavorazioneLabel: lav.label,
        cliente: form.cliente,
        data: form.data,
        sanificazione: form.sanificazione,
        oraInizio,
        oraFine,
        oreViaggioAndata,
        oreViaggioRitorno,
        altriOperatori,
        prodotti: full ? form.prodotti : null,
        vinoSemplice: form.vino,
        noteSemplice: form.note,
        firmaOperatore,
        nomeOperatore,
        firmaCliente,
        nomeCliente,
        emailAggiuntiva,
      });
      doc.save(filename);
      setTimeout(() => {
        apriEmailConDestinatari({
          filename,
          cliente: form.cliente,
          lavorazioneLabel: lav.label,
          emailAggiuntiva,
        });
      }, 600);

      // Manda una copia al database condiviso (archivio), se c'è connessione.
      // Riprova automaticamente in caso di errore di rete (bug noto di
      // Safari sulle app installate su iPhone). Se fallisce comunque, il
      // PDF resta scaricato sul telefono: non blocchiamo il salvataggio.
      window.alert("ARCHIVIO — avvio tentativo di salvataggio…");
      try {
        const pdfBase64 = doc.output("datauristring").split(",")[1];
        const vinoRiepilogo = full
          ? form.prodotti.map((p) => p.vino).filter(Boolean).join(", ")
          : form.vino;
        // TEST DIAGNOSTICO TEMPORANEO: PDF escluso apposta, per capire se è
        // il peso dei dati a bloccare il salvataggio su Safari/iPhone.
        conRiprovaDiRete(async () => {
          const { error } = await supabase.from("rapportini").insert({
            lavorazione: lav.label,
            cliente: form.cliente,
            vino: vinoRiepilogo,
            operatore: nomeOperatore,
            dettagli: `Data intervento: ${form.data || "—"} [TEST senza PDF]`,
          });
          if (error) throw error;
        })
          .then(() => {
            window.alert("ARCHIVIO — salvato correttamente ✓");
          })
          .catch((e) => {
            console.error("Errore salvataggio archivio (dopo i tentativi):", e);
            window.alert(
              "ARCHIVIO — errore dopo i tentativi:\n" +
                "message: " + (e.message || "—") + "\n" +
                "code: " + (e.code || "—") + "\n" +
                "details: " + (e.details || "—") + "\n" +
                "hint: " + (e.hint || "—")
            );
          });
      } catch (e) {
        console.error("Errore preparazione dati per l'archivio:", e);
        window.alert("ARCHIVIO — errore prima dell'invio:\n" + e.message);
      }
    } catch (e) {
      console.error("Errore nella generazione del PDF:", e);
    }

    clearDraft(lavorazioneId);
    setSaved(true);
    setTimeout(() => onBack(), 1400);
  };

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

        {full ? (
          <>
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

                <div style={styles.sectionLabel}>
                  {lavorazioneId === "confezionamento" ? "Capsula" : "Tappo"}
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

                {lavorazioneId !== "confezionamento" && (
                  <>
                <div style={styles.sectionLabel}>
                  {lavorazioneId === "tiraggio" ? "Bidule" : "Gabbietta"}
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

                {lavorazioneId !== "tiraggio" && lavorazioneId !== "confezionamento" && (
                  <>
                <div style={styles.sectionLabel}>Liqueur</div>
                <div style={styles.fieldGrid2}>
                  <Field label="Dosaggio">
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

                {lavorazioneId === "confezionamento" && (
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

                <ControlTable
                  rows={p.controlli}
                  onChange={(controlli) => setProdotto(idx, { controlli })}
                  tiraggio={lavorazioneId === "tiraggio"}
                  confezionamento={lavorazioneId === "confezionamento"}
                />
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

        <Field label="Secondo operatore / altro operatore">
          <input
            type="text"
            style={styles.input}
            placeholder="nome e cognome (o più nomi separati da virgola)"
            value={altriOperatori}
            onChange={(e) => setAltriOperatori(e.target.value)}
          />
        </Field>

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
                clearDraft(lavorazioneId);
                onBack();
              }
            }}
            style={styles.homeBtnDanger}
          >
            Torna alla home e cancella
          </button>
        </div>

        <Field label="Email cliente (per l'invio del rapportino)">
          <input
            type="email"
            style={styles.input}
            value={emailAggiuntiva}
            onChange={(e) => setEmailAggiuntiva(e.target.value)}
            placeholder="es. destinatario@azienda.it"
          />
        </Field>

        <div style={styles.saveRow}>
          {!canSave && (
            <span style={styles.saveHint}>
              cliente e data sono necessari per salvare
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...styles.saveBtn,
              opacity: canSave ? 1 : 0.4,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {saved ? "Intervento salvato ✓" : "Salva intervento"}
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
        />
      ) : view === "archivio" ? (
        <ArchivioRapportini onBack={() => setView("home")} />
      ) : (
        <InterventoForm
          lavorazioneId={view}
          onBack={() => setView("home")}
          onSave={(entry) => setStorico((s) => [entry, ...s])}
          operatore={operatore}
        />
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

  sigGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 6,
  },
  sigCanvas: {
    width: "100%",
    height: 100,
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
