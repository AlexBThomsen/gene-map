import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { parseSnapGeneFile } from '@/app/lib/dna/snapgene-parser'
import { SequenceFeature } from '@/app/lib/dna/types'

// Function to check if a sequence contains a feature sequence
function findFeatureInSequence(sequence: string, feature: SequenceFeature, featureSequence: string): SequenceFeature | null {
  // Get the actual sequence of this feature
  const searchSequence = featureSequence.substring(feature.start - 1, feature.end)
  
  // Look for this sequence in the target sequence
  const index = sequence.indexOf(searchSequence)
  
  if (index !== -1) {
    // Found a match! Create a new feature at this position
    return {
      ...feature,
      id: crypto.randomUUID(),
      start: index + 1,
      end: index + searchSequence.length,
      notes: `${feature.notes || ''}\nAutomatically annotated based on match in ${feature.name}`
    }
  }
  
  return null
}

export async function POST(request: Request) {
  try {
    const { sequence } = await request.json()
    
    if (!sequence) {
      return NextResponse.json({ error: 'No sequence provided' }, { status: 400 })
    }

    // Get all .dna files from our library
    const libraryPath = path.join(process.cwd(), 'public', 'plasmids', 'library')
    const files = await fs.readdir(libraryPath)
    const matchedFeatures: SequenceFeature[] = []

    // Go through each .dna file
    for (const file of files) {
      if (!file.endsWith('.dna')) continue

      const filePath = path.join(libraryPath, file)
      const fileContent = await fs.readFile(filePath)
      const plasmid = await parseSnapGeneFile(fileContent)

      // Check each feature in this plasmid
      for (const feature of plasmid.features) {
        const match = findFeatureInSequence(sequence, feature, plasmid.sequence)
        if (match) {
          matchedFeatures.push(match)
        }
      }
    }

    // Remove duplicate features (same position and type)
    const uniqueFeatures = matchedFeatures.filter((feature, index, self) =>
      index === self.findIndex(f => 
        f.start === feature.start && 
        f.end === feature.end && 
        f.type === feature.type
      )
    )

    return NextResponse.json({
      features: uniqueFeatures,
      count: uniqueFeatures.length
    })

  } catch (error) {
    console.error('Error in auto-annotation:', error)
    return NextResponse.json({ error: 'Failed to auto-annotate sequence' }, { status: 500 })
  }
} 