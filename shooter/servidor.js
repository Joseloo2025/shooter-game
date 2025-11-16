const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

// Usar la definición de Mapa centralizada en `mapa.js`
const Mapa = require('./mapa');
// Sistema de armas extraído a server/armas.js
const { SISTEMA_ARMAS, obtenerArmaPorId, obtenerSlotPorTipo, comprarArmaJugador, cambiarArmaJugador } = require('./server/armas');

const app = express();
const server = http.createServer(app);

// CONFIGURACIÓN MEJORADA del Socket.IO
const io = socketIo(server, {
    pingTimeout: 30000,
    pingInterval: 10000,
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// SISTEMA DE PERSONAJES CON ESTADÍSTICAS Y HABILIDADES
const SISTEMA_PERSONAJES = {
    1: {
        id: 1,
        nombre: "Soldado",
        estadisticas: {
            vidaMultiplicador: 1.2,      // +20% vida
            escudoMultiplicador: 1.0,    // Escudo normal
            velocidadMultiplicador: 1.0, // Velocidad normal
            dañoMultiplicador: 1.0,      // Daño normal
            regeneracionEscudo: 1.5,     // 50% más rápida
            resistenciaDano: 0.85        // 15% menos daño
        },
        habilidad: {
            nombre: "Resistencia Mejorada",
            descripcion: "Reduce daño recibido y regenera escudo más rápido por 5 segundos",
            duracion: 5000,
            cooldown: 30000,
            tipo: "defensiva"
        }
    },
    2: {
        id: 2,
        nombre: "Francotirador",
        estadisticas: {
            vidaMultiplicador: 0.85,     // -15% vida
            escudoMultiplicador: 0.9,    // -10% escudo
            velocidadMultiplicador: 0.9, // -10% velocidad
            dañoMultiplicador: 1.4,      // +40% daño con francotiradores
            precision: 1.15,             // +15% precisión
            vision: 1.3                  // +30% visión
        },
        habilidad: {
            nombre: "Disparo Preciso",
            descripcion: "Próximo disparo hace 200% de daño y revela enemigos",
            duracion: 0,
            cooldown: 35000,
            tipo: "ofensiva"
        }
    },
    3: {
        id: 3,
        nombre: "Asalto",
        estadisticas: {
            vidaMultiplicador: 1.0,
            escudoMultiplicador: 1.0,
            velocidadMultiplicador: 1.15, // +15% velocidad
            dañoMultiplicador: 1.0,
            velocidadRecarga: 0.7,        // 30% más rápido recargando
            velocidadDisparo: 1.1         // 10% más rápido disparando
        },
        habilidad: {
            nombre: "Carga Rápida",
            descripcion: "Aumenta velocidad 30% y no consume munición por 4 segundos",
            duracion: 4000,
            cooldown: 30000,
            tipo: "movimiento"
        }
    },
    4: {
        id: 4,
        nombre: "Médico",
        estadisticas: {
            vidaMultiplicador: 1.0,
            escudoMultiplicador: 1.25,    // +25% escudo
            velocidadMultiplicador: 1.0,
            dañoMultiplicador: 0.9,       // -10% daño
            curacionPasiva: 2,            // Cura 2 de vida por segundo
            radioCuracion: 150            // Radio de curación para aliados
        },
        habilidad: {
            nombre: "Campo de Curación",
            descripcion: "Cura 25% de vida a sí mismo y aliados cercanos",
            duracion: 0,
            cooldown: 40000,
            tipo: "apoyo"
        }
    },
    5: {
        id: 5,
        nombre: "Ingeniero",
        estadisticas: {
            vidaMultiplicador: 1.0,
            escudoMultiplicador: 1.2,     // +20% escudo
            velocidadMultiplicador: 0.9,  // -10% velocidad
            dañoMultiplicador: 1.0,
            capacidadMunicion: 1.25,      // +25% munición
            duracionCajas: 1.5            // Cajas duran 50% más
        },
        habilidad: {
            nombre: "Trampa de Rastreo",
            descripcion: "Coloca una trampa que revela enemigos en el mini-mapa por 10 segundos",
            duracion: 10000,              // 10 segundos de revelación
            cooldown: 30000,              // 30 segundos de cooldown
            tipo: "defensiva"
        }
    },
    6: {
        id: 6,
        nombre: "Comandante",
        estadisticas: {
            vidaMultiplicador: 1.15,      // +15% vida
            escudoMultiplicador: 1.0,
            velocidadMultiplicador: 1.0,
            dañoMultiplicador: 1.1,       // +10% daño
            buffEquipo: 1.2,              // +20% daño para equipo cercano
            radioBuff: 200                // Radio del buff para aliados
        },
        habilidad: {
            nombre: "Ataque Coordinado",
            descripcion: "Aumenta daño del equipo 20% y revela enemigos por 6 segundos",
            duracion: 6000,
            cooldown: 40000,
            tipo: "apoyo"
        }
    }
};

// SISTEMA_DE_ARMAS ahora está en `server/armas.js` y se importa arriba.

// La clase `Mapa` está centralizada en `mapa.js` y se requiere arriba.

// Almacenamiento de salas y jugadores
const salas = new Map();
const jugadores = new Map();

// Estadísticas globales
const estadisticasGlobales = {
    totalJugadoresConectados: 0,
    totalPartidasJugadas: 0,
    totalKills: 0,
    totalMuertes: 0,
    salasCreadas: 0,
    inicioServidor: new Date(),
};

// Configuración de balance del juego
const CONFIG_JUEGO = {
    DANO_BALA: 15,
    VELOCIDAD_BALA: 12,
    VIDA_MAXIMA: 100,
    ESCUDO_MAXIMO: 50,
    REGENERACION_ESCUDO: 3,
    TIEMPO_REGENERACION: 4000,
    VELOCIDAD_JUGADOR: 5,
    MAX_JUGADORES_POR_SALA: 8,
    TIEMPO_REAPARICION_CAJAS: 10000,
    MUNICION_INICIAL: 50,
    MUNICION_POR_CAJA: 30,
    MAX_MUNICION: 100,
    TIEMPO_PARTIDA: 300000,
    TIEMPO_TRANSICION: 5000,
};

// Contraseña de administrador
const ADMIN_PASSWORD = "admin123";

// Función para obtener la ruta del archivo de log con fecha
function obtenerRutaLog() {
    const ahora = new Date();
    const dia = ahora.getDate().toString().padStart(2, "0");
    const mes = (ahora.getMonth() + 1).toString().padStart(2, "0");
    const año = ahora.getFullYear();
    const nombreArchivo = `${dia}-${mes}-${año}.log`;

    // Crear carpeta logs si no existe
    const carpetaLogs = path.join(__dirname, "logs");
    if (!fs.existsSync(carpetaLogs)) {
        fs.mkdirSync(carpetaLogs, { recursive: true });
    }

    return path.join(carpetaLogs, nombreArchivo);
}

// Función para loggear eventos con timestamp
function logEvento(mensaje, tipo = "INFO") {
    const timestamp = new Date().toLocaleString();
    const logEntry = `[${timestamp}] [${tipo}] ${mensaje}`;
    console.log(logEntry);

    // Guardar en archivo de log con fecha
    const rutaLog = obtenerRutaLog();
    fs.appendFileSync(rutaLog, logEntry + "\n", "utf8");
}

// Función para mostrar estadísticas del servidor
function mostrarEstadisticasServidor() {
    logEvento("=== ESTADISTICAS DEL SERVIDOR ===", "STATS");
    logEvento(
        `Tiempo activo: ${Math.floor(
            (new Date() - estadisticasGlobales.inicioServidor) / 60000
        )} minutos`,
        "STATS"
    );
    logEvento(
        `Total jugadores conectados: ${estadisticasGlobales.totalJugadoresConectados}`,
        "STATS"
    );
    logEvento(
        `Total partidas jugadas: ${estadisticasGlobales.totalPartidasJugadas}`,
        "STATS"
    );
    logEvento(`Total kills: ${estadisticasGlobales.totalKills}`, "STATS");
    logEvento(`Total muertes: ${estadisticasGlobales.totalMuertes}`, "STATS");
    logEvento(`Salas creadas: ${estadisticasGlobales.salasCreadas}`, "STATS");
    logEvento(`Jugadores actuales: ${jugadores.size}`, "STATS");
    logEvento(`Salas activas: ${salas.size}`, "STATS");
    logEvento("=================================", "STATS");
}

// Generar código de sala único
function generarCodigoSala() {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "";
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    if (salas.has(codigo)) {
        return generarCodigoSala();
    }
    return codigo;
}

// Función para generar posición segura (sin colisiones)
function generarPosicionSegura(mapa) {
    let x, y;
    let intentos = 0;
    const maxIntentos = 100;

    do {
        x = Math.random() * 700 + 50;
        y = Math.random() * 500 + 50;
        intentos++;
    } while (mapa.colisiona(x, y, 20) && intentos < maxIntentos);

    if (intentos >= maxIntentos) {
        return { x: 400, y: 300 };
    }

    return { x, y };
}

// Función para generar cajas de munición
function generarCajasMunicion(sala) {
    sala.cajasMunicion = [];
    const numCajas = Math.min(3, Math.floor(sala.jugadores.size / 2) + 1);

    for (let i = 0; i < numCajas; i++) {
        const posicion = generarPosicionSegura(sala.mapa);
        sala.cajasMunicion.push({
            id: Math.random().toString(36).substr(2, 9),
            x: posicion.x,
            y: posicion.y,
            tipo: "municion",
            timestamp: Date.now(),
        });
    }
}

// Función para regenerar escudos
function regenerarEscudos(sala) {
    const ahora = Date.now();
    let necesitaActualizacion = false;

    sala.jugadores.forEach((jugadorId) => {
        const jugador = jugadores.get(jugadorId);
        if (
            jugador &&
            ahora - jugador.ultimoDano > CONFIG_JUEGO.TIEMPO_REGENERACION
        ) {
            if (jugador.escudo < jugador.maxEscudo) {
                // Aplicar multiplicador de regeneración según personaje
                const personaje = SISTEMA_PERSONAJES[jugador.personaje];
                const multiplicadorRegeneracion = personaje.estadisticas.regeneracionEscudo || 1;
                
                jugador.escudo = Math.min(
                    jugador.escudo + (CONFIG_JUEGO.REGENERACION_ESCUDO * multiplicadorRegeneracion),
                    jugador.maxEscudo
                );
                jugador.regenerandoEscudo = true;
                necesitaActualizacion = true;
            }
        } else if (
            jugador &&
            jugador.regenerandoEscudo &&
            ahora - jugador.ultimoDano <= CONFIG_JUEGO.TIEMPO_REGENERACION
        ) {
            jugador.regenerandoEscudo = false;
            necesitaActualizacion = true;
        }
    });

    if (necesitaActualizacion) {
        const jugadoresSala = Array.from(sala.jugadores).map((id) =>
            jugadores.get(id)
        );
        io.to(sala.codigo).emit("actualizarJugadores", jugadoresSala);
    }
}

// Función para verificar y limpiar salas vacías
function limpiarSalasVacias() {
    for (const [codigo, sala] of salas.entries()) {
        if (sala.jugadores.size === 0) {
            if (sala.intervalos) {
                clearInterval(sala.intervalos.escudo);
                clearInterval(sala.intervalos.cajas);
                clearInterval(sala.intervalos.tiempo);
            }
            salas.delete(codigo);
            logEvento(`Sala ${codigo} eliminada por estar vacía`, "CLEANUP");
        }
    }
}

// Función para determinar ganador de la partida
function determinarGanador(sala) {
    let maxKills = -1;
    let ganadores = [];

    sala.jugadores.forEach((jugadorId) => {
        const jugador = jugadores.get(jugadorId);
        if (jugador) {
            if (jugador.kills > maxKills) {
                maxKills = jugador.kills;
                ganadores = [jugador];
            } else if (jugador.kills === maxKills) {
                ganadores.push(jugador);
            }
        }
    });

    return ganadores;
}

// Función para cambiar al siguiente mapa
function cambiarMapa(sala) {
    sala.mapaActual++;

    if (sala.mapaActual > 3) {
        // Fin del ciclo de mapas
        const jugadoresFinal = Array.from(sala.jugadores).map((id) =>
            jugadores.get(id)
        );
        io.to(sala.codigo).emit("finCicloMapas", { jugadores: jugadoresFinal });

        estadisticasGlobales.totalPartidasJugadas++;
        logEvento(
            `Ciclo de mapas terminado en sala ${sala.codigo}. Partidas totales: ${estadisticasGlobales.totalPartidasJugadas}`,
            "GAME_END"
        );

        // Limpiar sala
        sala.jugadores.forEach((jugadorId) => {
            const jugador = jugadores.get(jugadorId);
            if (jugador) {
                jugador.sala = null;
            }
        });

        if (sala.intervalos) {
            clearInterval(sala.intervalos.escudo);
            clearInterval(sala.intervalos.cajas);
            clearInterval(sala.intervalos.tiempo);
        }
        salas.delete(sala.codigo);

        return;
    }

    // Crear nuevo mapa
    sala.mapa = new Mapa(sala.mapaActual);
    sala.tiempoRestante = CONFIG_JUEGO.TIEMPO_PARTIDA;
    sala.enTransicion = false;

    // Resetear estadísticas de jugadores pero mantener kills acumuladas
    sala.jugadores.forEach((jugadorId) => {
        const jugador = jugadores.get(jugadorId);
        if (jugador) {
            const posicion = generarPosicionSegura(sala.mapa);
            jugador.x = posicion.x;
            jugador.y = posicion.y;
            
            // Aplicar estadísticas del personaje
            const personaje = SISTEMA_PERSONAJES[jugador.personaje];
            jugador.vida = CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
            jugador.escudo = CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
            jugador.maxVida = CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
            jugador.maxEscudo = CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
            
            jugador.municion = CONFIG_JUEGO.MUNICION_INICIAL * (personaje.estadisticas.capacidadMunicion || 1);
            jugador.ultimoDano = Date.now();
            jugador.regenerandoEscudo = false;
            jugador.kills = 0;
            jugador.muertes = 0;
        }
    });

    generarCajasMunicion(sala);

    // REINICIAR SISTEMA DE REGENERACIÓN DE ESCUDOS
    if (sala.intervalos && sala.intervalos.escudo) {
        clearInterval(sala.intervalos.escudo);
    }

    const intervaloEscudo = setInterval(() => {
        if (salas.has(sala.codigo) && sala.enJuego && !sala.enTransicion) {
            regenerarEscudos(sala);
        } else {
            clearInterval(intervaloEscudo);
        }
    }, 1000);

    sala.intervalos.escudo = intervaloEscudo;

    // Reiniciar temporizador para el nuevo mapa
    iniciarTemporizador(sala);

    // Notificar a los clientes del cambio de mapa
    io.to(sala.codigo).emit("cambioMapa", {
        mapa: sala.mapaActual,
        tiempoRestante: sala.tiempoRestante,
        jugadores: Array.from(sala.jugadores).map((id) => jugadores.get(id)),
    });

    io.to(sala.codigo).emit("actualizarCajasMunicion", sala.cajasMunicion);

    logEvento(
        `Sala ${sala.codigo} cambió al mapa ${sala.mapaActual}`,
        "MAP_CHANGE"
    );
}

// Función para iniciar temporizador de partida
function iniciarTemporizador(sala) {
    if (sala.intervalos && sala.intervalos.tiempo) {
        clearInterval(sala.intervalos.tiempo);
    }

    sala.intervalos.tiempo = setInterval(() => {
        if (!sala.enJuego || sala.enTransicion) return;

        sala.tiempoRestante -= 1000;

        // Enviar actualización del tiempo a los clientes
        io.to(sala.codigo).emit("actualizarTiempo", {
            tiempoRestante: sala.tiempoRestante,
            minutos: Math.floor(sala.tiempoRestante / 60000),
            segundos: Math.floor((sala.tiempoRestante % 60000) / 1000),
        });

        // Verificar si el tiempo se acabó
        if (sala.tiempoRestante <= 0) {
            clearInterval(sala.intervalos.tiempo);
            finalizarPartida(sala);
        }
    }, 1000);
}

// Función para finalizar partida y determinar ganador
function finalizarPartida(sala) {
    sala.enTransicion = true;

    const ganadores = determinarGanador(sala);

    // Loggear estadísticas de la partida
    let statsMensaje = `Partida terminada en sala ${sala.codigo}, mapa ${sala.mapaActual}. `;
    if (ganadores.length === 1) {
        statsMensaje += `Ganador: ${ganadores[0].nombre} con ${ganadores[0].kills} kills`;
    } else if (ganadores.length > 1) {
        statsMensaje += `Empate entre: ${ganadores
            .map((g) => g.nombre)
            .join(", ")} con ${ganadores[0].kills} kills cada uno`;
    } else {
        statsMensaje += `No hay ganadores`;
    }

    logEvento(statsMensaje, "GAME_END");

    // Notificar fin de partida
    io.to(sala.codigo).emit("finPartida", {
        ganadores: ganadores,
        mapa: sala.mapaActual,
        esUltimoMapa: sala.mapaActual >= 3,
    });

    // Iniciar transición al siguiente mapa después de 5 segundos
    setTimeout(() => {
        cambiarMapa(sala);
    }, CONFIG_JUEGO.TIEMPO_TRANSICION);
}

// Configurar intervalos
setInterval(limpiarSalasVacias, 30000);
setInterval(mostrarEstadisticasServidor, 60000); // Mostrar stats cada minuto

// Sistema de verificación de munición en servidor
function verificarMunicion(jugadorId) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return false;

    return jugador.municion > 0;
}

// Consumir munición
function consumirMunicion(jugadorId, cantidad = 1) {
    const jugador = jugadores.get(jugadorId);
    if (jugador && jugador.municion >= cantidad) {
        jugador.municion -= cantidad;
        return true;
    }
    return false;
}

// Recargar munición desde caja
function recargarMunicion(jugadorId, cantidad) {
    const jugador = jugadores.get(jugadorId);
    if (jugador) {
        const maxMunicion = CONFIG_JUEGO.MAX_MUNICION * (SISTEMA_PERSONAJES[jugador.personaje].estadisticas.capacidadMunicion || 1);
        const espacioDisponible = maxMunicion - jugador.municion;
        const municionAAgregar = Math.min(cantidad, espacioDisponible);
        jugador.municion += municionAAgregar;
        return municionAAgregar;
    }
    return 0;
}

// Función para autenticar administrador
function autenticarAdmin(password) {
    return password === ADMIN_PASSWORD;
}

// Función para obtener estadísticas del servidor
function obtenerEstadisticasServidor() {
    return {
        ...estadisticasGlobales,
        jugadoresConectados: jugadores.size,
        salasActivas: salas.size,
        tiempoActivo: Math.floor(
            (new Date() - estadisticasGlobales.inicioServidor) / 60000
        ),
    };
}

// Función para administrar tiempo de sala
function administrarTiempoSala(codigoSala, accion, datos = {}) {
    const sala = salas.get(codigoSala);
    if (!sala || !sala.enJuego) {
        return { exito: false, mensaje: "Sala no encontrada o no en juego" };
    }

    switch (accion) {
        case "acelerar":
            const minutosAcelerar = datos.minutos || 1;
            sala.tiempoRestante = Math.max(
                0,
                sala.tiempoRestante - minutosAcelerar * 60000
            );
            logEvento(
                `Admin aceleró tiempo en sala ${codigoSala}: -${minutosAcelerar} min`,
                "ADMIN"
            );
            return {
                exito: true,
                mensaje: `Tiempo acelerado ${minutosAcelerar} minuto(s)`,
            };

        case "pausar":
            sala.tiempoPausado = !sala.tiempoPausado;
            if (sala.intervalos && sala.intervalos.tiempo) {
                if (sala.tiempoPausado) {
                    clearInterval(sala.intervalos.tiempo);
                } else {
                    iniciarTemporizador(sala);
                }
            }
            logEvento(
                `Admin ${sala.tiempoPausado ? "pausó" : "reanudó"
                } tiempo en sala ${codigoSala}`,
                "ADMIN"
            );
            return {
                exito: true,
                mensaje: `Tiempo ${sala.tiempoPausado ? "pausado" : "reanudado"}`,
            };

        case "saltar_mapa":
            finalizarPartida(sala);
            logEvento(`Admin saltó mapa en sala ${codigoSala}`, "ADMIN");
            return { exito: true, mensaje: "Saltando al siguiente mapa" };

        case "terminar_partida":
            sala.mapaActual = 3;
            finalizarPartida(sala);
            logEvento(`Admin terminó partida en sala ${codigoSala}`, "ADMIN");
            return { exito: true, mensaje: "Partida terminada" };

        default:
            return { exito: false, mensaje: "Acción no válida" };
    }
}

// Función para guardar reportes en el servidor
function saveCheatReport(reportData) {
    try {
        const reportsDir = path.join(__dirname, 'reports');

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

        // Agregar nuevo reporte
        existingReports.push({
            ...reportData,
            serverTimestamp: new Date().toISOString(),
            ip: reportData.ip || 'No disponible'
        });

        // Guardar archivo
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

// FUNCIONES DEL SISTEMA DE ARMAS
// Funciones de armas provistas por `server/armas.js` (importadas arriba)

function comprarArmaJugador(jugadorId, armaId) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return { exito: false, mensaje: "Jugador no encontrado" };

    const arma = obtenerArmaPorId(armaId);
    if (!arma) return { exito: false, mensaje: "Arma no válida" };

    if (jugador.oro >= arma.precio) {
        const slot = obtenerSlotPorTipo(arma.tipo);

        // Verificar si ya tiene un arma de este tipo
        if (jugador.armas[slot]) {
            // Ya tiene un arma de este tipo, reemplazar
            jugador.oro -= arma.precio;
            jugador.armas[slot] = armaId;
            jugador.estadisticasPersonaje.oroGastado += arma.precio;

            return {
                exito: true,
                mensaje: `Arma ${arma.nombre} comprada y equipada`,
                arma: arma,
                oroRestante: jugador.oro
            };
        } else {
            jugador.oro -= arma.precio;
            jugador.armas[slot] = armaId;
            jugador.estadisticasPersonaje.oroGastado += arma.precio;

            return {
                exito: true,
                mensaje: `Arma ${arma.nombre} comprada y equipada`,
                arma: arma,
                oroRestante: jugador.oro
            };
        }
    } else {
        return { exito: false, mensaje: "Oro insuficiente" };
    }
}

function cambiarArmaJugador(jugadorId, slot) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return false;

    if (jugador.armas[slot]) {
        jugador.armaActual = slot;
        return true;
    }
    return false;
}

function activarHabilidadJugador(jugadorId) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return { exito: false, mensaje: "Jugador no encontrado" };

    const ahora = Date.now();
    const personaje = SISTEMA_PERSONAJES[jugador.personaje];
    
    // Verificar cooldown
    if (jugador.habilidadCooldown && ahora - jugador.habilidadCooldown < personaje.habilidad.cooldown) {
        const tiempoRestante = Math.ceil((personaje.habilidad.cooldown - (ahora - jugador.habilidadCooldown)) / 1000);
        return { exito: false, mensaje: `Habilidad en cooldown: ${tiempoRestante}s` };
    }

    // Para el Ingeniero, la habilidad se maneja con "colocarTrampa"
    if (jugador.personaje === 5) {
        return { 
            exito: true, 
            mensaje: "Modo colocación activado - Haz clic para colocar la trampa" 
        };
    }

    // OBTENER LA SALA DEL JUGADOR
    const sala = salas.get(jugador.sala);
    if (!sala) return { exito: false, mensaje: "Jugador no está en una sala" };

    // Aplicar habilidad según personaje (para personajes que no sean Ingeniero)
    let efectoAplicado = false;
    
    switch (jugador.personaje) {
        case 1: // Soldado - Resistencia Mejorada
            jugador.habilidadActiva = {
                tipo: "resistencia",
                inicio: ahora,
                duracion: personaje.habilidad.duracion
            };
            efectoAplicado = true;
            break;
            
        case 2: // Francotirador - Disparo Preciso
            jugador.proximoDisparoCritico = true;
            jugador.habilidadActiva = {
                tipo: "disparoPreciso",
                inicio: ahora
            };
            efectoAplicado = true;
            break;
            
        case 3: // Asalto - Carga Rápida
            jugador.habilidadActiva = {
                tipo: "cargaRapida",
                inicio: ahora,
                duracion: personaje.habilidad.duracion
            };
            efectoAplicado = true;
            break;
            
        case 4: // Médico - Campo de Curación
            // Curar al médico
            const curacionMedico = jugador.maxVida * 0.25;
            jugador.vida = Math.min(jugador.vida + curacionMedico, jugador.maxVida);
            
            // Curar a jugadores cercanos
            sala.jugadores.forEach((idAliado) => {
                if (idAliado !== jugadorId) {
                    const aliado = jugadores.get(idAliado);
                    if (aliado) {
                        const distancia = Math.sqrt(
                            Math.pow(jugador.x - aliado.x, 2) + Math.pow(jugador.y - aliado.y, 2)
                        );
                        if (distancia <= personaje.estadisticas.radioCuracion) {
                            const curacionAliado = aliado.maxVida * 0.25;
                            aliado.vida = Math.min(aliado.vida + curacionAliado, aliado.maxVida);
                        }
                    }
                }
            });
            efectoAplicado = true;
            break;
            
        case 6: // Comandante - Ataque Coordinado
            jugador.habilidadActiva = {
                tipo: "ataqueCoordinado",
                inicio: ahora,
                duracion: personaje.habilidad.duracion
            };
            
            // Aplicar buff a jugadores cercanos
            sala.jugadores.forEach((idAliado) => {
                const aliado = jugadores.get(idAliado);
                if (aliado) {
                    const distancia = Math.sqrt(
                        Math.pow(jugador.x - aliado.x, 2) + Math.pow(jugador.y - aliado.y, 2)
                    );
                    if (distancia <= personaje.estadisticas.radioBuff) {
                        aliado.buffAtaque = {
                            multiplicador: personaje.estadisticas.buffEquipo,
                            inicio: ahora,
                            duracion: personaje.habilidad.duracion
                        };
                    }
                }
            });
            efectoAplicado = true;
            break;
    }

    if (efectoAplicado) {
        jugador.habilidadCooldown = ahora;
        return { exito: true, mensaje: `Habilidad ${personaje.habilidad.nombre} activada` };
    } else {
        return { exito: false, mensaje: "Error al activar habilidad" };
    }
}

// Función para procesar efectos de habilidades activas
function procesarHabilidadesActivas(sala) {
    const ahora = Date.now();
    let necesitaActualizacion = false;

    // Procesar habilidades de jugadores
    sala.jugadores.forEach((jugadorId) => {
        const jugador = jugadores.get(jugadorId);
        if (jugador && jugador.habilidadActiva) {
            const personaje = SISTEMA_PERSONAJES[jugador.personaje];
            
            // Verificar si la habilidad ha expirado
            if (jugador.habilidadActiva.duracion && ahora - jugador.habilidadActiva.inicio > jugador.habilidadActiva.duracion) {
                jugador.habilidadActiva = null;
                necesitaActualizacion = true;
            }
            
            // Procesar efectos continuos
            switch (jugador.personaje) {
                case 4: // Médico - Curación pasiva
                    if (personaje.estadisticas.curacionPasiva) {
                        jugador.vida = Math.min(jugador.vida + personaje.estadisticas.curacionPasiva, jugador.maxVida);
                        necesitaActualizacion = true;
                    }
                    break;
            }
        }
        
        // Procesar buffs de ataque
        if (jugador && jugador.buffAtaque && ahora - jugador.buffAtaque.inicio > jugador.buffAtaque.duracion) {
            jugador.buffAtaque = null;
            necesitaActualizacion = true;
        }
    });

    // Procesar torretas
    if (sala.torretas) {
        for (let i = sala.torretas.length - 1; i >= 0; i--) {
            const torreta = sala.torretas[i];
            
            // Verificar si la torreta ha expirado
            if (ahora - torreta.inicio > torreta.duracion) {
                sala.torretas.splice(i, 1);
                necesitaActualizacion = true;
                continue;
            }
            
            // Buscar enemigos cercanos para disparar
            let objetivoEncontrado = false;
            sala.jugadores.forEach((jugadorId) => {
                if (!objetivoEncontrado && jugadorId !== torreta.jugadorId) {
                    const enemigo = jugadores.get(jugadorId);
                    if (enemigo) {
                        const distancia = Math.sqrt(
                            Math.pow(torreta.x - enemigo.x, 2) + Math.pow(torreta.y - enemigo.y, 2)
                        );
                        if (distancia <= torreta.radio) {
                            // Disparar a enemigo
                            aplicarDano(enemigo.id, torreta.daño, torreta.jugadorId);
                            objetivoEncontrado = true;
                        }
                    }
                }
            });
        }
    }

    return necesitaActualizacion;
}

// Función para procesar trampas activas
function procesarTrampas(sala) {
    const ahora = Date.now();
    let necesitaActualizacion = false;

    if (sala.trampas) {
        for (let i = sala.trampas.length - 1; i >= 0; i--) {
            const trampa = sala.trampas[i];
            
            // Verificar si la trampa ha expirado
            if (ahora - trampa.inicio > trampa.duracion) {
                sala.trampas.splice(i, 1);
                necesitaActualizacion = true;
                continue;
            }
            
            // Si la trampa no está activada, buscar enemigos cercanos
            if (!trampa.activada) {
                sala.jugadores.forEach((jugadorId) => {
                    if (jugadorId !== trampa.jugadorId) {
                        const enemigo = jugadores.get(jugadorId);
                        if (enemigo) {
                            const distancia = Math.sqrt(
                                Math.pow(trampa.x - enemigo.x, 2) + Math.pow(trampa.y - enemigo.y, 2)
                            );
                            if (distancia <= trampa.radio) {
                                // Activar la trampa
                                trampa.activada = true;
                                trampa.enemigoRevelado = jugadorId;
                                trampa.tiempoActivacion = ahora;
                                
                                // Notificar a todos los jugadores sobre el enemigo revelado
                                io.to(sala.codigo).emit("enemigoRevelado", {
                                    enemigoId: jugadorId,
                                    duracion: trampa.duracion,
                                    trampaId: trampa.id
                                });
                                
                                necesitaActualizacion = true;
                            }
                        }
                    }
                });
            } else {
                // Si la trampa está activada, verificar si el efecto ha terminado
                if (ahora - trampa.tiempoActivacion > trampa.duracion) {
                    sala.trampas.splice(i, 1);
                    necesitaActualizacion = true;
                }
            }
        }
    }

    return necesitaActualizacion;
}

// Función para aplicar daño considerando habilidades activas
function aplicarDano(jugadorId, danoBase, atacanteId) {
    const jugador = jugadores.get(jugadorId);
    const atacante = atacanteId ? jugadores.get(atacanteId) : null;
    
    if (!jugador) return;

    let danoFinal = danoBase;

    // Aplicar multiplicador de daño del atacante
    if (atacante) {
        const personajeAtacante = SISTEMA_PERSONAJES[atacante.personaje];
        danoFinal *= personajeAtacante.estadisticas.dañoMultiplicador;
        
        // Aplicar buff de ataque si está activo
        if (atacante.buffAtaque) {
            danoFinal *= atacante.buffAtaque.multiplicador;
        }
        
        // Disparo crítico del francotirador
        if (atacante.proximoDisparoCritico) {
            danoFinal *= 2; // 200% de daño
            atacante.proximoDisparoCritico = false;
        }
    }

    // Aplicar resistencia del jugador
    const personajeJugador = SISTEMA_PERSONAJES[jugador.personaje];
    if (jugador.habilidadActiva && jugador.habilidadActiva.tipo === "resistencia") {
        danoFinal *= personajeJugador.estadisticas.resistenciaDano;
    }

    // Aplicar daño
    jugador.ultimoDano = Date.now();
    jugador.regenerandoEscudo = false;

    if (jugador.escudo > 0) {
        const danoEscudo = Math.min(danoFinal, jugador.escudo);
        jugador.escudo -= danoEscudo;
        jugador.vida -= danoFinal - danoEscudo;
    } else {
        jugador.vida -= danoFinal;
    }

    return danoFinal;
}

// EVENTOS PRINCIPALES DEL SOCKET
io.on("connection", (socket) => {
    estadisticasGlobales.totalJugadoresConectados++;
    logEvento(
        `Usuario conectado: ${socket.id}. Total: ${estadisticasGlobales.totalJugadoresConectados}`,
        "CONNECTION"
    );

    // Enviar configuración al cliente
    socket.emit("configuracionJuego", CONFIG_JUEGO);

    // Evento para autenticar administrador
    socket.on("autenticarAdmin", (password) => {
        if (autenticarAdmin(password)) {
            socket.esAdmin = true;
            socket.emit("adminAutenticado", true);
            logEvento(`Administrador autenticado: ${socket.id}`, "ADMIN");
        } else {
            socket.emit("adminAutenticado", false);
        }
    });

    // Evento para obtener estadísticas del servidor
    socket.on("obtenerEstadisticas", () => {
        if (socket.esAdmin) {
            socket.emit("estadisticasServidor", obtenerEstadisticasServidor());
        }
    });

    // Evento para administrar tiempo de sala
    socket.on("adminTiempo", (data) => {
        if (!socket.esAdmin) {
            socket.emit("errorAdmin", "No autorizado");
            return;
        }

        const resultado = administrarTiempoSala(
            data.codigoSala,
            data.accion,
            data.datos
        );
        socket.emit("resultadoAdmin", resultado);

        // Notificar a todos en la sala sobre acción administrativa
        if (resultado.exito) {
            io.to(data.codigoSala).emit("notificacionAdmin", {
                mensaje: `Administrador: ${resultado.mensaje}`,
                tipo: "info",
            });
        }
    });

    // Evento para reportes anti-cheat
    socket.on('antiCheatReport', (reportData) => {
        console.log('[ANTICHEAT] Reporte recibido del cliente:', reportData);
        saveCheatReport(reportData);

        // Tomar acciones adicionales según la severidad
        if (reportData.severity === 'high') {
            // Expulsar jugador automáticamente por cheats graves
            const jugador = jugadores.get(socket.id);
            if (jugador) {
                socket.emit('antiCheatKick', {
                    reason: reportData.cheatType,
                    message: 'Has sido expulsado por uso de hacks'
                });
                socket.disconnect();
            }
        }
    });

    // Evento para forzar inicio de juego
    socket.on("adminForzarInicio", (codigoSala) => {
        if (!socket.esAdmin) {
            socket.emit("errorAdmin", "No autorizado");
            return;
        }

        const sala = salas.get(codigoSala);
        if (sala && !sala.enJuego) {
            // Simular evento de iniciar juego
            socket.emit("iniciarJuego", codigoSala);
            logEvento(`Admin forzó inicio en sala ${codigoSala}`, "ADMIN");
        }
    });

    // Evento para expulsar todos los jugadores
    socket.on("adminExpulsarTodos", (codigoSala) => {
        if (!socket.esAdmin) {
            socket.emit("errorAdmin", "No autorizado");
            return;
        }

        const sala = salas.get(codigoSala);
        if (sala) {
            sala.jugadores.forEach((jugadorId) => {
                const jugador = jugadores.get(jugadorId);
                if (jugador) {
                    io.to(jugadorId).emit("expulsado", "Expulsado por administrador");
                    jugador.sala = null;
                }
            });
            sala.jugadores.clear();
            logEvento(`Admin expulsó a todos de sala ${codigoSala}`, "ADMIN");
        }
    });

    // Evento para actualizar el nombre del jugador
    socket.on("actualizarNombre", (nombre) => {
        const jugador = jugadores.get(socket.id);
        if (jugador) {
            const nombreLimpio = (nombre || "Jugador")
                .toString()
                .substring(0, 15)
                .trim();
            jugador.nombre = nombreLimpio || "Jugador";

            const sala = salas.get(jugador.sala);
            if (sala) {
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
            }
        }
    });

    // Evento para cambiar personaje
    socket.on("cambiarPersonaje", (personajeId) => {
        const jugador = jugadores.get(socket.id);
        if (jugador && personajeId >= 1 && personajeId <= 6) {
            const personajeAnterior = jugador.personaje;
            jugador.personaje = personajeId;
            
            // Aplicar estadísticas del nuevo personaje
            const personaje = SISTEMA_PERSONAJES[personajeId];
            jugador.maxVida = CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
            jugador.maxEscudo = CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
            
            // Ajustar vida y escudo actual según nuevos máximos
            jugador.vida = Math.min(jugador.vida, jugador.maxVida);
            jugador.escudo = Math.min(jugador.escudo, jugador.maxEscudo);

            io.to(jugador.sala).emit("personajeCambiado", {
                jugadorId: socket.id,
                personajeId: personajeId,
            });

            const sala = salas.get(jugador.sala);
            if (sala) {
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
            }

            logEvento(
                `Jugador ${jugador.nombre} cambió de personaje ${personajeAnterior} a ${personajeId}`,
                "PLAYER"
            );
        }
    });

    // EVENTO PARA ACTIVAR HABILIDAD
    socket.on("activarHabilidad", () => {
        const resultado = activarHabilidadJugador(socket.id);
        socket.emit("resultadoHabilidad", resultado);
        
        if (resultado.exito) {
            const jugador = jugadores.get(socket.id);
            const sala = salas.get(jugador.sala);
            if (sala) {
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
                
                // Notificar a todos sobre habilidad activada
                io.to(jugador.sala).emit("habilidadActivada", {
                    jugadorId: socket.id,
                    jugadorNombre: jugador.nombre,
                    personajeId: jugador.personaje,
                    habilidad: SISTEMA_PERSONAJES[jugador.personaje].habilidad.nombre
                });
            }

            logEvento(
                `Jugador ${jugador.nombre} activó habilidad: ${SISTEMA_PERSONAJES[jugador.personaje].habilidad.nombre}`,
                "HABILIDAD"
            );
        }
    });
	
    // AGREGAR en la sección de eventos del socket, después del evento "activarHabilidad"
    socket.on("colocarTrampa", (data) => {
        const jugador = jugadores.get(socket.id);
        if (!jugador || jugador.personaje !== 5) {
            socket.emit("resultadoHabilidad", { exito: false, mensaje: "Solo el Ingeniero puede colocar trampas" });
            return;
        }
    
        const ahora = Date.now();
        const personaje = SISTEMA_PERSONAJES[5]; // Ingeniero
        
        // Verificar cooldown
        if (jugador.habilidadCooldown && ahora - jugador.habilidadCooldown < personaje.habilidad.cooldown) {
            const tiempoRestante = Math.ceil((personaje.habilidad.cooldown - (ahora - jugador.habilidadCooldown)) / 1000);
            socket.emit("resultadoHabilidad", { exito: false, mensaje: `Habilidad en cooldown: ${tiempoRestante}s` });
            return;
        }
    
        const sala = salas.get(jugador.sala);
        if (!sala) {
            socket.emit("resultadoHabilidad", { exito: false, mensaje: "Jugador no está en una sala" });
            return;
        }
    
        // Verificar que la posición no colisione
        if (sala.mapa.colisiona(data.x, data.y, 10)) {
            socket.emit("resultadoHabilidad", { exito: false, mensaje: "No se puede colocar trampa en esta posición" });
            return;
        }
    
        // Crear nueva trampa
        sala.trampas = sala.trampas || [];
        const nuevaTrampa = {
            id: Math.random().toString(36).substr(2, 9),
            x: data.x,
            y: data.y,
            jugadorId: socket.id,
            inicio: ahora,
            duracion: personaje.habilidad.duracion,
            radio: 30,
            activada: false,
            enemigoRevelado: null
        };
        sala.trampas.push(nuevaTrampa);
        
        // Aplicar cooldown
        jugador.habilidadCooldown = ahora;
        
        // Notificar a todos los jugadores sobre la nueva trampa
        io.to(sala.codigo).emit("actualizarTrampas", sala.trampas);
        io.to(sala.codigo).emit("habilidadActivada", {
            jugadorId: socket.id,
            jugadorNombre: jugador.nombre,
            personajeId: jugador.personaje,
            habilidad: personaje.habilidad.nombre
        });
    
        // Actualizar jugadores
        const jugadoresSala = Array.from(sala.jugadores).map((id) =>
            jugadores.get(id)
        );
        io.to(sala.codigo).emit("actualizarJugadores", jugadoresSala);
    
        socket.emit("resultadoHabilidad", { 
            exito: true, 
            mensaje: "Trampa colocada exitosamente" 
        });
    
        logEvento(
            `Jugador ${jugador.nombre} colocó una trampa en (${Math.round(data.x)}, ${Math.round(data.y)})`,
            "HABILIDAD"
        );
    });	

    // EVENTOS DEL SISTEMA DE ARMAS Y TIENDA
    socket.on("comprarArma", (data) => {
        const resultado = comprarArmaJugador(jugadores, socket.id, data.armaId);
        socket.emit("armaComprada", resultado);

        if (resultado.exito) {
            // Actualizar jugadores en la sala
            const jugador = jugadores.get(socket.id);
            const sala = salas.get(jugador.sala);
            if (sala) {
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
            }

            logEvento(
                `Jugador ${jugador.nombre} compró ${resultado.arma.nombre} por ${resultado.arma.precio} oro`,
                "TIENDA"
            );
        }
    });

    socket.on("cambiarArma", (slot) => {
        if (cambiarArmaJugador(jugadores, socket.id, slot)) {
            socket.emit("armaCambiada", { slot: slot });

            const jugador = jugadores.get(socket.id);
            logEvento(
                `Jugador ${jugador.nombre} cambió al arma en slot ${slot}`,
                "ARMA"
            );
        }
    });

    // Evento para crear una nueva sala
    socket.on("crearSala", () => {
        const jugadorExistente = jugadores.get(socket.id);
        if (jugadorExistente) {
            socket.emit("errorUnirse", "Ya estás en una sala");
            return;
        }

        const codigoSala = generarCodigoSala();
        estadisticasGlobales.salasCreadas++;

        salas.set(codigoSala, {
            codigo: codigoSala,
            jugadores: new Set([socket.id]),
            enJuego: false,
            enTransicion: false,
            tiempoPausado: false,
            creador: socket.id,
            mapa: new Mapa(1),
            mapaActual: 1,
            tiempoRestante: CONFIG_JUEGO.TIEMPO_PARTIDA,
            cajasMunicion: [],
            torretas: [],
            timestampCreacion: Date.now(),
            intervalos: {},
        });

        socket.join(codigoSala);

        const sala = salas.get(codigoSala);
        const posicion = generarPosicionSegura(sala.mapa);

        // Aplicar estadísticas base del personaje 1 (Soldado)
        const personajeBase = SISTEMA_PERSONAJES[1];
        
        jugadores.set(socket.id, {
            id: socket.id,
            sala: codigoSala,
            x: posicion.x,
            y: posicion.y,
            angulo: 0,
            vida: CONFIG_JUEGO.VIDA_MAXIMA * personajeBase.estadisticas.vidaMultiplicador,
            escudo: CONFIG_JUEGO.ESCUDO_MAXIMO * personajeBase.estadisticas.escudoMultiplicador,
            maxVida: CONFIG_JUEGO.VIDA_MAXIMA * personajeBase.estadisticas.vidaMultiplicador,
            maxEscudo: CONFIG_JUEGO.ESCUDO_MAXIMO * personajeBase.estadisticas.escudoMultiplicador,
            municion: CONFIG_JUEGO.MUNICION_INICIAL,
            maxMunicion: CONFIG_JUEGO.MAX_MUNICION,
            esCreador: true,
            nombre: "Jugador",
            personaje: 1,
            kills: 0,
            muertes: 0,
            killsAcumuladas: 0,
            ultimoDano: Date.now(),
            regenerandoEscudo: false,
            ultimaActualizacion: Date.now(),
            // SISTEMA DE ARMAS Y ORO
            oro: SISTEMA_ARMAS.ORO_INICIAL,
            armas: {
                1: 1, // Pistola básica por defecto
                2: null,
                3: null,
                4: null,
                5: null,
                6: null
            },
            armaActual: 1,
            // SISTEMA DE HABILIDADES
            habilidadActiva: null,
            habilidadCooldown: null,
            proximoDisparoCritico: false,
            buffAtaque: null,
            estadisticasPersonaje: {
                kills: 0,
                muertes: 0,
                oroGanado: 0,
                oroGastado: 0,
                disparos: 0,
                precision: 0,
                habilidadesUsadas: 0,
                curacionAportada: 0,
                dañoRecibido: 0,
                dañoInfligido: 0
            }
        });

        socket.emit("salaCreada", codigoSala);

        logEvento(
            `Sala creada: ${codigoSala} por ${socket.id}. Total salas: ${salas.size}`,
            "ROOM"
        );
    });

    // Evento para unirse a una sala existente
    socket.on("unirseSala", (codigoSala) => {
        const sala = salas.get(codigoSala.toUpperCase());

        if (!sala) {
            socket.emit("errorUnirse", "Sala no encontrada");
            return;
        }

        if (sala.enJuego && sala.enTransicion) {
            socket.emit(
                "errorUnirse",
                "La partida está en transición, espera un momento"
            );
            return;
        }

        if (sala.jugadores.size >= CONFIG_JUEGO.MAX_JUGADORES_POR_SALA) {
            socket.emit(
                "errorUnirse",
                `La sala está llena (máximo ${CONFIG_JUEGO.MAX_JUGADORES_POR_SALA} jugadores)`
            );
            return;
        }

        if (sala.jugadores.has(socket.id)) {
            socket.emit("errorUnirse", "Ya estás en esta sala");
            return;
        }

        socket.join(codigoSala);
        sala.jugadores.add(socket.id);

        const posicion = generarPosicionSegura(sala.mapa);

        // Aplicar estadísticas base del personaje 1 (Soldado)
        const personajeBase = SISTEMA_PERSONAJES[1];

        jugadores.set(socket.id, {
            id: socket.id,
            sala: codigoSala,
            x: posicion.x,
            y: posicion.y,
            angulo: 0,
            vida: CONFIG_JUEGO.VIDA_MAXIMA * personajeBase.estadisticas.vidaMultiplicador,
            escudo: CONFIG_JUEGO.ESCUDO_MAXIMO * personajeBase.estadisticas.escudoMultiplicador,
            maxVida: CONFIG_JUEGO.VIDA_MAXIMA * personajeBase.estadisticas.vidaMultiplicador,
            maxEscudo: CONFIG_JUEGO.ESCUDO_MAXIMO * personajeBase.estadisticas.escudoMultiplicador,
            municion: CONFIG_JUEGO.MUNICION_INICIAL,
            maxMunicion: CONFIG_JUEGO.MAX_MUNICION,
            esCreador: false,
            nombre: "Jugador",
            personaje: 1,
            kills: 0,
            muertes: 0,
            killsAcumuladas: 0,
            ultimoDano: Date.now(),
            regenerandoEscudo: false,
            ultimaActualizacion: Date.now(),
            // SISTEMA DE ARMAS Y ORO
            oro: SISTEMA_ARMAS.ORO_INICIAL,
            armas: {
                1: 1, // Pistola básica por defecto
                2: null,
                3: null,
                4: null,
                5: null,
                6: null
            },
            armaActual: 1,
            // SISTEMA DE HABILIDADES
            habilidadActiva: null,
            habilidadCooldown: null,
            proximoDisparoCritico: false,
            buffAtaque: null,
            estadisticasPersonaje: {
                kills: 0,
                muertes: 0,
                oroGanado: 0,
                oroGastado: 0,
                disparos: 0,
                precision: 0,
                habilidadesUsadas: 0,
                curacionAportada: 0,
                dañoRecibido: 0,
                dañoInfligido: 0
            }
        });

        socket.emit("unidoSala", codigoSala);

        const jugadoresSala = Array.from(sala.jugadores).map((id) =>
            jugadores.get(id)
        );
        io.to(codigoSala).emit("actualizarJugadores", jugadoresSala);

        // Enviar información del tiempo actual si la partida está en curso
        if (sala.enJuego) {
            socket.emit("actualizarTiempo", {
                tiempoRestante: sala.tiempoRestante,
                minutos: Math.floor(sala.tiempoRestante / 60000),
                segundos: Math.floor((sala.tiempoRestante % 60000) / 1000),
            });

            socket.emit("cambioMapa", {
                mapa: sala.mapaActual,
                tiempoRestante: sala.tiempoRestante,
                jugadores: jugadoresSala,
            });

            socket.emit("actualizarCajasMunicion", sala.cajasMunicion);
        }

        logEvento(
            `Jugador ${socket.id} se unió a sala ${codigoSala}. Total jugadores: ${sala.jugadores.size}`,
            "ROOM"
        );
    });

    // Evento para iniciar el juego
    socket.on("iniciarJuego", (codigoSala) => {
        const sala = salas.get(codigoSala);
        if (
            sala &&
            (socket.id === sala.creador || socket.esAdmin) &&
            !sala.enJuego
        ) {
            if (sala.jugadores.size < 2 && !socket.esAdmin) {
                socket.emit(
                    "errorUnirse",
                    "Se necesitan al menos 2 jugadores para comenzar"
                );
                return;
            }

            sala.enJuego = true;
            sala.mapaActual = 1;
            sala.mapa = new Mapa(1);
            sala.tiempoRestante = CONFIG_JUEGO.TIEMPO_PARTIDA;
            sala.tiempoPausado = false;

            generarCajasMunicion(sala);

            // Reiniciar estadísticas de todos los jugadores
            sala.jugadores.forEach((jugadorId) => {
                const jugador = jugadores.get(jugadorId);
                if (jugador) {
                    const personaje = SISTEMA_PERSONAJES[jugador.personaje];
                    
                    jugador.kills = 0;
                    jugador.muertes = 0;
                    jugador.killsAcumuladas = 0;
                    jugador.vida = CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
                    jugador.escudo = CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
                    jugador.maxVida = CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
                    jugador.maxEscudo = CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
                    jugador.municion = CONFIG_JUEGO.MUNICION_INICIAL * (personaje.estadisticas.capacidadMunicion || 1);
                    jugador.ultimoDano = Date.now();
                    jugador.regenerandoEscudo = false;
                    jugador.habilidadActiva = null;
                    jugador.habilidadCooldown = null;
                    jugador.proximoDisparoCritico = false;
                    jugador.buffAtaque = null;

                    const posicion = generarPosicionSegura(sala.mapa);
                    jugador.x = posicion.x;
                    jugador.y = posicion.y;
                }
            });

            io.to(codigoSala).emit("juegoIniciado");
            io.to(codigoSala).emit("actualizarCajasMunicion", sala.cajasMunicion);

            // Iniciar temporizador de partida
            iniciarTemporizador(sala);

            logEvento(
                `Juego iniciado en sala: ${codigoSala} con ${sala.jugadores.size} jugadores`,
                "GAME_START"
            );

            // SISTEMA DE REGENERACIÓN DE ESCUDOS
            const intervaloEscudo = setInterval(() => {
                if (
                    salas.has(codigoSala) &&
                    sala.enJuego &&
                    !sala.enTransicion &&
                    !sala.tiempoPausado
                ) {
                    regenerarEscudos(sala);
                } else {
                    clearInterval(intervaloEscudo);
                }
            }, 1000);

            // SISTEMA DE HABILIDADES Y TRAMPAS
            const intervaloHabilidades = setInterval(() => {
                if (
                    salas.has(codigoSala) &&
                    sala.enJuego &&
                    !sala.enTransicion &&
                    !sala.tiempoPausado
                ) {
                    let actualizacionHabilidades = procesarHabilidadesActivas(sala);
                    let actualizacionTrampas = procesarTrampas(sala);
                    
                    if (actualizacionHabilidades || actualizacionTrampas) {
                        const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                            jugadores.get(id)
                        );
                        io.to(codigoSala).emit("actualizarJugadores", jugadoresSala);
                        
                        // Actualizar trampas si hay cambios
                        if (actualizacionTrampas) {
                            io.to(codigoSala).emit("actualizarTrampas", sala.trampas);
                        }
                    }
                } else {
                    clearInterval(intervaloHabilidades);
                }
            }, 1000);

            const intervaloCajas = setInterval(() => {
                if (
                    salas.has(codigoSala) &&
                    sala.enJuego &&
                    !sala.enTransicion &&
                    !sala.tiempoPausado
                ) {
                    if (sala.cajasMunicion.length < 3) {
                        generarCajasMunicion(sala);
                        io.to(codigoSala).emit(
                            "actualizarCajasMunicion",
                            sala.cajasMunicion
                        );
                        logEvento(
                            `Cajas de munición regeneradas en sala ${codigoSala}`,
                            "GAME"
                        );
                    }
                } else {
                    clearInterval(intervaloCajas);
                }
            }, CONFIG_JUEGO.TIEMPO_REAPARICION_CAJAS);

            sala.intervalos.escudo = intervaloEscudo;
            sala.intervalos.habilidades = intervaloHabilidades;
            sala.intervalos.cajas = intervaloCajas;
        }
    });

    // EVENTO MEJORADO: Actualización de posición optimizada
    socket.on("actualizarPosicion", (datos) => {
        const jugador = jugadores.get(socket.id);
        if (
            jugador &&
            datos &&
            typeof datos.x === "number" &&
            typeof datos.y === "number"
        ) {
            const nuevaX = Math.max(25, Math.min(775, datos.x));
            const nuevaY = Math.max(25, Math.min(575, datos.y));

            const sala = salas.get(jugador.sala);
            if (
                sala &&
                !sala.enTransicion &&
                !sala.mapa.colisiona(nuevaX, nuevaY, 15)
            ) {
                jugador.x = nuevaX;
                jugador.y = nuevaY;
                jugador.angulo = datos.angulo || 0;
                jugador.ultimaActualizacion = Date.now();

                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
            }
        }
    });

    // EVENTO MEJORADO: Disparar con verificación de munición
    socket.on("disparar", (datosDisparo) => {
        const jugador = jugadores.get(socket.id);

        if (!jugador || !verificarMunicion(socket.id)) {
            return;
        }

        if (datosDisparo && typeof datosDisparo.angulo === "number") {
            if (!consumirMunicion(socket.id, 1)) {
                return;
            }

            const disparoValido = {
                x: jugador.x,
                y: jugador.y,
                angulo: datosDisparo.angulo,
                velocidad: CONFIG_JUEGO.VELOCIDAD_BALA,
                jugadorId: socket.id,
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
            };

            io.to(jugador.sala).emit("nuevoDisparo", disparoValido);

            const sala = salas.get(jugador.sala);
            if (sala) {
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
            }
        }
    });

    // EVENTO MEJORADO: Recoger munición con límites
    socket.on("recogerMunicion", (cajaId) => {
        const jugador = jugadores.get(socket.id);
        if (jugador) {
            const sala = salas.get(jugador.sala);
            const cajaIndex = sala.cajasMunicion.findIndex((c) => c.id === cajaId);

            if (cajaIndex !== -1) {
                sala.cajasMunicion.splice(cajaIndex, 1);

                const municionRecibida = recargarMunicion(
                    socket.id,
                    CONFIG_JUEGO.MUNICION_POR_CAJA
                );

                io.to(jugador.sala).emit("cajaRecogida", {
                    cajaId: cajaId,
                    jugadorId: socket.id,
                    municionRecibida: municionRecibida,
                    municionActual: jugador.municion,
                });

                io.to(jugador.sala).emit("actualizarCajasMunicion", sala.cajasMunicion);

                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);

                logEvento(
                    `Jugador ${jugador.nombre} recogió ${municionRecibida} balas. Total: ${jugador.municion}`,
                    "GAME"
                );
            }
        }
    });

    // EVENTO CORREGIDO: Jugador golpeado con daño real del arma y habilidades
    socket.on("jugadorGolpeado", (data) => {
        const jugadorGolpeado = jugadores.get(data.jugadorId);
        const jugadorDisparador = jugadores.get(data.disparadorId);

        if (jugadorGolpeado && jugadorGolpeado.id !== data.disparadorId && jugadorDisparador) {
            // OBTENER DAÑO REAL DEL ARMA DEL DISPARADOR
            let dano = CONFIG_JUEGO.DANO_BALA; // Daño por defecto

            if (jugadorDisparador.armaActual && jugadorDisparador.armas) {
                const armaId = jugadorDisparador.armas[jugadorDisparador.armaActual];
                if (armaId) {
                    const arma = SISTEMA_ARMAS.ARMAS_DISPONIBLES[armaId];
                    if (arma) {
                        dano = arma.daño;

                        // Para escopetas, aplicar daño por proyectil
                        if (arma.tipo === 'escopeta' && arma.proyectiles) {
                            // Simular múltiples proyectiles (daño total = daño * proyectiles)
                            dano = arma.daño * arma.proyectiles;
                        }
                    }
                }
            }

            // APLICAR SISTEMA DE DAÑO CON HABILIDADES
            const danoFinal = aplicarDano(jugadorGolpeado.id, dano, jugadorDisparador.id);

            if (jugadorGolpeado.vida <= 0) {
                jugadorGolpeado.muertes++;
                estadisticasGlobales.totalMuertes++;
                jugadorGolpeado.estadisticasPersonaje.dañoRecibido += danoFinal;

                if (jugadorDisparador) {
                    jugadorDisparador.kills++;
                    jugadorDisparador.killsAcumuladas++;
                    estadisticasGlobales.totalKills++;
                    jugadorDisparador.estadisticasPersonaje.dañoInfligido += danoFinal;

                    // SISTEMA DE ORO - Agregar oro por kill
                    jugadorDisparador.oro += SISTEMA_ARMAS.ORO_POR_KILL;
                    jugadorDisparador.estadisticasPersonaje.oroGanado += SISTEMA_ARMAS.ORO_POR_KILL;

                    // Oro por muerte (consuelo)
                    jugadorGolpeado.oro += SISTEMA_ARMAS.ORO_POR_MUERTE;
                    jugadorGolpeado.estadisticasPersonaje.oroGanado += SISTEMA_ARMAS.ORO_POR_MUERTE;

                    logEvento(
                        `ELIMINACION: ${jugadorDisparador.nombre} eliminó a ${jugadorGolpeado.nombre} (Kills: ${jugadorDisparador.kills}) - Oro: +${SISTEMA_ARMAS.ORO_POR_KILL}`,
                        "KILL"
                    );
                }

                const sala = salas.get(jugadorGolpeado.sala);
                const posicion = generarPosicionSegura(sala.mapa);

                // Aplicar estadísticas del personaje al respawn
                const personaje = SISTEMA_PERSONAJES[jugadorGolpeado.personaje];
                
                jugadorGolpeado.x = posicion.x;
                jugadorGolpeado.y = posicion.y;
                jugadorGolpeado.vida = CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
                jugadorGolpeado.escudo = CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
                jugadorGolpeado.maxVida = CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
                jugadorGolpeado.maxEscudo = CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
                jugadorGolpeado.municion = CONFIG_JUEGO.MUNICION_INICIAL * (personaje.estadisticas.capacidadMunicion || 1);
                jugadorGolpeado.ultimoDano = Date.now();
                jugadorGolpeado.regenerandoEscudo = false;
                jugadorGolpeado.habilidadActiva = null;
                jugadorGolpeado.proximoDisparoCritico = false;
                jugadorGolpeado.buffAtaque = null;

                io.to(jugadorGolpeado.sala).emit("jugadorRespawn", {
                    jugadorId: jugadorGolpeado.id,
                    eliminadoPor: jugadorDisparador
                        ? jugadorDisparador.nombre
                        : "Otro jugador",
                    posicion: posicion,
                });

                socket.emit("jugadorRespawnConMunicion", {
                    jugadorId: jugadorGolpeado.id,
                    posicion: posicion,
                });

                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugadorGolpeado.sala).emit("actualizarJugadores", jugadoresSala);
            } else {
                io.to(jugadorGolpeado.sala).emit("jugadorGolpeado", {
                    jugadorId: jugadorGolpeado.id,
                });

                const sala = salas.get(jugadorGolpeado.sala);
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    jugadores.get(id)
                );
                io.to(jugadorGolpeado.sala).emit("actualizarJugadores", jugadoresSala);
            }
        }
    });

    // Evento cuando un jugador se desconecta
    socket.on("disconnect", (reason) => {
        logEvento(
            `Usuario desconectado: ${socket.id}. Razón: ${reason}`,
            "DISCONNECT"
        );

        const jugador = jugadores.get(socket.id);
        if (jugador) {
            const sala = salas.get(jugador.sala);
            if (sala) {
                sala.jugadores.delete(socket.id);

                if (sala.creador === socket.id && sala.jugadores.size > 0) {
                    const nuevoCreador = Array.from(sala.jugadores)[0];
                    sala.creador = nuevoCreador;
                    const jugadorNuevoCreador = jugadores.get(nuevoCreador);
                    if (jugadorNuevoCreador) {
                        jugadorNuevoCreador.esCreador = true;
                    }

                    io.to(jugador.sala).emit("nuevoCreador", nuevoCreador);
                    logEvento(
                        `Nuevo creador asignado: ${nuevoCreador} en sala ${sala.codigo}`,
                        "ROOM"
                    );
                }

                if (sala.jugadores.size === 0) {
                    if (sala.intervalos) {
                        clearInterval(sala.intervalos.escudo);
                        clearInterval(sala.intervalos.habilidades);
                        clearInterval(sala.intervalos.cajas);
                        clearInterval(sala.intervalos.tiempo);
                    }
                    salas.delete(jugador.sala);
                    logEvento(
                        `Sala ${jugador.sala} eliminada por estar vacía`,
                        "CLEANUP"
                    );
                } else {
                    const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                        jugadores.get(id)
                    );
                    io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
                    logEvento(
                        `Jugador ${socket.id} desconectado. Quedan ${sala.jugadores.size} jugadores en sala ${sala.codigo}`,
                        "ROOM"
                    );
                }
            }
            jugadores.delete(socket.id);
        }

        logEvento(
            `Estadísticas actuales: ${jugadores.size} jugadores, ${salas.size} salas`,
            "STATS"
        );
    });
});

// Middleware para manejar errores no capturados
process.on("uncaughtException", (error) => {
    logEvento(`Error no capturado: ${error.message}`, "ERROR");
    logEvento(`Stack: ${error.stack}`, "ERROR");
});

process.on("unhandledRejection", (reason, promise) => {
    logEvento(`Promesa rechazada no manejada: ${reason}`, "ERROR");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logEvento("=== SERVIDOR INICIADO ===", "STARTUP");
    logEvento(`Servidor ejecutándose en puerto ${PORT}`, "STARTUP");
    logEvento(`Abre http://localhost:${PORT} en tu navegador`, "STARTUP");
    logEvento(`Configuración del juego:`, "STARTUP");
    logEvento(`- Daño por bala base: ${CONFIG_JUEGO.DANO_BALA}`, "STARTUP");
    logEvento(`- Velocidad de bala: ${CONFIG_JUEGO.VELOCIDAD_BALA}`, "STARTUP");
    logEvento(
        `- Tiempo de partida: ${CONFIG_JUEGO.TIEMPO_PARTIDA / 60000} minutos`,
        "STARTUP"
    );
    logEvento(
        `- Máximo jugadores por sala: ${CONFIG_JUEGO.MAX_JUGADORES_POR_SALA}`,
        "STARTUP"
    );
    logEvento(
        `- Regeneración de escudo: ${CONFIG_JUEGO.REGENERACION_ESCUDO} cada segundo`,
        "STARTUP"
    );
    logEvento(`- Sistema de personajes con habilidades activado`, "STARTUP");
    logEvento(`- Sistema de armas y oro activado`, "STARTUP");
    logEvento(`- Oro por kill: ${SISTEMA_ARMAS.ORO_POR_KILL}`, "STARTUP");
    logEvento(`- Oro por muerte: ${SISTEMA_ARMAS.ORO_POR_MUERTE}`, "STARTUP");
    logEvento(`- Oro inicial: ${SISTEMA_ARMAS.ORO_INICIAL}`, "STARTUP");
    logEvento(`- Total armas disponibles: ${Object.keys(SISTEMA_ARMAS.ARMAS_DISPONIBLES).length}`, "STARTUP");
    logEvento(`- Total personajes disponibles: ${Object.keys(SISTEMA_PERSONAJES).length}`, "STARTUP");
    logEvento(`========================`, "STARTUP");

    // Mostrar estadísticas iniciales
    mostrarEstadisticasServidor();
});

