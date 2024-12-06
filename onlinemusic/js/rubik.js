class RubiksCube {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        this.camera.position.set(4, 4, 5);
        this.camera.lookAt(0, 0, 0);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.8;
        this.controls.enablePan = false;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.cubelets = [];
        this.rotationAxis = null;
        this.isRotating = false;
        this.selectedFace = null;
        this.moveCount = 0;
        this.startTime = null;
        
        this.dragStartPoint = new THREE.Vector2();
        this.dragEndPoint = new THREE.Vector2();
        this.rotationSpeed = 0.5;
        
        window.scramble = this.scramble.bind(this);
        window.reset = this.reset.bind(this);
        
        this.init();
    }

    init() {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        this.camera.position.set(4, 4, 5);
        this.camera.lookAt(0, 0, 0);

        this.scene.background = new THREE.Color(0x121212);

        this.setupEnvironment();

        this.createCube();

        this.addControls();

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.8;
        this.controls.enablePan = false;

        this.animate();

        this.createStats();
    }

    setupEnvironment() {
        const bgTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/cube/Park2/negz.jpg');
        this.scene.background = bgTexture;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight1.position.set(10, 20, 10);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-10, -20, -10);

        this.scene.add(directionalLight1);
        this.scene.add(directionalLight2);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }

    createStats() {
        this.statsDiv = document.createElement('div');
        this.statsDiv.className = 'stats';
        this.statsDiv.innerHTML = `
            <div>步数: <span id="moveCount">0</span></div>
            <div>用时: <span id="timer">00:00</span></div>
        `;
        document.body.appendChild(this.statsDiv);
        
        this.startTimer();
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    createCube() {
        const colors = {
            front: 0xff0000,    // 红
            back: 0xff8c00,     // 橙
            top: 0xffffff,      // 白
            bottom: 0xffd700,   // 黄
            right: 0x00ff00,    // 绿
            left: 0x0000ff      // 蓝
        };

        const createMaterial = (color) => {
            return new THREE.MeshPhongMaterial({
                color: color,
                shininess: 50,
                specular: 0x444444,
                emissive: 0x111111,
                flatShading: false,
            });
        };

        const textureLoader = new THREE.TextureLoader();
        const bumpMap = textureLoader.load('https://threejs.org/examples/textures/brick_bump.jpg');
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95, 1, 1, 1);
                    const materials = [
                        createMaterial(x === 1 ? colors.right : 0x282828),
                        createMaterial(x === -1 ? colors.left : 0x282828),
                        createMaterial(y === 1 ? colors.top : 0x282828),
                        createMaterial(y === -1 ? colors.bottom : 0x282828),
                        createMaterial(z === 1 ? colors.front : 0x282828),
                        createMaterial(z === -1 ? colors.back : 0x282828)
                    ];

                    materials.forEach(material => {
                        material.bumpMap = bumpMap;
                        material.bumpScale = 0.01;
                    });

                    const cubelet = new THREE.Mesh(geometry, materials);
                    cubelet.position.set(x, y, z);
                    cubelet.castShadow = true;
                    cubelet.receiveShadow = true;

                    const edgesGeometry = new THREE.EdgesGeometry(geometry);
                    const edgesMaterial = new THREE.LineBasicMaterial({ 
                        color: 0x000000, 
                        linewidth: 2,
                        opacity: 0.5,
                        transparent: true
                    });
                    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
                    cubelet.add(edges);

                    this.scene.add(cubelet);
                    this.cubelets.push(cubelet);
                }
            }
        }
    }

    addControls() {
        let isDragging = false;
        let startPoint = new THREE.Vector2();
        let currentPoint = new THREE.Vector2();
        let selectedCubelet = null;
        let selectedFace = null;
        let dragDirection = null;

        const getFaceNormal = (face) => {
            const normals = [
                new THREE.Vector3(1, 0, 0),   // right
                new THREE.Vector3(-1, 0, 0),  // left
                new THREE.Vector3(0, 1, 0),   // top
                new THREE.Vector3(0, -1, 0),  // bottom
                new THREE.Vector3(0, 0, 1),   // front
                new THREE.Vector3(0, 0, -1)   // back
            ];
            return normals[Math.floor(face / 2)];
        };

        const getMousePosition = (event, element) => {
            const rect = element.getBoundingClientRect();
            return {
                x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((event.clientY - rect.top) / rect.height) * 2 + 1
            };
        };

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (this.isRotating) return;

            const mousePos = getMousePosition(e, this.renderer.domElement);
            startPoint.set(mousePos.x, mousePos.y);

            this.raycaster.setFromCamera(startPoint, this.camera);
            const intersects = this.raycaster.intersectObjects(this.cubelets);

            if (intersects.length > 0) {
                isDragging = true;
                selectedCubelet = intersects[0].object;
                selectedFace = Math.floor(intersects[0].faceIndex / 2);
                this.controls.enabled = false;

                const material = selectedCubelet.material[selectedFace];
                material.emissive.setHex(0x666666);
            }
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging || !selectedCubelet || this.isRotating) return;

            const mousePos = getMousePosition(e, this.renderer.domElement);
            currentPoint.set(mousePos.x, mousePos.y);

            const deltaX = currentPoint.x - startPoint.x;
            const deltaY = currentPoint.y - startPoint.y;
            const delta = new THREE.Vector2(deltaX, deltaY);

            if (delta.length() > 0.1) {
                const normal = getFaceNormal(selectedFace);
                const axis = this.determineRotationAxis(normal, delta);

                if (axis) {
                    const material = selectedCubelet.material[selectedFace];
                    material.emissive.setHex(0x111111);

                    const layer = Math.round(selectedCubelet.position[axis.name]);
                    const angle = Math.PI / 2 * Math.sign(axis.direction);
                    
                    this.rotateFace(
                        new THREE.Vector3().setComponent(['x', 'y', 'z'].indexOf(axis.name), 1),
                        layer,
                        angle,
                        () => {
                            isDragging = false;
                            this.controls.enabled = true;
                            selectedCubelet = null;
                            selectedFace = null;
                        }
                    );
                }
            }
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            if (selectedCubelet && selectedFace !== null) {
                const material = selectedCubelet.material[selectedFace];
                material.emissive.setHex(0x111111);
            }
            isDragging = false;
            selectedCubelet = null;
            selectedFace = null;
            this.controls.enabled = true;
        });

        this.renderer.domElement.addEventListener('mouseleave', () => {
            if (selectedCubelet && selectedFace !== null) {
                const material = selectedCubelet.material[selectedFace];
                material.emissive.setHex(0x111111);
            }
            isDragging = false;
            selectedCubelet = null;
            selectedFace = null;
            this.controls.enabled = true;
        });

        this.renderer.domElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.renderer.domElement.dispatchEvent(mouseEvent);
        });

        this.renderer.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.renderer.domElement.dispatchEvent(mouseEvent);
        });

        this.renderer.domElement.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup');
            this.renderer.domElement.dispatchEvent(mouseEvent);
        });
    }

    determineRotationAxis(normal, delta) {
        const threshold = 0.1;
        const absX = Math.abs(delta.x);
        const absY = Math.abs(delta.y);

        if (Math.max(absX, absY) < threshold) return null;

        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        const upDirection = Math.abs(cameraDirection.y) > 0.9;

        if (normal.x !== 0) {
            return absY > absX ? 
                { name: 'y', direction: -delta.y * normal.x } :
                { name: 'z', direction: delta.x * normal.x };
        }
        if (normal.y !== 0) {
            return absX > absY ?
                { name: 'x', direction: -delta.x * normal.y } :
                { name: 'z', direction: -delta.y * normal.y };
        }
        if (normal.z !== 0) {
            return absY > absX ?
                { name: 'y', direction: delta.y * normal.z } :
                { name: 'x', direction: -delta.x * normal.z };
        }
        return null;
    }

    checkIntersection() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubelets);
        
        if (intersects.length > 0) {
            const face = Math.floor(intersects[0].faceIndex / 2);
            const cubelet = intersects[0].object;
            this.rotateFaceFromIntersect(cubelet, face);
        }
    }

    rotateFaceFromIntersect(cubelet, face) {
        const axes = ['x', 'y', 'z'];
        const axis = new THREE.Vector3();
        axis[axes[Math.floor(face / 2)]] = 1;
        
        const layer = Math.round(cubelet.position[axes[Math.floor(face / 2)]]);
        this.rotateFace(axis, layer, Math.PI / 2);
    }

    rotateFace(axis, layer, angle, callback = null) {
        if (this.isRotating) return;
        this.isRotating = true;
        this.moveCount++;
        document.getElementById('moveCount').textContent = this.moveCount;

        const ANIMATION_DURATION = 300;
        const startTime = Date.now();
        
        const rotationGroup = new THREE.Group();
        const rotatingCubelets = [];
        
        this.cubelets.forEach(cubelet => {
            const pos = cubelet.position.clone();
            const axisName = ['x', 'y', 'z'][axis.toArray().indexOf(1)];
            if (Math.round(pos[axisName]) === layer) {
                rotationGroup.attach(cubelet);
                rotatingCubelets.push(cubelet);
            }
        });
        
        this.scene.add(rotationGroup);
        
        const animate = () => {
            const now = Date.now();
            const progress = (now - startTime) / ANIMATION_DURATION;
            
            if (progress >= 1) {
                rotatingCubelets.forEach(cubelet => {
                    rotationGroup.remove(cubelet);
                    this.scene.add(cubelet);
                    
                    cubelet.position.applyAxisAngle(axis, angle);
                    cubelet.rotateOnWorldAxis(axis, angle);
                });
                
                this.scene.remove(rotationGroup);
                this.isRotating = false;
                if (callback) callback();
                return;
            }

            const currentAngle = angle * Math.min(progress, 1);
            rotationGroup.setRotationFromAxisAngle(axis, currentAngle);
            
            requestAnimationFrame(animate);
        };

        animate();
    }

    checkSolved() {
        // 检查魔方是否已解决
        // 实现魔方解法判断逻辑
    }

    scramble() {
        if (this.isRotating) return;
        
        const moves = 20;
        const axes = ['x', 'y', 'z'];
        const layers = [-1, 0, 1];
        const angles = [Math.PI/2, -Math.PI/2];
        let moveCount = 0;
        
        const moveSequence = [];
        for (let i = 0; i < moves; i++) {
            const randomAxis = axes[Math.floor(Math.random() * 3)];
            const axis = new THREE.Vector3();
            axis[randomAxis] = 1;
            const layer = layers[Math.floor(Math.random() * 3)];
            const angle = angles[Math.floor(Math.random() * 2)];
            moveSequence.push({ axis, layer, angle });
        }

        const executeMove = () => {
            if (moveCount >= moveSequence.length) {
                this.isRotating = false;
                this.startTime = Date.now();
                this.moveCount = 0;
                document.getElementById('moveCount').textContent = '0';
                return;
            }

            const move = moveSequence[moveCount];
            this.rotateFace(move.axis, move.layer, move.angle, () => {
                moveCount++;
                setTimeout(executeMove, 300);
            });
        };

        executeMove();
    }

    reset() {
        this.scene.remove(...this.cubelets);
        this.cubelets = [];
        this.createCube();
        this.moveCount = 0;
        this.startTime = Date.now();
        document.getElementById('moveCount').textContent = '0';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cube = new RubiksCube();
});

window.addEventListener('resize', () => {
    if (window.cube) {
        window.cube.camera.aspect = window.innerWidth / window.innerHeight;
        window.cube.camera.updateProjectionMatrix();
        window.cube.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}); 