'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DNASequence } from '@/app/lib/dna/types';
import { parseFasta, parseGenBank } from '@/app/lib/dna/sequence-service';
import { toast } from 'sonner';

interface FileImportProps {
  onSequenceImport: (sequence: DNASequence) => void;
}

export default function FileImport({ onSequenceImport }: FileImportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fileContents, setFileContents] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importType, setImportType] = useState<'fasta' | 'genbank'>('fasta');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Detect file type based on extension
    if (file.name.endsWith('.gb') || file.name.endsWith('.gbk') || file.name.endsWith('.genbank')) {
      setImportType('genbank');
    } else {
      setImportType('fasta');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target?.result as string;
      setFileContents(contents);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!fileContents) {
      toast.error('No file contents to import');
      return;
    }

    try {
      let sequence: DNASequence;

      if (importType === 'fasta') {
        sequence = parseFasta(fileContents);
      } else {
        sequence = parseGenBank(fileContents);
      }

      // Pass the parsed sequence back to the parent component
      onSequenceImport(sequence);
      
      // Show success message
      toast.success(`Successfully imported ${sequence.name}`);
      
      // Close the dialog
      setIsDialogOpen(false);
      
      // Reset state
      setFileContents(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse the file. Please check the format.');
    }
  };

  const handlePasteSequence = () => {
    if (!fileContents) {
      toast.error('No sequence to import');
      return;
    }

    try {
      // For pasted sequence, assume it's just raw DNA with no headers
      const sequence: DNASequence = {
        id: crypto.randomUUID(),
        name: 'Pasted Sequence',
        sequence: fileContents.replace(/[\s\n\r]/g, ''), // Remove whitespace
        features: [],
        restrictionSites: [],
        primers: [],
        circular: false,
        length: fileContents.replace(/[\s\n\r]/g, '').length,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Pass the sequence to the parent
      onSequenceImport(sequence);
      
      // Show success message
      toast.success('Successfully imported pasted sequence');
      
      // Close the dialog
      setIsDialogOpen(false);
      
      // Reset state
      setFileContents(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error parsing pasted sequence:', error);
      toast.error('Failed to process the pasted sequence.');
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Import Sequence</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import DNA Sequence</DialogTitle>
          <DialogDescription>
            Upload a FASTA or GenBank file, or paste raw sequence data
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="file-upload" className="text-sm font-medium">
              Upload File
            </label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".fasta,.fa,.gb,.gbk,.genbank"
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: FASTA (.fasta, .fa) and GenBank (.gb, .gbk, .genbank)
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="paste-sequence" className="text-sm font-medium">
              Or Paste Sequence
            </label>
            <textarea
              id="paste-sequence"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Paste DNA sequence or FASTA/GenBank format here"
              onChange={(e) => setFileContents(e.target.value)}
            />
          </div>
          
          {fileName && (
            <div className="text-sm">
              <span className="font-medium">Selected file:</span> {fileName}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <div>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePasteSequence}>
              Import Pasted
            </Button>
            <Button onClick={handleImport} disabled={!fileContents}>
              Import File
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 