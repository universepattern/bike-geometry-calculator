/**
 * DXF Exporter for Bike Designer
 * Generates a standard AutoCAD-compatible DXF file string.
 */

class BikeDXFExporter {
    constructor(geometry, params) {
        this.geometry = geometry;
        this.params = params;
    }

    generate() {
        const nodes = this.geometry.nodes;
        const metrics = this.geometry.metrics;
        let dxf = [
            "  0", "SECTION",
            "  2", "ENTITIES"
        ];

        // Helper to add a LINE
        const addLine = (p1, p2) => {
            dxf.push("  0", "LINE", "  8", "Tubes", " 10", p1.x, " 20", p1.y, " 30", 0, " 11", p2.x, " 21", p2.y, " 31", 0);
        };

        // Helper to add a CIRCLE
        const addCircle = (center, radius, layer = "Wheels") => {
            dxf.push("  0", "CIRCLE", "  8", layer, " 10", center.x, " 20", center.y, " 30", 0, " 40", radius);
        };

        // Helper to add TEXT
        const addText = (p, text, height = 10, layer = "Annotations") => {
            dxf.push("  0", "TEXT", "  8", layer, " 10", p.x, " 20", p.y, " 30", 0, " 40", height, "  1", text);
        };

        const frameType = this.params.frameType || 'diamond';

        // --- DRAW GEOMETRY ---
        // Frame Tubes
        addLine(nodes.bb, nodes.eTTST);
        addLine(nodes.htBot, nodes.htTop);
        addLine(nodes.bb, nodes.htBot);
        addLine(nodes.bb, nodes.rearAxle);
        addLine(nodes.rearAxle, nodes.eTTST);
        addLine(nodes.htBot, nodes.frontAxle);

        // Top Tube based on Selected Shape Style
        if (frameType === 'step-through') {
            const stepThroughST = { 
                x: nodes.bb.x + (nodes.eTTST.x - nodes.bb.x) * 0.4, 
                y: nodes.bb.y + (nodes.eTTST.y - nodes.bb.y) * 0.4 
            };
            addLine(stepThroughST, nodes.htBot);
        } else if (frameType === 'split-top') {
            // Draw twin parallel lines offset in 2D
            addLine({ x: nodes.eTTST.x, y: nodes.eTTST.y + 3 }, { x: nodes.htBot.x, y: nodes.htBot.y + 3 });
            addLine({ x: nodes.eTTST.x, y: nodes.eTTST.y - 3 }, { x: nodes.htBot.x, y: nodes.htBot.y - 3 });
        } else if (frameType === 'cantilever') {
            // Curved top tube using segmented lines
            const segments = 8;
            const controlX = (nodes.eTTST.x + nodes.htBot.x) / 2;
            const controlY = (nodes.eTTST.y + nodes.htBot.y) / 2 - 50;
            
            let prevPoint = nodes.eTTST;
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const x = Math.pow(1 - t, 2) * nodes.eTTST.x + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * nodes.htBot.x;
                const y = Math.pow(1 - t, 2) * nodes.eTTST.y + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * nodes.htBot.y;
                const currPoint = { x: x, y: y };
                addLine(prevPoint, currPoint);
                prevPoint = currPoint;
            }
        } else {
            // Standard Diamond
            addLine(nodes.eTTST, nodes.htBot);
        }

        // Wheels
        addCircle(nodes.rearAxle, metrics.wheelRadius);
        addCircle(nodes.rearAxle, metrics.wheelRadius - this.params.tireWidth, "Rims");
        addCircle(nodes.frontAxle, metrics.wheelRadius);
        addCircle(nodes.frontAxle, metrics.wheelRadius - this.params.tireWidth, "Rims");

        // --- ADD DIMENSIONS AS TEXT ---
        const startX = nodes.rearAxle.x - 100;
        let startY = nodes.eTTST.y + 100;

        addText({x: startX, y: startY}, "--- BIKE SPECS ---", 15);
        startY -= 20;
        addText({x: startX, y: startY}, `ST Length: ${this.params.seatTubeLength}mm`);
        startY -= 15;
        addText({x: startX, y: startY}, `TT Length: ${this.params.effTopTubeLength}mm`);
        startY -= 15;
        addText({x: startX, y: startY}, `ST Angle: ${this.params.seatTubeAngle} deg`);
        startY -= 15;
        addText({x: startX, y: startY}, `HT Angle: ${this.params.headTubeAngle} deg`);
        startY -= 15;
        addText({x: startX, y: startY}, `Wheelbase: ${Math.round(metrics.wheelbase)}mm`);
        startY -= 15;
        addText({x: startX, y: startY}, `Trail: ${Math.round(metrics.trail)}mm`);
        startY -= 15;
        addText({x: startX, y: startY}, `Stack: ${Math.round(metrics.stack)}mm`);
        startY -= 15;
        addText({x: startX, y: startY}, `Reach: ${Math.round(metrics.reach)}mm`);

        // Close DXF
        dxf.push("  0", "ENDSEC", "  0", "EOF");

        return dxf.join("\n");
    }
}

window.BikeDXFExporter = BikeDXFExporter;
