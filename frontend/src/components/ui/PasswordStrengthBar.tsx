import { useTranslation } from "react-i18next";

export function passwordStrength(pw: string): { score: number; labelKey: string; color: string } {
  if (!pw) return { score: 0, labelKey: "auth.pwStrength.empty", color: "var(--border-soft)" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, labelKey: "auth.pwStrength.veryWeak", color: "var(--red)" };
  if (score === 2) return { score, labelKey: "auth.pwStrength.weak",     color: "var(--amber)" };
  if (score === 3) return { score, labelKey: "auth.pwStrength.fair",     color: "var(--amber)" };
  if (score === 4) return { score, labelKey: "auth.pwStrength.good",     color: "var(--green)" };
  return              { score, labelKey: "auth.pwStrength.strong",    color: "var(--teal)" };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const { t } = useTranslation();
  const { score, labelKey, color } = passwordStrength(password);
  if (!password) return null;

  const hints: string[] = [];
  if (password.length < 8) hints.push(t("auth.pwStrength.hintLen"));
  if (!/[A-Z]/.test(password)) hints.push(t("auth.pwStrength.hintUpper"));
  if (!/[0-9]/.test(password)) hints.push(t("auth.pwStrength.hintNum"));
  if (!/[^A-Za-z0-9]/.test(password)) hints.push(t("auth.pwStrength.hintSpecial"));

  return (
    <div style={{ marginTop: 6, marginBottom: 2 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= score ? color : "var(--border-soft)",
              transition: "background 220ms ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color, fontWeight: 650, transition: "color 220ms" }}>
          {t(labelKey)}
        </span>
        {hints.length > 0 && (
          <span style={{ fontSize: 10.5, color: "var(--text-faint)", textAlign: "right" }}>
            {hints[0]}
          </span>
        )}
      </div>
    </div>
  );
}
