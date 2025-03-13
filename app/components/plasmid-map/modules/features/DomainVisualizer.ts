import * as THREE from 'three';
import type { SequenceFeature } from "@/app/lib/dna/types";

interface ProteinDomain {
  start: number;
  end: number;
  type: 'binding' | 'regulatory' | 'transcription' | 'structural';
  protein?: string;
  affinity?: number;
}

interface RNAStructure {
  start: number;
  end: number;
  type: 'stem-loop' | 'pseudoknot' | 'bulge';
  stability?: number;
}

export class DomainVisualizer {
  private domainGroup: THREE.Group;
  private radius: number;
  private sequenceLength: number;
  private domains: Map<string, THREE.Object3D>;
  private rnaStructures: Map<string, THREE.Object3D>;
  private materials: Map<string, THREE.Material>;

  constructor(sequenceLength: number, radius: number = 2) {
    this.domainGroup = new THREE.Group();
    this.radius = radius;
    this.sequenceLength = sequenceLength;
    this.domains = new Map();
    this.rnaStructures = new Map();
    this.materials = new Map();
  }

  public addProteinDomain(
    domain: ProteinDomain,
    feature: SequenceFeature,
    material?: THREE.Material
  ): THREE.Object3D {
    const startAngle = (domain.start / this.sequenceLength) * Math.PI * 2;
    const endAngle = (domain.end / this.sequenceLength) * Math.PI * 2;
    
    let geometry: THREE.BufferGeometry;
    let domainMaterial: THREE.Material;

    switch (domain.type) {
      case 'binding':
        geometry = this.createBindingSiteGeometry(startAngle, endAngle);
        domainMaterial = material || new THREE.MeshStandardMaterial({
          color: 0x00ff00,
          metalness: 0.5,
          roughness: 0.5,
          transparent: true,
          opacity: 0.7
        });
        break;

      case 'regulatory':
        geometry = this.createRegulatoryDomainGeometry(startAngle, endAngle);
        domainMaterial = material || new THREE.MeshStandardMaterial({
          color: 0xff0000,
          metalness: 0.3,
          roughness: 0.7,
          transparent: true,
          opacity: 0.6
        });
        break;

      case 'transcription':
        geometry = this.createTranscriptionDomainGeometry(startAngle, endAngle);
        domainMaterial = material || new THREE.MeshStandardMaterial({
          color: 0x0000ff,
          metalness: 0.4,
          roughness: 0.6,
          transparent: true,
          opacity: 0.8
        });
        break;

      default:
        geometry = this.createStructuralDomainGeometry(startAngle, endAngle);
        domainMaterial = material || new THREE.MeshStandardMaterial({
          color: 0xffff00,
          metalness: 0.2,
          roughness: 0.8,
          transparent: true,
          opacity: 0.5
        });
    }

    const mesh = new THREE.Mesh(geometry, domainMaterial);
    mesh.userData.feature = feature;
    this.domainGroup.add(mesh);
    this.domains.set(feature.id, mesh);
    this.materials.set(feature.id, domainMaterial);
    return mesh;
  }

  public addRNAStructure(structure: RNAStructure): THREE.Object3D {
    const startAngle = (structure.start / this.sequenceLength) * Math.PI * 2;
    const endAngle = (structure.end / this.sequenceLength) * Math.PI * 2;

    let geometry: THREE.BufferGeometry;
    const material = new THREE.MeshStandardMaterial({
      color: 0x9933cc,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.6
    });

    switch (structure.type) {
      case 'stem-loop':
        geometry = this.createStemLoopGeometry(startAngle, endAngle);
        break;
      case 'pseudoknot':
        geometry = this.createPseudoknotGeometry(startAngle, endAngle);
        break;
      case 'bulge':
        geometry = this.createBulgeGeometry(startAngle, endAngle);
        break;
      default:
        geometry = new THREE.SphereGeometry(0.5);
    }

    const mesh = new THREE.Mesh(geometry, material);
    this.domainGroup.add(mesh);
    this.rnaStructures.set(`${structure.start}-${structure.end}`, mesh);
    return mesh;
  }

  public updateFeatureMaterial(featureId: string, material: THREE.Material) {
    const domain = this.domains.get(featureId);
    if (domain instanceof THREE.Mesh) {
      const oldMaterial = this.materials.get(featureId);
      if (oldMaterial) {
        oldMaterial.dispose();
      }
      domain.material = material;
      this.materials.set(featureId, material);
    }
  }

  private createBindingSiteGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const radius = this.radius + 0.5;
    
    // Create a curved rectangle shape
    shape.moveTo(
      Math.cos(startAngle) * radius,
      Math.sin(startAngle) * radius
    );

    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      shape.lineTo(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
    }

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private createRegulatoryDomainGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    // Create a more complex shape for regulatory domains
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const height = 0.4;
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = height * Math.sin((i / segments) * Math.PI);
      points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createTranscriptionDomainGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    // Create arrow-like shapes for transcription domains
    const shape = new THREE.Shape();
    const radius = this.radius + 0.5;
    const arrowHeight = 0.3;

    shape.moveTo(
      Math.cos(startAngle) * radius,
      Math.sin(startAngle) * radius
    );

    const midAngle = (startAngle + endAngle) / 2;
    shape.lineTo(
      Math.cos(midAngle) * (radius + arrowHeight),
      Math.sin(midAngle) * (radius + arrowHeight)
    );

    shape.lineTo(
      Math.cos(endAngle) * radius,
      Math.sin(endAngle) * radius
    );

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: false
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private createStructuralDomainGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    // Create cylinder-like shapes for structural domains
    const radius = this.radius + 0.5;
    const height = 0.3;
    const radialSegments = 16;
    const heightSegments = 1;

    return new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      radialSegments,
      heightSegments,
      true,
      startAngle,
      endAngle - startAngle
    );
  }

  private createStemLoopGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const loopHeight = 1.0;
    const segments = 32;

    // Create stem
    for (let i = 0; i <= segments / 2; i++) {
      const t = i / (segments / 2);
      const angle = startAngle + (endAngle - startAngle) * t;
      const height = loopHeight * Math.sin(t * Math.PI);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createPseudoknotGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    // Create a more complex interleaved structure
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const height = 0.5;
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const h = height * Math.sin(t * Math.PI * 4);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        h,
        Math.sin(angle) * radius
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createBulgeGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    // Create a bulged-out structure
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const bulgeSize = 0.3;
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const bulge = bulgeSize * Math.sin(t * Math.PI);
      points.push(new THREE.Vector3(
        Math.cos(angle) * (radius + bulge),
        0,
        Math.sin(angle) * (radius + bulge)
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  public clear() {
    while (this.domainGroup.children.length > 0) {
      const object = this.domainGroup.children[0];
      this.domainGroup.remove(object);
    }
    this.domains.clear();
    this.rnaStructures.clear();
    this.materials.forEach(material => material.dispose());
    this.materials.clear();
  }

  public getGroup(): THREE.Group {
    return this.domainGroup;
  }
} 