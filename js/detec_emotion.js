export class EmotionController {

    constructor() {

        // =====================================================
        // ESTADO GERAL
        // =====================================================

        this.onEmotionChange = null;

        this.active = false;

        this.video = null;

        this.canvases = {};


        // =====================================================
        // FACE API
        // =====================================================

        this._faceBox = null;

        this._smoothFaceBox = null;

        this._faceSmoothing = 0.75;

        this._landmarks = null;

        this.showLandmarks = false;

        this.carouselMode = false;

        this._detectingFace = false;

        this._lastFaceDetectionTime = 0;

        this._faceDetectionInterval = 80;

        this._faceOptions = null;


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


        // =====================================================
        // MEDIAPIPE
        // =====================================================

        this._segmentation = null;

        this._segmentationMask = null;

        this._segmentationImage = null;

        this._lastValidMask = null;

        this._lastMaskTime = 0;

        this._maskHoldTime = 250;

        this._segmentationReady = false;

        this._sendingFrame = false;


        // =====================================================
        // CANVAS DA MÁSCARA
        // =====================================================

        this._maskCanvas =
            document.createElement('canvas');

        this._maskCtx =
            this._maskCanvas.getContext('2d');


        // =====================================================
        // CANVAS DA PESSOA
        // =====================================================

        this._personCanvas =
            document.createElement('canvas');

        this._personCtx =
            this._personCanvas.getContext('2d');


        // =====================================================
        // LOOP VISUAL
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
            'Inicializando MediaPipe Selfie Segmentation...'
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


                // =============================================
                // GUARDA O ÚLTIMO RESULTADO VÁLIDO
                // =============================================

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
        // VIDEO EXISTENTE
        // =====================================================

        if (existingVideo) {

            this.video =
                existingVideo;

        } else {

            this.video =
                document.createElement('video');

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
        // CONFIGURA FACE API
        // =====================================================

        this._faceOptions =
            new faceapi.TinyFaceDetectorOptions({

                inputSize: 320,

                scoreThreshold: 0.4

            });


        // =====================================================
        // MEDIAPIPE PRIMEIRO
        // =====================================================

        await this._initSegmentation();


        // =====================================================
        // LIMPA ESTADOS ANTIGOS
        // =====================================================

        this._segmentationMask =
            null;

        this._segmentationImage =
            null;

        this._lastValidMask =
            null;

        this._segmentationReady =
            false;

        this._smoothFaceBox =
            null;

        this._faceBox =
            null;

        this._emotionHistory =
            [];

        this._lastEmotion =
            null;

        this._candidateEmotion =
            null;

        this._candidateEmotionCount =
            0;


        // =====================================================
        // ATIVA
        // =====================================================

        this.active =
            true;


        console.log(
            'EmotionController ativo.'
        );


        // =====================================================
        // INICIA OS PROCESSAMENTOS
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
                            !this.video ||
                            !this.active &&
                            this.video.readyState >= 2
                        ) {
                            // Não faz nada.
                        }


                        if (
                            this.video &&
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
    // LOOP MEDIAPIPE
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

                    image:
                        this.video

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


        requestAnimationFrame(
            () =>
                this._segmentationLoop()
        );
    }


    // =========================================================
    // LOOP FACE API
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
            () =>
                this._faceLoop()
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

            let detection = null;


            // =================================================
            // COM LANDMARKS
            // =================================================

            if (this.showLandmarks) {

                detection =
                    await faceapi
                        .detectSingleFace(
                            this.video,
                            this._faceOptions
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
                            this._faceOptions
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


                // =============================================
                // PRIMEIRA DETECÇÃO
                // =============================================

                if (
                    !this._smoothFaceBox
                ) {

                    this._smoothFaceBox = {

                        x:
                            newBox.x,

                        y:
                            newBox.y,

                        width:
                            newBox.width,

                        height:
                            newBox.height
                    };

                }


                // =============================================
                // SUAVIZAÇÃO
                // =============================================

                else {

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


                // =============================================
                // ATUALIZA FACE BOX
                // =============================================

                this._faceBox = {

                    ...this._smoothFaceBox

                };


                // =============================================
                // EMOÇÃO
                // =============================================

                if (
                    detection.expressions
                ) {

                    this._processEmotion(
                        detection.expressions
                    );
                }
            }


            /*
             * Se o rosto não for encontrado:
             *
             * NÃO apagamos _faceBox.
             *
             * Isso evita que a cabeça desapareça
             * durante uma perda momentânea da detecção.
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
        // ENCONTRA EMOÇÃO DOMINANTE
        // =====================================================

        let currentEmotion =
            'neutral';

        let currentConfidence =
            0;


        for (
            const [name, value]
            of Object.entries(
                expressions
            )
        ) {

            if (
                value >
                currentConfidence
            ) {

                currentConfidence =
                    value;

                currentEmotion =
                    name;
            }
        }


        // =====================================================
        // CONFIDÊNCIA MÍNIMA
        // =====================================================

        if (
            currentConfidence <
            this._emotionMinConfidence
        ) {

            return;
        }


        // =====================================================
        // ADICIONA AO HISTÓRICO
        // =====================================================

        this._emotionHistory.push({

            emotion:
                currentEmotion,

            confidence:
                currentConfidence,

            time:
                performance.now()

        });


        if (
            this._emotionHistory.length >
            this._emotionHistorySize
        ) {

            this._emotionHistory.shift();
        }


        // =====================================================
        // CONTAGEM
        // =====================================================

        const counts = {};


        for (
            const item
            of this._emotionHistory
        ) {

            counts[item.emotion] =
                (counts[item.emotion] || 0)
                + 1;
        }


        // =====================================================
        // EMOÇÃO DOMINANTE
        // =====================================================

        let dominantEmotion =
            currentEmotion;

        let dominantCount =
            0;


        for (
            const [emotion, count]
            of Object.entries(
                counts
            )
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
        // ESPERA ESTABILIZAR
        // =====================================================

        if (
            this._candidateEmotionCount <
            this._emotionRequiredFrames
        ) {

            return;
        }


        // =====================================================
        // NÃO DISPARA NOVAMENTE A MESMA EMOÇÃO
        // =====================================================

        if (
            dominantEmotion ===
            this._lastEmotion
        ) {

            return;
        }


        // =====================================================
        // CONFIRMA
        // =====================================================

        this._lastEmotion =
            dominantEmotion;


        console.log(
            'Emoção estabilizada:',
            dominantEmotion,
            'confiança:',
            averageConfidence.toFixed(2)
        );


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
            () =>
                this._renderLoop()
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


        const ctx =
            canvas.getContext('2d');


        if (!ctx) {
            return;
        }


        this.canvases[id] = {

            canvas,

            videoEl,

            ctx

        };
    }


    // =========================================================
    // DESENHA
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
            // FUNDO PRETO
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
            // VERIFICA MÁSCARA
            // =================================================

            if (
                !this._segmentationReady
            ) {

                ctx.restore();

                continue;
            }


            // =================================================
            // MÁSCARA ATUAL
            // =================================================

            let mask =
                this._segmentationMask;


            // =================================================
            // SE NÃO HOUVER MÁSCARA ATUAL,
            // USA A ÚLTIMA VÁLIDA
            // =================================================

            if (
                !mask &&
                this._lastValidMask
            ) {

                mask =
                    this._lastValidMask;
            }


            // =================================================
            // SE A MÁSCARA FICOU MUITO TEMPO SEM ATUALIZAR
            // NÃO INVENTAMOS UMA NOVA IMAGEM
            // =================================================

            if (!mask) {

                ctx.restore();

                continue;
            }


            // =================================================
            // DESENHA CABEÇA SEGMENTADA
            // =================================================

            this._drawHeadSegmented(
                ctx,
                w,
                h,
                mask
            );


            ctx.restore();
        }
    }


    // =========================================================
    // DESENHA CABEÇA SEGMENTADA
    // =========================================================

    _drawHeadSegmented(
        ctx,
        outputW,
        outputH,
        segmentationMask
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


        // =====================================================
        // AGUARDA ROSTO
        // =====================================================

        if (!this._faceBox) {

            return;
        }


        const face =
            this._faceBox;


        // =====================================================
        // EXPANDE FACE BOX
        // =====================================================

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
        // MÁSCARA
        // =====================================================

        const maskCtx =
            this._maskCtx;


        maskCtx.clearRect(
            0,
            0,
            videoW,
            videoH
        );


        maskCtx.drawImage(
            segmentationMask,
            0,
            0,
            videoW,
            videoH
        );


        // =====================================================
        // PESSOA
        // =====================================================

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


        personCtx.drawImage(
            this.video,
            0,
            0,
            videoW,
            videoH
        );


        // =====================================================
        // APLICA SEGMENTAÇÃO
        // =====================================================

        personCtx.globalCompositeOperation =
            'destination-in';


        personCtx.drawImage(
            this._maskCanvas,
            0,
            0
        );


        // =====================================================
        // LIMITA À REGIÃO DA CABEÇA
        // =====================================================

        personCtx.globalCompositeOperation =
            'destination-in';


        personCtx.fillStyle =
            '#ffffff';


        personCtx.fillRect(
            headLeft,
            headTop,
            headWidth,
            headHeight
        );


        // =====================================================
        // DESENHA NO HOLOGRAMA
        // =====================================================

        ctx.drawImage(
            this._personCanvas,

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


        this._detectingFace =
            false;


        this._segmentationMask =
            null;


        this._lastValidMask =
            null;


        this._segmentationReady =
            false;


        this._faceBox =
            null;


        this._smoothFaceBox =
            null;


        this._emotionHistory =
            [];


        this._candidateEmotion =
            null;


        this._candidateEmotionCount =
            0;


        console.log(
            'EmotionController parado.'
        );
    }
}
