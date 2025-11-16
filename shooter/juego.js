class Juego {
    constructor() {
        this.canvas = document.getElementById("canvasJuego");
        this.ctx = this.canvas.getContext("2d");
        this.canvasNiebla = document.getElementById("canvasNiebla");
        this.ctxNiebla = this.canvasNiebla.getContext("2d");
        this.socket = io();
        this.mapa = new Mapa();
        this.jugadores = new Map();
        this.disparos = [];
        this.cajasMunicion = [];
        this.teclas = {};
        this.mouse = { x: 0, y: 0 };
        this.jugadorId = null;
        this.codigoSala = null;
        this.enJuego = false;
        this.esCreador = false;
        this.nombreJugador = "Jugador";
        this.configuracion = {};
        this.frameCount = 0;
		
		this.modoColocacionTrampa = false;

        // Sistema de temporizador
        this.tiempoRestante = 300000;
        this.temporizadorActivo = false;
        this.minutos = 5;
        this.segundos = 0;
        this.enTransicion = false;
        this.contadorTransicion = 5;
        this.mapaActual = 1;
        this.mensajeGanador = "";

        // Sistema de escalado responsivo
        this.escala = 1;
        this.anchoBase = 800;
        this.altoBase = 600;
        this.anchoReal = 800;
        this.altoReal = 600;

        // Sistema de personajes
        this.personajeSeleccionado = 1;
        this.imagenesPersonajes = new Map();
        this.menuPersonajesAbierto = false;

        // Sistema de munición mejorado
        this.municion = {
            total: 50,
            enArma: 12,
            recargando: false,
            tiempoRecarga: 2000,
            maxArma: 12,
            maxTotal: 100,
        };

        // Sistema de mini-mapa
        this.miniMapa = {
            ancho: 150,
            alto: 112,
            escala: 0.1875,
            visible: true,
            borde: 2,
        };

        // Sistema de niebla
        this.radioVision = 100;
        this.nieveEfecto = [];

        // Interpolación para movimientos suaves
        this.estadosAnteriores = new Map();
        this.tiempoInterpolacion = 50;

        // Optimización de envío de posición
        this.ultimoEnvioPosicion = 0;
        this.intervaloEnvioPosicion = 50;

        // SISTEMA DE ARMAS Y ORO
        this.sistemaArmas = new SistemaArmas();
        this.oro = 100;
        this.tiendaAbierta = false;
        this.barraArmas = {
            visible: true,
            slots: 6,
            slotActual: 1
        };
        this.ultimoDisparo = 0;

        // SISTEMA DE HABILIDADES DE PERSONAJES
        this.sistemaPersonajes = {
            1: { nombre: "Soldado", habilidad: "Resistencia Mejorada", cooldown: 30000 },
            2: { nombre: "Francotirador", habilidad: "Disparo Preciso", cooldown: 35000 },
            3: { nombre: "Asalto", habilidad: "Carga Rápida", cooldown: 30000 },
            4: { nombre: "Médico", habilidad: "Campo de Curación", cooldown: 40000 },
            5: { nombre: "Ingeniero", habilidad: "Trampa de Rastreo", cooldown: 45000 },
            6: { nombre: "Comandante", habilidad: "Ataque Coordinado", cooldown: 40000 }
        };
        this.habilidadCooldown = 0;
        this.habilidadActiva = false;
        this.tiempoHabilidadActiva = 0;
        this.duracionHabilidad = 0;

        // Canvas adicional para mensajes de UI
        this.canvasUI = document.createElement("canvas");
        this.ctxUI = this.canvasUI.getContext("2d");
        this.canvasUI.style.position = "absolute";
        this.canvasUI.style.zIndex = "3";
        this.canvasUI.style.pointerEvents = "none";
        document.getElementById("juego").appendChild(this.canvasUI);

        // Canvas para mini-mapa
        this.canvasMiniMapa = document.createElement("canvas");
        this.ctxMiniMapa = this.canvasMiniMapa.getContext("2d");
        this.canvasMiniMapa.className = "mini-mapa";
        this.canvasMiniMapa.width = this.miniMapa.ancho;
        this.canvasMiniMapa.height = this.miniMapa.alto;
        this.canvasMiniMapa.style.position = "fixed";
        this.canvasMiniMapa.style.top = "10px";
        this.canvasMiniMapa.style.right = "10px";
        this.canvasMiniMapa.style.zIndex = "1000";
        this.canvasMiniMapa.style.pointerEvents = "none";
        this.canvasMiniMapa.style.display = "none";
        this.canvasMiniMapa.style.border = "2px solid #00ff88";
        this.canvasMiniMapa.style.borderRadius = "5px";
        this.canvasMiniMapa.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        document.body.appendChild(this.canvasMiniMapa);

        // Indicador de habilidad
        this.indicadorHabilidad = document.createElement("div");
        this.indicadorHabilidad.className = "indicador-habilidad";
        this.indicadorHabilidad.style.display = "none";
        this.indicadorHabilidad.innerHTML = `
            <div class="habilidad-lista">Habilidad: <span id="nombreHabilidad">-</span></div>
            <div class="habilidad-cooldown">Cooldown: <span id="tiempoCooldown">0s</span></div>
            <div class="barra-cooldown">
                <div class="progreso-cooldown" id="progresoCooldown" style="width: 100%"></div>
            </div>
        `;
        
        // POSICIÓN FIJA DEBAJO DEL MINI-MAPA
        this.indicadorHabilidad.style.position = "fixed";
        this.indicadorHabilidad.style.top = "130px"; // 10 + 112 + 8
        this.indicadorHabilidad.style.right = "10px";
        this.indicadorHabilidad.style.zIndex = "1000";
        this.indicadorHabilidad.style.display = "none";
        
        document.getElementById("juego").appendChild(this.indicadorHabilidad);

        // Sistema de administrador
        this.esAdmin = false;
        this.panelAdminAbierto = false;

        this.inicializarEventos();
        this.inicializarControles();
        this.cargarImagenesPersonajes();
        this.inicializarSistemaNieve();
        this.configurarResponsividad();
        // SISTEMA DE TRAMPAS
        this.trampas = [];
        this.imagenTrampa = new Image();
        this.imagenTrampa.src = "IMG/trampa.png";

        // Recibir actualizaciones de trampas desde el servidor
        this.socket.on("actualizarTrampas", (trampas) => {
            this.trampas = trampas || [];
        });
        
        // Nuevo evento para enemigo revelado
        this.socket.on("enemigoRevelado", (data) => {
            this.enemigoRevelado = data.enemigoId;
            this.tiempoRevelacion = Date.now() + data.duracion;
            this.mostrarMensajeFlotante("¡Enemigo revelado en el mini-mapa!", "#ffaa00");
        });
    }

    // Función para dibujar trampas
    dibujarTrampas() {
        if (!this.trampas || !this.trampas.length) return;
        
        for (const trampa of this.trampas) {
            try {
                const pos = this.convertirCoordenadas(trampa.x, trampa.y);
    
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
    
                // Dibujar trampa
                const w = 30;
                const h = 30;
                if (this.imagenTrampa && this.imagenTrampa.complete) {
                    this.ctx.drawImage(this.imagenTrampa, -w/2, -h/2, w, h);
                } else {
                    // fallback: dibujar un círculo simple si la imagen no está cargada
                    this.ctx.fillStyle = trampa.activada ? "#ff0000" : "#00ff00";
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Indicador de radio
                    this.ctx.strokeStyle = trampa.activada ? "#ff0000" : "#00ff00";
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
    
                this.ctx.restore();
            } catch (e) {
                console.error("Error dibujando trampa:", e);
            }
        }
    }
	
    // AGREGAR después del constructor de la clase Juego
    activarModoTrampa() {
        if (!this.enJuego || !this.jugadorId || this.enTransicion || this.personajeSeleccionado !== 5) return;
    
        const ahora = Date.now();
        
        // Verificar cooldown
        if (this.habilidadCooldown > ahora) {
            const segundosRestantes = Math.ceil((this.habilidadCooldown - ahora) / 1000);
            this.mostrarMensajeFlotante(`Habilidad en cooldown: ${segundosRestantes}s`, "#ff4444");
            return;
        }
    
        this.modoColocacionTrampa = true;
        this.mostrarMensajeFlotante("🪤 Modo colocación de trampa - Haz clic donde quieras colocarla", "#ffaa00");
        
        // Efecto visual de cursor
        this.canvas.style.cursor = "crosshair";
    }
    
    colocarTrampa() {
        if (!this.modoColocacionTrampa || !this.jugadorId) return;
    
        const rect = this.canvas.getBoundingClientRect();
        const coordsMouse = this.convertirCoordenadasInversa(
            this.mouse.x,
            this.mouse.y
        );
    
        // Verificar que la posición sea válida (no colisione con obstáculos)
        if (!this.mapa.colisiona(coordsMouse.x, coordsMouse.y, 10)) {
            // Enviar solicitud al servidor para colocar trampa
            this.socket.emit("colocarTrampa", {
                x: coordsMouse.x,
                y: coordsMouse.y
            });
    
            this.mostrarMensajeFlotante("🪤 Trampa colocada!", "#00ff88");
            
            // Salir del modo colocación
            this.modoColocacionTrampa = false;
            this.canvas.style.cursor = "default";
        } else {
            this.mostrarMensajeFlotante("❌ No se puede colocar trampa aquí - Posición bloqueada", "#ff4444");
            // No salir del modo colocación si la posición no es válida
        }
    }
    
    dibujarIndicadorTrampa() {
        const coords = this.convertirCoordenadas(this.mouse.x, this.mouse.y);
        const radio = 15 * this.escala;
        
        // Verificar si la posición es válida
        const esPosicionValida = !this.mapa.colisiona(this.mouse.x, this.mouse.y, 10);
        
        // Círculo de posición
        this.ctx.strokeStyle = esPosicionValida ? "#00ff00" : "#ff0000";
        this.ctx.lineWidth = 2 * this.escala;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(coords.x, coords.y, radio, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Icono de trampa en el centro
        this.ctx.fillStyle = esPosicionValida ? "#00ff00" : "#ff0000";
        this.ctx.font = `${20 * this.escala}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("🪤", coords.x, coords.y);
        
        // Texto de ayuda
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = `${12 * this.escala}px Arial`;
        this.ctx.fillText("Haz clic para colocar trampa", coords.x, coords.y + 30 * this.escala);
        this.ctx.fillText("ESC para cancelar", coords.x, coords.y + 50 * this.escala);
    }	
	
    configurarResponsividad() {
        this.ajustarTamanoCanvas();

        // Actualizar posición del mini-mapa en coordenadas de pantalla
        this.miniMapa.x = 10;
        this.miniMapa.y = 10;

        // El posicionamiento real se maneja con CSS fixed
        this.canvasMiniMapa.style.right = "10px";
        this.canvasMiniMapa.style.top = "10px";

        window.addEventListener("resize", () => {
            this.ajustarTamanoCanvas();
        });
    }

    ajustarTamanoCanvas() {
        const contenedor = document.getElementById("juego");
        const anchoContenedor = contenedor.clientWidth;
        const altoContenedor = contenedor.clientHeight;

        const escalaX = anchoContenedor / this.anchoBase;
        const escalaY = altoContenedor / this.altoBase;
        this.escala = Math.max(0.1, Math.min(escalaX, escalaY));

        this.anchoReal = this.anchoBase * this.escala;
        this.altoReal = this.altoBase * this.escala;

        this.canvas.width = this.anchoReal;
        this.canvas.height = this.altoReal;
        this.canvasNiebla.width = this.anchoReal;
        this.canvasNiebla.height = this.altoReal;
        this.canvasUI.width = this.anchoReal;
        this.canvasUI.height = this.altoReal;

        this.radioVision = Math.max(50, 100 * this.escala);
        // ACTUALIZAR POSICIÓN DEL MINI-MAPA
        this.miniMapa.x = this.anchoReal - this.miniMapa.ancho - 10;
        this.miniMapa.y = 10;
    }

    convertirCoordenadas(x, y) {
        return {
            x: x * this.escala,
            y: y * this.escala,
        };
    }

    convertirCoordenadasInversa(x, y) {
        return {
            x: x / this.escala,
            y: y / this.escala,
        };
    }

    funcionSuavizado(t) {
        return t * t * (3 - 2 * t);
    }

    limpiarEstadosAntiguos() {
        const ahora = Date.now();
        const maxEdad = 1000;

        this.estadosAnteriores.forEach((estado, jugadorId) => {
            if (ahora - estado.timestamp > maxEdad) {
                this.estadosAnteriores.delete(jugadorId);
            }
        });
    }

    enviarActualizacionPosicion() {
        if (
            !this.enJuego ||
            !this.jugadorId ||
            this.menuPersonajesAbierto ||
            this.enTransicion ||
            this.panelAdminAbierto ||
            this.tiendaAbierta
        )
            return;

        const ahora = Date.now();
        if (ahora - this.ultimoEnvioPosicion < this.intervaloEnvioPosicion) {
            return;
        }

        const jugador = this.jugadores.get(this.jugadorId);
        if (!jugador) return;

        this.socket.emit("actualizarPosicion", {
            x: jugador.x,
            y: jugador.y,
            angulo: jugador.angulo,
        });

        this.ultimoEnvioPosicion = ahora;
    }

    // SISTEMA DE HABILIDADES COMPLETO
    actualizarHabilidades() {
        const ahora = Date.now();
        
        // Actualizar cooldown
        if (this.habilidadCooldown > 0) {
            const tiempoRestante = this.habilidadCooldown - ahora;
            if (tiempoRestante <= 0) {
                this.habilidadCooldown = 0;
                this.actualizarInterfazHabilidad();
            } else {
                this.actualizarInterfazHabilidad();
            }
        }

        // Actualizar habilidad activa
        if (this.habilidadActiva && this.tiempoHabilidadActiva > 0) {
            const tiempoRestante = this.tiempoHabilidadActiva - ahora;
            if (tiempoRestante <= 0) {
                this.desactivarHabilidad();
            }
        }
    }

    // MODIFICAR la función activarHabilidad completamente:
    activarHabilidad() {
        if (!this.enJuego || !this.jugadorId || this.enTransicion) return;
    
        const ahora = Date.now();
        
        // Verificar cooldown
        if (this.habilidadCooldown > ahora) {
            const segundosRestantes = Math.ceil((this.habilidadCooldown - ahora) / 1000);
            this.mostrarMensajeFlotante(`Habilidad en cooldown: ${segundosRestantes}s`, "#ff4444");
            return;
        }
    
        // Caso especial para el Ingeniero - activar modo colocación
        if (this.personajeSeleccionado === 5) {
            this.activarModoTrampa();
            return;
        }
    
        // Para otros personajes, comportamiento normal
        this.socket.emit("activarHabilidad");
    
        // Efecto visual local
        this.mostrarMensajeFlotante("¡Habilidad activada!", "#ffaa00");
        this.crearEfectoHabilidad();
    }

    crearEfectoHabilidad() {
        const jugador = this.jugadores.get(this.jugadorId);
        if (!jugador) return;

        const coords = this.convertirCoordenadas(jugador.x, jugador.y);
        
        // Crear efecto visual según personaje
        const efecto = document.createElement("div");
        efecto.className = "efecto-habilidad";
        efecto.style.left = (coords.x - 50) + "px";
        efecto.style.top = (coords.y - 50) + "px";
        efecto.style.width = "100px";
        efecto.style.height = "100px";
        
        switch (this.personajeSeleccionado) {
            case 1: // Soldado - Resistencia
                efecto.className += " efecto-buff";
                efecto.style.background = "radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, transparent 70%)";
                break;
            case 2: // Francotirador - Disparo Preciso
                efecto.className += " efecto-ataque";
                efecto.style.background = "radial-gradient(circle, rgba(255, 0, 0, 0.4) 0%, transparent 70%)";
                break;
            case 3: // Asalto - Carga Rápida
                efecto.className += " efecto-buff";
                efecto.style.background = "radial-gradient(circle, rgba(0, 200, 255, 0.4) 0%, transparent 70%)";
                break;
            case 4: // Médico - Curación
                efecto.className += " efecto-curacion";
                efecto.style.background = "radial-gradient(circle, rgba(0, 255, 0, 0.4) 0%, transparent 70%)";
                break;
            case 5: // Ingeniero - Trampa de Rastreo
                efecto.className += " efecto-buff";
                efecto.style.background = "radial-gradient(circle, rgba(255, 165, 0, 0.4) 0%, transparent 70%)";
                break;
            case 6: // Comandante - Ataque Coordinado
                efecto.className += " efecto-buff";
                efecto.style.background = "radial-gradient(circle, rgba(255, 255, 0, 0.4) 0%, transparent 70%)";
                break;
        }

        document.getElementById("juego").appendChild(efecto);

        // Remover efecto después de animación
        setTimeout(() => {
            if (efecto.parentNode) {
                efecto.parentNode.removeChild(efecto);
            }
        }, 1000);
    }

    desactivarHabilidad() {
        this.habilidadActiva = false;
        this.tiempoHabilidadActiva = 0;
        this.actualizarInterfazHabilidad();
    }

    actualizarInterfazHabilidad() {
        const ahora = Date.now();
        const personaje = this.sistemaPersonajes[this.personajeSeleccionado];
        
        if (!personaje) return;

        // Actualizar indicador de habilidad
        const nombreHabilidad = document.getElementById("nombreHabilidad");
        const tiempoCooldown = document.getElementById("tiempoCooldown");
        const progresoCooldown = document.getElementById("progresoCooldown");

        if (nombreHabilidad) {
            nombreHabilidad.textContent = personaje.habilidad;
        }

        if (this.habilidadCooldown > ahora) {
            const segundosRestantes = Math.ceil((this.habilidadCooldown - ahora) / 1000);
            const porcentaje = ((personaje.cooldown - (this.habilidadCooldown - ahora)) / personaje.cooldown) * 100;
            
            if (tiempoCooldown) tiempoCooldown.textContent = `${segundosRestantes}s`;
            if (progresoCooldown) progresoCooldown.style.width = `${porcentaje}%`;
            
            tiempoCooldown.className = "habilidad-cooldown";
        } else {
            if (tiempoCooldown) {
                tiempoCooldown.textContent = "Lista";
                tiempoCooldown.className = "habilidad-activa";
            }
            if (progresoCooldown) progresoCooldown.style.width = "100%";
        }

        // Mostrar/ocultar indicador
        if (this.enJuego && this.jugadorId) {
            this.indicadorHabilidad.style.display = "block";
        } else {
            this.indicadorHabilidad.style.display = "none";
        }
    }

    procesarResultadoHabilidad(resultado) {
        if (resultado.exito) {
            const personaje = this.sistemaPersonajes[this.personajeSeleccionado];
            this.habilidadCooldown = Date.now() + personaje.cooldown;
            this.habilidadActiva = true;
            
            // Configurar duración según personaje
            switch (this.personajeSeleccionado) {
                case 1: // Soldado - 5 segundos
                    this.duracionHabilidad = 5000;
                    break;
                case 3: // Asalto - 4 segundos
                    this.duracionHabilidad = 4000;
                    break;
                case 6: // Comandante - 6 segundos
                    this.duracionHabilidad = 6000;
                    break;
                default:
                    this.duracionHabilidad = 0;
            }
            
            if (this.duracionHabilidad > 0) {
                this.tiempoHabilidadActiva = Date.now() + this.duracionHabilidad;
            }
            
            this.mostrarMensajeFlotante(`✅ ${resultado.mensaje}`, "#00ff88");
        } else {
            this.mostrarMensajeFlotante(`❌ ${resultado.mensaje}`, "#ff4444");
        }
        this.actualizarInterfazHabilidad();
    }

    // CORREGIDO: Actualizar tiempo desde servidor
    actualizarTiempo(data) {
        this.tiempoRestante = data.tiempoRestante;
        this.minutos = data.minutos;
        this.segundos = data.segundos;
        this.temporizadorActivo = true;

        console.log(
            `Tiempo actualizado: ${this.minutos}:${this.segundos
                .toString()
                .padStart(2, "0")}`
        );
    }

    // Cambio de mapa
    cambioMapa(data) {
        this.mapaActual = data.mapa;
        this.mapa = new Mapa(this.mapaActual);
        this.tiempoRestante = data.tiempoRestante;
        this.minutos = Math.floor(this.tiempoRestante / 60000);
        this.segundos = Math.floor((this.tiempoRestante % 60000) / 1000);
        this.enTransicion = false;
        this.temporizadorActivo = true;
        this.miniMapa.visible = true;

        // Actualizar jugadores con nuevas posiciones
        this.actualizarJugadores(data.jugadores);

        // Efecto visual de cambio de mapa
        this.canvas.style.borderColor = "#00ffff";
        this.canvas.style.boxShadow = "0 0 40px rgba(0, 255, 255, 0.7)";
        setTimeout(() => {
            this.canvas.style.borderColor = "#00ff88";
            this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 136, 0.3)";
        }, 2000);

        console.log(`Cambiado al mapa ${this.mapaActual}`);
    }

    // Fin de partida
    finPartida(data) {
        this.iniciarTransicion(data.ganadores, data.esUltimoMapa);
    }

    // Fin del ciclo de mapas
    finCicloMapas(data) {
        // Mostrar estadísticas finales
        let mensajeFinal = "=== CICLO DE MAPAS TERMINADO ===\n\n";
        mensajeFinal += "Estadísticas finales:\n\n";

        data.jugadores.sort((a, b) => b.killsAcumuladas - a.killsAcumuladas);
        data.jugadores.forEach((jugador, index) => {
            mensajeFinal += `${index + 1}. ${jugador.nombre}: ${jugador.killsAcumuladas
                } kills totales | Oro: ${jugador.oro}\n`;
        });

        alert(mensajeFinal);
        this.mostrarMenuPrincipal();
    }

    // Iniciar transición entre mapas
    iniciarTransicion(ganadores, esUltimoMapa = false) {
        this.enTransicion = true;
        this.temporizadorActivo = false;
        this.contadorTransicion = 5;

        // Determinar mensaje del ganador
        if (ganadores.length === 1) {
            this.mensajeGanador = `¡${ganadores[0].nombre} gana el mapa ${this.mapaActual}!`;
        } else if (ganadores.length > 1) {
            const nombresGanadores = ganadores.map((g) => g.nombre).join(", ");
            this.mensajeGanador = `¡Empate entre ${nombresGanadores} en el mapa ${this.mapaActual}!`;
        } else {
            this.mensajeGanador = `¡Nadie gana el mapa ${this.mapaActual}!`;
        }

        if (esUltimoMapa) {
            this.mensajeGanador += "\n\n¡Fin del ciclo de mapas!";
        } else {
            this.mensajeGanador += `\n\nSiguiente mapa en: ${this.contadorTransicion}`;
        }

        const intervaloTransicion = setInterval(() => {
            this.contadorTransicion--;

            if (esUltimoMapa) {
                this.mensajeGanador =
                    this.mensajeGanador.split("\n\n")[0] + "\n\n¡Fin del ciclo de mapas!";
            } else {
                this.mensajeGanador =
                    this.mensajeGanador.split("\n\n")[0] +
                    `\n\nSiguiente mapa en: ${this.contadorTransicion}`;
            }

            if (this.contadorTransicion <= 0) {
                clearInterval(intervaloTransicion);
                this.enTransicion = false;

                if (esUltimoMapa) {
                    this.mostrarMenuPrincipal();
                }
            }
        }, 1000);
    }

    // SISTEMA DE ARMAS Y TIENDA - COMPLETO
    abrirTienda() {
        if (!this.enJuego || this.enTransicion || this.tiendaAbierta) return;
        
        this.tiendaAbierta = true;
        this.mostrarTienda();
    }

    cerrarTienda() {
        this.tiendaAbierta = false;
        this.ocultarTienda();
    }

    mostrarTienda() {
        // Crear interfaz de tienda
        const tiendaHTML = `
            <div id="tienda" class="menu-personajes" style="display: block;">
                <h2>🎯 TIENDA DE ARMAS</h2>
                <div class="oro-actual">💰 Oro: <span style="color: #ffd700;">${this.oro}</span></div>
                <div class="categorias-tienda">
                    ${this.generarCategoriasTienda()}
                </div>
                <div style="margin-top: 20px; color: #cccccc; font-size: 12px;">
                    💡 Presiona B para cerrar la tienda
                </div>
                <button id="btnCerrarTienda" style="margin-top: 15px;">Cerrar Tienda (B)</button>
            </div>
        `;
        
        // Remover tienda existente si hay una
        const tiendaExistente = document.getElementById("tienda");
        if (tiendaExistente) {
            tiendaExistente.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', tiendaHTML);
        
        // Agregar evento al botón cerrar
        document.getElementById("btnCerrarTienda").addEventListener("click", () => this.cerrarTienda());
        
        // Agregar event listeners a los botones de compra usando event delegation
        this.agregarEventListenersTienda();
        
        // Agregar estilos si no existen
        this.agregarEstilosTienda();
    }

    agregarEventListenersTienda() {
        const tienda = document.getElementById('tienda');
        if (!tienda) return;

        // Usar event delegation para manejar los clics en los botones de compra
        tienda.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-comprar-arma')) {
                const button = e.target;
                const itemArma = button.closest('.item-arma');
                if (itemArma) {
                    const armaId = parseInt(itemArma.getAttribute('data-arma-id'));
                    if (!isNaN(armaId)) {
                        this.comprarArma(armaId);
                    }
                }
            }
        });
    }

    agregarEstilosTienda() {
        if (document.getElementById('estilos-tienda')) return;
        
        const estilos = `
            <style id="estilos-tienda">
                .categorias-tienda {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin: 20px 0;
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .categoria-arma {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 15px;
                    border-radius: 10px;
                    border: 1px solid #333;
                }
                
                .categoria-arma h3 {
                    color: #ffaa00;
                    border-bottom: 1px solid #ffaa00;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                
                .lista-armas {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .item-arma {
                    background: rgba(0, 0, 0, 0.5);
                    padding: 10px;
                    border-radius: 5px;
                    border: 1px solid #333;
                }
                
                .item-arma.comprada {
                    border-color: #00ff88;
                    background: rgba(0, 255, 136, 0.1);
                }
                
                .item-arma h4 {
                    color: #00ccff;
                    margin-bottom: 5px;
                    font-size: 14px;
                }
                
                .item-arma p {
                    font-size: 11px;
                    margin: 2px 0;
                    color: #cccccc;
                }
                
                .btn-comprar-arma {
                    background: linear-gradient(45deg, #00ff88, #00ccff);
                    border: none;
                    padding: 5px 10px;
                    border-radius: 15px;
                    color: #1a1a1a;
                    font-weight: bold;
                    font-size: 11px;
                    cursor: pointer;
                    margin-top: 5px;
                    transition: all 0.3s ease;
                }
                
                .btn-comprar-arma:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
                }
                
                .btn-comprar-arma:disabled {
                    background: #666;
                    cursor: not-allowed;
                    opacity: 0.6;
                }
                
                .equipada {
                    color: #00ff88;
                    font-weight: bold;
                    font-size: 11px;
                }
                
                .oro-actual {
                    font-size: 20px;
                    color: #ffd700;
                    margin: 10px 0;
                    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                    font-weight: bold;
                }
                
                @media (max-width: 768px) {
                    .categorias-tienda {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', estilos);
    }

    generarCategoriasTienda() {
        const categorias = {
            pistola: "🔫 Pistolas",
            rifleAsalto: "🔫 Rifles de Asalto", 
            escopeta: "💥 Escopetas",
            subfusil: "🔫 Subfusiles",
            francotirador: "🎯 Francotiradores",
            ametralladora: "🔥 Ametralladoras"
        };
        
        let html = '';
        for (const [tipo, nombre] of Object.entries(categorias)) {
            html += this.generarCategoriaHTML(tipo, nombre);
        }
        return html;
    }

    generarCategoriaHTML(tipo, nombre) {
        const armas = this.sistemaArmas.obtenerArmasPorTipo(tipo);
        let html = `<div class="categoria-arma">
            <h3>${nombre}</h3>
            <div class="lista-armas">`;
        
        armas.forEach(arma => {
            const slot = this.sistemaArmas.categoriasArmas[tipo];
            const yaComprada = this.sistemaArmas.slotsArmas[slot] === arma.id;
            const puedeComprar = this.oro >= arma.precio && !yaComprada;
            const esGratuita = arma.precio === 0;
            
            html += `
                <div class="item-arma ${yaComprada ? 'comprada' : ''}" data-arma-id="${arma.id}">
                    <h4>${arma.nombre}</h4>
                    <p>💥 Daño: ${arma.daño}${arma.proyectiles ? ` (${arma.proyectiles} proyectiles)` : ''} | 🎯 Precisión: ${Math.round(arma.precision * 100)}%</p>
                    <p>⚡ Velocidad: ${arma.velocidadDisparo}ms | 📦 Cargador: ${arma.municionEnArma} balas</p>
                    <p>💰 ${esGratuita ? 'GRATIS' : `Precio: ${arma.precio} oro`}</p>
                    ${!yaComprada ? 
                        `<button class="btn-comprar-arma" ${!puedeComprar && !esGratuita ? 'disabled' : ''}>
                            ${esGratuita ? 'OBTENER GRATIS' : `COMPRAR POR ${arma.precio} ORO`}
                        </button>` : 
                        '<span class="equipada">✅ EQUIPADA</span>'
                    }
                </div>
            `;
        });
        
        html += `</div></div>`;
        return html;
    }

    comprarArma(armaId) {
        console.log(`Intentando comprar arma ID: ${armaId}`);
        
        if (!armaId || isNaN(armaId)) {
            this.mostrarMensajeFlotante("❌ Error: ID de arma no válido", "#ff4444");
            return;
        }
        
        // Verificar si el jugador tiene suficiente oro
        const arma = this.sistemaArmas.obtenerArma(armaId);
        if (!arma) {
            this.mostrarMensajeFlotante("❌ Error: Arma no encontrada", "#ff4444");
            return;
        }
        
        if (this.oro < arma.precio && arma.precio > 0) {
            this.mostrarMensajeFlotante("❌ Oro insuficiente", "#ff4444");
            return;
        }
        
        // Enviar solicitud al servidor
        this.socket.emit("comprarArma", { armaId: armaId });
    }

    procesarCompraArma(resultado) {
        if (resultado.exito) {
            this.oro = resultado.oroRestante;
            // Actualizar el slot correspondiente con el arma comprada
            const arma = this.sistemaArmas.obtenerArma(resultado.arma.id);
            if (arma) {
                const slot = this.sistemaArmas.categoriasArmas[arma.tipo];
                this.sistemaArmas.slotsArmas[slot] = resultado.arma.id;
            }
            
            // Actualizar la tienda
            this.mostrarTienda();
            
            // Efecto visual
            this.mostrarMensajeFlotante(`✅ ${resultado.arma.nombre} comprada!`, "#00ff88");
        } else {
            this.mostrarMensajeFlotante(`❌ ${resultado.mensaje}`, "#ff4444");
        }
    }

    cambiarArma(slot) {
        if (slot < 1 || slot > 6) return;
        
        const arma = this.sistemaArmas.cambiarArma(slot);
        if (arma) {
            this.socket.emit("cambiarArma", slot);
            this.barraArmas.slotActual = slot;
            
            // ACTUALIZAR MUNICIÓN MÁXIMA DEL ARMA ACTUAL
            this.municion.maxArma = arma.municionEnArma;
            
            // Efecto visual de cambio de arma
            this.mostrarMensajeFlotante(`🔫 ${arma.nombre} equipada`, "#00ccff");
            
            this.canvas.style.borderColor = "#ffaa00";
            this.canvas.style.boxShadow = "0 0 20px rgba(255, 170, 0, 0.5)";
            setTimeout(() => {
                this.canvas.style.borderColor = "#00ff88";
                this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 136, 0.3)";
            }, 300);
        }
    }

    procesarCambioArma(data) {
        this.barraArmas.slotActual = data.slot;
        this.sistemaArmas.armaActual = data.slot;
        
        // Actualizar munición máxima cuando el servidor confirma el cambio
        const arma = this.sistemaArmas.obtenerArmaActual();
        if (arma) {
            this.municion.maxArma = arma.municionEnArma;
        }
    }

    ocultarTienda() {
        const tienda = document.getElementById("tienda");
        if (tienda) {
            tienda.remove();
        }
        this.tiendaAbierta = false;
    }

    mostrarMensajeFlotante(mensaje, color = "#ffffff") {
        // Crear elemento de mensaje flotante
        const mensajeElement = document.createElement("div");
        mensajeElement.textContent = mensaje;
        mensajeElement.style.position = "fixed";
        mensajeElement.style.top = "50%";
        mensajeElement.style.left = "50%";
        mensajeElement.style.transform = "translate(-50%, -50%)";
        mensajeElement.style.color = color;
        mensajeElement.style.fontSize = "18px";
        mensajeElement.style.fontWeight = "bold";
        mensajeElement.style.background = "rgba(0, 0, 0, 0.8)";
        mensajeElement.style.padding = "10px 20px";
        mensajeElement.style.borderRadius = "10px";
        mensajeElement.style.border = `2px solid ${color}`;
        mensajeElement.style.zIndex = "10000";
        mensajeElement.style.pointerEvents = "none";
        
        document.body.appendChild(mensajeElement);
        
        // Animación y remoción
        setTimeout(() => {
            mensajeElement.style.transition = "all 0.5s ease";
            mensajeElement.style.opacity = "0";
            mensajeElement.style.transform = "translate(-50%, -100%)";
            
            setTimeout(() => {
                if (mensajeElement.parentNode) {
                    mensajeElement.parentNode.removeChild(mensajeElement);
                }
            }, 500);
        }, 1000);
    }

    // Funciones de administrador
    mostrarPanelAdmin() {
        const password = prompt("Ingresa la contraseña de administrador:");
        if (password) {
            this.socket.emit("autenticarAdmin", password);
        }
    }

    adminAutenticado(autenticado) {
        this.esAdmin = autenticado;
        if (autenticado) {
            this.panelAdminAbierto = true;
            document.getElementById("panelAdmin").classList.remove("oculto");
            this.actualizarEstadisticasAdmin();
            this.mostrarMensajeFlotante("✅ ¡Autenticado como administrador!", "#00ff88");
        } else {
            this.mostrarMensajeFlotante("❌ Contraseña incorrecta", "#ff4444");
        }
    }

    cerrarPanelAdmin() {
        this.panelAdminAbierto = false;
        document.getElementById("panelAdmin").classList.add("oculto");
    }

    actualizarEstadisticasAdmin() {
        if (this.esAdmin) {
            this.socket.emit("obtenerEstadisticas");
        }
    }

    mostrarEstadisticasServidor(stats) {
        const statsDiv = document.getElementById("adminStats");
        statsDiv.innerHTML = `
            <strong>Estadísticas del Servidor:</strong><br>
            - Tiempo activo: ${stats.tiempoActivo} min<br>
            - Total jugadores: ${stats.totalJugadoresConectados}<br>
            - Partidas jugadas: ${stats.totalPartidasJugadas}<br>
            - Total kills: ${stats.totalKills}<br>
            - Total muertes: ${stats.totalMuertes}<br>
            - Salas creadas: ${stats.salasCreadas}<br>
            - Jugadores actuales: ${stats.jugadoresConectados}<br>
            - Salas activas: ${stats.salasActivas}
        `;
    }

    adminAcelerarTiempo() {
        const codigoSala =
            document.getElementById("inputAdminCodigoSala").value || this.codigoSala;
        if (!codigoSala) {
            alert("Ingresa un código de sala");
            return;
        }
        this.socket.emit("adminTiempo", {
            codigoSala: codigoSala,
            accion: "acelerar",
            datos: { minutos: 1 },
        });
    }

    adminPausarTiempo() {
        const codigoSala =
            document.getElementById("inputAdminCodigoSala").value || this.codigoSala;
        if (!codigoSala) {
            alert("Ingresa un código de sala");
            return;
        }
        this.socket.emit("adminTiempo", {
            codigoSala: codigoSala,
            accion: "pausar",
        });
    }

    adminSaltarMapa() {
        const codigoSala =
            document.getElementById("inputAdminCodigoSala").value || this.codigoSala;
        if (!codigoSala) {
            alert("Ingresa un código de sala");
            return;
        }
        this.socket.emit("adminTiempo", {
            codigoSala: codigoSala,
            accion: "saltar_mapa",
        });
    }

    adminTerminarPartida() {
        const codigoSala =
            document.getElementById("inputAdminCodigoSala").value || this.codigoSala;
        if (!codigoSala) {
            alert("Ingresa un código de sala");
            return;
        }
        this.socket.emit("adminTiempo", {
            codigoSala: codigoSala,
            accion: "terminar_partida",
        });
    }

    adminForzarInicio() {
        const codigoSala = document.getElementById("inputAdminCodigoSala").value;
        if (!codigoSala) {
            alert("Ingresa un código de sala");
            return;
        }
        this.socket.emit("adminForzarInicio", codigoSala);
    }

    adminExpulsarTodos() {
        const codigoSala = document.getElementById("inputAdminCodigoSala").value;
        if (!codigoSala) {
            alert("Ingresa un código de sala");
            return;
        }
        if (
            confirm("¿Estás seguro de expulsar a todos los jugadores de esta sala?")
        ) {
            this.socket.emit("adminExpulsarTodos", codigoSala);
        }
    }

    mostrarResultadoAdmin(resultado) {
        if (resultado.exito) {
            this.mostrarMensajeFlotante(`✅ ${resultado.mensaje}`, "#00ff88");
        } else {
            this.mostrarMensajeFlotante(`❌ ${resultado.mensaje}`, "#ff4444");
        }
    }

    mostrarErrorAdmin(mensaje) {
        this.mostrarMensajeFlotante(`❌ Error: ${mensaje}`, "#ff4444");
    }

    mostrarNotificacionAdmin(data) {
        this.mostrarMensajeFlotante(`👮 ${data.mensaje}`, "#ffaa00");
    }

    expulsado(mensaje) {
        alert(mensaje);
        this.mostrarMenuPrincipal();
    }

    cargarImagenesPersonajes() {
        for (let i = 1; i <= 6; i++) {
            const img = new Image();
            img.src = `IMG/jugador${i}.png`;
            this.imagenesPersonajes.set(i, img);
        }
    }

    inicializarSistemaNieve() {
        for (let i = 0; i < 50; i++) {
            this.nieveEfecto.push({
                x: Math.random() * this.anchoReal,
                y: Math.random() * this.altoReal,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
            });
        }
    }

    inicializarEventos() {
        // Navegación de menús
        document
            .getElementById("btnCrearSala")
            .addEventListener("click", () => this.mostrarMenuCrearSala());
        document
            .getElementById("btnUnirseSala")
            .addEventListener("click", () => this.mostrarMenuUnirseSala());
        document
            .getElementById("btnVolverCrear")
            .addEventListener("click", () => this.mostrarMenuPrincipal());
        document
            .getElementById("btnVolverUnirse")
            .addEventListener("click", () => this.mostrarMenuPrincipal());
        document
            .getElementById("btnComenzarJuego")
            .addEventListener("click", () => this.iniciarJuego());
        document
            .getElementById("btnUnirse")
            .addEventListener("click", () => this.unirseSala());

        // Menú de personajes
        document
            .getElementById("btnCerrarPersonajes")
            .addEventListener("click", () => this.cerrarMenuPersonajes());

        // Eventos de selección de personajes
        document.querySelectorAll(".btn-seleccionar").forEach((boton) => {
            boton.addEventListener("click", (e) => {
                e.stopPropagation();
                const opcion = e.target.closest(".personaje-opcion");
                if (opcion) {
                    const personajeId = parseInt(opcion.getAttribute("data-personaje"));
                    this.seleccionarPersonaje(personajeId);
                }
            });
        });

        document.querySelectorAll(".personaje-opcion").forEach((opcion) => {
            opcion.addEventListener("click", (e) => {
                if (e.target.classList.contains("btn-seleccionar")) return;
                const personajeId = parseInt(opcion.getAttribute("data-personaje"));
                this.seleccionarPersonaje(personajeId);
            });
        });

        // Panel de administrador
        document
            .getElementById("btnAdminPanel")
            .addEventListener("click", () => this.mostrarPanelAdmin());
        document
            .getElementById("btnCerrarAdmin")
            .addEventListener("click", () => this.cerrarPanelAdmin());

        // Controles de administrador
        document
            .getElementById("btnAdminAcelerarTiempo")
            .addEventListener("click", () => this.adminAcelerarTiempo());
        document
            .getElementById("btnAdminPausarTiempo")
            .addEventListener("click", () => this.adminPausarTiempo());
        document
            .getElementById("btnAdminSaltarMapa")
            .addEventListener("click", () => this.adminSaltarMapa());
        document
            .getElementById("btnAdminTerminarPartida")
            .addEventListener("click", () => this.adminTerminarPartida());
        document
            .getElementById("btnAdminForzarInicio")
            .addEventListener("click", () => this.adminForzarInicio());
        document
            .getElementById("btnAdminExpulsarTodos")
            .addEventListener("click", () => this.adminExpulsarTodos());

        // Permitir unirse con Enter en el input del código
        document
            .getElementById("inputCodigoSala")
            .addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this.unirseSala();
                }
            });

        // Eventos del servidor - COMPLETOS
        this.socket.on("configuracionJuego", (config) => {
            this.configuracion = config;
            this.municion.maxTotal = config.MAX_MUNICION || 100;
            this.tiempoRestante = config.TIEMPO_PARTIDA || 300000;
        });

        this.socket.on("salaCreada", (codigo) => this.salaCreada(codigo));
        this.socket.on("unidoSala", (codigo) => this.unidoSala(codigo));
        this.socket.on("errorUnirse", (mensaje) => this.mostrarError(mensaje));
        this.socket.on("juegoIniciado", () => this.juegoIniciado());
        this.socket.on("actualizarJugadores", (jugadores) =>
            this.actualizarJugadores(jugadores)
        );
        this.socket.on("nuevoDisparo", (disparo) => this.agregarDisparo(disparo));
        this.socket.on("nuevoCreador", (nuevoCreadorId) =>
            this.nuevoCreador(nuevoCreadorId)
        );
        this.socket.on("jugadorGolpeado", (data) => this.jugadorGolpeado(data));
        this.socket.on("jugadorRespawn", (data) => this.jugadorRespawn(data));
        this.socket.on("jugadorRespawnConMunicion", (data) =>
            this.jugadorRespawnConMunicion(data)
        );
        this.socket.on("actualizarCajasMunicion", (cajas) =>
            this.actualizarCajasMunicion(cajas)
        );
        this.socket.on("cajaRecogida", (data) => this.cajaRecogida(data));
        this.socket.on("personajeCambiado", (data) =>
            this.actualizarPersonajeJugador(data)
        );

        // Eventos del sistema de mapas y temporizador
        this.socket.on("actualizarTiempo", (data) => this.actualizarTiempo(data));
        this.socket.on("cambioMapa", (data) => this.cambioMapa(data));
        this.socket.on("finPartida", (data) => this.finPartida(data));
        this.socket.on("finCicloMapas", (data) => this.finCicloMapas(data));

        // Eventos de administrador
        this.socket.on("adminAutenticado", (autenticado) =>
            this.adminAutenticado(autenticado)
        );
        this.socket.on("estadisticasServidor", (stats) =>
            this.mostrarEstadisticasServidor(stats)
        );
        this.socket.on("resultadoAdmin", (resultado) =>
            this.mostrarResultadoAdmin(resultado)
        );
        this.socket.on("errorAdmin", (mensaje) => this.mostrarErrorAdmin(mensaje));
        this.socket.on("notificacionAdmin", (data) =>
            this.mostrarNotificacionAdmin(data)
        );
        this.socket.on("expulsado", (mensaje) => this.expulsado(mensaje));

        // EVENTOS DEL SISTEMA DE ARMAS Y TIENDA
        this.socket.on("armaComprada", (resultado) => this.procesarCompraArma(resultado));
        this.socket.on("armaCambiada", (data) => this.procesarCambioArma(data));

        // EVENTOS DEL SISTEMA DE HABILIDADES
        this.socket.on("resultadoHabilidad", (resultado) => this.procesarResultadoHabilidad(resultado));
        this.socket.on("habilidadActivada", (data) => this.mostrarHabilidadActivada(data));
    }

    inicializarControles() {
        // MODIFICAR el evento keydown (en inicializarControles) - agregar esto dentro del event listener:
        document.addEventListener("keydown", (e) => {
            const tecla = e.key.toLowerCase();
            this.teclas[tecla] = true;
        
            // Recargar con R
            if (tecla === "r" && this.enJuego && !this.municion.recargando && !this.enTransicion && 
                !this.panelAdminAbierto && !this.tiendaAbierta) {
                this.recargar();
            }
        
            // Menú de personajes con M
            if (tecla === "m" && this.enJuego && !this.menuPersonajesAbierto && !this.enTransicion && 
                !this.panelAdminAbierto && !this.tiendaAbierta) {
                this.abrirMenuPersonajes();
            }
        
            // Panel admin con F2
            if (tecla === "f2" && !this.panelAdminAbierto && !this.tiendaAbierta) {
                this.mostrarPanelAdmin();
            }
        
            // Tienda con B
            if (tecla === "b" && this.enJuego && !this.tiendaAbierta && !this.enTransicion) {
                this.abrirTienda();
            } else if (tecla === "b" && this.tiendaAbierta) {
                this.cerrarTienda();
            }
        
            // Cambiar armas con números 1-6
            if (tecla >= "1" && tecla <= "6" && this.enJuego && !this.tiendaAbierta) {
                const slot = parseInt(tecla);
                this.cambiarArma(slot);
            }
        
            // ACTIVAR HABILIDAD CON Q
            if (tecla === "q" && this.enJuego && !this.tiendaAbierta && !this.enTransicion) {
                this.activarHabilidad();
            }
        
            // Escape para volver al menú o cerrar menús
            if (tecla === "escape") {
                if (this.modoColocacionTrampa) {
                    this.modoColocacionTrampa = false;
                    this.canvas.style.cursor = "default";
                    this.mostrarMensajeFlotante("❌ Colocación de trampa cancelada", "#ff4444");
                } else if (this.tiendaAbierta) {
                    this.cerrarTienda();
                } else if (this.panelAdminAbierto) {
                    this.cerrarPanelAdmin();
                } else if (this.menuPersonajesAbierto) {
                    this.cerrarMenuPersonajes();
                } else if (this.enJuego) {
                    this.mostrarMenuPrincipal();
                }
            }
        });

        document.addEventListener("keyup", (e) => {
            this.teclas[e.key.toLowerCase()] = false;
        });

        // Mouse
        this.canvas.addEventListener("mousemove", (e) => {
            if (this.enTransicion || this.panelAdminAbierto || this.tiendaAbierta) return;

            const rect = this.canvas.getBoundingClientRect();
            const coords = this.convertirCoordenadasInversa(
                e.clientX - rect.left,
                e.clientY - rect.top
            );
            this.mouse.x = coords.x;
            this.mouse.y = coords.y;
        });

        this.canvas.addEventListener("click", (e) => {
            if (
                this.enJuego &&
                !this.municion.recargando &&
                !this.menuPersonajesAbierto &&
                !this.enTransicion &&
                !this.panelAdminAbierto &&
                !this.tiendaAbierta
            ) {
                this.disparar();
            }
        });
		
		// MODIFICAR el evento click del canvas (en inicializarControles):
        this.canvas.addEventListener("click", (e) => {
            if (this.enJuego && !this.municion.recargando && !this.menuPersonajesAbierto && 
                !this.enTransicion && !this.panelAdminAbierto && !this.tiendaAbierta) {
                
                // Si está en modo colocación de trampa
                if (this.modoColocacionTrampa && this.personajeSeleccionado === 5) {
                    this.colocarTrampa();
                } else {
                    this.disparar();
                }
            }
        });


        // Prevenir menú contextual en canvas
        this.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });
    }

    mostrarMenuPrincipal() {
        this.ocultarTodosMenus();
        document.getElementById("menuPrincipal").classList.remove("oculto");
        this.enJuego = false;
        this.temporizadorActivo = false;
        this.enTransicion = false;
        this.menuPersonajesAbierto = false;
        this.panelAdminAbierto = false;
        this.tiendaAbierta = false;

        // Ocultar mini-mapa cuando no esté en juego
        if (this.canvasMiniMapa) {
            this.canvasMiniMapa.style.display = "none";
        }

        // Ocultar indicador de habilidad
        this.indicadorHabilidad.style.display = "none";

        // Limpiar tienda si está abierta
        this.ocultarTienda();

        this.socket.disconnect();
        this.socket.connect();
    }

    mostrarMenuCrearSala() {
        this.ocultarTodosMenus();
        document.getElementById("menuCrearSala").classList.remove("oculto");
        this.solicitarNombre();
        this.socket.emit("crearSala");
    }

    mostrarMenuUnirseSala() {
        this.ocultarTodosMenus();
        document.getElementById("menuUnirseSala").classList.remove("oculto");
        this.solicitarNombre();
        document.getElementById("inputCodigoSala").focus();
    }

    ocultarTodosMenus() {
        document.querySelectorAll(".menu").forEach((menu) => {
            menu.classList.add("oculto");
        });
        document.getElementById("juego").classList.add("oculto");
        this.cerrarMenuPersonajes();
        this.cerrarPanelAdmin();
        this.ocultarTienda();
    }

    solicitarNombre() {
        const nombre = prompt("Ingresa tu nombre:", this.nombreJugador);
        if (nombre && nombre.trim() !== "") {
            this.nombreJugador = nombre.trim().substring(0, 15);
        }
    }

    mostrarError(mensaje) {
        alert("Error: " + mensaje);
    }

    abrirMenuPersonajes() {
        this.menuPersonajesAbierto = true;
        document.getElementById("menuPersonajes").classList.remove("oculto");
    }

    cerrarMenuPersonajes() {
        this.menuPersonajesAbierto = false;
        document.getElementById("menuPersonajes").classList.add("oculto");
    }

    seleccionarPersonaje(personajeId) {
        this.personajeSeleccionado = personajeId;
        this.socket.emit("cambiarPersonaje", personajeId);
        this.cerrarMenuPersonajes();

        const jugador = this.jugadores.get(this.jugadorId);
        if (jugador) {
            this.canvas.style.borderColor = "#00ffff";
            this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 255, 0.5)";
            setTimeout(() => {
                this.canvas.style.borderColor = "#00ff88";
                this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 136, 0.3)";
            }, 1000);
        }

        // Actualizar interfaz de habilidad
        this.actualizarInterfazHabilidad();
    }

    actualizarPersonajeJugador(data) {
        const jugador = this.jugadores.get(data.jugadorId);
        if (jugador) {
            jugador.personaje = data.personajeId;
        }
    }

    mostrarHabilidadActivada(data) {
        if (data.jugadorId !== this.jugadorId) {
            this.mostrarMensajeFlotante(`¡${data.jugadorNombre} activó ${data.habilidad}!`, "#ffaa00");
        }
    }

    salaCreada(codigo) {
        this.codigoSala = codigo;
        this.jugadorId = this.socket.id;
        this.esCreador = true;

        document.getElementById(
            "codigoSalaCreada"
        ).textContent = `Código: ${codigo}`;
        document.getElementById("codigoSalaCreada").style.display = "block";

        document.getElementById("btnComenzarJuego").style.display = "block";

        this.socket.emit("actualizarNombre", this.nombreJugador);
    }

    unirseSala() {
        const codigo = document
            .getElementById("inputCodigoSala")
            .value.toUpperCase();
        if (codigo.length === 6) {
            this.socket.emit("unirseSala", codigo);
        } else {
            this.mostrarError("El código debe tener 6 caracteres");
        }
    }

    unidoSala(codigo) {
        this.codigoSala = codigo;
        this.jugadorId = this.socket.id;
        this.esCreador = false;

        document.getElementById("btnComenzarJuego").style.display = "none";

        document.getElementById("menuUnirseSala").classList.add("oculto");
        document.getElementById("menuCrearSala").classList.remove("oculto");
        document.getElementById(
            "codigoSalaCreada"
        ).textContent = `Esperando al creador...\nCódigo: ${codigo}`;
        document.getElementById("codigoSalaCreada").style.display = "block";

        this.socket.emit("actualizarNombre", this.nombreJugador);
    }

    nuevoCreador(nuevoCreadorId) {
        if (nuevoCreadorId === this.jugadorId) {
            this.esCreador = true;
            document.getElementById("btnComenzarJuego").style.display = "block";
            this.mostrarMensajeFlotante("🎮 ¡Ahora eres el creador de la sala!", "#00ff88");
        }
    }

    iniciarJuego() {
        if ((this.esCreador || this.esAdmin) && this.codigoSala) {
            this.socket.emit("iniciarJuego", this.codigoSala);
        }
    }

    juegoIniciado() {
        this.enJuego = true;
        this.menuPersonajesAbierto = false;
        this.enTransicion = false;
        this.temporizadorActivo = true;
        this.mapaActual = 1;
        this.mapa = new Mapa(1);
        this.ocultarTodosMenus();
        document.getElementById("juego").classList.remove("oculto");

        // Reiniciar sistema de armas
        this.sistemaArmas.reiniciarArmas();
        this.oro = 100;
        this.barraArmas.slotActual = 1;

        // Reiniciar sistema de habilidades
        this.habilidadCooldown = 0;
        this.habilidadActiva = false;
        this.tiempoHabilidadActiva = 0;

        // Mostrar mini-mapa
        if (this.canvasMiniMapa) {
            this.canvasMiniMapa.style.display = "block";
        }

        // Mostrar indicador de habilidad
        this.indicadorHabilidad.style.display = "block";

        this.ajustarTamanoCanvas();

        // ACTUALIZAR MUNICIÓN CON VALORES CORRECTOS PARA PISTOLA BÁSICA
        this.municion.enArma = 12;
        this.municion.total = this.configuracion.MUNICION_INICIAL || 50;
        this.municion.maxArma = 12;
        this.municion.recargando = false;

        this.estadosAnteriores.clear();
        this.ultimoEnvioPosicion = 0;
        this.ultimoDisparo = 0;

        this.actualizarInterfazHabilidad();
        this.iniciarLoop();
    }

    actualizarJugadores(jugadoresArray) {
        this.jugadores.forEach((jugador, id) => {
            this.estadosAnteriores.set(id, {
                ...jugador,
                timestamp: Date.now(),
            });
        });

        this.jugadores.clear();
        jugadoresArray.forEach((jugador) => {
            this.jugadores.set(jugador.id, jugador);

            if (jugador.id === this.jugadorId) {
                this.municion.total = jugador.municion || 50;
                // Sincronizar munición en cargador enviada por el servidor
                if (typeof jugador.municionEnArma !== 'undefined') {
                    this.municion.enArma = jugador.municionEnArma;
                }
                this.oro = jugador.oro || 100;
                
                // Sincronizar armas del servidor
                if (jugador.armas) {
                    this.sistemaArmas.slotsArmas = { ...jugador.armas };
                }
                if (jugador.armaActual) {
                    this.barraArmas.slotActual = jugador.armaActual;
                    this.sistemaArmas.armaActual = jugador.armaActual;
                    
                    // Actualizar munición máxima según arma actual
                    const arma = this.sistemaArmas.obtenerArmaActual();
                    if (arma) {
                        this.municion.maxArma = arma.municionEnArma;
                    }
                }

                // Sincronizar personaje
                if (jugador.personaje) {
                    this.personajeSeleccionado = jugador.personaje;
                }
            }

            if (jugador.id === this.jugadorId && jugador.esCreador) {
                this.esCreador = true;
                document.getElementById("btnComenzarJuego").style.display = "block";
            }
        });
        this.actualizarInfoJugadores();
    }

    obtenerJugadorInterpolado(jugadorId) {
        const jugadorActual = this.jugadores.get(jugadorId);
        const jugadorAnterior = this.estadosAnteriores.get(jugadorId);

        if (!jugadorAnterior || jugadorId === this.jugadorId) {
            return jugadorActual;
        }

        const tiempoTranscurrido = Date.now() - jugadorAnterior.timestamp;
        const tiempoInterpolacionOptimizado = 50;
        const factor = Math.min(
            tiempoTranscurrido / tiempoInterpolacionOptimizado,
            1
        );
        const factorSuavizado = this.funcionSuavizado(factor);

        return {
            ...jugadorActual,
            x:
                jugadorAnterior.x +
                (jugadorActual.x - jugadorAnterior.x) * factorSuavizado,
            y:
                jugadorAnterior.y +
                (jugadorActual.y - jugadorAnterior.y) * factorSuavizado,
            angulo:
                jugadorAnterior.angulo +
                (jugadorActual.angulo - jugadorAnterior.angulo) * factorSuavizado,
        };
    }

    actualizarInfoJugadores() {
        const info = document.getElementById("infoJugadores");
        let html = "<h3>Jugadores:</h3>";

        const jugadoresArray = Array.from(this.jugadores.values());
        jugadoresArray.sort((a, b) => b.kills - a.kills);

        jugadoresArray.forEach((jugador) => {
            const esYo = jugador.id === this.jugadorId;
            const armaActual = this.obtenerNombreArmaActual(jugador);
            const personaje = this.sistemaPersonajes[jugador.personaje] || { nombre: "Desconocido" };
            const color = esYo ? "#00ff88" : "#ff4444";
            
            html += `<div style="color: ${color}; margin: 5px 0; font-size: 12px;">
                <strong>${jugador.nombre || "Jugador"}${esYo ? " (TÚ)" : ""}</strong><br>
                ${personaje.nombre} | Kills: ${jugador.kills} | Muertes: ${jugador.muertes}<br>
                Oro: ${jugador.oro}${esYo ? ` | Habilidad: ${personaje.habilidad}` : ''}
            </div>`;
        });

        // Información del mapa, tiempo y recarga
        html += `<div style="margin-top: 10px; font-size: 10px; color: #00ccff;">
            Mapa: ${this.mapaActual}/3 | Tiempo: ${this.minutos
                .toString()
                .padStart(2, "0")}:${this.segundos.toString().padStart(2, "0")}
        </div>`;

        // Información de recarga
        if (this.municion.recargando) {
            html += `<div style="margin-top: 5px; font-size: 10px; color: #ffff00;">
                🔄 RECARGANDO...
            </div>`;
        }

        info.innerHTML = html;
    }

    obtenerNombreArmaActual(jugador) {
        if (!jugador.armaActual || !jugador.armas) return "Pistola Básica";
        
        const armaId = jugador.armas[jugador.armaActual];
        if (!armaId) return "Pistola Básica";
        
        const arma = this.sistemaArmas.obtenerArma(armaId);
        return arma ? arma.nombre : "Pistola Básica";
    }

    actualizarCajasMunicion(cajas) {
        this.cajasMunicion = cajas;
    }

    cajaRecogida(data) {
        if (data.jugadorId === this.jugadorId) {
            const maxMunicion = this.municion.maxTotal;
            const espacioDisponible = maxMunicion - this.municion.total;

            if (espacioDisponible > 0) {
                const municionAAgregar = Math.min(
                    data.municionRecibida,
                    espacioDisponible
                );
                this.municion.total += municionAAgregar;

                console.log(
                    `Recogida caja: +${municionAAgregar} balas (Total: ${this.municion.total}/${maxMunicion})`
                );

                this.mostrarMensajeFlotante(`📦 +${municionAAgregar} munición`, "#ffff00");

                this.canvas.style.borderColor = "#ffff00";
                this.canvas.style.boxShadow = "0 0 30px rgba(255, 255, 0, 0.5)";
                setTimeout(() => {
                    this.canvas.style.borderColor = "#00ff88";
                    this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 136, 0.3)";
                }, 500);

                if (
                    this.municion.enArma < this.municion.maxArma &&
                    this.municion.total > 0 &&
                    !this.municion.recargando
                ) {
                    this.recargar();
                }
            } else {
                console.log("Munición máxima alcanzada, no se puede recoger más");
            }
        }
    }

    agregarDisparo(disparo) {
        this.disparos.push({
            ...disparo,
            tiempoVida: 100,
            timestamp: Date.now(),
        });
    }

    disparar() {
        if (this.municion.recargando || this.tiendaAbierta) {
            return;
        }

        const jugador = this.jugadores.get(this.jugadorId);
        if (!jugador) return;

        // Verificar velocidad de disparo del arma actual
        const armaActual = this.sistemaArmas.obtenerArmaActual();
        if (armaActual && !this.sistemaArmas.puedeDisparar(this.ultimoDisparo)) {
            return;
        }

        if (this.municion.enArma <= 0 || this.municion.total <= 0) {
            return;
        }

        const anguloDisparo = Math.atan2(
            this.mouse.y - jugador.y,
            this.mouse.x - jugador.x
        );

        const disparo = {
            x: jugador.x,
            y: jugador.y,
            angulo: anguloDisparo,
            velocidad: this.configuracion.VELOCIDAD_BALA || 12,
        };

        this.municion.enArma--;
        this.ultimoDisparo = Date.now();

        this.socket.emit("disparar", disparo);
    }

    // RECARGAR MEJORADO
    recargar() {
        if (
            this.municion.total <= 0 ||
            this.municion.enArma >= this.municion.maxArma ||
            this.municion.recargando
        ) {
            return;
        }

        this.municion.recargando = true;

        setTimeout(() => {
            const balasNecesarias = this.municion.maxArma - this.municion.enArma;
            const balasARecargar = Math.min(balasNecesarias, this.municion.total);

            this.municion.enArma += balasARecargar;
            this.municion.total -= balasARecargar;
            this.municion.recargando = false;

            console.log(
                `Recarga completada: ${balasARecargar} balas recargadas (${this.municion.enArma}/${this.municion.maxArma} - Total restante: ${this.municion.total})`
            );

            this.mostrarMensajeFlotante(`🔁 Recarga completada`, "#00ccff");

            // Notificar al servidor para mantener autoridad sobre munición
            try {
                this.socket.emit('recargar');
            } catch (e) {
                console.warn('No se pudo notificar recarga al servidor:', e);
            }
        }, this.municion.tiempoRecarga);
    }

    jugadorGolpeado(data) {
        if (data.jugadorId === this.jugadorId) {
            this.canvas.style.borderColor = "#ff0000";
            this.canvas.style.boxShadow = "0 0 30px rgba(255, 0, 0, 0.5)";
            setTimeout(() => {
                this.canvas.style.borderColor = "#00ff88";
                this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 136, 0.3)";
            }, 200);
        }
    }

    jugadorRespawn(data) {
        if (data.jugadorId === this.jugadorId) {
            this.canvas.style.borderColor = "#00ffff";
            this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 255, 0.5)";
            setTimeout(() => {
                this.canvas.style.borderColor = "#00ff88";
                this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 136, 0.3)";
            }, 1000);
        }
    }

    jugadorRespawnConMunicion(data) {
        if (data.jugadorId === this.jugadorId) {
            // ACTUALIZAR MUNICIÓN SEGÚN ARMA ACTUAL
            const armaActual = this.sistemaArmas.obtenerArmaActual();
            this.municion.enArma = armaActual ? armaActual.municionEnArma : 12;
            this.municion.total = this.configuracion.MUNICION_INICIAL || 50;
            this.municion.recargando = false;

            console.log("Respawn: Munición recargada completamente");

            this.mostrarMensajeFlotante("🔄 Munición recargada", "#00ff88");

            this.canvas.style.borderColor = "#00ffff";
            this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 255, 0.5)";
            setTimeout(() => {
                this.canvas.style.borderColor = "#00ff88";
                this.canvas.style.boxShadow = "0 0 30px rgba(0, 255, 136, 0.3)";
            }, 1000);
        }
    }

    dibujarMiniMapa() {
        if (!this.enJuego || !this.miniMapa.visible) return;

        const ctx = this.ctxMiniMapa;
        const mm = this.miniMapa;

        // Limpiar el canvas del mini-mapa
        ctx.clearRect(0, 0, mm.ancho, mm.alto);

        // Fondo del mini-mapa
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, mm.ancho, mm.alto);

        // Borde
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = mm.borde;
        ctx.strokeRect(0, 0, mm.ancho, mm.alto);

        // Dibujar obstáculos del mapa
        this.dibujarObstaculosMiniMapa(ctx);

        // Dibujar jugador en mini-mapa
        this.dibujarJugadorMiniMapa(ctx);

        // Título del mini-mapa
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`MAPA ${this.mapaActual}`, mm.ancho / 2, 12);
    }

    dibujarObstaculosMiniMapa(ctx) {
        const mm = this.miniMapa;

        // Dibujar área del mapa completo
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, 800 * mm.escala, 600 * mm.escala);

        this.mapa.obstaculos.forEach(obstaculo => {
            ctx.fillStyle = obstaculo.color;

            // Verificar que el obstáculo esté dentro de los límites del mapa
            const x = obstaculo.x * mm.escala;
            const y = obstaculo.y * mm.escala;

            // Solo dibujar si está dentro del área visible del mini-mapa
            if (x >= 0 && x <= mm.ancho && y >= 0 && y <= mm.alto) {
                switch (obstaculo.tipo) {
                    case 'rectangulo':
                        const ancho = obstaculo.ancho * mm.escala;
                        const alto = obstaculo.alto * mm.escala;
                        // Asegurar que no se dibuje fuera de los límites
                        if (x + ancho >= 0 && y + alto >= 0) {
                            ctx.fillRect(x, y, ancho, alto);
                        }
                        break;

                    case 'circulo':
                        const radio = obstaculo.radio * mm.escala;
                        // Asegurar que el círculo sea visible
                        if (x + radio >= 0 && y + radio >= 0 && x - radio <= mm.ancho && y - radio <= mm.alto) {
                            ctx.beginPath();
                            ctx.arc(x, y, radio, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        break;

                    case 'cuadrado':
                        const tamaño = obstaculo.tamaño * mm.escala;
                        if (x + tamaño >= 0 && y + tamaño >= 0) {
                            ctx.fillRect(x, y, tamaño, tamaño);
                        }
                        break;
                }
            }
        });
    }

    dibujarJugadorMiniMapa(ctx) {
        const jugador = this.jugadores.get(this.jugadorId);
        if (!jugador) return;
    
        const mm = this.miniMapa;
    
        // Posición en mini-mapa (limitada a los bordes del mapa)
        const x = Math.max(2, Math.min(800 * mm.escala - 2, jugador.x * mm.escala));
        const y = Math.max(2, Math.min(600 * mm.escala - 2, jugador.y * mm.escala));
    
        // Dibujar jugador como punto
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    
        // Indicador de dirección
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x + Math.cos(jugador.angulo) * 8,
            y + Math.sin(jugador.angulo) * 8
        );
        ctx.stroke();
        
        // Dibujar enemigos revelados
        const ahora = Date.now();
        if (this.enemigoRevelado && ahora < this.tiempoRevelacion) {
            const enemigo = this.jugadores.get(this.enemigoRevelado);
            if (enemigo) {
                const enemigoX = Math.max(2, Math.min(800 * mm.escala - 2, enemigo.x * mm.escala));
                const enemigoY = Math.max(2, Math.min(600 * mm.escala - 2, enemigo.y * mm.escala));
                
                // Dibujar enemigo revelado como punto rojo parpadeante
                ctx.fillStyle = (Math.floor(ahora / 500) % 2 === 0) ? '#ff0000' : '#ff6666';
                ctx.beginPath();
                ctx.arc(enemigoX, enemigoY, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Añadir efecto de pulso
                ctx.strokeStyle = '#ff0000';
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(enemigoX, enemigoY, 6 + Math.sin(ahora / 200) * 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }
    }

    dibujarBarraArmas() {
        if (!this.barraArmas.visible || !this.enJuego || this.tiendaAbierta) return;
        
        const ctx = this.ctxUI;
        const anchoBarra = 300 * this.escala;
        const altoBarra = 50 * this.escala;
        const x = (this.anchoReal - anchoBarra) / 2;
        const y = this.altoReal - altoBarra - 10;
        
        // Fondo de la barra
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x, y, anchoBarra, altoBarra);
        
        // Borde
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 2 * this.escala;
        ctx.strokeRect(x, y, anchoBarra, altoBarra);
        
        // Slots de armas
        const slotWidth = anchoBarra / 6;
        for (let i = 1; i <= 6; i++) {
            const slotX = x + (i - 1) * slotWidth;
            const armaId = this.sistemaArmas.slotsArmas[i];
            const esActual = i === this.barraArmas.slotActual;
            
            // Fondo del slot
            ctx.fillStyle = esActual ? "rgba(0, 255, 136, 0.3)" : "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(slotX, y, slotWidth, altoBarra);
            
            // Borde del slot
            ctx.strokeStyle = esActual ? "#00ff88" : "#666666";
            ctx.lineWidth = 1 * this.escala;
            ctx.strokeRect(slotX, y, slotWidth, altoBarra);
            
            // Número del slot
            ctx.fillStyle = "#ffffff";
            ctx.font = `${12 * this.escala}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(i.toString(), slotX + slotWidth / 2, y + 15 * this.escala);
            
            // Icono o nombre del arma
            if (armaId) {
                const arma = this.sistemaArmas.obtenerArma(armaId);
                ctx.fillStyle = "#cccccc";
                ctx.font = `${8 * this.escala}px Arial`;
                const nombreCorto = arma.nombre.length > 8 ? arma.nombre.substring(0, 8) + "..." : arma.nombre;
                ctx.fillText(nombreCorto, slotX + slotWidth / 2, y + 30 * this.escala);
            } else {
                ctx.fillStyle = "#666666";
                ctx.font = `${8 * this.escala}px Arial`;
                ctx.fillText("Vacío", slotX + slotWidth / 2, y + 30 * this.escala);
            }
        }
        
        // Información del arma actual
        const armaActual = this.sistemaArmas.obtenerArmaActual();
        if (armaActual) {
            ctx.fillStyle = "#ffffff";
            ctx.font = `${10 * this.escala}px Arial`;
            ctx.textAlign = "left";
            ctx.fillText(`Arma: ${armaActual.nombre}`, x + 5, y - 5);
            
            // Información de munición
            ctx.fillText(`Munición: ${this.municion.enArma}/${this.municion.maxArma} | Total: ${this.municion.total}`, x + 5, y - 20);
        }
    }

    actualizar() {
        if (
            !this.enJuego ||
            !this.jugadorId ||
            this.menuPersonajesAbierto ||
            this.enTransicion ||
            this.panelAdminAbierto ||
            this.tiendaAbierta
        )
            return;

        // Actualizar sistema de habilidades
        this.actualizarHabilidades();

        const jugador = this.jugadores.get(this.jugadorId);
        if (!jugador) return;

        let dx = 0,
            dy = 0;
        
        // Aplicar modificador de velocidad según personaje y habilidades
        let velocidadBase = this.configuracion.VELOCIDAD_JUGADOR || 5;
        if (this.personajeSeleccionado === 3) { // Asalto
            velocidadBase *= 1.15; // +15% velocidad
        }
        if (this.habilidadActiva && this.personajeSeleccionado === 3) { // Carga Rápida activa
            velocidadBase *= 1.3; // +30% adicional durante habilidad
        }

        if (this.teclas["w"] || this.teclas["arrowup"]) dy -= velocidadBase;
        if (this.teclas["s"] || this.teclas["arrowdown"]) dy += velocidadBase;
        if (this.teclas["a"] || this.teclas["arrowleft"]) dx -= velocidadBase;
        if (this.teclas["d"] || this.teclas["arrowright"]) dx += velocidadBase;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        const nuevaX = jugador.x + dx;
        const nuevaY = jugador.y + dy;

        if (!this.mapa.colisiona(nuevaX, nuevaY, 15)) {
            jugador.x = nuevaX;
            jugador.y = nuevaY;

            this.enviarActualizacionPosicion();
        }

        if (this.frameCount % 5 === 0) {
            for (let i = this.cajasMunicion.length - 1; i >= 0; i--) {
                const caja = this.cajasMunicion[i];
                const distancia = Math.sqrt(
                    Math.pow(jugador.x - caja.x, 2) + Math.pow(jugador.y - caja.y, 2)
                );

                if (distancia < 25) {
                    this.socket.emit("recogerMunicion", caja.id);
                    break;
                }
            }
        }

        for (let i = this.disparos.length - 1; i >= 0; i--) {
            const disparo = this.disparos[i];
            disparo.x += Math.cos(disparo.angulo) * disparo.velocidad;
            disparo.y += Math.sin(disparo.angulo) * disparo.velocidad;
            disparo.tiempoVida--;

            if (this.mapa.colisiona(disparo.x, disparo.y, 3)) {
                this.disparos.splice(i, 1);
                continue;
            }

            let colisionConJugador = false;
            this.jugadores.forEach((otroJugador, jugadorId) => {
                if (jugadorId !== disparo.jugadorId && !colisionConJugador) {
                    const distancia = Math.sqrt(
                        Math.pow(disparo.x - otroJugador.x, 2) +
                        Math.pow(disparo.y - otroJugador.y, 2)
                    );

                    if (distancia < 18) {
                        this.socket.emit("jugadorGolpeado", {
                            jugadorId: jugadorId,
                            disparadorId: disparo.jugadorId,
                        });
                        this.disparos.splice(i, 1);
                        colisionConJugador = true;
                    }
                }
            });
        }

        this.disparos = this.disparos.filter((disparo) => disparo.tiempoVida > 0);

        this.limpiarEstadosAntiguos();

        this.actualizarInfoMunicion();

        this.frameCount++;
    }

    dibujar() {
        // Fondo
        this.ctx.fillStyle = "#1a1a2e";
        this.ctx.fillRect(0, 0, this.anchoReal, this.altoReal);
    
        // Dibujar mapa
        this.mapa.dibujar(this.ctx, this.escala);
    
        // Dibujar elementos del juego
        this.dibujarCajasMunicion();
        this.dibujarTrampas();
    
        this.jugadores.forEach((jugador, id) => {
            const jugadorInterpolado = this.obtenerJugadorInterpolado(id);
            this.dibujarJugador(jugadorInterpolado);
        });
    
        this.disparos.forEach((disparo) => {
            const coords = this.convertirCoordenadas(disparo.x, disparo.y);
            this.ctx.fillStyle = "#ffff00";
            this.ctx.beginPath();
            this.ctx.arc(coords.x, coords.y, 3 * this.escala, 0, Math.PI * 2);
            this.ctx.fill();
        });
    
        // Dibujar niebla de guerra
        this.dibujarNiebla();
    
        // DIBUJAR INDICADOR DE TRAMPA SI ESTÁ EN MODO COLOCACIÓN
        if (this.modoColocacionTrampa && this.personajeSeleccionado === 5) {
            this.dibujarIndicadorTrampa();
        }
    
        // DIBUJAR MENSAJES EN EL CANVAS UI
        this.dibujarMensajesUI();
    
        // DIBUJAR BARRA DE ARMAS
        this.dibujarBarraArmas();
    
        // DIBUJAR MINI-MAPA EN SU PROPIO CANVAS
        this.dibujarMiniMapa();
    }

    // FUNCIÓN: Dibujar mensajes en el canvas UI
    dibujarMensajesUI() {
        // Limpiar canvas UI
        this.ctxUI.clearRect(0, 0, this.anchoReal, this.altoReal);

        // Dibujar mensaje de transición
        if (this.enTransicion) {
            this.ctxUI.fillStyle = "rgba(0, 0, 0, 0.8)";
            this.ctxUI.fillRect(0, 0, this.anchoReal, this.altoReal);

            this.ctxUI.fillStyle = "#ffffff";
            this.ctxUI.font = `${24 * this.escala}px Arial`;
            this.ctxUI.textAlign = "center";
            this.ctxUI.textBaseline = "middle";

            const lineas = this.mensajeGanador.split("\n");
            lineas.forEach((linea, index) => {
                this.ctxUI.fillText(
                    linea,
                    this.anchoReal / 2,
                    this.altoReal / 2 + index * 30 * this.escala
                );
            });
        }

        // Dibujar mensaje de cambio de mapa (efecto temporal)
        if (this.frameCount < 120 && this.enJuego && !this.enTransicion) {
            // Mostrar por 2 segundos
            this.ctxUI.fillStyle = "rgba(0, 0, 0, 0.7)";
            this.ctxUI.fillRect(
                this.anchoReal / 2 - 150 * this.escala,
                20 * this.escala,
                300 * this.escala,
                40 * this.escala
            );

            this.ctxUI.fillStyle = "#00ffff";
            this.ctxUI.font = `${16 * this.escala}px Arial`;
            this.ctxUI.textAlign = "center";
            this.ctxUI.textBaseline = "middle";
            this.ctxUI.fillText(
                `MAPA ${this.mapaActual}`,
                this.anchoReal / 2,
                40 * this.escala
            );
        }

        // Dibujar información de oro y personaje
        this.ctxUI.fillStyle = "#ffd700";
        this.ctxUI.font = `${14 * this.escala}px Arial`;
        this.ctxUI.textAlign = "right";
        this.ctxUI.textBaseline = "top";
        this.ctxUI.fillText(
            `💰 ${this.oro} oro`,
            this.anchoReal - 10 * this.escala,
            10 * this.escala
        );

        // Información del personaje
        const personaje = this.sistemaPersonajes[this.personajeSeleccionado];
        if (personaje) {
            this.ctxUI.fillStyle = "#00ccff";
            this.ctxUI.font = `${12 * this.escala}px Arial`;
            this.ctxUI.textAlign = "right";
            this.ctxUI.fillText(
                `👤 ${personaje.nombre}`,
                this.anchoReal - 10 * this.escala,
                30 * this.escala
            );
        }

        // Indicador de habilidad activa
        if (this.habilidadActiva && this.tiempoHabilidadActiva > Date.now()) {
            const tiempoRestante = Math.ceil((this.tiempoHabilidadActiva - Date.now()) / 1000);
            this.ctxUI.fillStyle = "#ffaa00";
            this.ctxUI.font = `${14 * this.escala}px Arial`;
            this.ctxUI.textAlign = "center";
            this.ctxUI.fillText(
                `⚡ Habilidad activa: ${tiempoRestante}s`,
                this.anchoReal / 2,
                20 * this.escala
            );
        }
    }

    dibujarNiebla() {
        const jugador = this.jugadores.get(this.jugadorId);
        if (!jugador) return;

        this.ctxNiebla.clearRect(0, 0, this.anchoReal, this.altoReal);

        const coordsJugador = this.convertirCoordenadas(jugador.x, jugador.y);

        // Negro sólido
        this.ctxNiebla.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctxNiebla.fillRect(0, 0, this.anchoReal, this.altoReal);

        this.ctxNiebla.globalCompositeOperation = "destination-out";

        this.ctxNiebla.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctxNiebla.beginPath();
        this.ctxNiebla.arc(
            coordsJugador.x,
            coordsJugador.y,
            this.radioVision * 0.85,
            0,
            Math.PI * 2
        );
        this.ctxNiebla.fill();

        this.ctxNiebla.globalCompositeOperation = "source-over";

        this.dibujarParticulasNiebla(coordsJugador);
    }

    dibujarParticulasNiebla(coordsJugador) {
        this.nieveEfecto.forEach((particula) => {
            particula.y += particula.speed;
            if (particula.y > this.altoReal) {
                particula.y = 0;
                particula.x = Math.random() * this.anchoReal;
            }

            const distancia = Math.sqrt(
                Math.pow(particula.x - coordsJugador.x, 2) +
                Math.pow(particula.y - coordsJugador.y, 2)
            );

            // Solo mostrar partículas fuera del área de visión
            if (distancia > this.radioVision) {
                const opacidad = Math.min(
                    particula.opacity,
                    (distancia - this.radioVision) / 50
                );

                this.ctxNiebla.fillStyle = `rgba(255, 255, 255, ${opacidad})`;
                this.ctxNiebla.beginPath();
                this.ctxNiebla.arc(
                    particula.x,
                    particula.y,
                    particula.size,
                    0,
                    Math.PI * 2
                );
                this.ctxNiebla.fill();
            }
        });
    }

    dibujarJugador(jugador) {
        const esYo = jugador.id === this.jugadorId;
        const personajeId = jugador.personaje || 1;
        const imagen = this.imagenesPersonajes.get(personajeId);
        const coords = this.convertirCoordenadas(jugador.x, jugador.y);

        if (imagen && imagen.complete) {
            const ancho = 30 * this.escala;
            const alto = 30 * this.escala;
            this.ctx.drawImage(
                imagen,
                coords.x - ancho / 2,
                coords.y - alto / 2,
                ancho,
                alto
            );
        } else {
            this.ctx.fillStyle = esYo ? "#00ff88" : "#ff4444";
            this.ctx.beginPath();
            this.ctx.arc(coords.x, coords.y, 15 * this.escala, 0, Math.PI * 2);
            this.ctx.fill();
        }

        if (esYo && !this.enTransicion) {
            const anguloApuntado = Math.atan2(
                this.mouse.y - jugador.y,
                this.mouse.x - jugador.x
            );
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 2 * this.escala;
            this.ctx.beginPath();
            this.ctx.moveTo(coords.x, coords.y);
            this.ctx.lineTo(
                coords.x + Math.cos(anguloApuntado) * 25 * this.escala,
                coords.y + Math.sin(anguloApuntado) * 25 * this.escala
            );
            this.ctx.stroke();
        }

        this.dibujarBarraVida(jugador, coords);

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = `${12 * this.escala}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.fillText(
            jugador.nombre || "Jugador",
            coords.x,
            coords.y - 40 * this.escala
        );

        if (esYo) {
            this.ctx.fillStyle = "#00ff88";
            this.ctx.font = `${10 * this.escala}px Arial`;
            this.ctx.fillText(
                `K:${jugador.kills} M:${jugador.muertes}`,
                coords.x,
                coords.y - 55 * this.escala
            );
        }
    }

    dibujarBarraVida(jugador, coords) {
        const esYo = jugador.id === this.jugadorId;
        const barraWidth = 40 * this.escala;
        const barraHeight = 4 * this.escala;
        const yOffset = -25 * this.escala;

        this.ctx.fillStyle = "#333333";
        this.ctx.fillRect(
            coords.x - barraWidth / 2,
            coords.y + yOffset,
            barraWidth,
            barraHeight * 2
        );

        const escudoWidth = (jugador.escudo / jugador.maxEscudo) * barraWidth;
        this.ctx.fillStyle = "#0088ff";
        this.ctx.fillRect(
            coords.x - barraWidth / 2,
            coords.y + yOffset,
            escudoWidth,
            barraHeight
        );

        const vidaWidth = (jugador.vida / jugador.maxVida) * barraWidth;
        this.ctx.fillStyle = esYo ? "#00ff88" : "#ff4444";
        this.ctx.fillRect(
            coords.x - barraWidth / 2,
            coords.y + yOffset + barraHeight,
            vidaWidth,
            barraHeight
        );

        if (jugador.regenerandoEscudo && jugador.escudo < jugador.maxEscudo) {
            this.ctx.strokeStyle = "#00ffff";
            this.ctx.lineWidth = 1 * this.escala;
            this.ctx.strokeRect(
                coords.x - barraWidth / 2 - 1 * this.escala,
                coords.y + yOffset - 1 * this.escala,
                barraWidth + 2 * this.escala,
                barraHeight * 2 + 2 * this.escala
            );
        }
    }

    dibujarCajasMunicion() {
        this.cajasMunicion.forEach((caja) => {
            const coords = this.convertirCoordenadas(caja.x, caja.y);
            const tamaño = 20 * this.escala;

            this.ctx.fillStyle = "#ffff00";
            this.ctx.fillRect(
                coords.x - tamaño / 2,
                coords.y - tamaño / 2,
                tamaño,
                tamaño
            );

            this.ctx.strokeStyle = "#ff8800";
            this.ctx.lineWidth = 2 * this.escala;
            this.ctx.strokeRect(
                coords.x - tamaño / 2,
                coords.y - tamaño / 2,
                tamaño,
                tamaño
            );

            this.ctx.fillStyle = "#000000";
            this.ctx.font = `${12 * this.escala}px Arial`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("🔫", coords.x, coords.y);
        });
    }

    actualizarInfoMunicion() {
        const infoMunicion = document.getElementById("infoMunicion");
        const armaActual = this.sistemaArmas.obtenerArmaActual();
        const nombreArma = armaActual ? armaActual.nombre : "Pistola Básica";
        const maxEnArma = armaActual ? armaActual.municionEnArma : 12;
        
        // Asegurar que maxArma esté actualizado
        this.municion.maxArma = maxEnArma;
        
        const textoMunicion = `Arma: ${nombreArma} | Munición: ${this.municion.enArma}/${maxEnArma} | Total: ${this.municion.total}/${this.municion.maxTotal}`;
        let textoRecarga = "";

        if (this.municion.recargando) {
            textoRecarga = "🔄 RECARGANDO...";
        } else if (this.municion.total > 0 && this.municion.enArma < maxEnArma) {
            textoRecarga = "Presiona R para recargar";
        } else if (this.municion.total <= 0) {
            textoRecarga = "¡Sin munición! Busca cajas amarillas";
        } else if (this.municion.total >= this.municion.maxTotal) {
            textoRecarga = "¡Munición máxima alcanzada!";
        }

        infoMunicion.innerHTML = `
            <div>${textoMunicion}</div>
            <div>${textoRecarga}</div>
        `;
    }

    iniciarLoop() {
        const loop = () => {
            if (this.enJuego) {
                this.actualizar();
                this.dibujar();
        // (Se removió render de torretas)
                requestAnimationFrame(loop);
            }
        };
        loop();
    }
}

// Inicializar el juego cuando se carga la página
window.addEventListener("load", () => {
    window.juego = new Juego();
});