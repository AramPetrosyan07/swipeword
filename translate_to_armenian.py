import json
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from deep_translator import GoogleTranslator

def main():
    with open('verb.json', 'r', encoding='utf-8') as f:
        verbs = json.load(f)

    translator = GoogleTranslator(source='en', target='hy')
    total = len(verbs)
    success = 0

    for i, entry in enumerate(verbs):
        if entry.get('armenian'):
            print(f"[{i+1}/{total}] SKIP: {entry['english']}")
            continue

        text = entry['english'].lower()
        try:
            translation = translator.translate(text)
            entry['armenian'] = translation
            success += 1
            print(f"[{i+1}/{total}] {entry['english']} -> {translation}")
        except Exception as e:
            print(f"[{i+1}/{total}] FAIL {entry['english']}: {e}")
            entry['armenian'] = ''
        time.sleep(0.2)

    with open('verb.json', 'w', encoding='utf-8') as f:
        json.dump(verbs, f, ensure_ascii=False, indent=2)

    print(f"\nDone! {success}/{total} translated successfully.")

if __name__ == '__main__':
    main()
