"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { DNASequence, SequenceFeature, RestrictionSite } from "@/app/lib/dna/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { featureTypes } from "@/app/lib/dna/sequence-service"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Plus, ZoomIn, ZoomOut, RotateCcw, Dna, Box, Scissors, Copy, Wand2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"
import { useClickOutside } from "../../hooks/use-click-outside"
// import PlasmidMap3D from "./PlasmidMap3D"

interface PlasmidMapProps {
  sequence: DNASequence | null
  onFeatureClick?: (feature: SequenceFeature) => void
  onRestrictionSiteClick?: (site: RestrictionSite) => void
  onAddFeature?: (feature: SequenceFeature) => void
  onUpdateFeature?: (feature: SequenceFeature) => void
  onDeleteFeature?: (featureId: string) => void
  onSequenceUpdate?: (sequence: string) => void
  selectedFeature?: SequenceFeature | null
  onAddFeatures?: (features: SequenceFeature[]) => void
}

export default function PlasmidMap({
  sequence,
  onFeatureClick,
  onRestrictionSiteClick,
  onAddFeature,
  onUpdateFeature,
  onDeleteFeature,
  onSequenceUpdate,
  selectedFeature,
  onAddFeatures,
}: PlasmidMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 })
  const [hoveredElement, setHoveredElement] = useState<{
    type: string
    name: string
    featureType?: string
    position?: string
  } | null>(null)
  
  // Selection state for click and drag
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [mousePosition, setMousePosition] = useState<number | null>(null)

  // Feature editor dialog
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false)
  const [editFeature, setEditFeature] = useState<Partial<SequenceFeature>>({
    name: "",
    type: "gene",
    direction: "forward",
    color: featureTypes.find((ft) => ft.type === "gene")?.color,
  })

  // Context menu for features
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    item: SequenceFeature | RestrictionSite | null
    type: "feature" | "restriction"
  }>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
    type: "feature",
  })

  // Zoom and rotation controls
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)

  // View options
  const [viewOptions, setViewOptions] = useState({
    showFeatures: true,
    showRestrictionSites: true,
    showPositionMarkers: true,
    showLabels: true,
  })

  // Active tab for info panel
  const [activeTab, setActiveTab] = useState("features")

  // Add new state for selection menu
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean
    x: number
    y: number
    start: number
    end: number
  }>({
    visible: false,
    x: 0,
    y: 0,
    start: 0,
    end: 0
  })

  // Add ref for selection menu
  const selectionMenuRef = useRef<HTMLDivElement>(null)

  // Add ref for context menu
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Handle click outside for selection menu
  useClickOutside(selectionMenuRef, () => {
    if (selectionMenu.visible) {
      setSelectionMenu(prev => ({ ...prev, visible: false }))
      setSelectionStart(null)
      setSelectionEnd(null)
    }
  })

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionMenu.visible) {
        setSelectionMenu(prev => ({ ...prev, visible: false }))
        setSelectionStart(null)
        setSelectionEnd(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [selectionMenu.visible])

  // Handle click outside for context menu
  useClickOutside(contextMenuRef, () => {
    if (contextMenu.visible) {
      setContextMenu(prev => ({ ...prev, visible: false }))
    }
  })

  // Add escape key handler for context menu
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [contextMenu.visible])

  // Add state for cut animation
  const [isCutting, setIsCutting] = useState(false)

  // Debounce utility function
  const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  useEffect(() => {
    // Update dimensions based on container size
    const updateDimensions = () => {
      if (svgRef.current && svgRef.current.parentElement) {
        const { width, height } = svgRef.current.parentElement.getBoundingClientRect()
        const size = Math.min(width - 40, height - 40) // Add some padding
        setDimensions((prev) => {
          // Only update if dimensions actually changed
          if (prev.width !== size || prev.height !== size) {
            return { width: size, height: size }
          }
          return prev
        })
      }
    }

    // Debounced version of updateDimensions
    const debouncedUpdateDimensions = debounce(updateDimensions, 200)

    // Initial dimension setting
    updateDimensions()
    window.addEventListener("resize", debouncedUpdateDimensions)

    return () => {
      window.removeEventListener("resize", debouncedUpdateDimensions)
    }
  }, [sequence]) // Only run when sequence changes

  const [isAutoAnnotating, setIsAutoAnnotating] = useState(false)

  // Add auto-annotate function
  const handleAutoAnnotate = async () => {
    if (!sequence) return
    
    try {
      setIsAutoAnnotating(true)
      const response = await fetch('/api/plasmids/auto-annotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sequence: sequence.sequence }),
      })

      if (!response.ok) {
        throw new Error('Failed to auto-annotate sequence')
      }

      const { features, count } = await response.json()
      
      if (count === 0) {
        toast.info('No matching features found in the library')
        return
      }

      onAddFeatures?.(features)
      toast.success(`Added ${count} features from library matches`)
    } catch (error) {
      console.error('Auto-annotation error:', error)
      toast.error('Failed to auto-annotate sequence')
    } finally {
      setIsAutoAnnotating(false)
    }
  }

  if (!sequence) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Dna className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-center text-muted-foreground">No sequence loaded</p>
      </div>
    )
  }

  // Calculate the center and radius for the SVG
  const center = dimensions.width / 2
  const baseRadius = dimensions.width * 0.35 // Plasmid circle radius
  const radius = baseRadius * zoomLevel
  const innerRadius = radius - 5 // Inner circle for double-stranded representation
  const featureRadius = radius + 20 // Radius for feature annotations
  const restrictionRadius = radius - 15 // Radius for restriction sites

  // Function to convert sequence position to angle (in radians)
  const positionToAngle = (position: number) => {
    return ((position / sequence.length) * 2 * Math.PI - Math.PI / 2 + (rotation * Math.PI) / 180) % (2 * Math.PI)
  }

  // Function to convert angle to sequence position
  const angleToPosition = (angle: number) => {
    let adjustedAngle = (angle + Math.PI / 2 - (rotation * Math.PI) / 180) % (2 * Math.PI)
    if (adjustedAngle < 0) adjustedAngle += 2 * Math.PI
    const position = Math.round((adjustedAngle / (2 * Math.PI)) * sequence.length)
    return Math.max(0, Math.min(position, sequence.length - 1))
  }

  // Function to convert polar coordinates to Cartesian
  const polarToCartesian = (angle: number, r: number) => {
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  // Function to calculate angle from mouse coordinates
  const calculateAngleFromMouse = (x: number, y: number) => {
    const dx = x - center
    const dy = y - center
    return Math.atan2(dy, dx)
  }

  // Handle mouse events for selection
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!svgRef.current) return

    const svgRect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - svgRect.left
    const y = e.clientY - svgRect.top

    const angle = calculateAngleFromMouse(x, y)
    const distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2))

    if (contextMenu.visible) {
      setContextMenu((prev) => ({ ...prev, visible: false }))
      return
    }

    // Only check if we're clicking near the plasmid circle
    if (Math.abs(distance - radius) < 15) {
      const position = angleToPosition(angle)
      setSelectionStart(position)
      setSelectionEnd(position)
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return

    const svgRect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - svgRect.left
    const y = e.clientY - svgRect.top

    const angle = calculateAngleFromMouse(x, y)
    const position = angleToPosition(angle)

    setMousePosition(position)

    if (isDragging && selectionStart !== null) {
      setSelectionEnd(position)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && selectionStart !== null && selectionEnd !== null) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        setSelectionMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          start: Math.min(selectionStart, selectionEnd) + 1,
          end: Math.max(selectionStart, selectionEnd) + 1
        })
      }
    }
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Handle adding a new feature
  const handleAddFeature = () => {
    if (!sequence) return

    if (!editFeature.name || !editFeature.type || !editFeature.start || !editFeature.end) {
      toast.error("Name, type, and positions are required")
      return
    }

    const feature: SequenceFeature = {
      id: editFeature.id || uuidv4(),
      name: editFeature.name || "",
      type: editFeature.type || "gene",
      start: editFeature.start || 1,
      end: editFeature.end || sequence.length,
      direction: editFeature.direction || "forward",
      color: editFeature.color || featureTypes.find((ft) => ft.type === editFeature.type)?.color || "#4CAF50",
      notes: editFeature.notes,
    }

    onAddFeature?.(feature)
    setIsFeatureDialogOpen(false)
    setSelectionStart(null)
    setSelectionEnd(null)
    setEditFeature({
      name: "",
      type: "gene",
      direction: "forward",
      color: featureTypes.find((ft) => ft.type === "gene")?.color,
    })
  }

  // Handle feature click to show context menu
  const handleFeatureClick = (feature: SequenceFeature, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    onFeatureClick?.(feature)

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item: feature,
      type: "feature",
    })
  }

  // Handle restriction site click
  const handleRestrictionSiteClick = (site: RestrictionSite, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    onRestrictionSiteClick?.(site)

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item: site,
      type: "restriction",
    })
  }

  // Open the feature edit dialog with pre-filled data
  const handleEditFeature = () => {
    if (!contextMenu.item || contextMenu.type !== "feature") return

    setEditFeature({
      ...(contextMenu.item as SequenceFeature),
    })
    setIsFeatureDialogOpen(true)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // Delete the active feature
  const handleDeleteFeature = () => {
    if (!contextMenu.item || contextMenu.type !== "feature") return

    onDeleteFeature?.((contextMenu.item as SequenceFeature).id)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // Save feature changes
  const handleSaveFeature = () => {
    if (!sequence) return

    if (!editFeature.name || !editFeature.type || !editFeature.start || !editFeature.end) {
      toast.error("Name, type, and positions are required")
      return
    }

    if (editFeature.id) {
      const updatedFeature: SequenceFeature = {
        id: editFeature.id,
        name: editFeature.name,
        type: editFeature.type,
        start: editFeature.start,
        end: editFeature.end,
        direction: editFeature.direction || "forward",
        color: editFeature.color || featureTypes.find((ft) => ft.type === editFeature.type)?.color || "#4CAF50",
        notes: editFeature.notes,
      }

      onUpdateFeature?.(updatedFeature)
    } else {
      const newFeature: SequenceFeature = {
        id: uuidv4(),
        name: editFeature.name,
        type: editFeature.type,
        start: editFeature.start,
        end: editFeature.end,
        direction: editFeature.direction || "forward",
        color: editFeature.color || featureTypes.find((ft) => ft.type === editFeature.type)?.color || "#4CAF50",
        notes: editFeature.notes,
      }

      onAddFeature?.(newFeature)
    }

    setIsFeatureDialogOpen(false)
  }

  // Update feature form fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === "start" || name === "end") {
      const numValue = Number.parseInt(value)
      if (isNaN(numValue) || numValue < 1) return
      if (sequence && numValue > sequence.length) return
      setEditFeature({ ...editFeature, [name]: numValue })
    } else {
      setEditFeature({ ...editFeature, [name]: value })
    }

    if (name === "type") {
      const selectedType = featureTypes.find((ft) => ft.type === value)
      if (selectedType) {
        setEditFeature((prev) => ({ ...prev, color: selectedType.color }))
      }
    }
  }

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }

  const handleResetView = () => {
    setZoomLevel(1)
    setRotation(0)
  }

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360)
  }

  // Add handlers for selection actions
  const handleCutSelection = async () => {
    if (!sequence) return
    
    setIsCutting(true)
    
    const beforeCut = sequence.sequence.slice(0, selectionMenu.start - 1)
    const afterCut = sequence.sequence.slice(selectionMenu.end)
    const newSequence = beforeCut + afterCut
    
    const bpRemoved = selectionMenu.end - selectionMenu.start + 1
    
    setTimeout(() => {
      onSequenceUpdate?.(newSequence)
      
      if (sequence) {
        sequence.sequence = newSequence
        sequence.length = newSequence.length
        
        sequence.features = sequence.features.map(feature => {
          if (feature.start > selectionMenu.end) {
            return {
              ...feature,
              start: feature.start - bpRemoved,
              end: feature.end - bpRemoved
            }
          } else if (feature.end > selectionMenu.start) {
            if (feature.start < selectionMenu.start) {
              return {
                ...feature,
                end: selectionMenu.start - 1
              }
            } else {
              return null
            }
          }
          return feature
        }).filter(Boolean) as SequenceFeature[]

        sequence.restrictionSites = sequence.restrictionSites.map(site => {
          if (site.start > selectionMenu.end) {
            return {
              ...site,
              start: site.start - bpRemoved
            }
          } else if (site.start >= selectionMenu.start && site.start <= selectionMenu.end) {
            return null
          }
          return site
        }).filter(Boolean) as RestrictionSite[]
      }
      
      setIsCutting(false)
      setSelectionMenu(prev => ({ ...prev, visible: false }))
      setSelectionStart(null)
      setSelectionEnd(null)
      
      toast.success(`Removed ${bpRemoved} bp from sequence`)
    }, 800)
  }

  const handleCopySelection = async () => {
    if (!sequence) return
    
    const selectedDNA = sequence.sequence.slice(selectionMenu.start - 1, selectionMenu.end)
    
    try {
      await navigator.clipboard.writeText(selectedDNA)
      toast.success(`Copied ${selectedDNA.length} bp to clipboard`)
      setSelectionMenu(prev => ({ ...prev, visible: false }))
      setSelectionStart(null)
      setSelectionEnd(null)
    } catch (err) {
      toast.error("Failed to copy selection")
    }
  }

  const handleCreateFeature = () => {
    setEditFeature({
      id: undefined,
      name: "",
      type: "gene",
      direction: "forward",
      color: featureTypes.find((ft) => ft.type === "gene")?.color,
      start: selectionMenu.start,
      end: selectionMenu.end,
    })
    setIsFeatureDialogOpen(true)
    setSelectionMenu(prev => ({ ...prev, visible: false }))
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  // Draw the features as arcs
  const renderFeatures = () => {
    if (!viewOptions.showFeatures) return null

    // Group overlapping features and assign layers
    const featureLayers = sequence.features.reduce((acc, feature) => {
      let layerIndex = 0
      while (true) {
        const layer = acc[layerIndex] || []
        const hasOverlap = layer.some(existingFeature => {
          if (feature.start > feature.end) {
            return !(existingFeature.end < feature.start && existingFeature.start > feature.end)
          } else if (existingFeature.start > existingFeature.end) {
            return !(feature.end < existingFeature.start && feature.start > existingFeature.end)
          }
          return !(feature.end < existingFeature.start || feature.start > existingFeature.end)
        })

        if (!hasOverlap) {
          if (!acc[layerIndex]) acc[layerIndex] = []
          acc[layerIndex].push(feature)
          break
        }
        layerIndex++
      }
      return acc
    }, [] as SequenceFeature[][])

    return featureLayers.flatMap((layer, layerIndex) => {
      return layer.map((feature) => {
        const startAngle = positionToAngle(feature.start - 1)
        const endAngle = positionToAngle(feature.end - 1)
        const isWrappingFeature = feature.start > feature.end
        const largeArcFlag = isWrappingFeature || feature.end - feature.start > sequence.length / 2 ? 1 : 0
        const isSmallFeature = !isWrappingFeature && (feature.end - feature.start) / sequence.length < 0.01
        const isSelected = selectedFeature?.id === feature.id ||
          (contextMenu.visible && contextMenu.type === "feature" && (contextMenu.item as SequenceFeature)?.id === feature.id)
        const fillColor = feature.color || "#4CAF50"
        const strokeColor = isSelected ? "#FFF" : "transparent"
        const strokeWidth = isSelected ? 2 : 0
        const opacity = isSelected ? 1 : 0.85

        // Adjust radius based on layer
        const layerOffset = layerIndex * 20
        const featureInnerRadius = radius + 15 + layerOffset
        const featureOuterRadius = radius + 30 + layerOffset

        if (isSmallFeature) {
          const midPoint = polarToCartesian(
            positionToAngle((feature.start + feature.end) / 2 - 1),
            featureOuterRadius - 5
          )

          return (
            <g
              key={feature.id}
              onMouseEnter={() =>
                setHoveredElement({
                  type: "Feature",
                  name: feature.name,
                  featureType: feature.type,
                  position: `${feature.start}..${feature.end}`,
                })
              }
              onMouseLeave={() => setHoveredElement(null)}
              onClick={(e) => handleFeatureClick(feature, e)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={midPoint.x} cy={midPoint.y} r={10} fill="transparent" style={{ pointerEvents: "all" }} />
              <circle
                cx={midPoint.x}
                cy={midPoint.y}
                r={5}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                pointerEvents="none"
              />
            </g>
          )
        }

        const startOuter = polarToCartesian(startAngle, featureOuterRadius)
        const endOuter = polarToCartesian(endAngle, featureOuterRadius)
        const startInner = polarToCartesian(startAngle, featureInnerRadius)
        const endInner = polarToCartesian(endAngle, featureInnerRadius)

        const path = `
          M ${startOuter.x} ${startOuter.y}
          A ${featureOuterRadius} ${featureOuterRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}
          L ${endInner.x} ${endInner.y}
          A ${featureInnerRadius} ${featureInnerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}
          Z
        `

        const midAngle = startAngle < endAngle
          ? (startAngle + endAngle) / 2
          : ((startAngle + endAngle + 2 * Math.PI) / 2) % (2 * Math.PI)
        const labelPoint = polarToCartesian(midAngle, featureOuterRadius + 15)
        const labelRotation = (midAngle * 180) / Math.PI + 90
        let adjustedRotation = labelRotation
        let textAnchor = "middle"

        if (adjustedRotation > 90 && adjustedRotation < 270) {
          adjustedRotation += 180
          textAnchor = "middle"
        }

        return (
          <g
            key={feature.id}
            onMouseEnter={() =>
              setHoveredElement({
                type: "Feature",
                name: feature.name,
                featureType: feature.type,
                position: `${feature.start}..${feature.end}`,
              })
            }
            onMouseLeave={() => setHoveredElement(null)}
            onClick={(e) => handleFeatureClick(feature, e)}
            style={{ cursor: "pointer" }}
          >
            <path d={path} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
            {viewOptions.showLabels && ((feature.end - feature.start) / sequence.length > 0.02 || isWrappingFeature) && (
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={textAnchor}
                alignmentBaseline="middle"
                fontSize="10"
                fill="currentColor"
                transform={`rotate(${adjustedRotation}, ${labelPoint.x}, ${labelPoint.y})`}
                pointerEvents="none"
              >
                {feature.name}
              </text>
            )}
          </g>
        )
      })
    })
  }

  // Group restriction sites that are close to each other
  const groupRestrictionSites = () => {
    if (!sequence.restrictionSites.length) return []

    const sortedSites = [...sequence.restrictionSites].sort((a, b) => a.start - b.start)
    const minAngleDistance = 2 * Math.PI * (50 / sequence.length)
    const groups: RestrictionSite[][] = []
    let currentGroup: RestrictionSite[] = [sortedSites[0]]

    for (let i = 1; i < sortedSites.length; i++) {
      const prevSite = sortedSites[i - 1]
      const currentSite = sortedSites[i]
      const prevAngle = positionToAngle(prevSite.start - 1)
      const currentAngle = positionToAngle(currentSite.start - 1)
      let angleDiff = Math.abs(currentAngle - prevAngle)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff

      if (angleDiff < minAngleDistance) {
        currentGroup.push(currentSite)
      } else {
        groups.push(currentGroup)
        currentGroup = [currentSite]
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups
  }

  // Draw the restriction sites as markers with improved labels
  const renderRestrictionSites = () => {
    if (!viewOptions.showRestrictionSites) return null

    const siteGroups = groupRestrictionSites()

    return siteGroups.map((group, groupIndex) => {
      if (group.length === 1) {
        const site = group[0]
        const angle = positionToAngle(site.start - 1)
        const innerPoint = polarToCartesian(angle, radius - 5)
        const outerPoint = polarToCartesian(angle, radius - 20)
        const labelPoint = polarToCartesian(angle, radius - 35)
        const labelRotation = (angle * 180) / Math.PI + 90
        let adjustedRotation = labelRotation
        if (adjustedRotation > 90 && adjustedRotation < 270) {
          adjustedRotation += 180
        }

        return (
          <g
            key={site.id}
            onMouseEnter={() =>
              setHoveredElement({
                type: "Restriction Site",
                name: site.name,
                position: `${site.start}`,
              })
            }
            onMouseLeave={() => setHoveredElement(null)}
            onClick={(e) => handleRestrictionSiteClick(site, e)}
            style={{ cursor: "pointer" }}
          >
            <line
              x1={innerPoint.x}
              y1={innerPoint.y}
              x2={outerPoint.x}
              y2={outerPoint.y}
              stroke="red"
              strokeWidth="1.5"
            />
            {viewOptions.showLabels && (
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="9"
                fontWeight="bold"
                fill="red"
                transform={`rotate(${adjustedRotation}, ${labelPoint.x}, ${labelPoint.y})`}
              >
                {site.name}
              </text>
            )}
            {viewOptions.showLabels && (
              <text
                x={labelPoint.x}
                y={labelPoint.y + 12}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="8"
                fill="currentColor"
                transform={`rotate(${adjustedRotation}, ${labelPoint.x}, ${labelPoint.y + 12})`}
              >
                ({site.start})
              </text>
            )}
          </g>
        )
      } else {
        const avgAngle = group.reduce((sum, site) => sum + positionToAngle(site.start - 1), 0) / group.length
        const innerPoint = polarToCartesian(avgAngle, radius - 5)
        const outerPoint = polarToCartesian(avgAngle, radius - 20)
        const labelPoint = polarToCartesian(avgAngle, radius - 35)
        const labelRotation = (avgAngle * 180) / Math.PI + 90
        let adjustedRotation = labelRotation
        if (adjustedRotation > 90 && adjustedRotation < 270) {
          adjustedRotation += 180
        }

        return (
          <g
            key={`group-${groupIndex}`}
            onMouseEnter={() =>
              setHoveredElement({
                type: "Restriction Sites",
                name: `${group.length} sites`,
                position: group.map((s) => s.name).join(", "),
              })
            }
            onMouseLeave={() => setHoveredElement(null)}
            style={{ cursor: "pointer" }}
          >
            <line
              x1={innerPoint.x}
              y1={innerPoint.y}
              x2={outerPoint.x}
              y2={outerPoint.y}
              stroke="red"
              strokeWidth="3"
            />
            <circle cx={outerPoint.x} cy={outerPoint.y} r={4} fill="red" stroke="white" strokeWidth="1" />
            {viewOptions.showLabels && (
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="9"
                fontWeight="bold"
                fill="red"
                transform={`rotate(${adjustedRotation}, ${labelPoint.x}, ${labelPoint.y})`}
              >
                {group.length} sites
              </text>
            )}
            {viewOptions.showLabels && (
              <text
                x={labelPoint.x}
                y={labelPoint.y + 12}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="8"
                fill="currentColor"
                transform={`rotate(${adjustedRotation}, ${labelPoint.x}, ${labelPoint.y + 12})`}
              >
                {group
                  .slice(0, 2)
                  .map((s) => s.name)
                  .join(", ")}
                {group.length > 2 ? "..." : ""}
              </text>
            )}
          </g>
        )
      }
    })
  }

  // Draw the base position markers (every 1000bp)
  const renderPositionMarkers = () => {
    if (!viewOptions.showPositionMarkers) return null

    const marks = []
    const step = Math.max(Math.floor(sequence.length / 8), 500)

    for (let i = step; i < sequence.length; i += step) {
      const angle = positionToAngle(i)
      const innerPoint = polarToCartesian(angle, radius - 15)
      const outerPoint = polarToCartesian(angle, radius - 5)
      const labelPoint = polarToCartesian(angle, radius - 25)
      const labelRotation = (angle * 180) / Math.PI + 90
      let adjustedRotation = labelRotation
      if (adjustedRotation > 90 && adjustedRotation < 270) {
        adjustedRotation += 180
      }

      marks.push(
        <g key={`mark-${i}`}>
          <line
            x1={innerPoint.x}
            y1={innerPoint.y}
            x2={outerPoint.x}
            y2={outerPoint.y}
            stroke="currentColor"
            strokeWidth="1"
          />
          {viewOptions.showLabels && (
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize="10"
              fill="currentColor"
              transform={`rotate(${adjustedRotation}, ${labelPoint.x}, ${labelPoint.y})`}
            >
              {i}
            </text>
          )}
        </g>
      )
    }

    return marks
  }

  // Render start/end points with special highlighting
  const renderStartEndPoints = () => {
    const startAngle = positionToAngle(0)
    const startPoint = polarToCartesian(startAngle, radius)
    const startLabelPoint = polarToCartesian(startAngle, radius - 25)
    const startLabelRotation = (startAngle * 180 / Math.PI) + 90
    let adjustedStartRotation = startLabelRotation
    if (adjustedStartRotation > 90 && adjustedStartRotation < 270) {
      adjustedStartRotation += 180
    }

    return (
      <g>
        <circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={4}
          fill="#00AA00"
          stroke="white"
          strokeWidth="1"
        />
        {viewOptions.showLabels && (
          <text
            x={startLabelPoint.x}
            y={startLabelPoint.y}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#00AA00"
            transform={`rotate(${adjustedStartRotation}, ${startLabelPoint.x}, ${startLabelPoint.y})`}
          >
            Start (1)
          </text>
        )}
      </g>
    )
  }

  // Render the selection arc
  const renderSelection = () => {
    if (selectionStart === null || selectionEnd === null) return null

    const startAngle = positionToAngle(selectionStart)
    const endAngle = positionToAngle(selectionEnd)
    const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0
    const sweepFlag = 1
    const startPoint = polarToCartesian(startAngle, radius)
    const endPoint = polarToCartesian(endAngle, radius)

    const arcPath = `
      M ${startPoint.x} ${startPoint.y}
      A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endPoint.x} ${endPoint.y}
    `
    const filledPath = `
      ${arcPath}
      L ${center} ${center}
      Z
    `

    return (
      <motion.g
        animate={isCutting ? {
          opacity: [1, 0],
          scale: [1, 0.8],
          y: [0, -30],
          filter: ["drop-shadow(0 0 0 rgba(99, 102, 241, 0))", "drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))"],
          transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
        } : {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: "drop-shadow(0 0 0 rgba(99, 102, 241, 0))"
        }}
      >
        <path d={filledPath} fill="#6366F1" opacity="0.15" />
        <path d={arcPath} fill="none" stroke="#6366F1" strokeWidth="3" strokeDasharray="5,3" />
        <motion.circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={4}
          fill="#6366F1"
          animate={isCutting ? { scale: [1, 1.5, 0], transition: { duration: 0.4 } } : undefined}
        />
        <motion.circle
          cx={endPoint.x}
          cy={endPoint.y}
          r={4}
          fill="#6366F1"
          animate={isCutting ? { scale: [1, 1.5, 0], transition: { duration: 0.4 } } : undefined}
        />
      </motion.g>
    )
  }

  // Render current mouse position indicator
  const renderMousePosition = () => {
    if (mousePosition === null) return null

    const angle = positionToAngle(mousePosition)
    const point = polarToCartesian(angle, radius)

    return <circle cx={point.x} cy={point.y} r={3} fill={isDragging ? "#6366F1" : "gray"} opacity="0.7" />
  }

  // Update selection menu component
  const renderSelectionMenu = () => {
    if (!selectionMenu.visible) return null

    return (
      <AnimatePresence>
        <motion.div
          ref={selectionMenuRef}
          className="fixed z-50"
          style={{
            left: `${selectionMenu.x}px`,
            top: `${selectionMenu.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="bg-background border rounded-lg shadow-lg p-2 flex flex-col gap-2">
            <div className="text-sm font-medium px-2 pb-2 border-b">
              Selection: {selectionMenu.start}..{selectionMenu.end}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start"
              onClick={handleCutSelection}
            >
              <Scissors className="h-4 w-4 mr-2" />
              Cut Selection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start"
              onClick={handleCopySelection}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Selection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start"
              onClick={handleCreateFeature}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Feature
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="relative h-full w-full flex flex-col md:flex-row gap-4">
      <div className="relative flex-1 min-h-[400px] md:min-h-0">
        {/* Left side controls - Auto-annotate only */}
        <div className="absolute top-2 left-2 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={handleAutoAnnotate}
                  disabled={isAutoAnnotating}
                  className="bg-background hover:bg-accent h-12 w-12 rounded-xl border-2"
                >
                  <Wand2 className={`${isAutoAnnotating ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                <p>Auto-annotate sequence</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right side controls - Zoom, Reset, and Rotate */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                <p>Zoom in</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                <p>Zoom out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={handleResetView}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                <p>Reset view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={() => handleRotate(15)}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    <path d="M12 8v4l3 3" />
                    <path d="M17 17l-1.5-1.5" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                <p>Rotate clockwise</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={() => handleRotate(-15)}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0z" />
                    <path d="M12 8v4l-3 3" />
                    <path d="M7 17l1.5-1.5" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                <p>Rotate counter-clockwise</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={viewOptions.showFeatures ? "default" : "outline"}
            onClick={() => setViewOptions((prev) => ({ ...prev, showFeatures: !prev.showFeatures }))}
            className="text-xs"
          >
            Features
          </Button>
          <Button
            size="sm"
            variant={viewOptions.showRestrictionSites ? "default" : "outline"}
            onClick={() => setViewOptions((prev) => ({ ...prev, showRestrictionSites: !prev.showRestrictionSites }))}
            className="text-xs"
          >
            Restriction Sites
          </Button>
          <Button
            size="sm"
            variant={viewOptions.showLabels ? "default" : "outline"}
            onClick={() => setViewOptions((prev) => ({ ...prev, showLabels: !prev.showLabels }))}
            className="text-xs"
          >
            Labels
          </Button>
        </div>

        <TooltipProvider>
          <Tooltip delayDuration={50}>
            <TooltipTrigger asChild>
              <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                className="mx-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setContextMenu((prev) => ({ ...prev, visible: false }))
                  }
                }}
              >
                <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="currentColor" strokeWidth="1.5" />
                {renderPositionMarkers()}
                {renderStartEndPoints()}
                {renderSelection()}
                {renderMousePosition()}
                {renderRestrictionSites()}
                {renderFeatures()}
                <text
                  x={center}
                  y={center}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill="currentColor"
                >
                  {sequence.name}
                </text>
                <text
                  x={center}
                  y={center + 20}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontSize="12"
                  fill="currentColor"
                >
                  {sequence.length} bp
                </text>
              </svg>
            </TooltipTrigger>
            {hoveredElement && (
              <TooltipContent side="right" align="start" sideOffset={5}>
                <p className="font-bold">
                  {hoveredElement.type}: {hoveredElement.name}
                </p>
                {hoveredElement.featureType && <p>Type: {hoveredElement.featureType}</p>}
                {hoveredElement.position && <p>Position: {hoveredElement.position}</p>}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="w-full md:w-80 flex-shrink-0 border rounded-lg overflow-hidden bg-card">
        <Tabs defaultValue="features" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b bg-muted/40">
            <TabsList className="w-full h-10 bg-transparent">
              <TabsTrigger value="features" className="flex-1 data-[state=active]:bg-background">
                Features
              </TabsTrigger>
              <TabsTrigger value="sites" className="flex-1 data-[state=active]:bg-background">
                Restriction Sites
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-background">
                Info
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="features" className="p-0 bg-background">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-medium">Features ({sequence.features.length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditFeature({
                    name: "",
                    type: "gene",
                    direction: "forward",
                    color: featureTypes.find((ft) => ft.type === "gene")?.color,
                    start: 1,
                    end: Math.min(100, sequence.length),
                  })
                  setIsFeatureDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {sequence.features.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No features added yet</div>
              ) : (
                <div className="divide-y">
                  {sequence.features.map((feature) => (
                    <div
                      key={feature.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer ${
                        selectedFeature?.id === feature.id ? "bg-muted" : ""
                      }`}
                      onClick={() => onFeatureClick?.(feature)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{feature.name}</div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditFeature({ ...feature })
                              setIsFeatureDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteFeature?.(feature.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ backgroundColor: feature.color + "20", borderColor: feature.color }}
                          >
                            {feature.type}
                          </Badge>
                          <span>
                            {feature.start}..{feature.end}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sites" className="p-0 bg-background">
            <div className="p-3 border-b">
              <h3 className="font-medium">Restriction Sites ({sequence.restrictionSites.length})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {sequence.restrictionSites.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No restriction sites found</div>
              ) : (
                <div className="divide-y">
                  {sequence.restrictionSites.map((site) => (
                    <div
                      key={site.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => onRestrictionSiteClick?.(site)}
                    >
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">Position: {site.start}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="info" className="p-0 bg-background">
            <div className="p-3 border-b">
              <h3 className="font-medium">{sequence.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">{sequence.length} base pairs</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="border rounded p-2">
                  <div className="font-medium">Features</div>
                  <div className="text-2xl">{sequence.features.length}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="font-medium">Restriction Sites</div>
                  <div className="text-2xl">{sequence.restrictionSites.length}</div>
                </div>
              </div>
              {sequence.description && (
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm">{sequence.description}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {contextMenu.visible && contextMenu.item && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-background border shadow-md rounded-md p-1 min-w-[160px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            transform: "translate(10px, 10px)",
          }}
        >
          <div className="p-2 font-semibold border-b mb-1">
            {contextMenu.type === "feature"
              ? (contextMenu.item as SequenceFeature).name
              : (contextMenu.item as RestrictionSite).name}
          </div>
          <div className="p-1 flex flex-col gap-1">
            {contextMenu.type === "feature" && (
              <>
                <Button size="sm" variant="outline" onClick={handleEditFeature}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Feature
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteFeature}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Feature
                </Button>
              </>
            )}
            {contextMenu.type === "restriction" && (
              <div className="p-2 text-sm">
                <p>Position: {(contextMenu.item as RestrictionSite).start}</p>
                <p className="mt-1">Recognition sequence: {(contextMenu.item as RestrictionSite).sequence || "N/A"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editFeature.id ? "Edit Feature" : "Add New Feature"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-name" className="text-sm font-medium">
                Name*
              </label>
              <Input
                id="feature-name"
                name="name"
                value={editFeature.name || ""}
                onChange={handleInputChange}
                placeholder="Feature name"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-type" className="text-sm font-medium">
                Type*
              </label>
              <select
                id="feature-type"
                name="type"
                value={editFeature.type || "gene"}
                onChange={handleInputChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                {featureTypes.map((type) => (
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
                  max={sequence?.length || 1000}
                  value={editFeature.start || 1}
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
                  min={1}
                  max={sequence?.length || 1000}
                  value={editFeature.end || sequence?.length || 1000}
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
                value={editFeature.direction || "forward"}
                onChange={handleInputChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                <option value="forward">Forward</option>
                <option value="reverse">Reverse</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="feature-notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="feature-notes"
                name="notes"
                value={editFeature.notes || ""}
                onChange={handleInputChange}
                placeholder="Additional information about this feature"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFeature}>{editFeature.id ? "Save Changes" : "Add Feature"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderSelectionMenu()}
    </div>
  )
}