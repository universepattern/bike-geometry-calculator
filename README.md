# Bike Geometry Calculator

An interactive web application that dynamically renders custom bicycle frame geometry. 

🌍 **[Live Demo: Run the Bike Geometry Calculator Online](https://universepattern.github.io/bike-geometry-calculator/)**

## Projects in this Suite

### 1. Interactive Geometry Calculator (Current)
A modern web application built with Vanilla JS and SVG. 
- **Real-Time Visualizer**: Instantly see your bicycle frame diagram update.
- **Interactive Highlighting**: Neon glows emphasize the linkage you are currently editing.
- **Export Technical Plan**: Generates high-resolution PNG maps with full BOM and dimension lines.

### 2. Legacy PostScript Engine (Found in `legacy-engine/`)
The original programmatic drawing tool that served as the mathematical foundation for this project.
- **Mathematical Core**: Foundational structural logic used to draw bicycle wireframes.
- **Vector Plotting**: Natively compiles PostScript operations to plot parameters into `.ps` and `.pdf` technical documents.
- **Historical Reference**: Includes the classic `exampleOutput.pdf` produced by the original engine.

## Usage
### Web Application
Simply open `index.html` in any modern web browser. It operates entirely offline.

### Legacy Engine
The legacy files can be found in the `legacy-engine/` directory. Use the provided `Makefile` to generate drawings if you have a PostScript environment (like Ghostscript) installed.

---
Deployment is supported via GitHub Pages.
