# Rapportini OS — guida alla pubblicazione (da fare su un computer)

Serve un computer (anche preso in prestito) solo per QUESTO primo
passaggio. Dura circa 15-20 minuti, si fa una volta sola. Dopo,
l'app sarà online e la userete solo da tablet/telefono.

Cosa serve prima di iniziare:
- Il file `rapportini-os-pwa.zip` (già pronto, scaricato da questa chat)
- Una connessione internet

---

## PASSO 1 — Installare Node.js (se non c'è già)

1. Andare su **nodejs.org**
2. Scaricare la versione "LTS" (quella consigliata, a sinistra)
3. Aprire il file scaricato e seguire l'installazione (Avanti, Avanti, Fine)

## PASSO 2 — Estrarre il progetto

1. Trovare il file `rapportini-os-pwa.zip` scaricato
2. Tasto destro → "Estrai tutto" (Windows) oppure doppio click (Mac)
3. Si ottiene una cartella `rapportini-os-pwa`

## PASSO 3 — Aprire il Terminale nella cartella

- **Windows**: aprire la cartella `rapportini-os-pwa`, poi nella barra
  dell'indirizzo in alto scrivere `cmd` e premere Invio
- **Mac**: aprire l'app "Terminale", scrivere `cd ` (con lo spazio),
  trascinare la cartella `rapportini-os-pwa` dentro la finestra del
  Terminale, poi premere Invio

## PASSO 4 — Installare e costruire il progetto

Nel Terminale, scrivere questi due comandi, uno alla volta,
premendo Invio dopo ciascuno (il primo richiede qualche minuto):

```
npm install
```

```
npm run build
```

Al termine comparirà una nuova cartella chiamata `dist` dentro il progetto.

## PASSO 5 — Pubblicare online (gratis, senza registrazione)

1. Andare su **app.netlify.com/drop** (dal browser)
2. Trascinare la cartella `dist` (quella appena creata) dentro la pagina
3. In pochi secondi Netlify pubblica il sito e mostra un indirizzo
   tipo `nome-a-caso-1234.netlify.app`
4. **Copiare quell'indirizzo** — è il link dell'app

(Facoltativo ma consigliato: creare un account gratuito su Netlify
subito dopo, per "reclamare" il sito ed evitare che scada dopo
qualche giorno da anonimo. Basta il tasto "Claim this site" che
appare nella pagina dopo il caricamento.)

## PASSO 6 — Installarla sul tablet/telefono

1. Aprire quell'indirizzo dal browser del tablet/telefono
   (Safari su iPhone/iPad, Chrome su Android)
2. **iPhone/iPad (Safari)**: toccare l'icona di condivisione (il
   quadrato con la freccia in su) → "Aggiungi a Home"
3. **Android (Chrome)**: toccare i tre puntini in alto a destra →
   "Aggiungi a schermata Home" / "Installa app"

Da quel momento comparirà l'icona di Rapportini OS sulla schermata
Home, e si aprirà come un'app vera, a schermo intero.

---

Se qualche passaggio dà un messaggio d'errore, basta scrivermi
esattamente cosa dice: aiuto a risolverlo.
