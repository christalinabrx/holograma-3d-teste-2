// ============================================================
// HOLOGRAPHIC TEARS
// Sistema procedural de lágrimas holográficas
//
// - até 5 lágrimas simultâneas
// - nascimento aleatório na borda inferior da pálpebra
// - preferência pelas extremidades externas dos olhos
// - gotas pequenas e delicadas
// - crescimento gradual durante o percurso
// - fluxo orgânico
// - trajetória adaptada ao contorno da face
// - lágrimas seguem a curvatura das bochechas
// - rastros líquidos integrados às gotas
// - secagem gradual
// - brilho holográfico
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

        this.maxTears = 5;

        this.tears = [];


        // =====================================================
        // CONTROLE DE NASCIMENTO
        // =====================================================

        this.spawnTimer = 0;

        this.nextSpawn = 900;


        // =====================================================
        // ESTADO DOS OLHOS
        // =====================================================

        this.leftWetness = 0;

        this.rightWetness = 0;


        // =====================================================
        // CONFIGURAÇÕES
        // =====================================================

        this.config = {

            // formação da pequena gota
            formationTime: 1200,

            // tempo do percurso
            streamTime: 5600,

            // tempo de secagem
            fadeTime: 3000,

            // distância mínima entre lágrimas
            minSpawnDistance: 11,

            // distância mínima percorrida
            minDistance: 55,

            // distância máxima
            maxDistance: 125,

            // quanto a lágrima cresce
            // durante o percurso
            growth: 0.65

        };


        // =====================================================
        // ÚLTIMO LADO UTILIZADO
        // ajuda a distribuir lágrimas
        // =====================================================

        this.lastSpawnSide = null;

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
        // CONTROLE DAS NOVAS LÁGRIMAS
        // -----------------------------------------------------

        if (
            this.intensity < 0.03
        ) {

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


                const intensityFactor =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            this.intensity
                        )
                    );


                this.nextSpawn =
                    700 -
                    intensityFactor * 250 +
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
        // REMOVE SECAS
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


        // =====================================================
        // LÁGRIMAS DO MESMO OLHO
        // =====================================================

        const existing =
            this.tears.filter(
                tear =>
                    tear.side === side
            );


        // =====================================================
        // POSIÇÃO INICIAL
        // =====================================================

        let spawnX =
            eyePosition.x;


        let spawnY =
            eyePosition.y;


        let attempts = 0;


        while (
            attempts < 20
        ) {

            // -------------------------------------------------
            // NÃO USAMOS MAIS UMA DISTRIBUIÇÃO CENTRAL
            //
            // A posição será corrigida posteriormente
            // através dos landmarks da pálpebra.
            // -------------------------------------------------

            const randomOffset =
                (
                    Math.random() -
                    0.5
                ) *
                0.55;


            spawnX =
                eyePosition.x +
                randomOffset *
                eyePosition.width;


            spawnY =
                eyePosition.y +
                Math.random() *
                eyePosition.height;


            const tooClose =
                existing.some(
                    other => {

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
        // CURVATURA
        // =====================================================

        const direction =
            side === 'left'
                ? -1
                : 1;


        const curve =
            (
                5 +
                Math.random() * 8
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
            // IDENTIDADE
            // -------------------------------------------------

            side: side,


            // -------------------------------------------------
            // POSIÇÃO
            // -------------------------------------------------

            x: spawnX,

            y: spawnY,


            // -------------------------------------------------
            // TAMANHO INICIAL
            //
            // bem menor que antes
            // -------------------------------------------------

            size:
                (
                    0.38 +
                    Math.random() * 0.30
                ) *
                scale,


            // -------------------------------------------------
            // CURVA
            // -------------------------------------------------

            curve: curve,


            distance: distance,


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
                    Math.random() * 0.55
                ),


            fadeTime:
                this.config.fadeTime *
                (
                    0.75 +
                    Math.random() * 0.60
                ),


            // -------------------------------------------------
            // ESTADO
            // -------------------------------------------------

            phase: 'forming',

            progress: 0,

            streamProgress: 0,

            fadeProgress: 0,


            // -------------------------------------------------
            // CRESCIMENTO
            // -------------------------------------------------

            growth:
                0.45 +
                Math.random() * 0.35,


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
            // MOVIMENTO
            // -------------------------------------------------

            curvePhase:
                Math.random() *
                Math.PI *
                2,


            // -------------------------------------------------
            // POSIÇÃO DA PÁLPEBRA
            // será definida pelo landmark
            // -------------------------------------------------

            startT:
                undefined,

            startSegment:
                undefined

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
            // DISTRIBUI ENTRE OS OLHOS
            // -------------------------------------------------

            let side;


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


            if (
                leftCount < rightCount
            ) {

                side = 'left';

            } else if (
                rightCount < leftCount
            ) {

                side = 'right';

            } else {

                side =
                    Math.random() < 0.5
                        ? 'left'
                        : 'right';

            }


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
        // BRILHO DOS OLHOS
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
                transform.scale,
                landmarks
            );

        }

    }


    // =========================================================
    // POSIÇÃO DO OLHO
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


        // -----------------------------------------------------
        // BORDA INFERIOR
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // CENTRO
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // DIMENSÕES
        // -----------------------------------------------------

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
    // PONTO DE NASCIMENTO
    //
    // A lágrima nasce na borda inferior do olho.
    //
    // IMPORTANTE:
    // A distribuição é fortemente inclinada para a
    // extremidade externa do olho.
    // =========================================================

    getTearStartPoint(
        eye,
        tear,
        transform
    ) {

        const lower =
            eye.lower;


        // -----------------------------------------------------
        // DEFINIMOS O PONTO UMA ÚNICA VEZ
        // -----------------------------------------------------

        if (
            tear.startT ===
            undefined
        ) {

            // -------------------------------------------------
            // DISTRIBUIÇÃO NÃO LINEAR
            //
            // Math.pow(..., 0.45) concentra os valores
            // mais próximos da extremidade externa.
            // -------------------------------------------------

            tear.startT =
                Math.pow(
                    Math.random(),
                    0.45
                );


            // evita o centro absoluto

            tear.startT =
                0.50 +
                tear.startT *
                0.45;


            tear.startSegment = 0;

        }


        const a =
            lower[0];


        const b =
            lower[2];


        const x =
            a.x +
            (
                b.x -
                a.x
            ) *
            tear.startT;


        const y =
            a.y +
            (
                b.y -
                a.y
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
    // CONSTRÓI O CAMINHO DA LÁGRIMA
    //
    // Esta é a parte principal da nova versão.
    //
    // A lágrima usa landmarks da mandíbula/bochecha para
    // construir uma trajetória que acompanha o rosto.
    // =========================================================

    getFaceTearPath(
        tear,
        start,
        landmarks,
        transform,
        scale
    ) {

        // -----------------------------------------------------
        // LANDMARKS DA MANDÍBULA
        //
        // 0 ---------------- 16
        //   \              /
        //    \            /
        //     \__________/
        //
        // Para o lado esquerdo usamos a região 0-6.
        // Para o lado direito usamos 10-16.
        // -----------------------------------------------------

        const jawIndexes =
            tear.side === 'left'
                ? [0, 1, 2, 3, 4, 5, 6]
                : [16, 15, 14, 13, 12, 11, 10];


        const jaw =
            jawIndexes
                .map(
                    index =>
                        landmarks[index]
                )
                .filter(Boolean);


        if (
            jaw.length < 3
        ) {

            return [
                start,
                {
                    x:
                        start.x +
                        tear.curve,

                    y:
                        start.y +
                        tear.distance
                }
            ];

        }


        // -----------------------------------------------------
        // ESCOLHE UM PONTO DA BOCHECHA
        //
        // Não vamos até o maxilar.
        //
        // Pegamos uma região intermediária.
        // -----------------------------------------------------

        const targetIndex =
            Math.floor(
                jaw.length *
                (
                    0.40 +
                    Math.random() *
                    0.30
                )
            );


        const target =
            jaw[
                Math.min(
                    targetIndex,
                    jaw.length - 1
                )
            ];


        const targetPoint =
            this.transformPoint(
                target,
                transform
            );


        // -----------------------------------------------------
        // DIREÇÃO EXTERNA
        //
        // Faz a lágrima se afastar do centro da face.
        // -----------------------------------------------------

        const outward =
            tear.side === 'left'
                ? -1
                : 1;


        // -----------------------------------------------------
        // CAMINHO
        // -----------------------------------------------------

        const points = [];


        const segments = 28;


        for (
            let i = 0;
            i <= segments;
            i++
        ) {

            const t =
                i /
                segments;


            // -------------------------------------------------
            // EASING VERTICAL
            // -------------------------------------------------

            const eased =
                this.easeInOut(t);


            // -------------------------------------------------
            // INTERPOLAÇÃO
            // -------------------------------------------------

            let px =
                start.x +
                (
                    targetPoint.x -
                    start.x
                ) *
                eased;


            let py =
                start.y +
                (
                    targetPoint.y -
                    start.y
                ) *
                eased;


            // -------------------------------------------------
            // CURVATURA PARA O LADO EXTERNO
            // -------------------------------------------------

            const outwardCurve =
                Math.sin(
                    t *
                    Math.PI
                ) *
                (
                    8 *
                    scale
                ) *
                outward;


            px +=
                outwardCurve;


            // -------------------------------------------------
            // PEQUENA OSCILAÇÃO NATURAL
            // -------------------------------------------------

            const organic =
                Math.sin(
                    t *
                    Math.PI *
                    2 +
                    tear.curvePhase
                ) *
                (
                    1.1 *
                    scale
                ) *
                Math.sin(
                    t *
                    Math.PI
                );


            px +=
                organic;


            // -------------------------------------------------
            // PEQUENA VARIAÇÃO VERTICAL
            // -------------------------------------------------

            py +=
                Math.sin(
                    t *
                    Math.PI
                ) *
                (
                    1.5 *
                    scale
                );


            points.push({

                x: px,

                y: py

            });

        }


        return points;

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
        scale,
        landmarks
    ) {

        // =====================================================
        // OPACIDADE
        // =====================================================

        let alpha = 1;


        if (
            tear.phase ===
            'forming'
        ) {

            alpha =
                this.easeOut(
                    tear.progress
                );

        }


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
        // CAMINHO DA FACE
        // =====================================================

        const path =
            this.getFaceTearPath(
                tear,
                {
                    x,
                    y
                },
                landmarks,
                {
                    ...this.currentTransform,
                    scaleX:
                        this.currentTransform?.scaleX ||
                        scale,
                    scaleY:
                        this.currentTransform?.scaleY ||
                        scale
                },
                scale
            );


        // -----------------------------------------------------
        // Se não houver transform armazenado corretamente,
        // usamos uma trajetória simples.
        // -----------------------------------------------------

        if (
            !path ||
            path.length < 2
        ) {

            return;

        }


        // =====================================================
        // QUANTOS PONTOS MOSTRAR
        // =====================================================

        const visibleCount =
            Math.max(
                2,
                Math.floor(
                    path.length *
                    flow
                )
            );


        const visiblePath =
            path.slice(
                0,
                visibleCount
            );


        if (
            visiblePath.length < 2
        ) {

            return;

        }


        // =====================================================
        // TAMANHO DA GOTA
        //
        // começa pequena e cresce muito pouco
        // =====================================================

        const growth =
            1 +
            (
                tear.growth *
                flow
            );


        let dropGrow = 1;


        if (
            tear.phase ===
            'forming'
        ) {

            dropGrow =
                Math.sin(
                    tear.progress *
                    Math.PI *
                    0.5
                );

        }


        const width =
            (
                1.0 +
                tear.size * 0.8
            ) *
            growth *
            dropGrow;


        const height =
            (
                2.5 +
                tear.size * 1.7
            ) *
            growth *
            dropGrow;


        const last =
            visiblePath[
                visiblePath.length - 1
            ];


        // =====================================================
        // CORPO DA GOTA
        // =====================================================

        ctx.save();


        ctx.globalCompositeOperation =
            'screen';


        const gradient =
            ctx.createRadialGradient(
                last.x,
                last.y,
                0,
                last.x,
                last.y,
                height * 2.5
            );


        gradient.addColorStop(
            0,
            `rgba(235,250,255,${
                0.30 * alpha
            })`
        );


        gradient.addColorStop(
            0.35,
            `rgba(190,235,255,${
                0.20 * alpha
            })`
        );


        gradient.addColorStop(
            0.70,
            `rgba(100,190,255,${
                0.08 * alpha
            })`
        );


        gradient.addColorStop(
            1,
            'rgba(70,160,255,0)'
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.ellipse(
            last.x,
            last.y,
            width,
            height,
            0,
            0,
            Math.PI * 2
        );


        ctx.fill();


        // =====================================================
        // REFLEXO MUITO PEQUENO
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
                0.28 *
                shimmer *
                alpha
            })`;


        ctx.beginPath();


        ctx.ellipse(
            last.x -
            width * 0.30,

            last.y -
            height * 0.20,

            Math.max(
                0.25,
                width * 0.16
            ),

            Math.max(
                0.35,
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
        // O rastro passa por baixo da gota e se mistura
        // gradualmente com ela.
        // =====================================================

        this.drawLiquidTrail(
            ctx,
            visiblePath,
            tear,
            alpha,
            scale,
            flow
        );


        ctx.restore();

    }


    // =========================================================
    // RASTRO LÍQUIDO
    // =========================================================

    drawLiquidTrail(
        ctx,
        points,
        tear,
        alpha,
        scale,
        flow
    ) {

        if (
            points.length < 2
        ) {

            return;

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
                0.18 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.25,
            `rgba(180,230,255,${
                0.14 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.55,
            `rgba(120,200,255,${
                0.10 *
                alpha
            })`
        );


        gradient.addColorStop(
            0.80,
            `rgba(90,180,255,${
                0.06 *
                alpha
            })`
        );


        gradient.addColorStop(
            1,
            `rgba(70,160,255,0)`
        );


        ctx.strokeStyle =
            gradient;


        // -----------------------------------------------------
        // RASTRO FINO
        // -----------------------------------------------------

        ctx.lineWidth =
            (
                0.40 +
                tear.size *
                0.16 +
                flow *
                0.12
            ) *
            scale;


        ctx.lineCap =
            'round';


        ctx.lineJoin =
            'round';


        ctx.beginPath();


        ctx.moveTo(
            points[0].x,
            points[0].y
        );


        // =====================================================
        // SUAVIZA O CAMINHO
        // =====================================================

        for (
            let i = 1;
            i < points.length - 1;
            i++
        ) {

            const current =
                points[i];


            const next =
                points[i + 1];


            const midX =
                (
                    current.x +
                    next.x
                ) * 0.5;


            const midY =
                (
                    current.y +
                    next.y
                ) * 0.5;


            ctx.quadraticCurveTo(
                current.x,
                current.y,
                midX,
                midY
            );

        }


        const last =
            points[
                points.length - 1
            ];


        ctx.lineTo(
            last.x,
            last.y
        );


        ctx.stroke();


        // =====================================================
        // PEQUENO BRILHO NA PONTA
        // =====================================================

        const tipAlpha =
            0.22 *
            alpha;


        ctx.fillStyle =
            `rgba(255,255,255,${
                tipAlpha
            })`;


        ctx.beginPath();


        ctx.arc(
            last.x,
            last.y,
            Math.max(
                0.35,
                (
                    0.55 +
                    tear.size *
                    0.15
                ) *
                scale
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
