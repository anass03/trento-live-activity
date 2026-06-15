import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import {
  deleteAdminUser,
  getAdminCittadini, getAdminEnti, getAdminComunali, getAdminSistema,
  createAdminComunale, createAdminSistema, toggleSuperAdmin,
  AdminCittadino, AdminEnte, AdminComunale, AdminSistema,
} from "../lib/api";

type TabId = "cittadini" | "enti" | "comunali" | "sistema";

/* GDPR data minimization: il CF completo non serve a schermo per la gestione
   ordinaria — bastano gli estremi per riconoscere la persona. */
function maskCF(cf?: string | null) {
  if (!cf) return null;
  if (cf.length <= 6) return cf;
  return `${cf.slice(0, 4)}${"•".repeat(Math.max(0, cf.length - 6))}${cf.slice(-2)}`;
}

function VerifiedPill({ ok, yesLabel, noLabel }: { ok: boolean; yesLabel: string; noLabel: string }) {
  return (
    <span className={"revamp-status-pill " + (ok ? "success" : "warning")}>
      <Icon name={ok ? "check" : "clock"} size={11} /> {ok ? yesLabel : noLabel}
    </span>
  );
}

/* Form inline per creare admin comunali (ogni admin di sistema) o admin di
   sistema (solo super admin). */
function CreateAdminForm({ kind, onCreated, onCancel }: { kind: "comunale" | "sistema"; onCreated: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ nome: "", cognome: "", email: "", password: "", ufficio: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setPending(true);
    setError("");
    try {
      if (kind === "comunale") {
        await createAdminComunale({ nome: form.nome, cognome: form.cognome, email: form.email, password: form.password, ufficio: form.ufficio || undefined });
      } else {
        await createAdminSistema({ nome: form.nome, cognome: form.cognome, email: form.email, password: form.password });
      }
      onCreated();
    } catch (err: any) {
      setError(err?.message || t("admin.users.createError"));
    } finally {
      setPending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 11px", borderRadius: 8, fontSize: 13,
    background: "var(--surface-1)", color: "var(--text-primary)",
    border: "1px solid var(--border-soft, rgba(127,127,127,0.25))",
  };

  return (
    <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--border-soft, rgba(127,127,127,0.25))", marginBottom: 16 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
        {kind === "comunale" ? t("admin.users.addComunale") : t("admin.users.addSistema")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input style={inputStyle} placeholder={t("admin.users.formName")} value={form.nome} onChange={set("nome")} />
        <input style={inputStyle} placeholder={t("admin.users.formSurname")} value={form.cognome} onChange={set("cognome")} />
        <input style={inputStyle} type="email" placeholder={t("admin.users.formEmail")} value={form.email} onChange={set("email")} />
        <input style={inputStyle} type="password" placeholder={t("admin.users.formPassword")} value={form.password} onChange={set("password")} autoComplete="new-password" />
        {kind === "comunale" && (
          <input style={{ ...inputStyle, gridColumn: "span 2" }} placeholder={t("admin.users.formOffice")} value={form.ufficio} onChange={set("ufficio")} />
        )}
      </div>
      {error && <div style={{ color: "var(--red)", fontSize: 12.5, marginTop: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button className="revamp-action-btn" onClick={onCancel}>{t("admin.users.formCancel")}</button>
        <button className="revamp-action-btn success" disabled={pending || !form.nome || !form.cognome || !form.email || !form.password} onClick={submit}>
          <Icon name="plus" size={12} /> {pending ? "…" : t("admin.users.formSubmit")}
        </button>
      </div>
    </div>
  );
}

export function AdminUsersPage({ page, setPage, theme, setTheme, user }: any) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabId>("cittadini");
  const [search, setSearch] = useState("");
  const [cittadini, setCittadini] = useState<AdminCittadino[]>([]);
  const [enti, setEnti] = useState<AdminEnte[]>([]);
  const [comunali, setComunali] = useState<AdminComunale[]>([]);
  const [sistema, setSistema] = useState<AdminSistema[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [c, e, m, s] = await Promise.all([
        getAdminCittadini(), getAdminEnti(), getAdminComunali(), getAdminSistema(),
      ]);
      setCittadini(c); setEnti(e); setComunali(m); setSistema(s);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("admin.users.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Il super admin si riconosce dalla lista sistema (la pagina è admin-only).
  const meIsSuper = !!sistema.find((s) => s.id === user?.id)?.superAdmin;

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(i18n.language) : "—");

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("admin.users.deleteConfirm"))) return;
    setErrorMsg("");
    try {
      await deleteAdminUser(id);
      loadAll();
    } catch (err: any) {
      setErrorMsg(err.message || t("admin.users.deleteError"));
    }
  };

  const handleToggleSuper = async (target: AdminSistema) => {
    setErrorMsg("");
    try {
      await toggleSuperAdmin(target.id, !target.superAdmin);
      loadAll();
    } catch (err: any) {
      setErrorMsg(err.message || t("admin.users.deleteError"));
    }
  };

  const q = search.toLowerCase();
  const match = (...fields: (string | null | undefined)[]) =>
    !q || fields.some((f) => (f || "").toLowerCase().includes(q));

  const tabs: { id: TabId; icon: string; count: number }[] = [
    { id: "cittadini", icon: "users", count: cittadini.length },
    { id: "enti", icon: "shieldCheck", count: enti.length },
    { id: "comunali", icon: "landmark", count: comunali.length },
    { id: "sistema", icon: "settings", count: sistema.length },
  ];

  const deleteBtn = (id: string) =>
    id !== user?.id ? (
      <button className="revamp-action-btn danger" onClick={() => handleDelete(id)}>
        <Icon name="x" size={12} /> {t("admin.users.delete")}
      </button>
    ) : (
      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{t("admin.users.current")}</span>
    );

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>{t("admin.users.title")}</h1>
        <p>{t("admin.users.subtitle")}</p>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        {/* Tab per tipologia di account */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              className={"revamp-action-btn" + (tab === tb.id ? " success" : "")}
              style={{ padding: "9px 16px", fontSize: 13 }}
              onClick={() => { setTab(tb.id); setShowCreate(false); }}
            >
              <Icon name={tb.icon} size={13} /> {t(`admin.users.tabs.${tb.id}`)}
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, opacity: 0.75 }}>({tb.count})</span>
            </button>
          ))}
        </div>

        <div className="revamp-filter-card" style={{ marginBottom: 20 }}>
          <div className="act-search" style={{ background: "var(--surface-1)" }}>
            <Icon name="search" size={16} />
            <input
              placeholder={t("admin.users.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{t(`admin.users.tabs.${tab}`)}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {loading && <Icon name="refresh" size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
              {tab === "comunali" && !showCreate && (
                <button className="revamp-action-btn success" onClick={() => setShowCreate(true)}>
                  <Icon name="plus" size={12} /> {t("admin.users.addComunale")}
                </button>
              )}
              {tab === "sistema" && meIsSuper && !showCreate && (
                <button className="revamp-action-btn success" onClick={() => setShowCreate(true)}>
                  <Icon name="plus" size={12} /> {t("admin.users.addSistema")}
                </button>
              )}
            </div>
          </div>

          {showCreate && (tab === "comunali" || (tab === "sistema" && meIsSuper)) && (
            <CreateAdminForm
              kind={tab === "comunali" ? "comunale" : "sistema"}
              onCreated={() => { setShowCreate(false); loadAll(); }}
              onCancel={() => setShowCreate(false)}
            />
          )}

          <div className="revamp-table-wrap">
            {tab === "cittadini" && (
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("admin.users.colName")}</th>
                    <th>{t("admin.users.colEmail")}</th>
                    <th>{t("admin.users.colBirth")}</th>
                    <th>{t("admin.users.colCF")}</th>
                    <th>{t("admin.users.colVerified")}</th>
                    <th>{t("admin.users.colCreated")}</th>
                    <th>{t("admin.users.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cittadini.filter((u) => match(u.nome, u.cognome, u.email, u.codiceFiscale)).map((u) => (
                    <tr key={u.id}>
                      <td><b>{`${u.nome || ""} ${u.cognome || ""}`.trim() || t("admin.users.noName")}</b></td>
                      <td>{u.email}</td>
                      <td>{fmtDate(u.dataNascita)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                        {maskCF(u.codiceFiscale) || <span style={{ color: "var(--text-muted)" }}>{t("admin.users.googleAccount")}</span>}
                      </td>
                      <td><VerifiedPill ok={!!u.emailVerified} yesLabel={t("admin.users.verified")} noLabel={t("admin.users.notVerified")} /></td>
                      <td>{fmtDate(u.createdAt)}</td>
                      <td>{deleteBtn(u.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "enti" && (
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("admin.users.colName")}</th>
                    <th>{t("admin.users.colEmail")}</th>
                    <th>{t("admin.users.colPec")}</th>
                    <th>{t("admin.users.colStatus")}</th>
                    <th>{t("admin.users.colCreated")}</th>
                    <th>{t("admin.users.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {enti.filter((u) => match(u.nomeEnte, u.email, u.pec)).map((u) => (
                    <tr key={u.id}>
                      <td><b>{u.nomeEnte || t("admin.users.noName")}</b></td>
                      <td>{u.email}</td>
                      <td>{u.pec || "—"}</td>
                      <td><VerifiedPill ok={!!u.approvato} yesLabel={t("admin.users.approved")} noLabel={t("admin.users.pending")} /></td>
                      <td>{fmtDate(u.createdAt)}</td>
                      <td>{deleteBtn(u.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "comunali" && (
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("admin.users.colName")}</th>
                    <th>{t("admin.users.colEmail")}</th>
                    <th>{t("admin.users.colOffice")}</th>
                    <th>{t("admin.users.colCreated")}</th>
                    <th>{t("admin.users.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comunali.filter((u) => match(u.nome, u.cognome, u.email, u.ufficio)).map((u) => (
                    <tr key={u.id}>
                      <td><b>{`${u.nome || ""} ${u.cognome || ""}`.trim() || t("admin.users.noName")}</b></td>
                      <td>{u.email}</td>
                      <td>{u.ufficio || "—"}</td>
                      <td>{fmtDate(u.createdAt)}</td>
                      <td>{deleteBtn(u.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "sistema" && (
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("admin.users.colName")}</th>
                    <th>{t("admin.users.colEmail")}</th>
                    <th>{t("admin.users.col2fa")}</th>
                    <th>{t("admin.users.colSuper")}</th>
                    <th>{t("admin.users.colCreated")}</th>
                    <th>{t("admin.users.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sistema.filter((u) => match(u.nome, u.cognome, u.email)).map((u) => (
                    <tr key={u.id}>
                      <td><b>{`${u.nome || ""} ${u.cognome || ""}`.trim() || t("admin.users.noName")}</b></td>
                      <td>{u.email}</td>
                      <td><VerifiedPill ok={!!u.twoFactorEnabled} yesLabel="2FA" noLabel="—" /></td>
                      <td>
                        {u.superAdmin
                          ? <span className="revamp-status-pill info"><Icon name="shieldCheck" size={11} /> Super Admin</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>{fmtDate(u.createdAt)}</td>
                      <td>
                        <div className="revamp-admin-row-actions">
                          {meIsSuper && u.id !== user?.id && (
                            <button className="revamp-action-btn" onClick={() => handleToggleSuper(u)}>
                              <Icon name="shieldCheck" size={12} /> {u.superAdmin ? t("admin.users.demote") : t("admin.users.promote")}
                            </button>
                          )}
                          {meIsSuper || u.id === user?.id ? deleteBtn(u.id) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {tab === "sistema" && !meIsSuper && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--text-muted)" }}>
              <Icon name="alert" size={12} /> {t("admin.users.superOnly")}
            </div>
          )}
          {tab === "cittadini" && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
              {t("admin.users.privacyNote")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
