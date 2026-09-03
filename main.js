const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

const DEFAULT_PORT = 8123;

function _portFilePath() {
  return path.join(app.getPath("userData"), "swipeword-port.json");
}

function _readSavedPort() {
  try {
    if (fs.existsSync(_portFilePath())) {
      const port = JSON.parse(fs.readFileSync(_portFilePath(), "utf-8"));
      return Number.isInteger(port) && port > 0 ? port : null;
    }
  } catch (e) {}
  return null;
}

function _writeSavedPort(port) {
  try {
    fs.writeFileSync(_portFilePath(), JSON.stringify(port), "utf-8");
  } catch (e) {}
}

function _tryListen(server, port) {
  return new Promise((resolve) => {
    const onError = () => resolve(null);
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", onError);
      resolve(port);
    });
  });
}

async function startLocalServer() {
  const srcDir = path.join(__dirname, "src");
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(srcDir, urlPath === "/" ? "index.html" : urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  const candidates = [];
  const saved = _readSavedPort();
  if (saved) candidates.push(saved);
  if (!candidates.includes(DEFAULT_PORT)) candidates.push(DEFAULT_PORT);
  for (let p = DEFAULT_PORT + 1; candidates.length < 20; p++) {
    candidates.push(p);
  }
  candidates.push(0);

  for (const port of candidates) {
    const bound = await _tryListen(server, port);
    if (bound !== null) {
      if (bound > 0) _writeSavedPort(bound);
      return bound;
    }
  }
  return 0;
}

let mainWindow;

async function createWindow() {
  const port = await startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1080,
    height: 960,
    minWidth: 400,
    minHeight: 600,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Intercept requests to YouTube/Google to inject a valid Referer header.
  // This is needed because YouTube's embed player requires an HTTP Referer,
  // and Electron's default protocol (file://) does not provide one.
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"] },
    (details, callback) => {
      details.requestHeaders["Referer"] = "http://127.0.0.1:" + port + "/";
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  mainWindow.loadURL("http://127.0.0.1:" + port + "/");
}

// Live Reload: Watch the src directory and reload the window automatically when changes occur
let devWatchTimeout;
fs.watch(
  path.join(__dirname, "src"),
  { recursive: true },
  (eventType, filename) => {
    if (mainWindow) {
      clearTimeout(devWatchTimeout);
      devWatchTimeout = setTimeout(() => {
        try {
          mainWindow.webContents.reloadIgnoringCache();
          console.log(`Live Reload: Reloaded due to change in ${filename}`);
        } catch (e) {
          // App window might have been closed
        }
      }, 150);
    }
  },
);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (_storeSaveTimer) {
    clearTimeout(_storeSaveTimer);
    _storeSaveTimer = null;
  }
  if (_storePendingData !== null) {
    try {
      fs.writeFileSync(storePath, JSON.stringify(_storePendingData), "utf-8");
    } catch (e) {
      console.error("Failed to flush store on quit:", e);
    }
    _storePendingData = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select word list file",
    filters: [{ name: "Text Files", extensions: ["txt"] }],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath, path.extname(filePath));
  return { fileName, content };
});

const storePath = path.join(app.getPath("userData"), "swipeword-progress.json");

ipcMain.handle("store:load", () => {
  try {
    if (fs.existsSync(storePath)) {
      return JSON.parse(fs.readFileSync(storePath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load store:", e);
  }
  return null;
});

let _storeSaveTimer = null;
let _storePendingData = null;
let _storeSaveChain = Promise.resolve();

function _flushStoreSave() {
  const data = _storePendingData;
  _storePendingData = null;
  if (data === null) return;
  const tmp = storePath + ".tmp";
  _storeSaveChain = _storeSaveChain
    .then(() => fs.promises.writeFile(tmp, JSON.stringify(data), "utf-8"))
    .then(() => fs.promises.rename(tmp, storePath))
    .catch((e) => console.error("Failed to save store:", e));
}

ipcMain.handle("store:save", (_event, data) => {
  _storePendingData = data;
  if (_storeSaveTimer) clearTimeout(_storeSaveTimer);
  _storeSaveTimer = setTimeout(() => {
    _storeSaveTimer = null;
    _flushStoreSave();
  }, 250);
  return true;
});

const dictPath = path.join(__dirname, "b2-word-list.json");
const c1DictPath = path.join(__dirname, "oxford_c1_words.json");
const verbDictPath = path.join(__dirname, "verb.json");

ipcMain.handle("store:loadDictionary", async () => {
  try {
    if (fs.existsSync(dictPath)) {
      return JSON.parse(fs.readFileSync(dictPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load dictionary:", e);
  }
  return null;
});

ipcMain.handle("store:loadC1Dictionary", async () => {
  try {
    if (fs.existsSync(c1DictPath)) {
      return JSON.parse(fs.readFileSync(c1DictPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load C1 dictionary:", e);
  }
  return null;
});

ipcMain.handle("store:loadVerbDictionary", async () => {
  try {
    if (fs.existsSync(verbDictPath)) {
      return JSON.parse(fs.readFileSync(verbDictPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load verb dictionary:", e);
  }
  return null;
});

const tagsPath = path.join(__dirname, "tags.json");

ipcMain.handle("store:loadTags", async () => {
  try {
    if (fs.existsSync(tagsPath)) {
      return JSON.parse(fs.readFileSync(tagsPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load tags:", e);
  }
  return null;
});

const collectionPath = path.join(__dirname, "custom-collection.json");

ipcMain.handle("collection:load", async () => {
  try {
    if (fs.existsSync(collectionPath)) {
      return JSON.parse(fs.readFileSync(collectionPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load collection:", e);
  }
  return [];
});

ipcMain.handle("collection:add", async (_event, word) => {
  try {
    let data = [];
    if (fs.existsSync(collectionPath)) {
      data = JSON.parse(fs.readFileSync(collectionPath, "utf-8"));
    }
    if (data.some((item) => item.word.toLowerCase() === word.toLowerCase())) {
      return { success: false, reason: "exists" };
    }
    data.push({ word, addedAt: new Date().toISOString().split("T")[0] });
    fs.writeFileSync(collectionPath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (e) {
    console.error("Failed to add to collection:", e);
    return { success: false, reason: "error" };
  }
});

ipcMain.handle("collection:remove", async (_event, word) => {
  try {
    if (!fs.existsSync(collectionPath)) return { success: false };
    let data = JSON.parse(fs.readFileSync(collectionPath, "utf-8"));
    data = data.filter(
      (item) => item.word.toLowerCase() !== word.toLowerCase(),
    );
    fs.writeFileSync(collectionPath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (e) {
    console.error("Failed to remove from collection:", e);
    return { success: false };
  }
});

ipcMain.handle("dialog:openPDF", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open PDF file",
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  return { fileName, filePath };
});

ipcMain.handle("dialog:openDirectory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose a folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("file:read", async (_event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (e) {
    console.error("Failed to read file:", e);
    return null;
  }
});

ipcMain.handle("file:write", async (_event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data));
    return { success: true, filePath };
  } catch (e) {
    console.error("Failed to write file:", e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle("dialog:savePDF", async (_event, data, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save annotated PDF",
    defaultPath: defaultName,
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  try {
    fs.writeFileSync(result.filePath, Buffer.from(data));
    return { success: true, filePath: result.filePath };
  } catch (e) {
    console.error("Failed to save PDF:", e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle("fs:readdir", async (_event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => {
        const fullPath = path.join(dirPath, e.name);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          stat = null;
        }
        return {
          name: e.name,
          path: fullPath,
          isDirectory: e.isDirectory(),
          size: stat ? stat.size : 0,
          mtimeMs: stat ? stat.mtimeMs : 0,
        };
      });
    items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return items;
  } catch (e) {
    console.error("Failed to read directory:", e);
    return null;
  }
});

ipcMain.handle("fs:getHomeDir", async () => {
  return app.getPath("documents");
});

ipcMain.handle("dialog:openAny", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open file",
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return { filePath, fileName: path.basename(filePath) };
});

const favFilePath = path.join(__dirname, "matched_ids.txt");

ipcMain.handle("store:loadFavoritesFile", async () => {
  try {
    if (fs.existsSync(favFilePath)) {
      const content = fs.readFileSync(favFilePath, "utf-8");
      return content
        .trim()
        .split("\n")
        .map((line) => parseInt(line.trim(), 10))
        .filter((id) => !isNaN(id));
    }
  } catch (e) {
    console.error("Failed to load favorites file:", e);
  }
  return [];
});

// --- Translation API (MyMemory + Google Translate free endpoint) ---
const translateCache = new Map();

async function _mymemoryTranslate(word, from, to) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${from}|${to}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data.responseData?.translatedText || "";
}

async function _googleTranslate(word, from, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(word)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data[0]?.map(s => s[0]).join('') || "";
}

async function _fetchAlternatives(word, from, to, count) {
  const alts = [];
  const lower = word.toLowerCase();

  const promises = [];

  if (count >= 1) promises.push(_mymemoryTranslate(lower, from, to).catch(() => ""));
  if (count >= 2) promises.push(_googleTranslate(lower, from, to).catch(() => ""));
  if (count >= 3) promises.push(_mymemoryTranslate("the " + lower, from, to).catch(() => ""));
  if (count >= 4) promises.push(_googleTranslate("to " + lower, from, to).catch(() => ""));

  const results = await Promise.all(promises);

  for (const r of results) {
    const trimmed = (r || "").trim();
    if (trimmed && trimmed.toLowerCase() !== lower && !alts.includes(trimmed)) {
      alts.push(trimmed);
    }
  }

  while (alts.length < count) alts.push("—");
  return alts.slice(0, count);
}

ipcMain.handle("translate:word", async (_event, { word, from, langs, count }) => {
  const langList = Array.isArray(langs) ? langs : [langs].filter(Boolean);
  const wordCount = Math.min(Math.max(parseInt(count) || 1, 1), 4);
  const cacheKey = `${word}|${from}|${langList.join(",")}|w${wordCount}`;
  if (translateCache.has(cacheKey)) return translateCache.get(cacheKey);

  try {
    const results = {};
    const tasks = langList.map(async (lang) => {
      if (!lang) return;
      results[lang] = await _fetchAlternatives(word, from, lang, wordCount);
    });
    await Promise.all(tasks);

    translateCache.set(cacheKey, results);
    return results;
  } catch (e) {
    console.error("Translation failed:", e);
    return {};
  }
});

// --- TTS (Microsoft Edge TTS via edge-tts Python CLI) ---
const { spawn, execSync } = require("child_process");

let _edgeTTSPath = "edge-tts";
try {
  _edgeTTSPath = execSync("where edge-tts", { encoding: "utf-8" }).trim().split("\n")[0].trim();
} catch (_) {
  // fallback: keep "edge-tts" and hope it's in PATH
}
console.log("edge-tts path:", _edgeTTSPath);

// 4 voice personas per language: [Male1, Male2, Female1, Female2].
// null slots fall back to the English multilingual pool below (these pronounce
// foreign words well - they were already used for Armenian).
const _ttsVoices = {
  hy:  [null, null, null, null],
  ru:  ["ru-RU-DmitryNeural", "ru-RU-DmitryNeural", "ru-RU-SvetlanaNeural", "ru-RU-SvetlanaNeural"],
  en:  ["en-US-ChristopherNeural", "en-US-GuyNeural", "en-US-JennyNeural", "en-US-AriaNeural"],
  es:  ["es-ES-AlvaroNeural", "es-MX-JorgeNeural", "es-ES-ElviraNeural", "es-MX-DaliaNeural"],
  fr:  ["fr-FR-HenriNeural", "fr-CA-AntoineNeural", "fr-FR-DeniseNeural", "fr-CA-SylvieNeural"],
  de:  ["de-DE-ConradNeural", "de-DE-KillianNeural", "de-DE-KatjaNeural", "de-DE-AmalaNeural"],
  it:  ["it-IT-DiegoNeural", null, "it-IT-ElsaNeural", "it-IT-IsabellaNeural"],
  pt:  ["pt-PT-DuarteNeural", null, "pt-PT-RaquelNeural", "pt-BR-FranciscaNeural"],
  ar:  ["ar-SA-HamedNeural", null, "ar-SA-ZariyahNeural", null],
  zh:  ["zh-CN-YunxiNeural", null, "zh-CN-XiaoxiaoNeural", null],
  ja:  ["ja-JP-KeitaNeural", null, "ja-JP-NanamiNeural", null],
  ko:  ["ko-KR-InJoonNeural", "ko-KR-HyunsuMultilingualNeural", "ko-KR-SunHiNeural", null],
  hi:  ["hi-IN-MadhurNeural", null, "hi-IN-SwaraNeural", null],
  tr:  ["tr-TR-AhmetNeural", null, "tr-TR-EmelNeural", null],
  pl:  ["pl-PL-MarekNeural", null, "pl-PL-ZofiaNeural", null],
  nl:  ["nl-NL-MaartenNeural", null, "nl-NL-FennaNeural", null],
  sv:  ["sv-SE-MattiasNeural", null, "sv-SE-SofieNeural", null],
  uk:  ["uk-UA-OstapNeural", null, "uk-UA-PolinaNeural", null],
  el:  ["el-GR-NestorasNeural", null, "el-GR-AthinaNeural", null],
  cs:  ["cs-CZ-AntoninNeural", null, "cs-CZ-VlastaNeural", null],
  ro:  ["ro-RO-EmilNeural", null, "ro-RO-AlinaNeural", null],
  hu:  ["hu-HU-TamasNeural", null, "hu-HU-NoemiNeural", null],
  fi:  ["fi-FI-HarriNeural", null, "fi-FI-NooraNeural", null],
  da:  ["da-DK-JeppeNeural", null, "da-DK-ChristelNeural", null],
  no:  ["nb-NO-FinnNeural", null, "nb-NO-PernilleNeural", null],
  he:  ["he-IL-AvriNeural", null, "he-IL-HilaNeural", null],
  th:  ["th-TH-NiwatNeural", null, "th-TH-PremwadeeNeural", null],
  vi:  ["vi-VN-NamMinhNeural", null, "vi-VN-HoaiMyNeural", null],
  id:  ["id-ID-ArdiNeural", null, "id-ID-GadisNeural", null],
  ka:  ["ka-GE-GiorgiNeural", null, "ka-GE-EkaNeural", null],
  bn:  ["bn-BD-PradeepNeural", null, "bn-BD-NabanitaNeural", null],
  ur:  ["ur-PK-AsadNeural", null, "ur-PK-UzmaNeural", null],
  fa:  ["fa-IR-FaridNeural", null, "fa-IR-DilaraNeural", null],
  sw:  ["sw-KE-RafikiNeural", null, "sw-KE-ZuriNeural", null],
  fil: ["fil-PH-AngeloNeural", null, "fil-PH-BlessicaNeural", null],
  ms:  ["ms-MY-OsmanNeural", null, "ms-MY-YasminNeural", null],
};

const _ttsPool = [
  "en-US-AndrewMultilingualNeural",
  "en-US-BrianMultilingualNeural",
  "en-US-EmmaMultilingualNeural",
  "en-US-AvaMultilingualNeural",
];

function _ttsVoiceFor(lang, voiceIndex) {
  const slot = Math.max(0, Math.min(3, parseInt(voiceIndex) || 0));
  const short = (lang || '').split('-')[0].toLowerCase();
  const list = _ttsVoices[lang] || _ttsVoices[short] || _ttsVoices.en;
  const voice = list[slot];
  if (voice) return voice;
  const poolVoice = _ttsPool[slot];
  if (short === 'hy') return poolVoice;
  return poolVoice;
}

const _ttsCache = new Map();
const _ttsPending = new Map();

async function _edgeTTS(text, lang, voiceIndex) {
  const voice = _ttsVoiceFor(lang, voiceIndex);
  const cacheKey = `${text}|${voice}`;
  if (_ttsCache.has(cacheKey)) return _ttsCache.get(cacheKey);
  if (_ttsPending.has(cacheKey)) return _ttsPending.get(cacheKey);

  const promise = new Promise((resolve, reject) => {
    const chunks = [];
    // Write with UTF-8 BOM so Python (edge-tts) auto-detects UTF-8 on Windows
    // (Without BOM, Python defaults to cp1252 which breaks Armenian/Russian text)
    const tmpFile = path.join(app.getPath("temp"), `swipeword-tts-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, "\ufeff" + text, "utf-8");
    const child = spawn(_edgeTTSPath, ["-f", tmpFile, "--voice", voice, "--write-media", "-"], { shell: true });
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    const stderrChunks = [];
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("error", (err) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      reject(new Error(`edge-tts spawn failed: ${err.message}`));
    });
    child.on("close", (code) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (code !== 0) {
        const stderrMsg = Buffer.concat(stderrChunks).toString("utf-8").trim();
        reject(new Error(`edge-tts exited with code ${code}: ${stderrMsg || "(no stderr)"}`));
        return;
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length < 100) {
        reject(new Error("No audio data received from edge-tts"));
        return;
      }
      const base64 = buffer.toString("base64");
      _ttsCache.set(cacheKey, base64);
      resolve(base64);
    });
  });

  _ttsPending.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    _ttsPending.delete(cacheKey);
  }
}

ipcMain.handle("tts:speak", async (_event, { text, lang, voice }) => {
  try {
    const audio = await _edgeTTS(text, lang, voice);
    return { success: true, audio };
  } catch (e) {
    console.error("TTS failed:", e);
    return { success: false, error: e.message };
  }
});

// --- YouTube Captions ---
const captionCache = new Map();
const { YoutubeTranscript } = require("youtube-transcript");

ipcMain.handle("youtube:captions", async (_event, videoId) => {
  if (captionCache.has(videoId)) return captionCache.get(videoId);

  try {
    console.log("Fetching transcript via youtube-transcript for:", videoId);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const lines = transcript.map((t) => ({
      start: t.offset / 1000,
      duration: t.duration / 1000,
      text: t.text,
    }));
    console.log("youtube-transcript lines:", lines.length);
    captionCache.set(videoId, lines);
    return lines;
  } catch (e) {
    console.error("youtube-transcript failed:", e.message);
    captionCache.set(videoId, []);
    return [];
  }
});

// --- YouTube Related Video Recommendations ---
const { net } = require("electron");

ipcMain.handle("youtube:related", async (_event, videoId) => {
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return [];
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20250101.00.00",
          hl: "en",
          gl: "US",
        },
      },
      videoId: videoId,
    };
    const res = await net.fetch(
      "https://www.youtube.com/youtubei/v1/next?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results =
      data &&
      data.contents &&
      data.contents.twoColumnWatchNextResults &&
      data.contents.twoColumnWatchNextResults.secondaryResults &&
      data.contents.twoColumnWatchNextResults.secondaryResults.secondaryResults &&
      data.contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results;
    if (!Array.isArray(results)) return [];

    const out = [];
    for (const item of results) {
      if (!item || typeof item !== "object") continue;
      let videoId = null;
      let title = "";
      let thumb = "";

      const lockup = item.lockupViewModel;
      if (lockup && lockup.contentId) {
        videoId = lockup.contentId;
        title =
          (lockup.metadata &&
            lockup.metadata.lockupMetadataViewModel &&
            lockup.metadata.lockupMetadataViewModel.title &&
            lockup.metadata.lockupMetadataViewModel.title.content) ||
          "";
        if (lockup.contentImage && lockup.contentImage.thumbnailViewModel) {
          const thumbs = lockup.contentImage.thumbnailViewModel.image &&
            lockup.contentImage.thumbnailViewModel.image.sources;
          if (Array.isArray(thumbs) && thumbs.length) {
            thumb = thumbs[thumbs.length - 1].url || "";
          }
        }
      } else {
        const r = item.compactVideoRenderer || item.videoRenderer || item.compactRadioRenderer;
        videoId = r && (r.videoId || (r.navigationEndpoint && r.navigationEndpoint.watchEndpoint && r.navigationEndpoint.watchEndpoint.videoId));
        title = (r && r.title && ((r.title.runs && r.title.runs[0] && r.title.runs[0].text) || r.title.simpleText)) || "";
        thumb = (r && r.thumbnail && r.thumbnail.thumbnails && r.thumbnail.thumbnails.length)
          ? r.thumbnail.thumbnails[r.thumbnail.thumbnails.length - 1].url
          : "";
      }

      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;
      if (!title) continue;
      out.push({ videoId, title, thumbnailUrl: thumb });
    }
    return out;
  } catch (e) {
    console.error("youtube:related failed:", e.message);
    return [];
  }
});

// --- Video Metadata for Vocabulary Library ---
const videoMetaPath = path.join(
  app.getPath("userData"),
  "swipeword-video-meta.json",
);

function loadVideoMetaFile() {
  try {
    if (fs.existsSync(videoMetaPath)) {
      return JSON.parse(fs.readFileSync(videoMetaPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load video meta:", e);
  }
  return {};
}

function saveVideoMetaFile(data) {
  fs.writeFileSync(videoMetaPath, JSON.stringify(data, null, 2), "utf-8");
}

ipcMain.handle("vocablib:loadMeta", async () => {
  return loadVideoMetaFile();
});

ipcMain.handle("vocablib:saveMeta", async (_event, data) => {
  try {
    saveVideoMetaFile(data);
    return { success: true };
  } catch (e) {
    console.error("Failed to save video meta:", e);
    return { success: false };
  }
});

ipcMain.handle("vocablib:updatePosition", async (_event, youtubeUrl, position) => {
  try {
    const data = loadVideoMetaFile();
    if (!data[youtubeUrl]) {
      data[youtubeUrl] = {};
    }
    data[youtubeUrl].lastPosition = position;
    data[youtubeUrl].lastWatched = Date.now();
    saveVideoMetaFile(data);
    return { success: true };
  } catch (e) {
    console.error("Failed to update position:", e);
    return { success: false };
  }
});

ipcMain.handle("vocablib:deleteVideo", async (_event, youtubeUrl) => {
  try {
    const dictData = loadDictionaryFile();
    const filtered = dictData.filter((e) => e.youtubeUrl !== youtubeUrl);
    saveDictionaryFile(filtered);
    const meta = loadVideoMetaFile();
    delete meta[youtubeUrl];
    saveVideoMetaFile(meta);
    return { success: true };
  } catch (e) {
    console.error("Failed to delete video vocabulary:", e);
    return { success: false };
  }
});

ipcMain.handle("vocablib:deleteWord", async (_event, wordId) => {
  try {
    let data = loadDictionaryFile();
    const word = data.find((e) => e.id === wordId);
    data = data.filter((e) => e.id !== wordId);
    saveDictionaryFile(data);
    return { success: true, youtubeUrl: word ? word.youtubeUrl : null };
  } catch (e) {
    console.error("Failed to delete word:", e);
    return { success: false };
  }
});

// --- Personal Dictionary ---
const dictionaryPath = path.join(
  app.getPath("userData"),
  "swipeword-dictionary.json",
);

function loadDictionaryFile() {
  try {
    if (fs.existsSync(dictionaryPath)) {
      return JSON.parse(fs.readFileSync(dictionaryPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load dictionary:", e);
  }
  return [];
}

function saveDictionaryFile(data) {
  fs.writeFileSync(dictionaryPath, JSON.stringify(data, null, 2), "utf-8");
}

ipcMain.handle("dictionary:load", async () => {
  return loadDictionaryFile();
});

ipcMain.handle("dictionary:add", async (_event, entry) => {
  const data = loadDictionaryFile();
  if (
    data.some((e) => e.word === entry.word && e.sourceId === entry.sourceId)
  ) {
    return { success: false, reason: "exists" };
  }
  data.push(entry);
  saveDictionaryFile(data);

  if (entry.sourceType === "youtube" && entry.youtubeUrl) {
    const meta = loadVideoMetaFile();
    if (!meta[entry.youtubeUrl]) {
      meta[entry.youtubeUrl] = {
        title: entry.sourceTitle || "",
        thumbnailUrl: entry.thumbnailUrl || "",
        createdAt: Date.now(),
        lastWatched: Date.now(),
        lastPosition: 0,
      };
    } else {
      meta[entry.youtubeUrl].lastWatched = Date.now();
      if (entry.thumbnailUrl && !meta[entry.youtubeUrl].thumbnailUrl) {
        meta[entry.youtubeUrl].thumbnailUrl = entry.thumbnailUrl;
      }
      if (entry.sourceTitle && !meta[entry.youtubeUrl].title) {
        meta[entry.youtubeUrl].title = entry.sourceTitle;
      }
    }
    saveVideoMetaFile(meta);
  }

  return { success: true };
});

ipcMain.handle("dictionary:remove", async (_event, id) => {
  let data = loadDictionaryFile();
  data = data.filter((e) => e.id !== id);
  saveDictionaryFile(data);
  return { success: true };
});

ipcMain.handle("app:updateAndRestart", async () => {
  const batPath = path.join(app.getAppPath(), "update-and-start.bat");
  if (!fs.existsSync(batPath)) return { success: false, error: "update-and-start.bat not found" };
  shell.openPath(batPath);
  app.quit();
});
