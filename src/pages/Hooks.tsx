import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Hook {
  code: string;
  text: string;
  category: string;
  tip: string;
  why: string;
}

// === EGREMY DESIGN SYSTEM ===
const colors = {
  bg: "#0f172a",
  bgCard: "#1e293b",
  bgCardHover: "#334155",

  // ✅ Egremy accent unificado
  accent: "#22f2c4",
  accentGlow: "rgba(34, 242, 196, 0.22)",
  accentSoft: "rgba(34, 242, 196, 0.10)",
  bgCardSelected: "rgba(34, 242, 196, 0.08)",

  text: "#f8fafc",
  textMuted: "#94a3b8",
  textDark: "#0b1220",
  border: "#334155",
  success: "#10b981",
};

const glowButton = {
  background: `linear-gradient(135deg, ${colors.accent} 0%, #14b8a6 100%)`,
  boxShadow: `0 0 22px ${colors.accentGlow}, 0 10px 30px rgba(0,0,0,0.45)`,
  border: "none",
  color: colors.textDark,
  fontWeight: "800" as const,
};

const chipStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "800" as const,
  background: "rgba(2,6,23,0.30)",
  border: `1px solid ${colors.border}`,
  color: colors.textMuted,
};

export default function Hooks() {
  const nav = useNavigate();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedHooks = localStorage.getItem("suggested_hooks");
    if (savedHooks) {
      setHooks(JSON.parse(savedHooks));
    } else {
      nav("/create");
    }
  }, [nav]);

  const handleGenerate = async () => {
    if (!selectedHook) {
      alert("Selecciona un hook primero");
      return;
    }

    setLoading(true);

    try {
      const formData = JSON.parse(localStorage.getItem("run_form_data") || "{}");
      const projectId = localStorage.getItem("selected_project_id");

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken || !projectId) {
        alert("Error de autenticación. Vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }

      const { data: result, error } = await supabase.functions.invoke("generate-content", {
        body: {
          project_id: projectId,
          selected_hook_code: selectedHook,
          ...formData,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        console.error("Function error:", error);
        alert("Error: " + error.message);
        setLoading(false);
        return;
      }

      if (result.error) {
        alert("Error: " + result.error);
        setLoading(false);
        return;
      }

      localStorage.setItem("generation_result", JSON.stringify(result));
      nav("/result");
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión. Revisa la consola.");
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
      Error: { bg: "rgba(239, 68, 68, 0.14)", border: "rgba(239, 68, 68, 0.32)", text: "#f87171" },
      Autoridad: { bg: "rgba(99, 102, 241, 0.14)", border: "rgba(99, 102, 241, 0.32)", text: "#a5b4fc" },
      Identidad: { bg: "rgba(34, 242, 196, 0.14)", border: "rgba(34, 242, 196, 0.32)", text: colors.accent },
      Curiosidad: { bg: "rgba(251, 191, 36, 0.14)", border: "rgba(251, 191, 36, 0.32)", text: "#fbbf24" },
      "Prueba Social": { bg: "rgba(16, 185, 129, 0.14)", border: "rgba(16, 185, 129, 0.32)", text: "#34d399" },
    };
    return categoryColors[category] || { bg: colors.bgCardHover, border: colors.border, text: colors.textMuted };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "44px 24px",
        color: colors.text,
        background: `radial-gradient(900px 600px at 12% 12%, ${colors.accentGlow}, transparent 55%),
                     radial-gradient(900px 600px at 88% 18%, rgba(34,242,196,0.10), transparent 60%),
                     linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 60%, rgba(2,6,23,1) 100%)`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Back button */}
        <button
          onClick={() => nav("/create")}
          style={{
            marginBottom: 24,
            cursor: "pointer",
            background: "rgba(2,6,23,0.30)",
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
            padding: "10px 16px",
            borderRadius: 12,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.accent;
            e.currentTarget.style.color = colors.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.color = colors.textMuted;
          }}
        >
          ← Volver a Configuración
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 900,
            textShadow: `0 0 28px ${colors.accentGlow}, 0 16px 45px rgba(0,0,0,0.55)`,
          }}
        >
          🎣 Selecciona un Hook
        </h1>

        {/* Microcopy */}
        <p style={{ color: colors.textMuted, marginTop: 10, marginBottom: 6, fontSize: 14 }}>
          No generamos posts. Construimos <span style={{ color: colors.accent, fontWeight: 800 }}>sistemas de comunicación</span>.
        </p>
        <p style={{ color: colors.textMuted, marginTop: 0, marginBottom: 28, fontSize: 13 }}>
          Cada hook está optimizado para tu objetivo. Elige el que mejor conecte con tu audiencia.
        </p>

        {/* Hooks list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {hooks.map((hook) => {
            const isSelected = selectedHook === hook.code;
            const catColor = getCategoryColor(hook.category);

            return (
              <div
                key={hook.code}
                onClick={() => setSelectedHook(hook.code)}
                style={{
                  padding: 22,
                  border: isSelected ? `1px solid rgba(34,242,196,0.55)` : `1px solid ${colors.border}`,
                  borderRadius: 16,
                  cursor: "pointer",
                  background: isSelected ? colors.bgCardSelected : colors.bgCard,
                  transition: "all 0.22s ease",
                  boxShadow: isSelected ? `0 0 26px ${colors.accentGlow}` : "0 12px 32px rgba(0,0,0,0.22)",
                  transform: isSelected ? "translateY(-1px)" : "translateY(0)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "rgba(34,242,196,0.35)";
                    e.currentTarget.style.background = colors.bgCardHover;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.background = colors.bgCard;
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {/* Header chips */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span
                    style={{
                      ...chipStyle,
                      background: isSelected ? colors.accentSoft : "rgba(2,6,23,0.25)",
                      borderColor: isSelected ? "rgba(34,242,196,0.55)" : colors.border,
                      color: isSelected ? colors.accent : colors.textMuted,
                    }}
                  >
                    {hook.code}
                  </span>
                  <span
                    style={{
                      ...chipStyle,
                      background: catColor.bg,
                      borderColor: catColor.border,
                      color: catColor.text,
                    }}
                  >
                    {hook.category}
                  </span>
                </div>

                {/* Hook text */}
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 18,
                    color: colors.text,
                    fontWeight: 600,
                    lineHeight: 1.45,
                  }}
                >
                  “{hook.text}”
                </h3>

                {/* Tip */}
                <p style={{ margin: "0 0 8px", color: colors.textMuted, fontSize: 13, lineHeight: 1.5 }}>
                  💡 <strong style={{ color: colors.text }}>Tip:</strong> {hook.tip}
                </p>

                {/* Why */}
                <p style={{ margin: 0, color: "rgba(16,185,129,0.95)", fontSize: 13, lineHeight: 1.45 }}>
                  ✅ {hook.why}
                </p>
              </div>
            );
          })}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedHook || loading}
          style={{
            width: "100%",
            padding: 18,
            fontSize: 16,
            cursor: !selectedHook || loading ? "not-allowed" : "pointer",
            background: selectedHook ? glowButton.background : "rgba(148,163,184,0.10)",
            color: selectedHook ? colors.textDark : colors.textMuted,
            border: selectedHook ? "none" : `1px solid ${colors.border}`,
            borderRadius: 14,
            marginTop: 26,
            opacity: loading ? 0.75 : 1,
            transition: "all 0.22s",
            boxShadow: selectedHook ? glowButton.boxShadow : "none",
            fontWeight: 900,
          }}
          onMouseEnter={(e) => {
            if (!selectedHook || loading) return;
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = `0 0 30px ${colors.accentGlow}, 0 18px 45px rgba(0,0,0,0.50)`;
          }}
          onMouseLeave={(e) => {
            if (!selectedHook || loading) return;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = glowButton.boxShadow;
          }}
        >
          {loading ? "🤖 Generando guion con IA..." : "🚀 Generar Guion PSP"}
        </button>

        {/* Footer Egremy */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${colors.border}`, textAlign: "center" }}>
          <p style={{ margin: 0, color: colors.textMuted, fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ color: colors.accent, fontWeight: 800 }}>Egremy Social Engine</span>
            <br />
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.78)" }}>
              A system by Egremy Digital — Branding & Web Agency
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
