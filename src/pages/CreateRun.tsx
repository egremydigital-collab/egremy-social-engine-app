import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generatePSPScript } from "../lib/edge";

interface Project {
  id: string;
  name: string;
  default_niche: string | null;
}

// === EGREMY DESIGN SYSTEM v2 ===
const colors = {
  bg: "#0b1220",
  panel: "rgba(15, 23, 42, 0.72)",
  panel2: "rgba(30, 41, 59, 0.62)",
  border: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(148, 163, 184, 0.26)",
  accent: "#22f2c4",
  accentGlow: "rgba(34, 242, 196, 0.22)",
  accentSoft: "rgba(34, 242, 196, 0.10)",
  text: "rgba(248, 250, 252, 0.95)",
  textMuted: "rgba(226, 232, 240, 0.70)",
  textDark: "#0b1220",
  success: "#34d399",
  successSoft: "rgba(52, 211, 153, 0.14)",
  warning: "#fbbf24",
  warningSoft: "rgba(251, 191, 36, 0.14)",
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

const tipStyle = {
  fontSize: 11,
  color: colors.textMuted,
  marginTop: 6,
  display: "block",
};

// Tooltips para los nuevos campos
const FIELD_TIPS: Record<string, string> = {
  objective_pilar: "Define qué métrica priorizar según los 6 pilares del algoritmo 2025",
  tono: "El estilo de comunicación afecta la conexión emocional con la audiencia",
  formato_video: "El formato visual impacta retención y credibilidad",
};

export default function CreateRun() {
  const nav = useNavigate();
  const projectId = localStorage.getItem("selected_project_id");

  const [project, setProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    // === Campos básicos (existentes) ===
    niche: "",
    pillar: "",
    objective: "Leads",
    awareness: "Tibio",
    duration: "30-60",
    platform: "IG",
    language: "ES",
    cta_dest: "DM",
    risk_level: "medio",
    
    // === NUEVOS CAMPOS - FASE 1 ===
    objective_pilar: "watch_time",  // Prioridad algorítmica 2025
    tono: "founder-led",            // Estilo de comunicación
    formato_video: "talking-head",  // Formato visual
  });

  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useKnowledgePack, setUseKnowledgePack] = useState(true);
  const [brandDomain, setBrandDomain] = useState<string>("egremy_branding");

  // === DURATION SPECS (dynamic times based on selected duration) ===
  const getDurationSpec = (duration: string) => {
    switch (duration) {
      case "7-15":
        return { sec: 15, hook: "0-3s", problem: "3-8s", solution: "8-12s", proof_cta: "12-15s" };
      case "60+":
        return { sec: 90, hook: "0-3s", problem: "3-8s", solution: "8-75s", proof_cta: "75-90s" };
      case "30-60":
      default:
        return { sec: 45, hook: "0-3s", problem: "3-8s", solution: "8-35s", proof_cta: "35-45s" };
    }
  };

  // === MARKDOWN PARSER with DYNAMIC TIMES ===
  const parseScriptFromMarkdown = (markdown: string, duration: string, formato_video: string, brandDomain: string) => {
    const clean = markdown.replace(/\*\*/g, "").replace(/\r\n/g, "\n").trim();
    const spec = getDurationSpec(duration);

    // Extract caption before parsing sections
    const captionSplit = clean.search(/---[\s\n]*(?:Caption|CAPTION)/i);
    const scriptPart = captionSplit > 0 ? clean.substring(0, captionSplit) : clean;

    // Regex patterns to extract section text
    const hookRegex = /\[0-3s\]\s*HOOK:\s*\n?([\s\S]*?)(?=\n\[3-8s\]|$)/i;
    const problemRegex = /\[3-8s\]\s*PROBLEMA:\s*\n?([\s\S]*?)(?=\n\[8-\d+s\]|$)/i;
    const solutionRegex = /\[8-\d+s\]\s*SOLUC(?:IÓN|ION):\s*\n?([\s\S]*?)(?=\n\[\d+-\d+s\]|$)/i;
    const closingRegex = /\[\d+-\d+s\]\s*(?:PRUEBA\s*\+?\s*CTA|CIERRE):\s*\n?([\s\S]*?)(?=\n---|$)/i;

    const hookMatch = scriptPart.match(hookRegex);
    const problemMatch = scriptPart.match(problemRegex);
    const solutionMatch = scriptPart.match(solutionRegex);
    const closingMatch = scriptPart.match(closingRegex);

    // Text cleaner
    const cleanText = (text: string | undefined) => {
      if (!text) return "";
      return text.replace(/^\s*[-*]\s*/gm, "").replace(/\n{2,}/g, " ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim().replace(/^[""]|[""]$/g, "");
    };

    const closingText = cleanText(closingMatch?.[1]) || "";

    // Parse proof and CTA from closing
    let proof = "";
    let cta = "";
    const proofMatch = closingText.match(/Prueba:\s*(.*?)(?=\s*CTA:|$)/i);
    const ctaMatch = closingText.match(/CTA:\s*(.*)/i);

    if (proofMatch && ctaMatch) {
      proof = proofMatch[1].trim();
      cta = ctaMatch[1].trim();
    } else {
      // Try splitting by sentence patterns
      const sentences = closingText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 5);
      const ctaPatterns = /comparte|envía|escribe|dm|mensaje|guarda|manda|pasa/i;
      const proofPatterns = /observado|marcas|diferencia|nota|cuando|porque|resultado/i;
      const proofSentences: string[] = [];
      const ctaSentences: string[] = [];
      sentences.forEach((s: string) => {
        ctaPatterns.test(s.trim()) ? ctaSentences.push(s.trim()) : proofPatterns.test(s.trim()) || proofSentences.length === 0 ? proofSentences.push(s.trim()) : ctaSentences.push(s.trim());
      });
      proof = proofSentences.join(" ") || closingText;
      cta = ctaSentences.join(" ") || "Si conoces a alguien que necesita esto, compártelo.";
    }

    return {
      hook: {
        time: spec.hook,    // ✅ DYNAMIC from duration
        text: cleanText(hookMatch?.[1]) || "Hook generado por Knowledge Pack",
        visual_action: `Formato: ${formato_video}`,
        pattern_interrupt: "Curiosidad + Dolor",
      },
      problem: {
        time: spec.problem,  // ✅ DYNAMIC from duration
        text: cleanText(problemMatch?.[1]) || "Problema identificado",
        validation: "Validación emocional del problema",
        emotion: brandDomain === "dance_5678" ? "Duda → Confianza" : "Frustración → Esperanza",
      },
      solution: {
        time: spec.solution,  // ✅ DYNAMIC from duration (was hardcoded "8-35s")
        text: cleanText(solutionMatch?.[1]) || "Solución presentada",
        key_insight: "Insight del Knowledge Pack",
        visual_demo: "Demostración visual sugerida",
      },
      proof_cta: {
        time: spec.proof_cta,  // ✅ DYNAMIC from duration (was hardcoded "35-45s")
        proof: proof,
        cta: cta,
        urgency_element: "Urgencia sutil",
      },
    };
  };

  // === SEO PARSER ===
  const parseSeoFromMarkdown = (markdown: string) => {
    const captionRegex = /(?:Caption\s*(?:sugerido)?:?)\s*\n?([\s\S]*?)(?=\n\n|SEO|Keywords|\*"?SEO|$)/i;
    const seoRegex = /(?:SEO\s*)?Keywords?:?\s*\n?([\s\S]*?)(?=\n\n|$)/i;

    const captionMatch = markdown.match(captionRegex);
    const seoMatch = markdown.match(seoRegex);
    const hashtagMatch = markdown.match(/#[\wáéíóúñ]+/gi);

    let caption = captionMatch?.[1]?.trim() || "";
    caption = caption.replace(/\*\*/g, "").replace(/^[-*]\s*/gm, "").split("\n")[0]?.trim() || "";

    let keywords: string[] = [];
    if (seoMatch?.[1]) {
      keywords = seoMatch[1]
        .replace(/\*\*/g, "")
        .replace(/^[-*]\s*/gm, "")
        .split(",")
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0 && k.length < 50);
    }

    return {
      caption: caption,
      caption_frontloaded: caption,
      hashtags: hashtagMatch || ["#EgremyEngine", "#ContentStrategy"],
      alt_text: `Video sobre ${caption.substring(0, 60)}`,
      spoken_keywords: keywords.length > 0 ? keywords : ["estrategia", "contenido", "marca"],
    };
  };

  // === KNOWLEDGE PACK SUBMIT HANDLER ===
  const handleKnowledgePackSubmit = async (variantCount: 1 | 3 = 1) => {
    if (!formData.niche || !formData.pillar) {
      alert("Por favor completa Nicho y Pilar");
      return;
    }

    setLoading(true);

    try {
      const topic = `${formData.pillar} para ${formData.niche}`;
      const durationMap: Record<string, number> = { "7-15": 15, "30-60": 45, "60+": 90 };
      const mode = brandDomain === "dance_5678" ? "5678_emotional" : "egremy_hard";

      const response = await generatePSPScript({
        topic,
        platform: formData.platform === "IG" ? "instagram" : formData.platform === "TT" ? "tiktok" : "instagram",
        duration_sec: durationMap[formData.duration] || 45,
        audience: brandDomain === "dance_5678" ? "dancers_and_moms" : "founders",
        mode,
        brand_domain: brandDomain,
        niche: formData.niche,
        pillar: formData.pillar,
        objective: formData.objective,
        awareness: formData.awareness,
        cta_dest: formData.cta_dest,
        risk_level: formData.risk_level,
        objective_pilar: formData.objective_pilar,
        tono: formData.tono,
        formato_video: formData.formato_video,
        language: formData.language,
        variants: variantCount,
      });

      // ============================================================
      // MULTI-VARIANT MODE (variants=3)
      // ============================================================
      if (response.mode === "multi_variant" && response.variants) {
        const processedVariants = response.variants.map((variant: any, idx: number) => {
          const scriptPSP = variant.script_psp 
            ? variant.script_psp 
            : parseScriptFromMarkdown(variant.final?.script || "", formData.duration, formData.formato_video, brandDomain);

          const seoPack = variant.seo_pack 
            ? variant.seo_pack 
            : parseSeoFromMarkdown(variant.final?.script || "");

          const vLabel = brandDomain === "dance_5678" ? "5,6,7,8 Pack v1.0" : "Knowledge Pack v2.2";

          return {
            variant_index: idx + 1,
            run_id: variant.run_id || `kp-var${idx + 1}-${Date.now()}`,
            ai_model_used: variant.ai_model_used || "Claude Sonnet 4.5",
            risk_level_applied: formData.risk_level,
            version: vLabel,
            brand_domain: brandDomain,
            voice_profile: response.voice_profile,
            quality_score: variant.quality_score || variant.final?.evaluation?.total || 0,
            quality_passed: (variant.quality_score || 0) >= (brandDomain === "dance_5678" ? 85 : 80),
            quality_breakdown: variant.quality_breakdown || {
              hook_strength: variant.final?.evaluation?.hook_strength || 0,
              psp_structure: variant.final?.evaluation?.psp_structure || 0,
              objective_alignment: variant.final?.evaluation?.voice_score || 0,
              seo_compliance: variant.final?.evaluation?.seo_compliance || 0,
              compliance: variant.final?.evaluation?.shareability || 0,
            },
            rewrites_performed: variant.rewrites_performed || 0,
            objective_pilar: formData.objective_pilar,
            tono: formData.tono,
            hook: variant.hook || {
              code: "KP",
              text: (variant.hook_selection?.adapted_hook || "Hook generado").substring(0, 50) + "...",
              category: variant.hook_selection?.selected_hook_id || "AI",
            },
            script_psp: scriptPSP,
            production_pack: variant.production_pack || {
              screen_text: [],
              cut_rhythm: "Adaptar según duración",
              visual_style: formData.formato_video,
              b_roll_suggestions: [],
              music_mood: "Según tono: " + formData.tono,
            },
            seo_pack: seoPack,
            knowledge_sources: response.knowledge_sources,
            hook_selection: variant.hook_selection,
            _isKnowledgePack: true,
            _isDance5678: brandDomain === "dance_5678",
          };
        });

        localStorage.setItem("generation_variants", JSON.stringify(processedVariants));
        localStorage.setItem("generation_mode", "MULTI_VARIANT");
        localStorage.setItem("run_form_data", JSON.stringify(formData));
        nav("/result");
        return;
      }

      // ============================================================
      // SINGLE VARIANT MODE (backward compatible)
      // ============================================================

      // ✅ FIX: Use script_psp from response if available (v3.7.1+), otherwise parse markdown
      const scriptPSP = response.script_psp 
        ? response.script_psp 
        : parseScriptFromMarkdown(response.final.script, formData.duration, formData.formato_video, brandDomain);

      const seoPack = response.seo_pack 
        ? response.seo_pack 
        : parseSeoFromMarkdown(response.final.script);

      const versionLabel = brandDomain === "dance_5678" ? "5,6,7,8 Pack v1.0" : "Knowledge Pack v2.2";

      const generationResult = {
        run_id: response.run_id || `kp-${Date.now()}`,
        ai_model_used: brandDomain === "dance_5678" ? "5678 Pack + GPT-4" : "Knowledge Pack + GPT-4",
        risk_level_applied: formData.risk_level,
        version: versionLabel,
        brand_domain: brandDomain,
        voice_profile: response.voice_profile,
        quality_score: response.final.evaluation.total,
        quality_passed: response.final.evaluation.total >= (brandDomain === "dance_5678" ? 85 : 80),
        quality_breakdown: {
          hook_strength: response.final.evaluation.hook_strength,
          psp_structure: response.final.evaluation.psp_structure,
          objective_alignment: response.final.evaluation.voice_score || response.final.evaluation.egremy_voice || 0,
          seo_compliance: response.final.evaluation.seo_compliance,
          compliance: response.final.evaluation.shareability,
        },
        rewrites_performed: response.final.rewritten ? response.final.rewrite_count : 0,
        objective_pilar: formData.objective_pilar,
        tono: formData.tono,
        hook: {
          code: brandDomain === "dance_5678" ? "5678" : "KP",
          text: (response.hook_selection?.adapted_hook || scriptPSP.hook.text).substring(0, 50) + "...",
          category: response.hook_selection?.selected_hook_id || "AI + Knowledge",
        },
        script_psp: scriptPSP,
        production_pack: response.production_pack || {
          screen_text: [],
          cut_rhythm: "Adaptar según duración",
          visual_style: formData.formato_video,
          b_roll_suggestions: [],
          music_mood: "Según tono: " + formData.tono,
        },
        seo_pack: seoPack,
        knowledge_sources: response.knowledge_sources,
        retrieved_preview: response.retrieved_preview,
        hook_selection: response.hook_selection,
        _isKnowledgePack: true,
        _isDance5678: brandDomain === "dance_5678",
      };

      localStorage.setItem("generation_result", JSON.stringify(generationResult));
      localStorage.setItem("run_form_data", JSON.stringify(formData));
      localStorage.setItem("generation_mode", brandDomain === "dance_5678" ? "DANCE_5678" : "KNOWLEDGE_PACK");
      nav("/result");
    } catch (error: any) {
      console.error("Error Knowledge Pack:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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

      // === BRIEF JSON ESTRUCTURADO (NUEVO) ===
      const briefJSON = {
        // Contexto del contenido
        niche: formData.niche,
        pillar: formData.pillar,
        platform: formData.platform,
        language: formData.language,
        
        // Objetivos y audiencia
        objective: formData.objective,
        objective_pilar: formData.objective_pilar,
        awareness: formData.awareness,
        cta_dest: formData.cta_dest,
        
        // Formato y estilo
        duration: formData.duration,
        tono: formData.tono,
        formato_video: formData.formato_video,
        risk_level: formData.risk_level,
      };

      const { data: result, error } = await supabase.functions.invoke("generate-content", {
        body: {
          project_id: projectId,
          ...briefJSON,
          // Flag para indicar que es la nueva versión con Brief JSON
          brief_version: "v2",
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
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
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
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
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
            fontWeight: 700,
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

        {/* ============================================ */}
        {/* KNOWLEDGE PACK TOGGLE + DOMAIN SELECTOR */}
        {/* ============================================ */}
        <div
          style={{
            background: useKnowledgePack 
              ? "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(88, 28, 135, 0.20) 100%)"
              : colors.panel,
            border: `1px solid ${useKnowledgePack ? "rgba(139, 92, 246, 0.40)" : colors.border}`,
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backdropFilter: "blur(8px)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🧠</span>
            <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 14 }}>Knowledge Pack</span>
            {useKnowledgePack && (
              <span style={{
                background: "rgba(139, 92, 246, 0.35)",
                color: "#c4b5fd",
                fontSize: 10,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 6,
                letterSpacing: 0.5,
                textTransform: "uppercase" as const,
              }}>ACTIVO</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {useKnowledgePack && (
              <span style={{ color: colors.textMuted, fontSize: 11 }}>
                Genera con criterio Egremy + Quality Score + Auto-optimización
              </span>
            )}
            <div
              onClick={() => setUseKnowledgePack(!useKnowledgePack)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: useKnowledgePack ? "rgba(139, 92, 246, 0.6)" : "rgba(100, 116, 139, 0.3)",
                cursor: "pointer",
                position: "relative" as const,
                transition: "all 0.3s",
              }}
            >
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                background: useKnowledgePack ? "#a78bfa" : "#94a3b8",
                position: "absolute" as const,
                top: 3,
                left: useKnowledgePack ? 23 : 3,
                transition: "all 0.3s",
                boxShadow: useKnowledgePack ? "0 0 8px rgba(167, 139, 250, 0.5)" : "none",
              }} />
            </div>
          </div>
        </div>

        {/* Domain selector (only when KP is ON) */}
        {useKnowledgePack && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 18,
          }}>
            {/* Egremy Branding */}
            <div
              onClick={() => setBrandDomain("egremy_branding")}
              style={{
                background: brandDomain === "egremy_branding"
                  ? "linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(88, 28, 135, 0.15) 100%)"
                  : colors.panel,
                border: `1.5px solid ${brandDomain === "egremy_branding" ? "rgba(139, 92, 246, 0.50)" : colors.border}`,
                borderRadius: 14,
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.25s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>🏢</span>
                <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 13 }}>Egremy Branding</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>
                Fundadores, B2B, posicionamiento estratégico
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: brandDomain === "egremy_branding" ? "#c4b5fd" : colors.textMuted }}>
                <strong>Tono:</strong> Directo, confrontativo, fundador-a-fundador<br/>
                <strong>Audiencia:</strong> Founders, CEOs, empresarios
              </p>
            </div>

            {/* 5,6,7,8 Dance */}
            <div
              onClick={() => setBrandDomain("dance_5678")}
              style={{
                background: brandDomain === "dance_5678"
                  ? "linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(168, 34, 108, 0.15) 100%)"
                  : colors.panel,
                border: `1.5px solid ${brandDomain === "dance_5678" ? "rgba(236, 72, 153, 0.50)" : colors.border}`,
                borderRadius: 14,
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.25s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>👯</span>
                <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 13 }}>5,6,7,8 Dance</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>
                Bailarinas jóvenes, dance moms, aspiracional
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: brandDomain === "dance_5678" ? "#f9a8d4" : colors.textMuted }}>
                <strong>Tono:</strong> Emocional, inspiracional, empoderador<br/>
                <strong>Audiencia:</strong> Niñas 6-18 años, mamás
              </p>
            </div>
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
          {/* ============================================ */}
          {/* SECCIÓN 1: CONTENIDO BÁSICO */}
          {/* ============================================ */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, color: colors.accent, fontWeight: 800, letterSpacing: 0.5 }}>
              📝 CONTENIDO
            </h3>
            <div className="egremy-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 2: OBJETIVO ALGORÍTMICO 2025 (NUEVO) */}
          {/* ============================================ */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, color: colors.accent, fontWeight: 800, letterSpacing: 0.5 }}>
              🎯 OBJETIVO ALGORÍTMICO 2025
            </h3>
            <div className="egremy-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Objetivo tradicional */}
              <div>
                <label style={labelStyle}>Objetivo de negocio</label>
                <select name="objective" value={formData.objective} onChange={handleChange} style={selectStyle}>
                  <option value="Leads">Leads (conversiones)</option>
                  <option value="Reach">Reach (alcance)</option>
                  <option value="Sends">Sends (compartidos)</option>
                  <option value="Saves">Saves (guardados)</option>
                  <option value="Authority">Authority (autoridad de nicho)</option>
                </select>
              </div>

              {/* 🆕 Objetivo por Pilar 2025 */}
              <div>
                <label style={labelStyle}>
                  Prioridad algorítmica 2025
                  <span style={{ color: colors.warning, marginLeft: 6 }}>★ NUEVO</span>
                </label>
                <select name="objective_pilar" value={formData.objective_pilar} onChange={handleChange} style={selectStyle}>
                  <option value="watch_time">⏱️ Watch Time (retención completa)</option>
                  <option value="sends">📤 Sends (compartidos por DM)</option>
                  <option value="seo">🔍 SEO Social (descubrimiento)</option>
                  <option value="saves">💾 Saves (utilidad duradera)</option>
                  <option value="authority">👑 Authority (nicho expertise)</option>
                </select>
                <small style={tipStyle}>💡 {FIELD_TIPS.objective_pilar}</small>
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

              {/* CTA destino */}
              <div>
                <label style={labelStyle}>CTA destino</label>
                <select name="cta_dest" value={formData.cta_dest} onChange={handleChange} style={selectStyle}>
                  <option value="DM">DM</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Link">Link en bio</option>
                  <option value="Comentar">Comentar palabra clave</option>
                  <option value="Seguir">Seguir</option>
                </select>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 3: FORMATO Y ESTILO (NUEVO) */}
          {/* ============================================ */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, color: colors.accent, fontWeight: 800, letterSpacing: 0.5 }}>
              🎨 FORMATO Y ESTILO
            </h3>
            <div className="egremy-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Duración */}
              <div>
                <label style={labelStyle}>Duración</label>
                <select name="duration" value={formData.duration} onChange={handleChange} style={selectStyle}>
                  <option value="7-15">7-15s (viral rápido, loops)</option>
                  <option value="30-60">30-60s (educativo, PSP completo)</option>
                  <option value="60+">60+s (autoridad, storytelling)</option>
                </select>
              </div>

              {/* Plataforma */}
              <div>
                <label style={labelStyle}>Plataforma</label>
                <select name="platform" value={formData.platform} onChange={handleChange} style={selectStyle}>
                  <option value="IG">Instagram Reels</option>
                  <option value="TT">TikTok</option>
                  <option value="BOTH">Ambas (optimizar para cada una)</option>
                </select>
              </div>

              {/* 🆕 Tono de voz */}
              <div>
                <label style={labelStyle}>
                  Tono de voz
                  <span style={{ color: colors.warning, marginLeft: 6 }}>★ NUEVO</span>
                </label>
                <select name="tono" value={formData.tono} onChange={handleChange} style={selectStyle}>
                  <option value="founder-led">👤 Founder-led (personal, auténtico)</option>
                  <option value="directo">🎯 Directo (sin rodeos, confrontativo)</option>
                  <option value="educativo">📚 Educativo (tutorial, paso a paso)</option>
                  <option value="humor">😄 Humor (entretenido, memes)</option>
                  <option value="inspiracional">✨ Inspiracional (motivador)</option>
                </select>
                <small style={tipStyle}>💡 {FIELD_TIPS.tono}</small>
              </div>

              {/* 🆕 Formato de video */}
              <div>
                <label style={labelStyle}>
                  Formato visual
                  <span style={{ color: colors.warning, marginLeft: 6 }}>★ NUEVO</span>
                </label>
                <select name="formato_video" value={formData.formato_video} onChange={handleChange} style={selectStyle}>
                  <option value="talking-head">🗣️ Talking head (cámara frontal)</option>
                  <option value="b-roll">🎬 B-roll + voz en off</option>
                  <option value="screen-record">💻 Screen recording + narración</option>
                  <option value="lifestyle">🌅 Lifestyle + texto en pantalla</option>
                  <option value="mix">🔀 Mix (talking head + B-roll)</option>
                </select>
                <small style={tipStyle}>💡 {FIELD_TIPS.formato_video}</small>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 4: CONFIGURACIÓN AVANZADA */}
          {/* ============================================ */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: "transparent",
                border: `1px solid ${colors.border}`,
                color: colors.textMuted,
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              <span>{showAdvanced ? "▼" : "▶"}</span>
              ⚙️ Configuración avanzada
            </button>

            {showAdvanced && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: colors.panel2,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div className="egremy-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Nivel de riesgo */}
                  <div>
                    <label style={labelStyle}>Nivel de riesgo creativo</label>
                    <select name="risk_level" value={formData.risk_level} onChange={handleChange} style={selectStyle}>
                      <option value="bajo">🟢 Bajo (conservador, corporativo)</option>
                      <option value="medio">🟡 Medio (balanceado)</option>
                      <option value="alto">🔴 Alto (agresivo, shock marketing)</option>
                    </select>
                  </div>

                  {/* Idioma */}
                  <div>
                    <label style={labelStyle}>Idioma</label>
                    <select name="language" value={formData.language} onChange={handleChange} style={selectStyle}>
                      <option value="ES">Español (México/Latam)</option>
                      <option value="EN">English</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {/* Main button: Generate 1 */}
            <button
              onClick={() => useKnowledgePack ? handleKnowledgePackSubmit(1) : handleSubmit()}
              disabled={loading}
              style={{
                ...glowButton,
                padding: 18,
                fontSize: 16,
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: 14,
                width: useKnowledgePack ? "55%" : "100%",
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
              {loading 
                ? (useKnowledgePack ? "🧠 Generando..." : "🔄 Generando...") 
                : (useKnowledgePack ? "🧠 Generar Guion" : "🎣 Obtener Hooks")
              }
            </button>

            {/* 3 Variants button (only with Knowledge Pack) */}
            {useKnowledgePack && (
              <button
                onClick={() => handleKnowledgePackSubmit(3)}
                disabled={loading}
                style={{
                  background: loading ? "rgba(139, 92, 246, 0.3)" : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  boxShadow: "0 0 22px rgba(139, 92, 246, 0.25), 0 10px 30px rgba(0,0,0,0.45)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 900 as const,
                  padding: 18,
                  fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  borderRadius: 14,
                  width: "45%",
                  opacity: loading ? 0.75 : 1,
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  if (loading) return;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 0 32px rgba(139, 92, 246, 0.35), 0 18px 45px rgba(0,0,0,0.50)";
                }}
                onMouseLeave={(e) => {
                  if (loading) return;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 0 22px rgba(139, 92, 246, 0.25), 0 10px 30px rgba(0,0,0,0.45)";
                }}
              >
                {loading ? "⚡ Generando 3..." : "⚡ 3 Variantes"}
              </button>
            )}
          </div>

          <p style={{ margin: "12px 0 0", color: "rgba(226,232,240,0.55)", fontSize: 12, textAlign: "center" }}>
            Tip: escribe "Nicho" + "Pilar" y presiona <strong>Enter</strong>.
          </p>
        </div>

        {/* Info box sobre los nuevos campos */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: colors.warningSoft,
            borderRadius: 14,
            border: `1px solid rgba(251, 191, 36, 0.3)`,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: colors.warning, fontWeight: 700 }}>
            ✨ Nuevos campos 2025
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: colors.textMuted, lineHeight: 1.5 }}>
            <strong>Prioridad algorítmica:</strong> Optimiza el hook y estructura según la métrica que más importa (watch_time para retención, sends para viralidad, seo para descubrimiento).
            <br />
            <strong>Tono y formato:</strong> El sistema adaptará el lenguaje y las sugerencias de producción.
          </p>
        </div>

        {/* Knowledge Pack Info Box */}
        {useKnowledgePack && (
          <div style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(88, 28, 135, 0.06) 100%)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            borderRadius: 14,
            padding: "14px 18px",
            marginTop: 6,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: "#c4b5fd", fontWeight: 800 }}>
              🧠 Knowledge Pack Activo
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: colors.textMuted, lineHeight: 1.5 }}>
              <strong>Flujo:</strong> El sistema busca criterios relevantes en el Knowledge Pack Egremy, genera el script, lo evalúa con Quality Score (5 dimensiones), y si está bajo 80 puntos, lo reescribe automáticamente.<br/>
              <strong>Resultado:</strong> Script optimizado + Score + Fuentes de conocimiento usadas.
            </p>
          </div>
        )}

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
            <span style={{ marginLeft: 8, color: colors.warning, fontSize: 10, fontWeight: 700 }}>v4.0</span>
            <span style={{ marginLeft: 6, color: "#c4b5fd", fontSize: 10, fontWeight: 700 }}>+ Knowledge Pack</span>
            <br />
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.75)" }}>
              A system by Egremy Digital — Branding & Web Agency
            </span>
          </p>
        </div>
      </div>

      {/* Responsive helper */}
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
