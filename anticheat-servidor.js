// anticheat-servidor.js - Versión para servidor Node.js
const fs = require("fs");
const path = require("path");

class AntiCheatServidor {
    constructor() {
        this.logDirectory = path.join(__dirname, "logs");
        this.ensureLogDirectoryExists();
        this.currentLogFile = this.getCurrentLogFileName();
        this.detectedCheats = [];
        this.suspiciousActivities = [];
        this.playerScores = new Map();
        this.cheatPatterns = new Map();
        this.init();
    }

    // Crear directorio de logs si no existe
    ensureLogDirectoryExists() {
        try {
            if (!fs.existsSync(this.logDirectory)) {
                fs.mkdirSync(this.logDirectory, { recursive: true });
                this.log("Sistema", `Directorio de logs creado: ${this.logDirectory}`);
            }
        } catch (error) {
            console.error("Error creando directorio de logs:", error);
        }
    }

    // Obtener nombre del archivo de log basado en la fecha actual
    getCurrentLogFileName() {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        const hour = now.getHours().toString().padStart(2, "0");
        const minute = now.getMinutes().toString().padStart(2, "0");

        return `ac-${day}-${month}-${year}-${hour}-${minute}.log`;
    }

    // Inicializar el sistema anticheat
    init() {
        this.log("Sistema", "Anti-Cheat del servidor inicializado");
        this.initializeCheatPatterns();
    }

    // Inicializar patrones de cheat conocidos
    initializeCheatPatterns() {
        this.cheatPatterns.set("speed_hack", {
            name: "Speed Hack",
            description: "Movimiento a velocidad imposible",
            threshold: 10,
        });

        this.cheatPatterns.set("teleport", {
            name: "Teleport Hack",
            description: "Teletransporte imposible",
            threshold: 100,
        });

        this.cheatPatterns.set("ammo_hack", {
            name: "Ammo Hack",
            description: "Munición imposible",
            threshold: 1000,
        });
    }

    // Escribir en el log
    log(type, message, playerId = "Sistema") {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [${type}] [${playerId}] ${message}\n`;
            const logPath = path.join(this.logDirectory, this.currentLogFile);

            fs.appendFileSync(logPath, logEntry, "utf8");
            console.log(`[ANTICHEAT-SERVER] ${logEntry.trim()}`);
        } catch (error) {
            console.error("Error escribiendo en el log:", error);
        }
    }

    // Analizar datos de red del jugador
    analyzePlayerData(playerId, playerData) {
        if (!playerData) return;

        // Verificar velocidad de movimiento
        if (playerData.velocity && playerData.velocity > this.cheatPatterns.get("speed_hack").threshold) {
            this.detectCheat(
                "Speed Hack",
                `Velocidad imposible detectada: ${playerData.velocity}`,
                playerId
            );
        }

        // Verificar teletransporte
        if (playerData.lastPosition && playerData.currentPosition) {
            const distance = this.calculateDistance(playerData.lastPosition, playerData.currentPosition);
            if (distance > this.cheatPatterns.get("teleport").threshold) {
                this.detectCheat(
                    "Teleport Hack",
                    `Teletransporte detectado: distancia ${distance.toFixed(2)}`,
                    playerId
                );
            }
        }

        // Verificar munición
        if (playerData.ammo > this.cheatPatterns.get("ammo_hack").threshold) {
            this.detectCheat(
                "Ammo Hack",
                `Munición imposible: ${playerData.ammo}`,
                playerId
            );
        }
    }

    // Calcular distancia entre dos puntos
    calculateDistance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
    }

    // Detectar y registrar cheat
    detectCheat(type, details, playerId = "unknown") {
        const cheatInfo = {
            type: type,
            details: details,
            timestamp: new Date().toISOString(),
            playerId: playerId,
            severity: this.getCheatSeverity(type),
        };

        this.detectedCheats.push(cheatInfo);
        this.log("DETECTADO", `CHEAT: ${type} - ${details}`, playerId);

        // Limitar el tamaño del historial
        if (this.detectedCheats.length > 500) {
            this.detectedCheats = this.detectedCheats.slice(-250);
        }

        return cheatInfo;
    }

    // Obtener severidad del cheat
    getCheatSeverity(type) {
        const severityMap = {
            "Speed Hack": "high",
            "Teleport Hack": "high",
            "Ammo Hack": "medium",
            "Position Hack": "medium",
            "Score Hack": "medium",
        };

        return severityMap[type] || "medium";
    }

    // Obtener reporte de cheats detectados
    getCheatReport() {
        return {
            totalDetected: this.detectedCheats.length,
            cheats: this.detectedCheats,
            suspiciousActivities: this.suspiciousActivities.slice(-100),
            logFile: this.currentLogFile,
            summary: this.getCheatSummary(),
        };
    }

    // Obtener resumen de cheats
    getCheatSummary() {
        const summary = {};
        this.detectedCheats.forEach((cheat) => {
            summary[cheat.type] = (summary[cheat.type] || 0) + 1;
        });
        return summary;
    }
}

module.exports = AntiCheatServidor;