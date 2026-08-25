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
    if (short === 'hy') {
      utterance.rate = 0.7;
    } else {
      utterance.rate = 0.9;
    }
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

const tts = new TTS();
