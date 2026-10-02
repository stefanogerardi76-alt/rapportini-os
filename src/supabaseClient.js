import { createClient } from "@supabase/supabase-js";

// Collegamento al database condiviso (Supabase).
// La "publishable key" è pensata per stare nel codice pubblico del sito:
// non è un segreto, permette solo le operazioni che abbiamo configurato
// (inserire e leggere righe nella tabella "rapportini").
const SUPABASE_URL = "https://qsjybupryfzwnjdeumgp.supabase.co";
const SUPABASE_KEY = "sb_publishable_exNQ3TKHUEM0Ftfp4NPKeQ_vOXPkyj7";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
