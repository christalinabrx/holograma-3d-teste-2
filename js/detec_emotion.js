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

        // =====================================================
        // MEDIAPIPE
        // =====================================================

        this._segmentation = null;
        this._segmentationMask = null;
        this._segmentationImage = null;

        this._segmentationBusy = false;

        // =====================================================
        // CANVAS AUXILIARES
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
        // CONFIGURAÇÃO
        // =====================================================

        this.showLandmarks = false;
        this.carouselMode = false;

        this._lastDetection = 0;
        this._detectionInterval = 100;

        this._lastSegmentation = 0;
        this._segmentationInterval = 80;

        this._lastEmotion = null;

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

        if (typeof SelfieSegmentation === 'undefined') {

            throw new Error(
                'SelfieSegmentation não está disponível.'
            );
        }


        this._segmentation =
            new SelfieSegmentation({

                locateFile: (file) => {

                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;

                }

            });


        this._segmentation.setOptions({

            /*
             * 1 = modelo otimizado para paisagem.
             */
            modelSelection: 1

        });


        this._segmentation.onResults(
            (results) => {

                if (!results) {
                    return;
                }


                if (!results.segmentationMask) {

                    console.warn(
                        'MediaPipe não retornou segmentationMask.'
                    );

                    return;
                }


                /*
                 * Guardamos a máscara.
                 */
                this._segmentationMask =
                    results.segmentationMask;


                /*
                 * Guardamos também a imagem original
                 * retornada pelo MediaPipe.
                 */
                this._segmentationImage =
                    results.image;
            }
        );


        console.log(
            'MediaPipe Selfie Segmentation inicializado.'
        );
    }


    // =========================================================
    // INICIA DETECÇÃO
    // =========================================================

    async startDetection(stream) {

        this.video =
            document.createElement('video');


        this.video.srcObject =
            stream;

        this.video.muted = true;

        this.video.autoplay = true;

        this.video.playsInline = true;


        await this.video.play();


        await new Promise((resolve) => {

            if (
                this.video.videoWidth > 0 &&
                this.video.videoHeight > 0
            ) {

                resolve();

                return;
            }


            this.video.onloadedmetadata =
                () => resolve();

        });


        console.log(
            'Câmera:',
            this.video.videoWidth,
            'x',
            this.video.videoHeight
        );


        await this._initSegmentation();


        const vw =
            this.video.videoWidth;

        const vh =
            this.video.videoHeight;


        this._maskCanvas.width = vw;
        this._maskCanvas.height = vh;

        this._personCanvas.width = vw;
        this._personCanvas.height = vh;


        this.active = true;


        this._detectLoop();

        this._segmentationLoop();
    }


    // =========================================================
    // DETECÇÃO FACIAL
    // =========================================================

    async _detectLoop() {

        if (
            !this.active ||
            !this.video
        ) {

            setTimeout(
                () => this._detectLoop(),
                100
            );

            return;
        }


        const now =
            performance.now();


        if (
            now - this._lastDetection <
            this._detectionInterval
        ) {

            setTimeout(
                () => this._detectLoop(),
                30
            );

            return;
        }


        this._lastDetection =
            now;


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
                    detection?.landmarks || null;

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
                'Erro na detecção facial:',
                error
            );
        }


        setTimeout(
            () => this._detectLoop(),
            30
        );
    }


    // =========================================================
    // EXPRESSÕES
    // =========================================================

    _processEmotion(expressions) {

        if (!expressions) {
            return;
        }


        let emotion =
            'neutral';

        let confidence = 0;


        for (
            const [name, value]
            of Object.entries(expressions)
        ) {

            if (value > confidence) {

                confidence =
                    value;

                emotion =
                    name;
            }
        }


        /*
         * Evita mandar a mesma emoção
         * para o áudio a cada frame.
         */
        if (
            emotion === this._lastEmotion
        ) {

            return;
        }


        this._lastEmotion =
            emotion;


        if (this.onEmotionChange) {

            this.onEmotionChange(
                emotion,
                confidence
            );
        }
    }


    // =========================================================
    // SEGMENTAÇÃO
    // =========================================================

    async _segmentationLoop() {

        if (
            !this.active ||
            !this.video ||
            !this._segmentation
        ) {

            setTimeout(
                () => this._segmentationLoop(),
                100
            );

            return;
        }


        const now =
            performance.now();


        if (
            now - this._lastSegmentation <
            this._segmentationInterval
        ) {

            setTimeout(
                () => this._segmentationLoop(),
                30
            );

            return;
        }


        this._lastSegmentation =
            now;


        if (this._segmentationBusy) {

            setTimeout(
                () => this._segmentationLoop(),
                30
            );

            return;
        }


        this._segmentationBusy =
            true;


        try {

            await this._segmentation.send({

                image: this.video

            });

        } catch (error) {

            console.error(
                'Erro na segmentação:',
                error
            );

        } finally {

            this._segmentationBusy =
                false;
        }


        setTimeout(
            () => this._segmentationLoop(),
            30
        );
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
    // DESENHA TUDO
    // =========================================================

    _drawAll() {

        for (
            const [
                id,
                {
                    canvas,
                    videoEl,
                    ctx
                }
            ] of Object.entries(
                this.canvases
            )
        ) {

            if (
                !canvas ||
                !ctx ||
                !videoEl ||
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
             * SEMPRE COMEÇA PRETO
             * =================================================
             */

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

            ctx.restore();


            /*
             * =================================================
             * AINDA NÃO HÁ ROSTO
             * =================================================
             */

            if (!this._faceBox) {

                continue;
            }


            /*
             * =================================================
             * AINDA NÃO HÁ MÁSCARA
             * =================================================
             *
             * IMPORTANTE:
             *
             * Não vamos deixar a câmera preta enquanto
             * o MediaPipe ainda está processando.
             *
             * Mostramos temporariamente a câmera.
             *
             * Assim conseguimos saber se a câmera está viva.
             */

            if (!this._segmentationMask) {

                ctx.drawImage(
                    videoEl,
                    0,
                    0,
                    w,
                    h
                );

                continue;
            }


            /*
             * =================================================
             * SEGMENTAÇÃO
             * =================================================
             */

            this._drawSegmentedHead(
                ctx,
                w,
                h
            );
        }
    }


    // =========================================================
    // DESENHA CABEÇA SEGMENTADA
    // =========================================================

    _drawSegmentedHead(
        ctx,
        w,
        h
    ) {

        if (
            !this.video ||
            !this._faceBox ||
            !this._segmentationMask
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


        /*
         * =================================================
         * REGIÃO DA CABEÇA
         * =================================================
         *
         * O rosto serve somente como referência.
         *
         * Não é uma elipse.
         *
         * A forma final vem da máscara do MediaPipe.
         */

        const headX =
            face.x -
            face.width * 0.85;

        const headY =
            face.y -
            face.height * 1.05;

        const headW =
            face.width * 2.70;

        const headH =
            face.height * 2.60;


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
        // CANVAS DE MÁSCARA
        // =====================================================

        const maskCanvas =
            this._maskCanvas;

        const maskCtx =
            this._maskCtx;


        maskCanvas.width =
            w;

        maskCanvas.height =
            h;


        maskCtx.clearRect(
            0,
            0,
            w,
            h
        );


        /*
         * Desenha a máscara.
         *
         * NÃO existe elipse.
         */
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
        // CANVAS DA PESSOA
        // =====================================================

        const personCanvas =
            this._personCanvas;

        const personCtx =
            this._personCtx;


        personCanvas.width =
            w;

        personCanvas.height =
            h;


        personCtx.clearRect(
            0,
            0,
            w,
            h
        );


        /*
         * Desenha a imagem da câmera.
         */
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
         * =================================================
         * APLICA MÁSCARA
         * =================================================
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
         * =================================================
         * RESULTADO
         * =================================================
         */

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


        ctx.drawImage(
            personCanvas,
            0,
            0,
            w,
            h
        );


        ctx.restore();
    }
}
