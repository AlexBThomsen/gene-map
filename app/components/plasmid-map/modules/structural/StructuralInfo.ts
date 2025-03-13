import * as THREE from 'three';

interface StructuralProperty {
  start: number;
  end: number;
  type: 'bendability' | 'stability' | 'curvature' | 'torsionalStress';
  value: number;
}

interface StructuralAnnotation {
  position: number;
  type: 'zDNA' | 'cruciform' | 'triplex' | 'quadruplex';
  stability?: number;
}

export class StructuralInfo {
  private structureGroup: THREE.Group;
  private radius: number;
  private sequenceLength: number;
  private properties: Map<string, THREE.Object3D>;
  private annotations: Map<string, THREE.Object3D>;

  constructor(sequenceLength: number, radius: number = 2) {
    this.structureGroup = new THREE.Group();
    this.radius = radius;
    this.sequenceLength = sequenceLength;
    this.properties = new Map();
    this.annotations = new Map();
  }

  public addStructuralProperty(
    property: StructuralProperty,
    material?: THREE.Material
  ): THREE.Object3D {
    const startAngle = (property.start / this.sequenceLength) * Math.PI * 2;
    const endAngle = (property.end / this.sequenceLength) * Math.PI * 2;

    let geometry: THREE.BufferGeometry;
    let propertyMaterial: THREE.Material;

    switch (property.type) {
      case 'bendability':
        geometry = this.createBendabilityGeometry(startAngle, endAngle, property.value);
        propertyMaterial = material || new THREE.MeshStandardMaterial({
          color: 0x66ccff,
          metalness: 0.3,
          roughness: 0.7,
          transparent: true,
          opacity: 0.6
        });
        break;

      case 'stability':
        geometry = this.createStabilityGeometry(startAngle, endAngle, property.value);
        propertyMaterial = material || new THREE.MeshStandardMaterial({
          color: 0xff9933,
          metalness: 0.4,
          roughness: 0.6,
          transparent: true,
          opacity: 0.7
        });
        break;

      case 'curvature':
        geometry = this.createCurvatureGeometry(startAngle, endAngle, property.value);
        propertyMaterial = material || new THREE.MeshStandardMaterial({
          color: 0x99cc33,
          metalness: 0.3,
          roughness: 0.7,
          transparent: true,
          opacity: 0.6
        });
        break;

      case 'torsionalStress':
        geometry = this.createTorsionalStressGeometry(startAngle, endAngle, property.value);
        propertyMaterial = material || new THREE.MeshStandardMaterial({
          color: 0xff3366,
          metalness: 0.5,
          roughness: 0.5,
          transparent: true,
          opacity: 0.7
        });
        break;

      default:
        geometry = new THREE.BufferGeometry();
        propertyMaterial = material || new THREE.MeshBasicMaterial({ color: 0xcccccc });
    }

    const mesh = new THREE.Mesh(geometry, propertyMaterial);
    this.structureGroup.add(mesh);
    this.properties.set(`${property.type}-${property.start}-${property.end}`, mesh);
    return mesh;
  }

  public addStructuralAnnotation(annotation: StructuralAnnotation): THREE.Object3D {
    const angle = (annotation.position / this.sequenceLength) * Math.PI * 2;
    
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (annotation.type) {
      case 'zDNA':
        geometry = this.createZDNAGeometry(angle);
        material = new THREE.MeshStandardMaterial({
          color: 0x9933cc,
          metalness: 0.4,
          roughness: 0.6,
          transparent: true,
          opacity: 0.8
        });
        break;

      case 'cruciform':
        geometry = this.createCruciformGeometry(angle);
        material = new THREE.MeshStandardMaterial({
          color: 0x33cc99,
          metalness: 0.3,
          roughness: 0.7,
          transparent: true,
          opacity: 0.7
        });
        break;

      case 'triplex':
        geometry = this.createTriplexGeometry(angle);
        material = new THREE.MeshStandardMaterial({
          color: 0xcc3399,
          metalness: 0.5,
          roughness: 0.5,
          transparent: true,
          opacity: 0.6
        });
        break;

      case 'quadruplex':
        geometry = this.createQuadruplexGeometry(angle);
        material = new THREE.MeshStandardMaterial({
          color: 0x3399cc,
          metalness: 0.4,
          roughness: 0.6,
          transparent: true,
          opacity: 0.7
        });
        break;

      default:
        geometry = new THREE.SphereGeometry(0.2);
        material = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    }

    const mesh = new THREE.Mesh(geometry, material);
    this.structureGroup.add(mesh);
    this.annotations.set(`${annotation.type}-${annotation.position}`, mesh);
    return mesh;
  }

  private createBendabilityGeometry(startAngle: number, endAngle: number, value: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const height = value * 0.5; // Scale the height based on bendability value
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const bend = height * Math.sin(t * Math.PI);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        bend,
        Math.sin(angle) * radius
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createStabilityGeometry(startAngle: number, endAngle: number, value: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const radius = this.radius + 0.5;
    const thickness = value * 0.3; // Scale thickness based on stability value

    shape.moveTo(
      Math.cos(startAngle) * radius,
      Math.sin(startAngle) * radius
    );

    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      shape.lineTo(
        Math.cos(angle) * (radius + thickness),
        Math.sin(angle) * (radius + thickness)
      );
    }

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private createCurvatureGeometry(startAngle: number, endAngle: number, value: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const curvature = value * 0.4; // Scale curvature based on value
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const offset = curvature * Math.sin(t * Math.PI * 2);
      points.push(new THREE.Vector3(
        Math.cos(angle) * (radius + offset),
        0,
        Math.sin(angle) * (radius + offset)
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createTorsionalStressGeometry(startAngle: number, endAngle: number, value: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const torsion = value * 0.3; // Scale torsion based on stress value
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const twist = torsion * Math.sin(t * Math.PI * 4);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        twist,
        Math.sin(angle) * radius
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createZDNAGeometry(angle: number): THREE.BufferGeometry {
    // Create a zigzag pattern representing Z-DNA
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const height = 0.5;
    const width = 0.3;
    const segments = 8;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const h = height * (i % 2 === 0 ? 1 : -1);
      const w = width * (i % 2 === 0 ? 1 : -1);
      points.push(new THREE.Vector3(
        Math.cos(angle) * (radius + w),
        h,
        Math.sin(angle) * (radius + w)
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createCruciformGeometry(angle: number): THREE.BufferGeometry {
    // Create a cross-shaped structure
    const shape = new THREE.Shape();
    const radius = this.radius + 0.5;
    const size = 0.4;

    shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    shape.lineTo(Math.cos(angle) * (radius + size), Math.sin(angle) * (radius + size));
    shape.lineTo(Math.cos(angle + Math.PI/2) * (radius + size), Math.sin(angle + Math.PI/2) * (radius + size));
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: false
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private createTriplexGeometry(angle: number): THREE.BufferGeometry {
    // Create a three-stranded structure
    const points: THREE.Vector3[] = [];
    const radius = this.radius + 0.5;
    const height = 0.6;
    const width = 0.3;
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const h = height * Math.sin(t * Math.PI * 3);
      const w = width * Math.cos(t * Math.PI * 3);
      points.push(new THREE.Vector3(
        Math.cos(angle) * (radius + w),
        h,
        Math.sin(angle) * (radius + w)
      ));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createQuadruplexGeometry(angle: number): THREE.BufferGeometry {
    // Create a four-stranded structure
    const shape = new THREE.Shape();
    const radius = this.radius + 0.5;
    const size = 0.4;

    shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    
    for (let i = 0; i < 4; i++) {
      const currentAngle = angle + (i * Math.PI / 2);
      shape.lineTo(
        Math.cos(currentAngle) * (radius + size),
        Math.sin(currentAngle) * (radius + size)
      );
    }

    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  public clear() {
    while (this.structureGroup.children.length > 0) {
      const object = this.structureGroup.children[0];
      this.structureGroup.remove(object);
    }
    this.properties.clear();
    this.annotations.clear();
  }

  public getGroup(): THREE.Group {
    return this.structureGroup;
  }
} 