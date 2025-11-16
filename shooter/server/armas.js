const SISTEMA_ARMAS = {
    ORO_POR_KILL: 50,
    ORO_POR_MUERTE: 10,
    ORO_INICIAL: 100,
    ARMAS_DISPONIBLES: {
        // PISTOLAS
        1: {
            id: 1,
            nombre: "Pistola Básica",
            tipo: "pistola",
            precio: 0,
            daño: 25,
            velocidadDisparo: 500,
            velocidadBala: 10,
            municionMaxima: 12,
            municionEnArma: 12,
            precision: 0.95
        },
        2: {
            id: 2,
            nombre: "Pistola Elite",
            tipo: "pistola",
            precio: 100,
            daño: 30,
            velocidadDisparo: 400,
            velocidadBala: 12,
            municionMaxima: 15,
            municionEnArma: 15,
            precision: 0.98
        },

        // RIFLES DE ASALTO
        3: {
            id: 3,
            nombre: "Rifle Standard",
            tipo: "rifleAsalto",
            precio: 200,
            daño: 35,
            velocidadDisparo: 150,
            velocidadBala: 15,
            municionMaxima: 30,
            municionEnArma: 30,
            precision: 0.85
        },
        4: {
            id: 4,
            nombre: "Rifle Avanzado",
            tipo: "rifleAsalto",
            precio: 400,
            daño: 40,
            velocidadDisparo: 120,
            velocidadBala: 18,
            municionMaxima: 35,
            municionEnArma: 35,
            precision: 0.90
        },

        // ESCOPETAS
        5: {
            id: 5,
            nombre: "Escopeta Básica",
            tipo: "escopeta",
            precio: 300,
            daño: 20,
            velocidadDisparo: 800,
            velocidadBala: 8,
            municionMaxima: 8,
            municionEnArma: 8,
            precision: 0.70,
            proyectiles: 5
        },
        6: {
            id: 6,
            nombre: "Escopeta Automática",
            tipo: "escopeta",
            precio: 600,
            daño: 15,
            velocidadDisparo: 500,
            velocidadBala: 10,
            municionMaxima: 12,
            municionEnArma: 12,
            precision: 0.75,
            proyectiles: 7
        },

        // SUBFUSILES
        7: {
            id: 7,
            nombre: "Subfusil SMG",
            tipo: "subfusil",
            precio: 250,
            daño: 20,
            velocidadDisparo: 80,
            velocidadBala: 12,
            municionMaxima: 50,
            municionEnArma: 50,
            precision: 0.80
        },
        8: {
            id: 8,
            nombre: "Subfusil Táctico",
            tipo: "subfusil",
            precio: 450,
            daño: 25,
            velocidadDisparo: 70,
            velocidadBala: 14,
            municionMaxima: 60,
            municionEnArma: 60,
            precision: 0.85
        },

        // FRANCOTIRADORES
        9: {
            id: 9,
            nombre: "Francotirador Básico",
            tipo: "francotirador",
            precio: 500,
            daño: 80,
            velocidadDisparo: 1200,
            velocidadBala: 25,
            municionMaxima: 10,
            municionEnArma: 10,
            precision: 0.99
        },
        10: {
            id: 10,
            nombre: "Francotirador Elite",
            tipo: "francotirador",
            precio: 800,
            daño: 100,
            velocidadDisparo: 1000,
            velocidadBala: 30,
            municionMaxima: 8,
            municionEnArma: 8,
            precision: 1.0
        },

        // AMETRALLADORAS
        11: {
            id: 11,
            nombre: "Ametralladora Ligera",
            tipo: "ametralladora",
            precio: 600,
            daño: 25,
            velocidadDisparo: 100,
            velocidadBala: 13,
            municionMaxima: 100,
            municionEnArma: 100,
            precision: 0.75
        },
        12: {
            id: 12,
            nombre: "Ametralladora Pesada",
            tipo: "ametralladora",
            precio: 1000,
            daño: 30,
            velocidadDisparo: 90,
            velocidadBala: 15,
            municionMaxima: 150,
            municionEnArma: 150,
            precision: 0.70
        }
    },
    CATEGORIAS_ARMAS: {
        pistola: 1,
        rifleAsalto: 2,
        escopeta: 3,
        subfusil: 4,
        francotirador: 5,
        ametralladora: 6
    }
};

function obtenerArmaPorId(armaId) {
    return SISTEMA_ARMAS.ARMAS_DISPONIBLES[armaId];
}

function obtenerSlotPorTipo(tipoArma) {
    return SISTEMA_ARMAS.CATEGORIAS_ARMAS[tipoArma];
}

function comprarArmaJugador(jugadores, jugadorId, armaId) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return { exito: false, mensaje: "Jugador no encontrado" };

    const arma = obtenerArmaPorId(armaId);
    if (!arma) return { exito: false, mensaje: "Arma no válida" };

    if (jugador.oro >= arma.precio) {
        const slot = obtenerSlotPorTipo(arma.tipo);

        jugador.oro -= arma.precio;
        jugador.armas[slot] = armaId;
        jugador.estadisticasPersonaje.oroGastado += arma.precio;

        return {
            exito: true,
            mensaje: `Arma ${arma.nombre} comprada y equipada`,
            arma: arma,
            oroRestante: jugador.oro,
        };
    } else {
        return { exito: false, mensaje: "Oro insuficiente" };
    }
}

function cambiarArmaJugador(jugadores, jugadorId, slot) {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return false;

    if (jugador.armas[slot]) {
        jugador.armaActual = slot;
        return true;
    }
    return false;
}

module.exports = {
    SISTEMA_ARMAS,
    obtenerArmaPorId,
    obtenerSlotPorTipo,
    comprarArmaJugador,
    cambiarArmaJugador,
};
