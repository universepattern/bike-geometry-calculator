/**
 * Geometry Calculator for Bicycle Frame
 * Extended with Physics-Based Force & Torque Analysis and Rider Fit Suggestions
 * Translates geometric parameters into 2D Cartesian coordinates and calculates forces, torques, stresses, and fit recommendations.
 * Assumes Bottom Bracket (BB) is at (0, 0) and bike faces RIGHT (+X direction).
 * Y-axis points UP (+Y).
 */

class BikeGeometry {
    constructor(params) {
        this.params = {
            // Existing geometric parameters
            seatTubeLength: 540,
            effTopTubeLength: 550,
            seatTubeAngle: 73,
            headTubeAngle: 73,
            chainStayLength: 415,
            bbDrop: 70,
            forkRake: 43,
            wheelSize: 622, // BSD
            tireWidth: 28,

            // New physics parameters
            riderWeight: 75,       // kg
            saddleSetback: 10,     // mm
            crankLength: 170,      // mm
            powerOutput: 250,      // W
            brakingForce: 1.0,     // g (deceleration multiplier)
            frameMaterial: "steel", // steel, aluminum, carbon
            
            // Rider Fit parameters
            riderHeight: 175,      // cm
            riderInseam: 80,       // cm
            ridingStyle: "road",   // road, mtb, touring, cargo
            ...params
        };

        this.result = null;
    }

    // Convert degrees to radians
    degToRad(deg) {
        return deg * (Math.PI / 180);
    }

    // Calculate geometric nodes (existing logic)
    _calculateGeometry() {
        const p = this.params;

        // Radii
        const wheelRadius = (p.wheelSize / 2) + p.tireWidth;
        const bbDrop = p.bbDrop;

        // Frame Angles (Seat tube leans back, so angle is > 90 if measuring from positive X axis)
        const stRad = this.degToRad(180 - p.seatTubeAngle);
        const htRad = this.degToRad(180 - p.headTubeAngle);

        // 1. Bottom Bracket
        const bb = { x: 0, y: 0 };

        // 2. Rear Axle
        const rearAxleY = bbDrop;
        const rearAxleX = -Math.sqrt(Math.pow(p.chainStayLength, 2) - Math.pow(bbDrop, 2));
        const rearAxle = { x: rearAxleX, y: rearAxleY };

        // 3. Effective Top Tube / Seat Tube intersection (eTTST)
        const eTTST = {
            x: p.seatTubeLength * Math.cos(stRad),
            y: p.seatTubeLength * Math.sin(stRad)
        };

        // 4. Head Tube / Top Tube intersection (HTTT)
        const htTT = {
            x: eTTST.x + p.effTopTubeLength,
            y: eTTST.y
        };

        // 5. Front Axle
        const htAngleReal = this.degToRad(p.headTubeAngle); // 73 degrees
        const steerAxisAxleIntersectX = htTT.x + (bbDrop - htTT.y) / Math.tan(htRad);
        const frontAxleX = steerAxisAxleIntersectX + (p.forkRake / Math.sin(htAngleReal));
        const exactFrontAxle = {
            x: frontAxleX,
            y: bbDrop
        };

        // 6. Head Tube Top & Bottom
        const htLength = 150;
        const htTop = {
            x: htTT.x + 20 * Math.cos(htRad),
            y: htTT.y + 20 * Math.sin(htRad)
        };
        const htBot = {
            x: htTop.x - htLength * Math.cos(htRad),
            y: htTop.y - htLength * Math.sin(htRad)
        };

        // Wheelbase & Trail
        const wheelbase = exactFrontAxle.x - rearAxle.x;
        const trail = (wheelRadius * Math.cos(htAngleReal) - p.forkRake) / Math.sin(htAngleReal);

        // Stack and Reach
        const reach = htTop.x - bb.x;
        const stack = htTop.y - bb.y;

        return {
            nodes: {
                bb: bb,
                rearAxle: rearAxle,
                eTTST: eTTST,
                htTT: htTT,
                frontAxle: exactFrontAxle,
                htTop: htTop,
                htBot: htBot
            },
            metrics: {
                wheelbase: wheelbase,
                trail: trail,
                stack: stack,
                reach: reach,
                wheelRadius: wheelRadius
            }
        };
    }

    // Calculate forces and torques
    calculateForces() {
        const p = this.params;
        const g = 9.81; // m/s²
        const nodes = this.result.nodes;
        const metrics = this.result.metrics;

        // Rider forces (60% rear, 40% front)
        const rearForce = p.riderWeight * 0.6 * g;
        const frontForce = p.riderWeight * 0.4 * g;

        // Pedaling torque (simplified: P = τ * ω => τ = P / ω)
        // Assume cadence = 60 RPM (1 rotation per second)
        const cadence = 60; // RPM
        const angularVelocity = (2 * Math.PI * cadence) / 60; // rad/s
        const torque_BB = (p.powerOutput / angularVelocity) * 1000; // Convert to Nm (since power is in Watts)

        // Braking force (deceleration)
        const deceleration = p.brakingForce * g;
        const brakingForceFront = frontForce + (p.riderWeight * deceleration * (metrics.wheelbase - metrics.trail) / metrics.wheelbase);
        const brakingForceRear = rearForce - (p.riderWeight * deceleration * metrics.trail / metrics.wheelbase);

        // Seat tube compressive force (rider weight + pedaling)
        const seatTubeForce = rearForce + (torque_BB / (p.crankLength / 1000));

        // Head tube force (braking)
        const headTubeForce = brakingForceFront;

        return {
            bbTorque: torque_BB,
            seatTubeForce: seatTubeForce,
            headTubeForce: headTubeForce,
            rearForce: rearForce,
            frontForce: frontForce,
            brakingForceFront: brakingForceFront,
            brakingForceRear: brakingForceRear,
        };
    }

    // Calculate stresses using beam theory
    calculateStresses() {
        const forces = this.calculateForces();
        const p = this.params;

        // Material properties (yield strength in MPa, Young's modulus in Pa)
        const materialProps = {
            steel: { yieldStrength: 250, youngsModulus: 200e9, name: "Steel" },
            aluminum: { yieldStrength: 200, youngsModulus: 70e9, name: "Aluminum" },
            carbon: { yieldStrength: 500, youngsModulus: 150e9, name: "Carbon" },
        };

        const props = materialProps[p.frameMaterial] || materialProps.steel;

        // Assume tube dimensions (could be made configurable later)
        const tubeDimensions = {
            seatTube: { outerDiameter: 30, wallThickness: 2 }, // mm
            downTube: { outerDiameter: 35, wallThickness: 2 },
            topTube: { outerDiameter: 28, wallThickness: 1.5 },
            headTube: { outerDiameter: 40, wallThickness: 3 },
            chainstay: { outerDiameter: 25, wallThickness: 1.5 },
            seatstay: { outerDiameter: 20, wallThickness: 1.2 },
        };

        // Helper function to calculate moment of inertia for a hollow tube
        const calculateMomentOfInertia = (outerDiameter, wallThickness) => {
            const outerRadius = (outerDiameter / 2) / 1000; // Convert to meters
            const innerRadius = (outerDiameter / 2 - wallThickness) / 1000;
            return (Math.PI / 4) * (Math.pow(outerRadius, 4) - Math.pow(innerRadius, 4));
        };

        // Helper function to calculate stress (σ = (M * y) / I)
        const calculateBendingStress = (force, length, outerDiameter, wallThickness) => {
            const M = force * (length / 1000); // Bending moment in Nm (length converted to meters)
            const I = calculateMomentOfInertia(outerDiameter, wallThickness); // m^4
            const y = (outerDiameter / 2) / 1000; // Outer radius in meters
            const stress = (M * y) / I; // Stress in Pascals (N/m²)
            return stress / 1e6; // Convert to MPa
        };

        // Calculate stresses for each tube
        const seatTubeLength = p.seatTubeLength / 1000; // Convert to meters
        const seatTubeStress = calculateBendingStress(
            forces.seatTubeForce,
            seatTubeLength * 1000, // Convert back to mm for consistency
            tubeDimensions.seatTube.outerDiameter,
            tubeDimensions.seatTube.wallThickness
        );

        const downTubeLength = Math.hypot(
            this.result.nodes.htBot.x - this.result.nodes.bb.x,
            this.result.nodes.htBot.y - this.result.nodes.bb.y
        ) / 1000; // Convert to meters
        const downTubeForce = forces.headTubeForce * 0.7; // Approximate distribution
        const downTubeStress = calculateBendingStress(
            downTubeForce,
            downTubeLength * 1000,
            tubeDimensions.downTube.outerDiameter,
            tubeDimensions.downTube.wallThickness
        );

        const topTubeLength = p.effTopTubeLength / 1000;
        const topTubeForce = forces.seatTubeForce * 0.3; // Approximate distribution
        const topTubeStress = calculateBendingStress(
            topTubeForce,
            topTubeLength * 1000,
            tubeDimensions.topTube.outerDiameter,
            tubeDimensions.topTube.wallThickness
        );

        return {
            seatTubeStress: seatTubeStress,
            downTubeStress: downTubeStress,
            topTubeStress: topTubeStress,
            materialYield: props.yieldStrength,
            materialName: props.name,
            safetyFactorSeatTube: props.yieldStrength / seatTubeStress,
            safetyFactorDownTube: props.yieldStrength / downTubeStress,
            safetyFactorTopTube: props.yieldStrength / topTubeStress,
        };
    }

    // Calculate stability score (0-10)
    calculateStability() {
        const trail = this.result.metrics.trail;
        const wheelbase = this.result.metrics.wheelbase;
        // Stability score: higher trail and longer wheelbase = more stable
        return Math.min((trail / wheelbase) * 10, 10);
    }

    // Calculate rider fit suggestions
    calculateFit() {
        const p = this.params;
        const H = p.riderHeight * 10; // height in mm
        const I = p.riderInseam * 10;  // inseam in mm
        
        // Suggested Seat Tube length (C-C) based on standard formulas (~66% of Inseam)
        const suggestedSeatTube = I * 0.66;
        
        // Stack and Reach suggestions based on riding style and rider height
        let stackFactor = 0.31;
        let reachFactor = 0.22;
        
        if (p.ridingStyle === "mtb") {
            stackFactor = 0.35;
            reachFactor = 0.25;
        } else if (p.ridingStyle === "touring") {
            stackFactor = 0.33;
            reachFactor = 0.23;
        } else if (p.ridingStyle === "cargo") {
            stackFactor = 0.36;
            reachFactor = 0.21;
        }
        
        const suggestedStack = H * stackFactor;
        const suggestedReach = H * reachFactor;
        
        return {
            suggestedSeatTube,
            suggestedStack,
            suggestedReach,
            seatTubeDelta: p.seatTubeLength - suggestedSeatTube,
            stackDelta: this.result.metrics.stack - suggestedStack,
            reachDelta: this.result.metrics.reach - suggestedReach
        };
    }

    // Main calculation method
    calculate() {
        this.result = this._calculateGeometry();

        // Add physics calculations
        this.result.forces = this.calculateForces();
        this.result.stresses = this.calculateStresses();
        this.result.stability = this.calculateStability();
        this.result.fit = this.calculateFit();

        return this.result;
    }
}

// Export for use in other scope
window.BikeGeometry = BikeGeometry;
