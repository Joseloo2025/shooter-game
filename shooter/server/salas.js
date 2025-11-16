let ctx = {};

function setContext(context) {
    ctx = context;
}

function generarCodigoSala() {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "";
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    if (ctx.salas.has(codigo)) {
        return generarCodigoSala();
    }
    return codigo;
}

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

function regenerarEscudos(sala) {
    const ahora = Date.now();
    let necesitaActualizacion = false;

    sala.jugadores.forEach((jugadorId) => {
        const jugador = ctx.jugadores.get(jugadorId);
        if (
            jugador &&
            ahora - jugador.ultimoDano > ctx.CONFIG_JUEGO.TIEMPO_REGENERACION
        ) {
            if (jugador.escudo < jugador.maxEscudo) {
                const personaje = ctx.SISTEMA_PERSONAJES[jugador.personaje];
                const multiplicadorRegeneracion = personaje.estadisticas.regeneracionEscudo || 1;

                jugador.escudo = Math.min(
                    jugador.escudo + (ctx.CONFIG_JUEGO.REGENERACION_ESCUDO * multiplicadorRegeneracion),
                    jugador.maxEscudo
                );
                jugador.regenerandoEscudo = true;
                necesitaActualizacion = true;
            }
        } else if (
            jugador &&
            jugador.regenerandoEscudo &&
            ahora - jugador.ultimoDano <= ctx.CONFIG_JUEGO.TIEMPO_REGENERACION
        ) {
            jugador.regenerandoEscudo = false;
            necesitaActualizacion = true;
        }
    });

    if (necesitaActualizacion) {
        const jugadoresSala = Array.from(sala.jugadores).map((id) =>
            ctx.jugadores.get(id)
        );
        ctx.io.to(sala.codigo).emit("actualizarJugadores", jugadoresSala);
    }
}

function limpiarSalasVacias() {
    for (const [codigo, sala] of ctx.salas.entries()) {
        if (sala.jugadores.size === 0) {
            if (sala.intervalos) {
                clearInterval(sala.intervalos.escudo);
                clearInterval(sala.intervalos.cajas);
                clearInterval(sala.intervalos.tiempo);
            }
            ctx.salas.delete(codigo);
            ctx.logEvento(`Sala ${codigo} eliminada por estar vacía`, "CLEANUP");
        }
    }
}

function determinarGanador(sala) {
    let maxKills = -1;
    let ganadores = [];

    sala.jugadores.forEach((jugadorId) => {
        const jugador = ctx.jugadores.get(jugadorId);
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

function cambiarMapa(sala) {
    sala.mapaActual++;

    if (sala.mapaActual > 3) {
        const jugadoresFinal = Array.from(sala.jugadores).map((id) =>
            ctx.jugadores.get(id)
        );
        ctx.io.to(sala.codigo).emit("finCicloMapas", { jugadores: jugadoresFinal });

        ctx.estadisticasGlobales.totalPartidasJugadas++;
        ctx.logEvento(
            `Ciclo de mapas terminado en sala ${sala.codigo}. Partidas totales: ${ctx.estadisticasGlobales.totalPartidasJugadas}`,
            "GAME_END"
        );

        sala.jugadores.forEach((jugadorId) => {
            const jugador = ctx.jugadores.get(jugadorId);
            if (jugador) {
                jugador.sala = null;
            }
        });

        if (sala.intervalos) {
            clearInterval(sala.intervalos.escudo);
            clearInterval(sala.intervalos.cajas);
            clearInterval(sala.intervalos.tiempo);
        }
        ctx.salas.delete(sala.codigo);

        return;
    }

    sala.mapa = new ctx.Mapa(sala.mapaActual);
    sala.tiempoRestante = ctx.CONFIG_JUEGO.TIEMPO_PARTIDA;
    sala.enTransicion = false;

    sala.jugadores.forEach((jugadorId) => {
        const jugador = ctx.jugadores.get(jugadorId);
        if (jugador) {
            const posicion = generarPosicionSegura(sala.mapa);
            jugador.x = posicion.x;
            jugador.y = posicion.y;

            const personaje = ctx.SISTEMA_PERSONAJES[jugador.personaje];
            jugador.vida = ctx.CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
            jugador.escudo = ctx.CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;
            jugador.maxVida = ctx.CONFIG_JUEGO.VIDA_MAXIMA * personaje.estadisticas.vidaMultiplicador;
            jugador.maxEscudo = ctx.CONFIG_JUEGO.ESCUDO_MAXIMO * personaje.estadisticas.escudoMultiplicador;

            jugador.municion = ctx.CONFIG_JUEGO.MUNICION_INICIAL * (personaje.estadisticas.capacidadMunicion || 1);
            jugador.ultimoDano = Date.now();
            jugador.regenerandoEscudo = false;
            jugador.kills = 0;
            jugador.muertes = 0;
        }
    });

    generarCajasMunicion(sala);

    if (sala.intervalos && sala.intervalos.escudo) {
        clearInterval(sala.intervalos.escudo);
    }

    const intervaloEscudo = setInterval(() => {
        if (ctx.salas.has(sala.codigo) && sala.enJuego && !sala.enTransicion) {
            regenerarEscudos(sala);
        } else {
            clearInterval(intervaloEscudo);
        }
    }, 1000);

    sala.intervalos.escudo = intervaloEscudo;

    iniciarTemporizador(sala);

    ctx.io.to(sala.codigo).emit("cambioMapa", {
        mapa: sala.mapaActual,
        tiempoRestante: sala.tiempoRestante,
        jugadores: Array.from(sala.jugadores).map((id) => ctx.jugadores.get(id)),
    });

    ctx.io.to(sala.codigo).emit("actualizarCajasMunicion", sala.cajasMunicion);

    ctx.logEvento(
        `Sala ${sala.codigo} cambió al mapa ${sala.mapaActual}`,
        "MAP_CHANGE"
    );
}

function iniciarTemporizador(sala) {
    if (sala.intervalos && sala.intervalos.tiempo) {
        clearInterval(sala.intervalos.tiempo);
    }

    sala.intervalos.tiempo = setInterval(() => {
        if (!sala.enJuego || sala.enTransicion) return;

        sala.tiempoRestante -= 1000;

        ctx.io.to(sala.codigo).emit("actualizarTiempo", {
            tiempoRestante: sala.tiempoRestante,
            minutos: Math.floor(sala.tiempoRestante / 60000),
            segundos: Math.floor((sala.tiempoRestante % 60000) / 1000),
        });

        if (sala.tiempoRestante <= 0) {
            clearInterval(sala.intervalos.tiempo);
            finalizarPartida(sala);
        }
    }, 1000);
}

function finalizarPartida(sala) {
    sala.enTransicion = true;

    const ganadores = determinarGanador(sala);

    let statsMensaje = `Partida terminada en sala ${sala.codigo}, mapa ${sala.mapaActual}. `;
    if (ganadores.length === 1) {
        statsMensaje += `Ganador: ${ganadores[0].nombre} con ${ganadores[0].kills} kills`;
    } else if (ganadores.length > 1) {
        statsMensaje += `Empate entre: ${ganadores.map((g) => g.nombre).join(", ")} con ${ganadores[0].kills} kills cada uno`;
    } else {
        statsMensaje += `No hay ganadores`;
    }

    ctx.logEvento(statsMensaje, "GAME_END");

    ctx.io.to(sala.codigo).emit("finPartida", {
        ganadores: ganadores,
        mapa: sala.mapaActual,
        esUltimoMapa: sala.mapaActual >= 3,
    });

    setTimeout(() => {
        cambiarMapa(sala);
    }, ctx.CONFIG_JUEGO.TIEMPO_TRANSICION);
}

function administrarTiempoSala(codigoSala, accion, datos = {}) {
    const sala = ctx.salas.get(codigoSala);
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
            ctx.logEvento(
                `Admin aceleró tiempo en sala ${codigoSala}: -${minutosAcelerar} min`,
                "ADMIN"
            );
            return { exito: true, mensaje: `Tiempo acelerado ${minutosAcelerar} minuto(s)` };

        case "pausar":
            sala.tiempoPausado = !sala.tiempoPausado;
            if (sala.intervalos && sala.intervalos.tiempo) {
                if (sala.tiempoPausado) {
                    clearInterval(sala.intervalos.tiempo);
                } else {
                    iniciarTemporizador(sala);
                }
            }
            ctx.logEvento(`Admin ${sala.tiempoPausado ? "pausó" : "reanudó"} tiempo en sala ${codigoSala}`, "ADMIN");
            return { exito: true, mensaje: `Tiempo ${sala.tiempoPausado ? "pausado" : "reanudado"}` };

        case "saltar_mapa":
            finalizarPartida(sala);
            ctx.logEvento(`Admin saltó mapa en sala ${codigoSala}`, "ADMIN");
            return { exito: true, mensaje: "Saltando al siguiente mapa" };

        case "terminar_partida":
            sala.mapaActual = 3;
            finalizarPartida(sala);
            ctx.logEvento(`Admin terminó partida en sala ${codigoSala}`, "ADMIN");
            return { exito: true, mensaje: "Partida terminada" };

        default:
            return { exito: false, mensaje: "Acción no válida" };
    }
}

module.exports = {
    setContext,
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
};
