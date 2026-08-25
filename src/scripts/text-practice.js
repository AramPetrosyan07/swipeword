const TEXT_PRACTICE_EXERCISES = [
  {
    id: 'dog-and-cat',
    title: 'Շունն ու կատուն',
    paragraphs: [
      [
        ['Մի ', { answer: 'շուն' }, ' ու մի ', { answer: 'կատու' }],
        ['Մի տան մեջ էին ', { answer: 'ապրում' }, ','],
        ['Մեկը մյուսին չէր ', { answer: 'սիրում' }, ','],
        ['Միշտ կռվում ու հաչում էին։'],
      ],
      [
        ['Շունը կատվի վրա էր ', { answer: 'գոռում' }, ','],
        ['Կատուն շնից էր ', { answer: 'փախչում' }, ','],
        ['Եվ այդպես ամեն օր'],
        ['Նրանք կռվում էին։'],
      ],
    ],
  },
];

class TextPractice {
  constructor() {
    this.exercise = TEXT_PRACTICE_EXERCISES[0];
    this.words = [];
    this.placed = [];
    this.evaluated = false;
    this._drag = null;
  }

  init() {
    this.textEl = document.getElementById('tpText');
    this.bankEl = document.getElementById('tpBank');
    if (!this.textEl) return;

    document.getElementById('tpTitle').textContent = this.exercise.title;
    document.getElementById('btnTpDone').addEventListener('click', () => this.evaluate());
    document.getElementById('btnTpRetry').addEventListener('click', () => this.reset());
    document.getElementById('btnTpBack').addEventListener('click', () => {
      const back = document.getElementById('btnReaderBack');
      if (back) back.click();
    });

    this._bindBankDrop();
    this.reset();
  }

  reset() {
    this.evaluated = false;
    this._drag = null;
    this.words = [];
    this.placed = [];
    let id = 0;
    this.exercise.paragraphs.forEach((lines) => {
      lines.forEach((segments) => {
        segments.forEach((seg) => {
          if (typeof seg !== 'string') {
            this.words.push({ id: id++, text: seg.answer });
          }
        });
      });
    });
    this.placed = new Array(this.words.length).fill(null);
    this._bankOrder = this._shuffle(this.words.map((w) => w.id));

    this._buildText();
    this._update();
  }

  evaluate() {
    if (this.evaluated || this.placed.some((w) => w === null)) return;
    this.evaluated = true;

    const slotEls = this.textEl.querySelectorAll('.tp-slot');
    let correct = 0;
    slotEls.forEach((el, i) => {
      const ok = this.words[this.placed[i]].text === this.words[i].text;
      el.classList.remove('filled');
      el.classList.add(ok ? 'tp-correct' : 'tp-wrong');
      if (ok) correct++;
    });

    const total = this.words.length;
    const pct = Math.round((correct / total) * 100);
    document.getElementById('tpResultScore').textContent = `${correct} / ${total}`;
    document.getElementById('tpResultCorrect').textContent = correct;
    document.getElementById('tpResultWrong').textContent = total - correct;
    document.getElementById('tpResultPct').textContent = `${pct}%`;
    document.getElementById('tpDoneBar').style.display = 'none';
    document.getElementById('tpResult').style.display = '';
    this._update();
  }

  _buildText() {
    this.textEl.innerHTML = '';
    let gapIndex = 0;
    this.exercise.paragraphs.forEach((lines, pIdx) => {
      const stanza = document.createElement('div');
      stanza.className = 'tp-stanza';
      lines.forEach((segments) => {
        const lineEl = document.createElement('p');
        lineEl.className = 'tp-line';
        segments.forEach((seg) => {
          if (typeof seg === 'string') {
            lineEl.appendChild(document.createTextNode(seg));
          } else {
            const slot = document.createElement('span');
            slot.className = 'tp-slot';
            slot.dataset.slot = gapIndex++;
            slot.style.minWidth = `${Math.max(3.5, seg.answer.length * 0.68)}em`;
            this._bindSlot(slot);
            lineEl.appendChild(slot);
          }
        });
        stanza.appendChild(lineEl);
      });
      this.textEl.appendChild(stanza);
    });
  }

  _bindSlot(slot) {
    slot.addEventListener('dragover', (e) => {
      if (this.evaluated) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      if (this.evaluated || !this._drag) return;
      this._place(this._drag.wordId, this._drag.fromSlot, parseInt(slot.dataset.slot, 10));
      this._drag = null;
    });
    slot.addEventListener('click', () => {
      if (this.evaluated) return;
      const i = parseInt(slot.dataset.slot, 10);
      if (this.placed[i] !== null) this._removeFromSlot(i);
    });
  }

  _bindBankDrop() {
    this.bankEl.addEventListener('dragover', (e) => {
      if (this.evaluated || !this._drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.bankEl.classList.add('drag-over');
    });
    this.bankEl.addEventListener('dragleave', () => this.bankEl.classList.remove('drag-over'));
    this.bankEl.addEventListener('drop', (e) => {
      e.preventDefault();
      this.bankEl.classList.remove('drag-over');
      if (this.evaluated || !this._drag) return;
      if (this._drag.fromSlot !== null) this._removeFromSlot(this._drag.fromSlot);
      this._drag = null;
    });
  }

  _place(wordId, fromSlot, targetSlot) {
    if (fromSlot === targetSlot) {
      this._update();
      return;
    }
    const occupant = this.placed[targetSlot];
    this.placed[targetSlot] = wordId;
    if (fromSlot !== null) {
      this.placed[fromSlot] = null;
    } else {
      const bankIdx = this._bankOrder.indexOf(wordId);
      if (bankIdx >= 0) this._bankOrder.splice(bankIdx, 1);
    }
    if (occupant !== null) {
      const bankIdx = this._bankOrder.indexOf(occupant);
      this._bankOrder.splice(bankIdx >= 0 ? bankIdx : this._bankOrder.length, 0, occupant);
    }
    this._update();
  }

  _removeFromSlot(slotIndex) {
    const wordId = this.placed[slotIndex];
    if (wordId === null) return;
    this.placed[slotIndex] = null;
    const bankIdx = this._bankOrder.indexOf(wordId);
    this._bankOrder.splice(bankIdx >= 0 ? bankIdx : 0, 0, wordId);
    this._update();
  }

  _update() {
    const slotEls = this.textEl.querySelectorAll('.tp-slot');
    slotEls.forEach((el, i) => {
      const wordId = this.placed[i];
      el.innerHTML = '';
      el.classList.remove('filled');
      if (!this.evaluated) el.classList.remove('tp-correct', 'tp-wrong');
      if (wordId !== null) {
        el.classList.add('filled');
        el.textContent = this.words[wordId].text;
      } else {
        el.textContent = '\u00A0';
      }
    });

    this.bankEl.innerHTML = '';
    this._bankOrder.forEach((wordId) => {
      const chip = document.createElement('div');
      chip.className = 'tp-chip';
      chip.textContent = this.words[wordId].text;
      chip.draggable = !this.evaluated;
      chip.addEventListener('dragstart', (e) => {
        const fromSlot = this.placed.indexOf(wordId);
        this._drag = { wordId, fromSlot: fromSlot >= 0 ? fromSlot : null };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(wordId));
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      this.bankEl.appendChild(chip);
    });

    const emptyChipNote = document.getElementById('tpBankEmpty');
    if (emptyChipNote) emptyChipNote.style.display = this._bankOrder.length === 0 ? '' : 'none';

    const allFilled = this.placed.every((w) => w !== null);
    document.getElementById('tpDoneBar').style.display =
      !this.evaluated && allFilled ? '' : 'none';
  }

  _shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

const textPractice = new TextPractice();
