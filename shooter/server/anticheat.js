const fs = require('fs');
const path = require('path');

function saveCheatReport(reportData) {
    try {
        // Guardar reports en la carpeta raíz `reports` (una carpeta arriba de server)
        const reportsDir = path.join(__dirname, '..', 'reports');

        // Crear directorio de reportes si no existe
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const reportFile = path.join(reportsDir, 'cheat_reports.json');
        let existingReports = [];

        // Leer reportes existentes
        if (fs.existsSync(reportFile)) {
            const fileContent = fs.readFileSync(reportFile, 'utf8');
            existingReports = JSON.parse(fileContent);
        }

        // Agregar nuevo reporte con timestamp de servidor
        existingReports.push({
            ...reportData,
            serverTimestamp: new Date().toISOString(),
            ip: reportData.ip || 'No disponible'
        });

        // Guardar archivo consolidado
        fs.writeFileSync(reportFile, JSON.stringify(existingReports, null, 2));

        console.log(`[ANTICHEAT] Reporte guardado: ${reportData.userId} - ${reportData.cheatType}`);

        // También guardar en archivo individual por fecha
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const individualFile = path.join(reportsDir, `reports_${dateStr}.json`);

        let dailyReports = [];
        if (fs.existsSync(individualFile)) {
            const dailyContent = fs.readFileSync(individualFile, 'utf8');
            dailyReports = JSON.parse(dailyContent);
        }

        dailyReports.push(reportData);
        fs.writeFileSync(individualFile, JSON.stringify(dailyReports, null, 2));

    } catch (error) {
        console.error('[ANTICHEAT] Error guardando reporte:', error);
    }
}

module.exports = {
    saveCheatReport,
};
