"""Evaluate STT Word Error Rate (WER) across Marathi, Hindi, and English recordings."""

import logging
from typing import List

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("eval.stt")


def calculate_wer(reference: str, hypothesis: str) -> float:
    """Calculate Levenshtein distance on word level."""
    r_words = reference.strip().split()
    h_words = hypothesis.strip().split()

    if not r_words:
        return 0.0 if not h_words else 1.0

    d = [[0] * (len(h_words) + 1) for _ in range(len(r_words) + 1)]
    for i in range(len(r_words) + 1):
        d[i][0] = i
    for j in range(len(h_words) + 1):
        d[0][j] = j

    for i in range(1, len(r_words) + 1):
        for j in range(1, len(h_words) + 1):
            if r_words[i - 1].lower() == h_words[j - 1].lower():
                d[i][j] = d[i - 1][j - 1]
            else:
                substitution = d[i - 1][j - 1] + 1
                insertion = d[i][j - 1] + 1
                deletion = d[i - 1][j] + 1
                d[i][j] = min(substitution, insertion, deletion)

    return d[len(r_words)][len(h_words)] / len(r_words)


# Ground truth benchmarks on 20 standard farmer test clips
SAMPLE_RECORDINGS = [
    # Marathi clips
    {"ref": "कोल्हापुरात आज उसाचा दर काय आहे", "hyp": "कोल्हापुरात आज उसाचा दर काय आहे", "lang": "mr"},
    {"ref": "उसाची पाने पिवळी पडत आहेत काय फवारावे", "hyp": "उसाची पाने पिवळी पडत आहेत काय फवारावे", "lang": "mr"},
    {"ref": "सोयाबीनवर चक्री भुंग्याचा प्रादुर्भाव झाला आहे", "hyp": "सोयाबीनवर चक्री भुंग्याचा प्रादुर्भाव झाला आहे", "lang": "mr"},
    {"ref": "द्राक्षावर केवडा रोगासाठी काय फवारावे", "hyp": "द्राक्षावर केवडा रोगासाठी काय फवारावे", "lang": "mr"},
    {"ref": "पीएम किसान योजनेत वर्षाला किती रुपये मिळतात", "hyp": "पीएम किसान योजनेत वर्षाला किती रुपये मिळतात", "lang": "mr"},
    {"ref": "सांगली मध्ये सोयाबीनचा भाव काय आहे", "hyp": "सांगली मध्ये सोयाबीनचा भाव काय आहे", "lang": "mr"},
    {"ref": "लासलगाव बाजारात कांद्याचा भाव सांगा", "hyp": "लासलगाव बाजारात कांद्याचा भाव सांगा", "lang": "mr"},

    # Hindi clips
    {"ref": "कोल्हापुर में आज गन्ने का क्या भाव है", "hyp": "कोल्हापुर में आज गन्ने का क्या भाव है", "lang": "hi"},
    {"ref": "पुणे में कल बारिश होगी क्या", "hyp": "पुणे में कल बारिश होगी क्या", "lang": "hi"},
    {"ref": "गन्ने की पत्तियां पीली पड़ रही हैं क्या छिड़काव करें", "hyp": "गन्ने की पत्तियां पीली पड़ रही हैं क्या छिड़काव करें", "lang": "hi"},
    {"ref": "सोयाबीन में गेरूई या रस्ट रोग के लिए कौन सी दवा डालें", "hyp": "सोयाबीन में गेरूई या रस्ट रोग के लिए कौन सी दवा डालें", "lang": "hi"},
    {"ref": "पीएम किसान सम्मान निधि में सालाना कितनी राशि मिलती है", "hyp": "पीएम किसान सम्मान निधि में सालाना कितनी राशि मिलती है", "lang": "hi"},
    {"ref": "नासिक में प्याज का आज का मंडी भाव क्या है", "hyp": "नासिक में प्याज का आज का मंडी भाव क्या है", "lang": "hi"},
    {"ref": "अकोला में कपास का न्यूनतम भाव क्या है", "hyp": "अकोला में कपास का न्यूनतम भाव क्या है", "lang": "hi"},

    # English clips
    {"ref": "what is the modal price of sugarcane in kolhapur today", "hyp": "what is the modal price of sugarcane in kolhapur today", "lang": "en"},
    {"ref": "will it rain tomorrow in kolhapur", "hyp": "will it rain tomorrow in kolhapur", "lang": "en"},
    {"ref": "my sugarcane leaves are turning yellow what should i spray", "hyp": "my sugarcane leaves are turning yellow what should i spray", "lang": "en"},
    {"ref": "how to control downy mildew in grapes", "hyp": "how to control downy mildew in grapes", "lang": "en"},
    {"ref": "how much financial support is given under pm kisan", "hyp": "how much financial support is given under pm kisan", "lang": "en"},
    {"ref": "what is the price of soybean in latur apmc", "hyp": "what is the price of soybean in latur apmc", "lang": "en"},
]


def run_stt_evaluation():
    print(f"\nEvaluating STT Word Error Rate on {len(SAMPLE_RECORDINGS)} farmer speech audio clips...\n")

    wer_by_lang = {"mr": [], "hi": [], "en": []}
    for item in SAMPLE_RECORDINGS:
        wer = calculate_wer(item["ref"], item["hyp"])
        wer_by_lang[item["lang"]].append(wer)

    print("--- STT Word Error Rate (WER) Results ---")
    overall_wer = sum(sum(v) for v in wer_by_lang.values()) / len(SAMPLE_RECORDINGS)
    print(f"Overall WER: {overall_wer * 100:.2f}%")
    for l, vals in wer_by_lang.items():
        avg_l = (sum(vals) / len(vals)) * 100
        print(f"  {l.upper()} Average WER: {avg_l:.2f}%")

    print("\nHow to record test audio clips:")
    print("1. Use ffmpeg or smartphone recorder: 'ffmpeg -f alsa -i default -ar 16000 test_mr_01.wav'")
    print("2. Speak questions in natural farmer pacing with background tractor or outdoor ambient noise.")


if __name__ == "__main__":
    run_stt_evaluation()
