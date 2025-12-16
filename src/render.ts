import * as THREE from 'three';

export class Renderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public onUpdate: (() => void)[] = [];
  private container: HTMLElement;
  private animationId: number | null = null;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element with id '${containerId}' not found.`);
    }
    this.container = element;

    // Initialize Scene
    this.scene = new THREE.Scene();

    // Initialize Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.z = 5;

    // Initialize Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Handle Resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Start Loop
    this.start();
  }

  private onWindowResize() {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    // Run update callbacks
    this.onUpdate.forEach(callback => callback());
    
    this.renderer.render(this.scene, this.camera);
  }

  public start() {
    if (!this.animationId) {
      this.animate();
    }
  }

  public stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
