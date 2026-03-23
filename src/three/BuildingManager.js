import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = './vendor/draco/';

// Floor layout constants
export const FLOOR_HEIGHT  = 3.2;   // world units per floor
export const FLOOR_WIDTH   = 12;
export const FLOOR_DEPTH   = 10;
export const FLOOR_OFFSET  = 0.0;   // y of floor 1 ground

// Desk positions per floor (up to 4 desks per floor)
export const DESK_SPOTS = [
  { x: -3.5, z: -1.5 },
  { x: -1.0, z: -1.5 },
  { x:  1.5, z: -1.5 },
  { x:  4.0, z: -1.5 },
];

export function floorY(floorNum) {
  return FLOOR_OFFSET + (floorNum - 1) * FLOOR_HEIGHT;
}

export function deskPosition(floorNum, deskIndex) {
  const spot = DESK_SPOTS[deskIndex % DESK_SPOTS.length];
  return new THREE.Vector3(spot.x, floorY(floorNum), spot.z);
}

export class BuildingManager {
  constructor(scene) {
    this.scene  = scene;
    this.office = null;
    this.floors = [];
  }

  async load(floorAccentColors = ['#4f8ef7', '#f74faa', '#f7c94f']) {
    // Try loading office.glb first; fall back to procedural building
    try {
      await this._loadGLBOffice(floorAccentColors);
    } catch {
      this._buildProceduralBuilding(floorAccentColors);
    }
  }

  async _loadGLBOffice(accentColors) {
    const loader      = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_PATH);
    loader.setDRACOLoader(dracoLoader);

    const gltf   = await loader.loadAsync('./models/office.glb');
    this.office  = gltf.scene;
    this.scene.add(this.office);

    const color = new THREE.Color(accentColors[0]);
    this.office.traverse(child => {
      if (!child.isMesh) return;
      if (child.name.toLowerCase().includes('navmesh')) { child.visible = false; return; }
      child.receiveShadow = true;
      child.castShadow    = true;
      const old = child.material;
      child.material = new THREE.MeshStandardMaterial({
        color:     child.name.toLowerCase().startsWith('colored') ? color : (old?.color ?? new THREE.Color(0xcccccc)),
        map:       old?.map ?? null,
        roughness: 1,
        metalness: 0.15,
      });
    });

    // Stack 3 copies for 3 floors
    for (let fl = 2; fl <= 3; fl++) {
      const copy = gltf.scene.clone(true);
      copy.position.y = (fl - 1) * FLOOR_HEIGHT;
      const fc = new THREE.Color(accentColors[fl - 1] || accentColors[0]);
      copy.traverse(child => {
        if (child.isMesh && child.name.toLowerCase().startsWith('colored')) {
          child.material = child.material.clone();
          child.material.color.copy(fc);
        }
      });
      this.scene.add(copy);
    }
  }

  _buildProceduralBuilding(accentColors) {
    const mats = accentColors.map(c => new THREE.MeshStandardMaterial({
      color: new THREE.Color(c), roughness: 0.7, metalness: 0.3,
    }));
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9, metalness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.8 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.8 });

    for (let fl = 1; fl <= 3; fl++) {
      const y      = floorY(fl);
      const accent = mats[fl - 1];

      // Floor slab
      const floorGeom = new THREE.BoxGeometry(FLOOR_WIDTH, 0.15, FLOOR_DEPTH);
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.position.set(0, y - 0.075, 0);
      floorMesh.receiveShadow = true;
      this.scene.add(floorMesh);

      // Ceiling
      const ceilMesh = new THREE.Mesh(floorGeom, floorMat);
      ceilMesh.position.set(0, y + FLOOR_HEIGHT - 0.075, 0);
      this.scene.add(ceilMesh);

      // Back wall
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_WIDTH, FLOOR_HEIGHT, 0.2), wallMat);
      backWall.position.set(0, y + FLOOR_HEIGHT / 2, -FLOOR_DEPTH / 2);
      backWall.castShadow = backWall.receiveShadow = true;
      this.scene.add(backWall);

      // Glass front
      const glass = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_WIDTH, FLOOR_HEIGHT, 0.1), glassMat);
      glass.position.set(0, y + FLOOR_HEIGHT / 2, FLOOR_DEPTH / 2);
      this.scene.add(glass);

      // Left / right walls
      for (const sx of [-1, 1]) {
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, FLOOR_HEIGHT, FLOOR_DEPTH), wallMat);
        sideWall.position.set(sx * (FLOOR_WIDTH / 2), y + FLOOR_HEIGHT / 2, 0);
        sideWall.castShadow = sideWall.receiveShadow = true;
        this.scene.add(sideWall);
      }

      // Floor accent strip
      const strip = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_WIDTH, 0.08, 0.4), accent);
      strip.position.set(0, y + 0.04, FLOOR_DEPTH / 2 - 0.2);
      this.scene.add(strip);

      // Floor label plane
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = accentColors[fl - 1];
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`FLOOR ${fl}`, 20, 46);
      const tex   = new THREE.CanvasTexture(canvas);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      label.position.set(-FLOOR_WIDTH / 2 + 1.5, y + 2.8, -FLOOR_DEPTH / 2 + 0.05);
      this.scene.add(label);

      // Desk boxes
      DESK_SPOTS.forEach((spot, di) => {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.7), new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.8 }));
        desk.position.set(spot.x, y + 0.78, spot.z);
        desk.receiveShadow = true;
        this.scene.add(desk);

        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.04), new THREE.MeshStandardMaterial({ color: 0x0a0a1a, emissive: accent.color, emissiveIntensity: 0.3 }));
        monitor.position.set(spot.x, y + 1.09, spot.z - 0.2);
        this.scene.add(monitor);
      });
    }

    // Building exterior columns
    [[-FLOOR_WIDTH / 2, -FLOOR_DEPTH / 2], [FLOOR_WIDTH / 2, -FLOOR_DEPTH / 2],
     [-FLOOR_WIDTH / 2, FLOOR_DEPTH / 2],  [FLOOR_WIDTH / 2, FLOOR_DEPTH / 2]].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, FLOOR_HEIGHT * 3 + 0.3, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.6, metalness: 0.5 }));
      col.position.set(cx, FLOOR_HEIGHT * 1.5, cz);
      col.castShadow = true;
      this.scene.add(col);
    });
  }

  updateFloorColor(floorNum, hex) {
    if (!this.office) return;
    const color = new THREE.Color(hex);
    this.scene.traverse(child => {
      if (child.isMesh && child.name?.toLowerCase().startsWith('colored') &&
          child.position.y >= floorY(floorNum) - 0.1 &&
          child.position.y <  floorY(floorNum) + FLOOR_HEIGHT) {
        child.material.color.copy(color);
      }
    });
  }
}
