class WordWrapper {
  static wrap(text, options = {}) {
    const { className = 'rw-word', contextSentences = false } = options;
    if (!text) return '';
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs.map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      const wrapped = trimmed.replace(
        /(\b[\w']+\b)/g,
        `<span class="${className}" data-word="$1">$1</span>`
      );
      return `<p>${wrapped}</p>`;
    }).join('');
  }

  static getSentenceForWord(text, word, range = 80) {
    if (!text || !word) return '';
    const idx = text.toLowerCase().indexOf(word.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - range);
    const end = Math.min(text.length, idx + word.length + range);
    let sentence = text.slice(start, end);
    if (start > 0) sentence = '...' + sentence;
    if (end < text.length) sentence = sentence + '...';
    return sentence;
  }
}
