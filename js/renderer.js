/**
 * SVG Renderer for Bike Designer
 * Extended with Force Vector, Stress Heatmap, and Fit Suggestion Visualization
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
        this.comparisonMode = false;
        this.comparisonGeometry = null;
        this.comparisonParams = null;
    }

    clear() {
        this.tubesGroup.innerHTML = '';
        this.wheelsGroup.innerHTML = '';
        this.dimensionsGroup.innerHTML = '';
        const gridGroup = document.getElementById('gridGroup');
        if (gridGroup) gridGroup.innerHTML = '';
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

    createArrow(start, end, color = "#ff0000", id = null) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const headLength = 10;
        const arrowPath = `M ${start.x} ${start.y} L ${end.x} ${end.y} L ${end.x - headLength * Math.cos(angle - Math.PI / 6)} ${end.y - headLength * Math.sin(angle - Math.PI / 6)} M ${end.x} ${end.y} L ${end.x - headLength * Math.cos(angle + Math.PI / 6)} ${end.y - headLength * Math.sin(angle + Math.PI / 6)}`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', arrowPath);
        path.setAttribute('stroke', color);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-width', '2');
        if (id) {
            path.setAttribute('data-id', id);
            if (!this.elementMap[id]) this.elementMap[id] = [];
            this.elementMap[id].push(path);
        }
        return path;
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

        // Maps slider input keys to registered SVG element IDs
        const keyMap = {
            seatTubeLength: ['tube-seat'],
            effTopTubeLength: ['tube-top'],
            seatTubeAngle: ['tube-seat'],
            headTubeAngle: ['tube-head'],
            chainStayLength: ['tube-chainstay'],
            bbDrop: ['tube-chainstay'],
            forkRake: ['tube-fork'],
            wheelSize: ['wheel-rear', 'wheel-front'],
            tireWidth: ['wheel-rear', 'wheel-front'],
            riderWeight: ['tube-seat'],
            saddleSetback: ['tube-seat'],
            crankLength: ['tube-chainstay'],
            powerOutput: ['tube-seat', 'tube-down'],
            brakingForce: ['tube-fork', 'tube-head'],
            frameMaterial: ['tube-seat', 'tube-down', 'tube-top']
        };

        const resolvedIds = [];
        ids.forEach(id => {
            if (keyMap[id]) {
                resolvedIds.push(...keyMap[id]);
            } else {
                resolvedIds.push(id);
            }
        });

        resolvedIds.forEach(id => {
            let targets = this.elementMap[`main-${id}`] || this.elementMap[id];
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

    drawForceVectors(nodes, forces) {
        this.drawRotationalForce(nodes.bb, forces.bbTorque, "bbTorque");
        this.drawLinearForce(nodes.bb, nodes.eTTST, forces.seatTubeForce, "#ff3333", "seatTubeForce");
        this.drawLinearForce(nodes.htBot, { x: nodes.htBot.x, y: nodes.htBot.y - 50 }, forces.headTubeForce, "#3399ff", "headTubeForce");
        this.drawLinearForce(nodes.rearAxle, { x: nodes.rearAxle.x, y: nodes.rearAxle.y - forces.rearForce / 10 }, forces.rearForce, "#27ae60", "rearForce");
        this.drawLinearForce(nodes.frontAxle, { x: nodes.frontAxle.x, y: nodes.frontAxle.y - forces.frontForce / 10 }, forces.frontForce, "#1abc9c", "frontForce");
    }

    drawLinearForce(start, end, magnitude, color, id) {
        const arrow = this.createArrow(start, end, color, id);
        this.tubesGroup.appendChild(arrow);
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        this.overlayGroup.appendChild(this.createText(mid.x, -mid.y, `${Math.round(magnitude)} N`, "force-text"));
    }

    drawRotationalForce(center, torque, id) {
        const radius = 30;
        const startAngle = torque > 0 ? 0 : 180;
        const endAngle = torque > 0 ? 90 : 270;
        const startRad = startAngle * Math.PI / 180;
        const endRad = endAngle * Math.PI / 180;
        const x1 = center.x + radius * Math.cos(startRad);
        const y1 = center.y + radius * Math.sin(startRad);
        const x2 = center.x + radius * Math.cos(endRad);
        const y2 = center.y + radius * Math.sin(endRad);
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
        const sweep = endAngle > startAngle ? 1 : 0;
        arrow.setAttribute("d", `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`);
        arrow.setAttribute("stroke", "#ff8800");
        arrow.setAttribute("stroke-width", "3");
        arrow.setAttribute("fill", "none");
        arrow.setAttribute("data-id", id);
        this.tubesGroup.appendChild(arrow);
        this.overlayGroup.appendChild(this.createText(center.x + radius + 10, -center.y, `${Math.round(torque)} Nm`, "force-text"));
    }

    applyStressHeatmap(stresses) {
        const maxStress = 500;
        const seatTubeStress = Math.min(stresses.seatTubeStress, maxStress);
        const seatTubeNormalized = seatTubeStress / maxStress;
        const seatTubeColor = this.getStressColor(seatTubeNormalized);
        this.applyColorToTube("tube-seat", seatTubeColor);

        const downTubeStress = Math.min(stresses.downTubeStress, maxStress);
        const downTubeNormalized = downTubeStress / maxStress;
        const downTubeColor = this.getStressColor(downTubeNormalized);
        this.applyColorToTube("tube-down", downTubeColor);

        const topTubeStress = Math.min(stresses.topTubeStress, maxStress);
        const topTubeNormalized = topTubeStress / maxStress;
        const topTubeColor = this.getStressColor(topTubeNormalized);
        this.applyColorToTube("tube-top", topTubeColor);
    }

    getStressColor(normalizedStress) {
        const red = Math.floor(255 * normalizedStress);
        const green = Math.floor(255 * (1 - normalizedStress));
        return `rgb(${red}, ${green}, 0)`;
    }

    applyColorToTube(tubeId, color) {
        const tubeElements = this.elementMap[`main-${tubeId}`] || this.elementMap[tubeId];
        if (tubeElements) {
            tubeElements.forEach(el => {
                if (el.classList.contains("tube-inner")) {
                    el.setAttribute("stroke", color);
                }
            });
        }
    }

    drawTubes(nodes, isComparison = false) {
        const groupId = isComparison ? 'comparison' : 'main';
        const drawTube = (p1, p2, id) => {
            const line1 = this.createLine(p1, p2, 'tube-outline', `${groupId}-${id}`);
            const line2 = this.createLine(p1, p2, 'tube-inner', `${groupId}-${id}`);
            if (isComparison) {
                line1.setAttribute('stroke-dasharray', '5,5');
                line2.setAttribute('stroke-dasharray', '5,5');
                line1.setAttribute('opacity', '0.7');
                line2.setAttribute('opacity', '0.7');
            }
            this.tubesGroup.appendChild(line1);
            this.tubesGroup.appendChild(line2);
        };

        drawTube(nodes.eTTST, nodes.htBot, 'tube-top');
        drawTube(nodes.bb, nodes.eTTST, 'tube-seat');
        drawTube(nodes.htBot, nodes.htTop, 'tube-head');
        drawTube(nodes.bb, nodes.htBot, 'tube-down');
        drawTube(nodes.bb, nodes.rearAxle, 'tube-chainstay');
        drawTube(nodes.rearAxle, nodes.eTTST, 'tube-seatstay');
        drawTube(nodes.htBot, nodes.frontAxle, 'tube-fork');

        for (const [key, node] of Object.entries(nodes)) {
            const circle = this.createCircle(node, 3, 'node-point', `${groupId}-${key}`);
            if (isComparison) {
                circle.setAttribute('opacity', '0.7');
            }
            this.tubesGroup.appendChild(circle);
        }
    }

    drawWheels(nodes, params, isComparison = false) {
        const r = this.geometry.metrics.wheelRadius;
        const groupId = isComparison ? 'comparison' : 'main';
        const wheel1 = this.createCircle(nodes.rearAxle, r, 'wheel', `${groupId}-wheel-rear`);
        const tire1 = this.createCircle(nodes.rearAxle, r - params.tireWidth, 'wheel-tire', `${groupId}-wheel-rear`);
        const wheel2 = this.createCircle(nodes.frontAxle, r, 'wheel', `${groupId}-wheel-front`);
        const tire2 = this.createCircle(nodes.frontAxle, r - params.tireWidth, 'wheel-tire', `${groupId}-wheel-front`);
        if (isComparison) {
            [wheel1, tire1, wheel2, tire2].forEach(el => {
                el.setAttribute('stroke-dasharray', '5,5');
                el.setAttribute('opacity', '0.7');
            });
        }
        this.wheelsGroup.appendChild(wheel1);
        this.wheelsGroup.appendChild(tire1);
        this.wheelsGroup.appendChild(wheel2);
        this.wheelsGroup.appendChild(tire2);

        const groundY = nodes.rearAxle.y - r;
        const groundLine = this.createLine(
            {x: nodes.rearAxle.x - r - 50, y: groundY},
            {x: nodes.frontAxle.x + r + 50, y: groundY},
            'dimension-line'
        );
        if (isComparison) {
            groundLine.setAttribute('stroke-dasharray', '5,5');
            groundLine.setAttribute('opacity', '0.7');
        }
        this.dimensionsGroup.appendChild(groundLine);
    }

    drawGrid() {
        const gridGroup = document.getElementById('gridGroup');
        if (!gridGroup || !this.viewBoxRect) return;
        gridGroup.innerHTML = '';

        const rect = this.viewBoxRect;
        const step = 100; // 100mm grid increments

        const startX = Math.floor(rect.x / step) * step;
        const endX = Math.ceil((rect.x + rect.w) / step) * step;
        
        const topY = rect.y;
        const botY = rect.y + rect.h;
        
        const mathMinY = Math.min(-topY, -botY);
        const mathMaxY = Math.max(-topY, -botY);
        
        const startY = Math.floor(mathMinY / step) * step;
        const endY = Math.ceil(mathMaxY / step) * step;

        for (let x = startX; x <= endX; x += step) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', topY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', botY);
            line.setAttribute('class', x === 0 ? 'grid-axis' : 'grid-line');
            gridGroup.appendChild(line);
        }

        for (let y = startY; y <= endY; y += step) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', rect.x);
            line.setAttribute('y1', -y);
            line.setAttribute('x2', rect.x + rect.w);
            line.setAttribute('y2', -y);
            line.setAttribute('class', y === 0 ? 'grid-axis' : 'grid-line');
            gridGroup.appendChild(line);
        }
    }

    drawDimensions(nodes, params) {
        this.drawDimensionLine(nodes.eTTST, nodes.htBot, 50, `TT: ${Math.round(params.effTopTubeLength)}mm`);
        this.drawDimensionLine(nodes.bb, nodes.eTTST, 50, `ST: ${Math.round(params.seatTubeLength)}mm`);
        this.drawDimensionLine(nodes.bb, nodes.rearAxle, 60, `CS: ${Math.round(params.chainStayLength)}mm`, true);
        this.drawAngleDimension(nodes.bb, 0, 180 - params.seatTubeAngle, 80, `STA: ${params.seatTubeAngle}°`);
        this.dimensionsGroup.appendChild(this.createLine(nodes.htBot, {x: nodes.htBot.x + 100, y: nodes.htBot.y}, 'dimension-line'));
        this.drawAngleDimension(nodes.htBot, 0, 180 - params.headTubeAngle, 80, `HTA: ${params.headTubeAngle}°`);
    }

    toggleComparisonMode(geometry, params) {
        this.comparisonMode = !this.comparisonMode;
        if (this.comparisonMode) {
            this.comparisonGeometry = geometry;
            this.comparisonParams = params;
        } else {
            this.comparisonGeometry = null;
            this.comparisonParams = null;
        }
    }

    drawOptimizationHints(stresses, stability, fit) {
        const hints = [];
        let yOffset = 50;

        if (stresses.safetyFactorSeatTube < 1.5) {
            hints.push({
                text: "⚠️ Seat tube stress too high! Increase diameter or use stronger material.",
                position: { x: this.viewBoxRect.x + 50, y: this.viewBoxRect.y + yOffset },
                color: "#ff3333"
            });
            yOffset += 30;
        }
        if (stresses.safetyFactorDownTube < 1.5) {
            hints.push({
                text: "⚠️ Down tube stress too high! Increase diameter or use stronger material.",
                position: { x: this.viewBoxRect.x + 50, y: this.viewBoxRect.y + yOffset },
                color: "#ff3333"
            });
            yOffset += 30;
        }
        if (stability < 5) {
            hints.push({
                text: "⚠️ Low stability! Increase trail or wheelbase for better handling.",
                position: { x: this.viewBoxRect.x + 50, y: this.viewBoxRect.y + yOffset },
                color: "#ff9900"
            });
            yOffset += 30;
        } else if (stability > 8) {
            hints.push({
                text: "✅ High stability! Good for touring or loaded bikes.",
                position: { x: this.viewBoxRect.x + 50, y: this.viewBoxRect.y + yOffset },
                color: "#33cc33"
            });
            yOffset += 30;
        }

        // Biomechanical fit warnings
        if (fit) {
            if (Math.abs(fit.seatTubeDelta) > 50) {
                const direction = fit.seatTubeDelta > 0 ? "large" : "small";
                hints.push({
                    text: `⚠️ Seat tube size is too ${direction} for your inseam (suggested: ${Math.round(fit.suggestedSeatTube)}mm).`,
                    position: { x: this.viewBoxRect.x + 50, y: this.viewBoxRect.y + yOffset },
                    color: "#ff9f43"
                });
                yOffset += 30;
            }
            if (Math.abs(fit.stackDelta) > 60) {
                const direction = fit.stackDelta > 0 ? "high" : "low";
                hints.push({
                    text: `⚠️ Stack is too ${direction} for your height & riding style (suggested: ${Math.round(fit.suggestedStack)}mm).`,
                    position: { x: this.viewBoxRect.x + 50, y: this.viewBoxRect.y + yOffset },
                    color: "#ff9f43"
                });
                yOffset += 30;
            }
        }

        hints.forEach(hint => {
            const textEl = this.createText(hint.position.x, -hint.position.y, hint.text, 'optimization-hint', 'start');
            textEl.setAttribute('fill', hint.color);
            this.overlayGroup.appendChild(textEl);
        });
    }

    render(geometry, params) {
        this.clear();
        this.geometry = geometry;
        this.params = params;
        const nodes = geometry.nodes;
        
        this.drawTubes(nodes);
        this.drawWheels(nodes, params);
        if (this.comparisonMode && this.comparisonGeometry) {
            this.drawTubes(this.comparisonGeometry.nodes, true);
            this.drawWheels(this.comparisonGeometry.nodes, this.comparisonParams, true);
        }
        if (geometry.forces) {
            this.drawForceVectors(nodes, geometry.forces);
        }
        if (geometry.stresses) {
            this.applyStressHeatmap(geometry.stresses);
        }
        this.drawDimensions(nodes, params);
        this.updateViewBox(nodes, geometry.metrics.wheelRadius);
        
        // Draw grid overlay based on calculated ViewBox boundaries
        this.drawGrid();
        
        if (geometry.stresses && geometry.stability !== undefined) {
            this.drawOptimizationHints(geometry.stresses, geometry.stability, geometry.fit);
        }
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
