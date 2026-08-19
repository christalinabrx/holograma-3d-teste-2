export class EmotionController {

    constructor() {

        // =====================================================
        // ESTADO GERAL
        // =====================================================

        this.onEmotionChange = null;

        this.active = false;

        this.video = null;

        this.canvases = {};

        this._smoothFaceBox = null;

        this._faceSmoothing = 0.75;


        // =====================================================
        // FACE API
        // =====================================================

        this._faceBox = null;

        this._landmarks = null;

        this.showLandmarks = false;

        this.carouselMode = false;

        // =====================================================
// ESTABILIZAÇÃO DAS EMOÇÕES
// =====================================================

        this._lastEmotion = null;

        this._candidateEmotion = null;

        this._candidateEmotionCount = 0;

        this._emotionHistory = [];

        this._emotionHistorySize = 6;

        this._emotionMinConfidence = 0.35;

        this._emotionRequiredFrames = 3;

        this._detectingFace = false;

        this._lastFaceDetectionTime = 0;

        this._faceDetectionInterval = 80;


        // =====================================================
        // MEDIAPIPE
        // =====================================================

        this._segmentation = null;

        this._segmentationMask = null;

        this._segmentationImage = null;

        this._segmentationReady = false;

        // =====================================================
// ESTABILIZAÇÃO DA SEGMENTAÇÃO
// =====================================================

        this._lastValidMask = null;

        this._lastMaskTime = 0;

        this._maskHoldTime = 180;

        this._lastSegmentationImage = null;

        this._sendingFrame = false;


        // =====================================================
        // CANVAS DA MÁSCARA
        // =====================================================

        this._maskCanvas =
            document.createElement('canvas');

        this._maskCtx =
            this._maskCanvas.getContext(
                '2d',
                { willReadFrequently: true }
            );


        // =====================================================
        // CANVAS DA PESSOA
        // =====================================================

        this._personCanvas =
            document.createElement('canvas');

        this._personCtx =
            this._personCanvas.getContext(
                '2d'
            );


        // =====================================================
        // LOOP DE RENDERIZAÇÃO
        // =====================================================

        this._renderLoop();
    }


    // =========================================================
    // INICIALIZA MEDIAPIPE
    // =========================================================

    async _initSegmentation() {

        if (this._segmentation) {
            return;
        }


        if (
            typeof SelfieSegmentation ===
            'undefined'
        ) {

            throw new Error(
                'SelfieSegmentation não foi carregado. ' +
                'Verifique o index.html.'
            );
        }


        console.log(
            'Inicializando MediaPipe...'
        );


        this._segmentation =
            new SelfieSegmentation({

                locateFile: (file) => {

                    return (
                        'https://cdn.jsdelivr.net/npm/' +
                        '@mediapipe/selfie_segmentation@0.1/' +
                        file
                    );
                }

            });


        this._segmentation.setOptions({

            /*
             * 1 = modelo geral.
             * É o mais adequado para este caso.
             */

            modelSelection: 1

        });


        this._segmentation.onResults(
    (results) => {

        if (
            !results ||
            !results.segmentationMask
        ) {

            return;
        }


        // =================================================
        // NOVA MÁSCARA VÁLIDA
        // =================================================

        this._segmentationMask =
            results.segmentationMask;


        this._segmentationImage =
            results.image;


        this._lastValidMask =
            results.segmentationMask;


        this._lastMaskTime =
            performance.now();


        this._segmentationReady =
            true;
    }
);


        console.log(
            'MediaPipe Selfie Segmentation inicializado.'
        );
    }


    // =========================================================
    // INICIA DETECÇÃO
    // =========================================================

    async startDetection(
        stream,
        existingVideo = null
    ) {

        if (this.active) {

            console.warn(
                'Detecção já estava ativa.'
            );

            return;
        }


        // =====================================================
        // USA O VIDEO EXISTENTE
        // =====================================================

        if (existingVideo) {

            this.video =
                existingVideo;

        } else {

            this.video =
                document.createElement(
                    'video'
                );


            this.video.srcObject =
                stream;


            this.video.muted =
                true;


            this.video.autoplay =
                true;


            this.video.playsInline =
                true;


            await this.video.play();
        }


        // =====================================================
        // ESPERA A CÂMERA
        // =====================================================

        await this._waitForVideo();


        const width =
            this.video.videoWidth;


        const height =
            this.video.videoHeight;


        console.log(
            `Câmera pronta: ${width}x${height}`
        );


        // =====================================================
        // CONFIGURA CANVAS
        // =====================================================

        this._maskCanvas.width =
            width;

        this._maskCanvas.height =
            height;


        this._personCanvas.width =
            width;

        this._personCanvas.height =
            height;


        // =====================================================
        // MEDIAPIPE PRIMEIRO
        // =====================================================

        await this._initSegmentation();


        // =====================================================
        // ATIVA
        // =====================================================

        this.active = true;


        console.log(
            'EmotionController ativo.'
        );


        // =====================================================
        // INICIA OS DOIS PROCESSAMENTOS
        // SEPARADAMENTE
        // =====================================================

        this._segmentationLoop();

        this._faceLoop();
    }


    // =========================================================
    // ESPERA VIDEO
    // =========================================================

    async _waitForVideo() {

        if (
            this.video.videoWidth > 0 &&
            this.video.videoHeight > 0
        ) {

            return;
        }


        await new Promise(
            (resolve) => {

                const check =
                    () => {

                        if (
                            this.video.videoWidth > 0 &&
                            this.video.videoHeight > 0
                        ) {

                            resolve();

                            return;
                        }


                        requestAnimationFrame(
                            check
                        );
                    };


                check();
            }
        );
    }


    // =========================================================
    // LOOP DO MEDIAPIPE
    // =========================================================

    async _segmentationLoop() {

        if (!this.active) {
            return;
        }


        if (
            this.video &&
            this.video.readyState >= 2 &&
            this._segmentation &&
            !this._sendingFrame
        ) {

            this._sendingFrame =
                true;


            try {

                await this._segmentation.send({

                    image: this.video

                });

            } catch (error) {

                console.error(
                    'Erro no MediaPipe:',
                    error
                );

            } finally {

                this._sendingFrame =
                    false;
            }
        }


        /*
         * O próximo processamento do MediaPipe
         * não depende do Face API.
         */

        requestAnimationFrame(
            () => this._segmentationLoop()
        );
    }


    // =========================================================
    // LOOP DO FACE API
    // =========================================================

    _faceLoop() {

        if (!this.active) {
            return;
        }


        const now =
            performance.now();


        if (
            now -
            this._lastFaceDetectionTime
            >=
            this._faceDetectionInterval
        ) {

            this._lastFaceDetectionTime =
                now;


            this._detectFace();
        }


        requestAnimationFrame(
            () => this._faceLoop()
        );
    }


    // =========================================================
    // DETECÇÃO FACIAL
    // =========================================================

    async _detectFace() {

        if (
            !this.video ||
            !this.active ||
            this._detectingFace
        ) {

            return;
        }


        if (
            this.video.readyState < 2
        ) {

            return;
        }


        this._detectingFace =
            true;


        try {

            const options =
                new faceapi.TinyFaceDetectorOptions({

                    inputSize: 320,

                    scoreThreshold: 0.4

                });


            let detection = null;


            // =================================================
            // COM LANDMARKS
            // =================================================

            if (this.showLandmarks) {

                detection =
                    await faceapi
                        .detectSingleFace(
                            this.video,
                            options
                        )
                        .withFaceLandmarks(true)
                        .withFaceExpressions();


                this._landmarks =
                    detection?.landmarks ||
                    null;


            }


            // =================================================
            // SEM LANDMARKS
            // =================================================

            else {

                detection =
                    await faceapi
                        .detectSingleFace(
                            this.video,
                            options
                        )
                        .withFaceExpressions();


                this._landmarks =
                    null;
            }


            // =================================================
            // ROSTO ENCONTRADO
            // =================================================

           if (detection) {

    const newBox =
        detection.detection.box;


    // =================================================
    // PRIMEIRA DETECÇÃO
    // =================================================

    if (
        !this._smoothFaceBox
    ) {

        this._smoothFaceBox = {

            x: newBox.x,

            y: newBox.y,

            width: newBox.width,

            height: newBox.height

        };


    } else {

        // =============================================
        // SUAVIZA POSIÇÃO
        // =============================================

        const s =
            this._faceSmoothing;


        this._smoothFaceBox.x =
            this._smoothFaceBox.x * s +
            newBox.x * (1 - s);


        this._smoothFaceBox.y =
            this._smoothFaceBox.y * s +
            newBox.y * (1 - s);


        this._smoothFaceBox.width =
            this._smoothFaceBox.width * s +
            newBox.width * (1 - s);


        this._smoothFaceBox.height =
            this._smoothFaceBox.height * s +
            newBox.height * (1 - s);
    }


    // =================================================
    // USA A CAIXA SUAVIZADA
    // =================================================

    this._faceBox = {

        ...this._smoothFaceBox

    };


    // =================================================
    // EMOÇÃO
    // =================================================

    if (
        detection.expressions
    ) {

        this._processEmotion(
            detection.expressions
        );
    }


                if (
                    detection.expressions
                ) {

                    this._processEmotion(
                        detection.expressions
                    );
                }
            }


            /*
             * IMPORTANTE:
             *
             * Se o rosto não for encontrado neste frame,
             * NÃO apagamos _faceBox.
             *
             * Isso impede que a cabeça fique piscando.
             */
        }


        catch (error) {

            console.error(
                'Erro face-api:',
                error
            );
        }


        finally {

            this._detectingFace =
                false;
        }
    }


    // =========================================================
    // PROCESSA EMOÇÃO
    // =========================================================

    _processEmotion(expressions) {

    if (!expressions) {
        return;
    }

    // =====================================================
    // ENCONTRA A EMOÇÃO MAIS PROVÁVEL
    // =====================================================

    let currentEmotion = 'neutral';

    let currentConfidence = 0;

    for (
        const [name, value]
        of Object.entries(expressions)
    ) {

        if (value > currentConfidence) {

            currentConfidence =
                value;

            currentEmotion =
                name;
        }
    }


    // =====================================================
    // CONFIDÊNCIA MUITO BAIXA
    // =====================================================

    if (
        currentConfidence <
        this._emotionMinConfidence
    ) {

        return;
    }


    // =====================================================
    // GUARDA HISTÓRICO
    // =====================================================

    this._emotionHistory.push({

        emotion:
            currentEmotion,

        confidence:
            currentConfidence,

        time:
            performance.now()
    });


    // Mantém somente os últimos frames

    if (
        this._emotionHistory.length >
        this._emotionHistorySize
    ) {

        this._emotionHistory.shift();
    }


    // =====================================================
    // CONTA A EMOÇÃO DOMINANTE
    // =====================================================

    const counts = {};


    for (
        const item
        of this._emotionHistory
    ) {

        if (
            !counts[item.emotion]
        ) {

            counts[item.emotion] = 0;
        }


        counts[item.emotion]++;
    }


    let dominantEmotion =
        currentEmotion;

    let dominantCount =
        0;


    for (
        const [emotion, count]
        of Object.entries(counts)
    ) {

        if (
            count >
            dominantCount
        ) {

            dominantEmotion =
                emotion;

            dominantCount =
                count;
        }
    }


    // =====================================================
    // CONFIDÊNCIA MÉDIA
    // =====================================================

    let confidenceSum =
        0;

    let confidenceCount =
        0;


    for (
        const item
        of this._emotionHistory
    ) {

        if (
            item.emotion ===
            dominantEmotion
        ) {

            confidenceSum +=
                item.confidence;

            confidenceCount++;
        }
    }


    const averageConfidence =
        confidenceCount > 0
            ? confidenceSum /
              confidenceCount
            : 0;


    // =====================================================
    // EMOÇÃO CANDIDATA
    // =====================================================

    if (
        dominantEmotion ===
        this._candidateEmotion
    ) {

        this._candidateEmotionCount++;

    } else {

        this._candidateEmotion =
            dominantEmotion;

        this._candidateEmotionCount =
            1;
    }


    // =====================================================
    // AINDA NÃO ESTÁ ESTÁVEL
    // =====================================================

    if (
        this._candidateEmotionCount <
        this._emotionRequiredFrames
    ) {

        return;
    }


    // =====================================================
    // JÁ É A EMOÇÃO ATUAL
    // =====================================================

    if (
        dominantEmotion ===
        this._lastEmotion
    ) {

        return;
    }


    // =====================================================
    // CONFIRMA A NOVA EMOÇÃO
    // =====================================================

    this._lastEmotion =
        dominantEmotion;


    console.log(
        'Emoção estabilizada:',
        dominantEmotion,
        'confiança:',
        averageConfidence.toFixed(2)
    );


    // =====================================================
    // ENVIA PARA O SISTEMA DE SOM
    // =====================================================

    if (
        this.onEmotionChange
    ) {

        this.onEmotionChange(

            dominantEmotion,

            averageConfidence
        );
    }
}


    // =========================================================
    // LOOP VISUAL
    // =========================================================

    _renderLoop() {

        this._drawAll();


        requestAnimationFrame(
            () => this._renderLoop()
        );
    }


    // =========================================================
    // REGISTRA CANVAS
    // =========================================================

    registerCanvas(
        id,
        canvas,
        videoEl
    ) {

        if (!canvas) {
            return;
        }


        this.canvases[id] = {

            canvas,

            videoEl,

            ctx:
                canvas.getContext('2d')
        };
    }


    // =========================================================
    // DESENHA TODOS OS CANVASES
    // =========================================================

    _drawAll() {

        if (!this.video) {
            return;
        }


        if (
            this.video.readyState < 2 ||
            !this.video.videoWidth
        ) {

            return;
        }


        for (
            const item
            of Object.values(
                this.canvases
            )
        ) {

            const {
                canvas,
                ctx
            } = item;


            if (
                !canvas ||
                !ctx
            ) {

                continue;
            }


            const w =
                canvas.width;


            const h =
                canvas.height;


            if (
                w <= 0 ||
                h <= 0
            ) {

                continue;
            }


            // =================================================
            // LIMPA
            // =================================================

            ctx.save();


            ctx.globalCompositeOperation =
                'source-over';


            ctx.fillStyle =
                '#000000';


            ctx.fillRect(
                0,
                0,
                w,
                h
            );


            // =================================================
            // ESPERA MÁSCARA
            // =================================================

            if (
    !this._segmentationReady
) {

    ctx.restore();

    continue;
}


// =====================================================
// USA A ÚLTIMA MÁSCARA VÁLIDA
// =====================================================

if (
    !this._segmentationMask &&
    this._lastValidMask
) {

    this._segmentationMask =
        this._lastValidMask;
}


if (
    !this._segmentationMask
) {

    ctx.restore();

    continue;
}


            // =================================================
            // DESENHA CABEÇA SEGMENTADA
            // =================================================

            this._drawHeadSegmented(
                ctx,
                w,
                h
            );


            ctx.restore();
        }
    }


    // =========================================================
    // DESENHA SOMENTE A CABEÇA
    // =========================================================

    _drawHeadSegmented(
        ctx,
        outputW,
        outputH
    ) {

        const videoW =
            this.video.videoWidth;


        const videoH =
            this.video.videoHeight;


        if (
            !videoW ||
            !videoH
        ) {

            return;
        }


        /*
         * Sem detecção facial ainda:
         *
         * não mostramos o corpo inteiro.
         *
         * Portanto, aguardamos o primeiro rosto.
         */

        if (!this._faceBox) {
            return;
        }


        // =====================================================
        // FACE BOX
        // =====================================================

        const face =
            this._faceBox;


        /*
         * A caixa do face-api representa apenas o rosto.
         *
         * Expandimos essa região para incluir:
         *
         * - cabelo
         * - testa
         * - laterais da cabeça
         * - parte inferior da cabeça
         * - uma pequena região do pescoço
         *
         * Não usamos uma elipse.
         *
         * A forma final continua vindo da máscara
         * de segmentação do MediaPipe.
         */

        const headLeft =
            Math.max(
                0,
                face.x -
                face.width * 0.75
            );


        const headTop =
            Math.max(
                0,
                face.y -
                face.height * 0.85
            );


        const headRight =
            Math.min(
                videoW,
                face.x +
                face.width * 1.75
            );


        const headBottom =
            Math.min(
                videoH,
                face.y +
                face.height * 1.55
            );


        const headWidth =
            headRight -
            headLeft;


        const headHeight =
            headBottom -
            headTop;


        if (
            headWidth <= 0 ||
            headHeight <= 0
        ) {

            return;
        }


        // =====================================================
        // CANVAS DA MÁSCARA
        // =====================================================

        const maskCanvas =
            this._maskCanvas;


        const maskCtx =
            this._maskCtx;


        maskCtx.clearRect(
            0,
            0,
            videoW,
            videoH
        );


        // =====================================================
        // COPIA A MÁSCARA DO MEDIAPIPE
        // =====================================================

        maskCtx.drawImage(
            this._segmentationMask,
            0,
            0,
            videoW,
            videoH
        );


        // =====================================================
        // CANVAS DA PESSOA
        // =====================================================

        const personCanvas =
            this._personCanvas;


        const personCtx =
            this._personCtx;


        personCtx.clearRect(
            0,
            0,
            videoW,
            videoH
        );


        personCtx.globalCompositeOperation =
            'source-over';


        // =====================================================
        // CÂMERA
        // =====================================================

        personCtx.drawImage(
            this.video,
            0,
            0,
            videoW,
            videoH
        );


        // =====================================================
        // APLICA A MÁSCARA DO MEDIAPIPE
        // =====================================================

        personCtx.globalCompositeOperation =
            'destination-in';


        personCtx.drawImage(
            maskCanvas,
            0,
            0
        );


        // =====================================================
        // REMOVE TUDO FORA DA REGIÃO DA CABEÇA
        // =====================================================

        personCtx.globalCompositeOperation =
            'destination-in';


        personCtx.fillStyle =
            '#ffffff';


        /*
         * ATENÇÃO:
         *
         * Não usamos ellipse().
         *
         * A região é um retângulo de recorte,
         * mas a forma visível continua sendo a
         * máscara do MediaPipe.
         *
         * Assim cabelo/rosto continuam com a
         * silhueta real da pessoa.
         */

        personCtx.fillRect(
            headLeft,
            headTop,
            headWidth,
            headHeight
        );


        // =====================================================
        // DESENHA NO CANVAS DO HOLOGRAMA
        // =====================================================

        ctx.drawImage(
            personCanvas,
            headLeft,
            headTop,
            headWidth,
            headHeight,

            0,
            0,
            outputW,
            outputH
        );
    }


    // =========================================================
    // CONTROLES
    // =========================================================

    setLandmarksVisible(
        visible
    ) {

        this.showLandmarks =
            Boolean(visible);
    }


    setCarouselMode(
        enabled
    ) {

        this.carouselMode =
            Boolean(enabled);
    }


    // =========================================================
    // PARA DETECÇÃO
    // =========================================================

    stop() {

        this.active =
            false;


        this._sendingFrame =
            false;


        console.log(
            'EmotionController parado.'
        );
    }
}
