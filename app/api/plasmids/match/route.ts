import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseSnapGeneFile } from '@/app/lib/dna/snapgene-parser';
import { DNASequence, SequenceFeature } from '@/app/lib/dna/types';

// Function to find matching subsequences
function findMatchingFeatures(sequence: string, libraryFeature: SequenceFeature, librarySequence: string): SequenceFeature | null {
  const featureSequence = librarySequence.substring(libraryFeature.start - 1, libraryFeature.end);
  const index = sequence.indexOf(featureSequence);
  
  if (index !== -1) {
    return {
      ...libraryFeature,
      start: index + 1,
      end: index + featureSequence.length,
      id: crypto.randomUUID(),
    };
  }
  
  return null;
}

export async function POST(request: Request) {
  try {
    const { sequence } = await request.json();
    
    if (!sequence) {
      return NextResponse.json({ error: 'No sequence provided' }, { status: 400 });
    }

    const libraryPath = path.join(process.cwd(), 'public', 'plasmids', 'library');
    const files = await fs.readdir(libraryPath);
    const matchedFeatures: SequenceFeature[] = [];

    // Process each .dna file in the library
    for (const file of files) {
      if (!file.endsWith('.dna')) continue;

      const filePath = path.join(libraryPath, file);
      const fileContent = await fs.readFile(filePath);
      const plasmid = await parseSnapGeneFile(fileContent);

      // Check each feature in the plasmid
      for (const feature of plasmid.features) {
        const matchedFeature = findMatchingFeatures(sequence, feature, plasmid.sequence);
        if (matchedFeature) {
          // Add source information
          matchedFeature.notes = `${matchedFeature.notes || ''}\nFound in ${plasmid.name}`;
          matchedFeatures.push(matchedFeature);
        }
      }
    }

    // Remove duplicates based on sequence position and type
    const uniqueFeatures = matchedFeatures.filter((feature, index, self) =>
      index === self.findIndex(f => 
        f.start === feature.start && 
        f.end === feature.end && 
        f.type === feature.type
      )
    );

    return NextResponse.json({ features: uniqueFeatures });
  } catch (error) {
    console.error('Error matching sequence:', error);
    return NextResponse.json({ error: 'Failed to match sequence' }, { status: 500 });
  }
} 