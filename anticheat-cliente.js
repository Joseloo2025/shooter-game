// anticheat-cliente.js - Sistema Anti-Cheat Completo para Navegador (Español)
class AntiCheat {
    constructor() {
        this.cheatsDetectados = [];
        this.actividadesSospechosas = [];
        this.puntajesJugadores = new Map();
        this.patronesCheats = new Map();
        this.reportes = [];
        this.consolaInterceptada = false;
        this.monitoreoActivado = true;
        
        // Configuración ajustada para menos falsos positivos
        this.configuracion = {
            umbralFPS: 300,
            umbralTiempoReaccion: 0.05,
            umbralAimbot: 0.98,
            intervaloVerificacionDevTools: 30000,
            maxActividadesSospechosas: 500,
            monitoreoConsola: false,
            sensibilidad: 'media'
        };

        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.inicializar());
        } else {
            this.inicializar();
        }
    }

    // Inicializar el sistema anticheat
    inicializar() {
        console.log('[ANTICHEAT] Sistema anti-cheat inicializado (modo equilibrado)');
        this.inicializarPatronesCheats();
        this.iniciarMonitoreo();
    }

    // Inicializar patrones de cheats conocidos
    inicializarPatronesCheats() {
        this.patronesCheats.set("aimbot", {
            nombre: "Aimbot",
            descripcion: "Detección de movimiento de mouse perfecto",
            umbral: this.configuracion.umbralAimbot,
            muestras: 0,
        });

        this.patronesCheats.set("triggerbot", {
            nombre: "Triggerbot",
            descripcion: "Disparos con tiempo de reacción imposible",
            umbral: this.configuracion.umbralTiempoReaccion,
            muestras: 0,
        });

        this.patronesCheats.set("wallhack", {
            nombre: "Wallhack",
            descripcion: "Información de jugadores a través de paredes",
            umbral: 0.85,
            muestras: 0,
        });

        this.patronesCheats.set("speedhack", {
            nombre: "Speed Hack",
            descripcion: "Movimiento a velocidad imposible",
            umbral: 10,
            muestras: 0,
        });
    }

    // Monitorear actividades sospechosas
    iniciarMonitoreo() {
        if (typeof window === 'undefined' || !this.monitoreoActivado) {
            return;
        }

        this.monitorearVariablesGlobales();
        this.monitorearDevTools();
        this.monitorearSpeedHacks();
        this.monitorearRendimiento();
        
        console.log('[ANTICHEAT] Sistema de monitoreo activado (modo equilibrado)');
    }

    // Monitorear variables globales
    monitorearVariablesGlobales() {
        const variablesProtegidas = [
            "localStorage",
            "sessionStorage",
            "XMLHttpRequest",
            "fetch",
        ];

        variablesProtegidas.forEach((nombreVariable) => {
            try {
                const original = window[nombreVariable];
                if (original && typeof original === 'object') {
                    Object.defineProperty(window, nombreVariable, {
                        get: () => original,
                        set: (valor) => {
                            this.detectarCheat(
                                "Manipulación Variable Global",
                                `Intento de modificar ${nombreVariable}`,
                                "desconocido"
                            );
                            return original;
                        },
                        configurable: false,
                    });
                }
            } catch (e) {
                console.warn('[ANTICHEAT] No se pudo proteger:', nombreVariable, e);
            }
        });

        this.protegerFuncionesCriticas();
    }

    // Proteger funciones críticas
    protegerFuncionesCriticas() {
        const funcionesCriticas = [
            "setInterval",
            "setTimeout",
            "requestAnimationFrame",
        ];

        funcionesCriticas.forEach((nombreFuncion) => {
            try {
                const original = window[nombreFuncion];
                if (original && typeof original === 'function') {
                    // Guardar original
                    window[`_original_${nombreFuncion}`] = original;

                    if (nombreFuncion === "setInterval" || nombreFuncion === "setTimeout") {
                        window[nombreFuncion] = function (...args) {
                            const delay = args[1];
                            if (delay !== undefined && delay < 5) { // Solo detectar delays muy bajos
                                antiCheatSistema.detectarCheat(
                                    "Manipulación Timing",
                                    `Intervalo sospechoso: ${delay}ms`,
                                    "desconocido"
                                );
                            }
                            return original.apply(this, args);
                        };
                    }
                }
            } catch (e) {
                console.warn('[ANTICHEAT] No se pudo proteger función:', nombreFuncion, e);
            }
        });
    }

    // Detectar herramientas de desarrollo (menos agresivo)
    monitorearDevTools() {
        if (typeof window === 'undefined' || window.self !== window.top) {
            return;
        }

        // Método 1: Detectar por tamaño de ventana (menos sensible)
        const verificarTamañoDevTools = () => {
            try {
                const umbralAncho = window.outerWidth - window.innerWidth > 200;
                const umbralAlto = window.outerHeight - window.innerHeight > 200;

                if (umbralAncho || umbralAlto) {
                    this.registrarActividadSospechosaSegura(
                        "desconocido", 
                        "Herramientas de desarrollo posiblemente abiertas",
                        "baja"
                    );
                }
            } catch (e) {
                // Ignorar errores de cross-origin
            }
        };

        // Método 2: Interceptar consola solo si está habilitado
        if (this.configuracion.monitoreoConsola) {
            this.interceptarConsola();
        }

        setInterval(verificarTamañoDevTools, this.configuracion.intervaloVerificacionDevTools);
    }

    // Interceptar consola de forma segura (opcional)
    interceptarConsola() {
        if (this.consolaInterceptada) return;
        
        try {
            const consolaOriginal = {
                log: console.log,
                warn: console.warn,
                error: console.error,
                info: console.info
            };

            // Solo interceptar si se detectan patrones específicos de cheat
            console.log = (...args) => {
                const mensaje = args.join(' ').toLowerCase();
                if (mensaje.includes('cheat') || mensaje.includes('hack') || mensaje.includes('aimbot')) {
                    this.registrarActividadSospechosaSegura(
                        "desconocido", 
                        "Posible uso de cheats detectado en consola", 
                        "media"
                    );
                }
                return consolaOriginal.log.apply(console, args);
            };

            this.consolaInterceptada = true;
        } catch (e) {
            console.warn('[ANTICHEAT] Error interceptando consola:', e);
        }
    }

    // Detectar hacks de velocidad (más permisivo)
    monitorearSpeedHacks() {
        let ultimoTiempo = Date.now();
        let contadorFrames = 0;
        let framesSospechosos = 0;

        const verificarVelocidad = () => {
            if (!this.monitoreoActivado) return;

            contadorFrames++;
            const tiempoActual = Date.now();

            if (tiempoActual - ultimoTiempo >= 1000) {
                const fps = contadorFrames;
                contadorFrames = 0;
                ultimoTiempo = tiempoActual;

                // Umbral más alto para FPS
                if (fps > this.configuracion.umbralFPS) {
                    framesSospechosos++;
                    if (framesSospechosos > 10) {
                        this.detectarCheat(
                            "Speed Hack",
                            `FPS consistentemente alto: ${fps}`,
                            "desconocido"
                        );
                        framesSospechosos = 0;
                    }
                } else {
                    framesSospechosos = Math.max(0, framesSospechosos - 0.5);
                }
            }

            if (this.monitoreoActivado) {
                requestAnimationFrame(verificarVelocidad);
            }
        };

        if (typeof requestAnimationFrame === 'function') {
            verificarVelocidad();
        }
    }

    // Monitorear rendimiento
    monitorearRendimiento() {
        let ultimoTiempoFisica = Date.now();

        const verificarRendimiento = setInterval(() => {
            if (!this.monitoreoActivado) {
                clearInterval(verificarRendimiento);
                return;
            }

            const tiempoActual = Date.now();
            const tiempoFisica = tiempoActual - ultimoTiempoFisica;

            // Detectar lag switches (umbral más alto)
            if (tiempoFisica > 15000) {
                this.registrarActividadSospechosaSegura(
                    "Lag Switch",
                    `Lag sospechoso detectado: ${tiempoFisica}ms`,
                    "baja"
                );
            }

            ultimoTiempoFisica = tiempoActual;
        }, 1000);
    }

    // Sistema de detección de aimbot más inteligente
    monitorearAimbot(idJugador, movimientosMouse) {
        if (!movimientosMouse || movimientosMouse.length < 20) return;

        // Filtrar movimientos válidos
        const movimientosValidos = movimientosMouse.filter(movimiento => 
            movimiento && typeof movimiento.errorAngulo === 'number' && typeof movimiento.tiempo === 'number'
        );

        if (movimientosValidos.length < 15) return;

        const movimientosPerfectos = movimientosValidos.filter(
            movimiento => Math.abs(movimiento.errorAngulo) < 0.02 && movimiento.tiempo < 80
        ).length;

        const precision = movimientosPerfectos / movimientosValidos.length;

        // Solo detectar si hay un patrón consistente
        if (precision > this.patronesCheats.get("aimbot").umbral && movimientosValidos.length > 30) {
            this.detectarCheat(
                "Aimbot",
                `Posible aimbot detectado: ${(precision * 100).toFixed(2)}% de precisión en ${movimientosValidos.length} movimientos`,
                idJugador
            );
        }
    }

    // Sistema de detección de triggerbot más preciso
    monitorearTriggerbot(idJugador, datosDisparos) {
        if (!datosDisparos || datosDisparos.length < 10) return;

        const disparosValidos = datosDisparos.filter(disparo => 
            disparo && typeof disparo.tiempoReaccion === 'number'
        );

        if (disparosValidos.length < 8) return;

        const reaccionesImposibles = disparosValidos.filter(
            disparo => disparo.tiempoReaccion < this.patronesCheats.get("triggerbot").umbral
        ).length;

        const ratio = reaccionesImposibles / disparosValidos.length;

        // Requerir ratio más alto y más muestras
        if (ratio > 0.9 && disparosValidos.length > 15) {
            this.detectarCheat(
                "Triggerbot",
                `Posible triggerbot: ${(ratio * 100).toFixed(1)}% de reacciones imposibles en ${disparosValidos.length} disparos`,
                idJugador
            );
        }
    }

    // Registrar actividad sospechosa (versión segura sin recursión)
    registrarActividadSospechosaSegura(idJugador, actividad, severidad = "media") {
        if (!this.monitoreoActivado) return;

        try {
            setTimeout(() => {
                // Filtrar actividades duplicadas o muy similares
                const actividadSimilar = this.actividadesSospechosas.find(a => 
                    a.actividad === actividad && 
                    a.idJugador === idJugador && 
                    (Date.now() - a.timestamp) < 60000
                );

                if (!actividadSimilar) {
                    this.actividadesSospechosas.push({
                        idJugador,
                        actividad,
                        severidad,
                        timestamp: Date.now(),
                    });

                    // Limitar el tamaño del historial
                    if (this.actividadesSospechosas.length > this.configuracion.maxActividadesSospechosas) {
                        this.actividadesSospechosas = this.actividadesSospechosas.slice(-250);
                    }

                    // Solo loggear actividades de media o alta severidad
                    if (severidad === "media" || severidad === "alta") {
                        const logOriginal = console.log;
                        logOriginal('[ANTICHEAT] Actividad sospechosa:', actividad, 'Jugador:', idJugador);
                    }
                }
            }, 0);
        } catch (error) {
            // Fallback seguro
        }
    }

    // Alias para compatibilidad
    registrarActividadSospechosa(idJugador, actividad, severidad = "media") {
        this.registrarActividadSospechosaSegura(idJugador, actividad, severidad);
    }

    // Detectar y registrar cheat (más conservador)
    detectarCheat(tipo, detalles, idJugador = "desconocido") {
        if (!this.monitoreoActivado) return;

        const infoCheat = {
            tipo: tipo,
            detalles: detalles,
            timestamp: new Date().toISOString(),
            idJugador: idJugador,
            severidad: this.obtenerSeveridadCheat(tipo),
        };

        // Verificar si ya detectamos este cheat recientemente
        const duplicadoReciente = this.cheatsDetectados.find(cheat => 
            cheat.tipo === tipo && 
            cheat.idJugador === idJugador && 
            (Date.now() - new Date(cheat.timestamp).getTime()) < 30000
        );

        if (!duplicadoReciente) {
            this.cheatsDetectados.push(infoCheat);
            
            const warnOriginal = console.warn;
            warnOriginal('[ANTICHEAT] Posible cheat detectado:', tipo, '-', detalles, '- Jugador:', idJugador);

            this.registrarActividadSospechosaSegura(idJugador, `${tipo}: ${detalles}`, infoCheat.severidad);
            
            // Solo tomar acción inmediata para cheats de alta severidad
            if (infoCheat.severidad === "alta") {
                this.tomarAccion(infoCheat);
            }

            // Generar reporte solo para cheats confirmados
            if (infoCheat.severidad === "alta") {
                this.generarReporte(infoCheat);
            }

            // Limitar historial
            if (this.cheatsDetectados.length > 200) {
                this.cheatsDetectados = this.cheatsDetectados.slice(-100);
            }
        }
    }

    // Generar reporte en archivo JSON
    generarReporte(infoCheat) {
        try {
            // Obtener información del usuario
            const infoUsuario = {
                idUsuario: infoCheat.idJugador,
                agenteUsuario: navigator.userAgent,
                plataforma: navigator.platform,
                idioma: navigator.language,
                timestamp: infoCheat.timestamp,
                tipoCheat: infoCheat.tipo,
                detallesCheat: infoCheat.detalles,
                severidad: infoCheat.severidad,
                urlPagina: window.location.href,
                ip: 'Obteniendo...'
            };

            // Agregar al array de reportes
            this.reportes.push(infoUsuario);

            // Obtener IP y actualizar reporte
            this.obtenerIPUsuario().then(ip => {
                infoUsuario.ip = ip;
                
                // Guardar en localStorage como respaldo
                this.guardarReporteEnLocalStorage(infoUsuario);

                // Enviar al servidor si está disponible
                this.enviarReporteAlServidor(infoUsuario);

                const logOriginal = console.log;
                logOriginal('[ANTICHEAT] Reporte generado:', infoUsuario);
            }).catch(error => {
                infoUsuario.ip = 'Error obteniendo IP';
                this.guardarReporteEnLocalStorage(infoUsuario);
                this.enviarReporteAlServidor(infoUsuario);
            });
            
            return infoUsuario;
        } catch (error) {
            const errorOriginal = console.error;
            errorOriginal('[ANTICHEAT] Error generando reporte:', error);
            return null;
        }
    }

    // Intentar obtener la IP del usuario
    async obtenerIPUsuario() {
        return new Promise((resolve) => {
            // Método 1: Usar WebRTC
            if (window.RTCPeerConnection) {
                try {
                    const pc = new RTCPeerConnection({ iceServers: [] });
                    pc.createDataChannel('');
                    pc.createOffer().then(pc.setLocalDescription.bind(pc));
                    
                    pc.onicecandidate = (ice) => {
                        if (ice && ice.candidate && ice.candidate.candidate) {
                            const regexIP = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
                            const coincidenciaIP = ice.candidate.candidate.match(regexIP);
                            if (coincidenciaIP) {
                                resolve(coincidenciaIP[1]);
                                return;
                            }
                        }
                        resolve('No disponible via WebRTC');
                    };

                    setTimeout(() => {
                        resolve('Timeout WebRTC');
                    }, 1000);
                } catch (e) {
                    resolve('Error WebRTC');
                }
            } else {
                resolve('WebRTC no soportado');
            }
        });
    }

    // Guardar reporte en localStorage
    guardarReporteEnLocalStorage(reporte) {
        try {
            const reportesExistentes = JSON.parse(localStorage.getItem('reportesAntiCheat') || '[]');
            reportesExistentes.push(reporte);
            
            if (reportesExistentes.length > 50) {
                reportesExistentes.splice(0, reportesExistentes.length - 50);
            }
            
            localStorage.setItem('reportesAntiCheat', JSON.stringify(reportesExistentes));
        } catch (error) {
            const errorOriginal = console.error;
            errorOriginal('[ANTICHEAT] Error guardando en localStorage:', error);
        }
    }

    // Enviar reporte al servidor
    async enviarReporteAlServidor(reporte) {
        try {
            if (window.socket && window.socket.connected) {
                window.socket.emit('antiCheatReport', reporte);
            } else {
                this.guardarReportePendiente(reporte);
            }
        } catch (error) {
            const errorOriginal = console.error;
            errorOriginal('[ANTICHEAT] Error enviando reporte al servidor:', error);
            this.guardarReportePendiente(reporte);
        }
    }

    // Guardar reporte pendiente
    guardarReportePendiente(reporte) {
        try {
            const reportesPendientes = JSON.parse(localStorage.getItem('reportesAntiCheatPendientes') || '[]');
            reportesPendientes.push(reporte);
            localStorage.setItem('reportesAntiCheatPendientes', JSON.stringify(reportesPendientes));
        } catch (error) {
            const errorOriginal = console.error;
            errorOriginal('[ANTICHEAT] Error guardando reporte pendiente:', error);
        }
    }

    // Enviar reportes pendientes cuando haya conexión
    enviarReportesPendientes() {
        try {
            const reportesPendientes = JSON.parse(localStorage.getItem('reportesAntiCheatPendientes') || '[]');
            if (reportesPendientes.length > 0 && window.socket && window.socket.connected) {
                reportesPendientes.forEach(reporte => {
                    window.socket.emit('antiCheatReport', reporte);
                });
                localStorage.removeItem('reportesAntiCheatPendientes');
                
                const logOriginal = console.log;
                logOriginal(`[ANTICHEAT] ${reportesPendientes.length} reportes pendientes enviados`);
            }
        } catch (error) {
            const errorOriginal = console.error;
            errorOriginal('[ANTICHEAT] Error enviando reportes pendientes:', error);
        }
    }

    // Obtener severidad del cheat (más permisivo)
    obtenerSeveridadCheat(tipo) {
        const mapaSeveridad = {
            Aimbot: "alta",
            Triggerbot: "alta",
            Wallhack: "alta",
            "Speed Hack": "baja",
            "Manipulación Memoria": "alta",
            "Manipulación Variable Global": "baja",
            DevTools: "baja",
            "Position Hack": "baja",
            "Ammo Hack": "baja",
            "Score Hack": "baja",
            "Manipulación Red": "alta",
            "Lag Switch": "baja",
            "Manipulación Timing": "baja"
        };

        return mapaSeveridad[tipo] || "baja";
    }

    // Tomar acción contra cheats (más conservador)
    tomarAccion(infoCheat) {
        const acciones = {
            baja: ["log"],
            media: ["log", "advertir"],
            alta: ["log", "advertir", "expulsar", "reportar"],
        };

        const accionesDisponibles = acciones[infoCheat.severidad] || acciones.media;

        accionesDisponibles.forEach((accion) => {
            switch (accion) {
                case "log":
                    break;
                case "advertir":
                    this.enviarAdvertencia(infoCheat.idJugador, infoCheat.tipo);
                    break;
                case "expulsar":
                    this.expulsarJugador(infoCheat.idJugador, infoCheat.tipo);
                    break;
                case "reportar":
                    this.reportarJugador(infoCheat.idJugador, infoCheat);
                    break;
            }
        });
    }

    // Enviar advertencia al jugador
    enviarAdvertencia(idJugador, tipoCheat) {
        this.mostrarMensajeAdvertencia(`Advertencia: Comportamiento sospechoso detectado (${tipoCheat})`);
        
        if (window.socket && window.socket.connected) {
            window.socket.emit("antiCheatWarning", {
                tipo: "warning",
                mensaje: `Comportamiento sospechoso detectado: ${tipoCheat}`,
                idJugador: idJugador,
                severidad: "warning",
            });
        }
    }

    // Mostrar mensaje de advertencia en pantalla
    mostrarMensajeAdvertencia(mensaje) {
        const advertenciaExistente = document.querySelector('.advertencia-anti-cheat');
        if (advertenciaExistente) {
            advertenciaExistente.remove();
        }

        const divAdvertencia = document.createElement('div');
        divAdvertencia.className = 'advertencia-anti-cheat';
        divAdvertencia.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 50, 50, 0.95);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            text-align: center;
            border: 2px solid #ff4444;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
            max-width: 80%;
            word-wrap: break-word;
        `;
        divAdvertencia.textContent = mensaje;
        
        document.body.appendChild(divAdvertencia);
        
        setTimeout(() => {
            if (document.body.contains(divAdvertencia)) {
                document.body.removeChild(divAdvertencia);
            }
        }, 5000);
    }

    // Expulsar jugador
    expulsarJugador(idJugador, razon) {
        const logOriginal = console.log;
        logOriginal('[ANTICHEAT] Expulsando jugador:', idJugador, 'Razón:', razon);
        
        if (window.socket && window.socket.connected) {
            window.socket.emit("antiCheatKick", {
                razon: razon,
                idJugador: idJugador,
                mensaje: "Has sido expulsado por comportamiento sospechoso",
            });
        }
    }

    // Reportar jugador
    reportarJugador(idJugador, infoCheat) {
        const logOriginal = console.log;
        logOriginal('[ANTICHEAT] Reportando jugador:', idJugador, 'Cheat:', infoCheat.tipo);
        
        if (window.socket && window.socket.connected) {
            window.socket.emit("reportarTramposo", {
                idJugador: idJugador,
                tipoCheat: infoCheat.tipo,
                detalles: infoCheat.detalles,
                timestamp: infoCheat.timestamp,
            });
        }
    }

    // Verificar datos del juego en busca de cheats (más flexible)
    validarDatosJuego(idJugador, datosJuego) {
        if (!datosJuego || !this.monitoreoActivado) return;

        if (datosJuego.posicion) {
            const { x, y } = datosJuego.posicion;
            // Rangos más permisivos
            if (x < -50 || x > 850 || y < -50 || y > 650) {
                this.detectarCheat(
                    "Position Hack",
                    `Posición fuera de límites: x=${x}, y=${y}`,
                    idJugador
                );
            }
        }

        if (datosJuego.municion !== undefined && datosJuego.municion > 500) {
            this.detectarCheat(
                "Ammo Hack",
                `Munición sospechosamente alta: ${datosJuego.municion}`,
                idJugador
            );
        }

        if (datosJuego.kills !== undefined && datosJuego.kills > 50) {
            this.detectarCheat(
                "Score Hack",
                `Kills sospechosamente altos: ${datosJuego.kills}`,
                idJugador
            );
        }

        if (datosJuego.velocidad !== undefined && datosJuego.velocidad > 15) {
            this.detectarCheat(
                "Speed Hack",
                `Velocidad de movimiento sospechosa: ${datosJuego.velocidad}`,
                idJugador
            );
        }
    }

    // Integración con el juego
    monitorearComportamientoJugador(idJugador, datosComportamiento) {
        if (!datosComportamiento) return;

        if (datosComportamiento.patronDisparos) {
            this.monitorearTriggerbot(idJugador, datosComportamiento.patronDisparos);
        }

        if (datosComportamiento.movimientosMouse) {
            this.monitorearAimbot(idJugador, datosComportamiento.movimientosMouse);
        }

        this.validarDatosJuego(idJugador, datosComportamiento.datosJuego);
    }

    // Obtener reporte de cheats detectados
    obtenerReporteCheats() {
        return {
            totalDetectados: this.cheatsDetectados.length,
            cheats: this.cheatsDetectados,
            actividadesSospechosas: this.actividadesSospechosas.slice(-100),
            reportes: this.reportes.slice(-50),
            resumen: this.obtenerResumenCheats(),
        };
    }

    // Obtener resumen de cheats
    obtenerResumenCheats() {
        const resumen = {};
        this.cheatsDetectados.forEach((cheat) => {
            resumen[cheat.tipo] = (resumen[cheat.tipo] || 0) + 1;
        });
        return resumen;
    }

    // Limpiar cheats detectados
    limpiarCheatsDetectados() {
        this.cheatsDetectados = [];
        const logOriginal = console.log;
        logOriginal('[ANTICHEAT] Lista de cheats detectados limpiada');
    }

    // Exportar reportes a JSON
    exportarReportes() {
        const datosReporte = {
            timestamp: new Date().toISOString(),
            totalReportes: this.reportes.length,
            reportes: this.reportes
        };

        const cadenaDatos = JSON.stringify(datosReporte, null, 2);
        const blobDatos = new Blob([cadenaDatos], { type: 'application/json' });

        // Crear enlace de descarga
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blobDatos);
        enlace.download = `reportes-anti-cheat-${new Date().toISOString().split('T')[0]}.json`;
        enlace.click();
        
        const logOriginal = console.log;
        logOriginal('[ANTICHEAT] Reportes exportados');
    }

    // Obtener estadísticas del sistema
    obtenerEstadisticas() {
        return {
            cheatsDetectados: this.cheatsDetectados.length,
            actividadesSospechosas: this.actividadesSospechosas.length,
            reportesGenerados: this.reportes.length,
            patronesMonitoreados: this.patronesCheats.size
        };
    }

    // MÉTODOS DE CONTROL MEJORADOS

    // Activar monitoreo
    activarMonitoreo() {
        this.monitoreoActivado = true;
        console.log('[ANTICHEAT] Monitoreo activado');
    }

    // Desactivar monitoreo
    desactivarMonitoreo() {
        this.monitoreoActivado = false;
        console.log('[ANTICHEAT] Monitoreo desactivado');
    }

    // Establecer sensibilidad
    establecerSensibilidad(nivel) {
        const niveles = {
            baja: {
                umbralFPS: 400,
                umbralTiempoReaccion: 0.03,
                umbralAimbot: 0.99,
                monitoreoConsola: false
            },
            media: {
                umbralFPS: 300,
                umbralTiempoReaccion: 0.05,
                umbralAimbot: 0.98,
                monitoreoConsola: false
            },
            alta: {
                umbralFPS: 200,
                umbralTiempoReaccion: 0.02,
                umbralAimbot: 0.95,
                monitoreoConsola: true
            }
        };

        this.configuracion = { ...this.configuracion, ...niveles[nivel] || niveles.media };
        this.configuracion.sensibilidad = nivel;
        
        console.log(`[ANTICHEAT] Sensibilidad establecida a: ${nivel}`);
    }

    // Obtener configuración actual
    obtenerConfiguracion() {
        return { ...this.configuracion };
    }

    // Reiniciar sistema
    reiniciar() {
        this.cheatsDetectados = [];
        this.actividadesSospechosas = [];
        this.reportes = [];
        console.log('[ANTICHEAT] Sistema reiniciado');
    }
}

// Inicialización mejorada
if (typeof window !== 'undefined') {
    // Guardar funciones originales de console
    window._original_console_log = console.log;
    window._original_console_warn = console.warn;
    window._original_console_error = console.error;
    window._original_console_info = console.info;

    // Crear instancia global del anticheat
    const antiCheatSistema = new AntiCheat();
    window.antiCheatSistema = antiCheatSistema;
    
    // Establecer sensibilidad media por defecto
    antiCheatSistema.establecerSensibilidad('media');
    
    // Enviar reportes pendientes cuando se conecte el socket
    if (window.socket) {
        window.socket.on('connect', () => {
            antiCheatSistema.enviarReportesPendientes();
        });
    }
    
    console.log('[ANTICHEAT] Sistema anti-cheat cargado correctamente en el cliente (modo equilibrado)');
}