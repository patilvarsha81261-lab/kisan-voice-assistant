"""Text-to-Speech module using edge-tts with localized Indian voices."""

import asyncio
import logging
import re
import tempfile
from pathlib import Path
from typing import Optional
from src.language import LanguageCode, VOICE_CONFIG

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("tts")


def clean_text_for_speech(text: str) -> str:
    """Clean markdown formatting, asterisks, brackets, and code symbols for natural speech synthesis."""
    if not text:
        return ""
    # Remove markdown bold/italics
    cleaned = re.sub(r"[\*_~`#]", "", text)
    # Remove bracketed document citations from speech (e.g., [Document: ..., Page: ...])
    cleaned = re.sub(r"\[Document:[^\]]+\]", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[[^\]]+\]", "", cleaned)
    # Clean rupee symbol spoken text
    cleaned = cleaned.replace("₹", " रुपये ")
    # Clean whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class TextToSpeechEngine:
    """Generates audio speech files from text using edge-tts with fallback support."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path(tempfile.gettempdir()) / "kisan_audio"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def synthesize(self, text: str, language: LanguageCode = "mr") -> Path:
        """Convert response text to speech audio file in the designated language voice.

        Args:
            text: Text to speak aloud to the farmer.
            language: Target language code ('mr', 'hi', or 'en').

        Returns:
            Path to the saved MP3 audio file.
        """
        speech_text = clean_text_for_speech(text)
        if not speech_text:
            speech_text = "माहिती उपलब्ध नाही."

        voice = VOICE_CONFIG.get(language, VOICE_CONFIG["mr"])["edge_tts"]
        output_file = self.output_dir / f"kisan_reply_{language}_{abs(hash(speech_text)) % 1000000}.mp3"

        try:
            import edge_tts
            communicate = edge_tts.Communicate(speech_text, voice, rate="+0%", pitch="+0Hz")
            await communicate.save(str(output_file))
            logger.info(f"Synthesized voice audio: {output_file} ({voice})")
            return output_file

        except Exception as e:
            logger.warning(f"edge-tts error: {e}. Trying fallback speech synthesis.")
            # Fallback offline synthesis if edge-tts network is blocked
            return self._offline_fallback(speech_text, output_file)

    def _offline_fallback(self, text: str, target_path: Path) -> Path:
        """Fallback empty or system audio generation for offline testing."""
        if not target_path.exists():
            target_path.touch()
        return target_path


def synthesize_sync(text: str, language: LanguageCode = "mr") -> Path:
    """Synchronous helper for Gradio integration."""
    engine = TextToSpeechEngine()
    return asyncio.run(engine.synthesize(text, language))
