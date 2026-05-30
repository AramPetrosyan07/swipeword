const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 760,
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

const dictPath = path.join(__dirname, "b2_dictionary.json");

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
