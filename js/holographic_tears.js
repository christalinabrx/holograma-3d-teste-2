// ============================================================
// HOLOGRAPHIC TEARS
// Sistema procedural de lágrimas holográficas
//
// - até 3 lágrimas simultâneas
// - nascimento aleatório na borda da pálpebra inferior
// - maior concentração nas extremidades externas do olho
// - evita o centro do olho
// - formação pequena e suave
// - gota cresce lentamente durante o fluxo
// - fluxo orgânico pela bochecha
// - secagem gradual
// - brilho líquido
// - sem imagens externas
// ============================================================

export class HolographicTears {

    constructor() {

        // =====================================================
        // EMOÇÃO
        // =====================================================

        this.emotion = 'neutral';

        this.confidence = 0;

        this.intensity = 0;

        this.targetIntensity = 0;


        // =====================================================
        // TEMPO
        // =====================================================

        this.time = performance.now();


        // =====================================================
        // SISTEMA DE LÁGRIMAS
        // =====================================================

        this.maxTears = 3;

        this.tears = [];


        // =====================================================
        // CONTROLE DE NASCIMENTO
        // =====================================================

        this.spawnTimer = 0;

        this.nextSpawn = 1000;

        this.requestSpawn = false;


        // =====================================================
        // ESTADO DOS OLHOS
        // =====================================================

        this.leftWetness = 0;

        this.rightWetness = 0;


        // =====================================================
        // CONFIGURAÇÕES
        // =====================================================

        this.config = {

            // -----------------------------------------------
            // formação inicial
            // -----------------------------------------------

            formationTime: 1700,


            // -----------------------------------------------
            // tempo de escorrimento
            // -----------------------------------------------

            streamTime: 5600,


            // -----------------------------------------------
            // secagem
            // -----------------------------------------------

            fadeTime: 3000,


            // -----------------------------------------------
            // distância mínima entre lágrimas
            // -----------------------------------------------

            minSpawnDistance: 15,


            // -----------------------------------------------
            // distância do fluxo
            // -----------------------------------------------

            minDistance: 35,

            maxDistance: 105,


            // -----------------------------------------------
            // largura máxima da região de nascimento
            //
            // 0.0 = canto
            // 1.0 = centro
            //
            // Quanto menor, mais concentrado nas extremidades.
            // -----------------------------------------------

            outerBias: 0.34

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
    // ATUALIZA
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
        // UMIDADE DOS OLHOS
        // -----------------------------------------------------

        const wetTarget =
            this.intensity * 0.95;


        this.leftWetness +=
            (
                wetTarget -
                this.leftWetness
            ) * 0.045;


        this.rightWetness +=
            (
                wetTarget -
                this.rightWetness
            ) * 0.045;


        // -----------------------------------------------------
        // SE NÃO ESTÁ TRISTE
        // -----------------------------------------------------

        if (
            this.intensity < 0.03
        ) {

            this.spawnTimer = 0;

        } else {

            this.spawnTimer += delta;


            // -------------------------------------------------
            // NOVA LÁGRIMA
            // -------------------------------------------------

            if (
                this.spawnTimer >= this.nextSpawn
            ) {

                if (
                    this.tears.length <
                    this.maxTears
                ) {

                    this.requestSpawn = true;

                }


                this.spawnTimer = 0;


                const intensityFactor =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            this.intensity
                        )
                    );


                this.nextSpawn =
                    850 -
                    intensityFactor * 400 +
                    Math.random() * 800;

            }

        }


        // -----------------------------------------------------
        // ATUALIZA LÁGRIMAS
        // -----------------------------------------------------

        for (
            const tear of this.tears
        ) {

            this.updateTear(
                tear,
                delta
            );

        }


        // -----------------------------------------------------
        // REMOVE LÁGRIMAS SECAS
        // -----------------------------------------------------

        this.tears =
            this.tears.filter(
                tear =>
                    tear.phase !== 'dead'
            );

    }


    // =========================================================
    // CRIA UMA LÁGRIMA
    // =========================================================

    spawnTear(
        side,
        eyePosition,
        scale
    ) {

        if (
            !eyePosition
        ) {

            return;

        }


        if (
            this.tears.length >=
            this.maxTears
        ) {

            return;

        }


        // -----------------------------------------------------
        // LÁGRIMAS JÁ EXISTENTES NO MESMO OLHO
        // -----------------------------------------------------

        const existing =
            this.tears.filter(
                tear =>
                    tear.side === side
            );


        // =====================================================
        // ESCOLHE O PONTO DE NASCIMENTO
        // =====================================================

        let startT = 0.5;

        let attempts = 0;


        while (
            attempts < 20
        ) {

            // -------------------------------------------------
            // ESCOLHE UMA DAS DUAS EXTREMIDADES
            //
            // 0 = extremidade esquerda
            // 1 = extremidade direita
            //
            // Em cada nascimento escolhemos aleatoriamente
            // uma das duas regiões.
            // -------------------------------------------------

            const outerSide =
                Math.random() < 0.5
                    ? 0
                    : 1;


            // -------------------------------------------------
            // DISTRIBUIÇÃO NÃO LINEAR
            //
            // Math.pow(..., 1.8) concentra os pontos
            // perto das extremidades.
            // -------------------------------------------------

            const random =
                Math.pow(
                    Math.random(),
                    1.8
                );


            if (
                outerSide === 0
            ) {

                startT =
                    0.05 +
                    random *
                    this.config.outerBias;

            } else {

                startT =
                    1.0 -
                    (
                        0.05 +
                        random *
                        this.config.outerBias
                    );

            }


            // -------------------------------------------------
            // VERIFICA DISTÂNCIA
            // -------------------------------------------------

            const candidate =
                this.getLowerPoint(
                    eyePosition.lower,
                    startT
                );


            const tooClose =
                existing.some(
                    other => {

                        if (
                            other.startT ===
                            undefined
                        ) {

                            return false;

                        }


                        const otherPoint =
                            this.getLowerPoint(
                                eyePosition.lower,
                                other.startT
                            );


                        const dx =
                            otherPoint.x -
                            candidate.x;

                        const dy =
                            otherPoint.y -
                            candidate.y;


                        return (
                            Math.sqrt(
                                dx * dx +
                                dy * dy
                            ) <
                            this.config.minSpawnDistance *
                            scale
                        );

                    }
                );


            if (
                !tooClose
            ) {

                break;

            }


            attempts++;

        }


        // =====================================================
        // CURVA ALEATÓRIA
        // =====================================================

        const direction =
            Math.random() <
            0.5
                ? -1
                : 1;


        const curve =
            (
                Math.random() *
                7 +
                2
            ) *
            direction;


        // =====================================================
        // DISTÂNCIA
        // =====================================================

        const distance =
            (
                this.config.minDistance +
                Math.random() *
                (
                    this.config.maxDistance -
                    this.config.minDistance
                )
            );


        // =====================================================
        // NOVA LÁGRIMA
        // =====================================================

        this.tears.push({

            // -----------------------------------------------
            // IDENTIDADE
            // -----------------------------------------------

            side: side,


            // -----------------------------------------------
            // POSIÇÃO DE NASCIMENTO
            //
            // É armazenada uma única vez.
            // -----------------------------------------------

            startT: startT,


            // -----------------------------------------------
            // TAMANHO INICIAL
            //
            // BEM PEQUENO.
            // -----------------------------------------------

            size:
                (
                    0.42 +
                    Math.random() * 0.30
                ) *
                scale,


            // -----------------------------------------------
            // TAMANHO FINAL
            //
            // A lágrima cresce lentamente enquanto escorre.
            // -----------------------------------------------

            finalSize:
                (
                    1.15 +
                    Math.random() * 0.65
                ) *
                scale,


            // -----------------------------------------------
            // CURVA
            // -----------------------------------------------

            curve:
                curve *
                scale,


            distance:
                distance *
                scale,


            // -----------------------------------------------
            // TEMPO
            // -----------------------------------------------

            age: 0,


            formationTime:
                this.config.formationTime *
                (
                    0.75 +
                    Math.random() * 0.45
                ),


            streamTime:
                this.config.streamTime *
                (
                    0.80 +
                    Math.random() * 0.50
                ),


            fadeTime:
                this.config.fadeTime *
                (
                    0.75 +
                    Math.random() * 0.55
                ),


            // -----------------------------------------------
            // ESTADO
            // -----------------------------------------------

            phase: 'forming',


            progress: 0,

            streamProgress: 0,

            fadeProgress: 0,


            // -----------------------------------------------
            // BRILHO
            // -----------------------------------------------

            shimmer:
                Math.random() *
                Math.PI *
                2,


            shimmerSpeed:
                0.001 +
                Math.random() * 0.002,


            // -----------------------------------------------
            // VARIAÇÃO ORGÂNICA
            // -----------------------------------------------

            curvePhase:
                Math.random() *
                Math.PI *
                2

        });

    }


    // =========================================================
    // ATUALIZA UMA LÁGRIMA
    // =========================================================

    updateTear(
        tear,
        delta
    ) {

        tear.age += delta;


        // =====================================================
        // FORMAÇÃO
        // =====================================================

        if (
            tear.phase ===
            'forming'
        ) {

            tear.progress =
                Math.min(
                    1,
                    tear.age /
                    tear.formationTime
                );


            if (
                tear.progress >= 1
            ) {

                tear.phase =
                    'streaming';


                tear.age = 0;

            }


            return;

        }


        // =====================================================
        // ESCORRENDO
        // =====================================================

        if (
            tear.phase ===
            'streaming'
        ) {

            tear.streamProgress =
                Math.min(
                    1,
                    tear.age /
                    tear.streamTime
                );


            if (
                tear.streamProgress >= 1
            ) {

                tear.phase =
                    'fading';


                tear.age = 0;

            }


            return;

        }


        // =====================================================
        // SECANDO
        // =====================================================

        if (
            tear.phase ===
            'fading'
        ) {

            tear.fadeProgress =
                Math.min(
                    1,
                    tear.age /
                    tear.fadeTime
                );


            if (
                tear.fadeProgress >= 1
            ) {

                tear.phase =
                    'dead';

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
            now -
            this.time;


        this.time =
            now;


        this.update(delta);


        // =====================================================
        // POSIÇÕES DOS OLHOS
        // =====================================================

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


        if (
            !left ||
            !right
        ) {

            return;

        }


        // =====================================================
        // CRIA NOVA LÁGRIMA
        // =====================================================

        if (
            this.requestSpawn
        ) {

            this.requestSpawn =
                false;


            // -------------------------------------------------
            // ESCOLHE ALEATORIAMENTE O OLHO
            // -------------------------------------------------

            const side =
                Math.random() <
                0.5
                    ? 'left'
                    : 'right';


            const eye =
                side === 'left'
                    ? left
                    : right;


            this.spawnTear(
                side,
                eye,
                transform.scale
            );

        }


        // =====================================================
        // TRANSFORMA POSIÇÕES
        // =====================================================

        const leftPoint =
            this.transformPoint(
                left.center,
                transform
            );


        const rightPoint =
            this.transformPoint(
                right.center,
                transform
            );


        // =====================================================
        // BRILHO ÚMIDO DOS OLHOS
        // =====================================================

        this.drawWetGlow(
            ctx,
            leftPoint.x,
            leftPoint.y,
            this.leftWetness,
            transform.scale
        );


        this.drawWetGlow(
            ctx,
            rightPoint.x,
            rightPoint.y,
            this.rightWetness,
            transform.scale
        );


        // =====================================================
        // DESENHA TODAS AS LÁGRIMAS
        // =====================================================

        for (
            const tear of this.tears
        ) {

            const eye =
                tear.side === 'left'
                    ? left
                    : right;


            const start =
                this.getTearStartPoint(
                    eye,
                    tear,
                    transform
                );


            this.drawTear(
                ctx,
                tear,
                start.x,
                start.y,
                transform.scale
            );

        }

    }


    // =========================================================
    // ENCONTRA A REGIÃO DO OLHO
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
            points.length < 6
        ) {

            return null;

        }


        // =====================================================
        // BORDA INFERIOR DA PÁLPEBRA
        // =====================================================

        const lowerIndexes =
            side === 'left'
                ? [39, 40, 41]
                : [45, 46, 47];


        const lower =
            lowerIndexes
                .map(
                    index =>
                        landmarks[index]
                )
                .filter(Boolean);


        if (
            lower.length < 3
        ) {

            return null;

        }


        // =====================================================
        // CENTRO
        // =====================================================

        let centerX = 0;

        let centerY = 0;


        for (
            const point of points
        ) {

            centerX +=
                point.x;

            centerY +=
                point.y;

        }


        centerX /=
            points.length;


        centerY /=
            points.length;


        // =====================================================
        // DIMENSÕES
        // =====================================================

        const minX =
            Math.min(
                ...points.map(
                    p => p.x
                )
            );


        const maxX =
            Math.max(
                ...points.map(
                    p => p.x
                )
            );


        const minY =
            Math.min(
                ...points.map(
                    p => p.y
                )
            );


        const maxY =
            Math.max(
                ...points.map(
                    p => p.y
                )
            );


        return {

            center: {

                x: centerX,

                y: centerY

            },


            lower,


            x: minX,

            y: minY,

            width:
                maxX - minX,

            height:
                maxY - minY

        };

    }


    // =========================================================
    // OBTÉM PONTO DA BORDA INFERIOR
    // =========================================================

    getLowerPoint(
        lower,
        t
    ) {

        // -----------------------------------------------------
        // A borda inferior possui dois segmentos:
        //
        // 0 → 1
        // 1 → 2
        //
        // Transformamos t de 0..1 para os dois segmentos.
        // -----------------------------------------------------

        let segment;

        let localT;


        if (
            t < 0.5
        ) {

            segment = 0;

            localT =
                t * 2;

        } else {

            segment = 1;

            localT =
                (
                    t - 0.5
                ) * 2;

        }


        const a =
            lower[segment];


        const b =
            lower[segment + 1];


        return {

            x:
                a.x +
                (
                    b.x -
                    a.x
                ) *
                localT,


            y:
                a.y +
                (
                    b.y -
                    a.y
                ) *
                localT

        };

    }


    // =========================================================
    // PONTO DE NASCIMENTO DA LÁGRIMA
    // =========================================================

    getTearStartPoint(
        eye,
        tear,
        transform
    ) {

        // -----------------------------------------------------
        // IMPORTANTE:
        //
        // O ponto foi sorteado quando a lágrima nasceu.
        //
        // Não existe novo sorteio a cada frame.
        // -----------------------------------------------------

        const point =
            this.getLowerPoint(
                eye.lower,
                tear.startT
            );


        return this.transformPoint(
            point,
            transform
        );

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
            intensity <
            0.01
        ) {

            return;

        }


        const pulse =
            0.78 +
            Math.sin(
                this.time *
                0.002
            ) *
            0.22;


        const radius =
            (
                3 +
                intensity * 5
            ) *
            scale;


        const alpha =
            intensity *
            0.30 *
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
            `rgba(200,235,255,${alpha * 0.7})`
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
    // DESENHA UMA LÁGRIMA
    // =========================================================

    drawTear(
        ctx,
        tear,
        x,
        y,
        scale
    ) {

        // =====================================================
        // OPACIDADE
        // =====================================================

        let alpha = 1;


        // -----------------------------------------------------
        // FORMAÇÃO
        // -----------------------------------------------------

        if (
            tear.phase ===
            'forming'
        ) {

            alpha =
                this.easeOut(
                    tear.progress
                );

        }


        // -----------------------------------------------------
        // SECAGEM
        // -----------------------------------------------------

        if (
            tear.phase ===
            'fading'
        ) {

            alpha =
                1 -
                this.easeInOut(
                    tear.fadeProgress
                );

        }


        if (
            alpha <= 0
        ) {

            return;

        }


        // =====================================================
        // FLUXO
        // =====================================================

        let flow = 0;


        if (
            tear.phase ===
            'streaming'
        ) {

            flow =
                this.easeInOut(
                    tear.streamProgress
                );

        }


        if (
            tear.phase ===
            'fading'
        ) {

            flow = 1;

        }


        // =====================================================
        // MOVIMENTO ORGÂNICO
        // =====================================================

        const organic =
            Math.sin(
                this.time *
                0.0015 +
                tear.curvePhase
            );


        const horizontal =
            tear.curve *
            Math.sin(
                flow *
                Math.PI
            ) +
            organic *
            scale *
            0.6;


        const vertical =
            tear.distance *
            flow;


        const px =
            x +
            horizontal;


        const py =
            y +
            vertical;


        // =====================================================
        // CRESCIMENTO DA LÁGRIMA
        // =====================================================

        // Começa pequena.
        //
        // Cresce muito lentamente conforme escorre.
        //
        // O crescimento é suavizado para não parecer
        // que a gota simplesmente "aumentou de tamanho".

        const growth =
            this.easeInOut(
                Math.min(
                    1,
                    flow
                )
            );


        let currentSize =
            tear.size +
            (
                tear.finalSize -
                tear.size
            ) *
            growth;


        // -----------------------------------------------------
        // DURANTE A FORMAÇÃO:
        //
        // a gota aparece muito delicadamente.
        // -----------------------------------------------------

        if (
            tear.phase ===
            'forming'
        ) {

            const formationGrow =
                this.easeOut(
                    tear.progress
                );


            currentSize =
                tear.size *
                (
                    0.15 +
                    formationGrow * 0.85
                );

        }


        // =====================================================
        // DIMENSÕES
        // =====================================================

        const width =
            (
                1.25 +
                currentSize * 1.10
            );


        const height =
            (
                3.2 +
                currentSize * 2.4
            );


        // =====================================================
        // CORPO DA LÁGRIMA
        // =====================================================

        ctx.save();


        ctx.globalCompositeOperation =
            'screen';


        const gradient =
            ctx.createLinearGradient(
                px - width,
                py,
                px + width,
                py + height
            );


        gradient.addColorStop(
            0,
            `rgba(210,240,255,${0.015 * alpha})`
        );


        gradient.addColorStop(
            0.30,
            `rgba(230,248,255,${0.12 * alpha})`
        );


        gradient.addColorStop(
            0.48,
            `rgba(170,225,255,${0.26 * alpha})`
        );


        gradient.addColorStop(
            0.72,
            `rgba(90,185,255,${0.12 * alpha})`
        );


        gradient.addColorStop(
            1,
            'rgba(70,160,255,0)'
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.moveTo(
            px,
            py
        );


        ctx.bezierCurveTo(

            px - width,
            py + height * 0.35,

            px - width,
            py + height * 0.75,

            px,
            py + height

        );


        ctx.bezierCurveTo(

            px + width,
            py + height * 0.75,

            px + width,
            py + height * 0.35,

            px,
            py

        );


        ctx.fill();


        // =====================================================
        // REFLEXO
        // =====================================================

        const shimmer =
            0.45 +
            Math.sin(
                this.time *
                tear.shimmerSpeed +
                tear.shimmer
            ) *
            0.25;


        ctx.fillStyle =
            `rgba(255,255,255,${
                0.30 *
                shimmer *
                alpha
            })`;


        ctx.beginPath();


        ctx.ellipse(

            px -
            width * 0.30,

            py +
            height * 0.28,

            Math.max(
                0.35,
                width * 0.16
            ),

            Math.max(
                0.55,
                height * 0.16
            ),

            -0.3,

            0,

            Math.PI * 2

        );


        ctx.fill();


        // =====================================================
        // FLUXO
        // =====================================================

        if (
            tear.phase ===
            'streaming' ||
            tear.phase ===
            'fading'
        ) {

            this.drawLiquidTrail(
                ctx,
                x,
                y + 2 * scale,
                tear,
                flow,
                alpha,
                scale
            );

        }


        ctx.restore();

    }


    // =========================================================
    // FLUXO LÍQUIDO
    // =========================================================

    drawLiquidTrail(
        ctx,
        x,
        y,
        tear,
        progress,
        alpha,
        scale
    ) {

        const distance =
            tear.distance *
            progress;


        if (
            distance <= 1
        ) {

            return;

        }


        const points =
            [];


        const segments =
            40;


        // =====================================================
        // CURVA
        // =====================================================

        for (
            let i = 0;
            i <= segments;
            i++
        ) {

            const t =
                i /
                segments;


            const current =
                t *
                distance;


            // -------------------------------------------------
            // CURVA PRINCIPAL
            // -------------------------------------------------

            const curve =
                tear.curve *
                Math.sin(
                    t *
                    Math.PI
                );


            // -------------------------------------------------
            // PEQUENA OSCILAÇÃO
            // -------------------------------------------------

            const organic =
                Math.sin(
                    t *
                    Math.PI *
                    2 +
                    tear.curvePhase
                ) *
                0.65 *
                scale;


            points.push({

                x:
                    x +
                    curve +
                    organic,

                y:
                    y +
                    current

            });

        }


        // =====================================================
        // GRADIENTE
        // =====================================================

        const start =
            points[0];


        const end =
            points[
                points.length - 1
            ];


        const gradient =
            ctx.createLinearGradient(
                start.x,
                start.y,
                end.x,
                end.y
            );


        gradient.addColorStop(
            0,
            `rgba(220,245,255,${
                0.22 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.25,
            `rgba(170,225,255,${
                0.18 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.60,
            `rgba(100,190,255,${
                0.11 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.85,
            `rgba(80,170,255,${
                0.05 *
                alpha
            })`
        );


        gradient.addColorStop(
            1,
            'rgba(70,160,255,0)'
        );


        ctx.strokeStyle =
            gradient;


        // =====================================================
        // ESPESSURA CRESCENTE
        // =====================================================

        // A trilha começa quase invisível.
        //
        // Conforme a lágrima percorre a bochecha,
        // fica um pouco mais espessa.

        const trailGrowth =
            0.45 +
            progress * 0.75;


        ctx.lineWidth =
            (
                0.45 +
                tear.size *
                0.20
            ) *
            trailGrowth *
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
            i < points.length;
            i++
        ) {

            ctx.lineTo(
                points[i].x,
                points[i].y
            );

        }


        ctx.stroke();


        // =====================================================
        // GOTA NA PONTA
        // =====================================================

        const last =
            points[
                points.length - 1
            ];


        // -----------------------------------------------------
        // A ponta também cresce lentamente.
        // -----------------------------------------------------

        const dropRadius =
            (
                0.45 +
                progress * 0.85
            ) *
            scale;


        ctx.fillStyle =
            `rgba(255,255,255,${
                0.26 *
                alpha
            })`;


        ctx.beginPath();


        ctx.arc(
            last.x,
            last.y,
            Math.max(
                0.45,
                dropRadius
            ),
            0,
            Math.PI * 2
        );


        ctx.fill();

    }


    // =========================================================
    // EASING
    // =========================================================

    easeOut(t) {

        return 1 -
            Math.pow(
                1 - t,
                3
            );

    }


    easeInOut(t) {

        return (
            t < 0.5
                ? 4 * t * t * t
                : 1 -
                  Math.pow(
                      -2 * t + 2,
                      3
                  ) / 2
        );

    }

}
