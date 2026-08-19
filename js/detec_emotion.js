export class EmotionController {

    constructor() {

        this.onEmotionChange = null;

        this.active = false;

        this.video = null;

        this.canvases = {};

        // =====================================================
        // FACE API
        // =====================================================

        this._faceBox = null;
        this._landmarks = null;

        this.showLandmarks = false;
        this.carouselMode = false;

        this._lastEmotion = null;
        this._detectingFace = false;

        // =====================================================
        // MEDIAPIPE
        // =====================================================

        this._segmentation = null;

        this._segmentationMask = null;

        this._segmentationImage = null;

        this._segmentationReady = false;

        this._sendingFrame = false;

        // =====================================================
        // CANVAS DE MÁSCARA
        // =====================================================

        this._maskCanvas =
            document.createElement('canvas');

        this._maskCtx =
            this._maskCanvas.getContext('2d');

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
    // MEDIAPIPE
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
                'SelfieSegmentation não foi carregado.'
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

                this._segmentationMask =
                    results.segmentationMask;

                this._segmentationImage =
                    results.image;

                this._segmentationReady =
                    true;
            }
        );

        console.log(
            'MediaPipe inicializado.'
        );
    }


    // =========================================================
    // INICIA
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
        // USA O MESMO VIDEO DO MAIN.JS
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
        // ESPERA A CÂMERA ESTAR REALMENTE PRONTA
        // =====================================================

        await new Promise(
            (resolve) => {

                if (
                    this.video.videoWidth > 0 &&
                    this.video.videoHeight > 0
                ) {

                    resolve();

                    return;
                }

                this.video.onloadedmetadata =
                    () => resolve();
            }
        );

        const w =
            this.video.videoWidth;

        const h =
            this.video.videoHeight;

        console.log(
            `Câmera pronta: ${w}x${h}`
        );

        this._maskCanvas.width = w;
        this._maskCanvas.height = h;

        this._personCanvas.width = w;
        this._personCanvas.height = h;

        // =====================================================
        // MEDIAPIPE PRIMEIRO
        // =====================================================

        await this._initSegmentation();

        // =====================================================
        // AGORA SIM ATIVA
        // =====================================================

        this.active = true;

        this._processFrame();
    }


    // =========================================================
    // PIPELINE PRINCIPAL
    // =========================================================

    async _processFrame() {

        if (!this.active) {
            return;
        }

        if (
            !this.video ||
            this.video.readyState < 2
        ) {

            requestAnimationFrame(
                () => this._processFrame()
            );

            return;
        }

        // =====================================================
        // MEDIAPIPE
        // =====================================================

        if (
            this._segmentation &&
            !this._sendingFrame
        ) {

            this._sendingFrame = true;

            try {

                await this._segmentation.send({

                    image: this.video

                });

            } catch (error) {

                console.error(
                    'Erro MediaPipe:',
                    error
                );

            } finally {

                this._sendingFrame = false;
            }
        }

        // =====================================================
        // FACE API
        // =====================================================

        this._detectFace();

        // =====================================================
        // PRÓXIMO FRAME
        // =====================================================

        requestAnimationFrame(
            () => this._processFrame()
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

        this._detectingFace = true;

        try {

            const options =
                new faceapi.TinyFaceDetectorOptions({

                    inputSize: 320,

                    scoreThreshold: 0.4

                });

            let detection;

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

            } else {

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

            if (detection) {

                this._faceBox =
                    detection.detection.box;

                this._processEmotion(
                    detection.expressions
                );

            } else {

                /*
                 * NÃO apagamos imediatamente o último
                 * rosto detectado.
                 *
                 * Isso evita o piscar quando o detector
                 * perde um frame.
                 */

                // mantém _faceBox
            }

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
    // EMOÇÃO
    // =========================================================

    _processEmotion(expressions) {

        if (!expressions) {
            return;
        }

        let emotion =
            'neutral';

        let confidence =
            0;

        for (
            const [name, value]
            of Object.entries(expressions)
        ) {

            if (
                value > confidence
            ) {

                confidence =
                    value;

                emotion =
                    name;
            }
        }

        if (
            emotion ===
            this._lastEmotion
        ) {

            return;
        }

        this._lastEmotion =
            emotion;

        if (
            this.onEmotionChange
        ) {

            this.onEmotionChange(
                emotion,
                confidence
            );
        }
    }


    // =========================================================
    // RENDER
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

        this.canvases[id] = {

            canvas,

            videoEl,

            ctx:
                canvas.getContext('2d')
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
            const {
                canvas,
                ctx
            }
            of Object.values(
                this.canvases
            )
        ) {

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

            // =================================================
            // SEMPRE LIMPA
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
            // SE A MÁSCARA AINDA NÃO CHEGOU
            // =================================================

            if (
                !this._segmentationReady ||
                !this._segmentationMask
            ) {

                /*
                 * NÃO DESENHA A CÂMERA INTEIRA.
                 *
                 * Mantém preto enquanto o MediaPipe
                 * ainda inicializa.
                 */

                ctx.restore();

                continue;
            }

            // =================================================
            // DESENHA PESSOA SEGMENTADA
            // =================================================

            this._drawSegmentedPerson(
                ctx,
                w,
                h
            );

            ctx.restore();
        }
    }


    // =========================================================
    // SEGMENTAÇÃO
    // =========================================================

    _drawSegmentedPerson(
        ctx,
        w,
        h
    ) {

        const videoW =
            this.video.videoWidth;

        const videoH =
            this.video.videoHeight;

        const maskCanvas =
            this._maskCanvas;

        const maskCtx =
            this._maskCtx;

        const personCanvas =
            this._personCanvas;

        const personCtx =
            this._personCtx;

        // =====================================================
        // MÁSCARA
        // =====================================================

        maskCtx.clearRect(
            0,
            0,
            w,
            h
        );

        maskCtx.drawImage(
            this._segmentationMask,
            0,
            0,
            videoW,
            videoH,
            0,
            0,
            w,
            h
        );

        // =====================================================
        // CÂMERA
        // =====================================================

        personCtx.clearRect(
            0,
            0,
            w,
            h
        );

        personCtx.globalCompositeOperation =
            'source-over';

        personCtx.drawImage(
            this.video,
            0,
            0,
            videoW,
            videoH,
            0,
            0,
            w,
            h
        );

        // =====================================================
        // APLICA MÁSCARA
        // =====================================================

        personCtx.globalCompositeOperation =
            'destination-in';

        personCtx.drawImage(
            maskCanvas,
            0,
            0,
            w,
            h
        );

        // =====================================================
        // RESULTADO
        // =====================================================

        ctx.drawImage(
            personCanvas,
            0,
            0,
            w,
            h
        );
    }
}
