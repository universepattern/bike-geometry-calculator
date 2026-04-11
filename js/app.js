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
    
    const inputs = {
        seatTubeLength: document.getElementById('seatTubeLength'),
        effTopTubeLength: document.getElementById('effTopTubeLength'),
        seatTubeAngle: document.getElementById('seatTubeAngle'),
        headTubeAngle: document.getElementById('headTubeAngle'),
        chainStayLength: document.getElementById('chainStayLength'),
        bbDrop: document.getElementById('bbDrop'),
        forkRake: document.getElementById('forkRake'),
        wheelSize: document.getElementById('wheelSize'),
        tireWidth: document.getElementById('tireWidth')
    };

    const trailDisplay = document.getElementById('trailDisplay');
    const wheelbaseDisplay = document.getElementById('wheelbaseDisplay');
    const stackDisplay = document.getElementById('stackDisplay');
    const reachDisplay = document.getElementById('reachDisplay');

    function updateParams() {
        const params = {};
        for (const [key, el] of Object.entries(inputs)) {
            params[key] = parseFloat(el.value);
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
        
        // Save these for DXF export
        window.currentGeometry = result;
        window.currentParams = params;

        if (result.metrics) {
            trailDisplay.textContent = `${Math.round(result.metrics.trail)} mm`;
            wheelbaseDisplay.textContent = `${Math.round(result.metrics.wheelbase)} mm`;
            stackDisplay.textContent = `${Math.round(result.metrics.stack)} mm`;
            reachDisplay.textContent = `${Math.round(result.metrics.reach)} mm`;
        }
    }

    for (const [key, el] of Object.entries(inputs)) {
        el.addEventListener('input', doRender);
        
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
            .tube-outline { stroke: #2c2927; stroke-width: 25px; stroke-linecap: round; stroke-linejoin: round; fill: none; opacity: 0.8; }
            .tube-inner { stroke: #e8e4d9; stroke-width: 21px; stroke-linecap: round; stroke-linejoin: round; fill: none; }
            .wheel { stroke: #d1ccc0; stroke-width: 3px; fill: none; }
            .wheel-tire { stroke: rgba(0, 0, 0, 0.08); stroke-width: 28px; fill: none; }
            .dimension-line { stroke: #d35400; stroke-width: 1px; stroke-dasharray: 4 4; }
            .node-point { fill: #d35400; r: 4; }
            .technical-text { font-family: 'Inter', sans-serif; fill: #2c2927; font-size: 14px; }
            .bom-bg { fill: #ffffff; stroke: #d1ccc0; stroke-width: 2px; }
            .bom-title { font-family: 'Outfit', sans-serif; font-weight: 800; fill: #2c2927; font-size: 20px; }
            .dimension-text { fill: #d35400; font-size: 14px; font-family: 'Inter', sans-serif; font-weight: 600; }
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

    doRender();
});
