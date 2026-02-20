import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface GenerationResult {
  run_id: string;
  ai_model_used: string;
  risk_level_applied: string;
  version?: string;
  
  // Quality Score (nuevo v6)
  quality_score?: number;
  quality_passed?: boolean;
  quality_breakdown?: {
    hook_strength: number;
    psp_structure: number;
    objective_alignment: number;
    seo_compliance: number;
    compliance: number;
  };
  rewrites_performed?: number;
  
  // Pilar y estrategia (nuevo v6)
  objective_pilar?: string;
  tono?: string;
  
  hook: {
    code: string;
    text: string;
    category: string;
  };
  script_psp: {
    hook: { time: string; text: string; visual_action: string; pattern_interrupt?: string; hook_type?: string };
    problem: { time: string; text: string; validation: string; emotion?: string };
    solution: { time: string; text: string; key_insight?: string; analogy?: string; visual_demo?: string };
    proof_cta: { time: string; proof: string; cta: string; urgency_element?: string; keyword_trigger?: string };
  };
  production_pack: {
    // Soporta ambos formatos (v4 array y v6 objeto)
    screen_text: string[] | {
      top_safe?: string;
      center_main?: string;
      bottom_cta?: string;
    };
    cut_rhythm: string;
    visual_style: string;
    b_roll_suggestions?: string[];
    b_roll?: string[];
    music_mood?: string;
  };
  seo_pack: {
    audio_keywords?: string[];
    spoken_keywords?: string[];
    caption?: string;
    caption_frontloaded?: string;
    hashtags: string[];
    alt_text: string;
    best_posting_time?: string;
  };
  advanced_optimizations?: string[];
  ab_test_variants?: {
    hook_variant?: string;
    hook_b?: string;
    cta_variant?: string;
    cta_b?: string;
  };
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
  warning: "#fbbf24",
  error: "#ef4444",
  shadow: "0 18px 60px rgba(0,0,0,0.55)",
  // Section colors
  hookBg: "rgba(251, 191, 36, 0.12)",
  hookBorder: "rgba(251, 191, 36, 0.28)",
  hookText: "rgba(251, 191, 36, 0.95)",
  problemBg: "rgba(239, 68, 68, 0.12)",
  problemBorder: "rgba(239, 68, 68, 0.28)",
  problemText: "rgba(248, 113, 113, 0.95)",
  solutionBg: "rgba(34, 197, 94, 0.12)",
  solutionBorder: "rgba(34, 197, 94, 0.28)",
  solutionText: "rgba(74, 222, 128, 0.95)",
  ctaBg: "rgba(34, 242, 196, 0.12)",
  ctaBorder: "rgba(34, 242, 196, 0.28)",
  ctaText: "rgba(34, 242, 196, 0.95)",
};

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

const cardStyle = {
  padding: 20,
  borderRadius: 16,
  border: `1px solid ${colors.border}`,
  background: colors.bgCard,
  color: colors.text,
  boxShadow: colors.shadow,
  backdropFilter: "blur(8px)",
};

const chipStyle = {
  padding: "6px 12px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: "600" as const,
  background: "rgba(2,6,23,0.35)",
  border: `1px solid ${colors.border}`,
  color: colors.textMuted,
};

const tabButtonStyle = (isActive: boolean) => ({
  padding: "10px 18px",
  background: isActive ? colors.accentSoft : "rgba(2,6,23,0.35)",
  color: isActive ? colors.accent : colors.textMuted,
  border: `1px solid ${isActive ? colors.borderHover : colors.border}`,
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  transition: "all 0.2s",
});

// ========== HELPERS PARA COMPATIBILIDAD v4/v6 ==========

// Helper para obtener screen_text como array (compatible v4 y v6)
function getScreenTextArray(screenText: string[] | { top_safe?: string; center_main?: string; bottom_cta?: string } | undefined): string[] {
  if (!screenText) return [];
  if (Array.isArray(screenText)) return screenText;
  // Es objeto (v6)
  const result: string[] = [];
  if (screenText.top_safe) result.push(`[TOP] ${screenText.top_safe}`);
  if (screenText.center_main) result.push(`[CENTER] ${screenText.center_main}`);
  if (screenText.bottom_cta) result.push(`[BOTTOM] ${screenText.bottom_cta}`);
  return result;
}

// Helper para obtener caption (compatible v4 y v6)
function getCaption(seoPack: GenerationResult["seo_pack"]): string {
  return seoPack.caption_frontloaded || seoPack.caption || "";
}

// Helper para obtener keywords (compatible v4 y v6)
function getAudioKeywords(seoPack: GenerationResult["seo_pack"]): string[] {
  return seoPack.spoken_keywords || seoPack.audio_keywords || [];
}

// Helper para obtener b_roll (compatible v4 y v6)
function getBRoll(productionPack: GenerationResult["production_pack"]): string[] {
  if (productionPack.b_roll) return productionPack.b_roll;
  if (productionPack.b_roll_suggestions) return productionPack.b_roll_suggestions;
  return [];
}

// Helper para obtener A/B variants (compatible v4 y v6)
function getABVariants(variants: GenerationResult["ab_test_variants"]) {
  if (!variants) return null;
  return {
    hook: variants.hook_variant || variants.hook_b || null,
    cta: variants.cta_variant || variants.cta_b || null,
  };
}

// ========== OPTIMIZATION HINT SYSTEM (Ajuste B) ==========

type QualityDimension = "hook_strength" | "psp_structure" | "objective_alignment" | "seo_compliance" | "compliance";

const OPTIMIZATION_HINTS: Record<QualityDimension, string> = {
  hook_strength:
    "el hook podría ser más disruptivo con un pattern interrupt visual más fuerte en 0–1.7s.",
  psp_structure:
    "refuerza la emoción en el bloque Problema (dolor específico + validación humana).",
  objective_alignment:
    "el CTA podría reforzar mejor el objetivo (ej. pedir envío por DM si buscas Sends).",
  seo_compliance:
    "agrega 1–2 keywords habladas en el audio y refuérzalas con texto en pantalla (safe zones).",
  compliance:
    "revisa que no haya engagement bait o claims sensibles innecesarios.",
};

function findWeakestDimension(
  breakdown?: GenerationResult["quality_breakdown"]
): { dimension: QualityDimension; score: number; max: number; pct: number } | null {
  if (!breakdown) return null;

  const maxMap: Record<QualityDimension, number> = {
    hook_strength: 25,
    psp_structure: 25,
    objective_alignment: 20,
    seo_compliance: 20,
    compliance: 10,
  };

  const entries = Object.entries(breakdown) as [QualityDimension, number][];

  let weakest: { dimension: QualityDimension; score: number; max: number; pct: number } | null = null;

  entries.forEach(([dimension, score]) => {
    const max = maxMap[dimension];
    if (!max) return; // skip unknown dimensions
    const pct = score / max;

    if (!weakest || pct < weakest.pct) {
      weakest = { dimension, score, max, pct };
    }
  });

  return weakest;
}

export default function Result() {
  const nav = useNavigate();
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [variants, setVariants] = useState<GenerationResult[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [viewMode, setViewMode] = useState<"TEAM" | "CLIENT">("TEAM");
  const [activeTab, setActiveTab] = useState<"script" | "production" | "seo">("script");

  // ✅ Micro-feedback: solo un estado, y aplica al botón exacto (alto impacto, bajo riesgo)
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const mode = localStorage.getItem("generation_mode");
    
    // === MULTI-VARIANT MODE ===
    if (mode === "MULTI_VARIANT") {
      const savedVariants = localStorage.getItem("generation_variants");
      if (savedVariants) {
        const parsed = JSON.parse(savedVariants) as GenerationResult[];
        setVariants(parsed);
        setSelectedVariant(0);
        setResult(parsed[0]); // Show best variant by default
        return;
      }
    }
    
    // === SINGLE VARIANT MODE (backward compatible) ===
    const savedResult = localStorage.getItem("generation_result");
    if (savedResult) {
      setResult(JSON.parse(savedResult));
    } else {
      nav("/create");
    }
  }, [nav]);

  if (!result) {
    return (
      <div
        style={{
          ...backgroundStyle,
          padding: 24,
          minHeight: "100vh",
          color: colors.text,
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Cargando...</div>
          </div>
        </div>
      </div>
    );
  }

  // Variables helper para compatibilidad v4/v6
  const caption = getCaption(result.seo_pack);
  const audioKeywords = getAudioKeywords(result.seo_pack);
  const screenTextArray = getScreenTextArray(result.production_pack.screen_text);
  const bRollArray = getBRoll(result.production_pack);
  const abVariants = getABVariants(result.ab_test_variants);

  // Optimization Hint (Ajuste B) - Solo cuando score < 100
  const weakestDimension =
    result.quality_score !== undefined && result.quality_score < 100
      ? findWeakestDimension(result.quality_breakdown)
      : null;

  const optimizationHint = weakestDimension
    ? `Optimizable: ${OPTIMIZATION_HINTS[weakestDimension.dimension]} (Área: ${weakestDimension.dimension.replace(/_/g, " ")} ${Math.round(weakestDimension.pct * 100)}%)`
    : null;

  const copyToClipboard = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      // fallback silencioso (no rompemos UI)
      setCopiedKey("Error al copiar");
      window.setTimeout(() => setCopiedKey(null), 1200);
    }
  };

  // ✅ copyFullScript en formato BLOQUES con tiempos (teleprompter-friendly)
  const copyFullScript = async () => {
    const blocks = [
      {
        label: "Hook",
        time: result.script_psp.hook.time,
        text: result.script_psp.hook.text,
        extra: result.script_psp.hook.visual_action,
      },
      {
        label: "Problema",
        time: result.script_psp.problem.time,
        text: result.script_psp.problem.text,
        extra: result.script_psp.problem.validation,
      },
      {
        label: "Solución",
        time: result.script_psp.solution.time,
        text: result.script_psp.solution.text,
        extra: result.script_psp.solution.visual_demo || result.script_psp.solution.key_insight || "",
      },
      {
        label: "Prueba + CTA",
        time: result.script_psp.proof_cta.time,
        text: `Prueba: ${result.script_psp.proof_cta.proof}\nCTA: ${result.script_psp.proof_cta.cta}`,
        extra: result.script_psp.proof_cta.urgency_element || "",
      },
    ];

    const fullScript = `🎬 GUION EN BLOQUES (para grabar)

${blocks
  .map(
    (b) =>
      `[${b.time}] ${b.label}:
${b.text}${b.extra ? `\n\nVisual/nota: ${b.extra}` : ""}`
  )
  .join("\n\n---\n\n")}

---

📝 CAPTION:
${caption}

#️⃣ HASHTAGS:
${result.seo_pack.hashtags.join(" ")}

🔎 ALT TEXT:
${result.seo_pack.alt_text}`;

    await copyToClipboard("Copiar Guion (bloques)", fullScript);
  };

  const CopyButton = ({ text, label, small = false }: { text: string; label: string; small?: boolean }) => {
    const isCopied = copiedKey === label;
    return (
      <button
        onClick={() => copyToClipboard(label, text)}
        style={{
          padding: small ? "4px 10px" : "8px 14px",
          background: isCopied ? colors.accentSoft : "rgba(2,6,23,0.35)",
          color: isCopied ? colors.accent : colors.textMuted,
          border: `1px solid ${isCopied ? colors.borderHover : colors.border}`,
          borderRadius: 8,
          cursor: "pointer",
          fontSize: small ? 12 : 13,
          fontWeight: 700,
          transition: "all 0.3s",
          boxShadow: isCopied ? `0 0 18px ${colors.accentGlow}` : "none",
        }}
        title={isCopied ? "Copiado" : "Copiar"}
      >
        {isCopied ? "✔ Copiado" : "📋 Copiar"}
      </button>
    );
  };

  const isCopied = (key: string) => copiedKey === key;

  // Quality Score Badge Component (nuevo v6)
  const QualityScoreBadge = () => {
    if (!result.quality_score) return null;
    const score = result.quality_score;
    const passed = result.quality_passed;
    const bgColor = passed ? "rgba(16, 185, 129, 0.15)" : "rgba(251, 191, 36, 0.15)";
    const borderColor = passed ? "rgba(16, 185, 129, 0.35)" : "rgba(251, 191, 36, 0.35)";
    const textColor = passed ? colors.success : colors.warning;

    return (
      <div
        style={{
          ...cardStyle,
          background: bgColor,
          borderColor: borderColor,
          marginTop: 16,
          marginBottom: 0,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <strong style={{ color: textColor, fontSize: 16 }}>
              {passed ? "✅" : "⚠️"} Quality Score: {score}/100
            </strong>
            {result.rewrites_performed !== undefined && result.rewrites_performed > 0 && (
              <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: 12 }}>
                🔄 Auto-optimizado {result.rewrites_performed} {result.rewrites_performed === 1 ? "vez" : "veces"}
              </p>
            )}
            {/* Optimization Hint - Solo cuando score < 100 */}
            {optimizationHint && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: colors.textMuted,
                  lineHeight: 1.5,
                  maxWidth: 720,
                }}
              >
                ✨ {optimizationHint}
              </p>
            )}
          </div>
          {result.quality_breakdown && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...chipStyle, fontSize: 11 }}>Hook: {result.quality_breakdown.hook_strength}/25</span>
              <span style={{ ...chipStyle, fontSize: 11 }}>PSP: {result.quality_breakdown.psp_structure}/25</span>
              <span style={{ ...chipStyle, fontSize: 11 }}>Objetivo: {result.quality_breakdown.objective_alignment}/20</span>
              <span style={{ ...chipStyle, fontSize: 11 }}>SEO: {result.quality_breakdown.seo_compliance}/20</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        ...backgroundStyle,
        minHeight: "100vh",
        padding: "44px 24px",
        color: colors.text,
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {/* Back button */}
        <button
          onClick={() => nav("/create")}
          style={{
            marginBottom: 24,
            cursor: "pointer",
            background: "rgba(2,6,23,0.35)",
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
            padding: "10px 18px",
            borderRadius: 10,
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
          ← Crear otro contenido
        </button>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -0.2,
                display: "flex",
                alignItems: "center",
                gap: 12,
                textShadow: "0 10px 35px rgba(34,242,196,0.18), 0 2px 14px rgba(0,0,0,0.65)",
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
                🎬
              </span>
              Guion Generado
              {result.version && <span style={{ fontSize: 12, color: colors.accent, marginLeft: 8 }}>{result.version}</span>}
            </h1>

            {/* A) Micro-hero Egremy (sutil, premium) */}
            <p style={{ color: colors.textMuted, marginTop: 10, marginBottom: 0, fontSize: 13, lineHeight: 1.5 }}>
              {viewMode === "CLIENT" ? (
                "No es contenido. Es un sistema diseñado para convertir."
              ) : (
                <>
                  No generamos posts. Construimos{" "}
                  <span style={{ color: colors.accent, fontWeight: 800 }}>sistemas</span> de comunicación.
                </>
              )}
            </p>
          </div>

          {/* Toggle TEAM/CLIENT with glow */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: colors.bgCard,
              padding: 4,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <button
              onClick={() => setViewMode("TEAM")}
              style={{
                padding: "10px 20px",
                background: viewMode === "TEAM" ? colors.accent : "transparent",
                color: viewMode === "TEAM" ? colors.textDark : colors.textMuted,
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 800,
                transition: "all 0.2s",
                boxShadow: viewMode === "TEAM" ? `0 0 20px ${colors.accentGlow}` : "none",
              }}
            >
              👥 Equipo
            </button>
            <button
              onClick={() => setViewMode("CLIENT")}
              style={{
                padding: "10px 20px",
                background: viewMode === "CLIENT" ? colors.accent : "transparent",
                color: viewMode === "CLIENT" ? colors.textDark : colors.textMuted,
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 800,
                transition: "all 0.2s",
                boxShadow: viewMode === "CLIENT" ? `0 0 20px ${colors.accentGlow}` : "none",
              }}
            >
              🎬 Vista Cliente
            </button>
          </div>
        </div>

        {/* Quality Score Badge (nuevo v6) - Solo TEAM */}
        {viewMode === "TEAM" && <QualityScoreBadge />}

        {/* === VARIANT SELECTOR (only in multi-variant mode) === */}
        {variants.length > 1 && viewMode === "TEAM" && (
          <div
            style={{
              ...cardStyle,
              marginTop: 16,
              marginBottom: 0,
              padding: 16,
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.10) 0%, rgba(88, 28, 135, 0.08) 100%)",
              borderColor: "rgba(139, 92, 246, 0.30)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#c4b5fd" }}>⚡ 2 Variantes generadas</span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>Selecciona la que mejor se adapte</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {variants.map((v, idx) => {
                const isSelected = idx === selectedVariant;
                const score = v.quality_score || 0;
                const hookPreview = v.script_psp?.hook?.text?.substring(0, 45) || "Variante";
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedVariant(idx);
                      setResult(v);
                    }}
                    style={{
                      flex: "1 1 200px",
                      padding: "12px 16px",
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(88, 28, 135, 0.20) 100%)"
                        : "rgba(2,6,23,0.35)",
                      border: `2px solid ${isSelected ? "#8b5cf6" : colors.border}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left" as const,
                      transition: "all 0.2s",
                      boxShadow: isSelected ? "0 0 20px rgba(139, 92, 246, 0.20)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isSelected ? "#c4b5fd" : colors.textMuted }}>
                        Variante {idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: score >= 90 ? colors.success : score >= 80 ? colors.warning : colors.error,
                          background: score >= 90 ? "rgba(16,185,129,0.15)" : score >= 80 ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {score}/100
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: isSelected ? colors.text : colors.textMuted, lineHeight: 1.4 }}>
                      &ldquo;{hookPreview}...&rdquo;
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Meta chips - Solo TEAM */}
        {viewMode === "TEAM" && (
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <span style={{ ...chipStyle, background: "rgba(99, 102, 241, 0.15)", borderColor: "rgba(99, 102, 241, 0.3)" }}>
              🤖 {result.ai_model_used}
            </span>
            <span style={{ ...chipStyle, background: "rgba(251, 191, 36, 0.15)", borderColor: "rgba(251, 191, 36, 0.3)" }}>
              ⚡ Risk: {result.risk_level_applied}
            </span>
            <span style={chipStyle}>
              🎣 {result.hook.code} — {result.hook.category}
            </span>
            {result.objective_pilar && (
              <span style={{ ...chipStyle, background: colors.accentSoft, borderColor: colors.borderHover }}>
                🎯 {result.objective_pilar}
              </span>
            )}
            {result.tono && (
              <span style={chipStyle}>
                🗣️ {result.tono}
              </span>
            )}
          </div>
        )}

        {/* Tabs + Quick Actions */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setActiveTab("script")} style={tabButtonStyle(activeTab === "script")}>
              📝 Guion
            </button>
            <button onClick={() => setActiveTab("production")} style={tabButtonStyle(activeTab === "production")}>
              🎬 Producción
            </button>
            <button onClick={() => setActiveTab("seo")} style={tabButtonStyle(activeTab === "seo")}>
              🔍 SEO
            </button>
          </div>

          {/* Quick copy buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={copyFullScript}
              style={{
                ...glowButton,
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                transition: "all 0.3s",
                boxShadow: isCopied("Copiar Guion (bloques)") ? `0 0 26px ${colors.accentGlow}` : (glowButton.boxShadow as string),
              }}
              title="Copia el guion completo en bloques"
            >
              {isCopied("Copiar Guion (bloques)") ? "✔ Guion copiado" : "📋 Copiar Guion (bloques)"}
            </button>

            <button
              onClick={() => copyToClipboard("Copiar Caption", caption)}
              style={{
                padding: "10px 16px",
                background: isCopied("Copiar Caption") ? colors.accentSoft : "rgba(2,6,23,0.35)",
                color: isCopied("Copiar Caption") ? colors.accent : colors.textMuted,
                border: `1px solid ${isCopied("Copiar Caption") ? colors.borderHover : colors.border}`,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.3s",
                boxShadow: isCopied("Copiar Caption") ? `0 0 18px ${colors.accentGlow}` : "none",
              }}
            >
              {isCopied("Copiar Caption") ? "✔ Caption copiado" : "📝 Copiar Caption"}
            </button>

            <button
              onClick={() => copyToClipboard("Copiar Hashtags", result.seo_pack.hashtags.join(" "))}
              style={{
                padding: "10px 16px",
                background: isCopied("Copiar Hashtags") ? colors.accentSoft : "rgba(2,6,23,0.35)",
                color: isCopied("Copiar Hashtags") ? colors.accent : colors.textMuted,
                border: `1px solid ${isCopied("Copiar Hashtags") ? colors.borderHover : colors.border}`,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.3s",
                boxShadow: isCopied("Copiar Hashtags") ? `0 0 18px ${colors.accentGlow}` : "none",
              }}
            >
              {isCopied("Copiar Hashtags") ? "✔ Hashtags copiados" : "#️⃣ Copiar Hashtags"}
            </button>
          </div>
        </div>

        {/* TAB: SCRIPT PSP */}
        {activeTab === "script" && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 22, marginBottom: 20, color: colors.text, fontWeight: 800 }}>📝 Script PSP</h2>

            {/* Hook */}
            <div
              style={{
                ...cardStyle,
                background: colors.hookBg,
                borderColor: colors.hookBorder,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <strong style={{ color: colors.hookText, fontSize: 14, fontWeight: 900 }}>
                  🎣 HOOK ({result.script_psp.hook.time})
                </strong>
                <CopyButton text={result.script_psp.hook.text} label="Hook" small />
              </div>
              <p style={{ fontSize: 18, margin: "14px 0 10px", color: colors.text, lineHeight: 1.5 }}>
                "{result.script_psp.hook.text}"
              </p>
              {viewMode === "TEAM" && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.hookBorder}` }}>
                  <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                    📹 <strong style={{ color: colors.text }}>Visual:</strong> {result.script_psp.hook.visual_action}
                  </p>
                  {result.script_psp.hook.pattern_interrupt && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      🎯 <strong style={{ color: colors.text }}>Pattern Interrupt:</strong> {result.script_psp.hook.pattern_interrupt}
                    </p>
                  )}
                  {result.script_psp.hook.hook_type && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      🏷️ <strong style={{ color: colors.text }}>Tipo:</strong> {result.script_psp.hook.hook_type}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Problem */}
            <div
              style={{
                ...cardStyle,
                background: colors.problemBg,
                borderColor: colors.problemBorder,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <strong style={{ color: colors.problemText, fontSize: 14, fontWeight: 900 }}>
                  😰 PROBLEMA ({result.script_psp.problem.time})
                </strong>
                <CopyButton text={result.script_psp.problem.text} label="Problema" small />
              </div>
              <p style={{ fontSize: 16, margin: "14px 0 10px", color: colors.text, lineHeight: 1.5 }}>
                "{result.script_psp.problem.text}"
              </p>
              {viewMode === "TEAM" && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.problemBorder}` }}>
                  <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                    ✅ <strong style={{ color: colors.text }}>Validación:</strong> {result.script_psp.problem.validation}
                  </p>
                  {result.script_psp.problem.emotion && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      💭 <strong style={{ color: colors.text }}>Emoción:</strong> {result.script_psp.problem.emotion}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Solution */}
            <div
              style={{
                ...cardStyle,
                background: colors.solutionBg,
                borderColor: colors.solutionBorder,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <strong style={{ color: colors.solutionText, fontSize: 14, fontWeight: 900 }}>
                  💡 SOLUCIÓN ({result.script_psp.solution.time})
                </strong>
                <CopyButton text={result.script_psp.solution.text} label="Solución" small />
              </div>
              <p style={{ fontSize: 16, margin: "14px 0 10px", color: colors.text, lineHeight: 1.5 }}>
                "{result.script_psp.solution.text}"
              </p>
              {viewMode === "TEAM" && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.solutionBorder}` }}>
                  {result.script_psp.solution.key_insight && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      🔑 <strong style={{ color: colors.text }}>Insight:</strong> {result.script_psp.solution.key_insight}
                    </p>
                  )}
                  {result.script_psp.solution.analogy && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      🎭 <strong style={{ color: colors.text }}>Analogía:</strong> {result.script_psp.solution.analogy}
                    </p>
                  )}
                  {result.script_psp.solution.visual_demo && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      📹 <strong style={{ color: colors.text }}>Demo visual:</strong> {result.script_psp.solution.visual_demo}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Proof + CTA */}
            <div
              style={{
                ...cardStyle,
                background: colors.ctaBg,
                borderColor: colors.ctaBorder,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <strong style={{ color: colors.ctaText, fontSize: 14, fontWeight: 900 }}>
                  🏆 PRUEBA + CTA ({result.script_psp.proof_cta.time})
                </strong>
                <CopyButton text={`${result.script_psp.proof_cta.proof} ${result.script_psp.proof_cta.cta}`} label="Prueba + CTA" small />
              </div>
              <p style={{ fontSize: 16, margin: "14px 0 6px", color: colors.text, lineHeight: 1.5 }}>
                <strong>Prueba:</strong> "{result.script_psp.proof_cta.proof}"
              </p>
              <p style={{ fontSize: 16, margin: "6px 0", color: colors.text, lineHeight: 1.5 }}>
                <strong>CTA:</strong> "{result.script_psp.proof_cta.cta}"
              </p>
              {viewMode === "TEAM" && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.ctaBorder}` }}>
                  {result.script_psp.proof_cta.urgency_element && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      ⏰ <strong style={{ color: colors.text }}>Urgencia:</strong> {result.script_psp.proof_cta.urgency_element}
                    </p>
                  )}
                  {result.script_psp.proof_cta.keyword_trigger && (
                    <p style={{ margin: "6px 0", color: colors.textMuted, fontSize: 13 }}>
                      🔑 <strong style={{ color: colors.text }}>Keyword trigger:</strong> {result.script_psp.proof_cta.keyword_trigger}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* A/B TEST - Solo TEAM */}
            {viewMode === "TEAM" && abVariants && (abVariants.hook || abVariants.cta) && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 18, marginBottom: 16, color: colors.text, fontWeight: 800 }}>🧪 Variantes A/B Test</h3>

                {abVariants.hook && (
                  <div style={{ ...cardStyle, background: colors.hookBg, borderColor: colors.hookBorder, marginBottom: 16 }}>
                    <strong style={{ color: colors.hookText, fontWeight: 900 }}>🎣 Hook alternativo</strong>
                    <p style={{ margin: "12px 0 0", color: colors.text, fontSize: 16 }}>"{abVariants.hook}"</p>
                  </div>
                )}

                {abVariants.cta && (
                  <div style={{ ...cardStyle, background: colors.ctaBg, borderColor: colors.ctaBorder }}>
                    <strong style={{ color: colors.ctaText, fontWeight: 900 }}>📲 CTA alternativo</strong>
                    <p style={{ margin: "12px 0 0", color: colors.text, fontSize: 16 }}>"{abVariants.cta}"</p>
                  </div>
                )}
              </div>
            )}

            {/* OPTIMIZATIONS - Solo TEAM */}
            {viewMode === "TEAM" && result.advanced_optimizations && result.advanced_optimizations.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 18, marginBottom: 16, color: colors.text, fontWeight: 800 }}>⚡ Optimizaciones Avanzadas</h3>
                <div style={cardStyle}>
                  <ul style={{ paddingLeft: 20, margin: 0, color: colors.text, lineHeight: 1.6 }}>
                    {result.advanced_optimizations.map((opt, i) => (
                      <li key={i} style={{ marginBottom: 10 }}>
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB: PRODUCTION PACK */}
        {activeTab === "production" && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 22, marginBottom: 20, color: colors.text, fontWeight: 800 }}>🎬 Production Pack</h2>

            {screenTextArray.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <strong style={{ color: colors.textMuted }}>📺 Textos en pantalla</strong>
                  <CopyButton text={screenTextArray.join("\n")} label="Textos en pantalla" small />
                </div>
                <ul style={{ margin: "12px 0 0", paddingLeft: 20, color: colors.text }}>
                  {screenTextArray.map((text, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={cardStyle}>
                <strong style={{ color: colors.textMuted }}>✂️ Ritmo de cortes</strong>
                <p style={{ margin: "10px 0 0", fontSize: 14, color: colors.text }}>{result.production_pack.cut_rhythm}</p>
              </div>
              <div style={cardStyle}>
                <strong style={{ color: colors.textMuted }}>🎨 Estilo visual</strong>
                <p style={{ margin: "10px 0 0", fontSize: 14, color: colors.text }}>{result.production_pack.visual_style}</p>
              </div>
            </div>

            {bRollArray.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <strong style={{ color: colors.textMuted }}>🎥 B-Roll sugerido</strong>
                <ul style={{ margin: "12px 0 0", paddingLeft: 20, color: colors.text }}>
                  {bRollArray.map((item, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.production_pack.music_mood && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <strong style={{ color: colors.textMuted }}>🎵 Mood musical</strong>
                <p style={{ margin: "10px 0 0", color: colors.text }}>{result.production_pack.music_mood}</p>
              </div>
            )}

            {/* Tip pro */}
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 14,
                background: colors.accentSoft,
                border: `1px solid ${colors.borderHover}`,
              }}
            >
              <strong style={{ color: colors.accent }}>💡 Tip pro</strong>
              <p style={{ margin: "8px 0 0", color: colors.textMuted, lineHeight: 1.5 }}>
                Graba primero el Hook en 2-3 tomas distintas y elige la que mejor detenga el scroll.
              </p>
            </div>
          </section>
        )}

        {/* TAB: SEO PACK */}
        {activeTab === "seo" && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 22, marginBottom: 20, color: colors.text, fontWeight: 800 }}>🔍 SEO Pack</h2>

            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <strong style={{ color: colors.textMuted }}>📝 Caption {result.seo_pack.caption_frontloaded ? "(Front-loaded)" : ""}</strong>
                <CopyButton text={caption} label="Caption" small />
              </div>
              <p style={{ margin: "12px 0 0", color: colors.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {caption}
              </p>
            </div>

            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <strong style={{ color: colors.textMuted }}>#️⃣ Hashtags</strong>
                <CopyButton text={result.seo_pack.hashtags.join(" ")} label="Hashtags" small />
              </div>
              <p style={{ margin: "12px 0 0", color: colors.accent, lineHeight: 1.6 }}>{result.seo_pack.hashtags.join(" ")}</p>
            </div>

            {audioKeywords.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <strong style={{ color: colors.textMuted }}>🎤 {result.seo_pack.spoken_keywords ? "Spoken Keywords (decir en audio)" : "Keywords Audio"}</strong>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {audioKeywords.map((keyword, i) => (
                    <span key={i} style={chipStyle}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <strong style={{ color: colors.textMuted }}>🖼️ Alt-text</strong>
              <p style={{ margin: "12px 0 0", color: colors.text }}>{result.seo_pack.alt_text}</p>
            </div>

            {result.seo_pack.best_posting_time && (
              <div style={cardStyle}>
                <strong style={{ color: colors.textMuted }}>⏰ Mejor hora para publicar</strong>
                <p style={{ margin: "12px 0 0", color: colors.text }}>{result.seo_pack.best_posting_time}</p>
              </div>
            )}
          </section>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 16, marginTop: 48, flexWrap: "wrap" }}>
          <button
            onClick={() => nav("/create")}
            style={{
              ...glowButton,
              flex: 1,
              minWidth: 200,
              padding: 18,
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 16,
              transition: "all 0.2s",
            }}
          >
            ➕ Crear otro contenido
          </button>
          <button
            onClick={() => nav("/")}
            style={{
              flex: 1,
              minWidth: 200,
              padding: 18,
              background: colors.bgCard,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
              transition: "all 0.2s",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.accent;
              e.currentTarget.style.boxShadow = `0 0 20px ${colors.accentGlow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            📁 Ir a Proyectos
          </button>
        </div>

        {/* Footer Egremy */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${colors.border}`, textAlign: "center" }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: colors.accent, fontWeight: 800 }}>Egremy Social Engine</span>
            <span style={{ marginLeft: 8, color: colors.warning, fontSize: 10, fontWeight: 700 }}>v2.0</span>
            <br />
            <span style={{ color: "rgba(226,232,240,0.62)", fontSize: 11 }}>A system by Egremy Digital — Branding & Web Agency</span>
          </p>
        </div>
      </div>

      {/* Responsive helper */}
      <style>
        {`
          @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr !important; }
          }
        `}
      </style>
    </div>
  );
}
