class TTS {
  speak(text, lang) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'en-US';
    if (lang && lang.startsWith('hy')) {
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('hy'));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.7;
    } else {
      utterance.rate = 0.9;
    }
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

const tts = new TTS();
