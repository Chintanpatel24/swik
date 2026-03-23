import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = './vendor/draco/';

export class WorldManager {
  constructor(scene) {
    this.scene  = scene;
    this.office = null;
  }

  async load(themeHex = '#4f8ef7') {
    const loader      = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_PATH);
    loader.setDRACOLoader(dracoLoader);

    const gltf     = await loader.loadAsync('./models/office.glb');
    this.office    = gltf.scene;
    this.scene.add(this.office);

    const themeColor = new THREE.Color(themeHex);

    this.office.traverse((child) => {
      if (!child.isMesh) return;
      const name = child.name.toLowerCase();

      if (name.includes('navmesh')) {
        child.visible = false;
        return;
      }

      child.receiveShadow = true;
      child.castShadow    = true;

      const old = child.material;
      const baseColor = name.startsWith('colored')
        ? themeColor.clone()
        : (old?.color ? old.color.clone() : new THREE.Color(0xcccccc));

      child.material = new THREE.MeshStandardMaterial({
        color:     baseColor,
        map:       old?.map ?? null,
        roughness: old?.roughness ?? 1,
        metalness: old?.metalness ?? 0.1,
      });
    });

    return this.office;
  }

  updateThemeColor(hex) {
    if (!this.office) return;
    const color = new THREE.Color(hex);
    this.office.traverse((child) => {
      if (child.isMesh && child.name.toLowerCase().startsWith('colored') && child.material?.color) {
        child.material.color.copy(color);
      }
    });
  }

  getOffice() { return this.office; }
}
