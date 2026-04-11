/**
 * SVG Renderer for Bike Designer
 * Handles translating calculated coordinate nodes into SVG geometry.
 */

class BikeRenderer {
    constructor(svgElementId) {
        this.svg = document.getElementById(svgElementId);
        this.tubesGroup = document.getElementById('tubesGroup');
        this.wheelsGroup = document.getElementById('wheelsGroup');
        this.dimensionsGroup = document.getElementById('dimensionsGroup');
        this.bikeGroup = document.getElementById('bikeGroup');
        this.overlayGroup = document.getElementById('overlayGroup');
        this.exportBg = document.getElementById('exportBg');
        
        // Flip Y-axis so positive Y is Up (Math coordinates)
        this.bikeGroup.setAttribute('transform', 'scale(1, -1)');
        this.elementMap = {};
    }

    clear() {
        this.tubesGroup.innerHTML = '';
        this.wheelsGroup.innerHTML = '';
        this.dimensionsGroup.innerHTML = '';
        if(this.overlayGroup) this.overlayGroup.innerHTML = '';
        this.elementMap = {};
    }

    createLine(p1, p2, cssClass, id = null) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x);
        line.setAttribute('y2', p2.y);
        line.setAttribute('class', cssClass);
        if (id) {
            line.setAttribute('data-id', id);
            if (!this.elementMap[id]) this.elementMap[id] = [];
            this.elementMap[id].push(line);
        }
        return line;
    }

    createCircle(center, radius, cssClass, id = null) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', center.x);
        circle.setAttribute('cy', center.y);
        circle.setAttribute('r', radius);
        circle.setAttribute('class', cssClass);
        if (id) {
            circle.setAttribute('data-id', id);
            if (!this.elementMap[id]) this.elementMap[id] = [];
            this.elementMap[id].push(circle);
        }
        return circle;
    }

    createText(x, y, textStr, cssClass, anchor='middle') {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('class', cssClass);
        text.setAttribute('text-anchor', anchor);
        text.textContent = textStr;
        return text;
    }

    updateViewBox(nodes, radius) {
        let minX = Math.min(nodes.rearAxle.x - radius, nodes.bb.x, nodes.htTop.x - 100);
        let maxX = Math.max(nodes.frontAxle.x + radius, nodes.htTop.x + 100);
        let minY = Math.min(nodes.rearAxle.y - radius, nodes.frontAxle.y - radius, nodes.bb.y);
        let maxY = Math.max(nodes.eTTST.y, nodes.htTop.y, nodes.bb.y) + 300;

        const pad = 120;
        minX -= pad;
        maxX += pad;
        minY -= pad;
        maxY += pad;

        const width = maxX - minX;
        const height = maxY - minY;

        this.svg.setAttribute('viewBox', `${minX} ${-maxY} ${width} ${height}`);
        this.viewBoxRect = { x: minX, y: -maxY, w: width, h: height };
        
        if (this.exportBg) {
            this.exportBg.setAttribute('x', minX);
            this.exportBg.setAttribute('y', -maxY);
            this.exportBg.setAttribute('width', width);
            this.exportBg.setAttribute('height', height);
        }
    }

    highlightPart(ids) {
        this.clearHighlights();
        if (!Array.isArray(ids)) ids = [ids];
        ids.forEach(id => {
            let targets = this.elementMap[id];
            if (targets) {
                targets.forEach(el => el.classList.add('highlight-neon'));
            }
        });
    }

    clearHighlights() {
        const highlighted = this.svg.querySelectorAll('.highlight-neon');
        highlighted.forEach(el => el.classList.remove('highlight-neon'));
    }

    drawDimensionLine(p1, p2, offset, textStr, invertOffset = false) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return;
        let nx = -dy / len;
        let ny = dx / len;
        
        if (invertOffset) {
            nx = -nx; ny = -ny;
        }

        const ox1 = p1.x + nx * offset;
        const oy1 = p1.y + ny * offset;
        const ox2 = p2.x + nx * offset;
        const oy2 = p2.y + ny * offset;

        this.dimensionsGroup.appendChild(this.createLine(p1, {x: ox1, y: oy1}, 'dimension-line'));
        this.dimensionsGroup.appendChild(this.createLine(p2, {x: ox2, y: oy2}, 'dimension-line'));
        this.dimensionsGroup.appendChild(this.createLine({x: ox1, y: oy1}, {x: ox2, y: oy2}, 'dimension-line'));
        
        const midX = (ox1 + ox2) / 2;
        const midY = (oy1 + oy2) / 2;
        const tx = midX + nx * 15;
        const ty = -(midY + ny * 15 - 5); 
        this.overlayGroup.appendChild(this.createText(tx, ty, textStr, 'dimension-text'));
    }

    drawAngleDimension(center, startAngleDeg, endAngleDeg, radius, textStr) {
        const startRad = startAngleDeg * Math.PI / 180;
        const endRad = endAngleDeg * Math.PI / 180;
        
        const x1 = center.x + radius * Math.cos(startRad);
        const y1 = center.y + radius * Math.sin(startRad);
        const x2 = center.x + radius * Math.cos(endRad);
        const y2 = center.y + radius * Math.sin(endRad);
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const largeArc = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0;
        const sweep = endAngleDeg > startAngleDeg ? 1 : 0;
        
        path.setAttribute('d', `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`);
        path.setAttribute('class', 'dimension-line');
        path.setAttribute('fill', 'none');
        this.dimensionsGroup.appendChild(path);
        
        const midDeg = (startAngleDeg + endAngleDeg) / 2;
        const midRad = midDeg * Math.PI / 180;
        const tx = center.x + (radius + 20) * Math.cos(midRad);
        const ty = -(center.y + (radius + 20) * Math.sin(midRad) - 5);
        this.overlayGroup.appendChild(this.createText(tx, ty, textStr, 'dimension-text'));
    }

    render(geometry, params) {
        this.clear();
        this.geometry = geometry;
        this.params = params;
        const nodes = geometry.nodes;
        
        const drawTube = (p1, p2, id) => {
            this.tubesGroup.appendChild(this.createLine(p1, p2, 'tube-outline', id));
            this.tubesGroup.appendChild(this.createLine(p1, p2, 'tube-inner', id));
        };

        drawTube(nodes.eTTST, nodes.htBot, 'tube-top');
        drawTube(nodes.bb, nodes.eTTST, 'tube-seat');
        drawTube(nodes.htBot, nodes.htTop, 'tube-head');
        drawTube(nodes.bb, nodes.htBot, 'tube-down');
        drawTube(nodes.bb, nodes.rearAxle, 'tube-chainstay');
        drawTube(nodes.rearAxle, nodes.eTTST, 'tube-seatstay');
        drawTube(nodes.htBot, nodes.frontAxle, 'tube-fork');

        for (const [key, node] of Object.entries(nodes)) {
            this.tubesGroup.appendChild(this.createCircle(node, 3, 'node-point'));
        }

        const r = geometry.metrics.wheelRadius;
        this.wheelsGroup.appendChild(this.createCircle(nodes.rearAxle, r, 'wheel', 'wheel-rear'));
        this.wheelsGroup.appendChild(this.createCircle(nodes.rearAxle, r - params.tireWidth, 'wheel-tire', 'wheel-rear'));
        
        this.wheelsGroup.appendChild(this.createCircle(nodes.frontAxle, r, 'wheel', 'wheel-front'));
        this.wheelsGroup.appendChild(this.createCircle(nodes.frontAxle, r - params.tireWidth, 'wheel-tire', 'wheel-front'));

        const groundY = nodes.rearAxle.y - r;
        this.dimensionsGroup.appendChild(this.createLine(
            {x: nodes.rearAxle.x - r - 50, y: groundY},
            {x: nodes.frontAxle.x + r + 50, y: groundY},
            'dimension-line'
        ));

        this.drawDimensionLine(nodes.eTTST, nodes.htBot, 50, `TT: ${Math.round(params.effTopTubeLength)}mm`);
        this.drawDimensionLine(nodes.bb, nodes.eTTST, 50, `ST: ${Math.round(params.seatTubeLength)}mm`);
        this.drawDimensionLine(nodes.bb, nodes.rearAxle, 60, `CS: ${Math.round(params.chainStayLength)}mm`, true);

        // Angle Labels
        this.drawAngleDimension(nodes.bb, 0, 180 - params.seatTubeAngle, 80, `STA: ${params.seatTubeAngle}°`);
        
        // HT angle needs a horizontal reference at htBot
        this.dimensionsGroup.appendChild(this.createLine(nodes.htBot, {x: nodes.htBot.x + 100, y: nodes.htBot.y}, 'dimension-line'));
        this.drawAngleDimension(nodes.htBot, 0, 180 - params.headTubeAngle, 80, `HTA: ${params.headTubeAngle}°`);

        this.updateViewBox(nodes, r);
    }
    
    generateBOM() {
        if(!this.geometry || !this.params || !this.viewBoxRect) return;

        const x = this.viewBoxRect.x + 40;
        const svgY = this.viewBoxRect.y + 40;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', svgY); 
        rect.setAttribute('width', 220);
        rect.setAttribute('height', 310);
        rect.setAttribute('rx', 8);
        rect.setAttribute('class', 'bom-bg');
        this.overlayGroup.appendChild(rect);

        this.overlayGroup.appendChild(this.createText(x + 20, svgY + 35, "BIKE DESIGNER", 'bom-title', 'start'));
        this.overlayGroup.appendChild(this.createText(x + 20, svgY + 60, "Technical Plan", 'technical-text', 'start'));
        
        const metrics = [
            `Seat Tube: ${this.params.seatTubeLength}mm`,
            `Top Tube: ${this.params.effTopTubeLength}mm`,
            `ST Angle: ${this.params.seatTubeAngle}°`,
            `HT Angle: ${this.params.headTubeAngle}°`,
            `Chainstay: ${this.params.chainStayLength}mm`,
            `BB Drop: ${this.params.bbDrop}mm`,
            `Fork Rake: ${this.params.forkRake}mm`,
            `Wheelbase: ${Math.round(this.geometry.metrics.wheelbase)}mm`,
            `Stack: ${Math.round(this.geometry.metrics.stack)}mm`,
            `Reach: ${Math.round(this.geometry.metrics.reach)}mm`,
            `Trail: ${Math.round(this.geometry.metrics.trail)}mm`,
            `Wheel (BSD): ${this.params.wheelSize}mm`,
            `Tire: ${this.params.tireWidth}mm`
        ];

        let startY = svgY + 95;
        metrics.forEach(m => {
            let txt = this.createText(x + 20, startY, m, 'technical-text', 'start');
            this.overlayGroup.appendChild(txt);
            startY += 16;
        });
    }

    clearBOM() {
        if (!this.overlayGroup) return;
        const children = Array.from(this.overlayGroup.children);
        children.forEach(child => {
            if (child.classList && (child.classList.contains('bom-bg') || child.classList.contains('bom-title') || child.classList.contains('technical-text'))) {
                this.overlayGroup.removeChild(child);
            }
        });
    }
}

window.BikeRenderer = BikeRenderer;
