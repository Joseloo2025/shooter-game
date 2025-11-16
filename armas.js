class SistemaArmas {
    constructor() {
        this.categoriasArmas = {
            pistola: 1,
            rifleAsalto: 2,
            escopeta: 3,
            subfusil: 4,
            francotirador: 5,
            ametralladora: 6
        };

        this.armasDisponibles = {
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
                precision: 0.95,
                sprite: "IMG/armas/pistola.png"
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
                precision: 0.98,
                sprite: "IMG/armas/pistola_elite.png"
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
                precision: 0.85,
                sprite: "IMG/armas/rifle.png"
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
                precision: 0.90,
                sprite: "IMG/armas/rifle_avanzado.png"
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
                proyectiles: 5,
                sprite: "IMG/armas/escopeta.png"
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
                proyectiles: 7,
                sprite: "IMG/armas/escopeta_auto.png"
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
                precision: 0.80,
                sprite: "IMG/armas/smg.png"
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
                precision: 0.85,
                sprite: "IMG/armas/smg_tactico.png"
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
                precision: 0.99,
                sprite: "IMG/armas/francotirador.png"
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
                precision: 1.0,
                sprite: "IMG/armas/francotirador_elite.png"
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
                precision: 0.75,
                sprite: "IMG/armas/ametralladora.png"
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
                precision: 0.70,
                sprite: "IMG/armas/ametralladora_pesada.png"
            }
        };

        this.slotsArmas = {
            1: 1, // Pistola básica por defecto
            2: null,
            3: null,
            4: null,
            5: null,
            6: null
        };

        this.armaActual = 1;
    }

    // Obtener arma por ID
    obtenerArma(id) {
        return this.armasDisponibles[id];
    }

    // Obtener armas por tipo
    obtenerArmasPorTipo(tipo) {
        return Object.values(this.armasDisponibles).filter(arma => arma.tipo === tipo);
    }

    // Comprar arma
    comprarArma(jugador, armaId) {
        const arma = this.armasDisponibles[armaId];
        if (!arma) return false;

        if (jugador.oro >= arma.precio) {
            const slot = this.categoriasArmas[arma.tipo];

            // Verificar si ya tiene un arma de este tipo
            if (this.slotsArmas[slot]) {
                // Ya tiene un arma de este tipo, reemplazar
                jugador.oro -= arma.precio;
                this.slotsArmas[slot] = armaId;
                return { exito: true, mensaje: `Arma ${arma.nombre} comprada y equipada` };
            } else {
                jugador.oro -= arma.precio;
                this.slotsArmas[slot] = armaId;
                return { exito: true, mensaje: `Arma ${arma.nombre} comprada y equipada` };
            }
        } else {
            return { exito: false, mensaje: "Oro insuficiente" };
        }
    }

    // Cambiar arma actual
    cambiarArma(slot) {
        if (this.slotsArmas[slot]) {
            this.armaActual = slot;
            return this.armasDisponibles[this.slotsArmas[slot]];
        }
        return null;
    }

    // Obtener arma actual
    obtenerArmaActual() {
        const armaId = this.slotsArmas[this.armaActual];
        return armaId ? this.armasDisponibles[armaId] : null;
    }

    // Verificar si puede disparar
    puedeDisparar(ultimoDisparo) {
        const arma = this.obtenerArmaActual();
        if (!arma) return false;

        return (Date.now() - ultimoDisparo) >= arma.velocidadDisparo;
    }

    // Obtener información de slots
    obtenerInfoSlots() {
        const info = {};
        for (let slot = 1; slot <= 6; slot++) {
            const armaId = this.slotsArmas[slot];
            info[slot] = armaId ? this.armasDisponibles[armaId] : null;
        }
        return info;
    }

    // Reiniciar armas (al morir o nueva partida)
    reiniciarArmas() {
        this.slotsArmas = {
            1: 1, // Pistola básica por defecto
            2: null,
            3: null,
            4: null,
            5: null,
            6: null
        };
        this.armaActual = 1;
    }
}