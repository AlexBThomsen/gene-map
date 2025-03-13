"use client"

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { SequenceFeature } from "@/app/lib/dna/types";
import type { DNASequence } from "@/app/lib/dna/types";
import { DNAHelix } from './modules/dna/DNAHelix';
import { DomainVisualizer } from './modules/features/DomainVisualizer';
import { StructuralInfo } from './modules/structural/StructuralInfo';
import { InteractionManager } from './modules/interactions/InteractionManager';
import { AnalysisManager } from './modules/analysis/AnalysisManager';
import { CameraManager } from './modules/interactions/CameraManager';
import { LightManager } from './modules/scene/LightManager';
import { MaterialManager } from './modules/scene/MaterialManager';
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { featureTypes } from "@/app/lib/dna/sequence-service"
import { toast } from "sonner"
import { Edit, Trash2, Plus, ZoomIn, ZoomOut, Dna, Home } from "lucide-react"

interface PlasmidMap3DProps {
  sequence: DNASequence;
  features: SequenceFeature[];
  selectedFeature: SequenceFeature | null | undefined;
  onFeatureClick?: (feature: SequenceFeature) => void;
}

export default function PlasmidMap3D({ sequence, features, selectedFeature, onFeatureClick }: PlasmidMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Three.js objects
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Module references
  const cameraManagerRef = useRef<CameraManager | undefined>(undefined);
  const lightManagerRef = useRef<LightManager | undefined>(undefined);
  const materialManagerRef = useRef<MaterialManager | undefined>(undefined);
  const dnaHelixRef = useRef<DNAHelix | undefined>(undefined);
  const domainVisualizerRef = useRef<DomainVisualizer | undefined>(undefined);
  const structuralInfoRef = useRef<StructuralInfo | undefined>(undefined);
  const interactionManagerRef = useRef<InteractionManager | undefined>(undefined);
  const analysisManagerRef = useRef<AnalysisManager | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const initScene = async () => {
      if (!containerRef.current) {
        console.log("Container ref not available, waiting for next render");
        return;
      }

      try {
        // Initialize Three.js scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Black background
        const renderer = new THREE.WebGLRenderer({ antialias: true });

        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        // Initialize managers
        const cameraManager = new CameraManager(containerRef.current, renderer);
        const lightManager = new LightManager(scene);
        const materialManager = new MaterialManager();

        lightManager.setPreset('scientific'); // Use scientific lighting preset

        // Initialize modules with materials
        const dnaHelix = new DNAHelix(sequence.sequence);
        const domainVisualizer = new DomainVisualizer(sequence.sequence.length);
        const structuralInfo = new StructuralInfo(sequence.sequence.length);
        const interactionManager = new InteractionManager(
          scene,
          cameraManager.getCamera(),
          cameraManager.getControls(),
          onFeatureClick
        );
        const analysisManager = new AnalysisManager(sequence.sequence, features || []);

        // Apply materials to DNA helix
        const dnaBackboneMaterial = materialManager.createMaterial('dnaBackbone', {
          metalness: 0.3,
          roughness: 0.7,
          transparent: true,
          opacity: 0.8
        });
        const basePairMaterial = materialManager.createMaterial('basePair', {
          metalness: 0.4,
          roughness: 0.6,
          transparent: true,
          opacity: 0.9
        });
        dnaHelix.setMaterials(dnaBackboneMaterial, basePairMaterial);

        // Position camera for better initial view
        const cameraDistance = Math.max(10, sequence.sequence.length * 0.1);
        cameraManager.getCamera().position.set(cameraDistance, cameraDistance, cameraDistance);
        cameraManager.getControls().target.set(0, sequence.sequence.length / 2 * 0.34, 0);
        cameraManager.getControls().update();

        // Add module groups to scene
        scene.add(dnaHelix.getGroup());
        scene.add(domainVisualizer.getGroup());
        scene.add(structuralInfo.getGroup());
        scene.add(interactionManager.getInteractionGroup());

        // Store references
        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraManagerRef.current = cameraManager;
        lightManagerRef.current = lightManager;
        materialManagerRef.current = materialManager;
        dnaHelixRef.current = dnaHelix;
        domainVisualizerRef.current = domainVisualizer;
        structuralInfoRef.current = structuralInfo;
        interactionManagerRef.current = interactionManager;
        analysisManagerRef.current = analysisManager;

        // Initial render
        updateScene();

        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing 3D scene:', err);
        if (mounted) {
          setError('Failed to initialize 3D view');
          setIsLoading(false);
        }
      }
    };

    const updateScene = () => {
      if (!sceneRef.current || !rendererRef.current || !cameraManagerRef.current) {
        return;
      }

      cameraManagerRef.current.update();
      rendererRef.current.render(
        sceneRef.current,
        cameraManagerRef.current.getCamera()
      );
      animationFrameRef.current = requestAnimationFrame(updateScene);
    };

    initScene();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (cameraManagerRef.current) {
        cameraManagerRef.current.dispose();
      }
      if (lightManagerRef.current) {
        lightManagerRef.current.dispose();
      }
      if (materialManagerRef.current) {
        materialManagerRef.current.dispose();
      }
      if (interactionManagerRef.current) {
        interactionManagerRef.current.dispose();
      }
    };
  }, [sequence.sequence.length, onFeatureClick]);

  // Update features when they change
  useEffect(() => {
    if (!domainVisualizerRef.current || !analysisManagerRef.current || !materialManagerRef.current || !features) return;

    // Clear existing features
    domainVisualizerRef.current.clear();

    // Create feature materials
    const featureMaterial = materialManagerRef.current.createMaterial('feature');
    const highlightMaterial = materialManagerRef.current.createMaterial('highlight');

    // Analyze and add new features
    features.forEach(feature => {
      const domain = {
        start: feature.start,
        end: feature.end,
        type: feature.type as 'binding' | 'regulatory' | 'transcription' | 'structural',
        protein: feature.name
      };
      domainVisualizerRef.current?.addProteinDomain(
        domain,
        feature,
        feature.id === selectedFeature?.id ? highlightMaterial : featureMaterial
      );
    });
  }, [features, selectedFeature]);

  // Update structural information when sequence changes
  useEffect(() => {
    if (!structuralInfoRef.current || !analysisManagerRef.current || !materialManagerRef.current) return;

    // Clear existing structural information
    structuralInfoRef.current.clear();

    // Create gradient material for structural properties
    const gradientMaterial = materialManagerRef.current.createGradientMaterial([
      0x3498db, // Blue for low values
      0xf1c40f, // Yellow for medium values
      0xe74c3c  // Red for high values
    ]);

    // Analyze sequence and add structural predictions
    const predictions = analysisManagerRef.current.predictStructuralElements();
    predictions.forEach(prediction => {
      const property = {
        start: prediction.position,
        end: prediction.position + 10, // Arbitrary length, adjust as needed
        type: prediction.type as 'bendability' | 'stability' | 'curvature' | 'torsionalStress',
        value: prediction.probability
      };
      structuralInfoRef.current?.addStructuralProperty(property, gradientMaterial);
    });
  }, [sequence]);

  // Update selected feature highlighting
  useEffect(() => {
    if (!domainVisualizerRef.current || !selectedFeature || !cameraManagerRef.current || !materialManagerRef.current) return;

    // Create pulsing material for selected feature
    const pulsingMaterial = materialManagerRef.current.createPulsingMaterial(
      0xf1c40f, // Base color (yellow)
      0xe74c3c, // Pulse color (red)
      2.0 // Duration in seconds
    );

    // Update the selected feature's material
    domainVisualizerRef.current.updateFeatureMaterial(selectedFeature.id, pulsingMaterial);

    // Focus camera on selected feature
    const featureCenter = new THREE.Vector3(
      (selectedFeature.start + selectedFeature.end) / 2,
      0,
      0
    );
    cameraManagerRef.current.focusOnPoint(featureCenter);

    // Animate lights for dramatic effect
    if (lightManagerRef.current) {
      lightManagerRef.current.setPreset('dramatic');
      lightManagerRef.current.animateLights(2000);
    }

    // Start material animation
    let startTime = performance.now();
    const animateMaterial = () => {
      if (!materialManagerRef.current) return;

      const currentTime = performance.now();
      const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
      materialManagerRef.current.updatePulsingMaterial(pulsingMaterial, elapsed);

      requestAnimationFrame(animateMaterial);
    };
    animateMaterial();
  }, [selectedFeature]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraManagerRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraManagerRef.current.resize(width, height);
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
      className="relative"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="text-lg font-semibold">Loading 3D view...</div>
        </div>
      )}
      
      {/* Camera Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => cameraManagerRef.current?.zoomTo(60)}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => cameraManagerRef.current?.zoomTo(90)}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => cameraManagerRef.current?.resetView()}
          title="Reset View"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>

      {/* Help Text */}
      <div className="absolute bottom-4 left-4 text-sm text-gray-500">
        <p>Mouse controls:</p>
        <ul className="list-disc list-inside">
          <li>Left click + drag to rotate</li>
          <li>Right click + drag to pan</li>
          <li>Scroll to zoom</li>
          <li>Click on features to select</li>
        </ul>
      </div>
    </div>
  );
}


