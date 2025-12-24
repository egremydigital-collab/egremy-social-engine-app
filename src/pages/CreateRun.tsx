import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Project {
  id: string;
  name: string;
  default_niche: string | null;
}

// === EGREMY DESIGN SYSTEM ===
const colors = {
  bg: "#0b1220",
  panel: "rgba(15, 23, 42, 0.72)",
  panel2: "rgba(30, 41, 59, 0.62)",
  border: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(148, 163, 184, 0.26)",

  // ✅ Egremy accent real
  accent: "#22f2c4",
  accentGlow: "rgba(34, 242, 196, 0.22)",
  accentSoft: "rgba(34, 242, 196, 0.10)",

  text: "rgba(248, 250, 252, 0.95)",
  textMuted: "rgba(226, 232, 240, 0.70)",
  textDark: "#0b1220",

  success: "#34d399",
  successSoft: "rgba(52, 211, 153, 0.14)",
};

const glowButton = {
  background: `linear-gradient(135deg, ${colors.accent} 0%, #14b8a6 100%)`,
  boxShadow: `0 0 22px ${colors.accentGlow}, 0 10px 30px rgba(0,0,0,0.45)`,
  border: "none",
  color: colors.textDark,
  fontWeight: 900 as const,
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  marginTop: 8,
  boxSizing: "border-box" as const,
  background: "rgba(2,6,23,0.35)",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  color: colors.text,
  fontSize: 15,
  outline: "none",
  transition: "all 0.2s",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const labelStyle = {
  color: colors.text,
  fontWeight: 800 as const,
  fontSize: 12,
  letterSpacing: 0.2,
  textTransform: "uppercase" as const,
};

export default function CreateRun() {
  const nav = useNavigate();
  const projectId = localStorage.getItem("selected_project_id");

  const [project, setProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    niche: "",
    pillar: "",
    objective: "Leads",
    awareness: "Tibio",
    duration: "30-60",
    platform: "IG",
    language: "ES",
    cta_dest: "DM",
    risk_level: "medio",
  });

  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setLoadingProject(false);
        return;
      }

      const { data, error } = await supabase
        .from("se_projects")
        .select("id, name, default_niche")
        .eq("id", projectId)
        .single();

      if (data && !error) {
        setProject(data);
        if (data.default_niche) {
          setFormData((prev) => ({ ...prev, niche: data.default_niche as string }));
        }
      }
      setLoadingProject(false);
    };

    loadProject();
  }, [projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.niche || !formData.pillar) {
      alert("Por favor completa Nicho y Pilar");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData?.session?.access_token) {
        alert("No hay sesión activa. Vuelve a /login y entra de nuevo.");
        setLoading(false);
        return;
      }

      const token = sessionData.session.access_token;

      if (project && formData.niche !== project.default_niche) {
        await supabase.from("se_projects").update({ default_niche: formData.niche }).eq("id", projectId);
      }

      const { data: result, error } = await supabase.functions.invoke("generate-content", {
        body: {
          project_id: projectId,
          ...formData,
        },
        headers: { Authorization: `Bearer ${token}` },
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

      if (!result.suggested_hooks) {
        alert("No se recibieron hooks. Revisa la consola.");
        console.log("Respuesta:", result);
        setLoading(false);
        return;
      }

      localStorage.setItem("suggested_hooks", JSON.stringify(result.suggested_hooks));
      localStorage.setItem("run_form_data", JSON.stringify(formData));
      nav("/hooks");
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión. Revisa la consola.");
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          color: colors.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(900px 600px at 12% 12%, ${colors.accentGlow}, transparent 55%),
                       linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(11,18,32,1) 60%, rgba(2,6,23,1) 100%)`,
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            padding: 22,
            borderRadius: 18,
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 48, margin: 0 }}>📭</p>
          <p style={{ marginTop: 12, color: colors.textMuted }}>No has seleccionado un proyecto.</p>
          <button
            onClick={() => nav("/")}
            style={{
              ...glowButton,
              padding: "12px 18px",
              borderRadius: 12,
              cursor: "pointer",
              marginTop: 16,
              width: "100%",
            }}
          >
            Ir a Proyectos
          </button>
        </div>
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          color: colors.textMuted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(900px 600px at 12% 12%, ${colors.accentGlow}, transparent 55%),
                       linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(11,18,32,1) 60%, rgba(2,6,23,1) 100%)`,
        }}
      >
        Cargando proyecto...
      </div>
    );
  }

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
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Back button */}
        <button
          onClick={() => nav("/")}
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
          ← Volver a Proyectos
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: -0.2,
            textShadow: `0 0 28px ${colors.accentGlow}, 0 16px 45px rgba(0,0,0,0.55)`,
          }}
        >
          🎬 Crear Contenido
        </h1>

        <p style={{ color: colors.textMuted, marginTop: 10, marginBottom: 22, fontSize: 13 }}>
          No generamos posts. Construimos{" "}
          <span style={{ color: colors.accent, fontWeight: 800 }}>sistemas de comunicación</span>.
        </p>

        {/* Proyecto badge */}
        {project && (
          <div
            style={{
              background: colors.accentSoft,
              padding: "12px 16px",
              borderRadius: 14,
              marginBottom: 18,
              border: `1px solid rgba(34,242,196,0.35)`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ fontSize: 18 }}>📁</span>
            <span style={{ color: colors.accent, fontWeight: 900 }}>Proyecto:</span>
            <span style={{ color: colors.text, fontWeight: 800 }}>{project.name}</span>
          </div>
        )}

        {/* Card container */}
        <div
          style={{
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 22,
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Grid */}
       <div
  className="egremy-grid-2"
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  }}
>
            {/* Nicho */}
            <div>
              <label style={labelStyle}>Nicho *</label>
              <input
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                placeholder="Ej: Clínica estética facial"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentSoft}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = `1px solid ${colors.border}`;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = colors.border;
                }}
              />
              {project?.default_niche && formData.niche === project.default_niche && (
                <small style={{ color: colors.success, fontSize: 12, marginTop: 6, display: "block" }}>
                  ✓ Nicho guardado del proyecto
                </small>
              )}
            </div>

            {/* Pilar */}
            <div>
              <label style={labelStyle}>Pilar de contenido *</label>
              <input
                name="pillar"
                value={formData.pillar}
                onChange={handleChange}
                placeholder="Ej: Tratamientos anti-edad"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentSoft}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = colors.border;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </div>

            {/* Objetivo */}
            <div>
              <label style={labelStyle}>Objetivo</label>
              <select name="objective" value={formData.objective} onChange={handleChange} style={selectStyle}>
                <option value="Leads">Leads (conversiones)</option>
                <option value="Reach">Reach (alcance)</option>
                <option value="Sends">Sends (compartidos)</option>
                <option value="Saves">Saves (guardados)</option>
              </select>
            </div>

            {/* Nivel de consciencia */}
            <div>
              <label style={labelStyle}>Nivel de consciencia</label>
              <select name="awareness" value={formData.awareness} onChange={handleChange} style={selectStyle}>
                <option value="Frio">Frío (no te conocen)</option>
                <option value="Tibio">Tibio (algo te conocen)</option>
                <option value="Caliente">Caliente (listos para actuar)</option>
              </select>
            </div>

            {/* Duración */}
            <div>
              <label style={labelStyle}>Duración</label>
              <select name="duration" value={formData.duration} onChange={handleChange} style={selectStyle}>
                <option value="7-15">7-15 segundos (corto)</option>
                <option value="30-60">30-60 segundos (medio)</option>
                <option value="60+">60+ segundos (largo)</option>
              </select>
            </div>

            {/* Plataforma */}
            <div>
              <label style={labelStyle}>Plataforma</label>
              <select name="platform" value={formData.platform} onChange={handleChange} style={selectStyle}>
                <option value="IG">Instagram Reels</option>
                <option value="TT">TikTok</option>
                <option value="BOTH">Ambas</option>
              </select>
            </div>

            {/* CTA destino */}
            <div>
              <label style={labelStyle}>CTA destino</label>
              <select name="cta_dest" value={formData.cta_dest} onChange={handleChange} style={selectStyle}>
                <option value="DM">DM</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Link">Link en bio</option>
                <option value="Comentar">Comentar</option>
                <option value="Seguir">Seguir</option>
              </select>
            </div>

            {/* Nivel de riesgo */}
            <div>
              <label style={labelStyle}>Nivel de riesgo creativo</label>
              <select name="risk_level" value={formData.risk_level} onChange={handleChange} style={selectStyle}>
                <option value="bajo">Bajo (conservador, seguro)</option>
                <option value="medio">Medio (balanceado)</option>
                <option value="alto">Alto (agresivo, shock marketing)</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...glowButton,
              padding: 18,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              borderRadius: 14,
              marginTop: 20,
              width: "100%",
              opacity: loading ? 0.75 : 1,
              transition: "all 0.25s",
            }}
            onMouseEnter={(e) => {
              if (loading) return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = `0 0 32px ${colors.accentGlow}, 0 18px 45px rgba(0,0,0,0.50)`;
            }}
            onMouseLeave={(e) => {
              if (loading) return;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = glowButton.boxShadow;
            }}
          >
            {loading ? "🔄 Generando hooks..." : "🎣 Obtener Hooks Sugeridos"}
          </button>

          <p style={{ margin: "12px 0 0", color: "rgba(226,232,240,0.55)", fontSize: 12 }}>
            Tip: escribe “Nicho” + “Pilar” y presiona <strong>Enter</strong>.
          </p>
        </div>

        {/* Footer Egremy */}
        <div
          style={{
            marginTop: 52,
            paddingTop: 20,
            borderTop: `1px solid rgba(148,163,184,0.14)`,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: colors.textMuted, fontSize: 12, lineHeight: 1.5 }}>
            <span style={{ color: colors.accent, fontWeight: 800 }}>Egremy Social Engine</span>
            <br />
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.75)" }}>
              A system by Egremy Digital — Branding & Web Agency
            </span>
          </p>
        </div>

        {/* Responsive note (sin CSS externo): grid colapsa a 1 si la pantalla es chica */}
        <div style={{ height: 1 }} />
      </div>

      {/* Responsive helper (inline, sin librerías) */}
      <style>
        {`
          @media (max-width: 900px) {
            .egremy-grid-2 { grid-template-columns: 1fr !important; }
          }
        `}
      </style>
    </div>
  );
}
