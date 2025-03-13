import type { SequenceFeature } from "@/app/lib/dna/types";

interface DNAProperties {
  gc_content: number;
  melting_temp: number;
  molecular_weight: number;
  length: number;
}

interface StructuralPrediction {
  position: number;
  type: string;
  probability: number;
  energy: number;
}

interface RestrictionSite {
  name: string;
  sequence: string;
  position: number;
  overhang?: number;
}

export class AnalysisManager {
  private sequence: string;
  private features: SequenceFeature[];
  private dnaProperties: DNAProperties | null;
  private structuralPredictions: StructuralPrediction[];
  private restrictionSites: RestrictionSite[];

  constructor(sequence: string, features: SequenceFeature[]) {
    this.sequence = sequence;
    this.features = features;
    this.dnaProperties = null;
    this.structuralPredictions = [];
    this.restrictionSites = [];
  }

  public analyzeDNAProperties(): DNAProperties {
    const gc_count = (this.sequence.match(/[GC]/gi) || []).length;
    const gc_content = gc_count / this.sequence.length;
    
    // Calculate melting temperature using nearest-neighbor method
    const melting_temp = this.calculateMeltingTemperature();
    
    // Calculate molecular weight (approximate)
    const molecular_weight = this.calculateMolecularWeight();

    this.dnaProperties = {
      gc_content,
      melting_temp,
      molecular_weight,
      length: this.sequence.length
    };

    return this.dnaProperties;
  }

  private calculateMeltingTemperature(): number {
    // Implement nearest-neighbor method for Tm calculation
    const salt_correction = 16.6 * Math.log10(0.05); // Assuming 50mM salt
    let tm = 0;

    // Nearest-neighbor parameters (simplified)
    const nn_params: { [key: string]: number } = {
      'AA': -7.9, 'TT': -7.9,
      'AT': -7.2,
      'TA': -7.2,
      'CA': -8.5, 'TG': -8.5,
      'GT': -8.4, 'AC': -8.4,
      'CT': -7.8, 'AG': -7.8,
      'GA': -8.2, 'TC': -8.2,
      'CG': -10.6,
      'GC': -9.8,
      'GG': -8.0, 'CC': -8.0
    };

    // Calculate enthalpy and entropy contributions
    for (let i = 0; i < this.sequence.length - 1; i++) {
      const dinucleotide = this.sequence.substring(i, i + 2).toUpperCase();
      if (nn_params[dinucleotide]) {
        tm += nn_params[dinucleotide];
      }
    }

    // Add salt correction and convert to Celsius
    tm = (tm * 100 / this.sequence.length) + salt_correction;
    
    return tm;
  }

  private calculateMolecularWeight(): number {
    // Average molecular weights for nucleotides (g/mol)
    const weights: { [key: string]: number } = {
      'A': 313.2,
      'T': 304.2,
      'C': 289.2,
      'G': 329.2
    };

    let total_weight = 0;
    for (const base of this.sequence.toUpperCase()) {
      if (weights[base]) {
        total_weight += weights[base];
      }
    }

    // Add weight of phosphate backbone
    total_weight += (this.sequence.length - 1) * 17.0; // Approximate weight of phosphodiester bond

    return total_weight;
  }

  public predictStructuralElements(): StructuralPrediction[] {
    this.structuralPredictions = [];

    // Analyze sequence for potential structural elements
    this.predictZDNA();
    this.predictCruciforms();
    this.predictTriplexRegions();
    this.predictQuadruplexes();

    return this.structuralPredictions;
  }

  private predictZDNA() {
    // Look for alternating purine-pyrimidine sequences
    const zDNAPattern = /([GC][AT]){3,}/g;
    let match;

    while ((match = zDNAPattern.exec(this.sequence)) !== null) {
      this.structuralPredictions.push({
        position: match.index,
        type: 'zDNA',
        probability: this.calculateZDNAProbability(match[0]),
        energy: this.calculateZDNAEnergy(match[0])
      });
    }
  }

  private calculateZDNAProbability(sequence: string): number {
    // Simple probability calculation based on sequence composition
    const gc_content = (sequence.match(/[GC]/g) || []).length / sequence.length;
    return Math.min(0.9, gc_content * 1.2); // Higher GC content increases probability
  }

  private calculateZDNAEnergy(sequence: string): number {
    // Simplified energy calculation for Z-DNA formation
    const base_energy = -0.5; // kcal/mol per base pair
    return sequence.length * base_energy;
  }

  private predictCruciforms() {
    // Look for inverted repeats that could form cruciform structures
    for (let i = 0; i < this.sequence.length - 6; i++) {
      const segment = this.sequence.substring(i, i + 6);
      const reverseComplement = this.getReverseComplement(segment);
      
      // Search for reverse complement downstream
      const downstream = this.sequence.substring(i + 6);
      if (downstream.includes(reverseComplement)) {
        this.structuralPredictions.push({
          position: i,
          type: 'cruciform',
          probability: this.calculateCruciformProbability(segment),
          energy: this.calculateCruciformEnergy(segment)
        });
      }
    }
  }

  private calculateCruciformProbability(sequence: string): number {
    // Probability based on sequence symmetry and AT content
    const at_content = (sequence.match(/[AT]/g) || []).length / sequence.length;
    return Math.min(0.8, at_content * 1.1); // Higher AT content increases probability
  }

  private calculateCruciformEnergy(sequence: string): number {
    // Simplified energy calculation for cruciform formation
    const base_energy = -0.3; // kcal/mol per base pair
    return sequence.length * base_energy;
  }

  private predictTriplexRegions() {
    // Look for polypurine/polypyrimidine tracts
    const triplexPattern = /([AG]{10,}|[TC]{10,})/g;
    let match;

    while ((match = triplexPattern.exec(this.sequence)) !== null) {
      this.structuralPredictions.push({
        position: match.index,
        type: 'triplex',
        probability: this.calculateTriplexProbability(match[0]),
        energy: this.calculateTriplexEnergy(match[0])
      });
    }
  }

  private calculateTriplexProbability(sequence: string): number {
    // Probability based on tract length and composition
    const purity = (sequence.match(/[AG]+|[TC]+/g) || [''])[0].length / sequence.length;
    return Math.min(0.7, purity * (sequence.length / 15)); // Longer pure tracts have higher probability
  }

  private calculateTriplexEnergy(sequence: string): number {
    // Simplified energy calculation for triplex formation
    const base_energy = -0.4; // kcal/mol per base triplet
    return sequence.length * base_energy;
  }

  private predictQuadruplexes() {
    // Look for G-quadruplex forming sequences
    const quadPattern = /G{3,}\w{1,7}G{3,}\w{1,7}G{3,}\w{1,7}G{3,}/g;
    let match;

    while ((match = quadPattern.exec(this.sequence)) !== null) {
      this.structuralPredictions.push({
        position: match.index,
        type: 'quadruplex',
        probability: this.calculateQuadruplexProbability(match[0]),
        energy: this.calculateQuadruplexEnergy(match[0])
      });
    }
  }

  private calculateQuadruplexProbability(sequence: string): number {
    // Probability based on G-tract length and loop sizes
    const g_tracts = sequence.match(/G{3,}/g) || [];
    const avg_tract_length = g_tracts.reduce((sum, tract) => sum + tract.length, 0) / g_tracts.length;
    return Math.min(0.9, avg_tract_length / 5); // Longer G-tracts increase probability
  }

  private calculateQuadruplexEnergy(sequence: string): number {
    // Simplified energy calculation for quadruplex formation
    const base_energy = -0.6; // kcal/mol per G-quartet
    const g_quartets = Math.floor(sequence.match(/G{3,}/g)?.[0].length || 0 / 4);
    return g_quartets * base_energy;
  }

  public findRestrictionSites(enzymes: { [key: string]: string }): RestrictionSite[] {
    this.restrictionSites = [];

    for (const [name, recognition_sequence] of Object.entries(enzymes)) {
      const pattern = new RegExp(recognition_sequence, 'gi');
      let match;

      while ((match = pattern.exec(this.sequence)) !== null) {
        this.restrictionSites.push({
          name,
          sequence: match[0],
          position: match.index,
          overhang: this.calculateOverhang(recognition_sequence)
        });
      }
    }

    return this.restrictionSites;
  }

  private calculateOverhang(recognition_sequence: string): number {
    // Calculate overhang length based on cut site pattern
    // This is a simplified version - real implementation would need more complex logic
    if (recognition_sequence.includes('^')) {
      const parts = recognition_sequence.split('^');
      return parts[0].length - Math.floor(recognition_sequence.length / 2);
    }
    return 0;
  }

  private getReverseComplement(sequence: string): string {
    const complement: { [key: string]: string } = {
      'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C'
    };
    return sequence
      .split('')
      .reverse()
      .map(base => complement[base] || base)
      .join('');
  }

  public getDNAProperties(): DNAProperties | null {
    return this.dnaProperties;
  }

  public getStructuralPredictions(): StructuralPrediction[] {
    return this.structuralPredictions;
  }

  public getRestrictionSites(): RestrictionSite[] {
    return this.restrictionSites;
  }
} 