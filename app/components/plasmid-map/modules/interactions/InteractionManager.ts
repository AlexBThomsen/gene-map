import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Feature } from '../../../../types/sequence';

interface MeasurementPoint {
  position: THREE.Vector3;
  label: string;
}

interface AnalysisResult {
  type: 'distance' | 'angle' | 'torsion';
  value: number;
  unit: string;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private interactionGroup: THREE.Group;
  private measurementPoints: MeasurementPoint[];
  private selectedObjects: THREE.Object3D[];
  private highlightMaterial: THREE.Material;
  private measurementLines: THREE.Line[];
  private onFeatureClick: ((feature: Feature) => void) | undefined;
  private domElement: HTMLElement;
  private isInteracting: boolean = false;
  private tooltip: HTMLElement;
  private selectedObject: THREE.Mesh | null = null;
  private originalMaterials: Map<THREE.Mesh, THREE.Material> = new Map();

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    controls: OrbitControls,
    onFeatureClick?: (feature: Feature) => void
  ) {
    if (!controls.domElement) {
      throw new Error('Controls must have a valid domElement');
    }

    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.onFeatureClick = onFeatureClick;
    
    this.domElement = controls.domElement;
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.2 }; // Increase hit area for lines
    this.mouse = new THREE.Vector2();
    this.interactionGroup = new THREE.Group();
    this.measurementPoints = [];
    this.selectedObjects = [];
    this.measurementLines = [];
    
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0x444444,
      metalness: 0.5,
      roughness: 0.5,
      transparent: true,
      opacity: 0.8
    });

    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.tooltip.style.color = 'white';
    this.tooltip.style.padding = '8px';
    this.tooltip.style.borderRadius = '4px';
    this.tooltip.style.fontSize = '14px';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.display = 'none';
    this.domElement.parentElement?.appendChild(this.tooltip);

    scene.add(this.interactionGroup);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Use domElement instead of window for better event handling
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('click', this.onClick.bind(this));
    this.domElement.addEventListener('mousedown', () => this.isInteracting = true);
    this.domElement.addEventListener('mouseup', () => this.isInteracting = false);
    this.domElement.addEventListener('mouseleave', () => this.isInteracting = false);
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    // Calculate mouse position in normalized device coordinates
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Don't highlight while dragging
    if (this.isInteracting) return;

    // Update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    // Reset previously highlighted objects
    this.selectedObjects.forEach(obj => {
      if (obj instanceof THREE.Mesh && obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial;
      }
    });
    this.selectedObjects = [];

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      
      // Only highlight if the object is a Mesh and has feature information
      if (intersectedObject instanceof THREE.Mesh && intersectedObject.userData.feature) {
        if (this.selectedObject !== intersectedObject) {
          // Restore previous object's material if exists
          if (this.selectedObject) {
            const originalMaterial = this.originalMaterials.get(this.selectedObject);
            if (originalMaterial) {
              this.selectedObject.material = originalMaterial;
              this.originalMaterials.delete(this.selectedObject);
            }
          }

          // Store original material and apply highlight
          this.originalMaterials.set(intersectedObject, intersectedObject.material);
          intersectedObject.material = this.highlightMaterial;
          this.selectedObject = intersectedObject;
          
          // Show tooltip with feature information
          this.showTooltip(event, intersectedObject.userData.feature);
        }
      }
    } else {
      // Restore material and hide tooltip when no intersection
      if (this.selectedObject) {
        const originalMaterial = this.originalMaterials.get(this.selectedObject);
        if (originalMaterial) {
          this.selectedObject.material = originalMaterial;
          this.originalMaterials.delete(this.selectedObject);
        }
        this.selectedObject = null;
      }
      this.hideTooltip();
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.isInteracting) return;

    if (this.selectedObject?.userData.feature && this.onFeatureClick) {
      this.onFeatureClick(this.selectedObject.userData.feature);
    }

    // Handle measurement point placement
    if (event.ctrlKey || event.metaKey) {
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        this.addMeasurementPoint(intersects[0].point);
      }
    }
  }

  private showTooltip(event: MouseEvent, feature: Feature): void {
    const rect = this.domElement.getBoundingClientRect();
    this.tooltip.style.left = `${event.clientX - rect.left + 10}px`;
    this.tooltip.style.top = `${event.clientY - rect.top + 10}px`;
    this.tooltip.innerHTML = `
      <strong>${feature.name}</strong><br>
      Type: ${feature.type}<br>
      Position: ${feature.start}-${feature.end}
    `;
    this.tooltip.style.display = 'block';
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private onWindowResize(): void {
    // Update tooltip position if needed
    if (this.selectedObject) {
      const event = new MouseEvent('mousemove', {
        clientX: parseFloat(this.tooltip.style.left),
        clientY: parseFloat(this.tooltip.style.top)
      });
      this.onMouseMove(event);
    }
  }

  private addMeasurementPoint(position: THREE.Vector3) {
    const pointGeometry = new THREE.SphereGeometry(0.1);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    point.position.copy(position);

    const label = `P${this.measurementPoints.length + 1}`;
    this.measurementPoints.push({ position, label });
    this.interactionGroup.add(point);

    // Create measurement line if we have two or more points
    if (this.measurementPoints.length >= 2) {
      this.createMeasurementLine();
    }

    // Calculate and display measurements if we have enough points
    if (this.measurementPoints.length >= 2) {
      this.calculateMeasurements();
    }
  }

  private createMeasurementLine() {
    const points = this.measurementPoints.map(p => p.position);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.Line(geometry, material);
    
    this.measurementLines.push(line);
    this.interactionGroup.add(line);
  }

  private calculateMeasurements(): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const points = this.measurementPoints;

    // Calculate distance between points
    if (points.length >= 2) {
      const distance = points[0].position.distanceTo(points[1].position);
      results.push({
        type: 'distance',
        value: distance,
        unit: 'units'
      });
    }

    // Calculate angle between three points
    if (points.length >= 3) {
      const v1 = new THREE.Vector3().subVectors(points[1].position, points[0].position);
      const v2 = new THREE.Vector3().subVectors(points[2].position, points[1].position);
      const angle = v1.angleTo(v2) * (180 / Math.PI);
      results.push({
        type: 'angle',
        value: angle,
        unit: 'degrees'
      });
    }

    // Calculate torsion angle between four points
    if (points.length >= 4) {
      const torsion = this.calculateTorsionAngle(
        points[0].position,
        points[1].position,
        points[2].position,
        points[3].position
      );
      results.push({
        type: 'torsion',
        value: torsion,
        unit: 'degrees'
      });
    }

    return results;
  }

  private calculateTorsionAngle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3): number {
    // Calculate vectors between points
    const b1 = new THREE.Vector3().subVectors(p2, p1);
    const b2 = new THREE.Vector3().subVectors(p3, p2);
    const b3 = new THREE.Vector3().subVectors(p4, p3);

    // Calculate normal vectors of planes
    const n1 = new THREE.Vector3().crossVectors(b1, b2).normalize();
    const n2 = new THREE.Vector3().crossVectors(b2, b3).normalize();

    // Calculate torsion angle
    const x = n1.dot(n2);
    const y = n1.cross(b2.normalize()).dot(n2);
    const torsion = Math.atan2(y, x) * (180 / Math.PI);

    return torsion;
  }

  public clearMeasurements() {
    this.measurementPoints = [];
    this.measurementLines.forEach(line => this.interactionGroup.remove(line));
    this.measurementLines = [];
    
    while (this.interactionGroup.children.length > 0) {
      this.interactionGroup.remove(this.interactionGroup.children[0]);
    }
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('click', this.onClick.bind(this));
    this.domElement.removeEventListener('mousedown', () => this.isInteracting = true);
    this.domElement.removeEventListener('mouseup', () => this.isInteracting = false);
    this.domElement.removeEventListener('mouseleave', () => this.isInteracting = false);
    this.hideTooltip();
    this.clearMeasurements();
    this.tooltip.remove();
  }

  public getInteractionGroup(): THREE.Group {
    return this.interactionGroup;
  }
} 