import { HolographicTears } from './holographic_tears.js';

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

        // =====================================================
        // SISTEMA PROCEDURAL DE LÁGRIMAS
       

        this._tears =
            new HolographicTears();
         // =====================================================

        this.carouselMode = false;

        this._detectingFace = false;

        this._lastFaceDetectionTime = 0;

        this._faceDetectionInterval = 80;

        this._faceOptions = null;


        // =====================================================
        // ENQUADRAMENTO ESTÁVEL DA CABEÇA
        // =====================================================

        this._headFrame = null;

        this._headFrameInitialized = false;

        /*
         * O tamanho da janela da cabeça é calculado
         * SOMENTE na primeira detecção.
         *
         * Depois disso ele não muda mais.
         *
         * Isso evita o efeito de:
         *
         * cabeça aumenta
         * cabeça diminui
         * cabeça aumenta
         * cabeça diminui
         *
         * que estava acontecendo nas telas.
         */

        this._headFrameWidthFactor = 2.8;

        this._headFrameHeightFactor = 3.4;


        /*
         * Posição vertical da cabeça dentro do enquadramento.
         *
         * 0.56 deixa um pouco mais de espaço acima
         * da cabeça.
         */

        this._headFrameVerticalPosition = 0.56;


        /*
         * Suavização do movimento.
         *
         * IMPORTANTE:
         *
         * suavizamos apenas X e Y.
         *
         * width e height permanecem fixos.
         */

        this._headFrameSmoothing = 0.92;


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


                // =================================================
                // GUARDA MÁSCARA VÁLIDA
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
        // USA O VÍDEO EXISTENTE
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
        // ESPERA A CÂMERA ESTAR PRONTA
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
        // VERIFICA FACE API
        // =====================================================

        if (
            typeof faceapi ===
            'undefined'
        ) {

            throw new Error(
                'face-api.js não foi carregado.'
            );
        }


        // =====================================================
        // CONFIGURA DETECTOR FACIAL
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
        // LIMPA ESTADOS ANTERIORES
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


        this._headFrame =
            null;


        this._headFrameInitialized =
            false;


        // =====================================================
        // RESET EMOÇÕES
        // =====================================================

        this._emotionHistory =
            [];


        this._lastEmotion =
            null;


        this._candidateEmotion =
            null;


        this._candidateEmotionCount =
            0;


        this._lastFaceDetectionTime =
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
    // ESPERA O VÍDEO
    // =========================================================

    async _waitForVideo() {

        if (
            this.video &&
            this.video.videoWidth > 0 &&
            this.video.videoHeight > 0
        ) {

            return;
        }


        await new Promise(
            (resolve) => {

                const check =
                    () => {

                        if (!this.video) {

                            requestAnimationFrame(
                                check
                            );

                            return;
                        }


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

    let detection =
        null;


    // =================================================
    // DETECÇÃO FACIAL COM LANDMARKS
    // =================================================

    detection =
        await faceapi
            .detectSingleFace(
                this.video,
                this._faceOptions
            )
            .withFaceLandmarks(true)
            .withFaceExpressions();


    // =================================================
    // GUARDA OS LANDMARKS SEMPRE
    // =================================================

    this._landmarks =
        detection?.landmarks ||
        null;



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

                        x: newBox.x,

                        y: newBox.y,

                        width: newBox.width,

                        height: newBox.height

                    };

                }


                // =============================================
                // SUAVIZA O ROSTO
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


                this._faceBox = {

                    ...this._smoothFaceBox

                };


                // =============================================
                // ATUALIZA ENQUADRAMENTO
                // =============================================

                this._updateHeadFrame();


                // =============================================
                // PROCESSA EMOÇÃO
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
             * IMPORTANTE:
             *
             * Se o rosto não for encontrado neste frame,
             * NÃO apagamos _faceBox.
             *
             * Também não apagamos _headFrame.
             *
             * Isso evita que a imagem desapareça
             * momentaneamente.
             */

        } catch (error) {

            console.error(
                'Erro face-api:',
                error
            );

        } finally {

            this._detectingFace =
                false;
        }
    }


    // =========================================================
    // ATUALIZA ENQUADRAMENTO DA CABEÇA
    // =========================================================

    _updateHeadFrame() {

        if (
            !this._faceBox ||
            !this.video
        ) {

            return;
        }


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


        const face =
            this._faceBox;


        // =====================================================
        // PRIMEIRA DETECÇÃO
        // =====================================================

        if (
            !this._headFrameInitialized
        ) {

            /*
             * IMPORTANTE:
             *
             * O tamanho é definido UMA VEZ.
             */

            const frameWidth =
                face.width *
                this._headFrameWidthFactor;


            const frameHeight =
                face.height *
                this._headFrameHeightFactor;


            const centerX =
                face.x +
                face.width / 2;


            const centerY =
                face.y +
                face.height * 0.45;


            this._headFrame = {

                x:
                    centerX -
                    frameWidth / 2,

                y:
                    centerY -
                    frameHeight *
                    this._headFrameVerticalPosition,

                width:
                    frameWidth,

                height:
                    frameHeight
            };


            this._headFrameInitialized =
                true;


            this._clampHeadFrame();


            return;
        }


        // =====================================================
        // ENQUADRAMENTO JÁ EXISTE
        // =====================================================

        /*
         * AQUI ESTÁ A PRINCIPAL CORREÇÃO.
         *
         * width e height NÃO são recalculados.
         *
         * Portanto:
         *
         * NÃO existe zoom.
         */

        const frame =
            this._headFrame;


        const centerX =
            face.x +
            face.width / 2;


        const centerY =
            face.y +
            face.height * 0.45;


        const targetX =
            centerX -
            frame.width / 2;


        const targetY =
            centerY -
            frame.height *
            this._headFrameVerticalPosition;


        const s =
            this._headFrameSmoothing;


        // =====================================================
        // SUAVIZA SOMENTE A POSIÇÃO
        // =====================================================

        frame.x =
            frame.x * s +
            targetX * (1 - s);


        frame.y =
            frame.y * s +
            targetY * (1 - s);


        // =====================================================
        // GARANTE QUE NÃO SAIA DA CÂMERA
        // =====================================================

        this._clampHeadFrame();
    }


    // =========================================================
    // LIMITA ENQUADRAMENTO À CÂMERA
    // =========================================================

    _clampHeadFrame() {

        if (
            !this._headFrame ||
            !this.video
        ) {

            return;
        }


        const videoW =
            this.video.videoWidth;


        const videoH =
            this.video.videoHeight;


        const frame =
            this._headFrame;


        // =====================================================
        // HORIZONTAL
        // =====================================================

        if (
            frame.width >= videoW
        ) {

            frame.x =
                0;

            frame.width =
                videoW;

        } else {

            frame.x =
                Math.max(
                    0,
                    Math.min(
                        frame.x,
                        videoW -
                        frame.width
                    )
                );
        }


        // =====================================================
        // VERTICAL
        // =====================================================

        if (
            frame.height >= videoH
        ) {

            frame.y =
                0;

            frame.height =
                videoH;

        } else {

            frame.y =
                Math.max(
                    0,
                    Math.min(
                        frame.y,
                        videoH -
                        frame.height
                    )
                );
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
        // ENCONTRA EMOÇÃO MAIS PROVÁVEL
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
        // ATUALIZA SISTEMA DE LÁGRIMAS
        // =====================================================

this._tears.setEmotion(
    currentEmotion,
    currentConfidence
);


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


        if (
            this._emotionHistory.length >
            this._emotionHistorySize
        ) {

            this._emotionHistory.shift();
        }


        // =====================================================
        // CONTA EMOÇÕES
        // =====================================================

        const counts =
            {};


        for (
            const item
            of this._emotionHistory
        ) {

            counts[item.emotion] =
                (counts[item.emotion] || 0) +
                1;
        }


        // =====================================================
        // ENCONTRA EMOÇÃO DOMINANTE
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
        // CALCULA CONFIANÇA MÉDIA
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
        // CONFIRMA EMOÇÃO
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
        // ENVIA PARA SISTEMA DE SOM
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
            // AGUARDA MÁSCARA
            // =================================================

            if (
                !this._segmentationReady
            ) {

                ctx.restore();

                continue;
            }


            // =================================================
            // USA MÁSCARA ATUAL
            // OU ÚLTIMA MÁSCARA VÁLIDA
            // =================================================

            const mask =
                this._segmentationMask ||
                this._lastValidMask;


            if (!mask) {

                ctx.restore();

                continue;
            }


            // =================================================
            // DESENHA CABEÇA
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
    // DESENHA SOMENTE A CABEÇA SEGMENTADA
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
        // AGUARDA DETECÇÃO FACIAL
        // =====================================================

        if (
            !this._faceBox ||
            !this._headFrame
        ) {

            return;
        }


        const frame =
            this._headFrame;


        if (
            frame.width <= 0 ||
            frame.height <= 0
        ) {

            return;
        }


        // =====================================================
        // COPIA MÁSCARA MEDIAPIPE
        // =====================================================

        const maskCtx =
            this._maskCtx;


        maskCtx.clearRect(
            0,
            0,
            videoW,
            videoH
        );


        maskCtx.globalCompositeOperation =
            'source-over';


        maskCtx.drawImage(

            segmentationMask,

            0,
            0,
            videoW,
            videoH

        );


        // =====================================================
        // COPIA IMAGEM DA CÂMERA
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
        // LIMITA À JANELA DA CABEÇA
        // =====================================================

        personCtx.globalCompositeOperation =
            'destination-in';


        personCtx.fillStyle =
            '#ffffff';


        personCtx.fillRect(

            frame.x,

            frame.y,

            frame.width,

            frame.height

        );


        // =====================================================
        // MANTÉM PROPORÇÃO
        // =====================================================

        const sourceAspect =
            frame.width /
            frame.height;


        const outputAspect =
            outputW /
            outputH;


        let drawWidth =
            outputW;


        let drawHeight =
            outputH;


        let drawX =
            0;


        let drawY =
            0;


        if (
            sourceAspect >
            outputAspect
        ) {

            drawHeight =
                outputH;


            drawWidth =
                outputH *
                sourceAspect;


            drawX =
                (
                    outputW -
                    drawWidth
                ) / 2;

        } else {

            drawWidth =
                outputW;


            drawHeight =
                outputW /
                sourceAspect;


            drawY =
                (
                    outputH -
                    drawHeight
                ) / 2;
        }


        // =====================================================
        // DESENHA NO HOLOGRAMA
        // =====================================================

        ctx.drawImage(
    this._personCanvas,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    drawX,
    drawY,
    drawWidth,
    drawHeight
);

        // =====================================================
// LÁGRIMAS HOLOGRÁFICAS
// =====================================================

if (
    this._landmarks &&
    this._tears
) {

    const scaleX =
        drawWidth /
        frame.width;

    const scaleY =
        drawHeight /
        frame.height;


    this._tears.draw(
        ctx,
        this._landmarks.positions,
        {
            frameX: frame.x,
            frameY: frame.y,

            drawX: drawX,
            drawY: drawY,

            scaleX: scaleX,
            scaleY: scaleY,

            scale:
                (
                    scaleX +
                    scaleY
                ) / 2
        }
    );

}
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


        this._headFrame =
            null;


        this._headFrameInitialized =
            false;


        this._emotionHistory =
            [];


        this._lastEmotion =
            null;


        this._candidateEmotion =
            null;


        this._candidateEmotionCount =
            0;


        console.log(
            'EmotionController parado.'
        );
    }
}
