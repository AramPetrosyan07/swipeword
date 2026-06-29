const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
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

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
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
