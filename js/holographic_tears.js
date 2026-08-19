// ============================================================
// HOLOGRAPHIC TEARS
// Lágrimas procedurais para o Holograma 3D
// ============================================================

export class HolographicTears {

    constructor() {

        this.emotion = 'neutral';

        this.confidence = 0;

        this.intensity = 0;

        this.targetIntensity = 0;

        this.time = performance.now();

        this.left = this.createTearState();

        this.right = this.createTearState();
    }


    // =========================================================
    // ESTADO DA LÁGRIMA
    // =========================================================

    createTearState() {

        return {

            wetness: 0,

            forming: false,

            progress: 0,

            stream: false,

            streamProgress: 0,

            nextTear:
                3000 +
                Math.random() * 5000

        };

    }


    // =========================================================
    // RECEBE A EMOÇÃO
    // =========================================================

    setEmotion(
        emotion,
        confidence
    ) {

        this.emotion =
            emotion || 'neutral';

        this.confidence =
            confidence || 0;


        if (
            this.emotion === 'sad'
        ) {

            this.targetIntensity =
                Math.max(
                    0,
                    Math.min(
                        1,
                        (
                            this.confidence -
                            0.30
                        ) / 0.70
                    )
                );

        } else {

            this.targetIntensity = 0;

        }

    }


    // =========================================================
    // ATUALIZA ANIMAÇÃO
    // =========================================================

    update(delta) {

        this.intensity +=
            (
                this.targetIntensity -
                this.intensity
            ) * 0.025;


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
    // ATUALIZA UM OLHO
    // =========================================================

    updateEye(
        eye,
        delta
    ) {

        const targetWetness =
            this.intensity * 0.9;


        eye.wetness +=
            (
                targetWetness -
                eye.wetness
            ) * 0.035;


        if (
            this.intensity < 0.05
        ) {

            eye.forming = false;

            eye.stream = false;

            return;

        }


        eye.nextTear -= delta;


        // -----------------------------------------------------
        // COMEÇA UMA NOVA LÁGRIMA
        // -----------------------------------------------------

        if (
            !eye.forming &&
            !eye.stream &&
            eye.nextTear <= 0
        ) {

            if (
                Math.random() <
                this.intensity
            ) {

                eye.forming = true;

                eye.progress = 0;

            }


            eye.nextTear =
                3500 +
                Math.random() * 5000;

        }


        // -----------------------------------------------------
        // FORMAÇÃO
        // -----------------------------------------------------

        if (
            eye.forming
        ) {

            eye.progress +=
                delta / 1800;


            if (
                eye.progress >= 1
            ) {

                eye.progress = 1;

                eye.forming = false;


                // tristeza mais intensa
                // pode fazer a lágrima escorrer

                if (
                    this.intensity > 0.55 &&
                    Math.random() < 0.70
                ) {

                    eye.stream = true;

                    eye.streamProgress = 0;

                }

            }

        }


        // -----------------------------------------------------
        // FLUXO
        // -----------------------------------------------------

        if (
            eye.stream
        ) {

            eye.streamProgress +=
                delta /
                (
                    5000 +
                    this.intensity * 2500
                );


            if (
                eye.streamProgress >= 1
            ) {

                eye.streamProgress = 1;

                eye.stream = false;

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


        const left =
            this.getEyePosition(
                landmarks,
                'left'
            );


        const right =
            this.getEyePosition(
                landmarks,
                'right'
            );


        if (left) {

            const p =
                this.transformPoint(
                    left,
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


        if (right) {

            const p =
                this.transformPoint(
                    right,
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
    // ENCONTRA O OLHO
    // =========================================================

    getEyePosition(
        landmarks,
        side
    ) {

        const indexes =
            side === 'left'
                ? [36, 37, 38, 39, 40, 41]
                : [42, 43, 44, 45, 46, 47];


        const points =
            indexes
                .map(
                    index =>
                        landmarks[index]
                )
                .filter(Boolean);


        if (
            points.length === 0
        ) {

            return null;

        }


        // ponto inferior do olho

        let bottom =
            points[0];


        for (
            const point of points
        ) {

            if (
                point.y >
                bottom.y
            ) {

                bottom = point;

            }

        }


        return {

            x: bottom.x,

            y: bottom.y

        };

    }


    // =========================================================
    // TRANSFORMA COORDENADAS
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
    // DESENHA O OLHO
    // =========================================================

    drawEye(
        ctx,
        eye,
        x,
        y,
        scale
    ) {

        this.drawWetGlow(
            ctx,
            x,
            y,
            eye.wetness,
            scale
        );


        if (
            eye.forming ||
            eye.progress > 0
        ) {

            this.drawTearDrop(
                ctx,
                x,
                y,
                eye.progress,
                scale
            );

        }


        if (
            eye.stream
        ) {

            this.drawStream(
                ctx,
                x,
                y,
                eye.streamProgress,
                scale
            );

        }

    }


    // =========================================================
    // BRILHO
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
                3 +
                intensity * 5
            ) *
            scale;


        const alpha =
            intensity *
            0.40 *
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
            0.30,
            `rgba(190,230,255,${alpha * 0.7})`
        );


        gradient.addColorStop(
            0.70,
            `rgba(100,190,255,${alpha * 0.2})`
        );


        gradient.addColorStop(
            1,
            'rgba(80,160,255,0)'
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
        scale
    ) {

        const grow =
            Math.sin(
                Math.min(
                    progress,
                    1
                ) *
                Math.PI *
                0.5
            );


        const width =
            3 *
            scale *
            grow;


        const height =
            8 *
            scale *
            grow;


        if (
            height <= 0
        ) {

            return;

        }


        ctx.save();

        ctx.globalCompositeOperation =
            'screen';


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
            0.40,
            'rgba(210,240,255,0.30)'
        );


        gradient.addColorStop(
            0.70,
            'rgba(100,190,255,0.15)'
        );


        gradient.addColorStop(
            1,
            'rgba(70,160,255,0)'
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

            x - width,
            y + height * 0.75,

            x,
            y + height
        );


        ctx.bezierCurveTo(
            x + width,
            y + height * 0.75,

            x + width,
            y + height * 0.35,

            x,
            y
        );


        ctx.fill();


        // -----------------------------------------------------
        // PEQUENO REFLEXO
        // -----------------------------------------------------

        ctx.fillStyle =
            'rgba(255,255,255,0.65)';


        ctx.beginPath();

        ctx.ellipse(
            x - width * 0.3,
            y + height * 0.3,
            Math.max(
                0.5,
                width * 0.18
            ),
            Math.max(
                0.8,
                height * 0.20
            ),
            -0.3,
            0,
            Math.PI * 2
        );


        ctx.fill();

        ctx.restore();

    }


    // =========================================================
    // FLUXO
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


        const startX = x;

        const startY =
            y +
            4 * scale;


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
                ) * startX +

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
                ) * startY +

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


        const gradient =
            ctx.createLinearGradient(
                startX,
                startY,
                endX,
                endY
            );


        gradient.addColorStop(
            0,
            'rgba(220,245,255,0.45)'
        );


        gradient.addColorStop(
            0.45,
            'rgba(130,210,255,0.22)'
        );


        gradient.addColorStop(
            1,
            'rgba(70,170,255,0.02)'
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
        // REFLEXO
        // -----------------------------------------------------

        const last =
            points[
                visible - 1
            ];


        ctx.fillStyle =
            'rgba(255,255,255,0.55)';


        ctx.beginPath();

        ctx.arc(
            last.x -
            0.7 * scale,

            last.y,

            Math.max(
                0.7,
                1.1 * scale
            ),

            0,
            Math.PI * 2
        );


        ctx.fill();

        ctx.restore();

    }

}
