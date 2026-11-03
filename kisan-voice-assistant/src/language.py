"""Language detection and localized system prompts for Kisan Voice Assistant."""

import re
from typing import Literal

LanguageCode = Literal["mr", "hi", "en"]

LANGUAGE_NAMES = {
    "mr": "मराठी (Marathi)",
    "hi": "हिंदी (Hindi)",
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


def detect_language(text: str) -> LanguageCode:
    """Detect language between Marathi, Hindi, and English (including transliterated roman script)."""
    text_clean = text.strip()
    if not text_clean:
        return "mr"

    devanagari_chars = re.findall(r"[\u0900-\u097F]", text_clean)
    devanagari_ratio = len(devanagari_chars) / max(len(text_clean), 1)

    # Devanagari script analysis
    if devanagari_ratio > 0.2:
        # Characteristic Marathi words / suffixes
        marathi_markers = r"\b(आहे|नाही|काय|कसा|कसे|करावं|कधी|मध्ये|साठी|पाहिजे|पडेल|भाव|दर|ऊस|द्राक्ष|कांदा|पाऊस|पिक|शेती|हप्ता|सांगा|कळवा|पाहू|झाला|केला)\b|[\u0900-\u097F]+(च्या|चे|चा|ची|त|ला|ना|नी|हून|वर|कडे)"
        if re.search(marathi_markers, text_clean):
            return "mr"

        hindi_markers = r"\b(है|हैं|था|थी|होगा|क्या|कैसे|कब|कहाँ|कीजिए|मिलेगा|बारिश|मौसम|फसल|खाद|दाम|योजना|बताओ|बताइए)\b"
        if re.search(hindi_markers, text_clean):
            return "hi"

        if "ळ" in text_clean:
            return "mr"

        return "mr"

    # Transliterated Marathi (Latin characters)
    marathi_latin = r"\b(madhe|aaj|bhav|kay|aahe|ani|udya|paus|padel|ka|sugarcane|pika|sheti|shete|karava|tambera|chikta|dar|kiti)\b"
    if re.search(marathi_latin, text_clean, re.IGNORECASE):
        return "mr"

    # Transliterated Hindi
    hindi_latin = r"\b(kya|kaise|hoga|baarish|daam|mandi|bhav|milega|kisan|kripya)\b"
    if re.search(hindi_latin, text_clean, re.IGNORECASE):
        return "hi"

    return "en"


def get_system_prompt(lang: LanguageCode) -> str:
    """Generate structured system prompt enforcing farmer conversational guidelines."""
    base = """You are "Kisan Voice Assistant" (किसान व्हॉइस सहाय्यक / किसान वॉइस सहायक), an empathetic, truthful AI assistant for Indian farmers.

CORE OPERATIONAL RULES:
1. MAX 3-4 SENTENCES: Answers MUST be short, clear, and direct because they are spoken aloud to the farmer over voice TTS.
2. STRICT LANGUAGE MATCH: Always reply in the EXACT SAME language used by the farmer.
3. NEVER INVENT DATA:
   - If weather or mandi price is not returned by tools, state that current data is unavailable.
   - If pest or crop advice is not in the retrieved documents, say "I don't know" or advise contacting the nearest Krishi Vigyan Kendra (KVK).
   - Never fabricate chemical dosage or prices.
4. MANDATORY CITATIONS: Whenever using crop advisories or government schemes, always cite the source and page number in this exact format: [Document: filename.pdf, Page: N].
5. SAFETY FIRST: Never suggest untested chemicals. Direct uncertain farmers to the local agricultural officer."""

    if lang == "mr":
        return f"{base}\n\nतुम्ही शेतकऱ्याशी संवाद साधत आहात. उत्तर नेहमी शुद्ध, सोप्या व आदरायुक्त मराठीत द्या. बोलताना अतिशय स्पष्ट व ३ ते ४ वाक्यांत बोला."
    elif lang == "hi":
        return f"{base}\n\nआप किसान भाई से बात कर रहे हैं। उत्तर हमेशा सरल एवं स्पष्ट हिंदी में दें। अधिक से अधिक ३-४ वाक्यों में सहज उत्तर दें।"
    else:
        return f"{base}\n\nDeliver short, concise, and helpful agricultural answers in English (max 3-4 sentences)."
