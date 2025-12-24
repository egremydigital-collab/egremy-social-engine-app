import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface ContentRun {
  id: string;
  created_at: string;
  niche: string;
  pillar: string;
  objective: string;
  platform: string;
  selected_hook_code: string;
  // OJO: en DB puede venir más grande, aquí solo tipamos lo que usas
  script_psp: {
    hook?: { time?: string; text?: string; visual_action?: string; pattern_interrupt?: string };
    problem?: { time?: string; text?: string; validation?: string; emotion?: string };
    solution?: { time?: string; text?: string; key_insight?: string; analogy?: string; visual_demo?: string };
    proof_cta?: { time?: string; proof?: string; cta?: string; urgency_element?: string };
  };
  // Si tu select NO trae esto, quedará undefined (no rompe)
  production_pack?: any;
  seo_pack?: any;
  advanced_optimizations?: string[];
  ab_test_variants?: any;
  ai_model_used?: string;
  risk_level_applied?: string;
  hook?: { code?: string; text?: string; category?: string };
}

interface Project {
  id: string;
  name: string;
}

// === EGREMY DESIGN SYSTEM (consistente con Projects/Result) ===
const colors = {
  bg: "#0b1220",
  panel: "rgba(15, 23, 42, 0.72)",
  panelHover: "rgba(30, 41, 59, 0.85)",
  border: "rgba(148, 163, 184, 0.18)",
  text: "rgba(248, 250, 252, 0.95)",
  textMuted: "rgba(226, 232, 240, 0.70)",
  accent: "#22f2c4",
  accentGlow: "rgba(34, 242, 196, 0.20)",
  accentSoft: "rgba(34, 242, 196, 0.10)",
  danger: "#fb7185",
  dangerSoft: "rgba(251, 113, 133, 0.12)",
};

const bgStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "44px 24px",
  color: colors.text,
  fontFamily:
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  background: `radial-gradient(900px 600px at 12% 12%, ${colors.accentGlow}, transparent 55%),
               radial-gradient(900px 600px at 88% 18%, rgba(34,242,196,0.12), transparent 60%),
               linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(11,18,32,1) 60%, rgba(2,6,23,1) 100%)`,
};

const wrapStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  width: "100%",
};

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${colors.border}`,
  background: "rgba(2,6,23,0.35)",
  color: colors.textMuted,
  fontSize: 12,
  fontWeight: 800,
};

export default function History() {
  const nav = useNavigate();
  const projectId = localStorage.getItem("selected_project_id");

  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<ContentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      // Cargar proyecto
      const { data: projectData } = await supabase
        .from("se_projects")
        .select("id, name")
        .eq("id", projectId)
        .single();

      if (projectData) {
        setProject(projectData);
      }

      // Cargar historial de runs
      // ✅ Incluyo campos opcionales por si ya existen en tu tabla. Si no existen, Supabase devuelve error.
      // Si te da error aquí, vuelve a dejar el select como lo tenías y listo.
      const { data: runsData, error } = await supabase
        .from("se_content_runs")
        .select(
          "id, created_at, niche, pillar, objective, platform, selected_hook_code, script_psp, production_pack, seo_pack, advanced_optimizations, ab_test_variants, ai_model_used, risk_level_applied, hook"
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (runsData && !error) {
        setRuns(runsData as ContentRun[]);
      } else if (error) {
        // fallback silencioso: no tronar UI
        console.error("History load error:", error);
      }

      setLoading(false);
    };

    loadData();
  }, [projectId]);

  const viewRun = (run: ContentRun) => {
    /**
     * ✅ Fix: Result.tsx espera "generation_result" con estructura de GenerationResult.
     * En history tienes run parcial. Aquí armamos un objeto compatible (mínimo) sin romper.
     */
    const safeResult = {
      run_id: run.id,
      ai_model_used: run.ai_model_used || "—",
      risk_level_applied: run.risk_level_applied || "—",
      hook: run.hook || {
        code: run.selected_hook_code,
        text: run.script_psp?.hook?.text || "",
        category: "—",
      },
      script_psp: run.script_psp || {},
      production_pack: run.production_pack || { screen_text: [], cut_rhythm: "—", visual_style: "—" },
      seo_pack: run.seo_pack || { audio_keywords: [], caption: "—", hashtags: [], alt_text: "—" },
      advanced_optimizations: run.advanced_optimizations || [],
      ab_test_variants: run.ab_test_variants || null,
    };

    localStorage.setItem("generation_result", JSON.stringify(safeResult));
    nav("/result");
  };

  const deleteRun = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que quieres eliminar este contenido?")) return;

    const { error } = await supabase.from("se_content_runs").delete().eq("id", runId);

    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }

    setRuns(runs.filter((r) => r.id !== runId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case "IG":
        return "📸";
      case "TT":
        return "🎵";
      case "BOTH":
        return "📱";
      default:
        return "📱";
    }
  };

  const getObjectiveChip = (objective: string) => {
    // dark-friendly chips
    switch (objective) {
      case "Leads":
        return { bg: "rgba(34,242,196,0.12)", border: "rgba(34,242,196,0.28)", color: colors.accent, label: "Leads" };
      case "Reach":
        return { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.28)", color: "rgba(251,191,36,0.95)", label: "Reach" };
      case "Sends":
        return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.28)", color: "rgba(16,185,129,0.95)", label: "Sends" };
      case "Saves":
        return { bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.28)", color: "rgba(244,114,182,0.95)", label: "Saves" };
      default:
        return { bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.22)", color: colors.textMuted, label: objective || "—" };
    }
  };

  if (!projectId) {
    return (
      <div style={bgStyle}>
        <div style={wrapStyle}>
          <div
            style={{
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: colors.textMuted }}>No has seleccionado un proyecto.</p>
            <button
              onClick={() => nav("/")}
              style={{
                marginTop: 14,
                border: `1px solid ${colors.border}`,
                background: "rgba(2,6,23,0.35)",
                color: colors.text,
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Ir a Proyectos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={bgStyle}>
      <div style={wrapStyle}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <button
              onClick={() => nav("/")}
              style={{
                marginBottom: 14,
                cursor: "pointer",
                border: `1px solid ${colors.border}`,
                background: "rgba(2,6,23,0.35)",
                color: colors.textMuted,
                padding: "8px 14px",
                borderRadius: 10,
              }}
            >
              ← Volver a Proyectos
            </button>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: -0.2,
                textShadow: "0 10px 35px rgba(34,242,196,0.14), 0 2px 14px rgba(0,0,0,0.65)",
              }}
            >
              📜 Historial de Contenidos
            </h1>
            <p style={{ marginTop: 8, marginBottom: 0, color: colors.textMuted, fontSize: 13 }}>
              Historial del sistema por proyecto — listo para reutilizar, mejorar y volver a grabar.
            </p>
          </div>

          <button
            onClick={() => nav("/create")}
            style={{
              padding: "12px 18px",
              background: "rgba(34,242,196,0.14)",
              color: colors.text,
              border: `1px solid rgba(34,242,196,0.35)`,
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              boxShadow: `0 0 22px ${colors.accentGlow}`,
            }}
          >
            ➕ Crear nuevo
          </button>
        </div>

        {/* Nombre del proyecto */}
        {project && (
          <div
            style={{
              marginTop: 18,
              background: colors.panel,
              border: `1px solid rgba(34,242,196,0.25)`,
              padding: "10px 14px",
              borderRadius: 14,
              color: colors.text,
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ color: colors.textMuted }}>📁 Proyecto:</span>{" "}
            <strong style={{ color: colors.accent }}>{project.name}</strong>
          </div>
        )}

        {loading ? (
          <div style={{ marginTop: 22, color: colors.textMuted }}>Cargando historial...</div>
        ) : runs.length === 0 ? (
          <div
            style={{
              marginTop: 22,
              textAlign: "center",
              padding: 48,
              background: colors.panel,
              borderRadius: 16,
              border: `1px dashed ${colors.border}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <p style={{ fontSize: 48, margin: 0 }}>📭</p>
            <p style={{ fontSize: 18, margin: "16px 0 8px", color: colors.text, fontWeight: 900 }}>
              No hay contenidos generados
            </p>
            <p style={{ color: colors.textMuted, margin: 0 }}>Crea tu primer contenido para verlo aquí.</p>
            <button
              onClick={() => nav("/create")}
              style={{
                marginTop: 24,
                padding: "12px 18px",
                background: `linear-gradient(135deg, ${colors.accent} 0%, #14b8a6 100%)`,
                color: "#0b1220",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 900,
                boxShadow: `0 0 22px ${colors.accentGlow}`,
              }}
            >
              🎬 Crear contenido
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 22 }}>
            <p style={{ color: colors.textMuted, marginBottom: 14, fontSize: 13 }}>
              {runs.length} contenido{runs.length !== 1 ? "s" : ""} generado{runs.length !== 1 ? "s" : ""}
            </p>

            {runs.map((run) => {
              const obj = getObjectiveChip(run.objective);
              return (
                <div
                  key={run.id}
                  onClick={() => viewRun(run)}
                  style={{
                    padding: 18,
                    marginBottom: 12,
                    background: colors.panel,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 16,
                    cursor: "pointer",
                    color: colors.text,
                    transition: "all 0.22s ease",
                    boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,242,196,0.35)";
                    e.currentTarget.style.boxShadow = `0 18px 55px rgba(34,242,196,0.12)`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.45)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ ...chipBase, background: "rgba(148,163,184,0.10)" }}>
                        {run.selected_hook_code}
                      </span>
                      <span style={{ ...chipBase, background: obj.bg, borderColor: obj.border, color: obj.color }}>
                        {obj.label}
                      </span>
                      <span style={{ ...chipBase, background: "rgba(2,6,23,0.25)" }}>
                        {getPlatformEmoji(run.platform)}{" "}
                        {run.platform === "IG" ? "Instagram" : run.platform === "TT" ? "TikTok" : "Ambas"}
                      </span>
                    </div>

                    <button
                      onClick={(e) => deleteRun(run.id, e)}
                      style={{
                        background: "rgba(2,6,23,0.25)",
                        border: `1px solid ${colors.border}`,
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "8px 10px",
                        borderRadius: 12,
                        color: colors.textMuted,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.danger;
                        e.currentTarget.style.color = colors.danger;
                        e.currentTarget.style.background = colors.dangerSoft;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.color = colors.textMuted;
                        e.currentTarget.style.background = "rgba(2,6,23,0.25)";
                      }}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Contenido */}
                  <h3 style={{ margin: "12px 0 4px", fontSize: 16, color: colors.text, fontWeight: 900 }}>
                    {run.pillar}
                  </h3>
                  <p style={{ margin: 0, color: colors.textMuted, fontSize: 13 }}>
                    Nicho: <span style={{ color: colors.text }}>{run.niche}</span>
                  </p>

                  {/* Hook preview */}
                  {run.script_psp?.hook?.text && (
                    <p
                      style={{
                        margin: "12px 0 0",
                        color: colors.textMuted,
                        fontSize: 13,
                        fontStyle: "italic",
                        borderLeft: `3px solid rgba(34,242,196,0.65)`,
                        paddingLeft: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      “{run.script_psp.hook.text.substring(0, 120)}
                      {run.script_psp.hook.text.length > 120 ? "..." : ""}”
                    </p>
                  )}

                  {/* Fecha */}
                  <p style={{ margin: "12px 0 0", color: "rgba(226,232,240,0.55)", fontSize: 12 }}>
                    📅 {formatDate(run.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Egremy */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 20,
            borderTop: `1px solid rgba(148,163,184,0.14)`,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: colors.accent, fontWeight: 800 }}>Egremy Social Engine</span>
            <br />
            <span style={{ color: "rgba(226,232,240,0.62)", fontSize: 11 }}>
              A system by Egremy Digital — Branding & Web Agency
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
