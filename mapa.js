class Mapa {
    constructor(numeroMapa = 1) {
        this.numeroMapa = numeroMapa;
        this.obstaculos = this.generarMapa(numeroMapa);
    }

    generarMapa(numeroMapa) {
        switch (numeroMapa) {
            case 1:
                return this.generarMapa1();
            case 2:
                return this.generarMapa2();
            case 3:
                return this.generarMapa3();
            default:
                return this.generarMapa1();
        }
    }

    generarMapa1() {
        return [
            {
                tipo: "rectangulo",
                x: 0,
                y: 0,
                ancho: 800,
                alto: 20,
                color: "#8B4513",
            },
            {
                tipo: "rectangulo",
                x: 0,
                y: 580,
                ancho: 800,
                alto: 20,
                color: "#8B4513",
            },
            {
                tipo: "rectangulo",
                x: 0,
                y: 0,
                ancho: 20,
                alto: 600,
                color: "#8B4513",
            },
            {
                tipo: "rectangulo",
                x: 780,
                y: 0,
                ancho: 20,
                alto: 600,
                color: "#8B4513",
            },
            {
                tipo: "rectangulo",
                x: 200,
                y: 150,
                ancho: 50,
                alto: 200,
                color: "#A52A2A",
            },
            {
                tipo: "rectangulo",
                x: 400,
                y: 300,
                ancho: 150,
                alto: 50,
                color: "#A52A2A",
            },
            {
                tipo: "rectangulo",
                x: 550,
                y: 100,
                ancho: 50,
                alto: 150,
                color: "#A52A2A",
            },
            {
                tipo: "rectangulo",
                x: 300,
                y: 400,
                ancho: 100,
                alto: 50,
                color: "#A52A2A",
            },
            { tipo: "circulo", x: 150, y: 450, radio: 40, color: "#2F4F4F" },
            { tipo: "circulo", x: 650, y: 200, radio: 35, color: "#2F4F4F" },
            { tipo: "circulo", x: 350, y: 150, radio: 30, color: "#2F4F4F" },
            { tipo: "cuadrado", x: 100, y: 100, tamaño: 60, color: "#556B2F" },
            { tipo: "cuadrado", x: 600, y: 400, tamaño: 70, color: "#556B2F" },
        ];
    }

    generarMapa2() {
        const semilla = 12345;
        const obstaculos = [
            {
                tipo: "rectangulo",
                x: 0,
                y: 0,
                ancho: 800,
                alto: 20,
                color: "#2F4F4F",
            },
            {
                tipo: "rectangulo",
                x: 0,
                y: 580,
                ancho: 800,
                alto: 20,
                color: "#2F4F4F",
            },
            {
                tipo: "rectangulo",
                x: 0,
                y: 0,
                ancho: 20,
                alto: 600,
                color: "#2F4F4F",
            },
            {
                tipo: "rectangulo",
                x: 780,
                y: 0,
                ancho: 20,
                alto: 600,
                color: "#2F4F4F",
            },
        ];

        for (let i = 0; i < 8; i++) {
            const pseudoRandom = (Math.sin(semilla + i * 100) * 10000) % 1;
            const x = 50 + pseudoRandom * 600;
            const y = 50 + ((Math.sin(semilla + i * 200) * 10000) % 1) * 400;
            const tipo = pseudoRandom > 0.5 ? "rectangulo" : "circulo";

            if (tipo === "rectangulo") {
                const ancho = 30 + ((Math.sin(semilla + i * 300) * 10000) % 1) * 80;
                const alto = 30 + ((Math.sin(semilla + i * 400) * 10000) % 1) * 80;
                obstaculos.push({
                    tipo: "rectangulo",
                    x: x,
                    y: y,
                    ancho: Math.max(10, ancho),
                    alto: Math.max(10, alto),
                    color: this.obtenerColorAleatorioConsistente(i),
                });
            } else {
                const radio = 20 + ((Math.sin(semilla + i * 500) * 10000) % 1) * 30;
                obstaculos.push({
                    tipo: "circulo",
                    x: x,
                    y: y,
                    radio: Math.max(5, radio),
                    color: this.obtenerColorAleatorioConsistente(i),
                });
            }
        }

        return obstaculos;
    }

    generarMapa3() {
        const obstaculos = [
            {
                tipo: "rectangulo",
                x: 0,
                y: 0,
                ancho: 800,
                alto: 15,
                color: "#8B0000",
            },
            {
                tipo: "rectangulo",
                x: 0,
                y: 585,
                ancho: 800,
                alto: 15,
                color: "#8B0000",
            },
            {
                tipo: "rectangulo",
                x: 0,
                y: 0,
                ancho: 15,
                alto: 600,
                color: "#8B0000",
            },
            {
                tipo: "rectangulo",
                x: 785,
                y: 0,
                ancho: 15,
                alto: 600,
                color: "#8B0000",
            },
        ];

        const patrones = [
            {
                tipo: "rectangulo",
                x: 100,
                y: 100,
                ancho: 200,
                alto: 30,
                color: "#483D8B",
            },
            {
                tipo: "rectangulo",
                x: 500,
                y: 100,
                ancho: 30,
                alto: 200,
                color: "#483D8B",
            },
            {
                tipo: "rectangulo",
                x: 200,
                y: 300,
                ancho: 150,
                alto: 30,
                color: "#483D8B",
            },
            {
                tipo: "rectangulo",
                x: 400,
                y: 400,
                ancho: 30,
                alto: 150,
                color: "#483D8B",
            },
            { tipo: "circulo", x: 150, y: 450, radio: 35, color: "#2E8B57" },
            { tipo: "circulo", x: 650, y: 150, radio: 40, color: "#2E8B57" },
            { tipo: "circulo", x: 350, y: 250, radio: 25, color: "#2E8B57" },
            { tipo: "cuadrado", x: 600, y: 350, tamaño: 50, color: "#D2691E" },
            { tipo: "cuadrado", x: 250, y: 200, tamaño: 45, color: "#D2691E" },
        ];

        return obstaculos.concat(patrones);
    }

    obtenerColorAleatorioConsistente(indice) {
        const colores = [
            "#A52A2A",
            "#2F4F4F",
            "#556B2F",
            "#8B4513",
            "#483D8B",
            "#2E8B57",
        ];
        return colores[indice % colores.length];
    }

    dibujar(ctx, escala = 1) {
        escala = Math.max(0.1, escala);

        ctx.fillStyle = "rgba(26, 26, 46, 0.9)";
        ctx.fillRect(0, 0, 800 * escala, 600 * escala);

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.font = `${120 * escala}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`MAPA ${this.numeroMapa}`, 400 * escala, 300 * escala);

        this.obstaculos.forEach((obstaculo) => {
            ctx.fillStyle = obstaculo.color;

            switch (obstaculo.tipo) {
                case "rectangulo":
                    const anchoRect = Math.max(1, obstaculo.ancho * escala);
                    const altoRect = Math.max(1, obstaculo.alto * escala);
                    ctx.fillRect(obstaculo.x * escala, obstaculo.y * escala, anchoRect, altoRect);
                    break;

                case "circulo":
                    const radio = Math.max(1, obstaculo.radio * escala);
                    ctx.beginPath();
                    ctx.arc(obstaculo.x * escala, obstaculo.y * escala, radio, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case "cuadrado":
                    const tamaño = Math.max(1, obstaculo.tamaño * escala);
                    ctx.fillRect(obstaculo.x * escala, obstaculo.y * escala, tamaño, tamaño);
                    break;
            }
        });
    }

    colisiona(x, y, radio = 0, escala = 1) {
        escala = Math.max(0.1, escala);

        for (const obstaculo of this.obstaculos) {
            switch (obstaculo.tipo) {
                case "rectangulo":
                    if (
                        x + radio > obstaculo.x * escala &&
                        x - radio < (obstaculo.x + obstaculo.ancho) * escala &&
                        y + radio > obstaculo.y * escala &&
                        y - radio < (obstaculo.y + obstaculo.alto) * escala
                    ) {
                        return true;
                    }
                    break;

                case "circulo":
                    const distancia = Math.sqrt(
                        (x - obstaculo.x * escala) ** 2 + (y - obstaculo.y * escala) ** 2
                    );
                    const radioObstaculo = Math.max(1, obstaculo.radio * escala);
                    if (distancia < (radioObstaculo + radio) * escala) {
                        return true;
                    }
                    break;

                case "cuadrado":
                    if (
                        x + radio > obstaculo.x * escala &&
                        x - radio < (obstaculo.x + obstaculo.tamaño) * escala &&
                        y + radio > obstaculo.y * escala &&
                        y - radio < (obstaculo.y + obstaculo.tamaño) * escala
                    ) {
                        return true;
                    }
                    break;
            }
        }
        return false;
    }
}