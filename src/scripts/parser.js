class WordParser {
  parse(content) {
    const words = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^letter\s+\w+:?$/i.test(trimmed)) continue;

      const match = trimmed.match(/^\*{1,2}(.+?)\s*(?:->|[-–—]+)\s*(.+)\s*\(([^()]+)\)\s*$/);
      if (match) {
        words.push({
          english: match[1].trim(),
          armenian: match[2].trim(),
          example: match[3].trim(),
        });
      }
    }

    return words;
  }
}

const wordParser = new WordParser();
