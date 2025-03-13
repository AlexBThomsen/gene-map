'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { DNASequence } from '@/app/lib/dna/types';
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlasmidLibraryClientProps {
  plasmids: {[category: string]: DNASequence[]};
  onSelectPlasmid: (sequence: DNASequence) => void;
}

export default function PlasmidLibraryClient({ plasmids, onSelectPlasmid }: PlasmidLibraryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter plasmids based on search query
  const filteredPlasmids = searchQuery.trim() === '' 
    ? plasmids 
    : Object.keys(plasmids).reduce((filtered, category) => {
        const matches = plasmids[category].filter(plasmid => 
          plasmid.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (matches.length > 0) {
          filtered[category] = matches;
        }
        return filtered;
      }, {} as {[category: string]: DNASequence[]});
  
  const filteredCategories = Object.keys(filteredPlasmids);
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search plasmids..."
          className="w-full p-2 border rounded"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <h2 className="text-xl font-bold">Plasmid Library</h2>
          
          {filteredCategories.length === 0 && searchQuery.trim() !== '' && (
            <div className="text-center text-muted-foreground p-4">
              No plasmids found matching &quot;{searchQuery}&quot;.
            </div>
          )}
          
          {filteredCategories.map(category => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold mb-3">{category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredPlasmids[category]?.map(plasmid => (
                  <Card 
                    key={plasmid.id} 
                    className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => onSelectPlasmid(plasmid)}
                  >
                    <div className="font-medium">{plasmid.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {plasmid.length.toLocaleString()} bp • {plasmid.features.length} features
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 