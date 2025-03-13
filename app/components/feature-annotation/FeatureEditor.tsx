'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DNASequence, SequenceFeature } from '@/app/lib/dna/types';
import { featureTypes } from '@/app/lib/dna/sequence-service';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface FeatureEditorProps {
  sequence: DNASequence | null;
  onSequenceUpdate: (updatedSequence: DNASequence) => void;
  selectedFeature?: SequenceFeature | null;
  onFeatureSelect?: (feature: SequenceFeature | null) => void;
}

export default function FeatureEditor({ 
  sequence, 
  onSequenceUpdate,
  selectedFeature,
  onFeatureSelect
}: FeatureEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [featureData, setFeatureData] = useState<Partial<SequenceFeature>>({
    name: '',
    type: 'gene',
    start: 1,
    end: sequence?.length || 1,
    direction: 'forward',
    color: '#4CAF50',
    notes: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  // Open dialog for adding a new feature
  const handleAddFeature = () => {
    setFeatureData({
      name: '',
      type: 'gene',
      start: 1,
      end: sequence?.length || 1,
      direction: 'forward',
      color: featureTypes.find(ft => ft.type === 'gene')?.color || '#4CAF50',
      notes: ''
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  // Open dialog for editing an existing feature
  const handleEditFeature = (feature: SequenceFeature) => {
    setFeatureData({ ...feature });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (name === 'start' || name === 'end') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 1) return;
      
      // Ensure end is not less than start
      if (name === 'end' && numValue < (featureData.start || 1)) return;
      
      // Ensure values don't exceed sequence length
      if (sequence && numValue > sequence.length) return;
      
      setFeatureData({ ...featureData, [name]: numValue });
    } else {
      setFeatureData({ ...featureData, [name]: value });
    }
    
    // Update color based on type selection
    if (name === 'type') {
      const selectedType = featureTypes.find(ft => ft.type === value);
      if (selectedType) {
        setFeatureData(prev => ({ ...prev, color: selectedType.color }));
      }
    }
  };

  // Save feature
  const handleSaveFeature = () => {
    if (!sequence) return;
    
    if (!featureData.name || !featureData.type || !featureData.start || !featureData.end) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Create a new feature or update existing one
    const newFeature: SequenceFeature = {
      id: isEditing && featureData.id ? featureData.id : uuidv4(),
      name: featureData.name || 'Unnamed Feature',
      type: featureData.type || 'gene',
      start: featureData.start || 1,
      end: featureData.end || sequence.length,
      direction: featureData.direction || 'forward',
      color: featureData.color,
      notes: featureData.notes
    } as SequenceFeature;
    
    // Update the sequence
    let updatedFeatures: SequenceFeature[];
    
    if (isEditing) {
      // Replace the existing feature
      updatedFeatures = sequence.features.map(f => 
        f.id === newFeature.id ? newFeature : f
      );
    } else {
      // Add a new feature
      updatedFeatures = [...sequence.features, newFeature];
    }
    
    const updatedSequence: DNASequence = {
      ...sequence,
      features: updatedFeatures
    };
    
    // Update the sequence
    onSequenceUpdate(updatedSequence);
    
    // Close the dialog
    setIsDialogOpen(false);
    
    // Show success message
    toast.success(isEditing ? 'Feature updated' : 'Feature added');
  };

  // Delete feature
  const handleDeleteFeature = (featureId: string) => {
    if (!sequence) return;
    
    const updatedFeatures = sequence.features.filter(f => f.id !== featureId);
    
    const updatedSequence: DNASequence = {
      ...sequence,
      features: updatedFeatures
    };
    
    // Update the sequence
    onSequenceUpdate(updatedSequence);
    
    // Clear selection if the deleted feature was selected
    if (selectedFeature && selectedFeature.id === featureId) {
      onFeatureSelect?.(null);
    }
    
    // Show success message
    toast.success('Feature deleted');
  };

  if (!sequence) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-center text-muted-foreground">
          No sequence loaded
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Features</h2>
        <Button onClick={handleAddFeature}>Add Feature</Button>
      </div>
      
      {/* Features list */}
      <Card className="flex-1 overflow-auto p-4">
        {sequence.features.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No features added yet
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {sequence.features.map(feature => (
              <div 
                key={feature.id}
                className={`p-3 border rounded-md ${
                  selectedFeature?.id === feature.id ? 'border-primary bg-primary/10' : ''
                }`}
                onClick={() => onFeatureSelect?.(feature)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: feature.color || '#4CAF50' }}
                    />
                    <span className="font-medium">{feature.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFeature(feature);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFeature(feature.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {feature.type} ({feature.start}..{feature.end}, {feature.direction})
                </div>
                {feature.notes && (
                  <div className="text-sm mt-1 truncate">
                    {feature.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* Feature edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Feature' : 'Add Feature'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update the details of this feature' 
                : 'Add a new feature to your sequence'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-name" className="text-sm font-medium">
                Name*
              </label>
              <Input
                id="feature-name"
                name="name"
                value={featureData.name || ''}
                onChange={handleInputChange}
                placeholder="e.g., lacZ"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-type" className="text-sm font-medium">
                Type*
              </label>
              <select
                id="feature-type"
                name="type"
                value={featureData.type || 'gene'}
                onChange={handleInputChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                  name="start"
                  type="number"
                  min={1}
                  max={sequence.length}
                  value={featureData.start || 1}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <label htmlFor="feature-end" className="text-sm font-medium">
                  End Position*
                </label>
                <Input
                  id="feature-end"
                  name="end"
                  type="number"
                  min={featureData.start || 1}
                  max={sequence.length}
                  value={featureData.end || sequence.length}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-direction" className="text-sm font-medium">
                Direction
              </label>
              <select
                id="feature-direction"
                name="direction"
                value={featureData.direction || 'forward'}
                onChange={handleInputChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="forward">Forward</option>
                <option value="reverse">Reverse</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-color" className="text-sm font-medium">
                Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  id="feature-color"
                  name="color"
                  type="color"
                  value={featureData.color || '#4CAF50'}
                  onChange={handleInputChange}
                  className="w-10 h-10 rounded-md cursor-pointer"
                />
                <span className="text-sm">{featureData.color}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="feature-notes"
                name="notes"
                value={featureData.notes || ''}
                onChange={handleInputChange}
                placeholder="Additional information about this feature"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFeature}>
              {isEditing ? 'Update' : 'Add'} Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 