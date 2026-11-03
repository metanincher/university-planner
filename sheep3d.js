
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

    //loader.load("./models/sheep.glb", (gltf) => {
    loader.load("./models/sheep_with_back.glb", (gltf) => {

        // ★ sheepをグローバルスコープの変数に格納
        sheep = gltf.scene;

        // モデルの大きさを確認
        const box = new THREE.Box3().setFromObject(sheep);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        console.log("羊のサイズ:", size);
        console.log("羊の中心:", center);

        // ★ モデルの中心を原点に移動する
        // 回転軸を羊の中心にするため
        const pivot = new THREE.Group();

        sheep.position.sub(center);
        pivot.position.copy(center);

        pivot.add(sheep);

        // 回転操作用のオブジェクト
        scene.add(pivot);

        // pivotを羊の操作対象にする
        sheep = pivot;

        // カメラ位置調整
        const maxDim = Math.max(size.x, size.y, size.z);

        const fov = camera.fov * (Math.PI / 180);

        let cameraDistance =
            maxDim / (2 * Math.tan(fov / 2));

        //cameraDistance *= 1.4;
        //cameraDistance *= 1.1;   // for only sheep
        cameraDistance *= 0.2;   // for only sheep

        camera.position.set(
            //center.x,
            //center.y + maxDim * 0.475,
            center.x + 20.0,
            center.y - maxDim * 0.1,
            center.z + cameraDistance
        );

        camera.lookAt(
            //center.x,
            //center.y + maxDim * 0.475,
            center.x + 20.0,
            center.y - maxDim * 0.1,
            center.z
        );

        // ダンスアニメーション
        if (gltf.animations.length > 0) {

            //mixer = new THREE.AnimationMixer(sheep.children[0]);
            //const action = mixer.clipAction( gltf.animations[0]);
            //action.play();
            
            mixer = new THREE.AnimationMixer(sheep);
            gltf.animations.forEach(clip => {
              mixer.clipAction(clip).play();
            })

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
