export class EmotionController {

    constructor() {
        this.onEmotionChange = null;

        this.active = false;
        this.video = null;

        this.canvases = {};

        // Face detection
        this._faceBox = null;
        this._landmarks = null;

        // Segmentation
        this._segmentation = null;
        this._segmentationMask = null;
        this._segmentationBusy = false;

        // Offscreen canvases
        this._segCanvas = document.createElement('canvas');
        this._segCtx = this._segCanvas.getContext('2d', {
            willReadFrequently: false
        });

        this._outputCanvas = document.createElement('canvas');
        this._outputCtx = this._outputCanvas.getContext('2d', {
            willReadFrequently: false
        });

        // UI modes
        this.showLandmarks = false;
        this.carouselMode = false;

        // Detection timing
        this._lastDetection = 0;
        this._detectionInterval = 100;

        this._lastSegmentation = 0;
        this._segmentationInterval = 80;

        // Start rendering immediately.
        this._renderLoop();
    }


    // =========================================================
    // INICIALIZAÇÃO DA SEGMENTAÇÃO
    // =========================================================

    async _initSegmentation() {

        if (this._segmentation) {
            return;
        }

        if (typeof SelfieSegmentation === 'undefined') {
            throw new Error(
                'MediaPipe SelfieSegmentation não foi carregado.'
            );
        }

        this._segmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
            }
        });

        /*
         * Modelo 1:
         * otimizado para imagens/câmera em formato paisagem.
         *
         * O MediaPipe oferece os modelos general e landscape.
         */
        this._segmentation.setOptions({
            modelSelection: 1
        });

        this._segmentation.onResults((results) => {
            if (!results || !results.segmentationMask) {
                return;
            }

            this._segmentationMask = results.segmentationMask;
        });

        console.log('MediaPipe Selfie Segmentation inicializado.');
    }


    // =========================================================
    // INICIA CÂMERA / DETECÇÃO
    // =========================================================

    async startDetection(stream) {

        this.video = document.createElement('video');

        this.video.srcObject = stream;
        this.video.muted = true;
        this.video.autoplay = true;
        this.video.playsInline = true;

        await this.video.play();

        /*
         * Espera a câmera informar suas dimensões reais.
         */
        await new Promise((resolve) => {

            if (this.video.videoWidth && this.video.videoHeight) {
                resolve();
                return;
            }

            this.video.onloadedmetadata = () => resolve();

        });

        await this._initSegmentation();

        this._segCanvas.width = this.video.videoWidth;
        this._segCanvas.height = this.video.videoHeight;

        this._outputCanvas.width = this.video.videoWidth;
        this._outputCanvas.height = this.video.videoHeight;

        this.active = true;

        this._detectLoop();
        this._segmentationLoop();
    }


    // =========================================================
    // DETECÇÃO DO ROSTO + EXPRESSÃO
    // =========================================================

    async _detectLoop() {

        if (!this.active || !this.video) {
            setTimeout(() => this._detectLoop(), 100);
            return;
        }

        const now = performance.now();

        if (now - this._lastDetection < this._detectionInterval) {
            setTimeout(() => this._detectLoop(), 30);
            return;
        }

        this._lastDetection = now;

        try {

            let detection;

            const options =
                new faceapi.TinyFaceDetectorOptions({
                    inputSize: 416,
                    scoreThreshold: 0.45
                });


            if (this.showLandmarks) {

                detection = await faceapi
                    .detectSingleFace(
                        this.video,
                        options
                    )
                    .withFaceLandmarks(true)
                    .withFaceExpressions();

                this._landmarks =
                    detection?.landmarks || null;

            } else {

                detection = await faceapi
                    .detectSingleFace(
                        this.video,
                        options
                    )
                    .withFaceExpressions();

                this._landmarks = null;
            }


            if (detection) {

                /*
                 * Esta caixa é usada para localizar
                 * a cabeça dentro da máscara.
                 */
                this._faceBox = detection.detection.box;


                /*
                 * Expressão continua funcionando
                 * exatamente como antes.
                 */
                if (this.onEmotionChange) {

                    const expressions =
                        detection.expressions;

                    const emotion =
                        Object.keys(expressions)
                            .reduce((a, b) =>
                                expressions[a] >
                                expressions[b]
                                    ? a
                                    : b
                            );

                    const confidence =
                        expressions[emotion];

                    this.onEmotionChange(
                        emotion,
                        confidence
                    );
                }

            } else {

                this._faceBox = null;
                this._landmarks = null;
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


        const now = performance.now();

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

        this._lastSegmentation = now;


        /*
         * Evita enviar uma nova imagem enquanto
         * o MediaPipe ainda está processando a anterior.
         */
        if (this._segmentationBusy) {

            setTimeout(
                () => this._segmentationLoop(),
                30
            );

            return;
        }


        this._segmentationBusy = true;


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

            this._segmentationBusy = false;
        }


        setTimeout(
            () => this._segmentationLoop(),
            30
        );
    }


    // =========================================================
    // RENDERIZAÇÃO
    // =========================================================

    _renderLoop() {

        this._drawAll();

        requestAnimationFrame(
            () => this._renderLoop()
        );
    }


    // =========================================================
    // REGISTRA OS QUATRO CANVAS
    // =========================================================

    registerCanvas(id, canvas, videoEl) {

        this.canvases[id] = {
            canvas,
            videoEl,
            ctx: canvas.getContext('2d')
        };
    }


    // =========================================================
    // DESENHA A IMAGEM FINAL
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
            ] of Object.entries(this.canvases)
        ) {

            if (
                !canvas ||
                !ctx ||
                !videoEl ||
                videoEl.readyState < 2
            ) {
                continue;
            }


            const w = canvas.width;
            const h = canvas.height;


            /*
             * FUNDO SEMPRE PRETO
             */
            ctx.save();

            ctx.globalCompositeOperation =
                'source-over';

            ctx.fillStyle = '#000000';

            ctx.fillRect(
                0,
                0,
                w,
                h
            );

            ctx.restore();


            /*
             * Sem rosto ou sem máscara:
             * deixa o canvas totalmente preto.
             */
            if (
                !this._faceBox ||
                !this._segmentationMask
            ) {
                continue;
            }


            this._drawSegmentedHead(
                ctx,
                w,
                h
            );


            /*
             * Landmarks continuam opcionais.
             */
            if (
                !this.carouselMode &&
                this.showLandmarks &&
                this._landmarks
            ) {

                this._drawLandmarks(
                    ctx,
                    w,
                    h
                );
            }
        }
    }


    // =========================================================
    // CABEÇA SEGMENTADA
    // =========================================================

    _drawSegmentedHead(ctx, w, h) {

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


        if (!videoW || !videoH) {
            return;
        }


        const face = this._faceBox;


        /*
         * =====================================================
         * REGIÃO DE INTERESSE DA CABEÇA
         * =====================================================
         *
         * O rosto é nossa referência.
         *
         * Não usamos uma elipse.
         * Não desenhamos o fundo.
         *
         * A segmentação decide quais pixels da pessoa
         * realmente aparecem.
         *
         * Esta região inclui:
         *
         * - cabelo
         * - testa
         * - rosto
         * - orelhas
         * - parte superior do pescoço
         *
         * mas exclui o corpo.
         */

        const headX =
            face.x - face.width * 0.85;

        const headY =
            face.y - face.height * 1.05;

        const headWidth =
            face.width * 2.70;

        const headHeight =
            face.height * 2.60;


        /*
         * =====================================================
         * COORDENADAS LIMITADAS À CÂMERA
         * =====================================================
         */

        const sx =
            Math.max(0, headX);

        const sy =
            Math.max(0, headY);

        const ex =
            Math.min(
                videoW,
                headX + headWidth
            );

        const ey =
            Math.min(
                videoH,
                headY + headHeight
            );

        const sw = ex - sx;
        const sh = ey - sy;


        if (sw <= 0 || sh <= 0) {
            return;
        }


        /*
         * =====================================================
         * CANVAS DE SAÍDA
         * =====================================================
         */

        const out =
            this._outputCanvas;

        const outCtx =
            this._outputCtx;


        out.width = w;
        out.height = h;


        /*
         * Tudo começa transparente.
         */
        outCtx.clearRect(
            0,
            0,
            w,
            h
        );


        /*
         * =====================================================
         * DESENHA A MÁSCARA DE SEGMENTAÇÃO
         * =====================================================
         */

        outCtx.save();

        /*
         * A máscara é desenhada apenas na região
         * correspondente à cabeça.
         *
         * O formato final NÃO é elíptico.
         * A silhueta vem dos pixels da segmentação.
         */
        outCtx.beginPath();

        outCtx.rect(
            0,
            0,
            w,
            h
        );

        outCtx.clip();


        /*
         * Desenha a máscara no tamanho final.
         */
        outCtx.drawImage(
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


        /*
         * Mantém somente os pixels da pessoa
         * identificados pela máscara.
         */
        outCtx.globalCompositeOperation =
            'source-in';


        /*
         * Agora desenhamos a imagem original
         * exatamente na mesma posição.
         */
        outCtx.drawImage(
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


        outCtx.restore();


        /*
         * =====================================================
         * ENVIA RESULTADO PARA O HOLOGRAMA
         * =====================================================
         */

        ctx.save();

        ctx.globalCompositeOperation =
            'source-over';

        ctx.drawImage(
            out,
            0,
            0,
            w,
            h
        );

        ctx.restore();
    }


    // =========================================================
    // LANDMARKS
    // =========================================================

    _drawLandmarks(ctx, w, h) {

        if (
            !this._landmarks ||
            !this.video
        ) {
            return;
        }


        /*
         * Os landmarks precisam acompanhar
         * o mesmo recorte da cabeça.
         */

        const face =
            this._faceBox;

        if (!face) return;


        const videoW =
            this.video.videoWidth || w;

        const videoH =
            this.video.videoHeight || h;


        const headX =
            face.x - face.width * 0.85;

        const headY =
            face.y - face.height * 1.05;

        const headWidth =
            face.width * 2.70;

        const headHeight =
            face.height * 2.60;


        const pts =
            this._landmarks.positions;


        ctx.save();

        ctx.fillStyle =
            'rgba(0, 255, 200, 0.85)';

        ctx.strokeStyle =
            'rgba(0, 255, 200, 0.4)';

        ctx.lineWidth = 0.8;


        pts.forEach((p) => {

            const x =
                ((p.x - headX) /
                    headWidth) *
                w;

            const y =
                ((p.y - headY) /
                    headHeight) *
                h;


            if (
                x < 0 ||
                x > w ||
                y < 0 ||
                y > h
            ) {
                return;
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
        });


        ctx.restore();
    }
}
