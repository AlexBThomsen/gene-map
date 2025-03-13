import { NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import path from 'path'
import { DNASequence } from '../../lib/dna/types'
import { parseSnapGeneFile } from '../../lib/dna/snapgene-parser'

// Categories for plasmids
const PLASMID_CATEGORIES = {
  CLONING_VECTORS: 'Cloning Vectors',
  EXPRESSION_VECTORS: 'Expression Vectors',
  BAC_VECTORS: 'BAC Vectors',
  PROMOTERS: 'Promoters',
  TAGS: 'Tags and Fusion Proteins',
  OTHER: 'Other'
} as const

// Helper to categorize plasmids based on name
function categorizePlasmid(name: string): string {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('promoter')) return PLASMID_CATEGORIES.PROMOTERS
  if (lowerName.includes('tag') || lowerName.includes('gst') || lowerName.includes('mbp')) {
    return PLASMID_CATEGORIES.TAGS
  }
  if (lowerName.includes('pbluescript') || lowerName.includes('litmus') || 
      lowerName.includes('pbc') || lowerName.includes('pbs')) {
    return PLASMID_CATEGORIES.CLONING_VECTORS
  }
  if (lowerName.includes('pcdna') || lowerName.includes('pcold') || 
      lowerName.includes('pex') || lowerName.includes('pf1')) {
    return PLASMID_CATEGORIES.EXPRESSION_VECTORS
  }
  if (lowerName.includes('bac') || lowerName.includes('pbelo')) {
    return PLASMID_CATEGORIES.BAC_VECTORS
  }
  
  return PLASMID_CATEGORIES.OTHER
}

export async function GET() {
  try {
    const libraryPath = path.join(process.cwd(), 'public', 'plasmids', 'library')
    console.log('Looking for files in:', libraryPath)
    
    const files = await readdir(libraryPath)
    console.log('Found files:', files)
    
    const plasmids: DNASequence[] = []
    
    for (const file of files) {
      if (!file.endsWith('.dna')) {
        console.log('Skipping non-DNA file:', file)
        continue
      }
      
      const filePath = path.join(libraryPath, file)
      console.log('Processing file:', filePath)
      
      const name = path.basename(file, '.dna')
      const category = categorizePlasmid(name)
      
      try {
        // Read the file
        const buffer = await readFile(filePath)
        
        // Parse the SnapGene file
        const plasmid = await parseSnapGeneFile(buffer)
        
        // Override some properties
        plasmid.name = name
        plasmid.category = category
        plasmid.description = `${category} plasmid`
        
        plasmids.push(plasmid)
        
        console.log('Successfully parsed file:', name, 'Length:', plasmid.length, 'Features:', plasmid.features.length)
      } catch (error) {
        console.error(`Error parsing DNA file ${file}:`, error)
      }
    }
    
    console.log('Total plasmids processed:', plasmids.length)
    
    // Group plasmids by category
    const categorized = plasmids.reduce((acc, plasmid) => {
      const category = plasmid.category || PLASMID_CATEGORIES.OTHER
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(plasmid)
      return acc
    }, {} as {[category: string]: DNASequence[]})
    
    console.log('Categories found:', Object.keys(categorized))
    
    // Sort categories and plasmids within categories
    Object.keys(categorized).forEach(category => {
      categorized[category].sort((a: DNASequence, b: DNASequence) => a.name.localeCompare(b.name))
    })
    
    return NextResponse.json(categorized)
  } catch (error) {
    console.error('Error loading plasmid library:', error)
    return NextResponse.json({ error: 'Failed to load plasmid library' }, { status: 500 })
  }
} 