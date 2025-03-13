import { DNASequence, SequenceFeature, RestrictionSite } from './types';
import { DOMParser } from 'xmldom';

/**
 * Parse a SnapGene file and return a DNASequence object.
 * Based on the Biopython SnapGene parser.
 */
export async function parseSnapGeneFile(buffer: Buffer): Promise<DNASequence> {
  // Initialize the record
  const record: Partial<DNASequence> = {
    id: crypto.randomUUID(),
    name: '',
    sequence: '',
    features: [],
    restrictionSites: [],
    circular: false,
    primers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Iterate through packets
  let offset = 0;
  
  // First packet should be a cookie packet
  const firstPacketType = buffer.readUInt8(offset);
  offset += 1;
  const firstPacketLength = buffer.readUInt32BE(offset);
  offset += 4;
  
  if (firstPacketType !== 0x09) {
    throw new Error('The file does not start with a SnapGene cookie packet');
  }
  
  // Parse cookie packet
  const cookie = buffer.toString('ascii', offset, offset + 8);
  if (cookie !== 'SnapGene') {
    throw new Error('The file is not a valid SnapGene file');
  }
  offset += firstPacketLength;
  
  // Parse remaining packets
  while (offset < buffer.length) {
    const packetType = buffer.readUInt8(offset);
    offset += 1;
    const packetLength = buffer.readUInt32BE(offset);
    offset += 4;
    
    const packetData = buffer.subarray(offset, offset + packetLength);
    
    switch (packetType) {
      case 0x00: // DNA sequence
        parseDNAPacket(packetData, record);
        break;
      case 0x05: // Primers
        parsePrimersPacket(packetData, record);
        break;
      case 0x06: // Notes
        parseNotesPacket(packetData, record);
        break;
      case 0x0A: // Features
        parseFeaturesPacket(packetData, record);
        break;
    }
    
    offset += packetLength;
  }
  
  if (!record.sequence) {
    throw new Error('No DNA packet in file');
  }
  
  // Set length based on sequence
  record.length = record.sequence.length;
  
  return record as DNASequence;
}

/**
 * Parse a DNA sequence packet.
 */
function parseDNAPacket(data: Buffer, record: Partial<DNASequence>): void {
  if (record.sequence) {
    throw new Error('The file contains more than one DNA packet');
  }
  
  const flags = data.readUInt8(0);
  const sequence = data.toString('ascii', 1);
  
  record.sequence = sequence;
  record.circular = (flags & 0x01) === 0x01;
}

/**
 * Parse a Notes packet.
 */
function parseNotesPacket(data: Buffer, record: Partial<DNASequence>): void {
  try {
    const xmlString = data.toString('utf8');
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    
    // Get type
    const typeNodes = xml.getElementsByTagName('Type');
    if (typeNodes.length > 0 && typeNodes[0].textContent) {
      record.category = typeNodes[0].textContent === 'Synthetic' ? 'Synthetic' : 'Unknown';
    }
    
    // Get last modified date
    const dateNodes = xml.getElementsByTagName('LastModified');
    if (dateNodes.length > 0 && dateNodes[0].textContent) {
      const dateStr = dateNodes[0].textContent;
      const [year, month, day] = dateStr.split('.').map(Number);
      record.updatedAt = new Date(year, month - 1, day);
    }
    
    // Get accession number
    const accNodes = xml.getElementsByTagName('AccessionNumber');
    if (accNodes.length > 0 && accNodes[0].textContent) {
      record.id = accNodes[0].textContent;
    }
    
    // Get comments
    const commentsNodes = xml.getElementsByTagName('Comments');
    if (commentsNodes.length > 0 && commentsNodes[0].textContent) {
      const comment = commentsNodes[0].textContent;
      record.name = comment.split(' ', 1)[0];
      record.description = comment;
    }
  } catch (error) {
    console.error('Error parsing Notes packet:', error);
  }
}

/**
 * Parse a Features packet.
 */
function parseFeaturesPacket(data: Buffer, record: Partial<DNASequence>): void {
  try {
    const xmlString = data.toString('utf8');
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    
    const features = xml.getElementsByTagName('Feature');
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      // Get feature type
      let type = feature.getAttribute('type') || 'misc_feature';
      
      // Get directionality
      let strand = +1;
      const directionality = parseInt(feature.getAttribute('directionality') || '1');
      if (directionality === 2) {
        strand = -1;
      }
      
      // Get segments
      const segments = feature.getElementsByTagName('Segment');
      if (segments.length === 0) {
        continue;
      }
      
      // Process segments to get start and end positions
      let start = 0;
      let end = 0;
      
      for (let j = 0; j < segments.length; j++) {
        const segment = segments[j];
        if (segment.getAttribute('type') === 'gap') {
          continue;
        }
        
        const range = segment.getAttribute('range');
        if (!range) {
          continue;
        }
        
        const [segStart, segEnd] = range.split('-').map(Number);
        // Adjust for 1-based coordinates
        const adjustedStart = segStart - 1;
        const adjustedEnd = segEnd;
        
        if (j === 0) {
          start = adjustedStart;
          end = adjustedEnd;
        } else {
          // For simplicity, we'll just take the outer bounds of all segments
          start = Math.min(start, adjustedStart);
          end = Math.max(end, adjustedEnd);
        }
      }
      
      // Get feature name
      const name = feature.getAttribute('name') || '';
      
      // Get qualifiers
      const qualifiers: Record<string, string[]> = {};
      const qualifierNodes = feature.getElementsByTagName('Q');
      
      for (let j = 0; j < qualifierNodes.length; j++) {
        const qualifier = qualifierNodes[j];
        const qname = qualifier.getAttribute('name');
        if (!qname) {
          continue;
        }
        
        const values: string[] = [];
        const valueNodes = qualifier.getElementsByTagName('V');
        
        for (let k = 0; k < valueNodes.length; k++) {
          const value = valueNodes[k];
          if (value.hasAttribute('text')) {
            values.push(value.getAttribute('text') || '');
          } else if (value.hasAttribute('predef')) {
            values.push(value.getAttribute('predef') || '');
          } else if (value.hasAttribute('int')) {
            values.push(value.getAttribute('int') || '');
          }
        }
        
        qualifiers[qname] = values;
      }
      
      // Create feature
      const sequenceFeature: SequenceFeature = {
        id: crypto.randomUUID(),
        name: name,
        type: type,
        start: start,
        end: end,
        direction: strand === -1 ? 'reverse' : 'forward',
        color: getColorForFeatureType(type)
      };
      
      record.features = record.features || [];
      record.features.push(sequenceFeature);
    }
  } catch (error) {
    console.error('Error parsing Features packet:', error);
  }
}

/**
 * Parse a Primers packet.
 */
function parsePrimersPacket(data: Buffer, record: Partial<DNASequence>): void {
  try {
    const xmlString = data.toString('utf8');
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    
    const primers = xml.getElementsByTagName('Primer');
    for (let i = 0; i < primers.length; i++) {
      const primer = primers[i];
      
      // Get primer name
      const name = primer.getAttribute('name') || 'Primer';
      
      // Get binding sites
      const sites = primer.getElementsByTagName('BindingSite');
      for (let j = 0; j < sites.length; j++) {
        const site = sites[j];
        
        const location = site.getAttribute('location');
        if (!location) {
          continue;
        }
        
        const strandValue = parseInt(site.getAttribute('boundStrand') || '0');
        const strand = strandValue === 1 ? -1 : +1;
        
        const [start, end] = location.split('-').map(Number);
        // Adjust for 1-based coordinates and primer shift
        const adjustedStart = start;
        const adjustedEnd = end + 1;
        
        // Create feature
        const primerFeature: SequenceFeature = {
          id: crypto.randomUUID(),
          name: name,
          type: 'primer_bind',
          start: adjustedStart,
          end: adjustedEnd,
          direction: strand === -1 ? 'reverse' : 'forward',
          color: '#FF9800' // Orange for primers
        };
        
        record.features = record.features || [];
        record.features.push(primerFeature);
      }
    }
  } catch (error) {
    console.error('Error parsing Primers packet:', error);
  }
}

/**
 * Get a color for a feature type.
 */
function getColorForFeatureType(type: string): string {
  switch (type) {
    case 'CDS':
      return '#FF5252'; // Red
    case 'promoter':
      return '#FFC107'; // Amber
    case 'terminator':
      return '#9C27B0'; // Purple
    case 'rep_origin':
      return '#2196F3'; // Blue
    case 'primer_bind':
      return '#FF9800'; // Orange
    case 'misc_feature':
      return '#4CAF50'; // Green
    default:
      return '#9E9E9E'; // Grey
  }
}

// For server-side use
export async function parseSnapGeneFileFromPath(filePath: string): Promise<DNASequence> {
  const fs = require('fs').promises;
  const buffer = await fs.readFile(filePath);
  return parseSnapGeneFile(buffer);
} 