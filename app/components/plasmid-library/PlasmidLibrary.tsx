'use client';

import useSWR from 'swr';
import { DNASequence } from '@/app/lib/dna/types';
import PlasmidLibraryClient from './PlasmidLibraryClient';

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load plasmids');
  return res.json();
};

// Loading component
function PlasmidLibraryLoading() {
  return (
    <div className="text-center text-muted-foreground p-4">
      Loading plasmid library...
    </div>
  );
}

// Error component
function PlasmidLibraryError({ error }: { error: Error }) {
  return (
    <div className="text-center text-red-500 p-4">
      Error loading plasmids: {error.message}
    </div>
  );
}

interface PlasmidLibraryProps {
  onSelectPlasmid: (sequence: DNASequence) => void;
}

export default function PlasmidLibrary({ onSelectPlasmid }: PlasmidLibraryProps) {
  const { data: plasmids, error, isLoading } = useSWR<{[category: string]: DNASequence[]}>(
    '/api/plasmids',
    fetcher,
    {
      revalidateOnFocus: false, // Don't revalidate when window regains focus
      revalidateIfStale: false, // Don't revalidate if data is stale
      dedupingInterval: 60000, // Dedupe requests within 1 minute
    }
  );

  if (isLoading) {
    return <PlasmidLibraryLoading />;
  }

  if (error) {
    return <PlasmidLibraryError error={error} />;
  }

  if (!plasmids || Object.keys(plasmids).length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        No plasmids found in the library.
      </div>
    );
  }

  return (
    <PlasmidLibraryClient 
      plasmids={plasmids} 
      onSelectPlasmid={onSelectPlasmid} 
    />
  );
} 
