import { DNASequence, RestrictionSite, Primer, SequenceFeature } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Complements a DNA sequence
 * @param sequence DNA sequence to complement
 * @returns Complementary DNA sequence
 */
export function getComplementarySequence(sequence: string): string {
  const complementMap: { [key: string]: string } = {
    'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G',
    'a': 't', 't': 'a', 'g': 'c', 'c': 'g',
    'N': 'N', 'n': 'n',
    'R': 'Y', 'Y': 'R', 'r': 'y', 'y': 'r', // R = A/G, Y = C/T
    'M': 'K', 'K': 'M', 'm': 'k', 'k': 'm', // M = A/C, K = G/T
    'S': 'S', 's': 's', // S = G/C
    'W': 'W', 'w': 'w', // W = A/T
    'H': 'D', 'D': 'H', 'h': 'd', 'd': 'h', // H = A/C/T, D = G/A/T
    'B': 'V', 'V': 'B', 'b': 'v', 'v': 'b', // B = G/T/C, V = G/C/A
  };

  return sequence
    .split('')
    .map(base => complementMap[base] || base)
    .join('');
}

/**
 * Reverses a DNA sequence
 * @param sequence DNA sequence to reverse
 * @returns Reversed DNA sequence
 */
export function getReverseSequence(sequence: string): string {
  return sequence.split('').reverse().join('');
}

/**
 * Gets the reverse complement of a DNA sequence
 * @param sequence DNA sequence to reverse complement
 * @returns Reverse complemented DNA sequence
 */
export function getReverseComplementSequence(sequence: string): string {
  return getReverseSequence(getComplementarySequence(sequence));
}

/**
 * Calculates GC content of a DNA sequence
 * @param sequence DNA sequence
 * @returns GC content percentage (0-100)
 */
export function calculateGCContent(sequence: string): number {
  const gcCount = (sequence.match(/[GCgc]/g) || []).length;
  return (gcCount / sequence.length) * 100;
}

/**
 * Simple melting temperature calculation
 * @param sequence Primer sequence
 * @returns Approximate melting temperature in Celsius
 */
export function calculateMeltingTemperature(sequence: string): number {
  const cleanSequence = sequence.toUpperCase();
  
  if (cleanSequence.length < 14) {
    // For short primers
    const gcCount = (cleanSequence.match(/[GC]/g) || []).length;
    const atCount = (cleanSequence.match(/[AT]/g) || []).length;
    return 2 * atCount + 4 * gcCount;
  } else {
    // For longer primers
    const gcContent = calculateGCContent(cleanSequence);
    return 64.9 + 0.41 * gcContent - (500 / cleanSequence.length);
  }
}

/**
 * Finds restriction sites in a DNA sequence
 * @param sequence DNA sequence to search in
 * @param sites Array of restriction enzyme names and their recognition sequences
 * @returns Array of restriction sites with positions
 */
export function findRestrictionSites(
  sequence: string, 
  sites: { name: string, sequence: string, cutSite: number }[]
): RestrictionSite[] {
  const result: RestrictionSite[] = [];
  const upperSequence = sequence.toUpperCase();

  sites.forEach(site => {
    const regexPattern = site.sequence.toUpperCase();
    let match;
    const regex = new RegExp(regexPattern, 'g');
    
    while ((match = regex.exec(upperSequence)) !== null) {
      result.push({
        id: uuidv4(),
        name: site.name,
        sequence: site.sequence,
        cutSite: site.cutSite,
        start: match.index + 1, // 1-indexed
        end: match.index + site.sequence.length,
      });
    }
  });

  return result;
}

/**
 * Simulates a restriction digest
 * @param dnaSequence DNA sequence object to digest
 * @param enzymes Array of restriction enzymes to use
 * @returns Array of resulting fragments
 */
export function simulateDigest(
  dnaSequence: DNASequence,
  enzymes: string[]
): { sequence: string, start: number, end: number, features: SequenceFeature[] }[] {
  // Find all restriction sites for the specified enzymes
  const relevantSites = dnaSequence.restrictionSites.filter(site => 
    enzymes.includes(site.name)
  ).sort((a, b) => a.start - b.start);
  
  if (relevantSites.length === 0) {
    return [{
      sequence: dnaSequence.sequence,
      start: 1,
      end: dnaSequence.length,
      features: dnaSequence.features
    }];
  }
  
  // Generate fragments
  const fragments = [];
  let prevEnd = 0;
  
  for (let i = 0; i < relevantSites.length; i++) {
    const site = relevantSites[i];
    if (!site.cutSite) continue;
    const cutPosition = site.start + site.cutSite - 1;
    
    // Fragment from previous cut to this cut
    if (cutPosition > prevEnd) {
      const fragmentStart = prevEnd + 1;
      const fragmentEnd = cutPosition;
      const fragmentSeq = dnaSequence.sequence.substring(fragmentStart - 1, fragmentEnd);
      
      // Find features that overlap with this fragment
      const fragmentFeatures = dnaSequence.features.filter(feature => 
        (feature.start >= fragmentStart && feature.start <= fragmentEnd) ||
        (feature.end >= fragmentStart && feature.end <= fragmentEnd) ||
        (feature.start <= fragmentStart && feature.end >= fragmentEnd)
      );
      
      fragments.push({
        sequence: fragmentSeq,
        start: fragmentStart,
        end: fragmentEnd,
        features: fragmentFeatures
      });
    }
    
    prevEnd = cutPosition;
  }
  
  // Add the last fragment (for linear DNA) or wrap around (for circular DNA)
  if (dnaSequence.circular && relevantSites[0]?.cutSite) {
    const lastFragment = {
      sequence: dnaSequence.sequence.substring(prevEnd) + dnaSequence.sequence.substring(0, relevantSites[0].start + relevantSites[0].cutSite - 1),
      start: prevEnd + 1,
      end: dnaSequence.length + relevantSites[0].start + relevantSites[0].cutSite - 1,
      features: dnaSequence.features.filter(feature => 
        feature.start > prevEnd || 
        feature.end < relevantSites[0]!.start + relevantSites[0]!.cutSite!
      )
    };
    fragments.push(lastFragment);
  } else if (prevEnd < dnaSequence.length) {
    const lastFragment = {
      sequence: dnaSequence.sequence.substring(prevEnd),
      start: prevEnd + 1,
      end: dnaSequence.length,
      features: dnaSequence.features.filter(feature => feature.start > prevEnd)
    };
    fragments.push(lastFragment);
  }
  
  return fragments;
}

/**
 * Simulates ligation of DNA fragments
 * @param fragments Array of DNA fragments to ligate
 * @param circular Whether the result should be circular
 * @returns New DNA sequence object
 */
export function simulateLigation(
  fragments: { sequence: string, features: SequenceFeature[] }[],
  circular: boolean
): DNASequence {
  let combinedSequence = '';
  let combinedFeatures: SequenceFeature[] = [];
  let offset = 0;
  
  fragments.forEach(fragment => {
    combinedSequence += fragment.sequence;
    
    // Adjust feature positions based on new offset
    const adjustedFeatures = fragment.features.map(feature => ({
      ...feature,
      start: feature.start + offset,
      end: feature.end + offset,
      id: uuidv4() // Generate new IDs to avoid conflicts
    }));
    
    combinedFeatures = [...combinedFeatures, ...adjustedFeatures];
    offset += fragment.sequence.length;
  });
  
  return {
    id: uuidv4(),
    name: 'Ligated Construct',
    sequence: combinedSequence,
    features: combinedFeatures,
    restrictionSites: [], // These need to be recalculated
    primers: [],
    circular,
    length: combinedSequence.length,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Designs primers for a target region
 * @param sequence Full DNA sequence
 * @param start Start position (1-indexed)
 * @param end End position (1-indexed)
 * @param options Optional parameters like primer length
 * @returns Forward and reverse primers
 */
export function designPrimers(
  sequence: string,
  start: number,
  end: number,
  options: { primerLength?: number } = {}
): { forward: Primer, reverse: Primer } {
  const primerLength = options.primerLength || 20;
  const halfLength = Math.min(Math.floor(primerLength / 2), 10);
  
  // Get the sequence for the target region plus some flanking sequence
  const targetWithFlanks = sequence.substring(
    Math.max(0, start - halfLength - 1),
    Math.min(sequence.length, end + halfLength)
  );
  
  // Forward primer (from start of region)
  const forwardSeq = targetWithFlanks.substring(0, primerLength);
  const forwardPrimer: Primer = {
    id: uuidv4(),
    name: `Forward_${start}`,
    sequence: forwardSeq,
    start: Math.max(1, start - halfLength),
    end: Math.max(1, start - halfLength) + primerLength - 1,
    direction: 'forward',
    meltingTemp: calculateMeltingTemperature(forwardSeq),
    gcContent: calculateGCContent(forwardSeq)
  };
  
  // Reverse primer (from end of region, reverse complemented)
  const reverseRegion = targetWithFlanks.substring(targetWithFlanks.length - primerLength);
  const reverseSeq = getReverseComplementSequence(reverseRegion);
  const reversePrimer: Primer = {
    id: uuidv4(),
    name: `Reverse_${end}`,
    sequence: reverseSeq,
    start: Math.min(sequence.length, end + halfLength) - primerLength + 1,
    end: Math.min(sequence.length, end + halfLength),
    direction: 'reverse',
    meltingTemp: calculateMeltingTemperature(reverseSeq),
    gcContent: calculateGCContent(reverseSeq)
  };
  
  return { forward: forwardPrimer, reverse: reversePrimer };
} 