
import * as THREE from "three";

import { GLTFLoader } from
    "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("sheep-stage");

let mixer;
let renderer;
let camera;
let scene;

// ★ 追加：羊を外から操作できるようにする
let sheep;

let initialized = false;

// ★ ドラッグ操作用
let isDragging = false;
let previousMouseX = 0;
let rotationVelocity = 0;

const rotationSpeed = 0.008;
const friction = 0.95;


export function initSheep() {

    if (initialized) {
        console.log("羊は初期化済みです");
        return;
    }

    initialized = true;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        35,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );

    camera.position.set(0, 4, 12);
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    container.appendChild(renderer.domElement);

    // 照明
    const light = new THREE.DirectionalLight(
        0xffffff,
        3
    );

    light.position.set(3, 5, 5);
    scene.add(light);

    scene.add(
        new THREE.AmbientLight(0xffffff, 1.5)
    );

    // GLB読み込み
    const loader = new GLTFLoader();
    
    
    loader.load("./models/sheep.glb", (gltf) => {
    
        const model = gltf.scene;
    
        // モデルのワールド座標行列を更新
        model.updateMatrixWorld(true);
    
        // モデル全体のBounding Boxを取得
        const box = new THREE.Box3().setFromObject(model);
    
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
    
        console.log("羊のサイズ:", size);
        console.log("羊の中心:", center);
    
        // 回転専用グループ
        const rotationGroup = new THREE.Group();
    
        // モデル位置調整専用グループ
        const offsetGroup = new THREE.Group();
    
        // モデルの中心を原点に合わせる
        offsetGroup.position.copy(center).negate();
    
        // グループを階層化
        rotationGroup.add(offsetGroup);
        offsetGroup.add(model);
    
        // 回転軸を元の中心位置に配置
        rotationGroup.position.copy(center);
    
        // シーンに追加
        scene.add(rotationGroup);
    
        // ドラッグ操作対象
        sheep = rotationGroup;
    
    
        // カメラ位置調整
        const maxDim = Math.max(size.x, size.y, size.z);
    
        const fov = camera.fov * (Math.PI / 180);
    
        let cameraDistance =
            maxDim / (2 * Math.tan(fov / 2));
    
        cameraDistance *= 1.4;
    
        camera.position.set(
            center.x,
            center.y + maxDim * 0.49,
            center.z + cameraDistance
        );
    
        camera.lookAt(
            center.x,
            center.y + maxDim * 0.49,
            center.z
        );
    
    
        // ダンスアニメーション
        if (gltf.animations.length > 0) {
    
            mixer = new THREE.AnimationMixer(model);
    
            const action = mixer.clipAction(
                gltf.animations[0]
            );
    
            action.play();
        }
    
    });


    // ★ ドラッグ開始
    renderer.domElement.addEventListener(
        "pointerdown",
        (event) => {

            isDragging = true;

            previousMouseX = event.clientX;

            rotationVelocity = 0;

            renderer.domElement.setPointerCapture(
                event.pointerId
            );
        }
    );


    // ★ ドラッグ中
    renderer.domElement.addEventListener(
        "pointermove",
        (event) => {

            if (!isDragging || !sheep) return;

            const deltaX =
                event.clientX - previousMouseX;

            const rotation = deltaX * rotationSpeed;

            sheep.rotation.y += rotation;

            rotationVelocity = rotation;

            previousMouseX = event.clientX;
        }
    );


    // ★ ドラッグ終了
    renderer.domElement.addEventListener(
        "pointerup",
        () => {

            isDragging = false;

        }
    );

    renderer.domElement.addEventListener(
        "pointercancel",
        () => {

            isDragging = false;

        }
    );


    // アニメーション更新
    const clock = new THREE.Clock();

    function animate() {

        requestAnimationFrame(animate);

        if (mixer) {
            mixer.update(clock.getDelta());
        }

        // ★ 慣性回転
        if (!isDragging && sheep) {

            sheep.rotation.y += rotationVelocity;

            rotationVelocity *= friction;

            if (Math.abs(rotationVelocity) < 0.0001) {
                rotationVelocity = 0;
            }
        }

        renderer.render(scene, camera);
    }

    animate();


    // 画面サイズ変更対応
    window.addEventListener("resize", () => {

        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

    });

}
