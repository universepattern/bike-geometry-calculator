/**
 * Main Controller for Bike Designer 
 * Wires the geometry engine, the renderer, and the UI events.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.BikeGeometry === 'undefined' || typeof window.BikeRenderer === 'undefined') {
        console.error("Required modules failed to load.");
        return;
    }

    const renderer = new window.BikeRenderer('bikeSvg');
    
    let renderer3d = null;
    if (typeof window.BikeRenderer3D !== 'undefined') {
        renderer3d = new window.BikeRenderer3D('canvas3dWrapper');
    }
    
    const inputs = {
        // Geometric parameters
        seatTubeLength: document.getElementById('seatTubeLength'),
        effTopTubeLength: document.getElementById('effTopTubeLength'),
        seatTubeAngle: document.getElementById('seatTubeAngle'),
        headTubeAngle: document.getElementById('headTubeAngle'),
        chainStayLength: document.getElementById('chainStayLength'),
        bbDrop: document.getElementById('bbDrop'),
        forkRake: document.getElementById('forkRake'),
        wheelSize: document.getElementById('wheelSize'),
        tireWidth: document.getElementById('tireWidth'),
        
        // Physics & Material parameters
        riderWeight: document.getElementById('riderWeight'),
        saddleSetback: document.getElementById('saddleSetback'),
        crankLength: document.getElementById('crankLength'),
        powerOutput: document.getElementById('powerOutput'),
        brakingForce: document.getElementById('brakingForce'),
        frameMaterial: document.getElementById('frameMaterial'),
        
        // Custom Styles parameters
        frameType: document.getElementById('frameType'),
        handlebarStyle: document.getElementById('handlebarStyle'),
        
        // Rider Fit parameters
        riderHeight: document.getElementById('riderHeight'),
        riderInseam: document.getElementById('riderInseam'),
        ridingStyle: document.getElementById('ridingStyle')
    };

    const displays = {
        trail: document.getElementById('trailDisplay'),
        wheelbase: document.getElementById('wheelbaseDisplay'),
        stack: document.getElementById('stackDisplay'),
        reach: document.getElementById('reachDisplay'),
        bbTorque: document.getElementById('bbTorqueDisplay'),
        seatTubeStress: document.getElementById('seatTubeStressDisplay'),
        headTubeForce: document.getElementById('headTubeForceDisplay'),
        safetyFactor: document.getElementById('safetyFactorDisplay'),
        stability: document.getElementById('stabilityScoreDisplay')
    };

    function updateParams() {
        const params = {};
        for (const [key, el] of Object.entries(inputs)) {
            if (!el) continue;
            
            if (el.tagName === 'SELECT') {
                const numVal = parseFloat(el.value);
                params[key] = isNaN(numVal) ? el.value : numVal;
            } else {
                params[key] = parseFloat(el.value);
            }
            
            const valLabel = document.getElementById(`${key}Val`);
            if (valLabel) valLabel.textContent = el.value;
        }
        return params;
    }

    function doRender() {
        const params = updateParams();
        const geom = new window.BikeGeometry(params);
        const result = geom.calculate();
        
        renderer.render(result, params);
        
        if (renderer3d) {
            renderer3d.render(result, params);
        }
        
        // Save these for DXF export
        window.currentGeometry = result;
        window.currentParams = params;

        // Update the info panel metrics
        if (result.metrics) {
            displays.trail.textContent = `${Math.round(result.metrics.trail)} mm`;
            displays.wheelbase.textContent = `${Math.round(result.metrics.wheelbase)} mm`;
            displays.stack.textContent = `${Math.round(result.metrics.stack)} mm`;
            displays.reach.textContent = `${Math.round(result.metrics.reach)} mm`;
        }
        
        if (result.forces) {
            displays.bbTorque.textContent = `${Math.round(result.forces.bbTorque)} Nm`;
            displays.headTubeForce.textContent = `${Math.round(result.forces.headTubeForce)} N`;
        }
        
        if (result.stresses) {
            displays.seatTubeStress.textContent = `${Math.round(result.stresses.seatTubeStress)} MPa`;
            
            // Safety factor shows the minimum safety factor of the tubes
            const minSafety = Math.min(
                result.stresses.safetyFactorSeatTube,
                result.stresses.safetyFactorDownTube,
                result.stresses.safetyFactorTopTube
            );
            displays.safetyFactor.textContent = minSafety > 100 ? '>100' : minSafety.toFixed(2);
            
            // Apply warning coloring if safety factor is low
            if (minSafety < 1.5) {
                displays.safetyFactor.style.color = '#ff4d4d';
            } else if (minSafety < 3.0) {
                displays.safetyFactor.style.color = '#ff9f43';
            } else {
                displays.safetyFactor.style.color = '#2ed573';
            }
        }
        
        if (result.stability !== undefined) {
            displays.stability.textContent = `${result.stability.toFixed(1)}/10`;
            
            if (result.stability < 5.0) {
                displays.stability.style.color = '#ff9f43';
            } else {
                displays.stability.style.color = '#2ed573';
            }
        }
    }

    // Attach listeners
    for (const [key, el] of Object.entries(inputs)) {
        if (!el) continue;
        
        el.addEventListener('input', doRender);
        el.addEventListener('change', doRender);
        
        const row = el.closest('.input-row');
        if (row) {
            const highlight = () => renderer.highlightPart(key);
            const unhighlight = () => renderer.clearHighlights();
            
            row.addEventListener('mouseenter', highlight);
            row.addEventListener('mouseleave', unhighlight);
            el.addEventListener('focus', highlight);
            el.addEventListener('blur', unhighlight);
        }
    }
    
    function getSvgDataString() {
        const svg = document.getElementById('bikeSvg');
        
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
            .tube-outline { stroke: #030712; stroke-width: 25px; stroke-linecap: round; stroke-linejoin: round; fill: none; opacity: 0.6; }
            .tube-inner { stroke: #334155; stroke-width: 20px; stroke-linecap: round; stroke-linejoin: round; fill: none; }
            .wheel { stroke: rgba(255, 255, 255, 0.1); stroke-width: 3px; fill: none; }
            .wheel-tire { stroke: rgba(255, 255, 255, 0.03); stroke-width: 28px; fill: none; }
            .dimension-line { stroke: #00d2ff; stroke-width: 1px; stroke-dasharray: 4 4; }
            .node-point { fill: #00d2ff; r: 4; }
            .technical-text { font-family: 'Inter', sans-serif; fill: #e2e8f0; font-size: 13px; }
            .bom-bg { fill: rgba(15, 23, 42, 0.85); stroke: rgba(255, 255, 255, 0.1); stroke-width: 1.5px; }
            .bom-title { font-family: 'Outfit', sans-serif; font-weight: 800; fill: #ffffff; font-size: 18px; }
            .dimension-text { fill: #00d2ff; font-size: 13px; font-family: 'Inter', sans-serif; font-weight: 600; }
            .force-text { font-family: 'Inter', sans-serif; fill: #ffffff; font-size: 11px; font-weight: 500; }
            .optimization-hint { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; }
            .grid-line { stroke: rgba(255, 255, 255, 0.03); stroke-width: 1; }
            .grid-axis { stroke: rgba(255, 255, 255, 0.07); stroke-width: 1.5; }
        `;
        svg.insertBefore(styleEl, svg.firstChild);
        const svgData = new XMLSerializer().serializeToString(svg);
        svg.removeChild(styleEl);
        return svgData;
    }

    const exportBtn = document.getElementById('exportSvgBtn');
    if(exportBtn) {
        exportBtn.addEventListener('click', () => {
            renderer.clearHighlights();
            renderer.generateBOM();
            renderer.exportBg.style.display = 'block';

            setTimeout(() => {
                const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(getSvgDataString());
                
                const canvas = document.createElement('canvas');
                const viewBoxRect = renderer.viewBoxRect;
                canvas.width = viewBoxRect.w * 2; 
                canvas.height = viewBoxRect.h * 2;
                const ctx = canvas.getContext('2d');
                ctx.scale(2, 2); 
                
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, viewBoxRect.w, viewBoxRect.h);
                    
                    canvas.toBlob((blob) => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'bike_technical_plan.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }, 'image/png');

                    renderer.exportBg.style.display = 'none';
                    renderer.clearBOM();
                };
                img.src = svgDataUrl;
            }, 50);
        });
    }

    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            if (!window.currentGeometry || !window.currentParams) return;
            
            renderer.toggleComparisonMode(window.currentGeometry, window.currentParams);
            
            if (renderer.comparisonMode) {
                compareBtn.textContent = "Clear Reference Geometry";
                compareBtn.style.borderColor = "var(--accent-orange)";
                compareBtn.style.color = "var(--accent-orange)";
            } else {
                compareBtn.textContent = "Lock Reference Geometry";
                compareBtn.style.borderColor = "var(--border-color)";
                compareBtn.style.color = "var(--text-main)";
            }
            doRender();
        });
    }

    // View Toggle Handlers (2D Blueprint / 3D Viewport)
    const view2dBtn = document.getElementById('view2dBtn');
    const view3dBtn = document.getElementById('view3dBtn');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const canvas3dWrapper = document.getElementById('canvas3dWrapper');

    if (view2dBtn && view3dBtn && canvasWrapper && canvas3dWrapper) {
        view2dBtn.addEventListener('click', () => {
            view2dBtn.classList.add('active');
            view3dBtn.classList.remove('active');
            canvasWrapper.style.display = 'block';
            canvas3dWrapper.style.display = 'none';
        });

        view3dBtn.addEventListener('click', () => {
            view3dBtn.classList.add('active');
            view2dBtn.classList.remove('active');
            canvas3dWrapper.style.display = 'block';
            canvasWrapper.style.display = 'none';
            
            // Re-render and resize the 3D scene on show to match coordinates
            if (renderer3d) {
                renderer3d.resize();
            }
        });
    }

    const exportDxfBtn = document.getElementById('exportDxfBtn');
    if(exportDxfBtn) {
        exportDxfBtn.addEventListener('click', () => {
            if(!window.currentGeometry || !window.currentParams) return;
            
            const exporter = new window.BikeDXFExporter(window.currentGeometry, window.currentParams);
            const dxfContent = exporter.generate();
            
            const blob = new Blob([dxfContent], {type: "application/dxf"});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "bike_technical_drawing.dxf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    const exportStlBtn = document.getElementById('exportStlBtn');
    if(exportStlBtn) {
        exportStlBtn.addEventListener('click', () => {
            if(!window.currentGeometry || !window.currentParams) return;
            
            const exporter = new window.BikeSTLExporter(window.currentGeometry, window.currentParams);
            const stlContent = exporter.generate();
            
            const blob = new Blob([stlContent], {type: "text/plain"});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "bike_frame_3d.stl";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if(exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if(!window.currentGeometry || !window.currentParams) return;
            
            const exporter = new window.BikeCSVExporter(window.currentGeometry, window.currentParams);
            const csvContent = exporter.generate();
            
            const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "bike_specs_report.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    doRender();
});
