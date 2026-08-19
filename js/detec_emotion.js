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
        // CANVAS AUXILIAR
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
        // RENDER
        // =====================================================

        this._renderLoop();
    }


    // =========================================================
    // MEDIAPIPE
    // =========================================================

    async _initSegmentation() {

        if (this._segmentation) {

            console.log(
                'MediaPipe já estava inicializado.'
            );

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


        /*
         * =====================================================
         * RESULTADO DO MEDIAPIPE
         * =====================================================
         */

        this._segmentation.onResults(
            (results) => {

                if (!results) {

                    console.warn(
                        'MediaPipe retornou resultado vazio.'
                    );

                    return;
                }


                if (
                    !results.segmentationMask
                ) {

                    console.warn(
                        'MediaPipe não retornou máscara.'
                    );

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
            'MediaPipe Selfie Segmentation inicializado.'
        );
    }


    // =========================================================
    // INICIA O SISTEMA
    // =========================================================

    async startDetection(
    stream,
    existingVideo = null
) {

    if (this.active) {

        console.warn(
            'startDetection chamado novamente. Ignorando.'
        );

        return;
    }


    /*
     * Usa o mesmo vídeo criado pelo main.js.
     */

    if (existingVideo) {

        this.video =
            existingVideo;

    } else {

        this.video =
            document.createElement('video');

        this.video.autoplay = true;

        this.video.muted = true;

        this.video.playsInline = true;

        this.video.srcObject =
            stream;

        await this.video.play();
    }


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


    const videoW =
        this.video.videoWidth;

    const videoH =
        this.video.videoHeight;


    console.log(
        `Câmera inicializada: ${videoW}x${videoH}`
    );


    this._maskCanvas.width =
        videoW;

    this._maskCanvas.height =
        videoH;


    this._personCanvas.width =
        videoW;

    this._personCanvas.height =
        videoH;


    /*
     * MediaPipe primeiro.
     */

    await this._initSegmentation();


    this.active = true;


    /*
     * Depois começa o pipeline.
     */

    this._processFrame();
}


    // =========================================================
    // LOOP PRINCIPAL
    // =========================================================

    async _processFrame() {

        if (!this.active) {

            return;
        }


        if (!this.video) {

            return;
        }


        /*
         * -----------------------------------------------------
         * 1. ENVIA FRAME PARA MEDIAPIPE
         * -----------------------------------------------------
         */

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
                    'Erro no MediaPipe:',
                    error
                );

            } finally {

                this._sendingFrame = false;
            }
        }


        /*
         * -----------------------------------------------------
         * 2. DETECTA ROSTO / EXPRESSÃO
         * -----------------------------------------------------
         */

        await this._detectFace();


        /*
         * -----------------------------------------------------
         * 3. PRÓXIMO FRAME
         * -----------------------------------------------------
         */

        requestAnimationFrame(
            () => this._processFrame()
        );
    }


    // =========================================================
    // FACE API
    // =========================================================

    async _detectFace() {

        if (
            !this.video ||
            !this.active
        ) {

            return;
        }


        /*
         * Não deixa duas detecções
         * acontecerem ao mesmo tempo.
         */

        if (this._detectingFace) {

            return;
        }


        this._detectingFace = true;


        try {

            const options =
                new faceapi.TinyFaceDetectorOptions({

                    inputSize: 416,

                    scoreThreshold: 0.45

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


            if (!detection) {

                this._faceBox =
                    null;

                this._landmarks =
                    null;

            } else {

                this._faceBox =
                    detection.detection.box;


                this._processEmotion(
                    detection.expressions
                );
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
                value >
                confidence
            ) {

                confidence =
                    value;

                emotion =
                    name;
            }
        }


        /*
         * Só dispara quando muda.
         */

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
    // RENDER LOOP
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
    // DRAW ALL
    // =========================================================

    _drawAll() {

        for (
            const [
                id,
                data
            ]
            of Object.entries(
                this.canvases
            )
        ) {

            const canvas =
                data.canvas;

            const ctx =
                data.ctx;

            const videoEl =
                data.videoEl;


            if (
                !canvas ||
                !ctx ||
                !videoEl
            ) {

                continue;
            }


            if (
                videoEl.readyState < 2
            ) {

                continue;
            }


            const w =
                canvas.width;

            const h =
                canvas.height;


            /*
             * =================================================
             * FUNDO PRETO
             * =================================================
             */

            ctx.save();

            ctx.globalCompositeOperation =
                'source-over';

            ctx.fillStyle =
                '#000';

            ctx.fillRect(
                0,
                0,
                w,
                h
            );


            /*
             * =================================================
             * SEM ROSTO
             * =================================================
             */

            if (!this._faceBox) {

                ctx.restore();

                continue;
            }


            /*
             * =================================================
             * SEGMENTAÇÃO AINDA NÃO CHEGOU
             * =================================================
             */

            if (
                !this._segmentationReady ||
                !this._segmentationMask
            ) {

                /*
                 * Durante a inicialização,
                 * mostra a câmera para evitar
                 * a tela preta.
                 */

                ctx.drawImage(
                    videoEl,
                    0,
                    0,
                    w,
                    h
                );

                ctx.restore();

                continue;
            }


            /*
             * =================================================
             * SEGMENTAÇÃO PRONTA
             * =================================================
             */

            this._drawSegmentedHead(
                ctx,
                w,
                h
            );


            ctx.restore();
        }
    }


    // =========================================================
    // CABEÇA SEGMENTADA
    // =========================================================

    _drawSegmentedHead(
        ctx,
        w,
        h
    ) {

        const face =
            this._faceBox;


        if (!face) {

            return;
        }


        const videoW =
            this.video.videoWidth;

        const videoH =
            this.video.videoHeight;


        /*
         * =====================================================
         * REGIÃO DA CABEÇA
         * =====================================================
         */

        const headX =
            face.x -
            face.width * 0.90;


        const headY =
            face.y -
            face.height * 1.15;


        const headW =
            face.width * 2.80;


        const headH =
            face.height * 2.80;


        /*
         * Limita à câmera.
         */

        const sx =
            Math.max(
                0,
                headX
            );


        const sy =
            Math.max(
                0,
                headY
            );


        const ex =
            Math.min(
                videoW,
                headX + headW
            );


        const ey =
            Math.min(
                videoH,
                headY + headH
            );


        const sw =
            ex - sx;


        const sh =
            ey - sy;


        if (
            sw <= 0 ||
            sh <= 0
        ) {

            return;
        }


        // =====================================================
        // CANVAS TEMPORÁRIO
        // =====================================================

        const maskCanvas =
            this._maskCanvas;

        const maskCtx =
            this._maskCtx;


        const personCanvas =
            this._personCanvas;

        const personCtx =
            this._personCtx;


        maskCanvas.width =
            w;

        maskCanvas.height =
            h;


        personCanvas.width =
            w;

        personCanvas.height =
            h;


        maskCtx.clearRect(
            0,
            0,
            w,
            h
        );


        personCtx.clearRect(
            0,
            0,
            w,
            h
        );


        // =====================================================
        // MÁSCARA
        // =====================================================

        maskCtx.drawImage(

            this._segmentationMask,

            sx,
            sy,
            sw,
            sh,

            0,
            0,
            w,
            h
        );


        // =====================================================
        // IMAGEM ORIGINAL
        // =====================================================

        personCtx.drawImage(

            this.video,

            sx,
            sy,
            sw,
            sh,

            0,
            0,
            w,
            h
        );


        /*
         * =====================================================
         * APLICA A MÁSCARA
         * =====================================================
         *
         * A forma da cabeça NÃO é uma elipse.
         *
         * A forma vem do MediaPipe.
         */

        personCtx.globalCompositeOperation =
            'destination-in';


        personCtx.drawImage(
            maskCanvas,
            0,
            0,
            w,
            h
        );


        /*
         * =====================================================
         * RESULTADO
         * =====================================================
         */

        ctx.drawImage(
            personCanvas,
            0,
            0,
            w,
            h
        );
    }


    // =========================================================
    // LANDMARKS
    // =========================================================

    _drawLandmarks(
        ctx,
        w,
        h
    ) {

        if (
            !this._landmarks ||
            !this._faceBox
        ) {

            return;
        }


        const face =
            this._faceBox;


        const headX =
            face.x -
            face.width * 0.90;


        const headY =
            face.y -
            face.height * 1.15;


        const headW =
            face.width * 2.80;


        const headH =
            face.height * 2.80;


        ctx.save();


        ctx.fillStyle =
            'rgba(0,255,200,.85)';


        for (
            const point
            of this._landmarks.positions
        ) {

            const x =
                (
                    (point.x - headX) /
                    headW
                ) * w;


            const y =
                (
                    (point.y - headY) /
                    headH
                ) * h;


            if (
                x < 0 ||
                x > w ||
                y < 0 ||
                y > h
            ) {

                continue;
            }


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                2,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        ctx.restore();
    }
}
