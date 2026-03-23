import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Stage {
  constructor(rendererDomElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFaFcFb);
    this.scene.fog = new THREE.FogExp2(0xFaFcFb, 0.022);

    // ── Camera ────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.camera.position.set(10, 8, 15);

    // ── OrbitControls — exact same constraints as reference ───
    this.controls = new OrbitControls(this.camera, rendererDomElement);
    this.controls.enableDamping   = true;
    this.controls.dampingFactor   = 0.05;
    this.controls.rotateSpeed     = 0.8;
    this.controls.enablePan       = false;
    this.controls.enableZoom      = true;
    this.controls.minPolarAngle   = Math.PI / 4.5;
    this.controls.maxPolarAngle   = Math.PI / 2.4;
    this.controls.minDistance     = 3;
    this.controls.maxDistance     = 18;
    this.controls.target.set(0, 0.8, 0);
    this.controls.update();

    this.controls.addEventListener('start', () => { rendererDomElement.style.cursor = 'grabbing'; });
    this.controls.addEventListener('end',   () => { rendererDomElement.style.cursor = 'auto'; });

    this._followTarget = null;
    this._defaultTarget = new THREE.Vector3(0, 0.8, 0);

    this._setupLights();
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, Math.PI));

    const dir = new THREE.DirectionalLight(0xffffff, 0.5 * Math.PI);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    dir.shadow.camera.near = 0.1;
    dir.shadow.camera.far  = 100;
    dir.shadow.camera.top = dir.shadow.camera.right = 12;
    dir.shadow.camera.bottom = dir.shadow.camera.left = -12;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.bias   = -0.0001;
    dir.shadow.radius = 2;
    this.scene.add(dir);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb0bec5, 0.4 * Math.PI));
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setFollowTarget(pos) {
    this._followTarget = pos ? pos.clone() : null;
  }

  update() {
    const lerpTarget = this._followTarget
      ? new THREE.Vector3(this._followTarget.x, 0.8, this._followTarget.z)
      : this._defaultTarget;
    this.controls.target.lerp(lerpTarget, 0.06);
    this.controls.update();
  }
}
