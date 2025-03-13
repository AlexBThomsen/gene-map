import * as THREE from 'three';
import type { SequenceFeature } from "@/app/lib/dna/types";

export class LabelManager {
  private labelGroup: THREE.Group;
  private radius: number;
  private sequenceLength: number;
  private labels: Map<string, HTMLDivElement>;
  private container: HTMLDivElement;
  private features: Map<string, SequenceFeature>;

  constructor(container: HTMLDivElement, sequenceLength: number, radius: number = 2) {
    this.container = container;
    this.labelGroup = new THREE.Group();
    this.radius = radius;
    this.sequenceLength = sequenceLength;
    this.labels = new Map();
    this.features = new Map();
  }

  public addFeatureLabel(feature: SequenceFeature, camera: THREE.PerspectiveCamera) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'feature-label';
    labelDiv.style.position = 'absolute';
    labelDiv.style.color = '#ffffff';
    labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    labelDiv.style.padding = '2px 5px';
    labelDiv.style.borderRadius = '3px';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.textContent = feature.name;

    this.container.appendChild(labelDiv);
    this.labels.set(feature.id, labelDiv);
    this.features.set(feature.id, feature);

    this.updateLabelPosition(feature, labelDiv, camera);
  }

  public updateLabelPosition(feature: SequenceFeature, label: HTMLDivElement, camera: THREE.PerspectiveCamera) {
    const midpoint = (feature.start + feature.end) / 2;
    const angle = (midpoint / this.sequenceLength) * Math.PI * 2;
    
    const position = new THREE.Vector3(
      Math.cos(angle) * (this.radius + 0.3),
      Math.sin(angle) * (this.radius + 0.3),
      0
    );

    // Project 3D position to 2D screen coordinates
    const screenPosition = position.clone().project(camera);
    
    const x = (screenPosition.x * 0.5 + 0.5) * this.container.clientWidth;
    const y = (-screenPosition.y * 0.5 + 0.5) * this.container.clientHeight;

    label.style.transform = `translate(-50%, -50%)`;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  }

  public updateAllLabels(camera: THREE.PerspectiveCamera) {
    this.labels.forEach((label, featureId) => {
      const feature = this.features.get(featureId);
      if (feature) {
        this.updateLabelPosition(feature, label, camera);
      }
    });
  }

  public clear() {
    this.labels.forEach(label => {
      label.remove();
    });
    this.labels.clear();
    this.features.clear();
  }

  public dispose() {
    this.clear();
  }
} 