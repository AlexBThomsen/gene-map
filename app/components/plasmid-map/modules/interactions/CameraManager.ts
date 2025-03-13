import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface CameraSettings {
  fov: number;
  near: number;
  far: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private defaultSettings: CameraSettings;
  private isAnimating: boolean;
  private currentAnimation: number | null;
  private container: HTMLElement;

  constructor(
    container: HTMLElement,
    renderer: THREE.WebGLRenderer,
    settings: Partial<CameraSettings> = {}
  ) {
    this.container = container;
    this.defaultSettings = {
      fov: 75,
      near: 0.1,
      far: 1000,
      position: new THREE.Vector3(0, 0, 5),
      target: new THREE.Vector3(0, 0, 0),
      ...settings
    };

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      this.defaultSettings.fov,
      container.clientWidth / container.clientHeight,
      this.defaultSettings.near,
      this.defaultSettings.far
    );
    this.camera.position.copy(this.defaultSettings.position);

    // Initialize controls
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.defaultSettings.target);

    this.isAnimating = false;
    this.currentAnimation = null;

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public focusOnPoint(point: THREE.Vector3, duration: number = 1000) {
    if (this.isAnimating) {
      this.cancelAnimation();
    }

    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPosition = point.clone().add(new THREE.Vector3(0, 0, 5));
    const endTarget = point.clone();

    const startTime = performance.now();
    this.isAnimating = true;

    const animate = (currentTime: number) => {
      if (!this.isAnimating) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smooth animation
      const eased = this.easeInOutCubic(progress);

      // Interpolate position and target
      this.camera.position.lerpVectors(startPosition, endPosition, eased);
      this.controls.target.lerpVectors(startTarget, endTarget, eased);
      this.controls.update();

      if (progress < 1) {
        this.currentAnimation = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.currentAnimation = null;
      }
    };

    this.currentAnimation = requestAnimationFrame(animate);
  }

  public rotateAroundPoint(point: THREE.Vector3, angle: number, duration: number = 1000) {
    if (this.isAnimating) {
      this.cancelAnimation();
    }

    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const radius = startPosition.distanceTo(point);
    
    const startTime = performance.now();
    this.isAnimating = true;

    const animate = (currentTime: number) => {
      if (!this.isAnimating) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smooth animation
      const eased = this.easeInOutCubic(progress);
      const currentAngle = angle * eased;

      // Calculate new camera position
      const newPosition = startPosition.clone()
        .sub(point)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), currentAngle)
        .add(point);

      this.camera.position.copy(newPosition);
      this.controls.update();

      if (progress < 1) {
        this.currentAnimation = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.currentAnimation = null;
      }
    };

    this.currentAnimation = requestAnimationFrame(animate);
  }

  public zoomTo(targetFOV: number, duration: number = 1000) {
    if (this.isAnimating) {
      this.cancelAnimation();
    }

    const startFOV = this.camera.fov;
    const startTime = performance.now();
    this.isAnimating = true;

    const animate = (currentTime: number) => {
      if (!this.isAnimating) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smooth animation
      const eased = this.easeInOutCubic(progress);

      // Interpolate FOV
      this.camera.fov = startFOV + (targetFOV - startFOV) * eased;
      this.camera.updateProjectionMatrix();
      this.controls.update();

      if (progress < 1) {
        this.currentAnimation = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.currentAnimation = null;
      }
    };

    this.currentAnimation = requestAnimationFrame(animate);
  }

  public resetView(duration: number = 1000) {
    this.focusOnPoint(this.defaultSettings.target, duration);
    this.zoomTo(this.defaultSettings.fov, duration);
  }

  private cancelAnimation() {
    this.isAnimating = false;
    if (this.currentAnimation !== null) {
      cancelAnimationFrame(this.currentAnimation);
      this.currentAnimation = null;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public update() {
    this.controls.update();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public dispose() {
    this.cancelAnimation();
    this.controls.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
} 