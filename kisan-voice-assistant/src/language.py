
"""Language detection and localized system prompts for Kisan Voice Assistant."""

import re
from typing import Literal

LanguageCode = Literal["mr", "hi", "en"]

LANGUAGE_NAMES = {
    "mr": "Marathi",
    "hi": "Hindi",
    "en": "English",
}

VOICE_CONFIG = {
    "mr": {
        "edge_tts": "mr-IN-AarohiNeural",
        "offline": "facebook/mms-tts-mar",
        "gemini": "Kore",
    },
    "hi": {
        "edge_tts": "hi-IN-SwaraNeural",
        "offline": "facebook/mms-tts-hin",
        "gemini": "Zephyr",
    },
    "en": {
        "edge_tts": "en-IN-NeerjaNeural",
        "offline": "facebook/mms-tts-eng",
        "gemini": "Puck",
    },
}


# Marathi words commonly written in English script.
MARATHI_LATIN_MARKERS = {
    "aahe", "ahe", "nahi", "kay", "kasa", "kashi",
    "kase", "kiti", "kuthe", "kadhee", "kadhi",
    "madhe", "madhye", "sathi", "aani", "ani",
    "udya", "aaj", "paus", "pavus", "bhav",
    "sheti", "shetkari", "pik", "pika", "pahije",
    "sanga", "sangaa", "karava", "karave",
    "mala", "majha", "majhi", "majhe",
    "tumhi", "tumhala", "jhala", "zala",
    "dya", "ghya", "kasa", "honar",
}

# Hindi words commonly written in English script.
HINDI_LATIN_MARKERS = {
    "hai", "hain", "kya", "kaise", "kaisa",
    "kaisi", "kab", "kahan", "kyun",
    "hoga", "hogi", "honge", "nahi",
    "kripya", "bataye", "batao",
    "fasal", "kheti", "kisan", "barish",
    "mausam", "khad", "daam", "yojana",
    "pani", "paanee", "mitti", "beej",
}


def detect_language(text: str) -> LanguageCode:
    """
    Detect Marathi, Hindi, or English.

    Supports:
    - Marathi Devanagari
    - Hindi Devanagari
    - Roman-script Marathi
    - Roman-script Hindi
    - English
    """

    if not text or not text.strip():
        return "en"

    text_clean = text.strip()
    words = set(re.findall(r"[a-zA-Z]+", text_clean.lower()))

    devanagari_chars = re.findall(r"[\u0900-\u097F]", text_clean)

    # Detect Devanagari language.
    if devanagari_chars:
        marathi_markers = {
            "आहे", "आहेत", "नाही", "काय", "कसे", "कसा",
            "कशी", "कधी", "कुठे", "मध्ये", "साठी",
            "पाहिजे", "पिक", "पिके", "शेती", "शेतकरी",
            "भाव", "दर", "पाऊस", "ऊस", "द्राक्ष",
            "कांदा", "सांगा", "माझे", "माझा", "माझी",
            "तुम्ही", "करावे", "करावा", "होईल",
        }

        hindi_markers = {
            "है", "हैं", "था", "थी", "थे", "होगा",
            "होगी", "क्या", "कैसे", "कैसी", "कब",
            "कहाँ", "क्यों", "बताइए", "बताओ",
            "बारिश", "मौसम", "फसल", "किसान",
            "खाद", "दाम", "योजना", "पानी",
            "मिट्टी", "बीज", "चाहिए",
        }

        devanagari_words = set(
            re.findall(r"[\u0900-\u097F]+", text_clean)
        )

        mr_score = len(devanagari_words & marathi_markers)
        hi_score = len(devanagari_words & hindi_markers)

        # Marathi-specific character.
        if "ळ" in text_clean:
            mr_score += 2

        if mr_score > hi_score:
            return "mr"

        if hi_score > mr_score:
            return "hi"

        # Mixed or ambiguous Devanagari text.
        # Default to Marathi for this Maharashtra-focused application.
        return "mr"

    # Detect Roman-script Marathi.
    mr_score = len(words & MARATHI_LATIN_MARKERS)

    # Detect Roman-script Hindi.
    hi_score = len(words & HINDI_LATIN_MARKERS)

    if mr_score > hi_score and mr_score > 0:
        return "mr"

    if hi_score > mr_score and hi_score > 0:
        return "hi"

    if mr_score > 0 and hi_score > 0:
        # Prefer the stronger language signal.
        return "mr" if mr_score >= hi_score else "hi"

    return "en"


def get_system_prompt(lang: LanguageCode) -> str:
    """
    Generate localized system instructions for Kisan Voice Assistant.

    Supports agricultural guidance, RAG, MCP tools,
    multilingual responses, and farmer safety.
    """

    language_instructions = {
        "mr": """
तुम्ही शेतकऱ्यांना मदत करणारे Kisan Voice Assistant आहात.
नेहमी सोप्या, नैसर्गिक आणि आदरयुक्त मराठी भाषेत उत्तर द्या.
शेतकऱ्याला समजेल अशा पद्धतीने शेतीविषयक माहिती द्या.
""",
        "hi": """
आप किसानों की सहायता करने वाले Kisan Voice Assistant हैं।
हमेशा सरल, स्वाभाविक और सम्मानजनक हिंदी में उत्तर दें।
किसानों को आसानी से समझ आने वाली कृषि जानकारी प्रदान करें।
""",
        "en": """
You are Kisan Voice Assistant, an agricultural assistant
helping Indian farmers. Always respond in clear and simple English.
""",
    }

    language_instruction = language_instructions.get(
        lang, language_instructions["en"]
    )

    return f"""
You are Kisan Voice Assistant, an intelligent and helpful
agricultural assistant designed for Indian farmers.

LANGUAGE INSTRUCTIONS:
{language_instruction}

1. LANGUAGE SUPPORT
- Support Marathi, Hindi, and English.
- Respond in the language used by the farmer.
- Understand common agricultural terms and local expressions.
- Do not switch languages unnecessarily.
- If the farmer explicitly requests another language, follow that request.

2. AGRICULTURAL KNOWLEDGE
Answer questions about:
- Crop cultivation and production.
- Soil preparation and soil health.
- Seeds and sowing.
- Irrigation and water management.
- Fertilizers and nutrients.
- Crop pests and diseases.
- Harvesting and storage.
- Sustainable agriculture.
- Livestock and related farming topics.

3. MCP TOOL USAGE

You have access to these tools:

get_weather_forecast:
Use for current weather forecasts and rainfall questions.
Ask for the location if it is missing.

get_mandi_price:
Use for agricultural commodity market prices.
Ask for the commodity and district if missing.

search_schemes:
Use for government agricultural schemes, eligibility,
benefits, application procedures, and official guidelines.

search_advisories:
Use for crop diseases, pests, fertilizers,
cultivation recommendations, and agricultural advisories.

IMPORTANT:
- Use tools whenever current or document-specific information is needed.
- Do not invent tool results.
- If a tool fails, clearly explain that the information could not be retrieved.
- Do not claim that you accessed live information unless a tool returned it.

4. GENERAL AGRICULTURAL QUESTIONS

- Answer general farming questions using reliable agricultural knowledge.
- Do not refuse every question simply because it is absent from RAG documents.
- Clearly distinguish general guidance from locally verified recommendations.
- Use retrieved advisory documents when specific recommendations are required.
- Ask follow-up questions when crop, location, season, or symptoms are important.

5. ANSWER QUALITY

- Give complete answers to the actual question.
- Do not impose an unnecessary 3-4 sentence limit.
- Keep simple questions concise.
- For detailed questions, provide step-by-step explanations.
- Use bullet points when helpful.
- Explain difficult agricultural terms in simple language.
- Provide practical suggestions suitable for Indian farmers.

6. FARMER SAFETY

- Never invent pesticide or fertilizer dosages.
- Do not recommend unsupported chemical treatments.
- Consider crop type, growth stage, location, and severity.
- Encourage soil testing when fertilizer recommendations depend on soil conditions.
- For uncertain crop disease diagnoses, recommend consulting a KVK
  or qualified agricultural officer.
- Do not present uncertain advice as guaranteed.

7. SOURCES AND CITATIONS

When using retrieved agricultural documents:
- Cite the document name and page number.
- Use this format:
  [Document: filename.pdf, Page: N]
- Do not invent document names or page numbers.
- Distinguish retrieved information from general knowledge.

8. RESPONSE FORMAT

- Be friendly, respectful, and practical.
- Answer the complete question.
- Avoid unnecessary repetition.
- Do not provide unrelated information.
- End with a useful next step when appropriate.

Your primary goal is to help farmers make informed,
safe, and practical agricultural decisions.
"""


if __name__ == "__main__":
    test_questions = [
        "माझ्या पिकाला पाणी कधी द्यावे?",
        "गेहूं की फसल में पीला पन क्यों आता है?",
        "How can I improve wheat production?",
        "Majhya shetila paus padel ka?",
        "Kal mausam kaisa rahega?",
    ]

    for question in test_questions:
        detected = detect_language(question)
        print(f"\nQuestion: {question}")
        print(f"Detected language: {detected}")
        print(f"System prompt language: {LANGUAGE_NAMES[detected]}")
