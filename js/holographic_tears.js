// ============================================================
// HOLOGRAPHIC TEARS
// Sistema procedural de lágrimas para o Holograma 3D
//
// Não utiliza imagens externas.
// Toda a lágrima é construída matematicamente com Canvas 2D.
//
// Entrada:
//   - landmarks do face-api.js
//   - emoção atual
//   - confiança da emoção
//
// Saída:
//   - brilho úmido
//   - lágrima acumulando
//   - fluxo pela bochecha
//   - reflexo holográfico
// ============================================================


export class HolographicTears {

    constructor() {

        // =====================================================
        // ESTADO
        // =====================================================

        this.emotion = 'neutral';

        this.confidence = 0;

        this.targetIntensity = 0;

        this.intensity = 0;


        // =====================================================
        // RELÓGIO
        // =====================================================

        this.time = performance.now();


        // =====================================================
        // DUAS LÁGRIMAS
        // =====================================================

        this.left = this.createEyeState();

        this.right = this.createEyeState();

    }


    // =========================================================
    // ESTADO DE CADA OLHO
    // =========================================================

    createEyeState() {

        return {

            wetness: 0,

            tearProgress: 0,

            tearActive: false,

            streamProgress: 0,

            streamActive: false,

            nextTear: this.randomDelay(),

            tearSize: 1

        };

    }


    // =========================================================
    // TEMPO ALEATÓRIO ENTRE LÁGRIMAS
    // =========================================================

    randomDelay() {

        return (
            3500 +
            Math.random() * 5000
        );

    }


    // =========================================================
    // RECEBE EMOÇÃO
    // =========================================================

    setEmotion(
        emotion,
        confidence
    ) {

        this.emotion =
            emotion || 'neutral';

        this.confidence =
            Math.max(
                0,
                Math.min(
                    1,
                    confidence || 0
                )
            );


        // -----------------------------------------------------
        // SOMENTE SAD PRODUZ LÁGRIMAS
        // -----------------------------------------------------

        if (
            this.emotion === 'sad'
        ) {

            /*
             * Abaixo de 0.35:
             * praticamente somente umidade.
             */

            this.targetIntensity =
                Math.max(
                    0,
                    (
                        this.confidence -
                        0.30
                    ) / 0.70
                );

        } else {

            this.targetIntensity = 0;

        }

    }


    // =========================================================
    // ATUALIZA ESTADO
    // =========================================================

    update(delta) {

        // -----------------------------------------------------
        // SUAVIZA INTENSIDADE
        // -----------------------------------------------------

        this.intensity +=
            (
                this.targetIntensity -
                this.intensity
            ) * 0.025;


        // -----------------------------------------------------
        // ATUALIZA OLHOS
        // -----------------------------------------------------

        this.updateEye(
            this.left,
            delta
        );

        this.updateEye(
            this.right,
            delta
        );

    }


    // =========================================================
    // ATUALIZA UMA LÁGRIMA
    // =========================================================

    updateEye(
        eye,
        delta
    ) {

        // -----------------------------------------------------
        // UMIDADE
        // -----------------------------------------------------

        const targetWetness =
            this.intensity * 0.9;


        eye.wetness +=
            (
                targetWetness -
                eye.wetness
            ) * 0.035;


        // -----------------------------------------------------
        // SE NÃO ESTIVER TRISTE
        // -----------------------------------------------------

        if (
            this.intensity < 0.05
        ) {

            eye.tearActive = false;

            eye.streamActive = false;

            eye.tearProgress = 0;

            eye.streamProgress = 0;

            eye.nextTear =
                this.randomDelay();

            return;

        }


        // -----------------------------------------------------
        // CONTAGEM PARA PRÓXIMA LÁGRIMA
        // -----------------------------------------------------

        eye.nextTear -= delta;


        // -----------------------------------------------------
        // CRIA UMA LÁGRIMA
        // -----------------------------------------------------

        if (
            !eye.tearActive &&
            !eye.streamActive &&
            eye.nextTear <= 0
        ) {

            /*
             * Intensidade maior =
             * maior chance de produzir lágrima.
             */

            const probability =
                this.intensity;


            if (
                Math.random() <
                probability
            ) {

                eye.tearActive = true;

                eye.tearProgress = 0;

                eye.tearSize =
                    0.65 +
                    this.intensity *
                    0.75;

            }

            eye.nextTear =
                this.randomDelay();

        }


        // -----------------------------------------------------
        // FORMAÇÃO DA LÁGRIMA
        // -----------------------------------------------------

        if (
            eye.tearActive
        ) {

            eye.tearProgress +=
                delta / 1800;


            if (
                eye.tearProgress >= 1
            ) {

                eye.tearProgress = 1;

                eye.tearActive = false;


                // -------------------------------------------------
                // INTENSIDADE ALTA:
                // TRANSFORMA EM FLUXO
                // -------------------------------------------------

                if (
                    this.intensity > 0.55 &&
                    Math.random() < 0.65
                ) {

                    eye.streamActive = true;

                    eye.streamProgress = 0;

                }

            }

        }


        // -----------------------------------------------------
        // FLUXO
        // -----------------------------------------------------

        if (
            eye.streamActive
        ) {

            eye.streamProgress +=
                delta / (
                    5000 +
                    this.intensity * 2500
                );


            if (
                eye.streamProgress >= 1
            ) {

                eye.streamProgress = 1;

                eye.streamActive = false;

            }

        }

    }


    // =========================================================
    // DESENHA
    // =========================================================

    draw(
        ctx,
        landmarks,
        transform
    ) {

        if (
            !ctx ||
            !landmarks ||
            landmarks.length < 68
        ) {

            return;

        }


        const now =
            performance.now();

        const delta =
            now - this.time;

        this.time = now;


        this.update(delta);


        // -----------------------------------------------------
        // POSIÇÕES DOS OLHOS
        // -----------------------------------------------------

        const leftEye =
            this.getEyePosition(
                landmarks,
                'left'
            );


        const rightEye =
            this.getEyePosition(
                landmarks,
                'right'
            );


        if (
            leftEye
        ) {

            const p =
                this.transformPoint(
                    leftEye,
                    transform
                );


            this.drawEye(
                ctx,
                this.left,
                p.x,
                p.y,
                transform.scale
            );

        }


        if (
            rightEye
        ) {

            const p =
                this.transformPoint(
                    rightEye,
                    transform
                );


            this.drawEye(
                ctx,
                this.right,
                p.x,
                p.y,
                transform.scale
            );

        }

    }


    // =========================================================
    // PEGA POSIÇÃO DO OLHO
    // =========================================================

    getEyePosition(
        landmarks,
        side
    ) {

        /*
         * Face-api.js 68 landmarks.
         *
         * left eye:
         *   36–41
         *
         * right eye:
         *   42–47
         *
         * Usamos a região inferior do olho.
         */

        const indexes =
            side === 'left'
                ? [36, 37, 38, 39, 40, 41]
                : [42, 43, 44, 45, 46, 47];


        const points =
            indexes
                .map(
                    i => landmarks[i]
                )
                .filter(Boolean);


        if (
            points.length === 0
        ) {

            return null;

        }


        /*
         * Procuramos o ponto mais baixo
         * do olho.
         */

        let bottom =
            points[0];


        for (
            const p of points
        ) {

            if (
                p.y > bottom.y
            ) {

                bottom = p;

            }

        }


        return {

            x: bottom.x,

            y: bottom.y

        };

    }


    // =========================================================
    // TRANSFORMA CÂMERA → HOLOGRAMA
    // =========================================================

    transformPoint(
        point,
        transform
    ) {

        return {

            x:
                transform.drawX +
                (
                    point.x -
                    transform.frameX
                ) *
                transform.scaleX,

            y:
                transform.drawY +
                (
                    point.y -
                    transform.frameY
                ) *
                transform.scaleY

        };

    }


    // =========================================================
    // DESENHA OLHO
    // =========================================================

    drawEye(
        ctx,
        eye,
        x,
        y,
        scale
    ) {

        const size =
            Math.max(
                1,
                scale
            );


        // -----------------------------------------------------
        // BRILHO ÚMIDO
        // -----------------------------------------------------

        this.drawWetGlow(
            ctx,
            x,
            y,
            eye.wetness,
            size
        );


        // -----------------------------------------------------
        // LÁGRIMA
        // -----------------------------------------------------

        if (
            eye.tearActive ||
            eye.tearProgress > 0
        ) {

            this.drawTearDrop(
                ctx,
                x,
                y,
                eye.tearProgress,
                eye.tearSize,
                size
            );

        }


        // -----------------------------------------------------
        // FLUXO
        // -----------------------------------------------------

        if (
            eye.streamActive
        ) {

            this.drawStream(
                ctx,
                x,
                y,
                eye.streamProgress,
                size
            );

        }

    }


    // =========================================================
    // BRILHO ÚMIDO
    // =========================================================

    drawWetGlow(
        ctx,
        x,
        y,
        intensity,
        scale
    ) {

        if (
            intensity < 0.01
        ) {

            return;

        }


        const pulse =
            0.75 +
            Math.sin(
                this.time * 0.002
            ) * 0.25;


        const radius =
            (
                2.5 +
                intensity * 4
            ) *
            scale;


        const alpha =
            intensity *
            0.32 *
            pulse;


        const gradient =
            ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                radius
            );


        gradient.addColorStop(
            0,
            `rgba(255,255,255,${alpha})`
        );


        gradient.addColorStop(
            0.25,
            `rgba(210,240,255,${alpha * 0.65})`
        );


        gradient.addColorStop(
            0.65,
            `rgba(120,200,255,${alpha * 0.20})`
        );


        gradient.addColorStop(
            1,
            'rgba(80,170,255,0)'
        );


        ctx.save();

        ctx.globalCompositeOperation =
            'screen';

        ctx.fillStyle =
            gradient;


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();

    }


    // =========================================================
    // GOTA
    // =========================================================

    drawTearDrop(
        ctx,
        x,
        y,
        progress,
        tearSize,
        scale
    ) {

        const p =
            Math.sin(
                Math.min(
                    progress,
                    1
                ) *
                Math.PI *
                0.5
            );


        if (
            p <= 0
        ) {

            return;

        }


        const width =
            2.8 *
            tearSize *
            p *
            scale;


        const height =
            7 *
            tearSize *
            p *
            scale;


        ctx.save();

        ctx.globalCompositeOperation =
            'screen';


        // -----------------------------------------------------
        // CORPO DA LÁGRIMA
        // -----------------------------------------------------

        const gradient =
            ctx.createLinearGradient(
                x - width,
                y,
                x + width,
                y + height
            );


        gradient.addColorStop(
            0,
            'rgba(180,225,255,0.04)'
        );


        gradient.addColorStop(
            0.35,
            'rgba(205,240,255,0.26)'
        );


        gradient.addColorStop(
            0.65,
            'rgba(90,180,255,0.13)'
        );


        gradient.addColorStop(
            1,
            'rgba(80,160,255,0)'
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.moveTo(
            x,
            y
        );


        ctx.bezierCurveTo(
            x - width,
            y + height * 0.35,

            x - width * 0.8,
            y + height * 0.78,

            x,
            y + height
        );


        ctx.bezierCurveTo(
            x + width * 0.8,
            y + height * 0.78,

            x + width,
            y + height * 0.35,

            x,
            y
        );


        ctx.fill();


        // -----------------------------------------------------
        // REFLEXO
        // -----------------------------------------------------

        ctx.fillStyle =
            'rgba(255,255,255,0.55)';


        ctx.beginPath();

        ctx.ellipse(
            x - width * 0.30,
            y + height * 0.32,
            Math.max(
                0.5,
                width * 0.16
            ),
            Math.max(
                0.8,
                height * 0.22
            ),
            -0.35,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.restore();

    }


    // =========================================================
    // FLUXO PELA BOCHECHA
    // =========================================================

    drawStream(
        ctx,
        x,
        y,
        progress,
        scale
    ) {

        const distance =
            (
                35 +
                this.intensity * 65
            ) *
            scale;


        const startX =
            x;


        const startY =
            y + 4 * scale;


        /*
         * Curva irregular.
         */

        const control1X =
            x -
            2 * scale;


        const control1Y =
            y +
            distance * 0.25;


        const control2X =
            x +
            5 * scale;


        const control2Y =
            y +
            distance * 0.65;


        const endX =
            x +
            1 * scale;


        const endY =
            y +
            distance;


        const points = [];


        // -----------------------------------------------------
        // CONSTRÓI CURVA
        // -----------------------------------------------------

        for (
            let i = 0;
            i <= 30;
            i++
        ) {

            const t =
                i / 30;


            const px =
                Math.pow(
                    1 - t,
                    3
                ) *
                startX +

                3 *
                Math.pow(
                    1 - t,
                    2
                ) *
                t *
                control1X +

                3 *
                (1 - t) *
                Math.pow(
                    t,
                    2
                ) *
                control2X +

                Math.pow(
                    t,
                    3
                ) *
                endX;


            const py =
                Math.pow(
                    1 - t,
                    3
                ) *
                startY +

                3 *
                Math.pow(
                    1 - t,
                    2
                ) *
                t *
                control1Y +

                3 *
                (1 - t) *
                Math.pow(
                    t,
                    2
                ) *
                control2Y +

                Math.pow(
                    t,
                    3
                ) *
                endY;


            points.push({
                x: px,
                y: py
            });

        }


        const visible =
            Math.max(
                2,
                Math.floor(
                    progress *
                    points.length
                )
            );


        ctx.save();

        ctx.globalCompositeOperation =
            'screen';


        // -----------------------------------------------------
        // GRADIENTE DO FLUXO
        // -----------------------------------------------------

        const gradient =
            ctx.createLinearGradient(
                startX,
                startY,
                endX,
                endY
            );


        gradient.addColorStop(
            0,
            'rgba(220,245,255,0.42)'
        );


        gradient.addColorStop(
            0.35,
            'rgba(150,220,255,0.25)'
        );


        gradient.addColorStop(
            0.70,
            'rgba(80,180,255,0.12)'
        );


        gradient.addColorStop(
            1,
            'rgba(80,160,255,0.01)'
        );


        ctx.strokeStyle =
            gradient;


        ctx.lineWidth =
            (
                0.8 +
                this.intensity * 1.1
            ) *
            scale;


        ctx.lineCap =
            'round';


        // -----------------------------------------------------
        // DESENHA CURVA
        // -----------------------------------------------------

        ctx.beginPath();

        ctx.moveTo(
            points[0].x,
            points[0].y
        );


        for (
            let i = 1;
            i < visible;
            i++
        ) {

            ctx.lineTo(
                points[i].x,
                points[i].y
            );

        }


        ctx.stroke();


        // -----------------------------------------------------
        // PEQUENO REFLEXO
        // -----------------------------------------------------

        const last =
            points[
                visible - 1
            ];


        const sparkle =
            0.35 +
            Math.sin(
                this.time * 0.004
            ) * 0.25;


        ctx.fillStyle =
            `rgba(255,255,255,${sparkle})`;


        ctx.beginPath();

        ctx.arc(
            last.x -
            0.7 * scale,

            last.y,

            Math.max(
                0.6,
                1.15 * scale
            ),

            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();

    }

}
