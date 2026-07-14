const { app, BrowserWindow, ipcMain, dialog } = require("electron");
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

function startLocalServer() {
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

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address().port);
    });
  });
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
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

ipcMain.handle("store:save", (_event, data) => {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Failed to save store:", e);
    return false;
  }
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

ipcMain.handle("file:read", async (_event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (e) {
    console.error("Failed to read file:", e);
    return null;
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
        try { stat = fs.statSync(fullPath); } catch { stat = null; }
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

// --- Translation API (MyMemory free tier) ---
const translateCache = new Map();

ipcMain.handle("translate:word", async (_event, word) => {
  if (translateCache.has(word)) return translateCache.get(word);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|hy`;
    const resp = await fetch(url);
    const data = await resp.json();
    const armenian = data.responseData?.translatedText || "";

    const ruUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ru`;
    const ruResp = await fetch(ruUrl);
    const ruData = await ruResp.json();
    const russian = ruData.responseData?.translatedText || "";

    const result = { armenian, russian, transliteration: "" };
    translateCache.set(word, result);
    return result;
  } catch (e) {
    console.error("Translation failed:", e);
    return { armenian: "", russian: "", transliteration: "" };
  }
});

// --- YouTube Captions ---
const captionCache = new Map();

ipcMain.handle("youtube:captions", async (_event, videoId) => {
  if (captionCache.has(videoId)) return captionCache.get(videoId);

  try {
    // Fetch the YouTube watch page to extract available caption tracks
    const watchUrl = "https://www.youtube.com/watch?v=" + videoId;
    const watchResp = await fetch(watchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await watchResp.text();

    // Extract captionTracks from the embedded player response
    const tracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!tracksMatch) {
      console.log("No captionTracks found in page HTML for video:", videoId);
      captionCache.set(videoId, []);
      return [];
    }

    const tracks = JSON.parse(tracksMatch[1]);
    console.log("Found", tracks.length, "caption tracks:", tracks.map(t => t.languageCode + (t.kind ? "(" + t.kind + ")" : "")).join(", "));
    if (!tracks || tracks.length === 0) {
      captionCache.set(videoId, []);
      return [];
    }

    // Prefer English, otherwise take the first track
    let track =
      tracks.find((t) => t.languageCode === "en") ||
      tracks.find((t) => t.languageCode?.startsWith("en")) ||
      tracks[0];
    console.log("Selected caption track:", track.languageCode, track.kind || "manual");

    // Fetch the timedtext (default XML format — most reliable)
    let timedUrl = track.baseUrl;
    if (!timedUrl) {
      captionCache.set(videoId, []);
      return [];
    }
    console.log("Fetching captions from:", timedUrl);

    const ttResp = await fetch(timedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
      },
    });
    const ttBuffer = await ttResp.arrayBuffer();
    const ttBytes = new Uint8Array(ttBuffer);
    console.log("Captions response status:", ttResp.status, "bytes:", ttBytes.length);
    // Check for gzip (1f 8b) or deflate (78 01/78 9c/78 da) magic bytes
    if (ttBytes.length > 2) {
      console.log("First 4 bytes:", Array.from(ttBytes.slice(0, 4)).map(b => b.toString(16).padStart(2, "0")).join(" "));
    }
    let ttText;
    if (ttBytes.length > 2 && ttBytes[0] === 0x1f && ttBytes[1] === 0x8b) {
      const { gunzipSync } = require("zlib");
      ttText = gunzipSync(Buffer.from(ttBytes), "utf-8");
    } else if (ttBytes.length > 2 && ttBytes[0] === 0x78) {
      const { inflateSync } = require("zlib");
      ttText = inflateSync(Buffer.from(ttBytes), "utf-8");
    } else {
      ttText = Buffer.from(ttBytes).toString("utf-8");
    }
    console.log("Captions decoded length:", ttText.length);
    if (!ttText || ttText.length < 10) {
      captionCache.set(videoId, []);
      return [];
    }

    // Parse XML format: <p t="startMs" d="durationMs">text</p> with <s> segments
    const lines = [];
    const pRegex = /<p\s[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = pRegex.exec(ttText)) !== null) {
      const start = parseInt(match[1], 10) / 1000;
      const duration = parseInt(match[2], 10) / 1000;
      // Strip <s> tags and inner XML, keeping only text content
      const raw = match[3].replace(/<[^>]+>/g, "").trim();
      if (raw) lines.push({ start, duration, text: raw });
    }

    captionCache.set(videoId, lines);
    return lines;
  } catch (e) {
    console.error("Failed to fetch YouTube captions:", e);
    return [];
  }
});

// --- Personal Dictionary ---
const dictionaryPath = path.join(app.getPath("userData"), "swipeword-dictionary.json");

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
  if (data.some((e) => e.word === entry.word && e.sourceId === entry.sourceId)) {
    return { success: false, reason: "exists" };
  }
  data.push(entry);
  saveDictionaryFile(data);
  return { success: true };
});

ipcMain.handle("dictionary:remove", async (_event, id) => {
  let data = loadDictionaryFile();
  data = data.filter((e) => e.id !== id);
  saveDictionaryFile(data);
  return { success: true };
});
