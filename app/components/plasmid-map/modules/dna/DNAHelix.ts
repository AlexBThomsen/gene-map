import * as THREE from 'three';

export interface DNAStructureOptions {
  form: 'B-DNA' | 'Z-DNA' | 'Cruciform';
  startBp: number;
  endBp: number;
  meltingTemp?: number;
  supercoilingDensity?: number;
  torsionalStress?: number;
}

export class DNAHelix {
  private group: THREE.Group;
  private sequence: string;
  private backboneMaterial: THREE.Material;
  private basePairMaterials: Map<string, THREE.Material>;
  private phosphateMaterial: THREE.Material;
  private radius: number;
  private bpPerTurn: number;
  private helixRise: number;
  private majorGrooveDepth: number;
  private minorGrooveDepth: number;

  constructor(sequence: string) {
    this.group = new THREE.Group();
    this.sequence = sequence;
    this.backboneMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      metalness: 0.3,
      roughness: 0.7 
    });
    
    // Create materials for different base pairs
    this.basePairMaterials = new Map([
      ['A', new THREE.MeshStandardMaterial({ color: 0x3498db, metalness: 0.4, roughness: 0.6 })], // Blue for Adenine
      ['T', new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.4, roughness: 0.6 })], // Red for Thymine
      ['G', new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.4, roughness: 0.6 })], // Yellow for Guanine
      ['C', new THREE.MeshStandardMaterial({ color: 0x2ecc71, metalness: 0.4, roughness: 0.6 })]  // Green for Cytosine
    ]);

    this.phosphateMaterial = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      metalness: 0.5,
      roughness: 0.5
    });

    this.radius = 2;
    this.bpPerTurn = 10.5; // Default for B-DNA
    this.helixRise = 0.34; // nm per base pair for B-DNA
    this.majorGrooveDepth = 0.85; // Relative depth of major groove
    this.minorGrooveDepth = 0.75; // Relative depth of minor groove

    this.createDetailedHelix();
  }

  private createDetailedHelix() {
    // Create sugar-phosphate backbones
    this.createBackbones();
    
    // Create base pairs with proper coloring
    this.createColoredBasePairs();
    
    // Add phosphate groups
    this.createPhosphateGroups();
    
    // Create groove indicators
    this.createGrooves();
  }

  private createBackbones() {
    // Create two helical curves for the backbones
    const curve1Points: THREE.Vector3[] = [];
    const curve2Points: THREE.Vector3[] = [];
    const turns = this.sequence.length / this.bpPerTurn;
    
    for (let i = 0; i <= this.sequence.length; i++) {
      const angle = (i / this.bpPerTurn) * Math.PI * 2;
      const y = i * this.helixRise;
      
      // First backbone
      curve1Points.push(new THREE.Vector3(
        Math.cos(angle) * this.radius,
        y,
        Math.sin(angle) * this.radius
      ));
      
      // Second backbone (offset by π)
      curve2Points.push(new THREE.Vector3(
        Math.cos(angle + Math.PI) * this.radius,
        y,
        Math.sin(angle + Math.PI) * this.radius
      ));
    }

    const curve1 = new THREE.CatmullRomCurve3(curve1Points);
    const curve2 = new THREE.CatmullRomCurve3(curve2Points);

    const tubeGeometry1 = new THREE.TubeGeometry(curve1, this.sequence.length * 2, 0.1, 8, false);
    const tubeGeometry2 = new THREE.TubeGeometry(curve2, this.sequence.length * 2, 0.1, 8, false);

    const backbone1 = new THREE.Mesh(tubeGeometry1, this.backboneMaterial);
    const backbone2 = new THREE.Mesh(tubeGeometry2, this.backboneMaterial);

    this.group.add(backbone1, backbone2);
  }

  private createColoredBasePairs() {
    for (let i = 0; i < this.sequence.length; i++) {
      const base = this.sequence[i].toUpperCase();
      const angle = (i / this.bpPerTurn) * Math.PI * 2;
      const y = i * this.helixRise;

      // Create base pair geometry
      const basePairGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.2);
      const material = this.basePairMaterials.get(base) || this.basePairMaterials.get('A')!;
      const basePair = new THREE.Mesh(basePairGeometry, material);

      // Position and rotate base pair
      basePair.position.set(
        Math.cos(angle) * this.radius,
        y,
        Math.sin(angle) * this.radius
      );
      basePair.rotation.y = angle;

      this.group.add(basePair);
    }
  }

  private createPhosphateGroups() {
    const phosphateGeometry = new THREE.SphereGeometry(0.15, 8, 8);

    for (let i = 0; i < this.sequence.length; i++) {
      const angle = (i / this.bpPerTurn) * Math.PI * 2;
      const y = i * this.helixRise;

      // Create phosphate groups for both strands
      const positions = [
        new THREE.Vector3(
          Math.cos(angle) * (this.radius + 0.1),
          y,
          Math.sin(angle) * (this.radius + 0.1)
        ),
        new THREE.Vector3(
          Math.cos(angle + Math.PI) * (this.radius + 0.1),
          y,
          Math.sin(angle + Math.PI) * (this.radius + 0.1)
        )
      ];

      positions.forEach(pos => {
        const phosphate = new THREE.Mesh(phosphateGeometry, this.phosphateMaterial);
        phosphate.position.copy(pos);
        this.group.add(phosphate);
      });
    }
  }

  private createGrooves() {
    // Create visual indicators for major and minor grooves
    const grooveGeometry = new THREE.TorusGeometry(this.radius * 1.2, 0.05, 8, 100);
    const majorGrooveMaterial = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      transparent: true,
      opacity: 0.3
    });
    const minorGrooveMaterial = new THREE.MeshStandardMaterial({
      color: 0x7f8c8d,
      transparent: true,
      opacity: 0.2
    });

    const majorGroove = new THREE.Mesh(grooveGeometry, majorGrooveMaterial);
    const minorGroove = new THREE.Mesh(grooveGeometry, minorGrooveMaterial);

    majorGroove.scale.setY(this.majorGrooveDepth);
    minorGroove.scale.setY(this.minorGrooveDepth);
    minorGroove.rotation.y = Math.PI / 2;

    this.group.add(majorGroove, minorGroove);
  }

  public setMaterials(backboneMaterial: THREE.Material, basePairMaterial: THREE.Material) {
    this.backboneMaterial = backboneMaterial;
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry instanceof THREE.TubeGeometry) {
          child.material = this.backboneMaterial;
        }
      }
    });
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public updateColors(colorScheme: 'default' | 'temperature' | 'conservation') {
    // Implementation for different coloring schemes
    switch (colorScheme) {
      case 'temperature':
        // Color based on melting temperature
        break;
      case 'conservation':
        // Color based on sequence conservation
        break;
      default:
        // Use default base pair colors
        break;
    }
  }
} 