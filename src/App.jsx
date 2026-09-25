import React, { useState, useRef, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// RAPPORTINI OS
// Registro interventi da cantina — un pannello di controllo, non un modulo.
// ---------------------------------------------------------------------------

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
    note: "",
    controlli: emptyControlRows(),
  };
}

function emptyFullForm() {
  return {
    cliente: "",
    data: "",
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
function ControlTable({ rows, onChange }) {
  const update = (idx, patch) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const filledCount = rows.filter((r) => r.livello !== "").length;

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

      <div style={styles.controlTableWrap}>
        <div style={styles.controlTableHead}>
          <span style={{ width: 64 }}>ora</span>
          <span style={{ flex: 1 }}>livello (mm)</span>
          <span style={{ flex: 1 }}>dosaggio (ml)</span>
          <span style={{ flex: 1 }}>inser. tappo (mm)</span>
          <span style={{ width: 76, textAlign: "center" }}>bidule</span>
          <span style={{ width: 76, textAlign: "center" }}>tappo</span>
          <span style={{ width: 76, textAlign: "center" }}>integr. tappo</span>
          <span style={{ width: 76, textAlign: "center" }}>gabbietta</span>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home — elenco lavorazioni
// ---------------------------------------------------------------------------
function Home({ onSelect, storico }) {
  return (
    <div style={styles.homeWrap}>
      <header style={styles.homeHeader}>
        <div style={styles.brandRow}>
          <div style={styles.brandMark}>R·OS</div>
          <div>
            <h1 style={styles.brandTitle}>RAPPORTINI OS</h1>
            <p style={styles.brandSub}>registro interventi di cantina</p>
          </div>
        </div>
        <div style={styles.homeMeta}>
          {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </header>

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
function InterventoForm({ lavorazioneId, onBack, onSave }) {
  const lav = LAVORAZIONI.find((l) => l.id === lavorazioneId);
  const full = HAS_FULL_MASK.has(lavorazioneId);
  const [form, setForm] = useState(full ? emptyFullForm() : emptyAltriForm());
  const [firmaOperatore, setFirmaOperatore] = useState("");
  const [firmaCliente, setFirmaCliente] = useState("");
  const [nomeOperatore, setNomeOperatore] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [saved, setSaved] = useState(false);

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
      ora: new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setSaved(true);
    setTimeout(() => onBack(), 900);
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
      </div>

      <div style={styles.formBody}>
        {/* Campi comuni */}
        <div style={styles.fieldGrid2}>
          <Field label="Cliente" required>
            <input
              style={styles.input}
              value={form.cliente}
              onChange={(e) => set({ cliente: e.target.value })}
              placeholder="nome azienda / cliente"
            />
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

                <div style={styles.sectionLabel}>Tappo</div>
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

                <div style={styles.sectionLabel}>Gabbietta</div>
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

  return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: rgba(237,232,221,0.32); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); }
      `}</style>
      {view === "home" ? (
        <Home
          storico={storico}
          onSelect={(id) => setView(id)}
        />
      ) : (
        <InterventoForm
          lavorazioneId={view}
          onBack={() => setView("home")}
          onSave={(entry) => setStorico((s) => [entry, ...s])}
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
  brandMark: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    letterSpacing: 1.5,
    color: COLORS.gold,
    border: `1px solid ${COLORS.gold}`,
    borderRadius: 5,
    padding: "5px 7px",
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
