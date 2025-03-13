/**
 * DNA/RNA sequence types
 */

export interface SequenceFeature {
  id: string;
  name: string;
  type: string; // e.g., "gene", "promoter", "terminator"
  start: number; // 1-indexed position
  end: number; // 1-indexed position
  direction: 'forward' | 'reverse'; // Strand direction
  color: string;
  notes?: string;
}

export interface RestrictionSite {
  id: string;
  name: string; // e.g., "EcoRI", "BamHI"
  sequence?: string;
  cutSite?: number;
  start: number; // position in the plasmid (1-indexed)
  end?: number; // position in the plasmid (1-indexed)
}

export interface Primer {
  id: string;
  name: string;
  sequence: string;
  start: number; // binding start (1-indexed)
  end: number; // binding end (1-indexed)
  direction: 'forward' | 'reverse';
  meltingTemp?: number; // in Celsius
  gcContent?: number; // percentage (0-100)
}

export interface DNASequence {
  id: string;
  name: string;
  sequence: string; // nucleotide sequence
  length: number;
  circular: boolean;
  features: SequenceFeature[];
  restrictionSites: RestrictionSite[];
  organism?: string;
  description?: string;
  category?: string;
  primers?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CloningResult {
  id: string;
  name: string;
  parentSequences: string[]; // IDs of source sequences
  sequence: string;
  features: SequenceFeature[];
  restrictionSites: RestrictionSite[];
  primers: Primer[];
  circular: boolean;
  length: number;
  description?: string;
  createdAt: Date;
} 