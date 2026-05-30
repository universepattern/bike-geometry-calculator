# Bike Geometry Calculator with Physics Engine

An interactive, offline-first web application designed for custom bicycle frame design, biomechanical fit modeling, and structural stress analysis. 

🌍 **[Live Demo: Run the Bike Geometry Calculator Online](https://universepattern.github.io/bike-geometry-calculator/)**

---

## Key Features

### 1. Interactive Geometry Design
- **Real-Time Visualizer**: Instantly see your bicycle frame update as you adjust tube lengths, angles, and offsets.
- **Biomechanical Fit & Ride Presets**: Adjust rider height, inseam, and choose between riding styles (Road, MTB, Touring, Cargo) for dynamic geometry evaluation.
- **Interactive Linkage Highlighting**: Neon glow indicators highlight individual frame elements when hovering or focusing on their respective sliders.

### 2. Interactive 3D WebGL Viewport & Sleek Accordion UI
- **Real-Time 3D Rendering**: Toggle instantly between the 2D blueprint and a full 3D perspective viewport powered by Three.js.
- **Sleek Accordion UI (New)**: Sidebar controls are organized into an interactive glassmorphic accordion. All sections collapse automatically on startup except **Frame & Angles**, reducing the dashboard's visual weight.
- **Realistic Anatomy**: Renders symmetric chainstay/seatstay pairs and double fork blades in 3D space for actual clearance representation.
- **Handlebars & Cockpit**: Extends the stem and flat/riser/drop/bullhorn handlebars with grip details to visualize the riding position.
- **3D FEA Stress Heatmap**: Projects dynamic bending stress colors directly onto the 3D tube cylinders.
- **Orbit Navigation**: Drag to rotate, scroll to zoom, and right-click drag to pan the camera around the model.

### 3. Physics & Load Telemetry
- **Rider Load Distribution**: Models static load distribution (typically 60% rear, 40% front) based on rider weight.
- **Dynamic Deceleration Forces**: Calculates axle load shifts and head tube force loading under heavy braking (configurable from 0.1g to 2.0g deceleration).
- **BB Pedaling Torque**: Computes rotational torque loads at the Bottom Bracket using the power output (Watts) and cadence angular velocity.
- **Beam Bending Stresses**: Employs hollow tube moment of inertia equations to calculate bending stress levels in megapascals (MPa) across the seat tube, top tube, and down tube.
- **Handling Stability Rating**: Computes a handling score (0-10) based on the ratio of trail-to-wheelbase.

### 4. SVG Heatmaps & Vector Visualizations
- **Stress Heatmaps**: Tube interiors shift dynamically from green (safe) to red (high stress) based on material yield limits (Steel: 250 MPa, Aluminum: 200 MPa, Carbon: 500 MPa).
- **Vector Overlays**: Renders SVG arrows representing linear loads (rider weight, braking forces) and rotational torque paths.
- **Engineering Optimization Hints**: Displays structural warning notes directly on the blueprint if tube safety factors drop below 1.5 or handling stability is poor.

### 5. Technical Export Formats
- 📷 **Export Technical Image (PNG)**: Renders a high-resolution plan view of the frame overlaying a custom bill of materials (BOM) spec block.
- 📐 **Export DXF (CAD)**: Exports a standard AutoCAD-compatible DXF wireframe file grouped into organized layers (`Tubes`, `Wheels`, `Rims`, `Annotations`).
- 🖨️ **Export as STL (3D Print) [Enhanced]**: Exports a detailed STL mesh of the complete 3D viewport model (including handlebars, stem, fork blades, stays, rims, tires, and dished spokes) ready for slicing and 3D printing.
- 📦 **Export as GLTF (3D Model) [NEW]**: Exports the complete 3D viewport assembly as a standard GLTF file with exact geometries, colors, and materials for CAD or 3D visualization.
- 📊 **Export Specs (CSV)**: Compiles all input parameters, 2D Cartesian nodes coordinates, and computed force/stress specs into a tabular sheet format.

---

## Directory Structure

```
bike-geometry-calculator/
├── index.html                  # Main dashboard layout and user controls
├── css/
│   └── styles.css              # Dark-mode dashboard styling and animations
├── js/
│   ├── app.js                  # Main controller (events, parameter mapping, exports)
│   ├── geometry.js             # Physics engine (forces, torques, stresses, stability)
│   ├── renderer.js             # SVG graphics (render, stress heatmaps, vectors, BOM)
│   ├── renderer-3d.js          # WebGL 3D scene (Three.js rendering, stays, handlebars)
│   ├── dxf-exporter.js         # DXF vector format generator
│   ├── stl-exporter.js         # cylindrical 3D mesh STL format generator
│   └── csv-exporter.js         # Tabular data CSV format generator
└── README.md                   # Project documentation
```

---

## Usage

### Running Locally
Open `index.html` in any web browser. The application runs entirely client-side and requires no local server, database, or internet connection.

### Legacy PostScript Engine
For historical reference, the mathematically equivalent PostScript engine used in the initial design phases of this calculator is preserved in the `legacy-engine/` directory. If you have Ghostscript installed, use the provided `Makefile` to compile drawings.

---
*Deployment is configured via GitHub Pages.*
