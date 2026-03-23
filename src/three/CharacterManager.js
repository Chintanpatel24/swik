import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { SkeletonUtils } from 'three/addons/utils/SkeletonUtils.js';
import { deskPosition, floorY, FLOOR_HEIGHT } from './BuildingManager.js';

const DRACO_PATH = './vendor/draco/';

const STATUS_ANIM = {
  idle:      'Sit_Idle',
  thinking:  'Sit_Work',
  working:   'Sit_Work',
  searching: 'Sit_Work',
  talking:   'Talk',
  done:      'Happy',
  error:     'Sit_Idle',
};

export class CharacterManager {
  constructor(scene) {
    this.scene    = scene;
    this.gltf     = null;
    this.clips    = [];
    this.agents   = [];  // [{agentId, model, mixer, actions, currentAnim, floor, deskIndex}]
    this.isLoaded = false;
  }

  async load() {
    const loader      = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_PATH);
    loader.setDRACOLoader(dracoLoader);

    this.gltf  = await loader.loadAsync('./models/character.glb');
    this.clips = this.gltf.animations;
    this.isLoaded = true;
    return this;
  }

  addAgent(agentId, color, floor, deskIndex) {
    if (!this.isLoaded) return null;

    const model = SkeletonUtils.clone(this.gltf.scene);
    const col   = new THREE.Color(color || '#4f8ef7');

    model.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = child.receiveShadow = true;
      const n = child.name.toLowerCase();
      if (n.includes('cloth') || n.includes('shirt') || n.includes('body') ||
          n.includes('top')   || n.includes('torso') || n.includes('outfit')) {
        child.material = child.material.clone();
        child.material.color.copy(col);
      }
    });

    const pos = deskPosition(floor, deskIndex);
    model.position.copy(pos);
    // Face toward office center
    model.lookAt(new THREE.Vector3(0, pos.y, 0));
    this.scene.add(model);

    const mixer   = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of this.clips) {
      actions[clip.name] = mixer.clipAction(clip);
    }

    const entry = { agentId, model, mixer, actions, currentAnim: null, color, floor, deskIndex };
    this.agents.push(entry);
    this._playAnim(entry, 'Sit_Idle', 0);
    return entry;
  }

  removeAgent(agentId) {
    const i = this.agents.findIndex(a => a.agentId === agentId);
    if (i < 0) return;
    const { model, mixer } = this.agents[i];
    mixer.stopAllAction();
    this.scene.remove(model);
    this._dispose(model);
    this.agents.splice(i, 1);
  }

  setStatus(agentId, status) {
    const entry = this.agents.find(a => a.agentId === agentId);
    if (entry) this._playAnim(entry, STATUS_ANIM[status] || 'Sit_Idle');
  }

  updateColor(agentId, hex) {
    const entry = this.agents.find(a => a.agentId === agentId);
    if (!entry) return;
    entry.color = hex;
    const col = new THREE.Color(hex);
    entry.model.traverse(child => {
      if (!child.isMesh) return;
      const n = child.name.toLowerCase();
      if (n.includes('cloth') || n.includes('shirt') || n.includes('body') ||
          n.includes('top')   || n.includes('torso') || n.includes('outfit')) {
        if (child.material) child.material.color.copy(col);
      }
    });
  }

  /** Reposition agent (e.g., when floor changes) */
  repositionAgent(agentId, floor, deskIndex) {
    const entry = this.agents.find(a => a.agentId === agentId);
    if (!entry) return;
    entry.floor = floor; entry.deskIndex = deskIndex;
    const pos = deskPosition(floor, deskIndex);
    entry.model.position.copy(pos);
    entry.model.lookAt(new THREE.Vector3(0, pos.y, 0));
  }

  update(delta) {
    for (const e of this.agents) e.mixer.update(delta);
  }

  /** World-space head position for bubble projection */
  headPosition(agentId) {
    const entry = this.agents.find(a => a.agentId === agentId);
    if (!entry) return null;
    let head = null;
    entry.model.traverse(c => { if (c.isBone && c.name.toLowerCase().includes('head')) head = c; });
    if (head) { const p = new THREE.Vector3(); head.getWorldPosition(p); return p; }
    return entry.model.position.clone().add(new THREE.Vector3(0, 1.75, 0));
  }

  allIds() { return this.agents.map(a => a.agentId); }

  _playAnim(entry, name, fade = 0.3) {
    if (entry.currentAnim === name) return;
    const key = Object.keys(entry.actions).find(
      k => k === name || k.toLowerCase().includes(name.toLowerCase())
    ) || Object.keys(entry.actions)[0];
    if (!key) return;
    for (const a of Object.values(entry.actions)) if (a.isRunning()) a.fadeOut(fade);
    entry.actions[key].reset().setEffectiveWeight(1).fadeIn(fade).play();
    entry.currentAnim = name;
  }

  _dispose(model) {
    model.traverse(child => {
      if (!child.isMesh) return;
      child.geometry?.dispose();
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => m?.dispose());
    });
  }
}
