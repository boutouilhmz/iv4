const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 650,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile("index.html");
}

// Create IV4_Snapshots folder if it doesn't exist
const snapshotsDir = "C:\\IV4_Snapshots";
if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
}

// Handle snapshot save request from renderer
ipcMain.handle("save-snapshot", async (event, imageData) => {
    try {
        const timestamp = Date.now();
        const filename = `snapshot_${timestamp}.jpg`;
        const filepath = path.join(snapshotsDir, filename);
        
        // Convert base64 to buffer and save
        const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        
        fs.writeFileSync(filepath, buffer);
        return { success: true, filepath };
    } catch (error) {
        console.error("Error saving snapshot:", error);
        return { success: false, error: error.message };
    }
});

// Handle opening snapshots folder
ipcMain.handle("open-snapshots-folder", async () => {
    try {
        console.log("Opening snapshots folder:", snapshotsDir);
        
        // Check if folder exists first
        if (!fs.existsSync(snapshotsDir)) {
            console.log("Folder doesn't exist, creating it...");
            fs.mkdirSync(snapshotsDir, { recursive: true });
        }
        
        const result = await shell.openPath(snapshotsDir);
        console.log("Shell.openPath result:", result);
        
        // shell.openPath returns empty string on success, error message on failure
        if (result === "") {
            return { success: true };
        } else {
            return { success: false, error: result };
        }
    } catch (error) {
        console.error("Error opening folder:", error);
        return { success: false, error: error.message };
    }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
