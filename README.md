# SnapGene Cloner

A streamlined, open-source alternative to SnapGene for DNA sequence visualization, plasmid map editing, and basic cloning simulation.

## Overview

SnapGene Cloner is a web-based application designed for molecular biologists, researchers, and students who need a simple yet powerful tool for working with DNA sequences. It provides essential functionality for visualizing, editing, and analyzing DNA sequences without the cost and complexity of commercial software.

## Features

### DNA Sequence Management
- **Import/Export:** Support for FASTA and GenBank formats
- **Local Storage:** Sequences are saved in your browser's local storage
- **Sequence Editing:** View and edit DNA sequences with base-pair precision

### Plasmid Map Visualization
- **Interactive Circular Maps:** Visualize circular plasmids with features and restriction sites
- **Feature Highlighting:** Color-coded features with tooltips for detailed information
- **Position Markers:** Base position indicators for easy navigation

### Restriction Enzyme Analysis
- **Common Enzymes:** Built-in database of common restriction enzymes
- **Auto-Detection:** Automatic identification of restriction sites in sequences
- **Visual Indicators:** Restriction sites are highlighted in both map and sequence views

### Feature Annotation
- **Feature Management:** Add, edit, and delete sequence features
- **Custom Colors:** Assign colors to different feature types
- **Detailed Information:** Store notes and metadata for each feature

### Cloning Simulation
- **Restriction Digest:** Simulate cutting DNA with restriction enzymes
- **Fragment Selection:** Select fragments for ligation
- **Ligation Simulation:** Create new constructs by ligating fragments
- **Circular/Linear Options:** Create either circular or linear constructs

## Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/snap-gene-cloner.git
cd snap-gene-cloner
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Importing Sequences
1. Click the "Import Sequence" button in the header
2. Upload a FASTA or GenBank file, or paste sequence data directly
3. The sequence will be loaded and displayed in the plasmid map and sequence viewer

### Working with Features
1. Navigate to the "Features" tab
2. Click "Add Feature" to create a new feature
3. Fill in the details including name, type, position, and direction
4. Features will be displayed on both the plasmid map and sequence viewer

### Simulating Cloning
1. Navigate to the "Cloning Tools" tab
2. Select a sequence and choose restriction enzymes
3. Click "Simulate Digest" to generate fragments
4. Select fragments to ligate
5. Choose whether the result should be circular or linear
6. Click "Ligate Selected Fragments" to create a new construct

### Exporting Sequences
1. Click the "Export" dropdown in the header
2. Choose "Export as FASTA" or "Export as GenBank"
3. The file will be downloaded to your computer

## Technology Stack

- **Framework:** Next.js with React
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **DNA Sequence Handling:** Custom utilities for DNA manipulation
- **Storage:** Browser localStorage for persistent data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by SnapGene and other DNA visualization tools
- Built for researchers and students who need accessible DNA analysis tools
- Developed as an open-source alternative to commercial software
# gene-map
