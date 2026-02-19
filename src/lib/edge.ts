import { supabase } from "./supabase";

// === EDGE FUNCTION HELPER ===
// Calls generate-psp-script Edge Function (Knowledge Pack flow)

export interface GeneratePSPInput {
  topic: string;
  platform: string;
  duration_sec: number;
  audience: string;
  mode: string;
  brand_domain: string;
  niche: string;
  pillar: string;
  objective: string;
  awareness: string;
  cta_dest: string;
  risk_level: string;
  objective_pilar: string;
  tono: string;
  formato_video: string;
  language: string;
}

export interface GeneratePSPResponse {
  topic: string;
  platform: string;
  duration_sec: number;
  mode: string;
  objective_pilar: string;
  forced_hook_category: string;
  hook_selection: {
    selected_hook_id: string;
    original_hook: string;
    adapted_hook: string;
    hook_score: number;
    hook_attempts: number;
  };
  hooks_available: number;
  voice_profile: {
    tone: string;
    persona: string;
    intensity: string;
    style: string;
  };
  // v3.7.1 structured output
  run_id?: string;
  quality_score?: number;
  quality_passed?: boolean;
  quality_breakdown?: {
    hook_strength: number;
    psp_structure: number;
    objective_alignment: number;
    seo_compliance: number;
    compliance: number;
  };
  script_psp?: {
    hook: { time: string; text: string; visual_action: string; hook_type?: string };
    problem: { time: string; text: string; validation: string; emotion?: string };
    solution: { time: string; text: string; key_insight?: string; visual_demo?: string };
    proof_cta: { time: string; proof: string; cta: string; urgency_element?: string };
  };
  production_pack?: {
    screen_text: string[];
    cut_rhythm: string;
    visual_style: string;
    b_roll_suggestions: string[];
    music_mood: string;
  };
  seo_pack?: {
    caption: string;
    caption_frontloaded: string;
    hashtags: string[];
    alt_text: string;
    spoken_keywords: string[];
  };
  knowledge_sources: string[];
  knowledge_context_used?: boolean;
  retrieved_preview?: string;
  initial: {
    script: string;
    evaluation: {
      hook_strength: number;
      psp_structure: number;
      voice_score?: number;
      egremy_voice?: number;
      shareability: number;
      seo_compliance: number;
      total: number;
      notes: string[];
    };
  };
  final: {
    rewritten: boolean;
    rewrite_count: number;
    script: string;
    evaluation: {
      hook_strength: number;
      psp_structure: number;
      voice_score?: number;
      egremy_voice?: number;
      shareability: number;
      seo_compliance: number;
      total: number;
      notes: string[];
    };
  };
  config_used?: {
    hooks_pack: string;
    knowledge_pack: string;
    min_score: number;
    allow_hard_mode: boolean;
    version: string;
  };
}

export async function generatePSPScript(input: GeneratePSPInput): Promise<GeneratePSPResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("No hay sesión activa");
  }

  const { data, error } = await supabase.functions.invoke("generate-psp-script", {
    body: input,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    throw new Error(`Edge Function error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as GeneratePSPResponse;
}
