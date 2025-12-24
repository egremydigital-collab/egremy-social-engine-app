import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const nav = useNavigate();

  // === EGREMY DESIGN SYSTEM ===
  const colors = useMemo(
    () => ({
      bg: "#0b1220",
      panel: "rgba(15, 23, 42, 0.72)",
      border: "rgba(148, 163, 184, 0.18)",
      text: "rgba(248, 250, 252, 0.95)",
      textMuted: "rgba(226, 232, 240, 0.70)",
      accent: "#22f2c4",
      accentGlow: "rgba(34, 242, 196, 0.22)",
      accentSoft: "rgba(34, 242, 196, 0.10)",

      error: "#fb7185",
      errorSoft: "rgba(251, 113, 133, 0.14)",
      success: "#34d399",
      successSoft: "rgba(52, 211, 153, 0.14)",

      shadow: "0 18px 60px rgba(0,0,0,0.55)",
    }),
    []
  );

  // ✅ Fix: no ejecutar getSession en cada render
  useEffect(() => {
    const goIfSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) nav("/");
    };
    goIfSession();
  }, [nav]);

  const canSubmit = !!email.trim() && !!password && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
      return;
    }

    nav("/");
    setLoading(false);
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatus({ type: "error", message: "Escribe tu email arriba para enviarte el link de recuperación." });
      return;
    }

    setSendingReset(true);
    setStatus(null);

    // Nota: si ya tienes una ruta de reset en tu app, cámbiala aquí:
    // e.g. `${window.location.origin}/reset`
    const redirectTo = `${window.location.origin}/`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setSendingReset(false);
      return;
    }

    setStatus({
      type: "success",
      message: "Listo ✅ Te envié un correo para restablecer tu contraseña (revisa spam/promociones).",
    });
    setSendingReset(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "44px 24px",
        color: colors.text,
        fontFamily:
          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        background: `radial-gradient(900px 600px at 12% 12%, ${colors.accentGlow}, transparent 55%),
                     radial-gradient(900px 600px at 88% 18%, rgba(34,242,196,0.10), transparent 60%),
                     linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(11,18,32,1) 60%, rgba(2,6,23,1) 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Card */}
        <div
          style={{
            padding: 22,
            borderRadius: 18,
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            boxShadow: colors.shadow,
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: -0.2,
                textShadow: `0 0 28px ${colors.accentGlow}, 0 16px 45px rgba(0,0,0,0.55)`,
              }}
            >
              🚀 Egremy Social Engine
            </h1>
            <p style={{ margin: "10px 0 0", color: colors.textMuted, fontSize: 13 }}>
              No generamos posts. Construimos{" "}
              <span style={{ color: colors.accent, fontWeight: 800 }}>sistemas de comunicación</span>.
            </p>
            <p style={{ margin: "8px 0 0", color: colors.textMuted, fontSize: 13 }}>
              Inicia sesión para continuar.
            </p>
          </div>

          {/* Email */}
          <label style={{ display: "block", fontSize: 12, color: colors.textMuted, fontWeight: 800 }}>
            Email
          </label>
          <input
            style={{
              width: "100%",
              padding: "12px 14px",
              marginTop: 8,
              boxSizing: "border-box",
              borderRadius: 12,
              background: "rgba(2,6,23,0.35)",
              border: `1px solid ${colors.border}`,
              color: colors.text,
              outline: "none",
              transition: "all 0.2s",
            }}
            placeholder="tu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.accent;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentSoft}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          {/* Password + Eye */}
          <label style={{ display: "block", fontSize: 12, color: colors.textMuted, fontWeight: 800, marginTop: 14 }}>
            Contraseña
          </label>

          <div style={{ position: "relative", marginTop: 8 }}>
            <input
              style={{
                width: "100%",
                padding: "12px 44px 12px 14px",
                boxSizing: "border-box",
                borderRadius: 12,
                background: "rgba(2,6,23,0.35)",
                border: `1px solid ${colors.border}`,
                color: colors.text,
                outline: "none",
                transition: "all 0.2s",
              }}
              placeholder="••••••••"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.accent;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentSoft}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = "none";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) handleLogin();
              }}
            />

            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: "rgba(2,6,23,0.35)",
                color: colors.textMuted,
                cursor: "pointer",
                padding: "8px 10px",
                fontWeight: 900,
              }}
              title={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Actions */}
          <button
            style={{
              width: "100%",
              padding: 14,
              marginTop: 16,
              cursor: canSubmit ? "pointer" : "not-allowed",
              borderRadius: 14,
              border: canSubmit ? "none" : `1px solid ${colors.border}`,
              background: canSubmit
                ? `linear-gradient(135deg, ${colors.accent} 0%, #14b8a6 100%)`
                : "rgba(148,163,184,0.10)",
              color: canSubmit ? "#0b1220" : colors.textMuted,
              fontWeight: 900,
              transition: "all 0.2s",
              boxShadow: canSubmit ? `0 0 22px ${colors.accentGlow}, 0 10px 30px rgba(0,0,0,0.45)` : "none",
            }}
            onClick={handleLogin}
            disabled={!canSubmit}
            onMouseEnter={(e) => {
              if (!canSubmit) return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = `0 0 32px ${colors.accentGlow}, 0 18px 45px rgba(0,0,0,0.50)`;
            }}
            onMouseLeave={(e) => {
              if (!canSubmit) return;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 0 22px ${colors.accentGlow}, 0 10px 30px rgba(0,0,0,0.45)`;
            }}
          >
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>

          {/* Reset password */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={sendingReset}
              style={{
                background: "transparent",
                border: "none",
                color: colors.accent,
                cursor: sendingReset ? "not-allowed" : "pointer",
                fontWeight: 900,
                padding: 0,
                textDecoration: "underline",
                textUnderlineOffset: 4,
                opacity: sendingReset ? 0.7 : 1,
              }}
              title="Enviar link de recuperación"
            >
              {sendingReset ? "Enviando…" : "¿Olvidaste tu contraseña?"}
            </button>

            <span style={{ color: "rgba(226,232,240,0.55)", fontSize: 12 }}>
              Tip: usa Enter para entrar.
            </span>
          </div>

          {/* Status */}
          {status && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 12,
                border:
                  status.type === "error"
                    ? `1px solid rgba(251,113,133,0.35)`
                    : `1px solid rgba(34,242,196,0.35)`,
                background: status.type === "error" ? colors.errorSoft : colors.successSoft,
                color: status.type === "error" ? colors.error : colors.success,
                fontSize: 13,
                lineHeight: 1.35,
              }}
            >
              {status.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <p style={{ margin: 0, color: colors.textMuted, fontSize: 12, lineHeight: 1.5 }}>
            <span style={{ color: colors.accent, fontWeight: 800 }}>Egremy Social Engine</span>
            <br />
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.75)" }}>
              A system by Egremy Digital — Branding & Web Agency
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
