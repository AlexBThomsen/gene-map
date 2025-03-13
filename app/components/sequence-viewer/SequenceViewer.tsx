'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DNASequence, SequenceFeature, RestrictionSite } from '@/app/lib/dna/types';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { featureTypes } from '@/app/lib/dna/sequence-service';
import { v4 as uuidv4 } from 'uuid';

interface SequenceViewerProps {
  sequence: DNASequence | null;
  showFeatures?: boolean;
  showRestrictionSites?: boolean;
  onFeatureClick?: (feature: SequenceFeature) => void;
  onRestrictionSiteClick?: (site: RestrictionSite) => void;
  onAddFeature?: (feature: SequenceFeature) => void;
}

export default function SequenceViewer({
  sequence,
  showFeatures = true,
  showRestrictionSites = true,
  onFeatureClick,
  onRestrictionSiteClick,
  onAddFeature
}: SequenceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [view, setView] = useState<'regular' | 'complement' | 'translation'>('regular');
  const [baseColors, setBaseColors] = useState<boolean>(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStartPosition, setSelectionStartPosition] = useState<number | null>(null);
  
  // Feature editor dialog
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState<Partial<SequenceFeature>>({
    name: '',
    type: 'gene',
    direction: 'forward',
    color: featureTypes.find(ft => ft.type === 'gene')?.color
  });

  const BASES_PER_LINE = 60;
  const BASES_PER_GROUP = 10;

  if (!sequence) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-center text-muted-foreground">
          No sequence loaded
        </p>
      </div>
    );
  }

  // Format the sequence for display with line breaks and position numbers
  const formatSequence = () => {
    const lines = [];
    let formattedSequence = '';

    for (let i = 0; i < sequence.sequence.length; i += BASES_PER_LINE) {
      const lineNumber = i + 1;
      const lineSequence = sequence.sequence.substring(i, i + BASES_PER_LINE);
      
      // Format with spaces every BASES_PER_GROUP bases
      let formattedLine = '';
      for (let j = 0; j < lineSequence.length; j += BASES_PER_GROUP) {
        formattedLine += lineSequence.substring(j, j + BASES_PER_GROUP) + ' ';
      }
      
      lines.push({
        position: lineNumber,
        sequence: formattedLine.trim(),
        raw: lineSequence
      });
    }

    return lines;
  };

  // Get color for a DNA base
  const getBaseColor = (base: string) => {
    if (!baseColors) return 'currentColor';
    
    switch (base.toUpperCase()) {
      case 'A': return '#4CAF50'; // Green
      case 'T': return '#F44336'; // Red
      case 'G': return '#2196F3'; // Blue
      case 'C': return '#FF9800'; // Orange
      default: return '#9E9E9E';  // Grey for any other character
    }
  };

  // Get feature that contains a position
  const getFeatureAtPosition = (position: number) => {
    return sequence.features.find(
      feature => position >= feature.start && position <= feature.end
    );
  };

  // Get restriction site that contains a position
  const getRestrictionSiteAtPosition = (position: number) => {
    return sequence.restrictionSites.find(
      site => position >= site.start && position <= (site.end || 0)
    );
  };

  // Handle mouse selection events
  const handleMouseDown = (position: number) => {
    setSelectionStartPosition(position);
    setIsSelecting(true);
  };
  
  const handleMouseMove = (position: number) => {
    if (isSelecting && selectionStartPosition !== null) {
      setSelection({
        start: Math.min(selectionStartPosition, position),
        end: Math.max(selectionStartPosition, position)
      });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    
    if (selection && selection.end > selection.start) {
      // Prepare to open the feature creation dialog
      setNewFeature({
        ...newFeature,
        start: selection.start,
        end: selection.end
      });
      
      // Show the add feature button
      // The dialog will open if the user clicks the add feature button
    }
  };
  
  // Handle adding a new feature from selection
  const handleOpenFeatureDialog = () => {
    if (selection) {
      setIsFeatureDialogOpen(true);
    }
  };
  
  const handleAddFeature = () => {
    if (!newFeature.name || !newFeature.type || !newFeature.start || !newFeature.end) return;
    
    const feature: SequenceFeature = {
      id: uuidv4(),
      name: newFeature.name,
      type: newFeature.type || 'gene',
      start: newFeature.start || 1,
      end: newFeature.end || sequence.length,
      direction: newFeature.direction || 'forward',
      color: newFeature.color || featureTypes.find(ft => ft.type === newFeature.type)?.color || '#4CAF50'
    };
    
    onAddFeature?.(feature);
    setIsFeatureDialogOpen(false);
    setSelection(null);
    setSelectionStartPosition(null);
    setNewFeature({
      name: '',
      type: 'gene',
      direction: 'forward',
      color: featureTypes.find(ft => ft.type === 'gene')?.color
    });
  };

  // Render the sequence lines
  const renderSequenceLines = () => {
    const formattedLines = formatSequence();
    
    return formattedLines.map((line, lineIndex) => {
      const baseElements = [];
      let currentPosition = line.position;
      
      // Add the position number
      baseElements.push(
        <span key={`pos-${lineIndex}`} className="select-none text-muted-foreground mr-4">
          {line.position.toString().padStart(8, ' ')}
        </span>
      );
      
      // Process each base in the line
      for (let i = 0; i < line.raw.length; i++) {
        const position = line.position + i;
        const base = line.raw[i];
        
        // Determine highlighting based on features and restriction sites
        const feature = showFeatures ? getFeatureAtPosition(position) : null;
        const restrictionSite = showRestrictionSites ? getRestrictionSiteAtPosition(position) : null;
        
        // Check if this base is in the current selection
        const isSelected = selection && position >= selection.start && position <= selection.end;
        
        // Add space every BASES_PER_GROUP bases (except at the start)
        if (i > 0 && i % BASES_PER_GROUP === 0) {
          baseElements.push(<span key={`space-${lineIndex}-${i}`}> </span>);
        }
        
        // Render the base with appropriate styling and events
        if (feature) {
          baseElements.push(
            <TooltipProvider key={`base-${lineIndex}-${i}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="cursor-pointer font-mono"
                    style={{
                      backgroundColor: feature.color || '#4CAF50',
                      color: 'white',
                      padding: '0 0.5px'
                    }}
                    onClick={() => onFeatureClick?.(feature)}
                    onMouseDown={() => handleMouseDown(position)}
                    onMouseMove={() => handleMouseMove(position)}
                    onMouseUp={handleMouseUp}
                  >
                    {base}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">{feature.name}</p>
                  <p>{feature.type} ({feature.start}..{feature.end})</p>
                  {feature.notes && <p>{feature.notes}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        } else if (restrictionSite) {
          baseElements.push(
            <TooltipProvider key={`base-${lineIndex}-${i}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="cursor-pointer font-mono"
                    style={{ 
                      backgroundColor: '#F44336',
                      color: 'white',
                      padding: '0 0.5px'
                    }}
                    onClick={() => onRestrictionSiteClick?.(restrictionSite)}
                    onMouseDown={() => handleMouseDown(position)}
                    onMouseMove={() => handleMouseMove(position)}
                    onMouseUp={handleMouseUp}
                  >
                    {base}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">{restrictionSite.name}</p>
                  <p>Cut site: {restrictionSite.start + (restrictionSite.cutSite || 0)}</p>
                  <p>Sequence: {restrictionSite.sequence}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        } else {
          baseElements.push(
            <span 
              key={`base-${lineIndex}-${i}`}
              className={`font-mono ${isSelected ? 'bg-blue-200 dark:bg-blue-800' : ''}`}
              style={{ color: getBaseColor(base) }}
              onMouseDown={() => handleMouseDown(position)}
              onMouseMove={() => handleMouseMove(position)}
              onMouseUp={handleMouseUp}
            >
              {base}
            </span>
          );
        }
        
        currentPosition++;
      }
      
      return (
        <div key={`line-${lineIndex}`} className="whitespace-nowrap">
          {baseElements}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls
      <div className="flex gap-2 mb-4">
        <Button
          variant={view === 'regular' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('regular')}
        >
          Sequence
        </Button>
        <Button 
          variant={view === 'complement' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('complement')}
        >
          Complement
        </Button>
        <Button
          variant={view === 'translation' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setView('translation')}
        >
          Translation
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBaseColors(!baseColors)}
        >
          {baseColors ? 'Monochrome' : 'Color Bases'}
        </Button>
      </div> */}
      
      {/* Sequence display */}
      <Card className="flex-1 overflow-auto p-4">
        <div 
          ref={containerRef}
          className="font-mono text-sm"
        >
          {renderSequenceLines()}
        </div>
      </Card>
      
      {/* Selection info */}
      {selection && (
        <div className="mt-4 p-4 border rounded-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2">Selection</h3>
              <p className="text-sm">
                Position: {selection.start} to {selection.end} 
                (Length: {selection.end - selection.start + 1} bp)
              </p>
              <p className="text-sm font-mono mt-1 break-all whitespace-pre-wrap">
                {sequence.sequence.substring(selection.start - 1, selection.end)}
              </p>
            </div>
            <Button onClick={handleOpenFeatureDialog} className="ml-4 flex-shrink-0">
              Create Feature
            </Button>
          </div>
        </div>
      )}
      
      {/* Feature creation dialog */}
      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Feature</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-name" className="text-sm font-medium">
                Name*
              </label>
              <Input
                id="feature-name"
                value={newFeature.name || ''}
                onChange={(e) => setNewFeature({...newFeature, name: e.target.value})}
                placeholder="Feature name"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-type" className="text-sm font-medium">
                Type*
              </label>
              <select
                id="feature-type"
                value={newFeature.type || 'gene'}
                onChange={(e) => {
                  const type = e.target.value;
                  const color = featureTypes.find(ft => ft.type === type)?.color;
                  setNewFeature({...newFeature, type, color});
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                {featureTypes.map(type => (
                  <option key={type.type} value={type.type}>
                    {type.type}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <label htmlFor="feature-start" className="text-sm font-medium">
                  Start Position*
                </label>
                <Input
                  id="feature-start"
                  type="number"
                  min={1}
                  max={sequence.length}
                  value={newFeature.start || 1}
                  onChange={(e) => setNewFeature({...newFeature, start: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <label htmlFor="feature-end" className="text-sm font-medium">
                  End Position*
                </label>
                <Input
                  id="feature-end"
                  type="number"
                  min={1}
                  max={sequence.length}
                  value={newFeature.end || sequence.length}
                  onChange={(e) => setNewFeature({...newFeature, end: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-direction" className="text-sm font-medium">
                Direction
              </label>
              <select
                id="feature-direction"
                value={newFeature.direction || 'forward'}
                onChange={(e) => setNewFeature({...newFeature, direction: e.target.value as 'forward' | 'reverse'})}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                <option value="forward">Forward</option>
                <option value="reverse">Reverse</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFeature}>
              Add Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 