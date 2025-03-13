'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlasmidMap from './components/plasmid-map/PlasmidMap';
import SequenceViewer from './components/sequence-viewer/SequenceViewer';
import FileImport from './components/sequence-viewer/FileImport';
import CloningTools from './components/cloning-tools/CloningTools';
import FeatureEditor from './components/feature-annotation/FeatureEditor';
import PlasmidLibrary from './components/plasmid-library/PlasmidLibrary';
import { DNASequence, SequenceFeature, RestrictionSite } from './lib/dna/types';
import { loadSequencesFromLocalStorage, saveSequenceToLocalStorage, exportToFasta, exportToGenBank } from './lib/dna/sequence-service';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Home() {
  const [sequences, setSequences] = useState<DNASequence[]>([]);
  const [activeSequence, setActiveSequence] = useState<DNASequence | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<SequenceFeature | null>(null);
  const [selectedRestrictionSite, setSelectedRestrictionSite] = useState<RestrictionSite | null>(null);
  const [activeTab, setActiveTab] = useState("plasmid-map");

  // Load sequences from localStorage on initial render
  useEffect(() => {
    const loadedSequences = loadSequencesFromLocalStorage();
    setSequences(loadedSequences);
    
    // Set the first sequence as active if available
    if (loadedSequences.length > 0) {
      setActiveSequence(loadedSequences[0]);
    }
  }, []);

  // Handle sequence import
  const handleSequenceImport = (sequence: DNASequence) => {
    // Add to sequences list
    const updatedSequences = [...sequences, sequence];
    setSequences(updatedSequences);
    
    // Set as active sequence
    setActiveSequence(sequence);
    
    // Save to localStorage
    saveSequenceToLocalStorage(sequence);
    
    // Switch to plasmid map tab when a new sequence is imported
    setActiveTab("plasmid-map");
  };

  // Handle sequence selection
  const handleSequenceSelect = (sequenceId: string) => {
    const selected = sequences.find(seq => seq.id === sequenceId);
    if (selected) {
      setActiveSequence(selected);
      setSelectedFeature(null);
      setSelectedRestrictionSite(null);
    }
  };

  // Handle sequence update
  const handleSequenceUpdate = (updatedSequence: DNASequence) => {
    // Update in sequences list
    const updatedSequences = sequences.map(seq => 
      seq.id === updatedSequence.id ? updatedSequence : seq
    );
    
    setSequences(updatedSequences);
    setActiveSequence(updatedSequence);
    
    // Save to localStorage
    saveSequenceToLocalStorage(updatedSequence);
  };

  // Handle feature click
  const handleFeatureClick = (feature: SequenceFeature) => {
    setSelectedFeature(feature);
    setSelectedRestrictionSite(null);
  };

  // Handle restriction site click
  const handleRestrictionSiteClick = (site: RestrictionSite) => {
    setSelectedRestrictionSite(site);
    setSelectedFeature(null);
  };

  // Add new feature from plasmid map selection
  const handleAddFeature = (feature: SequenceFeature) => {
    if (!activeSequence) return;
    
    // Add the feature to the active sequence
    const updatedSequence: DNASequence = {
      ...activeSequence,
      features: [...activeSequence.features, feature]
    };
    
    // Update the sequence
    handleSequenceUpdate(updatedSequence);
    toast.success(`Added feature: ${feature.name}`);
  };

  // Update a feature
  const handleUpdateFeature = (updatedFeature: SequenceFeature) => {
    if (!activeSequence) return;
    
    // Update the feature in the active sequence
    const updatedFeatures = activeSequence.features.map(feature => 
      feature.id === updatedFeature.id ? updatedFeature : feature
    );
    
    const updatedSequence: DNASequence = {
      ...activeSequence,
      features: updatedFeatures
    };
    
    // Update the sequence
    handleSequenceUpdate(updatedSequence);
    toast.success(`Updated feature: ${updatedFeature.name}`);
  };
  
  // Delete a feature
  const handleDeleteFeature = (featureId: string) => {
    if (!activeSequence) return;
    
    // Filter out the deleted feature
    const updatedFeatures = activeSequence.features.filter(feature => 
      feature.id !== featureId
    );
    
    const updatedSequence: DNASequence = {
      ...activeSequence,
      features: updatedFeatures
    };
    
    // Update the sequence
    handleSequenceUpdate(updatedSequence);
    
    // Clear selection if the deleted feature was selected
    if (selectedFeature && selectedFeature.id === featureId) {
      setSelectedFeature(null);
    }
    
    toast.success('Feature deleted');
  };

  // Export sequence
  const handleExport = (format: 'fasta' | 'genbank') => {
    if (!activeSequence) {
      toast.error('No sequence to export');
      return;
    }
    
    let content: string;
    let fileExtension: string;
    
    if (format === 'fasta') {
      content = exportToFasta(activeSequence);
      fileExtension = '.fasta';
    } else {
      content = exportToGenBank(activeSequence);
      fileExtension = '.gb';
    }
    
    // Create a blob and download link
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSequence.name}${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${activeSequence.name} as ${format.toUpperCase()}`);
  };

  // Handle adding multiple features
  const handleAddFeatures = (features: SequenceFeature[]) => {
    if (!activeSequence) return;
    
    // Filter out features that already exist (by name and sequence position)
    const newFeatures = features.filter(newFeature => {
      return !activeSequence.features.some(existingFeature => 
        existingFeature.name === newFeature.name &&
        existingFeature.start === newFeature.start &&
        existingFeature.end === newFeature.end
      );
    });

    if (newFeatures.length === 0) {
      toast.info('No new features to add - all features already exist');
      return;
    }
    
    // Add only the new features to the active sequence
    const updatedSequence: DNASequence = {
      ...activeSequence,
      features: [...activeSequence.features, ...newFeatures]
    };
    
    // Update the sequence
    handleSequenceUpdate(updatedSequence);
    toast.success(`Added ${newFeatures.length} new features`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gene Map</h1>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Sequences</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sequences.length === 0 ? (
                  <DropdownMenuItem disabled>No sequences</DropdownMenuItem>
                ) : (
                  sequences.map(sequence => (
                    <DropdownMenuItem 
                      key={sequence.id}
                      onClick={() => handleSequenceSelect(sequence.id)}
                    >
                      {sequence.name} ({sequence.length} bp)
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <FileImport onSequenceImport={handleSequenceImport} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('fasta')}>
                  Export as FASTA
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('genbank')}>
                  Export as GenBank
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6 min-h-[calc(100vh-8rem)]">
        {/* Welcome message for first-time visitors */}
        {sequences.length === 0 && (
          <div className="bg-muted rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Welcome to SnapGene Cloner</h2>
            <p className="mb-4">A streamlined, open-source alternative for DNA sequence visualization and plasmid editing.</p>
            <div className="flex gap-2">
              <FileImport onSequenceImport={handleSequenceImport} />
              <Button variant="outline" onClick={() => setActiveTab("library")}>
                Browse Plasmid Library
              </Button>
            </div>
          </div>
        )}

        {/* Sequence info */}
        {activeSequence && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{activeSequence.name}</h2>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{activeSequence.length} bp</span>
              <span>{activeSequence.circular ? 'Circular' : 'Linear'}</span>
              {activeSequence.organism && <span>Organism: {activeSequence.organism}</span>}
            </div>
            {activeSequence.description && (
              <p className="mt-1 text-sm">{activeSequence.description}</p>
            )}
          </div>
        )}

        {/* Main workspace tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-[calc(100vh-16rem)]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plasmid-map">Plasmid Map</TabsTrigger>
            <TabsTrigger value="sequence">DNA Sequence</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plasmid-map" className="flex-1 h-[calc(100%-3rem)]">
            <PlasmidMap
              sequence={activeSequence}
              onFeatureClick={handleFeatureClick}
              onRestrictionSiteClick={handleRestrictionSiteClick}
              onAddFeature={handleAddFeature}
              onUpdateFeature={handleUpdateFeature}
              onDeleteFeature={handleDeleteFeature}
              selectedFeature={selectedFeature}
              onAddFeatures={handleAddFeatures}
            />
          </TabsContent>
          
          <TabsContent value="sequence" className="h-[calc(100%-3rem)] border rounded-md p-4">
            <SequenceViewer 
              sequence={activeSequence}
              showFeatures={true}
              showRestrictionSites={true}
              onFeatureClick={handleFeatureClick}
              onRestrictionSiteClick={handleRestrictionSiteClick}
              onAddFeature={handleAddFeature}
            />
          </TabsContent>
          
          <TabsContent value="library" className="h-[calc(100%-3rem)] border rounded-md p-4">
            <PlasmidLibrary onSelectPlasmid={handleSequenceImport} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4">
          
        </div>
      </footer>
    </div>
  );
}
