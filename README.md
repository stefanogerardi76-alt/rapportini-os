# Rapportini OS — progetto pronto per la pubblicazione

## Cosa contiene questa cartella
Un progetto React (Vite) già configurato come **PWA** (Progressive Web App):
una volta pubblicato online, dal telefono/tablet si potrà scegliere
"Aggiungi a schermata Home" e l'app comparirà con la sua icona,
si aprirà a schermo intero (senza barra del browser) e funzionerà
anche offline per le schermate già visitate.

## Prima di pubblicare
1. Servono due immagini icona da mettere nella cartella `public/`:
   - `icon-192.png` (192×192 px)
   - `icon-512.png` (512×512 px)
   Basta il logo/marchio "R·OS" o quello definitivo dell'azienda.

2. Installare le dipendenze (richiede Node.js):
   ```
   npm install
   ```

3. Provare in locale:
   ```
   npm run dev
   ```

4. Creare la build di produzione:
   ```
   npm run build
   ```
   Questo genera la cartella `dist/`, pronta per essere pubblicata.

## Come metterla online (nessun costo, in pochi minuti)
La via più semplice è **Vercel** o **Netlify**:

- Si crea un account gratuito su vercel.com o netlify.com
- Si collega la cartella del progetto (o il repository Git, se ne avete uno)
- Il servizio esegue automaticamente `npm run build` e pubblica il sito
- Si ottiene un indirizzo tipo `rapportini-os.vercel.app`

Da quel momento, aprendo quell'indirizzo da telefono/tablet e scegliendo
"Aggiungi a schermata Home" (Safari su iPhone/iPad, o il menu di Chrome
su Android), l'app diventa installabile come una vera app.

## Nota sui dati
In questa versione i dati inseriti restano solo nella sessione del
dispositivo (non c'è ancora un salvataggio permanente su server).
Quando l'anagrafica clienti e il flusso definitivo saranno pronti,
si può aggiungere un backend (database) per salvare gli interventi
in modo permanente e condiviso tra i dispositivi.
