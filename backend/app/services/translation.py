"""
Translation service for converting Sinhala text to English using Google Cloud Translation API
"""
import os
from typing import Optional, Tuple
from google.cloud import translate_v2 as translate
from app.core.config import settings

# Initialize translation client
translate_client = None
try:
    # Check for credentials
    if settings.GOOGLE_CLOUD_CREDENTIALS_PATH and os.path.exists(settings.GOOGLE_CLOUD_CREDENTIALS_PATH):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_CLOUD_CREDENTIALS_PATH
        translate_client = translate.Client()
    elif os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        translate_client = translate.Client()
except Exception as e:
    print(f"Translation client initialization failed: {e}")


def detect_language(text: str) -> Optional[str]:
    """
    Detect the language of the given text
    Returns language code (e.g., 'si' for Sinhala, 'en' for English)
    """
    if not translate_client:
        return None
    
    try:
        # Clean and prepare text for detection
        text_sample = text.strip()[:1000]  # Use first 1000 chars for detection
        if not text_sample:
            return None
            
        result = translate_client.detect_language(text_sample)
        return result['language']
    except Exception as e:
        print(f"Language detection error: {e}")
        return None


def translate_text(text: str, target_language: str = 'en', source_language: str = None) -> Tuple[str, bool]:
    """
    Translate text to target language
    
    Args:
        text: Text to translate
        target_language: Target language code (default: 'en' for English)
        source_language: Source language code (optional, will auto-detect if None)
    
    Returns:
        Tuple of (translated_text, was_translated)
    """
    if not translate_client:
        return text, False
    
    try:
        # Clean text
        text = text.strip()
        if not text:
            return text, False
        
        # Detect source language if not provided
        if not source_language:
            detected_lang = detect_language(text)
            if detected_lang == target_language:
                # Already in target language
                return text, False
            source_language = detected_lang
        
        # Translate if source is different from target
        if source_language and source_language != target_language:
            result = translate_client.translate(
                text,
                target_language=target_language,
                source_language=source_language
            )
            return result['translatedText'], True
        else:
            return text, False
            
    except Exception as e:
        print(f"Translation error: {e}")
        return text, False


def translate_sinhala_to_english(text: str) -> Tuple[str, bool]:
    """
    Convenience function to translate Sinhala text to English
    
    Returns:
        Tuple of (translated_text, was_translated)
    """
    return translate_text(text, target_language='en', source_language='si')


def process_mixed_language_text(text: str) -> Tuple[str, str]:
    """
    Process text that might contain mixed languages (Sinhala and English)
    
    Returns:
        Tuple of (processed_text_in_english, detected_languages)
    """
    if not translate_client:
        return text, "unknown"
    
    try:
        # Split text into paragraphs for better processing
        paragraphs = text.split('\n\n')
        processed_paragraphs = []
        detected_languages = set()
        
        for paragraph in paragraphs:
            if paragraph.strip():
                # Detect language for this paragraph
                lang = detect_language(paragraph)
                if lang:
                    detected_languages.add(lang)
                
                # Translate if needed
                if lang == 'si':  # Sinhala
                    translated, was_translated = translate_text(paragraph, 'en', 'si')
                    processed_paragraphs.append(translated)
                else:
                    processed_paragraphs.append(paragraph)
            else:
                processed_paragraphs.append(paragraph)
        
        processed_text = '\n\n'.join(processed_paragraphs)
        languages_str = ', '.join(sorted(detected_languages)) if detected_languages else "unknown"
        
        return processed_text, languages_str
        
    except Exception as e:
        print(f"Mixed language processing error: {e}")
        return text, "error"


def is_translation_available() -> bool:
    """
    Check if translation service is available
    """
    return translate_client is not None