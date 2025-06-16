
import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRButton } from 'three/addons/webxr/XRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // <--- nuevo import
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';




let container;
let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let raycaster;

const intersected = [];
let controls;

let video1, video2, video3;
let meshVideo, meshVideo2, meshVideo3;


var floor, planeWater;
const group = new THREE.Group();

var alturaMesa = 3; // Altura de la mesa


init();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);

    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(0, 6, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(4096, 4096);
    scene.add(light);

    // Cargar HDR y aplicarlo como fondo y entorno
    new RGBELoader()
        .setPath('./textures/equirectangular/') // Cambia esto a la ruta donde tienes tu HDR
        .load('kloofendal_48d_partly_cloudy_puresky_2k.hdr', function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture; // Fondo
            scene.environment = texture; // Luz ambiental realista
        });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // Altura del QR, posición inicial centrada


    controls = new OrbitControls(camera, container);
    controls.target.set(0, 1.6, 0);
    controls.update();

    const loaderModel = new GLTFLoader();


    // === Piso ===
    const textureLoader = new THREE.TextureLoader();

    const pisoColor = textureLoader.load('./scenary_images/Piso_Color.png');
    pisoColor.wrapS = pisoColor.wrapT = THREE.RepeatWrapping;
    pisoColor.repeat.set(1, 1);

    const pisoEmisivo = textureLoader.load('./scenary_images/Piso_Color_1.png');
    pisoEmisivo.wrapS = pisoEmisivo.wrapT = THREE.RepeatWrapping;
    pisoEmisivo.repeat.set(1, 1);

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB, // Azul cielo como color base
        map: pisoColor,
        emissiveMap: pisoEmisivo,
        emissive: new THREE.Color(0xffffff), // Color de la emisión (blanco para no teñir)
        roughness: 1.0,
        metalness: 0.0,
        transparent: true
    });
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    floor.receiveShadow = true;
    floor.position.y = -1.6; // Ajusta la posición Y del plano

    scene.add(floor);

    // === MESA ===
    var alturaMesa = 4; // Altura de la mesa
    const crateTexture = textureLoader.load('./textures/crate.gif');

    const geometrycube = new THREE.CylinderGeometry(0.5, 0.5, (alturaMesa - 0.2), 32);
    const materialcube = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cube = new THREE.Mesh(geometrycube, materialcube);
    cube.position.set(0, -1, -1);
    cube.castShadow = true;
    scene.add(cube);

    // Cargar el modelo GLTF del BONGO
    const loaderModelBongo = new GLTFLoader();

    loaderModelBongo.load(
        './models/gltf/Bongo/Bongo.gltf', // Ruta al archivo .glb o .gltf
        function (gltf) {
            const model = gltf.scene;
            model.position.set(0, alturaMesa / 2, 0);     // Cambia la posición si lo deseas
            var scale = 0.008; // Escala del modelo
            model.scale.set(scale, scale, scale);        // Ajusta el tamaño del modelo
            model.rotation.y = Math.PI / 4;      // Rotación opcional
            cube.add(model);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% cargado');
        },
        function (error) {
            console.error('Error al cargar el modelo', error);
        }
    );

    // === Mesa efecto ===
    const geometryWater = new THREE.PlaneGeometry(1.5, 1.5);

    const WatertextureLoader = new THREE.TextureLoader();
    const waterTexture = WatertextureLoader.load('./scenary_images/Piso_Color.png');
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(1, 1);


    const waterEmisivo = WatertextureLoader.load('./scenary_images/Piso_Color.png');
    waterEmisivo.wrapS = waterEmisivo.wrapT = THREE.RepeatWrapping;
    waterEmisivo.repeat.set(1, 1);

    const materialWater = new THREE.MeshStandardMaterial({
        map: waterTexture,
        emissiveMap: waterEmisivo,
        color: 0x87CEEB, // Azul cielo como color base
        roughness: 1.0,
        metalness: 0.0,
        transparent: true,
        side: THREE.DoubleSide
    });

    planeWater = new THREE.Mesh(geometryWater, materialWater);
    cube.add(planeWater);
    planeWater.rotation.x = - Math.PI / 2; // Rotar el plano para que esté horizontal
    planeWater.position.set(0, (alturaMesa / 2) + 0.05, 0); // Ajusta la posición Y del plano

    // === Infografia === 
    // Crear un objeto vacío
    const objetoInfografia_1 = new THREE.Object3D();
    scene.add(objetoInfografia_1);

    const aspectRatioInfografia = 1080 / 1080;
    const heightInfografia = [2.5, 2, 2, 2]; // altura arbitraria en unidades del mundo 3D


    // Cargar la textura (foto)
    const posiciones = [7, 6, 6, 6]; // ejemplo en eje X

    posiciones.forEach((zPos, i) => {
        // Crear la geometría del panel
        const widthInfografia = heightInfografia[i] * aspectRatioInfografia; // Ajusta el ancho según la altura y el aspecto

        const geometryInfografia = new THREE.PlaneGeometry(widthInfografia * 1.5, heightInfografia[i] * 1.5);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(`./Graficos/Graficos_ (${i + 1}).png`, function (texture) {
            const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
            const panel = new THREE.Mesh(geometryInfografia, material);
            panel.position.set(0, 2, zPos + 2); // ajusta X aquí
            panel.rotation.y = -Math.PI; // Gira el panel hacia el centro
            objetoInfografia_1.add(panel);
        });
    });

    // === lOGO === 
    // Crear un objeto vacío
    const objetolOGO_1 = new THREE.Object3D();
    scene.add(objetolOGO_1);

    const aspectRatiolOGO = 1166 / 1820;
    const heightlOGO = 2; // altura arbitraria en unidades del mundo 3D


    const widthlOGO = heightlOGO * aspectRatiolOGO; // Ajusta el ancho según la altura y el aspecto

    const geometrylOGO = new THREE.PlaneGeometry(widthlOGO * 1.5, heightlOGO * 1.5);

    textureLoader.load(`./scenary_images/COLORSobre Claros.png`, function (texture) {
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const panelLOGO = new THREE.Mesh(geometrylOGO, material);
        panelLOGO.position.set(0, 2, -6); // ajusta X aquí
        objetolOGO_1.add(panelLOGO);
    });





    // === FOTOS ===

    // Crear un objeto vacío para contener las fotos
    const objetoFotos_1 = new THREE.Object3D();
    scene.add(objetoFotos_1);

    const objetoFotos_2 = new THREE.Object3D();
    scene.add(objetoFotos_2);

    // Proporciones de la imagen: 1920x2740 => aspecto = 1920 / 2740
    const aspectRatio = 1920 / 2740;
    const height = 3; // altura arbitraria en unidades del mundo 3D
    const width = height * aspectRatio;

    // Crear la geometría del panel
    const geometryFoto = new THREE.PlaneGeometry(width, height);

    // Cargar la textura (foto)
    const textureLoaderFoto_1 = new THREE.TextureLoader();
    textureLoaderFoto_1.load('./fotos/Foto_ (1).png', function (texture) {
        const materialFoto_1 = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const panelFoto_1 = new THREE.Mesh(geometryFoto, materialFoto_1);
        panelFoto_1.position.set(-1.6, 1.5, 6); // Ajusta la posición Y del panel
        objetoFotos_1.add(panelFoto_1);
    });

    // Cargar la textura (foto)
    const textureLoaderFoto_2 = new THREE.TextureLoader();
    textureLoaderFoto_2.load('./fotos/Foto_ (2).png', function (texture) {
        const materialFoto_2 = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const panelFoto_2 = new THREE.Mesh(geometryFoto, materialFoto_2);
        panelFoto_2.position.set(0, 1.9, 6.5); // Ajusta la posición Y del panel
        objetoFotos_1.add(panelFoto_2);
    });

    // Cargar la textura (foto)
    const textureLoaderFoto_3 = new THREE.TextureLoader();
    textureLoaderFoto_3.load('./fotos/Foto_ (3).png', function (texture) {
        const materialFoto_3 = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const panelFoto_3 = new THREE.Mesh(geometryFoto, materialFoto_3);
        panelFoto_3.position.set(1.6, 2.3, 7); // Ajusta la posición Y del panel
        objetoFotos_1.add(panelFoto_3);
    });

    // Cargar la textura (foto)
    const textureLoaderFoto_4 = new THREE.TextureLoader();
    textureLoaderFoto_4.load('./fotos/Foto_ (4).png', function (texture) {
        const materialFoto_4 = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const panelFoto_4 = new THREE.Mesh(geometryFoto, materialFoto_4);
        panelFoto_4.position.set(-1.6, 1.5, 6); // Ajusta la posición Y del panel
        objetoFotos_2.add(panelFoto_4);
    });

    // Cargar la textura (foto)
    const textureLoaderFoto_5 = new THREE.TextureLoader();
    textureLoaderFoto_5.load('./fotos/Foto_ (5).png', function (texture) {
        const materialFoto_5 = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const panelFoto_5 = new THREE.Mesh(geometryFoto, materialFoto_5);
        panelFoto_5.position.set(0, 1.9, 6.5); // Ajusta la posición Y del panel
        objetoFotos_2.add(panelFoto_5);
    });

    // Cargar la textura (foto)
    const textureLoaderFoto_6 = new THREE.TextureLoader();
    textureLoaderFoto_6.load('./fotos/Foto_ (6).png', function (texture) {
        const materialFoto_6 = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const panelFoto_6 = new THREE.Mesh(geometryFoto, materialFoto_6);
        panelFoto_6.position.set(1.6, 2.3, 7); // Ajusta la posición Y del panel
        objetoFotos_2.add(panelFoto_6);
    });


    objetoFotos_2.rotation.y = (1 / 2) * Math.PI; // Gira el objeto 180 grados en el eje Y
    objetoFotos_1.rotation.y = (3 / 2) * Math.PI; // Gira el objeto 180 grados en el eje Y


    // === Geometrias random ===
    scene.add(group);

    const geometries = [
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.ConeGeometry(0.2, 0.2, 64),
        new THREE.CylinderGeometry(0.2, 0.2, 0.2, 64),
        new THREE.IcosahedronGeometry(0.2, 8),
        new THREE.TorusGeometry(0.2, 0.04, 64, 32)
    ];

    for (let i = 0; i < 50; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const material = new THREE.MeshStandardMaterial({
            color: 1 * 0x294371,
            roughness: 0.7,
            metalness: 0.0,
            wireframe: true,  // Aplicamos wireframe
            transparent: true,
            opacity: 0.5
        });

        const object = new THREE.Mesh(geometry, material);

        // Reintentar hasta que esté fuera del radio de 1 unidad del centro
        let pos;
        do {
            pos = new THREE.Vector3(
                Math.random() * 30 - 15,
                Math.random() * 2,
                Math.random() * 30 - 15
            );
        } while (pos.length() < 8); // Comprobamos la distancia al origen

        object.position.copy(pos);

        object.rotation.x = Math.random() * 2 * Math.PI;
        object.rotation.y = Math.random() * 2 * Math.PI;
        object.rotation.z = Math.random() * 2 * Math.PI;

        object.scale.setScalar(Math.random() + 0.5);

        object.castShadow = true;
        object.receiveShadow = true;

        group.add(object);
    }





    // === VIDEOS ===
    const objetoVideo_1 = new THREE.Object3D();
    scene.add(objetoVideo_1);

    const objetoVideo_2 = new THREE.Object3D();
    scene.add(objetoVideo_2);

    const objetoVideo_3 = new THREE.Object3D();
    scene.add(objetoVideo_3);

    video1 = document.createElement('video');
    video1.src = './Videos/AR_Bongo.mp4';
    video1.crossOrigin = 'anonymous';
    video1.loop = true;
    video1.muted = true;
    video1.pause();

    const textureVideo1 = new THREE.VideoTexture(video1);
    const materialVideo1 = new THREE.MeshBasicMaterial({ map: textureVideo1 });
    const geometryVideo = new THREE.PlaneGeometry(4, 2.25);
    meshVideo = new THREE.Mesh(geometryVideo, materialVideo1);
    meshVideo.rotation.y = -Math.PI / 3; // Gira el plano hacia el centro
    meshVideo.position.set(6, 1.5, -6);
    objetoVideo_1.add(meshVideo);

    video2 = document.createElement('video');
    video2.src = './Videos/Test1.mp4';
    video2.crossOrigin = 'anonymous';
    video2.loop = true;
    video2.muted = true;
    video2.pause();

    const textureVideo2 = new THREE.VideoTexture(video2);
    const materialVideo2 = new THREE.MeshBasicMaterial({ map: textureVideo2 });
    meshVideo2 = new THREE.Mesh(geometryVideo, materialVideo2);
    meshVideo2.position.set(0, 1.5, 6);
    meshVideo2.rotation.y = Math.PI;
    // objetoVideo_2.add(meshVideo2);


    video3 = document.createElement('video');
    video3.src = './Videos/VideoBinacional.mp4';
    video3.crossOrigin = 'anonymous';
    video3.loop = true;
    video3.muted = true;
    video3.pause();

    const textureVideo3 = new THREE.VideoTexture(video3);
    const materialVideo3 = new THREE.MeshBasicMaterial({ map: textureVideo3 });
    meshVideo3 = new THREE.Mesh(geometryVideo, materialVideo3);
    meshVideo3.position.set(-6, 1.5, -6);
    meshVideo3.rotation.y = (1 * Math.PI) / 3; // Gira el plano hacia el centro
    objetoVideo_3.add(meshVideo3);

    // Añadir un OutLiner a los videos
    var OutLinerVideoGeometri = new THREE.PlaneGeometry(4, 2.25);
    var OutLinerVideoMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    var OutLinerVideo = new THREE.Mesh(OutLinerVideoGeometri, OutLinerVideoMaterial);
    OutLinerVideo.position.set(0, 0, -0.1); // Ajusta la posición Z del OutLiner
    OutLinerVideo.scale.set(1.03, 1.03, 1.03); // Escala del OutLiner
    meshVideo.add(OutLinerVideo);

    var OutLinerVideo2 = new THREE.Mesh(OutLinerVideoGeometri, OutLinerVideoMaterial);
    OutLinerVideo2.position.set(0, 0, -0.1); // Ajusta la posición Z del OutLiner
    OutLinerVideo.scale.set(1.03, 1.03, 1.03); // Escala del OutLiner
    meshVideo2.add(OutLinerVideo2);

    var OutLinerVideo3 = new THREE.Mesh(OutLinerVideoGeometri, OutLinerVideoMaterial);
    OutLinerVideo3.position.set(0, 0, -0.1); // Ajusta la posición Z del OutLiner
    OutLinerVideo3.scale.set(1.03, 1.03, 1.03); // Escala del OutLiner
    meshVideo3.add(OutLinerVideo3);

    document.addEventListener('click', () => {
        video1.play().catch(() => { });
        // video2.play().catch(() => { });
        video3.play().catch(() => { });
        video1.pause();
        video2.pause();
        video3.pause();
    });

    // === REPRODUCIR VIDEO SEGÚN LA MIRADA ===
    document.addEventListener('click', playVideoInView);

    // === RENDERER Y XR ===
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    document.body.appendChild(XRButton.createButton(renderer));
    // Escuchar el clic en el botón XR
    const xrButton = XRButton.createButton(renderer);
    document.body.appendChild(xrButton);

    xrButton.addEventListener('click', () => {
        scene.background = null; // Quita el fondo
        console.log('Fondo eliminado');
    });

    // === CONTROLLERS ===
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', playVideoInView);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', playVideoInView);
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);



    window.addEventListener('resize', onWindowResize);
}

function playVideoInView() {
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Vectores hacia los tres videos
    const toVideo1 = new THREE.Vector3().subVectors(meshVideo.position, camera.position).normalize();
    const toVideo2 = new THREE.Vector3().subVectors(meshVideo2.position, camera.position).normalize();
    const toVideo3 = new THREE.Vector3().subVectors(meshVideo3.position, camera.position).normalize();

    // Productos punto para cada uno
    const dot1 = cameraDirection.dot(toVideo1);
    const dot2 = cameraDirection.dot(toVideo2);
    const dot3 = cameraDirection.dot(toVideo3);

    // Umbral para considerar "en vista"
    const threshold = 0.95;

    // Determina cuál video está más en el centro de la vista
    if (dot1 > threshold && dot1 > dot2 && dot1 > dot3) {
        video1.muted = false;
        video1.play();
        video2.pause(); video2.muted = true;
        video3.pause(); video3.muted = true;
    } else if (dot2 > threshold && dot2 > dot1 && dot2 > dot3) {
        video2.muted = false;
        //  video2.play();
        video1.pause(); video1.muted = true;
        video3.pause(); video3.muted = true;
    } else if (dot3 > threshold && dot3 > dot1 && dot3 > dot2) {
        video3.muted = false;
        video3.play();
        video1.pause(); video1.muted = true;
        video2.pause(); video2.muted = true;
    } else {
        // Si no se mira directamente ninguno, los pausamos todos
        video1.pause(); video1.muted = true;
        video2.pause(); video2.muted = true;
        video3.pause(); video3.muted = true;
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {

    group.rotation.y += 0.002; // Rotar el grupo de objetos
    floor.rotation.z += 0.002; // Rotar el plano de agua
    planeWater.rotation.z += 0.0005; // Rotar el plano de agua
    renderer.render(scene, camera);

}
