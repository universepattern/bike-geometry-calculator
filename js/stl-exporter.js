/**
 * STL Exporter for Bike Designer
 * Generates an ASCII STL file containing a 3D cylindrical representation of the bike frame.
 * Origin is at the Bottom Bracket (BB), z-coordinates range between -radius and +radius.
 */

class BikeSTLExporter {
    constructor(geometry, params) {
        this.geometry = geometry;
        this.params = params;
    }

    generate() {
        const nodes = this.geometry.nodes;
        const stl = ["solid bike_frame"];

        // Tube dimensions (outer diameter in mm)
        const tubeDiameters = {
            seatTube: 30,
            downTube: 35,
            topTube: 28,
            headTube: 40,
            chainstay: 25,
            seatstay: 20,
            fork: 24
        };

        // Helper to add a 3D cylinder
        const addCylinder = (p1, p2, diameter) => {
            const radius = diameter / 2;
            const A = { x: p1.x, y: p1.y, z: 0 };
            const B = { x: p2.x, y: p2.y, z: 0 };
            
            // Direction vector
            const vx = B.x - A.x;
            const vy = B.y - A.y;
            const vz = B.z - A.z;
            const len = Math.hypot(vx, vy, vz);
            if (len === 0) return;
            
            const dx = vx / len;
            const dy = vy / len;
            const dz = vz / len;
            
            // Find perpendicular vector u
            let ux, uy, uz;
            if (Math.abs(dx) < 1e-5 && Math.abs(dy) < 1e-5) {
                ux = 1; uy = 0; uz = 0;
            } else {
                const uLen = Math.hypot(dy, -dx);
                ux = dy / uLen;
                uy = -dx / uLen;
                uz = 0;
            }
            
            // Vector w perpendicular to direction and u
            const wx = dy * uz - dz * uy;
            const wy = dz * ux - dx * uz;
            const wz = dx * uy - dy * ux;
            
            // Number of radial segments
            const segments = 16;
            const endA = [];
            const endB = [];
            
            for (let i = 0; i < segments; i++) {
                const theta = (2 * Math.PI * i) / segments;
                const cos = Math.cos(theta);
                const sin = Math.sin(theta);
                
                const rx = radius * (cos * ux + sin * wx);
                const ry = radius * (cos * uy + sin * wy);
                const rz = radius * (cos * uz + sin * wz);
                
                endA.push({ x: A.x + rx, y: A.y + ry, z: A.z + rz });
                endB.push({ x: B.x + rx, y: B.y + ry, z: B.z + rz });
            }
            
            // Helper to calculate normal vector
            const getNormal = (v1, v2, v3) => {
                const ax = v2.x - v1.x;
                const ay = v2.y - v1.y;
                const az = v2.z - v1.z;
                const bx = v3.x - v1.x;
                const by = v3.y - v1.y;
                const bz = v3.z - v1.z;
                
                const nx = ay * bz - az * by;
                const ny = az * bx - ax * bz;
                const nz = ax * by - ay * bx;
                const nLen = Math.hypot(nx, ny, nz);
                if (nLen === 0) return { x: 0, y: 0, z: 0 };
                return { x: nx / nLen, y: ny / nLen, z: nz / nLen };
            };
            
            // Helper to write facet block
            const addFacet = (v1, v2, v3) => {
                const n = getNormal(v1, v2, v3);
                stl.push(`facet normal ${n.x} ${n.y} ${n.z}`);
                stl.push("  outer loop");
                stl.push(`    vertex ${v1.x} ${v1.y} ${v1.z}`);
                stl.push(`    vertex ${v2.x} ${v2.y} ${v2.z}`);
                stl.push(`    vertex ${v3.x} ${v3.y} ${v3.z}`);
                stl.push("  endloop");
                stl.push("endfacet");
            };
            
            // Write cylinder side panels
            for (let i = 0; i < segments; i++) {
                const next = (i + 1) % segments;
                addFacet(endA[i], endB[i], endB[next]);
                addFacet(endA[i], endB[next], endA[next]);
            }
            
            // Write cylinder end caps
            for (let i = 0; i < segments; i++) {
                const next = (i + 1) % segments;
                addFacet(A, endA[next], endA[i]);
                addFacet(B, endB[i], endB[next]);
            }
        };

        // --- MODEL BIKE FRAME TUBES ---
        addCylinder(nodes.eTTST, nodes.htBot, tubeDiameters.topTube);
        addCylinder(nodes.bb, nodes.eTTST, tubeDiameters.seatTube);
        addCylinder(nodes.htBot, nodes.htTop, tubeDiameters.headTube);
        addCylinder(nodes.bb, nodes.htBot, tubeDiameters.downTube);
        addCylinder(nodes.bb, nodes.rearAxle, tubeDiameters.chainstay);
        addCylinder(nodes.rearAxle, nodes.eTTST, tubeDiameters.seatstay);
        addCylinder(nodes.htBot, nodes.frontAxle, tubeDiameters.fork);

        stl.push("endsolid bike_frame");
        return stl.join("\n");
    }
}

window.BikeSTLExporter = BikeSTLExporter;
