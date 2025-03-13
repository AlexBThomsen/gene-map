import type { DNASequence, SequenceFeature } from './types';
import { v4 as uuidv4 } from 'uuid';
import { findRestrictionSites } from './utils';

/**
 * Common restriction enzymes with their recognition sequences and cut sites
 */
export const commonRestrictionEnzymes = [
  { name: 'EcoRI', sequence: 'GAATTC', cutSite: 1 },
  { name: 'BamHI', sequence: 'GGATCC', cutSite: 1 },
  { name: 'HindIII', sequence: 'AAGCTT', cutSite: 1 },
  { name: 'XbaI', sequence: 'TCTAGA', cutSite: 1 },
  { name: 'PstI', sequence: 'CTGCAG', cutSite: 5 },
  { name: 'SalI', sequence: 'GTCGAC', cutSite: 1 },
  { name: 'SmaI', sequence: 'CCCGGG', cutSite: 3 },
  { name: 'KpnI', sequence: 'GGTACC', cutSite: 5 },
  { name: 'SacI', sequence: 'GAGCTC', cutSite: 5 },
  { name: 'XhoI', sequence: 'CTCGAG', cutSite: 1 }
];

/**
 * Common sequence feature types with colors
 */
export const featureTypes = [
  { type: 'promoter', color: '#FF9800' },
  { type: 'gene', color: '#4CAF50' },
  { type: 'terminator', color: '#F44336' },
  { type: 'ori', color: '#2196F3' },
  { type: 'CDS', color: '#9C27B0' },
  { type: 'misc_feature', color: '#607D8B' }
];

/**
 * Parses a FASTA formatted string into a DNA sequence object
 * @param fastaContent FASTA content as string
 * @returns DNA sequence object
 */
export function parseFasta(fastaContent: string): DNASequence {
  const lines = fastaContent.trim().split('\n');
  let name = '';
  let description = '';
  let sequence = '';

  // Extract name and description from header line
  if (lines[0].startsWith('>')) {
    const headerLine = lines[0].substring(1);
    const headerParts = headerLine.split(' ');
    name = headerParts[0];
    description = headerParts.slice(1).join(' ');
  }

  // Extract sequence data (removing any spaces or newlines)
  for (let i = 1; i < lines.length; i++) {
    sequence += lines[i].trim();
  }

  // Create new DNA sequence object
  const dnaSequence: DNASequence = {
    id: uuidv4(),
    name: name || 'Unnamed Sequence',
    sequence: sequence,
    features: [],
    restrictionSites: findRestrictionSites(sequence, commonRestrictionEnzymes),
    primers: [],
    circular: false, // Default to linear for FASTA imports
    length: sequence.length,
    description: description || undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return dnaSequence;
}

/**
 * Exports a DNA sequence to FASTA format
 * @param sequence DNA sequence object
 * @returns FASTA formatted string
 */
export function exportToFasta(sequence: DNASequence): string {
  let fasta = `>${sequence.name}`;
  
  if (sequence.description) {
    fasta += ` ${sequence.description}`;
  }
  
  fasta += '\n';
  
  // Format sequence with 70 characters per line
  for (let i = 0; i < sequence.sequence.length; i += 70) {
    fasta += sequence.sequence.substring(i, i + 70) + '\n';
  }
  
  return fasta;
}

/**
 * Simple GenBank parser
 * Note: This is a basic implementation. A full-featured GenBank parser would be more complex.
 * @param genbankContent GenBank content as string
 * @returns DNA sequence object
 */
export function parseGenBank(genbankContent: string): DNASequence {
  const lines = genbankContent.trim().split('\n');
  let name = '';
  let description = '';
  let sequence = '';
  let organism = '';
  let accession = '';
  let circular = false;
  const features: SequenceFeature[] = [];
  
  let inSequence = false;
  let inFeatures = false;
  let currentFeature: Partial<SequenceFeature> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Extract sequence name and description
    if (line.startsWith('LOCUS')) {
      const parts = line.split(/\s+/);
      if (parts.length > 1) {
        name = parts[1];
      }
      if (line.includes('circular')) {
        circular = true;
      }
    }
    
    // Extract accession number
    if (line.startsWith('ACCESSION')) {
      const parts = line.split(/\s+/);
      if (parts.length > 1) {
        accession = parts[1];
      }
    }
    
    // Extract description
    if (line.startsWith('DEFINITION')) {
      description = line.substring('DEFINITION'.length).trim();
      // Check for continuation lines
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(' ')) {
        description += ' ' + lines[j].trim();
        j++;
      }
    }
    
    // Extract organism
    if (line.startsWith('SOURCE')) {
      organism = line.substring('SOURCE'.length).trim();
      // Check for continuation lines
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(' ')) {
        if (lines[j].includes('ORGANISM')) {
          organism = lines[j].substring(lines[j].indexOf('ORGANISM') + 'ORGANISM'.length).trim();
          break;
        }
        j++;
      }
    }
    
    // Handle features section
    if (line === 'FEATURES') {
      inFeatures = true;
      continue;
    }
    
    if (inFeatures && !line.startsWith('ORIGIN')) {
      // Start of a new feature
      if (line.match(/^\s+\w+/)) {
        // Save previous feature if exists
        if (currentFeature && currentFeature.start && currentFeature.end && currentFeature.type) {
          features.push({
            id: uuidv4(),
            name: currentFeature.name || currentFeature.type,
            type: currentFeature.type,
            start: currentFeature.start,
            end: currentFeature.end,
            direction: currentFeature.direction || 'forward',
            color: featureTypes.find(ft => ft.type === currentFeature?.type)?.color,
            notes: currentFeature.notes
          } as SequenceFeature);
        }
        
        // Parse new feature
        const featureLine = line.trim();
        const parts = featureLine.split(/\s+/);
        const type = parts[0];
        const locationStr = parts.slice(1).join(' ');
        
        // Parse location
        let start = 1;
        let end = 1;
        let direction: 'forward' | 'reverse' = 'forward';
        
        if (locationStr.includes('complement')) {
          direction = 'reverse';
          const match = locationStr.match(/complement\((\d+)\.\.(\d+)\)/);
          if (match) {
            start = parseInt(match[1]);
            end = parseInt(match[2]);
          }
        } else {
          const match = locationStr.match(/(\d+)\.\.(\d+)/);
          if (match) {
            start = parseInt(match[1]);
            end = parseInt(match[2]);
          }
        }
        
        currentFeature = {
          type,
          start,
          end,
          direction,
          name: '', // Will be populated from /label qualifier if present
          notes: ''
        };
      } 
      // Parse feature qualifiers
      else if (line.match(/^\s+\//) && currentFeature) {
        const qualifierMatch = line.match(/^\s+\/(\w+)=(.+)$/);
        if (qualifierMatch) {
          const [, qualifier, value] = qualifierMatch;
          const cleanValue = value.startsWith('"') ? value.slice(1, -1) : value;
          
          if (qualifier === 'label' || qualifier === 'gene') {
            currentFeature.name = cleanValue;
          } else if (qualifier === 'note') {
            currentFeature.notes = cleanValue;
          }
        }
      }
    }
    
    // Handle sequence section
    if (line.startsWith('ORIGIN')) {
      inFeatures = false;
      inSequence = true;
      continue;
    }
    
    if (inSequence && !line.startsWith('//')) {
      // Extract sequence data, removing numbers and spaces
      sequence += line.replace(/\d+|\s+/g, '');
    }
    
    // End of record
    if (line.startsWith('//')) {
      // Save last feature if exists
      if (currentFeature && currentFeature.start && currentFeature.end && currentFeature.type) {
        features.push({
          id: uuidv4(),
          name: currentFeature.name || currentFeature.type,
          type: currentFeature.type,
          start: currentFeature.start,
          end: currentFeature.end,
          direction: currentFeature.direction || 'forward',
          color: featureTypes.find(ft => ft.type === currentFeature?.type)?.color,
          notes: currentFeature.notes
        } as SequenceFeature);
      }
      break;
    }
  }
  
  // Create DNA sequence object
  const dnaSequence: DNASequence = {
    id: uuidv4(),
    name: name || 'Unnamed Sequence',
    sequence: sequence,
    features: features,
    restrictionSites: findRestrictionSites(sequence, commonRestrictionEnzymes),
    primers: [],
    circular: circular,
    length: sequence.length,
    description: description || undefined,
    organism: organism || undefined,
    accession: accession || undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return dnaSequence;
}

/**
 * Exports a DNA sequence to GenBank format
 * @param sequence DNA sequence object
 * @returns GenBank formatted string
 */
export function exportToGenBank(sequence: DNASequence): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let genbank = '';
  
  // LOCUS line
  genbank += `LOCUS       ${sequence.name.padEnd(16)} ${sequence.length} bp    DNA     ${sequence.circular ? 'circular' : 'linear'}   ${sequence.organism || 'SYN'} ${dateStr}\n`;
  
  // DEFINITION line
  genbank += `DEFINITION  ${sequence.description || sequence.name}.\n`;
  
  // ACCESSION line
  if (sequence.accession) {
    genbank += `ACCESSION   ${sequence.accession}\n`;
  } else {
    genbank += `ACCESSION   UNKNOWN\n`;
  }
  
  // VERSION line
  genbank += `VERSION     UNKNOWN\n`;
  
  // SOURCE line
  genbank += `SOURCE      ${sequence.organism || 'Unknown'}\n`;
  genbank += `  ORGANISM  ${sequence.organism || 'Unknown'}\n`;
  genbank += `            Unclassified.\n`;
  
  // FEATURES line
  genbank += `FEATURES             Location/Qualifiers\n`;
  
  // Features table
  for (const feature of sequence.features) {
    const locationStr = feature.direction === 'forward' 
      ? `${feature.start}..${feature.end}`
      : `complement(${feature.start}..${feature.end})`;
    
    genbank += `     ${feature.type.padEnd(16)} ${locationStr}\n`;
    genbank += `                     /label="${feature.name}"\n`;
    
    if (feature.notes) {
      genbank += `                     /note="${feature.notes}"\n`;
    }
  }
  
  // ORIGIN section
  genbank += 'ORIGIN\n';
  
  // Format sequence in blocks of 10 with line numbers
  for (let i = 0; i < sequence.sequence.length; i += 60) {
    const lineNum = (i + 1).toString().padStart(9, ' ');
    let line = lineNum;
    
    for (let j = 0; j < 60 && i + j < sequence.sequence.length; j += 10) {
      line += ' ' + sequence.sequence.substring(i + j, i + j + 10);
    }
    
    genbank += line + '\n';
  }
  
  // End of record
  genbank += '//\n';
  
  return genbank;
}

/**
 * Saves a DNA sequence to local storage
 * @param sequence DNA sequence to save
 */
export function saveSequenceToLocalStorage(sequence: DNASequence): void {
  try {
    // Get existing sequences
    const existingSequencesJson = localStorage.getItem('dnaSequences');
    const sequences: DNASequence[] = existingSequencesJson 
      ? JSON.parse(existingSequencesJson) 
      : [];
    
    // Update if exists, otherwise add
    const index = sequences.findIndex(seq => seq.id === sequence.id);
    if (index >= 0) {
      sequences[index] = {
        ...sequence,
        updatedAt: new Date()
      };
    } else {
      sequences.push(sequence);
    }
    
    // Save back to localStorage
    localStorage.setItem('dnaSequences', JSON.stringify(sequences));
  } catch (error) {
    console.error('Error saving sequence to localStorage:', error);
    throw new Error('Failed to save sequence');
  }
}

/**
 * Loads all DNA sequences from local storage
 * @returns Array of DNA sequences
 */
export function loadSequencesFromLocalStorage(): DNASequence[] {
  if (typeof window === 'undefined') return [];
  
  const sequences = JSON.parse(localStorage.getItem('dnaSequences') || '[]');
  return sequences;
}

/**
 * Loads a specific DNA sequence from local storage by ID
 * @param id Sequence ID to load
 * @returns DNA sequence object or null if not found
 */
export function loadSequenceById(id: string): DNASequence | null {
  const sequences = loadSequencesFromLocalStorage();
  return sequences.find(seq => seq.id === id) || null;
}

/**
 * Deletes a DNA sequence from local storage
 * @param id Sequence ID to delete
 */
export function deleteSequence(id: string): void {
  try {
    const sequences = loadSequencesFromLocalStorage();
    const filteredSequences = sequences.filter(seq => seq.id !== id);
    localStorage.setItem('dnaSequences', JSON.stringify(filteredSequences));
  } catch (error) {
    console.error('Error deleting sequence from localStorage:', error);
    throw new Error('Failed to delete sequence');
  }
} 