"""Gradio UI for Kisan Voice Assistant with Voice & Text input and MCP inspection."""

import asyncio
import json
import logging
import time
from typing import Tuple

import gradio as gr

from src.agent import KisanAgent
from src.language import LANGUAGE_NAMES, detect_language
from src.stt import SpeechToTextEngine
from src.tts import clean_text_for_speech, synthesize_sync

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("app")

# Initialize modules
stt_engine = SpeechToTextEngine()
agent = KisanAgent()


def process_query_pipeline(
    audio_path: str | None,
    text_input: str | None,
    selected_language: str,
) -> Tuple[str, str, str, str, str]:
    """End-to-end pipeline: Audio/Text -> STT -> Agent Tool Loop -> TTS -> Outputs."""
    t_start = time.time()
    stt_ms = 0.0

    # 1. Determine Input (Audio or Text)
    query_text = ""
    if audio_path:
        t0 = time.time()
        stt_res = stt_engine.transcribe(audio_path)
        stt_ms = (time.time() - t0) * 1000.0
        if not stt_res["success"]:
            err_msg = stt_res.get("error", "ध्वनी रेकॉर्डिंग स्पष्ट नाही. कृपया पुन्हा प्रयत्न करा.")
            return err_msg, "", None, "", json.dumps({"error": err_msg}, indent=2)
        query_text = stt_res["text"]
    elif text_input and text_input.strip():
        query_text = text_input.strip()
    else:
        return "कृपया प्रश्न बोला किंवा खाली टाइप करा.", "", None, "", "{}"

    # 2. Language Resolution
    target_lang = None
    if selected_language == "मराठी (Marathi)":
        target_lang = "mr"
    elif selected_language == "हिंदी (Hindi)":
        target_lang = "hi"
    elif selected_language == "English":
        target_lang = "en"
    else:
        target_lang = detect_language(query_text)

    # 3. Agent Execution (Tool-calling loop)
    agent_res = asyncio.run(agent.execute(query_text, language=target_lang))
    answer_text = agent_res["answer"]
    lang_code = agent_res["language"]

    # 4. Text-to-Speech Generation
    t_tts_0 = time.time()
    try:
        audio_reply_path = synthesize_sync(answer_text, language=lang_code)
    except Exception as e:
        logger.warning(f"TTS synthesis error: {e}")
        audio_reply_path = None
    tts_ms = (time.time() - t_tts_0) * 1000.0

    # 5. Format Inspection Panel (Sources, Tool calls, Latencies)
    timings = agent_res.get("timings", {})
    timings["stt_ms"] = round(stt_ms, 2)
    timings["tts_ms"] = round(tts_ms, 2)
    timings["total_pipeline_ms"] = round((time.time() - t_start) * 1000.0, 2)

    tool_calls = agent_res.get("tool_calls", [])
    sources = agent_res.get("sources", [])

    sources_md = "### 📚 संदर्भ दस्तऐवज (Retrieved Advisory / Scheme Sources)\n"
    if sources:
        for idx, s in enumerate(sources, 1):
            sources_md += f"- **[{idx}] {s.get('source', 'Unknown')}** (पान क्रमांक: {s.get('page', 1)}) — Relevancy Score: `{s.get('score', 0)}`\n"
    else:
        sources_md += "*कोणत्याही दस्तऐवजाचा संदर्भ वापरलेला नाही (थेट साधन किंवा सामान्य माहिती).*\n"

    inspection_data = {
        "timings_ms": timings,
        "tool_calls_count": len(tool_calls),
        "tool_calls": tool_calls,
        "sources": sources,
    }
    inspection_json = json.dumps(inspection_data, indent=2, ensure_ascii=False)

    lang_display = f"🌐 {LANGUAGE_NAMES.get(lang_code, lang_code)}"
    return query_text, answer_text, str(audio_reply_path) if audio_reply_path else None, lang_display, sources_md + "\n\n```json\n" + inspection_json + "\n```"


# Gradio UI Construction
with gr.Blocks(title="Kisan Voice Assistant - शेतकरी व्हॉइस सहाय्यक", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        """
        # 🌾 Kisan Voice Assistant (शेतकरी व्हॉइस सहाय्यक)
        ### AI Voice Companion for Farmers • मराठी | हिंदी | English
        Ask questions regarding **Weather Forecasts**, **Mandi APMC Prices**, **Crop Advisories (Sugarcane, Soybean, Grape)**, and **Government Schemes (PM-KISAN)**.
        """
    )

    with gr.Row():
        with gr.Column(scale=1):
            lang_selector = gr.Radio(
                choices=["Auto-detect", "मराठी (Marathi)", "हिंदी (Hindi)", "English"],
                value="Auto-detect",
                label="🗣️ भाषा निवडा (Select Language)",
            )
            audio_in = gr.Audio(
                sources=["microphone", "upload"],
                type="filepath",
                label="🎤 बोला (Speak Your Question)",
            )
            text_in = gr.Textbox(
                placeholder="किंवा येथे प्रश्न लिहा... (उदा. कोल्हापुरात आज उसाचा भाव काय आहे? आणि उद्या पाऊस पडेल का?)",
                label="⌨️ किंवा टाइप करा (Or Type Here)",
                lines=2,
            )
            submit_btn = gr.Button("🚀 विचारा (Ask Assistant)", variant="primary", size="lg")

            gr.Examples(
                examples=[
                    ["", "कोल्हापुरात आज उसाचा दर काय आहे? आणि उद्या पाऊस पडेल का?", "मराठी (Marathi)"],
                    ["", "सोयाबीनवर चक्री भुंगा आला आहे, काय फवारावे?", "मराठी (Marathi)"],
                    ["", "PM-KISAN योजनेत किती पैसे मिळतात आणि कोण अपात्र आहे?", "मराठी (Marathi)"],
                    ["", "कल पुणे में बारिश होगी क्या और सोयाबीन का भाव क्या है?", "हिंदी (Hindi)"],
                    ["", "What is the modal price of grapes in Nashik today?", "English"],
                ],
                inputs=[audio_in, text_in, lang_selector],
            )

        with gr.Column(scale=1):
            detected_lang_badge = gr.Markdown("🌐 भाषा: *प्रतीक्षेत...*")
            transcribed_query = gr.Textbox(label="📝 ऐकलेला प्रश्न (Transcribed Query)", interactive=False)
            assistant_reply = gr.Textbox(label="🌾 सहाय्यकाचे उत्तर (Assistant Response)", lines=4, interactive=False)
            audio_reply = gr.Audio(label="🔊 उत्तर ऐका (Spoken Audio Reply)", autoplay=True)

            with gr.Accordion("🔍 तांत्रिक तपशील: टूल्स आणि स्रोत (Show Sources & Tool Calls)", open=False):
                inspection_details = gr.Markdown("साधने आणि दस्तऐवज कॉल तपशील येथे दिसतील.")

    submit_btn.click(
        fn=process_query_pipeline,
        inputs=[audio_in, text_in, lang_selector],
        outputs=[transcribed_query, assistant_reply, audio_reply, detected_lang_badge, inspection_details],
    )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, share=False)
