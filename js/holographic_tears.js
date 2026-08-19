// ============================================================
// HOLOGRAPHIC TEARS
// Sistema procedural de lágrimas holográficas
//
// - até 3 lágrimas simultâneas
// - nascimento aleatório REAL na borda da pálpebra inferior
// - cada lágrima mantém seu próprio ponto de nascimento
// - formação gradual
// - acumulação líquida
// - fluxo orgânico e irregular
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

            // Tempo para a lágrima se formar
            formationTime: 1200,

            // Tempo escorrendo
            streamTime: 4800,

            // Tempo de secagem
            fadeTime: 3000,

            // Distância mínima entre duas lágrimas
            minSpawnDistance: 16,

            // Comprimento mínimo
            minDistance: 28,

            // Comprimento máximo
            maxDistance: 105

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


        // =====================================================
        // INTENSIDADE DA TRISTEZA
        // =====================================================

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
    // ATUALIZA SISTEMA
    // =========================================================

    update(delta) {

        // -----------------------------------------------------
        // PROTEÇÃO CONTRA DELTA MUITO GRANDE
        // -----------------------------------------------------

        if (
            !Number.isFinite(delta) ||
            delta < 0
        ) {

            delta = 16;

        }


        delta =
            Math.min(
                delta,
                100
            );


        // =====================================================
        // SUAVIZA INTENSIDADE
        // =====================================================

        this.intensity +=
            (
                this.targetIntensity -
                this.intensity
            ) * 0.025;


        // =====================================================
        // UMIDADE DOS OLHOS
        // =====================================================

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


        // =====================================================
        // CONTROLE DE NASCIMENTO
        // =====================================================

        if (
            this.intensity < 0.03
        ) {

            // Quando a tristeza diminui,
            // não eliminamos as lágrimas.
            //
            // Elas continuam secando naturalmente.

            this.spawnTimer = 0;

        } else {

            this.spawnTimer += delta;


            if (
                this.spawnTimer >=
                this.nextSpawn
            ) {

                if (
                    this.tears.length <
                    this.maxTears
                ) {

                    this.requestSpawn = true;

                }


                this.spawnTimer = 0;


                // =================================================
                // INTERVALO ALEATÓRIO
                //
                // Quanto maior a tristeza,
                // mais frequentemente surgem lágrimas.
                // =================================================

                const intensityFactor =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            this.intensity
                        )
                    );


                const minimumInterval =
                    650 -
                    intensityFactor * 250;


                const randomInterval =
                    Math.random() * 850;


                this.nextSpawn =
                    minimumInterval +
                    randomInterval;

            }

        }


        // =====================================================
        // ATUALIZA LÁGRIMAS
        // =====================================================

        for (
            const tear of this.tears
        ) {

            this.updateTear(
                tear,
                delta
            );

        }


        // =====================================================
        // REMOVE LÁGRIMAS SECAS
        // =====================================================

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


        // =====================================================
        // ESCALA SEGURA
        // =====================================================

        scale =
            Number.isFinite(scale) &&
            scale > 0
                ? scale
                : 1;


        // =====================================================
        // EXISTENTES NO MESMO OLHO
        // =====================================================

        const existing =
            this.tears.filter(
                tear =>
                    tear.side === side
            );


        // =====================================================
        // ESCOLHE O PONTO DA PÁLPEBRA
        //
        // IMPORTANTE:
        //
        // O ponto é escolhido AQUI.
        //
        // Depois disso ele NÃO será sorteado novamente.
        // =====================================================

        let startSegment = 0;

        let startT = 0.5;


        let validPosition = false;


        for (
            let attempt = 0;
            attempt < 20;
            attempt++
        ) {

            // -----------------------------------------------
            // Escolhe aleatoriamente entre:
            //
            // segmento 0:
            // 39 → 40
            //
            // segmento 1:
            // 40 → 41
            //
            // ou
            //
            // 45 → 46
            // 46 → 47
            // -----------------------------------------------

            startSegment =
                Math.random() < 0.5
                    ? 0
                    : 1;


            // -----------------------------------------------
            // posição dentro do segmento
            //
            // Evitamos exatamente os extremos.
            // -----------------------------------------------

            startT =
                0.08 +
                Math.random() * 0.84;


            const position =
                this.getLowerLidPoint(
                    eyePosition,
                    startSegment,
                    startT
                );


            if (
                !position
            ) {

                continue;

            }


            // =================================================
            // VERIFICA DISTÂNCIA DE OUTRAS LÁGRIMAS
            // =================================================

            let tooClose = false;


            for (
                const other of existing
            ) {

                const dx =
                    other.spawnX -
                    position.x;


                const dy =
                    other.spawnY -
                    position.y;


                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    distance <
                    this.config.minSpawnDistance
                ) {

                    tooClose = true;

                    break;

                }

            }


            if (
                !tooClose
            ) {

                validPosition = true;

                break;

            }

        }


        // =====================================================
        // SE NÃO CONSEGUIR UMA POSIÇÃO PERFEITA,
        // USA A ÚLTIMA POSIÇÃO CALCULADA.
        // =====================================================

        const spawnPoint =
            this.getLowerLidPoint(
                eyePosition,
                startSegment,
                startT
            );


        if (
            !spawnPoint
        ) {

            return;

        }


        // =====================================================
        // CURVA DO FLUXO
        // =====================================================

        const direction =
            Math.random() < 0.5
                ? -1
                : 1;


        const curve =
            (
                3 +
                Math.random() * 11
            ) *
            direction *
            scale;


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
            ) *
            scale;


        // =====================================================
        // NOVA LÁGRIMA
        // =====================================================

        this.tears.push({

            // -------------------------------------------------
            // OLHO
            // -------------------------------------------------

            side: side,


            // -------------------------------------------------
            // PONTO ORIGINAL DE NASCIMENTO
            //
            // Estes valores ficam congelados.
            // -------------------------------------------------

            spawnX:
                spawnPoint.x,

            spawnY:
                spawnPoint.y,


            // -------------------------------------------------
            // INFORMAÇÕES DO LANDMARK
            //
            // Também ficam congeladas.
            // -------------------------------------------------

            startSegment:
                startSegment,

            startT:
                startT,


            // -------------------------------------------------
            // TAMANHO
            // -------------------------------------------------

            size:
                (
                    0.70 +
                    Math.random() * 0.65
                ) *
                scale,


            // -------------------------------------------------
            // CURVA
            // -------------------------------------------------

            curve:
                curve,


            distance:
                distance,


            // -------------------------------------------------
            // TEMPO
            // -------------------------------------------------

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
                    0.75 +
                    Math.random() * 0.60
                ),


            fadeTime:
                this.config.fadeTime *
                (
                    0.75 +
                    Math.random() * 0.65
                ),


            // -------------------------------------------------
            // ESTADO
            // -------------------------------------------------

            phase:
                'forming',


            progress:
                0,


            streamProgress:
                0,


            fadeProgress:
                0,


            // -------------------------------------------------
            // BRILHO
            // -------------------------------------------------

            shimmer:
                Math.random() *
                Math.PI *
                2,


            shimmerSpeed:
                0.001 +
                Math.random() * 0.002,


            // -------------------------------------------------
            // MOVIMENTO ORGÂNICO
            // -------------------------------------------------

            curvePhase:
                Math.random() *
                Math.PI *
                2,


            organicAmount:
                (
                    0.5 +
                    Math.random() * 1.2
                ) *
                scale

        });

    }


    // =========================================================
    // OBTÉM PONTO DA BORDA INFERIOR DO OLHO
    // =========================================================

    getLowerLidPoint(
        eye,
        segment,
        t
    ) {

        if (
            !eye ||
            !eye.lower ||
            eye.lower.length < 3
        ) {

            return null;

        }


        const a =
            eye.lower[
                segment
            ];


        const b =
            eye.lower[
                segment + 1
            ];


        if (
            !a ||
            !b
        ) {

            return null;

        }


        // =====================================================
        // INTERPOLAÇÃO
        //
        // O ponto está literalmente sobre a linha
        // formada pelos landmarks da pálpebra inferior.
        // =====================================================

        const x =
            a.x +
            (
                b.x -
                a.x
            ) *
            t;


        const y =
            a.y +
            (
                b.y -
                a.y
            ) *
            t;


        return {

            x: x,

            y: y

        };

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


                tear.age =
                    0;

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


                tear.age =
                    0;

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


        // =====================================================
        // TEMPO
        // =====================================================

        const now =
            performance.now();


        const delta =
            now -
            this.time;


        this.time =
            now;


        // =====================================================
        // ATUALIZA SISTEMA
        // =====================================================

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


            // -----------------------------------------------
            // Escolhe aleatoriamente o olho
            // -----------------------------------------------

            const side =
                Math.random() < 0.5
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
        // TRANSFORMA CENTRO DOS OLHOS
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
        // BRILHO ÚMIDO
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
        // DESENHA LÁGRIMAS
        // =====================================================

        for (
            const tear of this.tears
        ) {

            const eye =
                tear.side === 'left'
                    ? left
                    : right;


            // =================================================
            // IMPORTANTE
            //
            // Recuperamos o MESMO ponto da pálpebra
            // escolhido quando a lágrima nasceu.
            //
            // Não existe Math.random() aqui.
            // =================================================

            const start =
                this.getTearStartPoint(
                    eye,
                    tear,
                    transform
                );


            if (
                !start
            ) {

                continue;

            }


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
    // POSIÇÃO FIXA DA LÁGRIMA SOBRE O LANDMARK
    // =========================================================

    getTearStartPoint(
        eye,
        tear,
        transform
    ) {

        if (
            !eye ||
            !tear
        ) {

            return null;

        }


        // =====================================================
        // USA EXATAMENTE O PONTO SORTEADO NO NASCIMENTO
        // =====================================================

        const point =
            this.getLowerLidPoint(
                eye,
                tear.startSegment,
                tear.startT
            );


        if (
            !point
        ) {

            return null;

        }


        // =====================================================
        // TRANSFORMA PARA O HOLOGRAMA
        // =====================================================

        return this.transformPoint(
            point,
            transform
        );

    }


    // =========================================================
    // ENCONTRA A REGIÃO DOS OLHOS
    // =========================================================

    getEyePosition(
        landmarks,
        side
    ) {

        // =====================================================
        // LANDMARKS DO OLHO
        // =====================================================

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
        // BORDA INFERIOR
        //
        // ESQUERDO:
        // 39 → 40 → 41
        //
        // DIREITO:
        // 45 → 46 → 47
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
        // CENTRO DO OLHO
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

                x:
                    centerX,

                y:
                    centerY

            },


            lower: lower,


            x:
                minX,


            y:
                minY,


            width:
                maxX -
                minX,


            height:
                maxY -
                minY

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
    // BRILHO ÚMIDO DOS OLHOS
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


        // =====================================================
        // PULSAÇÃO MUITO SUAVE
        // =====================================================

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


        // =====================================================
        // GRADIENTE
        // =====================================================

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


        // =====================================================
        // DESENHO
        // =====================================================

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


        // =====================================================
        // FORMAÇÃO
        // =====================================================

        if (
            tear.phase ===
            'forming'
        ) {

            alpha =
                this.easeOut(
                    tear.progress
                );

        }


        // =====================================================
        // SECAGEM
        // =====================================================

        if (
            tear.phase ===
            'fading'
        ) {

            // Secagem não linear:
            //
            // permanece visível por um tempo,
            // depois desaparece suavemente.

            alpha =
                1 -
                this.easeInOut(
                    tear.fadeProgress
                );

        }


        if (
            alpha <= 0.001
        ) {

            return;

        }


        // =====================================================
        // POSIÇÃO DO FLUXO
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


        const secondaryOrganic =
            Math.sin(
                this.time *
                0.0009 +
                tear.curvePhase *
                1.7
            );


        const horizontal =
            tear.curve *
            Math.sin(
                flow *
                Math.PI
            ) +

            organic *
            tear.organicAmount *
            0.8 +

            secondaryOrganic *
            tear.organicAmount *
            0.35;


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
        // TAMANHO DA GOTA
        // =====================================================

        let dropGrow = 1;


        if (
            tear.phase ===
            'forming'
        ) {

            // Cresce lentamente,
            // como se a água estivesse se acumulando.

            dropGrow =
                Math.sin(
                    tear.progress *
                    Math.PI *
                    0.5
                );

        }


        // =====================================================
        // PEQUENA CONTRAÇÃO NO FINAL
        // =====================================================

        if (
            tear.phase ===
            'fading'
        ) {

            dropGrow =
                0.85 +
                0.15 *
                (
                    1 -
                    tear.fadeProgress
                );

        }


        const width =
            (
                2.2 +
                tear.size * 1.3
            ) *
            dropGrow;


        const height =
            (
                5.5 +
                tear.size * 3
            ) *
            dropGrow;


        // =====================================================
        // CORPO
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
            `rgba(210,240,255,${
                0.02 * alpha
            })`
        );


        gradient.addColorStop(
            0.30,
            `rgba(230,248,255,${
                0.18 * alpha
            })`
        );


        gradient.addColorStop(
            0.48,
            `rgba(170,225,255,${
                0.34 * alpha
            })`
        );


        gradient.addColorStop(
            0.72,
            `rgba(90,185,255,${
                0.14 * alpha
            })`
        );


        gradient.addColorStop(
            1,
            'rgba(70,160,255,0)'
        );


        ctx.fillStyle =
            gradient;


        // =====================================================
        // FORMA DA GOTA
        // =====================================================

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
                0.40 *
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
                0.45,
                width * 0.18
            ),

            Math.max(
                0.7,
                height * 0.18
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

                y + 3 * scale,

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


        // =====================================================
        // PONTOS DA CURVA
        // =====================================================

        const points = [];


        const segments = 40;


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


            // =================================================
            // CURVA PRINCIPAL
            // =================================================

            const curve =
                tear.curve *
                Math.sin(
                    t *
                    Math.PI
                );


            // =================================================
            // PEQUENA OSCILAÇÃO
            // =================================================

            const organic =
                Math.sin(
                    t *
                    Math.PI *
                    2 +
                    tear.curvePhase
                ) *
                tear.organicAmount *
                0.8;


            // =================================================
            // SEGUNDA OSCILAÇÃO MUITO SUTIL
            // =================================================

            const organic2 =
                Math.sin(
                    t *
                    Math.PI *
                    3.5 +
                    tear.curvePhase *
                    1.4
                ) *
                tear.organicAmount *
                0.25;


            points.push({

                x:
                    x +
                    curve +
                    organic +
                    organic2,

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


        // =====================================================
        // QUANDO SECA:
        //
        // o início permanece um pouco mais perceptível,
        // enquanto o final desaparece.
        // =====================================================

        gradient.addColorStop(
            0,
            `rgba(220,245,255,${
                0.32 * alpha
            })`
        );


        gradient.addColorStop(
            0.20,
            `rgba(170,225,255,${
                0.22 * alpha
            })`
        );


        gradient.addColorStop(
            0.50,
            `rgba(100,190,255,${
                0.12 * alpha
            })`
        );


        gradient.addColorStop(
            0.75,
            `rgba(80,170,255,${
                0.05 * alpha
            })`
        );


        gradient.addColorStop(
            1,
            'rgba(70,160,255,0)'
        );


        ctx.strokeStyle =
            gradient;


        // =====================================================
        // ESPESSURA
        // =====================================================

        ctx.lineWidth =
            (
                0.65 +
                tear.size * 0.25
            ) *
            scale;


        ctx.lineCap =
            'round';


        // =====================================================
        // DESENHA
        // =====================================================

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
        // PEQUENO BRILHO NA PONTA
        // =====================================================

        const last =
            points[
                points.length - 1
            ];


        ctx.fillStyle =
            `rgba(255,255,255,${
                0.35 *
                alpha
            })`;


        ctx.beginPath();


        ctx.arc(

            last.x,

            last.y,

            Math.max(
                0.6,
                1.0 * scale
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


    // =========================================================
    // EASING SUAVE
    // =========================================================

    easeInOut(t) {

        return (

            t < 0.5

                ? 4 *
                  t *
                  t *
                  t

                : 1 -
                  Math.pow(
                      -2 * t + 2,
                      3
                  ) /
                  2

        );

    }

}
