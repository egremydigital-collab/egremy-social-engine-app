import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; // ✅ IMPORT CORRECTO (no uses ../lib/supabaseClient)
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  default_niche: string;
  run_count?: number;
}

// === EGREMY DESIGN SYSTEM v2 (Premium) ===
const colors = {
  bg: "#0b1220",
  bgCard: "rgba(15, 23, 42, 0.72)",
  bgCardHover: "rgba(30, 41, 59, 0.85)",
  accent: "#22f2c4",
  accentGlow: "rgba(34, 242, 196, 0.18)",
  accentSoft: "rgba(34, 242, 196, 0.12)",
  text: "rgba(248, 250, 252, 0.95)",
  textMuted: "rgba(226, 232, 240, 0.70)",
  textDark: "#0b1220",
  border: "rgba(148, 163, 184, 0.18)",
  borderHover: "rgba(34, 242, 196, 0.35)",
  success: "#10b981",
  successSoft: "rgba(16, 185, 129, 0.10)",
  successBorder: "rgba(16, 185, 129, 0.25)",
  warning: "#fbbf24",
  error: "#fb7185",
  errorSoft: "rgba(251, 113, 133, 0.15)",
  shadow: "0 18px 60px rgba(0,0,0,0.55)",
  shadowHover: "0 20px 70px rgba(34, 242, 196, 0.15)",
};

// ✅ (Cambio #2) Glow con intención: un solo acento dominante (sin arcoíris)
const backgroundStyle = {
  background: `radial-gradient(900px 600px at 12% 12%, ${colors.accentGlow}, transparent 55%),
               radial-gradient(900px 600px at 88% 18%, rgba(34,242,196,0.12), transparent 60%),
               linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(11,18,32,1) 60%, rgba(2,6,23,1) 100%)`,
};

const glowButton = {
  background: colors.accent,
  boxShadow: `0 0 25px ${colors.accentGlow}, 0 4px 15px rgba(0,0,0,0.4)`,
  border: "none",
  color: colors.textDark,
  fontWeight: "700" as const,
};

export default function Projects() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: projectsData } = await supabase
      .from("se_projects")
      .select("id, name, default_niche")
      .order("created_at", { ascending: false });

    if (projectsData) {
      const projectsWithCounts = await Promise.all(
        projectsData.map(async (project) => {
          const { count } = await supabase
            .from("se_content_runs")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id);

          return { ...project, run_count: count || 0 };
        })
      );

      setProjects(projectsWithCounts);
    }

    setLoading(false);
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: project, error } = await supabase
      .from("se_projects")
      .insert({ name: newProjectName })
      .select()
      .single();

    if (error) {
      alert("Error creando proyecto: " + error.message);
      setCreating(false);
      return;
    }

    await supabase.from("se_project_members").insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner",
    });

    setNewProjectName("");
    setCreating(false);
    loadProjects();
  };

  const deleteProject = async (
    projectId: string,
    projectName: string,
    runCount: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    const message =
      runCount > 0
        ? `¿Eliminar "${projectName}"?\n\n⚠️ Este proyecto tiene ${runCount} contenido${
            runCount !== 1 ? "s" : ""
          } que también se eliminarán.`
        : `¿Eliminar "${projectName}"?`;

    if (!confirm(message)) {
      return;
    }

    try {
      if (runCount > 0) {
        await supabase.from("se_content_runs").delete().eq("project_id", projectId);
      }

      await supabase.from("se_project_members").delete().eq("project_id", projectId);

      await supabase.from("se_projects").delete().eq("id", projectId);

      setProjects(projects.filter((p) => p.id !== projectId));

      if (localStorage.getItem("selected_project_id") === projectId) {
        localStorage.removeItem("selected_project_id");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar el proyecto");
    }
  };

  const selectProject = (projectId: string) => {
    localStorage.setItem("selected_project_id", projectId);
    nav("/create");
  };

  const viewHistory = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem("selected_project_id", projectId);
    nav("/history");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  return (
    <div
      style={{
        ...backgroundStyle,
        minHeight: "100vh",
        padding: "44px 24px",
        color: colors.text,
        fontFamily:
          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: -0.2,
                display: "flex",
                alignItems: "center",
                gap: 12,
                textShadow:
                  "0 10px 35px rgba(34,242,196,0.18), 0 2px 14px rgba(0,0,0,0.65)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.6))",
                }}
              >
                📁
              </span>
              Mis Proyectos
            </h1>

            {/* ✅ (Cambio #1) Hero micro-statement más Egremy */}
            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 13,
                color: colors.textMuted,
              }}
            >
              No generamos posts. Construimos <span style={{ color: colors.accent, fontWeight: 700 }}>sistemas</span> de comunicación.
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              background: "rgba(2,6,23,0.35)",
              border: `1px solid ${colors.border}`,
              color: colors.text,
              borderRadius: 10,
              fontWeight: 600,
              boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.error;
              e.currentTarget.style.color = colors.error;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.color = colors.text;
            }}
          >
            Cerrar sesión
          </button>
        </div>

        {/* Crear nuevo proyecto */}
        <div
          style={{
            padding: 20,
            background: colors.bgCard,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            marginTop: 24,
            marginBottom: 24,
            boxShadow: colors.shadow,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                filter: "drop-shadow(0 10px 30px rgba(34,242,196,0.22))",
              }}
            >
              ✨
            </span>
            <span style={{ fontWeight: 700, fontSize: 16, color: colors.text }}>
              Crear nuevo proyecto
            </span>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <input
              style={{
                flex: 1,
                padding: "14px 16px",
                color: colors.text,
                backgroundColor: "rgba(2,6,23,0.35)",
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                fontSize: 15,
                outline: "none",
                transition: "all 0.2s",
              }}
              placeholder="Nombre del proyecto (ej: Mi Clínica Estética)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.accent;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accentSoft}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={createProject}
              disabled={creating || !newProjectName.trim()}
              style={{
                ...glowButton,
                padding: "14px 28px",
                cursor: creating || !newProjectName.trim() ? "not-allowed" : "pointer",
                borderRadius: 12,
                fontSize: 15,
                opacity: creating || !newProjectName.trim() ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {creating ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <p style={{ color: colors.textMuted }}>Cargando proyectos...</p>
            </div>
          ) : projects.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                background: colors.bgCard,
                borderRadius: 16,
                border: `1px dashed ${colors.border}`,
                backdropFilter: "blur(8px)",
              }}
            >
              <p style={{ fontSize: 48, margin: 0 }}>📭</p>
              <p style={{ fontSize: 18, margin: "16px 0 8px", color: colors.text }}>
                No tienes proyectos
              </p>
              <p style={{ color: colors.textMuted, margin: 0 }}>
                Crea tu primer proyecto para empezar a generar contenido viral.
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: colors.textMuted, marginBottom: 14, fontSize: 13 }}>
                {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
              </p>

              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  style={{
                    padding: 20,
                    marginBottom: 12,
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 16,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.borderHover;
                    e.currentTarget.style.boxShadow = colors.shadowHover;
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.45)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Badge de estado */}
                      <div style={{ marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            color: colors.success,
                            background: colors.successSoft,
                            border: `1px solid ${colors.successBorder}`,
                            padding: "4px 10px",
                            borderRadius: 999,
                            letterSpacing: 0.2,
                            fontWeight: 600,
                          }}
                        >
                          🟢 Sistema activo
                        </span>
                      </div>

                      <h3 style={{ margin: 0, color: colors.text, fontSize: 18, fontWeight: 800 }}>
                        {project.name}
                      </h3>

                      {project.default_niche && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            color: colors.textMuted,
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span>📍</span>
                          <span>
                            Nicho: <span style={{ color: colors.text }}>{project.default_niche}</span>
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {/* Botón de historial */}
                      {project.run_count !== undefined && project.run_count > 0 && (
                        <button
                          onClick={(e) => viewHistory(project.id, e)}
                          style={{
                            padding: "9px 14px",
                            background: colors.accentSoft,
                            color: colors.accent,
                            border: `1px solid ${colors.borderHover}`,
                            borderRadius: 10,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.accent;
                            e.currentTarget.style.color = colors.textDark;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.accentSoft;
                            e.currentTarget.style.color = colors.accent;
                          }}
                          title="Ver historial"
                        >
                          📜 {project.run_count}
                        </button>
                      )}

                      {/* Botón de eliminar */}
                      <button
                        onClick={(e) => deleteProject(project.id, project.name, project.run_count || 0, e)}
                        style={{
                          padding: "9px 12px",
                          background: "rgba(2,6,23,0.35)",
                          color: colors.textMuted,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 10,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 800,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = colors.errorSoft;
                          e.currentTarget.style.borderColor = colors.error;
                          e.currentTarget.style.color = colors.error;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(2,6,23,0.35)";
                          e.currentTarget.style.borderColor = colors.border;
                          e.currentTarget.style.color = colors.textMuted;
                        }}
                        title="Eliminar proyecto"
                      >
                        🗑️
                      </button>

                      {/* Flecha */}
                      <span
                        style={{
                          color: colors.accent,
                          fontSize: 22,
                          marginLeft: 4,
                          fontWeight: 900,
                          textShadow: `0 0 20px ${colors.accentGlow}`,
                        }}
                      >
                        →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ✅ (Cambio #3) Footer como firma premium */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 20,
            borderTop: `1px solid ${colors.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: colors.accent, fontWeight: 700 }}>Egremy Social Engine</span>
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
