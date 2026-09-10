"""
Geotechnical Natural Language Processing & Crowdsource Hazard Filter.

Utilizes Hugging Face transformers pipeline with `google/flan-t5-base`
to parse unstructured citizen SOS reports (e.g. 'muddy springs', 'leaning trees',
'tension crack behind road'), classifying genuine morphological slope instability
signals while filtering out spam, commercial noise, and irrelevant chatter.
"""

import re
import asyncio
import logging
from typing import Tuple, Dict, Any

from ..core.config import settings

logger = logging.getLogger("landslide_sentinel.nlp")


class GeotechnicalNLPClassifier:
    def __init__(self, model_name: str = settings.NLP_MODEL_NAME):
        self.model_name = model_name
        self.pipeline = None
        self._is_initialized = False

        # Geotechnical domain keywords & morphological taxonomy (USGS/BGS landslide criteria)
        self.hazard_lexicon = {
            "HYDROLOGICAL_ANOMALY": [
                "muddy spring", "turbid water", "muddy water", "sudden seepage",
                "water bubbling", "clogged drainage", "perched pond", "wet slope toe",
                "seeping from bank", "dirty spring", "brown runoff", "spring drying"
            ],
            "SLOPE_DEFORMATION": [
                "leaning tree", "tilting tree", "tilted pole", "leaning poles",
                "fence displacement", "tension crack", "ground crack", "fissure",
                "hummock", "bulge in soil", "sunken road", "pavement buckle",
                "retaining wall crack", "stair crack", "door jamming", "foundation shifting"
            ],
            "ACTIVE_MASS_MOVEMENT": [
                "rockfall", "falling rocks", "rolling boulder", "rumbling sound",
                "mudslide", "soil creep", "debris flow", "earth slump",
                "ground rumbling", "slope sliding", "landslide", "falling boulders"
            ]
        }

        # Clear spam/irrelevant indicator patterns
        self.spam_patterns = [
            r"https?://\S+", r"www\.\S+", r"\b(sale|crypto|discount|casino|shoes|follow me|subscribe|porn|viagra|buy now)\b"
        ]

    def load_pipeline(self) -> bool:
        """
        Attempts to load the Hugging Face Seq2Seq pipeline with flan-t5-base.
        Gracefully falls back to the deterministic geotechnical parser if PyTorch is unavailable.
        """
        if self._is_initialized:
            return True

        try:
            from transformers import pipeline
            logger.info(f"Loading Hugging Face model pipeline for {self.model_name}...")
            self.pipeline = pipeline(
                "text2text-generation",
                model=self.model_name,
                max_new_tokens=32,
                device=-1  # CPU default
            )
            self._is_initialized = True
            logger.info(f"Hugging Face {self.model_name} pipeline initialized successfully.")
            return True
        except Exception as e:
            logger.warning(
                f"Hugging Face model {self.model_name} could not be loaded ({e}). "
                "Engaging high-accuracy Geotechnical Semantic Lexicon Fallback."
            )
            self._is_initialized = False
            return False

    def _lexicon_heuristic_classify(self, text: str) -> Tuple[bool, float, str]:
        """Deterministic geotechnical rule-based parser matching USGS/BGS landslide criteria."""
        clean_text = text.lower().strip()

        # Check for explicit spam patterns
        for pat in self.spam_patterns:
            if re.search(pat, clean_text):
                return False, 0.98, "SPAM_IRRELEVANT"

        matched_category = None
        match_score = 0.0

        for category, terms in self.hazard_lexicon.items():
            for term in terms:
                if term in clean_text:
                    matched_category = category
                    match_score += 0.45

        if matched_category and match_score >= 0.40:
            confidence = min(0.99, round(0.70 + match_score * 0.25, 3))
            return True, confidence, matched_category

        # If too short or no geotechnical indicator
        if len(clean_text.split()) < 3:
            return False, 0.85, "SPAM_IRRELEVANT"

        return False, 0.75, "SPAM_IRRELEVANT"

    async def classify_report(self, text: str) -> Dict[str, Any]:
        """Non-blocking classification of incoming citizen SOS report."""
        return await asyncio.to_thread(self._sync_classify, text)

    def _sync_classify(self, text: str) -> Dict[str, Any]:
        """Synchronous execution of NLP pipeline and heuristic cross-check."""
        # 1. Quick regex filter for spam
        for pat in self.spam_patterns:
            if re.search(pat, text.lower()):
                return {
                    "is_valid_hazard": False,
                    "is_spam": True,
                    "confidence": 0.99,
                    "category": "SPAM_IRRELEVANT",
                    "classifier_engine": "regex_prefilter"
                }

        # 2. Heuristic domain taxonomy check
        lex_is_valid, lex_conf, lex_cat = self._lexicon_heuristic_classify(text)

        # 3. Model inference via Flan-T5 if loaded
        if self.pipeline is not None:
            try:
                prompt = (
                    "Task: Classify whether the following emergency citizen message is a genuine "
                    "geotechnical landslide hazard precursor (e.g. muddy springs, tension cracks, "
                    "leaning trees, falling stones, slope bulging) or if it is spam/irrelevant chatter.\n\n"
                    f"Message: \"{text}\"\n\n"
                    "Respond ONLY with either 'GEOTECHNICAL_HAZARD' or 'SPAM_IRRELEVANT'."
                )
                outputs = self.pipeline(prompt)
                generated = outputs[0]["generated_text"].strip().upper()

                if "GEOTECHNICAL_HAZARD" in generated or "HAZARD" in generated:
                    return {
                        "is_valid_hazard": True,
                        "is_spam": False,
                        "confidence": max(0.85, lex_conf),
                        "category": lex_cat if lex_cat != "SPAM_IRRELEVANT" else "UNSPECIFIED_SLOPE_HAZARD",
                        "classifier_engine": "flan_t5_seq2seq"
                    }
                else:
                    if lex_is_valid:
                        return {
                            "is_valid_hazard": True,
                            "is_spam": False,
                            "confidence": 0.75,
                            "category": lex_cat,
                            "classifier_engine": "ensemble_flan_t5_lexicon"
                        }
                    return {
                        "is_valid_hazard": False,
                        "is_spam": True,
                        "confidence": 0.88,
                        "category": "SPAM_IRRELEVANT",
                        "classifier_engine": "flan_t5_seq2seq"
                    }
            except Exception as e:
                logger.error(f"Inference error in Flan-T5: {e}. Defaulting to geotechnical lexicon.")

        # Default to lexicon result if model pipeline is not loaded
        return {
            "is_valid_hazard": lex_is_valid,
            "is_spam": not lex_is_valid,
            "confidence": lex_conf,
            "category": lex_cat,
            "classifier_engine": "geotechnical_lexicon_fallback"
        }


nlp_classifier = GeotechnicalNLPClassifier()
