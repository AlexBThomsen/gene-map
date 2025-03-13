import * as THREE from 'three';
import type { SequenceFeature } from "@/app/lib/dna/types";

export class DNARenderer {
  private plasmidGroup: THREE.Group;
  private radius: number;
  private sequenceLength: number;
  private featureMeshes: Map<string, THREE.Object3D>;
  private featureColors: Map<string, number>;

  constructor(sequenceLength: number, radius: number = 2) {
    this.plasmidGroup = new THREE.Group();
    this.radius = radius;
    this.sequenceLength = sequenceLength;
    this.featureMeshes = new Map();
    this.featureColors = new Map();
  }

  public createPlasmidBackbone(): THREE.Group {
    const material = new THREE.LineBasicMaterial({ color: 0x808080 });
    const points: THREE.Vector3[] = [];
    
    // Create circular backbone
    for (let i = 0; i <= 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      const x = Math.cos(angle) * this.radius;
      const y = Math.sin(angle) * this.radius;
      points.push(new THREE.Vector3(x, y, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const backbone = new THREE.Line(geometry, material);
    this.plasmidGroup.add(backbone);

    // Add tick marks every 1000 bp
    this.addTickMarks();

    return this.plasmidGroup;
  }

  private addTickMarks() {
    const tickMaterial = new THREE.LineBasicMaterial({ color: 0x404040 });
    const tickLength = 0.2;

    for (let pos = 0; pos < this.sequenceLength; pos += 1000) {
      const angle = (pos / this.sequenceLength) * Math.PI * 2;
      const innerX = Math.cos(angle) * this.radius;
      const innerY = Math.sin(angle) * this.radius;
      const outerX = Math.cos(angle) * (this.radius + tickLength);
      const outerY = Math.sin(angle) * (this.radius + tickLength);

      const points = [
        new THREE.Vector3(innerX, innerY, 0),
        new THREE.Vector3(outerX, outerY, 0)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const tick = new THREE.Line(geometry, tickMaterial);
      this.plasmidGroup.add(tick);
    }
  }

  public addFeature(feature: SequenceFeature): THREE.Object3D {
    const startAngle = (feature.start / this.sequenceLength) * Math.PI * 2;
    const endAngle = (feature.end / this.sequenceLength) * Math.PI * 2;

    const curve = new THREE.EllipseCurve(
      0, 0,
      this.radius, this.radius,
      startAngle, endAngle,
      false,
      0
    );

    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const color = this.getFeatureColor(feature.type);
    
    const material = new THREE.LineBasicMaterial({
      color,
      linewidth: 2,
      transparent: true,
      opacity: 1.0
    });

    const featureMesh = new THREE.Line(geometry, material);
    this.plasmidGroup.add(featureMesh);
    this.featureMeshes.set(feature.id, featureMesh);
    this.featureColors.set(feature.id, color);
    return featureMesh;
  }

  public highlightFeature(feature: SequenceFeature) {
    // Reset all features to their original appearance
    this.featureMeshes.forEach((object, featureId) => {
      if (object instanceof THREE.Line) {
        const material = object.material as THREE.LineBasicMaterial;
        material.opacity = 0.5;
        material.needsUpdate = true;
      }
    });

    // Highlight the selected feature
    const selectedObject = this.featureMeshes.get(feature.id);
    if (selectedObject instanceof THREE.Line) {
      const material = selectedObject.material as THREE.LineBasicMaterial;
      material.opacity = 1.0;
      material.needsUpdate = true;

      // Bring the selected feature to the front
      this.plasmidGroup.remove(selectedObject);
      this.plasmidGroup.add(selectedObject);
    }
  }

  private getFeatureColor(featureType: string): number {
    const colorMap: { [key: string]: number } = {
      'CDS': 0x00ff00,
      'promoter': 0xff0000,
      'terminator': 0x0000ff,
      'origin': 0xff00ff,
      'misc_feature': 0xffff00
    };

    return colorMap[featureType] || 0x808080;
  }

  public clear() {
    while(this.plasmidGroup.children.length > 0) {
      const object = this.plasmidGroup.children[0];
      this.plasmidGroup.remove(object);
    }
    this.featureMeshes.clear();
    this.featureColors.clear();
  }

  public getGroup(): THREE.Group {
    return this.plasmidGroup;
  }
} 