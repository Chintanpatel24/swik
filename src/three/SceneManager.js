import * as THREE from 'three';
import { Stage }            from './Stage.js';
import { WorldManager }     from './WorldManager.js';
import { CharacterManager } from './CharacterManager.js';
import { InputManager }     from './InputManager.js';

export class SceneManager {
  constructor(container, callbacks = {}) {
    this.container   = container;
    this.callbacks   = callbacks;   // { onSelectAgent, onHoverAgent, onScreenPositionsUpdate, onLoaded }
    this.isDisposed  = false;
    this.clock       = new THREE.Clock();

    // ── Renderer ────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace   = THREE.SRGBColorSpace;
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';

    // ── Subsystems ───────────────────────────────────────────────
    this.stage = new Stage(this.renderer.domElement);
    this.world = new WorldManager(this.stage.scene);
    this.chars = new CharacterManager(this.stage.scene);
    this.input = null;

    // ── Resize observer ──────────────────────────────────────────
    this._boundResize = () => this._onResize();
    this.resizeObs    = new ResizeObserver(this._boundResize);
    this.resizeObs.observe(container);
    this._onResize();

    this._init();
  }

  async _init() {
    try {
      await Promise.all([this.world.load(), this.chars.load()]);
    } catch (e) {
      console.error('[SceneManager] Load error:', e);
    }
    if (this.isDisposed) return;

    // Input — clicks/hovers; callbacks read from this.callbacks so never stale
    this.input = new InputManager(
      this.renderer.domElement,
      this.stage.camera,
      this.chars,
      (agentId) => this.callbacks.onSelectAgent?.(agentId),
      (agentId) => this.callbacks.onHoverAgent?.(agentId),
    );

    this.renderer.setAnimationLoop(() => this._animate());
    this.callbacks.onLoaded?.();
  }

  _animate() {
    if (this.isDisposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.05); // cap at 50ms

    this.chars.update(delta);
    this.stage.update();
    this.renderer.render(this.stage.scene, this.stage.camera);

    this._pushScreenPositions();
  }

  _pushScreenPositions() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;

    const positions = {};
    for (const agentId of this.chars.getAllAgentIds()) {
      const world = this.chars.getHeadPosition(agentId);
      if (!world) continue;
      const ndc = world.clone().project(this.stage.camera);
      // Clip anything behind or far outside view
      if (ndc.z > 1) continue;
      positions[agentId] = {
        x: ( ndc.x * 0.5 + 0.5) * w,
        y: (-ndc.y * 0.5 + 0.5) * h,
      };
    }
    this.callbacks.onScreenPositionsUpdate?.(positions);
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.stage.resize(w, h);
  }

  // ── Public API ───────────────────────────────────────────────

  /** Spawn a 3D character for an agent. Call once when agent added. */
  addAgent(agentId, agentColor, deskIndex) {
    if (this.chars.isLoaded) {
      this.chars.addAgent(agentId, agentColor, deskIndex);
    }
  }

  removeAgent(agentId)            { this.chars.removeAgent(agentId); }
  setAgentStatus(agentId, status) { this.chars.setAgentStatus(agentId, status); }
  updateAgentColor(agentId, hex)  { this.chars.updateAgentColor(agentId, hex); }
  updateTheme(hex)                { this.world.updateThemeColor(hex); }

  focusAgent(agentId) {
    const pos = this.chars.getHeadPosition(agentId);
    if (pos) this.stage.setFollowTarget(pos);
  }
  clearFocus() { this.stage.setFollowTarget(null); }

  dispose() {
    this.isDisposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObs.disconnect();
    this.input?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
