class TTS {
  speak(text, lang) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'en-US';
    const short = (lang || '').split('-')[0].toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(short));
    if (matched) utterance.voice = matched;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

const tts = new TTS();
