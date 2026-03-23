import * as THREE from 'three';

export class InputManager {
  constructor(domElement, camera, characterManager, onSelect, onHover) {
    this.dom    = domElement;
    this.camera = camera;
    this.chars  = characterManager;
    this.onSelect = onSelect;
    this.onHover  = onHover;
    this.raycaster = new THREE.Raycaster();

    this._onClick     = this._onClick.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);

    domElement.addEventListener('click',     this._onClick);
    domElement.addEventListener('mousemove', this._onMouseMove);
  }

  _ndcFromEvent(e) {
    const r = this.dom.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width)  *  2 - 1,
      ((e.clientY - r.top)  / r.height) * -2 + 1,
    );
  }

  _hitAgentId(ndc) {
    this.raycaster.setFromCamera(ndc, this.camera);

    // Collect all meshes belonging to characters
    const meshes = [];
    const map    = new Map(); // mesh → agentId
    for (const entry of this.chars.agents) {
      entry.model.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
          map.set(child, entry.agentId);
        }
      });
    }

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return map.get(hits[0].object) ?? null;
  }

  _onClick(e) {
    this.onSelect(this._hitAgentId(this._ndcFromEvent(e)));
  }

  _onMouseMove(e) {
    this.onHover(this._hitAgentId(this._ndcFromEvent(e)));
  }

  dispose() {
    this.dom.removeEventListener('click',     this._onClick);
    this.dom.removeEventListener('mousemove', this._onMouseMove);
  }
}
