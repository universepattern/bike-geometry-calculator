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

    drawFrame(nodes, stresses) {
        const maxStress = 500;
        
        // Materials limits color checks
        const seatColor = stresses ? this.getStressColor(Math.min(stresses.seatTubeStress, maxStress) / maxStress) : 0x00d2ff;
        const downColor = stresses ? this.getStressColor(Math.min(stresses.downTubeStress, maxStress) / maxStress) : 0x00d2ff;
        const topColor = stresses ? this.getStressColor(Math.min(stresses.topTubeStress, maxStress) / maxStress) : 0x00d2ff;
        const generalColor = 0x334155; // Dark slate grey for non-stress stays

        // --- MAIN TUBE STRUCTURES ---
        this.createCylinderMesh(nodes.eTTST, nodes.htBot, 14, topColor);    // Top Tube
        this.createCylinderMesh(nodes.bb, nodes.eTTST, 15, seatColor);      // Seat Tube
        this.createCylinderMesh(nodes.htBot, nodes.htTop, 20, generalColor);// Head Tube
        this.createCylinderMesh(nodes.bb, nodes.htBot, 17.5, downColor);    // Down Tube

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

        // --- HANDLEBARS (Stem & Crossbar representation) ---
        // 1. Stem: Extends forward from headtube top
        const handlebarCenter = {
            x: nodes.htTop.x + 70,
            y: nodes.htTop.y + 15,
            z: 0
        };
        this.createCylinderMesh(nodes.htTop, handlebarCenter, 14, 0x1e293b);

        // 2. Flat Crossbar (along Z axis)
        const leftBarEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: -300 };
        const rightBarEnd = { x: handlebarCenter.x, y: handlebarCenter.y, z: 300 };
        this.createCylinderMesh(leftBarEnd, rightBarEnd, 11, 0x0f172a);
        
        // 3. Grips
        this.createCylinderMesh(leftBarEnd, { x: leftBarEnd.x, y: leftBarEnd.y, z: -200 }, 14, 0x020617);
        this.createCylinderMesh(rightBarEnd, { x: rightBarEnd.x, y: rightBarEnd.y, z: 200 }, 14, 0x020617);
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
        
        const nodes = geometry.nodes;
        const wheelRadius = (params.wheelSize / 2) + params.tireWidth;

        // Position ground blueprint grid relative to wheels base contact
        this.gridHelper.position.y = nodes.rearAxle.y - wheelRadius;

        // Draw 3D elements
        this.drawFrame(nodes, geometry.stresses);
        this.drawWheels(nodes, params);

        // Adjust Orbit Control targets around the bike geometry midpoint
        const bikeMidX = (nodes.frontAxle.x + nodes.rearAxle.x) / 2;
        const bikeMidY = (nodes.htTop.y + nodes.bb.y) / 2;
        this.controls.target.set(bikeMidX, bikeMidY, 0);
    }
}

window.BikeRenderer3D = BikeRenderer3D;
