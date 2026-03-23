import * as THREE from 'three';
import { GLTFLoader }      from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }     from 'three/addons/loaders/DRACOLoader.js';
import { SkeletonUtils }   from 'three/addons/utils/SkeletonUtils.js';

const DRACO_PATH = './vendor/draco/';

// ── Desk positions (world-space) ────────────────────────────────────
// Arranged in two rows — matches the office.glb layout
export const DESK_POSITIONS = [
  { x: -4.0, y: 0, z: -1.8, ry: 0 },
  { x: -1.5, y: 0, z: -1.8, ry: 0 },
  { x:  1.5, y: 0, z: -1.8, ry: 0 },
  { x:  4.0, y: 0, z: -1.8, ry: 0 },
  { x: -4.0, y: 0, z:  1.8, ry: Math.PI },
  { x: -1.5, y: 0, z:  1.8, ry: Math.PI },
  { x:  1.5, y: 0, z:  1.8, ry: Math.PI },
  { x:  4.0, y: 0, z:  1.8, ry: Math.PI },
];

// ── Animation clip names (from character.glb) ───────────────────────
const ANIM = {
  IDLE:      'Idle',
  WALK:      'Walk',
  TALK:      'Talk',
  LISTEN:    'Listen',
  SIT_DOWN:  'Sit_Down',
  SIT_IDLE:  'Sit_Idle',
  SIT_WORK:  'Sit_Work',
  WAVE:      'Wave',
  HAPPY:     'Happy',
  SAD:       'Sad',
};

// ── Status → animation mapping ───────────────────────────────────────
const STATUS_TO_ANIM = {
  idle:      ANIM.SIT_IDLE,
  thinking:  ANIM.SIT_WORK,
  working:   ANIM.SIT_WORK,
  searching: ANIM.SIT_WORK,
  talking:   ANIM.TALK,
  done:      ANIM.HAPPY,
  error:     ANIM.SIT_IDLE,
};

export class CharacterManager {
  constructor(scene) {
    this.scene    = scene;
    this.gltf     = null;   // loaded GLTF
    this.clips    = [];     // AnimationClip[]
    this.agents   = [];     // [{agentId, model, mixer, actions, currentAnim, deskIndex}]
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
    console.log('[CharacterManager] Loaded. Clips:', this.clips.map(c => c.name));
    return this;
  }

  /** Spawn a character for an agent. deskIndex = 0..7 */
  addAgent(agentId, agentColor, deskIndex) {
    if (!this.isLoaded) { console.warn('CharacterManager not loaded'); return null; }

    // SkeletonUtils.clone properly deep-clones skinned meshes + skeletons
    const model = SkeletonUtils.clone(this.gltf.scene);

    // Apply color to clothing meshes
    const color = new THREE.Color(agentColor || '#4f8ef7');
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow    = true;
      child.receiveShadow = true;

      // Tint any mesh whose name suggests clothing
      const n = child.name.toLowerCase();
      if (n.includes('cloth') || n.includes('shirt') || n.includes('top') ||
          n.includes('jacket') || n.includes('body') || n.includes('torso') || n.includes('outfit')) {
        child.material = child.material.clone();
        child.material.color.copy(color);
      }
    });

    // Position at desk
    const desk = DESK_POSITIONS[deskIndex % DESK_POSITIONS.length];
    model.position.set(desk.x, desk.y, desk.z);
    model.rotation.y = desk.ry;

    this.scene.add(model);

    // Build AnimationMixer + actions map
    const mixer   = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of this.clips) {
      actions[clip.name] = mixer.clipAction(clip);
    }

    const entry = { agentId, model, mixer, actions, currentAnim: null, color: agentColor, deskIndex };
    this.agents.push(entry);

    // Start sitting
    this._playAnim(entry, ANIM.SIT_IDLE, 0);
    return entry;
  }

  removeAgent(agentId) {
    const idx = this.agents.findIndex(a => a.agentId === agentId);
    if (idx < 0) return;
    const { model, mixer } = this.agents[idx];
    mixer.stopAllAction();
    this.scene.remove(model);
    this._disposeModel(model);
    this.agents.splice(idx, 1);
  }

  setAgentStatus(agentId, status) {
    const entry = this.agents.find(a => a.agentId === agentId);
    if (!entry) return;
    const anim = STATUS_TO_ANIM[status] || ANIM.SIT_IDLE;
    this._playAnim(entry, anim);
  }

  updateAgentColor(agentId, hex) {
    const entry = this.agents.find(a => a.agentId === agentId);
    if (!entry) return;
    entry.color = hex;
    const color = new THREE.Color(hex);
    entry.model.traverse((child) => {
      if (!child.isMesh) return;
      const n = child.name.toLowerCase();
      if (n.includes('cloth') || n.includes('shirt') || n.includes('top') ||
          n.includes('jacket') || n.includes('body') || n.includes('torso') || n.includes('outfit')) {
        if (child.material) child.material.color.copy(color);
      }
    });
  }

  update(delta) {
    for (const entry of this.agents) entry.mixer.update(delta);
  }

  /** World-space position of character's head (for bubble projection) */
  getHeadPosition(agentId) {
    const entry = this.agents.find(a => a.agentId === agentId);
    if (!entry) return null;
    // Walk the skeleton to find the head bone if available, else estimate
    let head = null;
    entry.model.traverse((child) => {
      if (child.isBone && child.name.toLowerCase().includes('head')) head = child;
    });
    if (head) {
      const pos = new THREE.Vector3();
      head.getWorldPosition(pos);
      return pos;
    }
    // Fallback: model origin + approximate height
    return entry.model.position.clone().add(new THREE.Vector3(0, 1.75, 0));
  }

  getAllAgentIds() { return this.agents.map(a => a.agentId); }

  // ── Private ────────────────────────────────────────────────────────
  _playAnim(entry, name, fadeIn = 0.35) {
    if (entry.currentAnim === name) return;
    // Find closest matching clip (case-insensitive, partial match)
    const key = Object.keys(entry.actions).find(
      k => k === name || k.toLowerCase().includes(name.toLowerCase())
    ) || Object.keys(entry.actions)[0];

    if (!key) return;

    // Fade out all running
    for (const action of Object.values(entry.actions)) {
      if (action.isRunning()) action.fadeOut(fadeIn);
    }

    entry.actions[key].reset().setEffectiveWeight(1).fadeIn(fadeIn).play();
    entry.currentAnim = name;
  }

  _disposeModel(model) {
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => m?.dispose());
    });
  }
}
