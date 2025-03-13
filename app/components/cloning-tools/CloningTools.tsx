'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DNASequence, SequenceFeature } from '@/app/lib/dna/types';
import { simulateDigest, simulateLigation, findRestrictionSites } from '@/app/lib/dna/utils';
import { commonRestrictionEnzymes } from '@/app/lib/dna/sequence-service';
import { toast } from 'sonner';

interface CloningToolsProps {
  sequences: DNASequence[];
  onNewSequence: (sequence: DNASequence) => void;
}

export default function CloningTools({ sequences, onNewSequence }: CloningToolsProps) {
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>([]);
  const [fragments, setFragments] = useState<{ sequence: string; start: number; end: number; features: SequenceFeature[] }[]>([]);
  const [selectedFragments, setSelectedFragments] = useState<number[]>([]);
  const [isCircular, setIsCircular] = useState(true);

  // Handle sequence selection
  const handleSequenceSelect = (sequenceId: string) => {
    setSelectedSequence(sequenceId);
    setFragments([]);
    setSelectedFragments([]);
  };

  // Handle enzyme selection
  const handleEnzymeSelect = (enzymeName: string) => {
    if (selectedEnzymes.includes(enzymeName)) {
      setSelectedEnzymes(selectedEnzymes.filter(name => name !== enzymeName));
    } else {
      setSelectedEnzymes([...selectedEnzymes, enzymeName]);
    }
  };

  // Simulate digest
  const handleDigest = () => {
    if (!selectedSequence) {
      toast.error('Please select a sequence first');
      return;
    }

    if (selectedEnzymes.length === 0) {
      toast.error('Please select at least one restriction enzyme');
      return;
    }

    const sequence = sequences.find(seq => seq.id === selectedSequence);
    if (!sequence) return;

    const digestFragments = simulateDigest(sequence, selectedEnzymes);
    setFragments(digestFragments);
    setSelectedFragments([]);

    toast.success(`Digest simulation complete. ${digestFragments.length} fragments generated.`);
  };

  // Toggle fragment selection
  const handleFragmentSelect = (index: number) => {
    if (selectedFragments.includes(index)) {
      setSelectedFragments(selectedFragments.filter(i => i !== index));
    } else {
      setSelectedFragments([...selectedFragments, index]);
    }
  };

  // Simulate ligation
  const handleLigate = () => {
    if (selectedFragments.length === 0) {
      toast.error('Please select at least one fragment to ligate');
      return;
    }

    const fragmentsToLigate = selectedFragments.map(index => ({
      sequence: fragments[index].sequence,
      features: fragments[index].features
    }));

    const ligatedSequence = simulateLigation(fragmentsToLigate, isCircular);
    
    // Find restriction sites in the new sequence
    const restrictionSites = findRestrictionSites(
      ligatedSequence.sequence, 
      commonRestrictionEnzymes
    );
    
    // Create the final sequence with restriction sites
    const finalSequence: DNASequence = {
      ...ligatedSequence,
      restrictionSites,
      name: `Ligated Construct (${new Date().toLocaleTimeString()})`,
    };

    // Pass the new sequence to the parent component
    onNewSequence(finalSequence);
    
    toast.success('Ligation simulation complete. New sequence created.');
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="digest" className="w-full flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="digest">Restriction Digest</TabsTrigger>
          <TabsTrigger value="pcr">PCR Cloning</TabsTrigger>
        </TabsList>
        
        <TabsContent value="digest" className="flex-1 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Sequence selection */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Select Sequence</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                {sequences.length === 0 ? (
                  <p className="text-muted-foreground">No sequences available</p>
                ) : (
                  sequences.map(sequence => (
                    <Button
                      key={sequence.id}
                      variant={selectedSequence === sequence.id ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => handleSequenceSelect(sequence.id)}
                    >
                      {sequence.name} ({sequence.length} bp)
                    </Button>
                  ))
                )}
              </div>
            </Card>
            
            {/* Enzyme selection */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Select Restriction Enzymes</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {commonRestrictionEnzymes.map(enzyme => (
                  <Button
                    key={enzyme.name}
                    variant={selectedEnzymes.includes(enzyme.name) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleEnzymeSelect(enzyme.name)}
                  >
                    {enzyme.name}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
          
          <Button 
            className="mb-4" 
            onClick={handleDigest}
            disabled={!selectedSequence || selectedEnzymes.length === 0}
          >
            Simulate Digest
          </Button>
          
          {/* Fragments display */}
          {fragments.length > 0 && (
            <div className="flex-1 flex flex-col">
              <Card className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Digest Fragments</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select fragments to ligate together
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {fragments.map((fragment, index) => (
                    <div 
                      key={index}
                      className={`p-3 border rounded-md cursor-pointer ${
                        selectedFragments.includes(index) ? 'border-primary bg-primary/10' : ''
                      }`}
                      onClick={() => handleFragmentSelect(index)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Fragment {index + 1}</span>
                        <span className="text-sm">{fragment.sequence.length} bp</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Position: {fragment.start} - {fragment.end}
                      </div>
                      <div className="text-xs font-mono mt-2 truncate">
                        {fragment.sequence.substring(0, 30)}...
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="circular-checkbox"
                    checked={isCircular}
                    onChange={() => setIsCircular(!isCircular)}
                  />
                  <label htmlFor="circular-checkbox">Circular product</label>
                </div>
                
                <Button 
                  onClick={handleLigate}
                  disabled={selectedFragments.length === 0}
                >
                  Ligate Selected Fragments
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pcr" className="flex-1">
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-muted-foreground">
              PCR Cloning feature coming soon
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 