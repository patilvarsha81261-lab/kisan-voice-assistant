"""Speech-to-Text module using faster-whisper with language auto-detection."""

import logging
from pathlib import Path
from typing import Any, Dict, Optional
from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("stt")


class SpeechToTextEngine:
    """Transcribes audio using faster-whisper with multilingual support."""

    def __init__(self, model_size: str = settings.WHISPER_MODEL_SIZE, device: str = settings.DEVICE):
        self.model_size = model_size
        self.device = device
        self._model = None

    def _load_model(self):
        """Lazy load faster-whisper model."""
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info(f"Loading faster-whisper model '{self.model_size}' on {self.device}...")
                compute_type = "float16" if self.device == "cuda" else "int8"
                self._model = WhisperModel(self.model_size, device=self.device, compute_type=compute_type)
            except Exception as e:
                logger.error(f"Failed to load faster-whisper model: {e}")
                self._model = None

    def transcribe(self, audio_path: str | Path) -> Dict[str, Any]:
        """Transcribe an audio file, detecting language between Marathi, Hindi, and English.

        Args:
            audio_path: Path to the input audio recording (wav, mp3, ogg, webm).

        Returns:
            Dictionary with 'text', 'language', 'confidence', and 'success' status.
        """
        path_obj = Path(audio_path)
        if not path_obj.exists() or path_obj.stat().st_size == 0:
            return {
                "success": False,
                "text": "",
                "language": "mr",
                "confidence": 0.0,
                "error": "रिकॉर्डिंग आवाज मिळाला नाही, कृपया पुन्हा बोला. (No audio captured, please speak again.)",
            }

        self._load_model()
        if self._model is None:
            return {
                "success": False,
                "text": "",
                "language": "mr",
                "confidence": 0.0,
                "error": "STT model unavailable on this device.",
            }

        try:
            segments, info = self._model.transcribe(
                str(path_obj),
                beam_size=5,
                language=None,  # Auto-detect language
                task="transcribe",
                vad_filter=True,  # Voice Activity Detection to filter background noise
            )

            text_parts = [seg.text.strip() for seg in segments if seg.text.strip()]
            full_text = " ".join(text_parts).strip()

            if not full_text:
                return {
                    "success": False,
                    "text": "",
                    "language": info.language or "mr",
                    "confidence": 0.0,
                    "error": "आवाज स्पष्ट ऐकू आला नाही, कृपया पुन्हा बोला. (Speech was not clear, please repeat.)",
                }

            # Map whisper language code to supported set
            detected_lang = info.language
            if detected_lang not in ("mr", "hi", "en"):
                detected_lang = "mr"

            return {
                "success": True,
                "text": full_text,
                "language": detected_lang,
                "confidence": round(float(info.language_probability), 4),
            }

        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            return {
                "success": False,
                "text": "",
                "language": "mr",
                "confidence": 0.0,
                "error": f"ऑडिओ प्रक्रियेमध्ये त्रुटी: {str(e)}",
            }
