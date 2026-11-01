
import * as THREE from "three";

import { GLTFLoader } from
    "three/addons/loaders/GLTFLoader.js";


const container = document.getElementById("sheep-stage");

let mixer;
let renderer;
let camera;
let scene;

export function initSheep() {

    scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(
    	35,
    	container.clientWidth / container.clientHeight,
    	0.1,
    	1000
	);

	camera.position.set(0, 4, 12);
	camera.lookAt(0, 1, 0);


    //camera = new THREE.PerspectiveCamera(
    //    35,
    //    container.clientWidth / container.clientHeight,
    //    0.1,
    //    100
    //);

	//camera.position.set(0, 3, 10);
	//camera.lookAt(0, 1.5, 0);
    //camera.position.set(0, 2, 7);
    //camera.lookAt(0, 1, 0);

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

    	const sheep = gltf.scene;

    	// モデルの大きさを確認
    	const box = new THREE.Box3().setFromObject(sheep);
    	const size = box.getSize(new THREE.Vector3());
    	const center = box.getCenter(new THREE.Vector3());

    	console.log("羊のサイズ:", size);
    	console.log("羊の中心:", center);

    	scene.add(sheep);

    	if (gltf.animations.length > 0) {

    		mixer = new THREE.AnimationMixer(sheep);

    	    const action = mixer.clipAction(gltf.animations[0]);

    	    action.play();

    	}

	});


 //   loader.load( "./models/sheep.glb", (gltf) => {

 //           const sheep = gltf.scene;

 //           scene.add(sheep);

 //           console.log("羊を読み込みました！");
 //           console.log("アニメーション:", gltf.animations);

 //           // アニメーション再生
 //           if (gltf.animations.length > 0) {

 //               mixer = new THREE.AnimationMixer(sheep);

 //               const action = mixer.clipAction( gltf.animations[0]);

 //               action.play();

 //           }

 //       },

 //       undefined,

 //       (error) => {
 //           console.error("羊の読み込みエラー:", error);
 //       }
 //   );

    // アニメーション更新
    const clock = new THREE.Clock();

    function animate() {

        requestAnimationFrame(animate);

        if (mixer) {
            mixer.update(clock.getDelta());
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
