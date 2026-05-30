/**
 * WebGL 3D Renderer for Bike Designer
 * Generates an interactive 3D representation of the bicycle frame, wheels, and handlebars.
 * Uses Three.js and OrbitControls to support dragging, panning, and zooming.
 */

class BikeRenderer3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error("3D container not found.");
            return;
        }

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x090c15);

        // Perspective Camera
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 500;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
        this.camera.position.set(400, 300, 1000);

        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // Limit going below ground level
        this.controls.minDistance = 300;
        this.controls.maxDistance = 2500;
        this.controls.target.set(300, 200, 0);

        // Lighting
        this.setupLights();

        // Ground Blueprint Grid
        this.gridHelper = new THREE.GridHelper(3000, 40, 0x00d2ff, 0x1e293b);
        this.gridHelper.position.y = -100; // Adjusted on render
        this.scene.add(this.gridHelper);

        this.meshes = [];

        // Resize handler
        window.addEventListener('resize', () => this.resize());

        // Animation Loop (Dampened Orbit Controls update)
        const animate = () => {
            requestAnimationFrame(animate);
            if (this.container.style.display !== 'none') {
                this.controls.update();
                this.renderer.render(this.scene, this.camera);
            }
        };
        animate();
    }

    setupLights() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(ambientLight);

        // Key Light (Directional, casts shadows)
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
        keyLight.position.set(500, 1000, 500);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.bias = -0.001;
        this.scene.add(keyLight);

        // Fill Light (Directional, softer)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-500, 300, -500);
        this.scene.add(fillLight);

        // Bottom BB spotlight for high-tech highlight
        const bbHighlight = new THREE.PointLight(0x00d2ff, 0.6, 500);
        bbHighlight.position.set(0, 50, 100);
        this.scene.add(bbHighlight);
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width && height) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    clear() {
        // Clear frame and wheel mesh objects
        this.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.dispose());
            } else if (mesh.material) {
                mesh.material.dispose();
            }
        });
        this.meshes = [];
    }

    getStressColor(normalizedStress) {
        const red = normalizedStress;
        const green = 1 - normalizedStress;
        return new THREE.Color(red, green, 0);
    }

    createCylinderMesh(p1, p2, radius, colorHex) {
        const A = new THREE.Vector3(p1.x, p1.y, p1.z || 0);
        const B = new THREE.Vector3(p2.x, p2.y, p2.z || 0);
        
        const distance = A.distanceTo(B);
        if (distance === 0) return null;

        const geometry = new THREE.CylinderGeometry(radius, radius, distance, 16);
        
        // Materials: standard metallic-roughness
        const material = new THREE.MeshStandardMaterial({
            color: colorHex,
            metalness: 0.65,
            roughness: 0.25,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Position at midpoint
        const midpoint = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
        mesh.position.copy(midpoint);

        // Orientation
        const direction = new THREE.Vector3().subVectors(B, A).normalize();
        const alignAxis = new THREE.Vector3(0, 1, 0); // Default Cylinder orientation is Y-axis
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(alignAxis, direction);
        mesh.quaternion.copy(quaternion);

        this.scene.add(mesh);
        this.meshes.push(mesh);
        return mesh;
    }

    createTorusMesh(center, radius, tubeRadius, colorHex) {
        const geometry = new THREE.TorusGeometry(radius, tubeRadius, 12, 48);
        const material = new THREE.MeshStandardMaterial({
            color: colorHex,
            metalness: 0.8,
            roughness: 0.3
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(center.x, center.y, center.z || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Rotate torus to align with the XY plane (Three.js torus lies in XY plane by default, so no rotation needed)
        this.scene.add(mesh);
        this.meshes.push(mesh);
        return mesh;
    }

    drawFrame(nodes, stresses, params) {
        const maxStress = 500;
        const frameType = params ? params.frameType : 'diamond';
        
        // Materials limits color checks
        const seatColor = stresses ? this.getStressColor(Math.min(stresses.seatTubeStress, maxStress) / maxStress) : 0x00d2ff;
        const downColor = stresses ? this.getStressColor(Math.min(stresses.downTubeStress, maxStress) / maxStress) : 0x00d2ff;
        const topColor = stresses ? this.getStressColor(Math.min(stresses.topTubeStress, maxStress) / maxStress) : 0x00d2ff;
        const generalColor = 0x334155; // Dark slate grey for non-stress stays

        // --- MAIN TUBE STRUCTURES ---
        this.createCylinderMesh(nodes.bb, nodes.eTTST, 15, seatColor);      // Seat Tube
        this.createCylinderMesh(nodes.htBot, nodes.htTop, 20, generalColor);// Head Tube
        this.createCylinderMesh(nodes.bb, nodes.htBot, 17.5, downColor);    // Down Tube

        // Draw Top Tube based on Frame Shape Type
        if (frameType === 'step-through') {
            const stepThroughST = { 
                x: nodes.bb.x + (nodes.eTTST.x - nodes.bb.x) * 0.4, 
                y: nodes.bb.y + (nodes.eTTST.y - nodes.bb.y) * 0.4,
                z: 0
            };
            this.createCylinderMesh(stepThroughST, nodes.htBot, 14, topColor);
        } else if (frameType === 'split-top') {
            // Twin parallel top tubes (smaller diameters 10mm, offset on Z axis by +/- 12mm)
            this.createCylinderMesh({ x: nodes.eTTST.x, y: nodes.eTTST.y, z: -12 }, { x: nodes.htBot.x, y: nodes.htBot.y, z: -12 }, 10, topColor);
            this.createCylinderMesh({ x: nodes.eTTST.x, y: nodes.eTTST.y, z: 12 }, { x: nodes.htBot.x, y: nodes.htBot.y, z: 12 }, 10, topColor);
        } else if (frameType === 'cantilever') {
            // Draw a curved top tube using segments to form a curved arc
            const segments = 6;
            const controlX = (nodes.eTTST.x + nodes.htBot.x) / 2;
            const controlY = (nodes.eTTST.y + nodes.htBot.y) / 2 - 50; // curve down
            
            let prevPoint = { x: nodes.eTTST.x, y: nodes.eTTST.y, z: 0 };
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const x = Math.pow(1 - t, 2) * nodes.eTTST.x + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * nodes.htBot.x;
                const y = Math.pow(1 - t, 2) * nodes.eTTST.y + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * nodes.htBot.y;
                const currPoint = { x: x, y: y, z: 0 };
                this.createCylinderMesh(prevPoint, currPoint, 14, topColor);
                prevPoint = currPoint;
            }
        } else {
            // Standard Diamond
            this.createCylinderMesh(nodes.eTTST, nodes.htBot, 14, topColor);
        }

        // Bottom Bracket Shell (cylinder along Z-axis)
        this.createCylinderMesh({ x: 0, y: 0, z: -34 }, { x: 0, y: 0, z: 34 }, 22, generalColor);

        // --- CHAINSTAYS (Double stay symmetric offset) ---
        this.createCylinderMesh({ x: nodes.bb.x, y: nodes.bb.y, z: -30 }, { x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: -67 }, 11, generalColor);
        this.createCylinderMesh({ x: nodes.bb.x, y: nodes.bb.y, z: 30 }, { x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: 67 }, 11, generalColor);

        // --- SEATSTAYS (Double stays meeting near seat collar) ---
        this.createCylinderMesh({ x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: -67 }, { x: nodes.eTTST.x, y: nodes.eTTST.y, z: -10 }, 9, generalColor);
        this.createCylinderMesh({ x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: 67 }, { x: nodes.eTTST.x, y: nodes.eTTST.y, z: 10 }, 9, generalColor);

        // --- FORK (Double fork blades offset from head bottom to axle) ---
        this.createCylinderMesh({ x: nodes.htBot.x, y: nodes.htBot.y, z: -15 }, { x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: -50 }, 12, generalColor);
        this.createCylinderMesh({ x: nodes.htBot.x, y: nodes.htBot.y, z: 15 }, { x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: 50 }, 12, generalColor);

        // --- COCKPIT HANDLEBARS ---
        const style = params ? params.handlebarStyle : 'flat';
        const stemLength = 70;
        const stemRise = 15;
        const handlebarCenter = {
            x: nodes.htTop.x + stemLength,
            y: nodes.htTop.y + stemRise,
            z: 0
        };

        // Draw Stem
        this.createCylinderMesh(nodes.htTop, handlebarCenter, 14, 0x1e293b);

        // Draw Handlebars based on selected style
        if (style === 'flat') {
            const leftBarEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: -300 };
            const rightBarEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: 300 };
            this.createCylinderMesh(leftBarEnd, rightBarEnd, 11, 0x0f172a);
            
            // Grips
            this.createCylinderMesh(leftBarEnd, { x: leftBarEnd.x, y: leftBarEnd.y, z: -200 }, 14, 0x020617);
            this.createCylinderMesh(rightBarEnd, { x: rightBarEnd.x, y: rightBarEnd.y, z: 200 }, 14, 0x020617);
        } else if (style === 'riser') {
            // Central clamp (Z = -50 to 50)
            const leftClampEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: -50 };
            const rightClampEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: 50 };
            this.createCylinderMesh(leftClampEnd, rightClampEnd, 12, 0x0f172a);

            // Riser bends (curves slightly upward by 25mm and outward)
            const leftRiseEnd = { x: handlebarCenter.x + 10, y: handlebarCenter.y + 25, z: -100 };
            const rightRiseEnd = { x: handlebarCenter.x + 10, y: handlebarCenter.y + 25, z: 100 };
            this.createCylinderMesh(leftClampEnd, leftRiseEnd, 11, 0x0f172a);
            this.createCylinderMesh(rightClampEnd, rightRiseEnd, 11, 0x0f172a);

            // Bar grips ends
            const leftBarEnd = { x: leftRiseEnd.x, y: leftRiseEnd.y, z: -320 };
            const rightBarEnd = { x: rightRiseEnd.x, y: rightRiseEnd.y, z: 320 };
            this.createCylinderMesh(leftRiseEnd, leftBarEnd, 11, 0x0f172a);
            this.createCylinderMesh(rightRiseEnd, rightBarEnd, 11, 0x0f172a);
            
            // Grip wraps
            this.createCylinderMesh(leftBarEnd, { x: leftBarEnd.x, y: leftBarEnd.y, z: -220 }, 14, 0x020617);
            this.createCylinderMesh(rightBarEnd, { x: rightBarEnd.x, y: rightBarEnd.y, z: 220 }, 14, 0x020617);
        } else if (style === 'drop') {
            // Drop loops (extending outwards by 200mm, then curving forward and down)
            const leftClampEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: -200 };
            const rightClampEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: 200 };
            this.createCylinderMesh(leftClampEnd, rightClampEnd, 12, 0x0f172a);

            // Curved drops (segmented sweeps)
            const loopSegments = 8;
            let prevL = leftClampEnd;
            let prevR = rightClampEnd;
            for (let i = 1; i <= loopSegments; i++) {
                const theta = (i / loopSegments) * Math.PI * 0.8;
                const dx = 80 * Math.sin(theta);
                const dy = -100 * (1 - Math.cos(theta));
                
                const currL = { x: leftClampEnd.x + dx, y: leftClampEnd.y + dy, z: leftClampEnd.z - 20 * Math.sin(theta) };
                const currR = { x: rightClampEnd.x + dx, y: rightClampEnd.y + dy, z: rightClampEnd.z + 20 * Math.sin(theta) };
                
                this.createCylinderMesh(prevL, currL, 11, 0x0f172a);
                this.createCylinderMesh(prevR, currR, 11, 0x0f172a);
                prevL = currL;
                prevR = currR;
            }
        } else if (style === 'bullhorn') {
            // Flat bar out to Z = +/- 180mm, then curving forward
            const leftClampEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: -180 };
            const rightClampEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: 180 };
            this.createCylinderMesh(leftClampEnd, rightClampEnd, 12, 0x0f172a);

            // Horn bars forward (120mm)
            const leftHornEnd = { x: leftClampEnd.x + 120, y: leftClampEnd.y + 10, z: leftClampEnd.z };
            const rightHornEnd = { x: rightClampEnd.x + 120, y: rightClampEnd.y + 10, z: rightClampEnd.z };
            this.createCylinderMesh(leftClampEnd, leftHornEnd, 11, 0x0f172a);
            this.createCylinderMesh(rightClampEnd, rightHornEnd, 11, 0x0f172a);

            // Horn tips upturns (30mm)
            const leftHornUp = { x: leftHornEnd.x + 30, y: leftHornEnd.y + 25, z: leftHornEnd.z };
            const rightHornUp = { x: rightHornEnd.x + 30, y: rightHornEnd.y + 25, z: rightHornEnd.z };
            this.createCylinderMesh(leftHornEnd, leftHornUp, 11, 0x0f172a);
            this.createCylinderMesh(rightHornEnd, rightHornUp, 11, 0x0f172a);
        }
    }

    drawWheels(nodes, params) {
        const wheelRadius = (params.wheelSize / 2) + params.tireWidth;
        const tireRadius = params.tireWidth;
        const rimRadius = wheelRadius - tireRadius;

        // Colors
        const tireColor = 0x111317; // Charcoal black
        const rimColor = 0x3b4252;  // Silver-grey anodized
        const hubColor = 0xd8dee9;  // Chrome silver

        // --- REAR WHEEL ---
        this.createTorusMesh(nodes.rearAxle, rimRadius, 6, rimColor); // Rim
        this.createTorusMesh(nodes.rearAxle, wheelRadius - tireRadius / 2, tireRadius / 2, tireColor); // Tire
        // Hub axis
        this.createCylinderMesh(
            { x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: -68 },
            { x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: 68 },
            10, hubColor
        );
        // Flange rims
        this.createCylinderMesh({ x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: -25 }, { x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: -23 }, 22, hubColor);
        this.createCylinderMesh({ x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: 23 }, { x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: 25 }, 22, hubColor);

        // 3D Dished Spokes (24 alternating spokes from hub flanges to rim center)
        const rearSpokes = 24;
        const rearFlangeZ = 24;
        for (let i = 0; i < rearSpokes; i++) {
            const angle = (2 * Math.PI * i) / rearSpokes;
            const cos = Math.cos(angle) * rimRadius;
            const sin = Math.sin(angle) * rimRadius;
            
            const rimPoint = { x: nodes.rearAxle.x + cos, y: nodes.rearAxle.y + sin, z: 0 };
            const hubZ = (i % 2 === 0) ? -rearFlangeZ : rearFlangeZ;
            const hubPoint = { x: nodes.rearAxle.x, y: nodes.rearAxle.y, z: hubZ };
            
            this.createCylinderMesh(hubPoint, rimPoint, 1.0, 0xd8dee9);
        }

        // --- FRONT WHEEL ---
        this.createTorusMesh(nodes.frontAxle, rimRadius, 6, rimColor); // Rim
        this.createTorusMesh(nodes.frontAxle, wheelRadius - tireRadius / 2, tireRadius / 2, tireColor); // Tire
        // Hub axis
        this.createCylinderMesh(
            { x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: -52 },
            { x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: 52 },
            10, hubColor
        );
        // Flange rims
        this.createCylinderMesh({ x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: -21 }, { x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: -19 }, 22, hubColor);
        this.createCylinderMesh({ x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: 19 }, { x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: 21 }, 22, hubColor);

        // 3D Dished Spokes (24 alternating spokes)
        const frontSpokes = 24;
        const frontFlangeZ = 20;
        for (let i = 0; i < frontSpokes; i++) {
            const angle = (2 * Math.PI * i) / frontSpokes;
            const cos = Math.cos(angle) * rimRadius;
            const sin = Math.sin(angle) * rimRadius;
            
            const rimPoint = { x: nodes.frontAxle.x + cos, y: nodes.frontAxle.y + sin, z: 0 };
            const hubZ = (i % 2 === 0) ? -frontFlangeZ : frontFlangeZ;
            const hubPoint = { x: nodes.frontAxle.x, y: nodes.frontAxle.y, z: hubZ };
            
            this.createCylinderMesh(hubPoint, rimPoint, 1.0, 0xd8dee9);
        }
    }

    render(geometry, params) {
        this.clear();
        this.params = params; // store locally for drawFrame / drawWheels calls
        
        const nodes = geometry.nodes;
        const wheelRadius = (params.wheelSize / 2) + params.tireWidth;

        // Position ground blueprint grid relative to wheels base contact
        this.gridHelper.position.y = nodes.rearAxle.y - wheelRadius;

        // Draw 3D elements
        this.drawFrame(nodes, geometry.stresses, params);
        this.drawWheels(nodes, params);

        // Adjust Orbit Control targets around the bike geometry midpoint
        const bikeMidX = (nodes.frontAxle.x + nodes.rearAxle.x) / 2;
        const bikeMidY = (nodes.htTop.y + nodes.bb.y) / 2;
        this.controls.target.set(bikeMidX, bikeMidY, 0);
    }
}

window.BikeRenderer3D = BikeRenderer3D;
