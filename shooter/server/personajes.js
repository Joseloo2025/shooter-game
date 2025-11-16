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

module.exports = SISTEMA_PERSONAJES;
