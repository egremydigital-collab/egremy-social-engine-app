import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function CreateRun() {
  const nav = useNavigate();
  const projectId = localStorage.getItem("selected_project_id");

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
      // Usar supabase.functions.invoke en lugar de fetch directo
      const { data: result, error } = await supabase.functions.invoke("generate-content", {
        body: {
          project_id: projectId,
          ...formData,
        },
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
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>No has seleccionado un proyecto.</p>
        <button onClick={() => nav("/")}>Ir a Proyectos</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <button onClick={() => nav("/")} style={{ marginBottom: 16, cursor: "pointer" }}>
        ← Volver a Proyectos
      </button>

      <h1>🎬 Crear Contenido</h1>

      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <div>
          <label><strong>Nicho *</strong></label>
          <input
            name="niche"
            value={formData.niche}
            onChange={handleChange}
            placeholder="Ej: Clínica estética facial"
            style={{ width: "100%", padding: 10, marginTop: 4, boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label><strong>Pilar de contenido *</strong></label>
          <input
            name="pillar"
            value={formData.pillar}
            onChange={handleChange}
            placeholder="Ej: Tratamientos anti-edad"
            style={{ width: "100%", padding: 10, marginTop: 4, boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label><strong>Objetivo</strong></label>
          <select name="objective" value={formData.objective} onChange={handleChange} style={{ width: "100%", padding: 10, marginTop: 4 }}>
            <option value="Leads">Leads (conversiones)</option>
            <option value="Reach">Reach (alcance)</option>
            <option value="Sends">Sends (compartidos)</option>
            <option value="Saves">Saves (guardados)</option>
          </select>
        </div>

        <div>
          <label><strong>Nivel de consciencia</strong></label>
          <select name="awareness" value={formData.awareness} onChange={handleChange} style={{ width: "100%", padding: 10, marginTop: 4 }}>
            <option value="Frio">Frío (no te conocen)</option>
            <option value="Tibio">Tibio (algo te conocen)</option>
            <option value="Caliente">Caliente (listos para actuar)</option>
          </select>
        </div>

        <div>
          <label><strong>Duración</strong></label>
          <select name="duration" value={formData.duration} onChange={handleChange} style={{ width: "100%", padding: 10, marginTop: 4 }}>
            <option value="7-15">7-15 segundos (corto)</option>
            <option value="30-60">30-60 segundos (medio)</option>
            <option value="60+">60+ segundos (largo)</option>
          </select>
        </div>

        <div>
          <label><strong>Plataforma</strong></label>
          <select name="platform" value={formData.platform} onChange={handleChange} style={{ width: "100%", padding: 10, marginTop: 4 }}>
            <option value="IG">Instagram Reels</option>
            <option value="TT">TikTok</option>
            <option value="BOTH">Ambas</option>
          </select>
        </div>

        <div>
          <label><strong>CTA destino</strong></label>
          <select name="cta_dest" value={formData.cta_dest} onChange={handleChange} style={{ width: "100%", padding: 10, marginTop: 4 }}>
            <option value="DM">DM</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Link">Link en bio</option>
            <option value="Comentar">Comentar</option>
            <option value="Seguir">Seguir</option>
          </select>
        </div>

        <div>
          <label><strong>Nivel de riesgo creativo</strong></label>
          <select name="risk_level" value={formData.risk_level} onChange={handleChange} style={{ width: "100%", padding: 10, marginTop: 4 }}>
            <option value="bajo">Bajo (conservador, seguro)</option>
            <option value="medio">Medio (balanceado)</option>
            <option value="alto">Alto (agresivo, shock marketing)</option>
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: 16,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          {loading ? "Generando hooks..." : "🎣 Obtener Hooks Sugeridos"}
        </button>
      </div>
    </div>
  );
}
