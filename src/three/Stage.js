import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Stage {
  constructor(domElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0b14);
    this.scene.fog = new THREE.FogExp2(0x0b0b14, 0.018);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.camera.position.set(14, 11, 18);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping   = true;
    this.controls.dampingFactor   = 0.05;
    this.controls.rotateSpeed     = 0.7;
    this.controls.enablePan       = false;
    this.controls.enableZoom      = true;
    this.controls.minPolarAngle   = Math.PI / 5;
    this.controls.maxPolarAngle   = Math.PI / 2.2;
    this.controls.minDistance     = 4;
    this.controls.maxDistance     = 28;
    this.controls.target.set(0, 2, 0);
    this.controls.update();

    this.controls.addEventListener('start', () => domElement.style.cursor = 'grabbing');
    this.controls.addEventListener('end',   () => domElement.style.cursor = 'auto');

    this._followTarget  = null;
    this._defaultTarget = new THREE.Vector3(0, 2, 0);

    this._setupLights();
  }

  _setupLights() {
    // Dark office night atmosphere
    this.scene.add(new THREE.AmbientLight(0x8888cc, 0.8));

    const key = new THREE.DirectionalLight(0xffeedd, 1.2);
    key.position.set(12, 20, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far  = 80;
    key.shadow.camera.top = key.shadow.camera.right = 15;
    key.shadow.camera.bottom = key.shadow.camera.left = -15;
    key.shadow.bias = -0.0001;
    key.shadow.radius = 3;
    this.scene.add(key);

    this.scene.add(new THREE.HemisphereLight(0x334466, 0x112233, 0.5));

    // Floor accent lights per floor
    const floorColors = [0x4f8ef7, 0xf74faa, 0xf7c94f];
    floorColors.forEach((c, i) => {
      const pt = new THREE.PointLight(c, 0.4, 8);
      pt.position.set(0, i * 3.2 + 0.5, 0);
      this.scene.add(pt);
    });
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setFollowTarget(pos) {
    this._followTarget = pos ? pos.clone() : null;
  }

  update() {
    const lerpTo = this._followTarget
      ? new THREE.Vector3(this._followTarget.x, this._followTarget.y - 1, this._followTarget.z)
      : this._defaultTarget;
    this.controls.target.lerp(lerpTo, 0.05);
    this.controls.update();
  }
}
