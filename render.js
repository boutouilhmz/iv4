const axios = require("axios");
const { ipcRenderer } = require("electron");

// Default IV4 IP
let currentIP = "192.168.0.10";
let IV4_URL = `http://${currentIP}/snapshot.jpg`;
let updateInterval = null;
let isConnected = false;

const liveImg = document.getElementById("liveView");
const ipInput = document.getElementById("ipInput");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const statusDiv = document.getElementById("connectionStatus");

// Function to fetch image from sensor
async function updateImage() {
    if (!isConnected) return;
    
    try {
        const response = await axios.get(IV4_URL, { 
            responseType: "arraybuffer",
            timeout: 5000 
        });
        const blob = new Blob([response.data], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        liveImg.src = url;
        
        // Update status if connection was lost
        if (!isConnected) {
            setConnectionStatus(true);
        }
    } catch (err) {
        console.error("Error fetching image from IV4:", err.message);
        setConnectionStatus(false);
    }
}

// Function to update connection status
function setConnectionStatus(connected) {
    isConnected = connected;
    if (connected) {
        statusDiv.textContent = `Connecté à ${currentIP}`;
        statusDiv.className = "status connected";
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
    } else {
        statusDiv.textContent = "Déconnecté";
        statusDiv.className = "status disconnected";
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        liveImg.src = "";
    }
}

// Connect to IV4 sensor
function connectToSensor() {
    const newIP = ipInput.value.trim();
    if (!newIP) {
        alert("Veuillez entrer une adresse IP valide");
        return;
    }
    
    currentIP = newIP;
    IV4_URL = `http://${currentIP}/snapshot.jpg`;
    
    // Test connection first
    axios.get(IV4_URL, { 
        responseType: "arraybuffer",
        timeout: 5000 
    })
    .then(() => {
        setConnectionStatus(true);
        // Start live updates
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(updateImage, 1000);
        updateImage(); // Get first image immediately
    })
    .catch((err) => {
        console.error("Connection failed:", err.message);
        alert(`Échec de connexion à ${currentIP}. Veuillez vérifier l'adresse IP et la connexion réseau.`);
        setConnectionStatus(false);
    });
}

// Disconnect from sensor
function disconnectFromSensor() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    setConnectionStatus(false);
}

// Event listeners
connectBtn.addEventListener("click", connectToSensor);
disconnectBtn.addEventListener("click", disconnectFromSensor);

// Allow Enter key to connect
ipInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        connectToSensor();
    }
});

// Initialize with disconnected state
setConnectionStatus(false);

// Snapshot button
document.getElementById("snapshotBtn").addEventListener("click", async () => {
    if (!isConnected) {
        alert("Veuillez d'abord vous connecter au capteur IV4");
        return;
    }
    
    try {
        // Convert current image to base64
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = liveImg.naturalWidth || 640;
        canvas.height = liveImg.naturalHeight || 480;
        
        ctx.drawImage(liveImg, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        
        // Save via main process
        const result = await ipcRenderer.invoke("save-snapshot", imageData);
        
        if (result.success) {
            const filename = result.filepath.split('\\').pop();
            console.log("Snapshot saved to:", result.filepath);
            
            // Enhanced user notification in French
            const message = `✅ Photo sauvegardée avec succès !\n\n` +
                          `📁 Emplacement: C:\\IV4_Snapshots\\\n` +
                          `📷 Nom du fichier: ${filename}\n\n` +
                          `Cliquez sur OK pour continuer ou utilisez le bouton "Ouvrir le Dossier Photos" pour voir vos images.`;
            
            alert(message);
        } else {
            console.error("Failed to save snapshot:", result.error);
            alert("❌ Échec de sauvegarde de la photo: " + result.error);
        }
    } catch (error) {
        console.error("Error taking snapshot:", error);
        alert("❌ Erreur lors de la prise de photo: " + error.message);
    }
});

// Open snapshots folder button
document.getElementById("openFolderBtn").addEventListener("click", async () => {
    try {
        console.log("Attempting to open snapshots folder...");
        const result = await ipcRenderer.invoke("open-snapshots-folder");
        console.log("Open folder result:", result);
        
        if (!result.success) {
            alert("❌ Échec d'ouverture du dossier: " + result.error);
        } else {
            console.log("Folder opened successfully");
        }
    } catch (error) {
        console.error("Error opening folder:", error);
        alert("❌ Erreur lors de l'ouverture du dossier: " + error.message);
    }
});
