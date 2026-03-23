import * as THREE from 'three';
import { Stage }          from './Stage.js';
import { BuildingManager } from './BuildingManager.js';
import { CharacterManager } from './CharacterManager.js';

export class SceneManager {
  constructor(container, callbacks = {}) {
    this.container  = container;
    this.cbs        = callbacks;
    this.isDisposed = false;
    this.clock      = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace   = THREE.SRGBColorSpace;
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';

    this.stage    = new Stage(this.renderer.domElement);
    this.building = new BuildingManager(this.stage.scene);
    this.chars    = new CharacterManager(this.stage.scene);

    // Raycaster for click/hover
    this.raycaster = new THREE.Raycaster();
    this._onClick     = this._onClick.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    container.addEventListener('click',     this._onClick);
    container.addEventListener('mousemove', this._onMouseMove);

    this.resizeObs = new ResizeObserver(() => this._onResize());
    this.resizeObs.observe(container);
    this._onResize();

    this._init();
  }

  async _init() {
    try {
      await Promise.all([
        this.building.load(['#4f8ef7', '#f74faa', '#f7c94f']),
        this.chars.load(),
      ]);
    } catch (e) {
      console.error('[SceneManager] load error:', e);
    }
    if (this.isDisposed) return;
    this.renderer.setAnimationLoop(() => this._tick());
    this.cbs.onLoaded?.();
  }

  _tick() {
    if (this.isDisposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.chars.update(delta);
    this.stage.update();
    this.renderer.render(this.stage.scene, this.stage.camera);
    this._pushBubbles();
  }

  _pushBubbles() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    const positions = {};
    for (const id of this.chars.allIds()) {
      const world = this.chars.headPosition(id);
      if (!world) continue;
      const ndc = world.clone().project(this.stage.camera);
      if (ndc.z > 1) continue;
      positions[id] = { x: (ndc.x * .5 + .5) * w, y: (-ndc.y * .5 + .5) * h };
    }
    this.cbs.onBubblePositions?.(positions);
  }

  _ndcFromEvent(e) {
    const r = this.container.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width)  *  2 - 1,
      ((e.clientY - r.top)  / r.height) * -2 + 1,
    );
  }

  _hitAgentId(ndc) {
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    const meshes = []; const map = new Map();
    for (const entry of this.chars.agents) {
      entry.model.traverse(c => { if (c.isMesh) { meshes.push(c); map.set(c, entry.agentId); } });
    }
    const hits = this.raycaster.intersectObjects(meshes, false);
    return hits.length ? map.get(hits[0].object) ?? null : null;
  }

  _onClick(e)     { this.cbs.onSelect?.(this._hitAgentId(this._ndcFromEvent(e))); }
  _onMouseMove(e) { this.cbs.onHover?.(this._hitAgentId(this._ndcFromEvent(e))); }

  _onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.stage.resize(w, h);
  }

  // ── Public API ────────────────────────────────────────────────
  addAgent(id, color, floor, deskIndex) {
    if (this.chars.isLoaded) this.chars.addAgent(id, color, floor, deskIndex);
  }
  removeAgent(id)         { this.chars.removeAgent(id); }
  setStatus(id, status)   { this.chars.setStatus(id, status); }
  updateColor(id, hex)    { this.chars.updateColor(id, hex); }
  reposition(id, fl, di)  { this.chars.repositionAgent(id, fl, di); }
  focusAgent(id)          { const p = this.chars.headPosition(id); if (p) this.stage.setFollowTarget(p); }
  clearFocus()            { this.stage.setFollowTarget(null); }

  dispose() {
    this.isDisposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObs.disconnect();
    this.container.removeEventListener('click',     this._onClick);
    this.container.removeEventListener('mousemove', this._onMouseMove);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
