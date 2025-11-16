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

function activarHabilidadJugador(jugadores, salas, io, logEvento, SISTEMA_PERSONAJES, jugadorId) {
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

function procesarHabilidadesActivas(sala, jugadores, aplicarDano, SISTEMA_PERSONAJES, io) {
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

module.exports = {
    SISTEMA_PERSONAJES,
    activarHabilidadJugador,
    procesarHabilidadesActivas,
};
