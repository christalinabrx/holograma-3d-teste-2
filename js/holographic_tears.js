// ============================================================
// HOLOGRAPHIC TEARS
// Sistema procedural de lágrimas holográficas
//
// - até 5 lágrimas simultâneas
// - nascimento aleatório na borda da pálpebra inferior
// - maior concentração nas extremidades externas dos olhos
// - evita o centro do olho
// - gotas pequenas e suaves
// - crescimento gradual durante a descida
// - fluxo direcionado para fora do rosto
// - gota integrada ao rastro líquido
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

        // máximo de lágrimas simultâneas
        this.maxTears = 5;

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

            // formação inicial muito suave
            formationTime: 1250,

            // tempo médio de escorrimento
            streamTime: 5200,

            // tempo de desaparecimento
            fadeTime: 3000,

            // distância mínima entre lágrimas
            minSpawnDistance: 14,

            // comprimento mínimo
            minDistance: 30,

            // comprimento máximo
            maxDistance: 105,

            // =================================================
            // NASCIMENTO
            // =================================================

            // Quanto maior, mais as lágrimas procuram
            // as extremidades externas.
            outerBias: 2.8,

            // evita praticamente o centro do olho
            centerAvoidance: 0.20,

            // =================================================
            // TAMANHO
            // =================================================

            // tamanho inicial pequeno
            minDropSize: 0.38,

            maxDropSize: 0.68,

            // crescimento da gota durante o percurso
            growthAmount: 0.75,

            // =================================================
            // FLUXO
            // =================================================

            // força do deslocamento para fora
            outwardCurve: 13,

            // ondulação orgânica
            organicAmount: 0.75

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


        // =====================================================
        // NASCIMENTO DAS LÁGRIMAS
        // =====================================================

        if (
            this.intensity < 0.03
        ) {

            // Não cria novas lágrimas.
            // As existentes continuam secando.

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


                // -------------------------------------------------
                // Quanto maior a tristeza,
                // mais frequente o nascimento.
                // -------------------------------------------------

                const intensityFactor =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            this.intensity
                        )
                    );


                this.nextSpawn =
                    750 -
                    intensityFactor * 300 +
                    Math.random() * 700;

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
    // ESCOLHE QUAL OLHO RECEBE A PRÓXIMA LÁGRIMA
    //
    // Tenta evitar que todas fiquem em apenas um olho.
    // =========================================================

    chooseSide() {

        const leftCount =
            this.tears.filter(
                tear =>
                    tear.side === 'left'
            ).length;


        const rightCount =
            this.tears.filter(
                tear =>
                    tear.side === 'right'
            ).length;


        // Se um olho está vazio,
        // prioriza esse olho.

        if (
            leftCount === 0 &&
            rightCount > 0
        ) {

            return 'left';

        }


        if (
            rightCount === 0 &&
            leftCount > 0
        ) {

            return 'right';

        }


        // Se houver diferença,
        // favorece o lado com menos lágrimas.

        if (
            leftCount < rightCount
        ) {

            return 'left';

        }


        if (
            rightCount < leftCount
        ) {

            return 'right';

        }


        // Empate:
        // escolha aleatória.

        return Math.random() < 0.5
            ? 'left'
            : 'right';

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
        // LÁGRIMAS DO MESMO OLHO
        // =====================================================

        const existing =
            this.tears.filter(
                tear =>
                    tear.side === side
            );


        // =====================================================
        // ESCOLHE UM PONTO NA PÁLPEBRA
        // =====================================================

        const spawn =
            this.getRandomLowerEyelidPoint(
                eyePosition,
                side,
                existing,
                scale
            );


        if (
            !spawn
        ) {

            return;

        }


        // =====================================================
        // DIREÇÃO PARA FORA DO ROSTO
        //
        // left  = esquerda
        // right = direita
        // =====================================================

        const outwardDirection =
            side === 'left'
                ? -1
                : 1;


        // =====================================================
        // CURVA
        // =====================================================

        const curveStrength =
            (
                5 +
                Math.random() * 7
            ) *
            scale;


        // curva inicial sempre tende para fora
        const outwardCurve =
            curveStrength *
            outwardDirection;


        // pequena variação individual
        const secondaryCurve =
            (
                Math.random() * 4 -
                2
            ) *
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
        // TAMANHO INICIAL
        //
        // BEM MENOR QUE A VERSÃO ANTERIOR
        // =====================================================

        const initialSize =
            (
                this.config.minDropSize +
                Math.random() *
                (
                    this.config.maxDropSize -
                    this.config.minDropSize
                )
            ) *
            scale;


        // =====================================================
        // NOVA LÁGRIMA
        // =====================================================

        this.tears.push({

            // -----------------------------------------------
            // IDENTIDADE
            // -----------------------------------------------

            side: side,


            // -----------------------------------------------
            // POSIÇÃO
            // -----------------------------------------------

            x: spawn.x,

            y: spawn.y,


            // -----------------------------------------------
            // POSIÇÃO DA PÁLPEBRA
            // -----------------------------------------------

            startT:
                spawn.t,

            startSegment:
                spawn.segment,


            // -----------------------------------------------
            // TAMANHO
            // -----------------------------------------------

            size:
                initialSize,

            initialSize:
                initialSize,


            // crescimento total
            growthAmount:
                this.config.growthAmount *
                scale *
                (
                    0.75 +
                    Math.random() * 0.5
                ),


            // -----------------------------------------------
            // CURVA
            // -----------------------------------------------

            curve:
                outwardCurve +
                secondaryCurve,


            outwardDirection:
                outwardDirection,


            // -----------------------------------------------
            // DISTÂNCIA
            // -----------------------------------------------

            distance:
                distance,


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
                    0.75 +
                    Math.random() * 0.55
                ),


            fadeTime:
                this.config.fadeTime *
                (
                    0.75 +
                    Math.random() * 0.6
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
                2,


            organicOffset:
                Math.random() *
                Math.PI *
                2

        });

    }


    // =========================================================
    // ESCOLHE PONTO ALEATÓRIO DA PÁLPEBRA INFERIOR
    //
    // A distribuição NÃO é uniforme.
    //
    // Ela favorece as extremidades externas.
    // =========================================================

    getRandomLowerEyelidPoint(
        eye,
        side,
        existing,
        scale
    ) {

        const lower =
            eye.lower;


        if (
            !lower ||
            lower.length < 3
        ) {

            return null;

        }


        let segment = 0;

        let t = 0;

        let spawnX = 0;

        let spawnY = 0;

        let valid = false;


        // =====================================================
        // TENTA VÁRIOS PONTOS
        // =====================================================

        for (
            let attempt = 0;
            attempt < 30;
            attempt++
        ) {

            // -------------------------------------------------
            // DISTRIBUIÇÃO COM BIAS PARA AS EXTREMIDADES
            // -------------------------------------------------

            let outerPosition;


            // Math.pow cria concentração nas pontas.
            const random =
                Math.random();


            outerPosition =
                Math.pow(
                    random,
                    this.config.outerBias
                );


            // -------------------------------------------------
            // Alterna entre as duas regiões próximas
            // da extremidade.
            // -------------------------------------------------

            if (
                Math.random() < 0.5
            ) {

                // região externa

                outerPosition =
                    1 -
                    outerPosition;

            }


            // -------------------------------------------------
            // Evita o centro absoluto.
            // -------------------------------------------------

            if (
                outerPosition >
                0.40 &&
                outerPosition <
                0.60
            ) {

                continue;

            }


            // -------------------------------------------------
            // Converte posição para segmento.
            //
            // 0 = primeiro segmento
            // 1 = segundo segmento
            // -------------------------------------------------

            if (
                outerPosition < 0.5
            ) {

                segment = 0;

                t =
                    outerPosition * 2;

            } else {

                segment = 1;

                t =
                    (
                        outerPosition -
                        0.5
                    ) * 2;

            }


            // -------------------------------------------------
            // Pequena margem para não nascer exatamente
            // no canto.
            // -------------------------------------------------

            t =
                Math.max(
                    0.08,
                    Math.min(
                        0.92,
                        t
                    )
                );


            const a =
                lower[segment];


            const b =
                lower[segment + 1];


            spawnX =
                a.x +
                (
                    b.x -
                    a.x
                ) *
                t;


            spawnY =
                a.y +
                (
                    b.y -
                    a.y
                ) *
                t;


            // =================================================
            // EVITA OUTRA LÁGRIMA MUITO PRÓXIMA
            // =================================================

            const tooClose =
                existing.some(
                    other => {

                        // converte aproximadamente
                        // para distância na imagem
                        const dx =
                            other.x -
                            spawnX;

                        const dy =
                            other.y -
                            spawnY;

                        return (
                            Math.sqrt(
                                dx * dx +
                                dy * dy
                            ) <
                            this.config.minSpawnDistance
                        );

                    }
                );


            if (
                !tooClose
            ) {

                valid = true;

                break;

            }

        }


        if (
            !valid
        ) {

            return null;

        }


        return {

            x: spawnX,

            y: spawnY,

            segment: segment,

            t: t

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


            // escolhe o lado tentando
            // manter os dois olhos ativos

            const side =
                this.chooseSide();


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
    // ENCONTRA REGIÃO DO OLHO
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
        // BORDA INFERIOR
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
                maxX -
                minX,

            height:
                maxY -
                minY

        };

    }


    // =========================================================
    // PONTO DE NASCIMENTO
    // =========================================================

    getTearStartPoint(
        eye,
        tear,
        transform
    ) {

        const lower =
            eye.lower;


        // =====================================================
        // IMPORTANTE:
        //
        // A posição foi sorteada no nascimento da lágrima.
        //
        // NÃO sorteamos novamente aqui.
        // =====================================================

        const selectedA =
            lower[
                tear.startSegment
            ];


        const selectedB =
            lower[
                tear.startSegment + 1
            ];


        const x =
            selectedA.x +
            (
                selectedB.x -
                selectedA.x
            ) *
            tear.startT;


        const y =
            selectedA.y +
            (
                selectedB.y -
                selectedA.y
            ) *
            tear.startT;


        return this.transformPoint(
            {
                x,
                y
            },
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
        // CRESCIMENTO DA GOTA
        //
        // A gota nasce pequena e aumenta muito suavemente.
        // =====================================================

        const growth =
            this.easeOut(
                flow
            );


        const currentSize =
            tear.initialSize +
            tear.growthAmount *
            growth;


        // =====================================================
        // MOVIMENTO ORGÂNICO
        // =====================================================

        const organic =
            Math.sin(
                this.time *
                0.0015 +
                tear.curvePhase
            );


        // =====================================================
        // DESLOCAMENTO HORIZONTAL
        //
        // A lágrima vai naturalmente para fora do rosto.
        // =====================================================

        const outward =
            tear.curve *
            Math.pow(
                flow,
                0.85
            );


        const secondaryWave =
            Math.sin(
                flow *
                Math.PI *
                1.5 +
                tear.organicOffset
            ) *
            scale *
            1.1;


        const horizontal =
            outward +
            secondaryWave +
            organic *
            scale *
            0.35;


        // =====================================================
        // DESLOCAMENTO VERTICAL
        // =====================================================

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
        //
        // Muito menor no nascimento.
        // =====================================================

        let dropGrow = 1;


        if (
            tear.phase ===
            'forming'
        ) {

            dropGrow =
                0.15 +
                0.85 *
                Math.sin(
                    tear.progress *
                    Math.PI *
                    0.5
                );

        }


        // tamanho pequeno
        const width =
            (
                1.05 +
                currentSize *
                0.95
            ) *
            dropGrow;


        const height =
            (
                2.8 +
                currentSize *
                2.4
            ) *
            dropGrow;


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
            `rgba(220,245,255,${0.015 * alpha})`
        );


        gradient.addColorStop(
            0.25,
            `rgba(230,248,255,${0.10 * alpha})`
        );


        gradient.addColorStop(
            0.50,
            `rgba(180,230,255,${0.22 * alpha})`
        );


        gradient.addColorStop(
            0.75,
            `rgba(100,190,255,${0.10 * alpha})`
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
            py + height * 0.30,

            px - width,
            py + height * 0.75,

            px,
            py + height
        );


        ctx.bezierCurveTo(
            px + width,
            py + height * 0.75,

            px + width,
            py + height * 0.30,

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
                0.25 *
                shimmer *
                alpha
            })`;


        ctx.beginPath();


        ctx.ellipse(

            px -
            width * 0.25,

            py +
            height * 0.25,

            Math.max(
                0.25,
                width * 0.14
            ),

            Math.max(
                0.45,
                height * 0.16
            ),

            -0.3,

            0,

            Math.PI * 2

        );


        ctx.fill();


        // =====================================================
        // RASTRO
        //
        // O rastro começa já na origem da lágrima e se
        // integra visualmente ao corpo da gota.
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
                y,
                tear,
                flow,
                alpha,
                scale
            );

        }


        ctx.restore();

    }


    // =========================================================
    // RASTRO LÍQUIDO
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


        const points = [];


        const segments = 40;


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
            // Curva para fora do rosto
            // -------------------------------------------------

            const outward =
                tear.curve *
                Math.pow(
                    t,
                    0.9
                );


            // -------------------------------------------------
            // Pequena ondulação orgânica
            // -------------------------------------------------

            const organic =
                Math.sin(
                    t *
                    Math.PI *
                    2 +
                    tear.curvePhase
                ) *
                this.config.organicAmount *
                scale *
                (
                    0.3 +
                    t
                );


            points.push({

                x:
                    x +
                    outward +
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
                0.28 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.18,
            `rgba(190,235,255,${
                0.22 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.40,
            `rgba(150,215,255,${
                0.16 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.68,
            `rgba(100,190,255,${
                0.09 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.88,
            `rgba(80,170,255,${
                0.035 *
                alpha
            })`
        );


        gradient.addColorStop(
            1,
            'rgba(70,160,255,0)'
        );


        // =====================================================
        // RASTRO
        // =====================================================

        ctx.strokeStyle =
            gradient;


        // -----------------------------------------------------
        // O rastro começa fino e engrossa um pouco
        // conforme a lágrima desce.
        // -----------------------------------------------------

        const trailWidth =
            (
                0.45 +
                tear.size * 0.22 +
                progress * 0.42
            ) *
            scale;


        ctx.lineWidth =
            trailWidth;


        ctx.lineCap =
            'round';


        ctx.lineJoin =
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

            // -------------------------------------------------
            // Em vez de linhas completamente rígidas,
            // cria uma aproximação suave.
            // -------------------------------------------------

            const previous =
                points[i - 1];


            const current =
                points[i];


            const midX =
                (
                    previous.x +
                    current.x
                ) *
                0.5;


            const midY =
                (
                    previous.y +
                    current.y
                ) *
                0.5;


            ctx.quadraticCurveTo(
                previous.x,
                previous.y,
                midX,
                midY
            );

        }


        const last =
            points[
                points.length - 1
            ];


        ctx.quadraticCurveTo(
            last.x,
            last.y,
            last.x,
            last.y
        );


        ctx.stroke();


        // =====================================================
        // NÚCLEO MAIS ÚMIDO
        //
        // Ajuda a unir visualmente o rastro à gota.
        // =====================================================

        const coreGradient =
            ctx.createLinearGradient(
                start.x,
                start.y,
                end.x,
                end.y
            );


        coreGradient.addColorStop(
            0,
            `rgba(255,255,255,${
                0.18 *
                alpha
            })`
        );


        coreGradient.addColorStop(
            0.25,
            `rgba(210,240,255,${
                0.10 *
                alpha
            })`
        );


        coreGradient.addColorStop(
            0.60,
            `rgba(150,215,255,${
                0.045 *
                alpha
            })`
        );


        coreGradient.addColorStop(
            1,
            'rgba(100,190,255,0)'
        );


        ctx.strokeStyle =
            coreGradient;


        ctx.lineWidth =
            (
                0.22 +
                progress * 0.18
            ) *
            scale;


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
        //
        // Pequena e integrada ao rastro.
        // =====================================================

        const lastPoint =
            points[
                points.length - 1
            ];


        const finalSize =
            (
                0.55 +
                tear.initialSize * 0.45 +
                progress * 0.65
            ) *
            scale;


        const dropGradient =
            ctx.createRadialGradient(
                lastPoint.x,
                lastPoint.y,
                0,
                lastPoint.x,
                lastPoint.y,
                finalSize * 2.2
            );


        dropGradient.addColorStop(
            0,
            `rgba(245,252,255,${
                0.24 *
                alpha
            })`
        );


        dropGradient.addColorStop(
            0.35,
            `rgba(180,230,255,${
                0.14 *
                alpha
            })`
        );


        dropGradient.addColorStop(
            1,
            'rgba(80,170,255,0)'
        );


        ctx.fillStyle =
            dropGradient;


        ctx.beginPath();


        ctx.arc(
            lastPoint.x,
            lastPoint.y,
            finalSize * 1.5,
            0,
            Math.PI * 2
        );


        ctx.fill();


        // =====================================================
        // PEQUENO BRILHO
        // =====================================================

        ctx.fillStyle =
            `rgba(255,255,255,${
                0.25 *
                alpha
            })`;


        ctx.beginPath();


        ctx.arc(
            lastPoint.x -
            finalSize * 0.25,

            lastPoint.y -
            finalSize * 0.25,

            Math.max(
                0.35,
                finalSize * 0.20
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
