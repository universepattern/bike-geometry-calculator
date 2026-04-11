/**
 * Geometry Calculator for Bicycle Frame
 * Translates geometric parameters into 2D Cartesian coordinates.
 * Assumes Bottom Bracket (BB) is at (0, 0) and bike faces RIGHT (+X direction).
 * Y-axis points UP (+Y).
 */

class BikeGeometry {
    constructor(params) {
        this.params = {
            seatTubeLength: 540,
            effTopTubeLength: 550,
            seatTubeAngle: 73,
            headTubeAngle: 73,
            chainStayLength: 415,
            bbDrop: 70,
            forkRake: 43,
            wheelSize: 622, // BSD
            tireWidth: 28,
            ...params
        };
    }

    // Convert degrees to radians
    degToRad(deg) {
        return deg * (Math.PI / 180);
    }

    calculate() {
        const p = this.params;

        // Radii
        const wheelRadius = (p.wheelSize / 2) + p.tireWidth;
        const bbDrop = p.bbDrop;

        // Frame Angles (Seat tube leans back, so angle is > 90 if measuring from positive X axis)
        // Actually, let's keep it simple. If bike faces Right:
        // Seat tube vector from BB: Angle = 180 - seatTubeAngle
        const stRad = this.degToRad(180 - p.seatTubeAngle);
        const htRad = this.degToRad(180 - p.headTubeAngle);

        // 1. Bottom Bracket
        const bb = { x: 0, y: 0 };

        // 2. Rear Axle (Chainstay intersects with horizontal axle line)
        // The axle line is at height = bbDrop relative to BB
        const rearAxleY = bbDrop;
        // chainStayLength^2 = rearAxleX^2 + (rearAxleY - 0)^2
        const rearAxleX = -Math.sqrt(Math.pow(p.chainStayLength, 2) - Math.pow(bbDrop, 2));
        const rearAxle = { x: rearAxleX, y: rearAxleY };

        // 3. Effective Top Tube / Seat Tube intersection (eTTST)
        // Measured from BB along Seat Tube angle
        const eTTST = {
            x: p.seatTubeLength * Math.cos(stRad),
            y: p.seatTubeLength * Math.sin(stRad)
        };

        // 4. Head Tube / Top Tube intersection (HTTT)
        // eTT is horizontal, so HTTT is just eTT length to the right of eTTST
        const htTT = {
            x: eTTST.x + p.effTopTubeLength,
            y: eTTST.y
        };

        // 5. Front Axle Setup
        // The steering axis passes through htTT with angle htRad
        // We know trail and rake behavior, but we can compute front axle
        // based on fork length / headset or simpler math.
        // To simplify, we calculate where the steering axis hits the axle height level.
        // Axle level is Y = bbDrop
        // Steering axis equation: Y - htTT.y = tan(htRad) * (X - htTT.x)
        // at Y = bbDrop => bbDrop - htTT.y = tan(htRad) * (X - htTT.x)
        const steerAxisAxleIntersectX = htTT.x + (bbDrop - htTT.y) / Math.tan(htRad);
        
        // The front axle is offset perpendicular to the steer axis by forkRake.
        // Steer axis angle is htRad. Perpendicular forward is htRad - 90 deg.
        const perpRad = htRad - Math.PI / 2;
        const frontAxle = {
            x: steerAxisAxleIntersectX + p.forkRake * Math.cos(perpRad),
            y: bbDrop + p.forkRake * Math.sin(perpRad) // this should equal bbDrop if forkRake is exact horizontal offset?
            // Actually, fork rake is perpendicular offset from steer axis.
            // Let's refine:
        };

        // Wait, standard fork rake offset shifts the axle line strictly perpendicular.
        // Let's re-calculate: The steering axis intersects the wheel radius height.
        // In most bike geometries, front axle height is same as rear axle height = bbDrop.
        // Let's just fix front axle Y to bbDrop and shift X by Rake / sin(headAngle).
        // Since rake is perpendicular distance, horizontal shift is Rake / sin(HTAngle).
        // If headTubeAngle is e.g. 73 deg (from horizontal)
        const htAngleReal = this.degToRad(p.headTubeAngle); // 73 degrees
        const frontAxleX = steerAxisAxleIntersectX + (p.forkRake / Math.sin(htAngleReal));

        const exactFrontAxle = {
            x: frontAxleX,
            y: bbDrop
        };

        // 6. Head Tube Bottom & Top (Assume standard lengths since we don't have fork length as input, 
        // we'll calculate a standard head tube bounding based on typical fork lengths if not provided, 
        // or we'll just extend a bit below and above htTT).
        // For visualization purpose, let's use a standard 380mm axle-to-crown fork.
        const forkA2C = 380; 
        const lowerHeadsetStack = 15;
        const forkTotalYOffset = forkA2C + lowerHeadsetStack;
        // Find point on steer axis that is distance `forkTotalYOffset` from axle along the axis
        // Actually, fork length is taken along the steering axis.
        const headTubeBottom = {
            x: exactFrontAxle.x - p.forkRake * Math.cos(perpRad) - forkTotalYOffset * Math.cos(htRad),
            y: exactFrontAxle.y - p.forkRake * Math.sin(perpRad) - forkTotalYOffset * Math.sin(htRad)
        };
        // wait, going UP the steerer tube means adding to y and reducing x (since htRad is obtuse)
        // htRad is 107 deg. cos is negative, sin is positive.
        // going UP means negative distance? No, positive distance.
        // let's do:
        const htBottom = {
            x: exactFrontAxle.x - p.forkRake * Math.cos(perpRad) + forkTotalYOffset * Math.cos(this.degToRad(p.headTubeAngle)),
            // above is wrong. Lets project from exactFrontAxle backwards.
        };

        // SIMPLER FORK/HEADTUBE APPROACH:
        // We know htTT. We know steer axis angle (htRad).
        // Let's just make the Head Tube go 20mm above htTT, and down to standard fork length.
        const htLength = 150;
        const htTop = {
            x: htTT.x + 20 * Math.cos(htRad),
            y: htTT.y + 20 * Math.sin(htRad)
        };
        const htBot = {
            x: htTop.x - htLength * Math.cos(htRad),
            y: htTop.y - htLength * Math.sin(htRad)
        };


        // 7. Calculate Down Tube intersection at BB and HT
        // It connects BB to htBot roughly.
        
        // Wheelbase & Trail
        const wheelbase = exactFrontAxle.x - rearAxle.x;
        // Trail = (R * cos(H) - Offset) / sin(H)
        const trail = (wheelRadius * Math.cos(htAngleReal) - p.forkRake) / Math.sin(htAngleReal);

        // Stack and Reach
        // Reach is X dist from BB to Top center of Head Tube
        // Stack is Y dist from BB to Top center of Head Tube
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
}

// Export for use in other scope if needed, or attach to window
window.BikeGeometry = BikeGeometry;
