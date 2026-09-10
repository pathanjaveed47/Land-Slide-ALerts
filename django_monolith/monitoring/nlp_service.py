"""
Hugging Face NLP Pipeline for Citizen SOS Incident Filtering.

Uses google/flan-t5-base seq2seq prompt classification to evaluate citizen SOS reports,
detecting authentic morphological landslide indicators while filtering out spam and chatter.
"""

import re
import logging
from typing import Dict, Any

logger = logging.getLogger("monitoring.nlp_service")


class GeotechnicalNLPFilter:
    def __init__(self, model_name: str = "google/flan-t5-base"):
        self.model_name = model_name
        self.pipeline = None
        self._is_loaded = False

        # Geotechnical domain morphological lexicon
        self.hazard_lexicon = {
            "HYDROLOGICAL_ANOMALY": [
                "muddy spring", "turbid water", "muddy water", "sudden seepage",
                "water bubbling", "clogged drainage", "dirty spring", "seepage at toe"
            ],
            "SLOPE_DEFORMATION": [
                "leaning tree", "tilting tree", "tilted pole", "leaning poles",
                "tension crack", "ground crack", "fissure", "bulging ground",
                "sunken road", "buckling pavement", "retaining wall crack"
            ],
            "ACTIVE_MASS_MOVEMENT": [
                "rockfall", "falling rock", "boulder rolling", "rumbling sound",
                "mudslide", "soil creep", "debris flow", "landslide"
            ]
        }

        self.spam_patterns = [
            r"https?://\S+", r"www\.\S+",
            r"\b(discount|sale|crypto|casino|shoes|subscribe|follow me|viagra|porn)\b"
        ]

    def _lazy_load_pipeline(self):
        """Attempts to load Hugging Face pipeline if PyTorch and weights are ready."""
        if self._is_loaded:
            return
        try:
            from transformers import pipeline
            logger.info(f"Loading Hugging Face model {self.model_name}...")
            self.pipeline = pipeline(
                "text2text-generation",
                model=self.model_name,
                max_new_tokens=32,
                device=-1
            )
            self._is_loaded = True
            logger.info("Hugging Face Flan-T5 pipeline initialized.")
        except Exception as e:
            logger.warning(f"Flan-T5 model loading deferred: {e}. Fallback lexicon active.")
            self._is_loaded = False

    def evaluate_sos_text(self, text: str) -> Dict[str, Any]:
        """
        Classifies citizen SOS text into:
        - is_spam: bool
        - spam_confidence: float (0.0 to 1.0)
        - detected_category: str
        """
        clean_text = text.lower().strip()

        # 1. Regex Spam Filtering
        for pat in self.spam_patterns:
            if re.search(pat, clean_text):
                return {
                    "is_spam": True,
                    "spam_confidence": 0.99,
                    "detected_category": "SPAM_PROMOTION"
                }

        # 2. Geotechnical Lexicon Match
        matched_category = None
        for category, keywords in self.hazard_lexicon.items():
            for kw in keywords:
                if kw in clean_text:
                    matched_category = category
                    break
            if matched_category:
                break

        # 3. Model Inference via Flan-T5 if initialized
        self._lazy_load_pipeline()
        if self.pipeline is not None:
            try:
                prompt = (
                    "Classify whether the following emergency report is a genuine landslide hazard "
                    f"precursor or spam/irrelevant:\n\"{text}\"\n"
                    "Answer only 'HAZARD' or 'SPAM':"
                )
                res = self.pipeline(prompt)[0]["generated_text"].strip().upper()
                if "HAZARD" in res:
                    return {
                        "is_spam": False,
                        "spam_confidence": 0.10,
                        "detected_category": matched_category or "GEOTECHNICAL_HAZARD"
                    }
                else:
                    if matched_category:  # Model said spam, but known geotechnical keyword present
                        return {
                            "is_spam": False,
                            "spam_confidence": 0.35,
                            "detected_category": matched_category
                        }
                    return {
                        "is_spam": True,
                        "spam_confidence": 0.85,
                        "detected_category": "IRRELEVANT_CHAT"
                    }
            except Exception as e:
                logger.error(f"Flan-T5 inference failed: {e}")

        # Lexicon Heuristic Decision
        if matched_category:
            return {
                "is_spam": False,
                "spam_confidence": 0.15,
                "detected_category": matched_category
            }

        # If too short or lacking hazard indicators
        if len(clean_text.split()) < 3:
            return {
                "is_spam": True,
                "spam_confidence": 0.80,
                "detected_category": "NOISE"
            }

        return {
            "is_spam": True,
            "spam_confidence": 0.70,
            "detected_category": "IRRELEVANT_CHAT"
        }


nlp_filter = GeotechnicalNLPFilter()
