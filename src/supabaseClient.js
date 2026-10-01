import { createClient } from "@supabase/supabase-js";

// Collegamento al database condiviso (Supabase).
// La "publishable key" è pensata per stare nel codice pubblico del sito:
// non è un segreto, permette solo le operazioni che abbiamo configurato
// (inserire e leggere righe nella tabella "rapportini").
const SUPABASE_URL = "https://qsjybupryfzwnjdeumgp.supabase.co";
const SUPABASE_KEY = "sb_publishable_exNQ3TKHUEM0Ftfp4NPKeQ_vOXPkyj7";

// Bug noto di Safari su iPhone: quando l'app è installata sulla schermata
// Home (modalità standalone), le richieste di rete fatte con "fetch" a volte
// falliscono con l'errore "TypeError: Load failed" — un limite del sistema,
// non del nostro codice. Il metodo più vecchio "XMLHttpRequest" non ha
// questo problema, quindi lo usiamo al posto di "fetch" solo per parlare
// con il database, lasciando tutto il resto dell'app invariato.
function fetchConXHR(url, opzioni = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(opzioni.method || "GET", url, true);

    if (opzioni.headers) {
      Object.entries(opzioni.headers).forEach(([chiave, valore]) => {
        xhr.setRequestHeader(chiave, valore);
      });
    }

    xhr.onload = () => {
      const headers = new Headers();
      xhr
        .getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/)
        .forEach((riga) => {
          const parti = riga.split(": ");
          const nomeHeader = parti.shift();
          const valoreHeader = parti.join(": ");
          if (nomeHeader) headers.append(nomeHeader, valoreHeader);
        });

      resolve(
        new Response(xhr.response, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers,
        })
      );
    };

    xhr.onerror = () => reject(new TypeError("Richiesta di rete fallita"));
    xhr.ontimeout = () => reject(new TypeError("Richiesta di rete scaduta"));
    xhr.responseType = "text";

    xhr.send(opzioni.body || null);
  });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: fetchConXHR },
});
