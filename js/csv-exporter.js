/**
 * CSV Exporter for Bike Designer
 * Generates a structured CSV data table containing all design parameters, node coordinates, and computed physics metrics.
 */

class BikeCSVExporter {
    constructor(geometry, params) {
        this.geometry = geometry;
        this.params = params;
    }

    generate() {
        const csv = [];
        
        csv.push("BIKE DESIGN SPECIFICATION REPORT");
        csv.push(`Exported On,${new Date().toISOString()}`);
        csv.push("");
        
        // 1. Inputs/Parameters Table
        csv.push("1. DESIGN PARAMETERS");
        csv.push("Parameter Name,Value,Unit,Category");
        
        for (const [key, val] of Object.entries(this.params)) {
            let unit = "";
            let category = "General";
            
            if (key.includes("Angle")) {
                unit = "degrees";
                category = "Frame Geometry";
            } else if (key.includes("Length") || key.includes("Drop") || key.includes("Rake") || key.includes("Size") || key.includes("Width") || key.includes("Setback") || key.includes("Height") || key.includes("Inseam")) {
                unit = "mm";
                category = key.includes("rider") || key.includes("saddle") ? "Rider Fit" : "Frame Geometry";
            } else if (key.includes("Weight")) {
                unit = "kg";
                category = "Rider & Load";
            } else if (key.includes("Power")) {
                unit = "Watts";
                category = "Rider & Load";
            } else if (key.includes("Force")) {
                unit = "g";
                category = "Rider & Load";
            } else if (key.includes("Material")) {
                unit = "text";
                category = "Materials";
            } else if (key.includes("Style")) {
                unit = "text";
                category = "Rider Fit";
            }
            
            csv.push(`${key},${val},${unit},${category}`);
        }
        csv.push("");

        // 2. Computed Nodes Coordinates
        csv.push("2. GEOMETRIC NODES (Relative to Bottom Bracket at (0,0))");
        csv.push("Node Name,X Position (mm),Y Position (mm),Z Position (mm)");
        if (this.geometry.nodes) {
            for (const [name, pt] of Object.entries(this.geometry.nodes)) {
                csv.push(`${name},${pt.x.toFixed(2)},${pt.y.toFixed(2)},0.00`);
            }
        }
        csv.push("");

        // 3. Computed Metrics & Telemetry
        csv.push("3. COMPONENT ANALYSIS & PHYSICS TELEMETRY");
        csv.push("Metric Name,Value,Unit,Description");
        
        if (this.geometry.metrics) {
            csv.push(`Wheelbase,${this.geometry.metrics.wheelbase.toFixed(2)},mm,Distance between wheel centers`);
            csv.push(`Trail,${this.geometry.metrics.trail.toFixed(2)},mm,Steering stability index`);
            csv.push(`Stack,${this.geometry.metrics.stack.toFixed(2)},mm,Vertical height from BB to head tube top`);
            csv.push(`Reach,${this.geometry.metrics.reach.toFixed(2)},mm,Horizontal distance from BB to head tube top`);
        }
        
        if (this.geometry.forces) {
            csv.push(`BB Torque,${this.geometry.forces.bbTorque.toFixed(2)},Nm,Rotational torque at bottom bracket`);
            csv.push(`Seat Tube Force,${this.geometry.forces.seatTubeForce.toFixed(2)},N,Compressive load on seat tube`);
            csv.push(`Head Tube Force,${this.geometry.forces.headTubeForce.toFixed(2)},N,Dynamic load on head tube during braking`);
            csv.push(`Rear Axle Load,${this.geometry.forces.rearForce.toFixed(2)},N,Static rear wheel force load`);
            csv.push(`Front Axle Load,${this.geometry.forces.frontForce.toFixed(2)},N,Static front wheel force load`);
        }
        
        if (this.geometry.stresses) {
            csv.push(`Seat Tube Bending Stress,${this.geometry.stresses.seatTubeStress.toFixed(2)},MPa,Calculated bending load on seat tube`);
            csv.push(`Down Tube Bending Stress,${this.geometry.stresses.downTubeStress.toFixed(2)},MPa,Calculated bending load on down tube`);
            csv.push(`Top Tube Bending Stress,${this.geometry.stresses.topTubeStress.toFixed(2)},MPa,Calculated bending load on top tube`);
            csv.push(`Material Yield Strength,${this.geometry.stresses.materialYield},MPa,Elastic limit of selected frame material`);
            csv.push(`Seat Tube Safety Factor,${this.geometry.stresses.safetyFactorSeatTube.toFixed(3)},ratio,Yield-to-stress ratio for seat tube`);
            csv.push(`Down Tube Safety Factor,${this.geometry.stresses.safetyFactorDownTube.toFixed(3)},ratio,Yield-to-stress ratio for down tube`);
            csv.push(`Top Tube Safety Factor,${this.geometry.stresses.safetyFactorTopTube.toFixed(3)},ratio,Yield-to-stress ratio for top tube`);
        }
        
        if (this.geometry.stability !== undefined) {
            csv.push(`Stability Score,${this.geometry.stability.toFixed(2)},/10,General handling stability assessment`);
        }

        return csv.join("\n");
    }
}

window.BikeCSVExporter = BikeCSVExporter;
