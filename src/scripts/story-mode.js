const STORIES = [
  {
    id: 1,
    title: 'A Day at the Market',
    level: 'A2',
    unlockAt: 20,
    paragraphs: [
      'Yesterday I went to the <w id=0>market</w> to buy some fresh fruits.',
      'The seller offered me a good <w id=1>bargain</w> on apples.',
    ],
  },
  {
    id: 2,
    title: 'The Lost Key',
    level: 'A2',
    unlockAt: 50,
    paragraphs: [
      'Anna lost her house key and had to <w id=2>search</w> everywhere.',
      'She finally found it under a <w id=3>cushion</w> on the sofa.',
    ],
  },
  {
    id: 3,
    title: 'A New Job',
    level: 'B1',
    unlockAt: 100,
    paragraphs: [
      'After months of searching, Mark got a job <w id=4>interview</w> at a tech company.',
      'He felt <w id=5>confident</w> about his chances.',
    ],
  },
  {
    id: 4,
    title: 'Travel Plans',
    level: 'B1',
    unlockAt: 150,
    paragraphs: [
      'They decided to <w id=6>explore</w> the old town during their vacation.',
      'The <w id=7>architecture</w> was absolutely stunning.',
    ],
  },
  {
    id: 5,
    title: 'The Science Fair',
    level: 'B2',
    unlockAt: 250,
    paragraphs: [
      'The students presented their <w id=8>experiment</w> at the science fair.',
      'Their <w id=9>discovery</w> impressed all the judges.',
    ],
  },
];

class StoryMode extends BaseMode {
  constructor() {
    super();
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnStoryBack').addEventListener('click', () => this.back());
    document.getElementById('btnStoryReaderBack').addEventListener('click', () => this._showList());
    document.getElementById('btnStoryMarkRead').addEventListener('click', () => this._markRead());
    document.getElementById('btnStoryPopupClose').addEventListener('click', () => this._closePopup());
    document.getElementById('storyPopup').addEventListener('click', (e) => {
      if (e.target === document.getElementById('storyPopup')) this._closePopup();
    });
  }

  start(filter) {
    this._showScreen();
    this._showList();
    return true;
  }

  _showScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-story').classList.add('active');
  }

  _showList() {
    document.getElementById('storyList').style.display = 'block';
    document.getElementById('storyReader').style.display = 'none';
    const remembered = appStore.getStats().remembered;
    const list = document.getElementById('storyList');
    list.innerHTML = '';
    STORIES.forEach((story) => {
      const unlocked = remembered >= story.unlockAt;
      const progress = (appStore.data.storyProgress || []).find((p) => p.storyId === story.id);
      const item = document.createElement('div');
      item.className = `story-list-item ${unlocked ? '' : 'locked'}`;
      item.innerHTML = `
        <div class="story-list-item-info">
          <div class="story-list-item-title">${story.title}</div>
          <div class="story-list-item-meta">${story.level} · ${unlocked ? (progress && progress.read ? 'Read' : 'Unread') : `Master ${story.unlockAt} words to unlock`}</div>
        </div>
        <div class="story-list-item-status">${unlocked ? (progress && progress.read ? '&#9989;' : '&#128214;') : '&#128274;'}</div>
      `;
      if (unlocked) {
        item.addEventListener('click', () => this._readStory(story));
      }
      list.appendChild(item);
    });
  }

  _readStory(story) {
    document.getElementById('storyList').style.display = 'none';
    document.getElementById('storyReader').style.display = 'flex';
    document.getElementById('storyReaderTitle').textContent = story.title;

    const content = document.getElementById('storyReaderContent');
    content.innerHTML = '';
    story.paragraphs.forEach((p) => {
      const html = p.replace(/<w id=(\d+)>(.*?)<\/w>/g, (match, id, text) => {
        return `<span class="story-word-highlight" data-id="${id}">${text}</span>`;
      });
      const para = document.createElement('p');
      para.innerHTML = html;
      content.appendChild(para);
    });

    content.querySelectorAll('.story-word-highlight').forEach((el) => {
      el.addEventListener('click', () => this._showPopup(el.dataset.id));
    });

    const progress = (appStore.data.storyProgress || []).find((p) => p.storyId === story.id);
    document.getElementById('btnStoryMarkRead').style.display = (progress && progress.read) ? 'none' : 'block';
  }

  _showPopup(wordId) {
    const word = appStore.getAllWords()[parseInt(wordId)];
    if (!word) return;
    document.getElementById('storyPopupWord').textContent = word.english;
    document.getElementById('storyPopupTranslation').textContent = word.armenian;
    document.getElementById('storyPopup').style.display = 'flex';
  }

  _closePopup() {
    document.getElementById('storyPopup').style.display = 'none';
  }

  _markRead() {
    const title = document.getElementById('storyReaderTitle').textContent;
    const story = STORIES.find((s) => s.title === title);
    if (!story) return;

    if (!appStore.data.storyProgress) appStore.data.storyProgress = [];
    const existing = appStore.data.storyProgress.find((p) => p.storyId === story.id);
    if (existing) {
      existing.read = true;
    } else {
      appStore.data.storyProgress.push({ storyId: story.id, unlocked: true, read: true });
    }
    appStore.save();
    document.getElementById('btnStoryMarkRead').style.display = 'none';
  }

  back() {
    this._closePopup();
    if (document.getElementById('storyReader').style.display === 'flex') {
      this._showList();
    } else {
      super.back();
    }
  }
}

const storyMode = new StoryMode();
