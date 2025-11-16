const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const { saveCheatReport } = require('./server/anticheat');
const salasModule = require('./server/salas');

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

// SISTEMA DE PERSONAJES centralizado en server/personajes.js
const { SISTEMA_PERSONAJES, activarHabilidadJugador, procesarHabilidadesActivas } = require('./server/personajes');

// SISTEMA_DE_ARMAS ahora está en `server/armas.js` y se importa arriba.

// La clase `Mapa` está centralizada en `mapa.js` y se requiere arriba.

// Almacenamiento de salas y jugadores
const salas = new Map();
const jugadores = new Map();

// Helper: crear una vista pública (ligera) de un jugador para emitir al cliente
function obtenerJugadorPublico(jugador) {
    if (!jugador) return null;
    return {
        id: jugador.id,
        sala: jugador.sala,
        x: jugador.x,
        y: jugador.y,
        angulo: jugador.angulo,
        vida: jugador.vida,
        escudo: jugador.escudo,
        maxVida: jugador.maxVida,
        maxEscudo: jugador.maxEscudo,
        municion: jugador.municion,
        municionEnArma: jugador.municionEnArma,
        maxArma: jugador.maxArma,
        oro: jugador.oro,
        armas: jugador.armas,
        armaActual: jugador.armaActual,
        nombre: jugador.nombre,
        personaje: jugador.personaje,
        esCreador: jugador.esCreador,
        kills: jugador.kills,
        muertes: jugador.muertes,
    };
}

// Estadísticas globales
const estadisticasGlobales = {
    totalJugadoresConectados: 0,
    totalPartidasJugadas: 0,
    totalKills: 0,
    totalMuertes: 0,
    salasCreadas: 0,
    inicioServidor: new Date(),
};

// Configuración global del juego (ajustable vía variables de entorno si se desea)
const CONFIG_JUEGO = {
    DANO_BALA: Number(process.env.DANO_BALA) || 25,
    // Velocidad en unidades por frame usada por el cliente. Valor por defecto compatible con cliente: 12
    VELOCIDAD_BALA: Number(process.env.VELOCIDAD_BALA) || 12,
    TIEMPO_PARTIDA: Number(process.env.TIEMPO_PARTIDA) || 5 * 60 * 1000, // 5 minutos por defecto
    MAX_JUGADORES_POR_SALA: Number(process.env.MAX_JUGADORES_POR_SALA) || 12,
    REGENERACION_ESCUDO: Number(process.env.REGENERACION_ESCUDO) || 1, // puntos por segundo
    TIEMPO_REGENERACION: Number(process.env.TIEMPO_REGENERACION) || 5000, // ms sin recibir daño para empezar regeneracion
    TIEMPO_TRANSICION: Number(process.env.TIEMPO_TRANSICION) || 10000, // ms entre mapas
    TIEMPO_REAPARICION_CAJAS: Number(process.env.TIEMPO_REAPARICION_CAJAS) || 15000, // ms para reaparición de cajas
    MUNICION_INICIAL: Number(process.env.MUNICION_INICIAL) || 50,
    MUNICION_POR_CAJA: Number(process.env.MUNICION_POR_CAJA) || 20,
    MAX_MUNICION: Number(process.env.MAX_MUNICION) || 200,
    VIDA_MAXIMA: Number(process.env.VIDA_MAXIMA) || 100,
    ESCUDO_MAXIMO: Number(process.env.ESCUDO_MAXIMO) || 50,
};

// Contraseña administrativa (se puede leer desde env var para producción)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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
// Inicializar módulo de salas con el contexto (salas, jugadores, io, Mapa, etc.)
salasModule.setContext({ salas, jugadores, io, Mapa, SISTEMA_PERSONAJES, CONFIG_JUEGO, logEvento, estadisticasGlobales });

// Exponer funciones movidas desde el módulo de salas para mantener compatibilidad
const {
    generarCodigoSala,
    generarPosicionSegura,
    generarCajasMunicion,
    regenerarEscudos,
    limpiarSalasVacias,
    determinarGanador,
    cambiarMapa,
    iniciarTemporizador,
    finalizarPartida,
    administrarTiempoSala,
} = salasModule;

// Configurar intervalos
setInterval(limpiarSalasVacias, 30000);
setInterval(mostrarEstadisticasServidor, 60000); // Mostrar stats cada minuto

// Sistema de verificación de munición en servidor
function verificarMunicion(jugadorId) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return false;

    const mun = Number(jugador.municion) || 0;
    // Normalizar en el objeto por si tenía NaN
    jugador.municion = mun;
    return mun > 0;
}

// Consumir munición
function consumirMunicion(jugadorId, cantidad = 1) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return false;

    const enArma = Number(jugador.municionEnArma) || 0;
    const cantidadNum = Number(cantidad) || 0;
    if (enArma >= cantidadNum && cantidadNum > 0) {
        jugador.municionEnArma = enArma - cantidadNum;
        return true;
    }
    // Si no hay munición en el cargador, no permitir disparar
    return false;
}

// Recargar munición desde caja
function recargarMunicion(jugadorId, cantidad) {
    const jugador = jugadores.get(jugadorId);
    if (jugador) {
        const maxMunicion = CONFIG_JUEGO.MAX_MUNICION * (SISTEMA_PERSONAJES[jugador.personaje].estadisticas.capacidadMunicion || 1);
        const munActual = Number(jugador.municion) || 0;
        const cantidadNum = Number(cantidad) || 0;
        const espacioDisponible = Math.max(0, maxMunicion - munActual);
        const municionAAgregar = Math.max(0, Math.min(cantidadNum, espacioDisponible));
        jugador.municion = munActual + municionAAgregar;
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

// La administración del tiempo se delega al módulo `server/salas`.

// La función `saveCheatReport` ahora está en `server/anticheat.js` y se importa arriba.

// Las funciones del sistema de armas (`comprarArmaJugador`, `cambiarArmaJugador`,
// etc.) se importan desde `server/armas.js` (ver la destructuración al inicio del archivo).

// Las implementaciones de habilidades se han movido a `server/personajes.js` y
// se importan arriba como `activarHabilidadJugador` y `procesarHabilidadesActivas`.

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
                    obtenerJugadorPublico(jugadores.get(id))
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
                    obtenerJugadorPublico(jugadores.get(id))
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
        const resultado = activarHabilidadJugador(jugadores, salas, io, logEvento, SISTEMA_PERSONAJES, socket.id);
        socket.emit("resultadoHabilidad", resultado);
        
        if (resultado.exito) {
            const jugador = jugadores.get(socket.id);
            const sala = salas.get(jugador.sala);
            if (sala) {
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    obtenerJugadorPublico(jugadores.get(id))
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
    
        // Crear nueva trampa (limitar máximo 3 trampas por jugador)
        sala.trampas = sala.trampas || [];

        // Contar trampas existentes del mismo jugador
        const trampasJugador = sala.trampas.filter(t => t.jugadorId === socket.id);
        if (trampasJugador.length >= 3) {
            // Encontrar la trampa más antigua del jugador y eliminarla
            trampasJugador.sort((a, b) => a.inicio - b.inicio);
            const trampaAntiguaId = trampasJugador[0].id;
            const idxAntigua = sala.trampas.findIndex(t => t.id === trampaAntiguaId);
            if (idxAntigua !== -1) {
                sala.trampas.splice(idxAntigua, 1);
                logEvento(
                    `Jugador ${jugador.nombre} excedió límite de trampas; se eliminó la trampa ${trampaAntiguaId}`,
                    "HABILIDAD"
                );
            }
        }

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
            obtenerJugadorPublico(jugadores.get(id))
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

    // (Torreta removida) El Ingeniero usa trampas; no hay handler de colocarTorreta

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
                    obtenerJugadorPublico(jugadores.get(id))
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
            // Munición por arma
            municionEnArma: (SISTEMA_ARMAS.ARMAS_DISPONIBLES[1] && SISTEMA_ARMAS.ARMAS_DISPONIBLES[1].municionEnArma) || 12,
            maxArma: (SISTEMA_ARMAS.ARMAS_DISPONIBLES[1] && SISTEMA_ARMAS.ARMAS_DISPONIBLES[1].municionMaxima) || 12,
            // Control de velocidad de disparo por jugador (timestamp ms)
            ultimoDisparo: 0,
            // Munición por arma
            municionEnArma: (SISTEMA_ARMAS.ARMAS_DISPONIBLES[1] && SISTEMA_ARMAS.ARMAS_DISPONIBLES[1].municionEnArma) || 12,
            maxArma: (SISTEMA_ARMAS.ARMAS_DISPONIBLES[1] && SISTEMA_ARMAS.ARMAS_DISPONIBLES[1].municionMaxima) || 12,
            // Control de velocidad de disparo por jugador (timestamp ms)
            ultimoDisparo: 0,
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
                            obtenerJugadorPublico(jugadores.get(id))
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
                    let actualizacionHabilidades = procesarHabilidadesActivas(sala, jugadores, aplicarDano, SISTEMA_PERSONAJES, io);
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
                    obtenerJugadorPublico(jugadores.get(id))
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
                // Determinar arma equipada y su definición
                let armaIdEquipada = null;
                const armaDef = (jugador && jugador.armas && typeof jugador.armaActual !== 'undefined')
                    ? SISTEMA_ARMAS.ARMAS_DISPONIBLES[jugador.armas[jugador.armaActual]]
                    : null;

                // Verificar cadencia de disparo por arma
                const ahora = Date.now();
                const ultima = Number(jugador.ultimoDisparo) || 0;
                const cadencia = armaDef && armaDef.velocidadDisparo ? Number(armaDef.velocidadDisparo) : 0;
                if (cadencia > 0 && ahora - ultima < cadencia) {
                    // No puede disparar aún
                    return;
                }

                // Intentar consumir munición del cargador
                if (!consumirMunicion(socket.id, 1)) {
                    return;
                }

                jugador.ultimoDisparo = ahora;

                // Construir y emitir disparos (soporte para escopeta: múltiples proyectiles)
                const velocidadPorDefecto = CONFIG_JUEGO.VELOCIDAD_BALA;
                const velocidadBala = armaDef && armaDef.velocidadBala ? armaDef.velocidadBala : velocidadPorDefecto;
                armaIdEquipada = armaDef ? armaDef.id : null;

                // Log temporal para debugging
                logEvento(`DISPARO recibido: ${socket.id} arma:${armaIdEquipada} angulo:${datosDisparo.angulo.toFixed(2)}`, "DISPARO");

                if (armaDef && armaDef.tipo === 'escopeta' && armaDef.proyectiles && armaDef.proyectiles > 1) {
                    const n = armaDef.proyectiles;
                    const spread = (1 - (armaDef.precision || 0.75)) * 0.6; // radianes aproximados
                    for (let i = 0; i < n; i++) {
                        // Distribuir en abanico
                        const offset = ((i / (n - 1)) - 0.5) * spread + (Math.random() - 0.5) * (spread * 0.2);
                        const disparoValido = {
                            x: jugador.x,
                            y: jugador.y,
                            angulo: datosDisparo.angulo + offset,
                            velocidad: velocidadBala,
                            jugadorId: socket.id,
                            armaId: armaIdEquipada,
                            id: Math.random().toString(36).substr(2, 9),
                            timestamp: Date.now(),
                        };
                        io.to(jugador.sala).emit("nuevoDisparo", disparoValido);
                    }
                } else {
                    const disparoValido = {
                        x: jugador.x,
                        y: jugador.y,
                        angulo: datosDisparo.angulo,
                        velocidad: velocidadBala,
                        jugadorId: socket.id,
                        armaId: armaIdEquipada,
                        id: Math.random().toString(36).substr(2, 9),
                        timestamp: Date.now(),
                    };
                    io.to(jugador.sala).emit("nuevoDisparo", disparoValido);
                }

                const sala = salas.get(jugador.sala);
                if (sala) {
                    const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                        obtenerJugadorPublico(jugadores.get(id))
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

    // EVENTO: Recargar (cliente solicita recarga completa)
    socket.on("recargar", () => {
        const jugador = jugadores.get(socket.id);
        if (!jugador) return;

        const maxEnArma = Number(jugador.maxArma) || 0;
        const enArma = Number(jugador.municionEnArma) || 0;
        const reserva = Number(jugador.municion) || 0;

        const balasNecesarias = Math.max(0, maxEnArma - enArma);
        const balasARecargar = Math.min(balasNecesarias, reserva);

        jugador.municionEnArma = enArma + balasARecargar;
        jugador.municion = reserva - balasARecargar;

        // Notificar al jugador y a la sala
        socket.emit("recargaCompletada", {
            jugadorId: socket.id,
            municionEnArma: jugador.municionEnArma,
            municion: jugador.municion,
        });

        const sala = salas.get(jugador.sala);
        if (sala) {
            const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                obtenerJugadorPublico(jugadores.get(id))
            );
            io.to(jugador.sala).emit("actualizarJugadores", jugadoresSala);
        }

        logEvento(`Recarga: ${jugador.nombre} recargó ${balasARecargar} balas (enArma:${jugador.municionEnArma} reserva:${jugador.municion})`, "GAME");
    });

    // EVENTO CORREGIDO: Jugador golpeado con daño real del arma y habilidades
    socket.on("jugadorGolpeado", (data) => {
        logEvento(`EVENT jugadorGolpeado recibido: target=${data.jugadorId} attacker=${data.disparadorId}`,'DEBUG');
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
                // Ajustar munición en arma según arma equipada
                const armaEquipadaId = jugadorGolpeado.armas && jugadorGolpeado.armas[jugadorGolpeado.armaActual];
                const armaEquipadaDef = armaEquipadaId ? SISTEMA_ARMAS.ARMAS_DISPONIBLES[armaEquipadaId] : null;
                jugadorGolpeado.municionEnArma = armaEquipadaDef ? armaEquipadaDef.municionEnArma : (jugadorGolpeado.municionEnArma || 12);
                jugadorGolpeado.maxArma = armaEquipadaDef ? armaEquipadaDef.municionMaxima : (jugadorGolpeado.maxArma || 12);
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
                    obtenerJugadorPublico(jugadores.get(id))
                );
                io.to(jugadorGolpeado.sala).emit("actualizarJugadores", jugadoresSala);
            } else {
                io.to(jugadorGolpeado.sala).emit("jugadorGolpeado", {
                    jugadorId: jugadorGolpeado.id,
                });

                const sala = salas.get(jugadorGolpeado.sala);
                const jugadoresSala = Array.from(sala.jugadores).map((id) =>
                    obtenerJugadorPublico(jugadores.get(id))
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

