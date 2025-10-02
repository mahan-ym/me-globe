
import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

const earthTexture = "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg";

const locations = [
    { name: "Tehran", lat: 34, lon: 53, info: "Grow up | BSc in Electrical Engineering | Android Developer at JDEVS | Android SDK Developer at Metrix" },
    { name: "Padova", lat: 45.4, lon: 11.9, info: "MSc in ICT for Internet & Multimedia | AI Engineer Internship at Loop.ai" },
    { name: "Eindhoven", lat: 51.44, lon: 5.47, info: "Current career path | AI Software Engineer" },
];

function latLonToVec3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

function CameraAnimator({ targetPos }) {
    const { camera } = useThree();

    React.useEffect(() => {
        if (targetPos) {
            gsap.to(camera.position, {
                x: targetPos.x,
                y: targetPos.y,
                z: targetPos.z,
                duration: 2,
                ease: "power2.inOut"
            });
        }
    }, [targetPos]);

    return null;
}

// Atmosphere shader material
function AtmosphereShader() {
    const atmosphereVertexShader = `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const atmosphereFragmentShader = `
        varying vec3 vNormal;
        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
            gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
    `;

    return { atmosphereVertexShader, atmosphereFragmentShader };
}

function Atmosphere() {
    const { atmosphereVertexShader, atmosphereFragmentShader } = AtmosphereShader();

    const atmosphereMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: atmosphereVertexShader,
            fragmentShader: atmosphereFragmentShader,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
    }, [atmosphereVertexShader, atmosphereFragmentShader]);

    return (
        <Sphere args={[2.4, 64, 64]}>
            <primitive object={atmosphereMaterial} attach="material" />
        </Sphere>
    );
}

function SplitEffects({ splitProgress, isSplit, isReassembling }) {
    const particlesRef = useRef();
    const particleCount = 5000;

    const particlePositions = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            // Start particles near the center/split plane
            positions[i * 3] = (Math.random() - 0.5) * 0.7; // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3; // y (near split plane)
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.7; // z
        }
        return positions;
    }, []);

    useFrame(({ clock }) => {
        if (particlesRef.current && isSplit) {
            const time = clock.getElapsedTime();
            const positions = particlesRef.current.geometry.attributes.position.array;

            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;

                if (isReassembling) {
                    // During reassembly, particles move inward toward the center
                    const centerPull = 0.01;
                    positions[i3] *= (1 - centerPull); // Pull x toward center
                    positions[i3 + 1] *= (1 - centerPull); // Pull y toward center
                    positions[i3 + 2] *= (1 - centerPull); // Pull z toward center

                    // Add some swirl effect during reassembly
                    const swirl = Math.sin(time * 3 + i) * 0.003;
                    positions[i3] += Math.sin(time * 3 + i) * 0.003;
                    positions[i3 + 2] += Math.cos(time * 3 + i) * 0.1;
                } else {
                    // Normal split behavior - particles moving outward from the lava core
                    positions[i3] += (Math.random() - 0.5) * 0.01 * splitProgress; // x movement
                    positions[i3 + 1] += Math.sin(time + i) * 0.01 + (Math.random() - 0.5) * 0.001; // y movement with float
                    positions[i3 + 2] += (Math.random() - 0.5) * 0.1 * splitProgress; // z movement
                }
            }

            particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    if (!isSplit) return null;

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    array={particlePositions}
                    count={particleCount}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.08}
                color={isReassembling ? "#4488ff" : "#ff4500"}
                opacity={splitProgress * 0.8}
                transparent
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

function GlobeMesh({ onShowInfo, isSplit, splitProgress, isReassembling }) {
    const globeRef = useRef();
    const bottomHalfRef = useRef();
    const topHalfRef = useRef();
    const bottomLavaRef = useRef();
    const topLavaRef = useRef();
    const meshRefs = useRef([]);
    const [targetPos, setTargetPos] = useState(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        // Handle split animation - like an orange cut in half
        if (isSplit && bottomHalfRef.current && topHalfRef.current) {

            // Add reassemble pulse effect
            const reassemblePulse = isReassembling ? 1 + Math.sin(t * 8) * 0.05 : 1;
            const reassembleGlow = isReassembling ? 0.3 + Math.sin(t * 6) * 0.2 : 0;

            // Bottom half stays in place (with slight downward movement)
            bottomHalfRef.current.position.x = 0;
            bottomHalfRef.current.position.y = -splitProgress * 0.5; // More downward movement
            bottomHalfRef.current.position.z = 0;
            bottomHalfRef.current.rotation.x = 0;
            bottomHalfRef.current.rotation.y = 0;
            bottomHalfRef.current.rotation.z = 0;
            bottomHalfRef.current.scale.setScalar(reassemblePulse);

            // Top half lifts up and tilts
            topHalfRef.current.position.x = 0;
            topHalfRef.current.position.y = splitProgress; // More lift up
            topHalfRef.current.position.z = 0;

            // Tilt the top half slightly for dramatic effect
            topHalfRef.current.rotation.x = splitProgress * 0.5; // More tilt forward
            topHalfRef.current.rotation.y = 0;
            topHalfRef.current.rotation.z = splitProgress * 0.2; // More roll
            topHalfRef.current.scale.setScalar(reassemblePulse);

            // Add reassemble glow effect to materials
            if (isReassembling) {
                bottomHalfRef.current.material.emissive.setRGB(reassembleGlow * 0.2, reassembleGlow * 0.4, reassembleGlow * 0.8);
                topHalfRef.current.material.emissive.setRGB(reassembleGlow * 0.2, reassembleGlow * 0.4, reassembleGlow * 0.8);
            } else {
                bottomHalfRef.current.material.emissive.setRGB(0, 0, 0);
                topHalfRef.current.material.emissive.setRGB(0, 0, 0);
            }

            // Animate lava halves - make them glow and pulse, following their respective globe halves
            if (bottomLavaRef.current) {
                bottomLavaRef.current.material.emissiveIntensity = 0.5 + splitProgress * 0.8 + (isReassembling ? reassembleGlow : 0);
                bottomLavaRef.current.rotation.y = t * 0.5; // Slow rotation
                bottomLavaRef.current.scale.setScalar((1.01 + Math.sin(t * 3) * 0.05 * splitProgress) * reassemblePulse);
                // Follow bottom half position
                bottomLavaRef.current.position.copy(bottomHalfRef.current.position);
                bottomLavaRef.current.position.y -= 0.01 * splitProgress; // Slight offset upward
                bottomLavaRef.current.rotation.copy(bottomHalfRef.current.rotation);
            }

            if (topLavaRef.current) {
                topLavaRef.current.material.emissiveIntensity = 0.5 + splitProgress * 0.8 + (isReassembling ? reassembleGlow : 0);
                topLavaRef.current.rotation.y = t * 0.5; // Slow rotation
                topLavaRef.current.scale.setScalar((1.01 + Math.sin(t * 3 + Math.PI) * 0.05 * splitProgress) * reassemblePulse); // Offset phase
                // Follow top half position
                topLavaRef.current.position.copy(topHalfRef.current.position);
                topLavaRef.current.position.y -= 0.05 * splitProgress; // Slight offset downward
                topLavaRef.current.rotation.copy(topHalfRef.current.rotation);
            }
        }

        // Apply animation to all pin meshes
        meshRefs.current.forEach((meshRef, index) => {
            if (meshRef) {
                // make it "pulse" with slight offset for each pin
                const offset = index * 0.5; // stagger the animation
                meshRef.material.opacity = 0.8 + 0.2 * Math.sin(t * 5 + offset);
                meshRef.material.color.setHSL(0.12, 1, 0.5 + 0.1 * Math.sin(t * 3 + offset));
                // optional: scale flicker
                meshRef.scale.set(
                    1 + 0.05 * Math.sin(t * 6 + offset),
                    1 + 0.05 * Math.cos(t * 6 + offset),
                    1
                );
            }
        });
    });

    const handlePinClick = (loc) => {
        const pos = latLonToVec3(loc.lat, loc.lon, 5);
        setTargetPos(pos);
        onShowInfo({ title: loc.name, description: loc.info });
    };

    // Create geometry for hemisphere split (like an orange) with proper UV mapping
    const bottomHalfGeometry = useMemo(() => {
        const geometry = new THREE.SphereGeometry(2, 64, 64, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        // Adjust UV mapping for bottom half
        const uvs = geometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            uvs[i + 1] = uvs[i + 1] * 0.5; // Scale V coordinate to bottom half
        }
        geometry.attributes.uv.needsUpdate = true;
        return geometry;
    }, []);

    const topHalfGeometry = useMemo(() => {
        const geometry = new THREE.SphereGeometry(2, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
        // Adjust UV mapping for top half
        const uvs = geometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            uvs[i + 1] = uvs[i + 1] * 0.5 + 0.5; // Scale and offset V coordinate to top half
        }
        geometry.attributes.uv.needsUpdate = true;
        return geometry;
    }, []);

    // Create lava geometry halves to match the globe halves
    const bottomLavaGeometry = useMemo(() => {
        // Create hemisphere shell
        const hemisphereGeometry = new THREE.SphereGeometry(1.85, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

        // Create circular cap to fill the opening
        const capGeometry = new THREE.CircleGeometry(1.85, 32);
        capGeometry.rotateX(-Math.PI / 2); // Rotate to face upward (closing the top of bottom half)

        // Merge geometries
        const mergedGeometry = new THREE.BufferGeometry();
        const hemispherePositions = hemisphereGeometry.attributes.position.array;
        const hemisphereNormals = hemisphereGeometry.attributes.normal.array;
        const hemisphereUvs = hemisphereGeometry.attributes.uv.array;
        const hemisphereIndices = hemisphereGeometry.index.array;

        const capPositions = capGeometry.attributes.position.array;
        const capNormals = capGeometry.attributes.normal.array;
        const capUvs = capGeometry.attributes.uv.array;
        const capIndices = capGeometry.index.array;

        // Combine positions
        const totalPositions = new Float32Array(hemispherePositions.length + capPositions.length);
        totalPositions.set(hemispherePositions);
        totalPositions.set(capPositions, hemispherePositions.length);

        // Combine normals
        const totalNormals = new Float32Array(hemisphereNormals.length + capNormals.length);
        totalNormals.set(hemisphereNormals);
        totalNormals.set(capNormals, hemisphereNormals.length);

        // Combine UVs
        const totalUvs = new Float32Array(hemisphereUvs.length + capUvs.length);
        totalUvs.set(hemisphereUvs);
        totalUvs.set(capUvs, hemisphereUvs.length);

        // Combine indices (offset cap indices by hemisphere vertex count)
        const hemisphereVertexCount = hemispherePositions.length / 3;
        const totalIndices = new Uint32Array(hemisphereIndices.length + capIndices.length);
        totalIndices.set(hemisphereIndices);
        for (let i = 0; i < capIndices.length; i++) {
            totalIndices[hemisphereIndices.length + i] = capIndices[i] + hemisphereVertexCount;
        }

        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(totalPositions, 3));
        mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(totalNormals, 3));
        mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(totalUvs, 2));
        mergedGeometry.setIndex(new THREE.BufferAttribute(totalIndices, 1));

        return mergedGeometry;
    }, []);

    const topLavaGeometry = useMemo(() => {
        // Create hemisphere shell
        const hemisphereGeometry = new THREE.SphereGeometry(1.85, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);

        // Create circular cap to fill the opening
        const capGeometry = new THREE.CircleGeometry(1.85, 32);
        capGeometry.rotateX(Math.PI / 2); // Rotate to face downward (closing the bottom of top half)

        // Merge geometries
        const mergedGeometry = new THREE.BufferGeometry();
        const hemispherePositions = hemisphereGeometry.attributes.position.array;
        const hemisphereNormals = hemisphereGeometry.attributes.normal.array;
        const hemisphereUvs = hemisphereGeometry.attributes.uv.array;
        const hemisphereIndices = hemisphereGeometry.index.array;

        const capPositions = capGeometry.attributes.position.array;
        const capNormals = capGeometry.attributes.normal.array;
        const capUvs = capGeometry.attributes.uv.array;
        const capIndices = capGeometry.index.array;

        // Combine positions
        const totalPositions = new Float32Array(hemispherePositions.length + capPositions.length);
        totalPositions.set(hemispherePositions);
        totalPositions.set(capPositions, hemispherePositions.length);

        // Combine normals
        const totalNormals = new Float32Array(hemisphereNormals.length + capNormals.length);
        totalNormals.set(hemisphereNormals);
        totalNormals.set(capNormals, hemisphereNormals.length);

        // Combine UVs
        const totalUvs = new Float32Array(hemisphereUvs.length + capUvs.length);
        totalUvs.set(hemisphereUvs);
        totalUvs.set(capUvs, hemisphereUvs.length);

        // Combine indices (offset cap indices by hemisphere vertex count)
        const hemisphereVertexCount = hemispherePositions.length / 3;
        const totalIndices = new Uint32Array(hemisphereIndices.length + capIndices.length);
        totalIndices.set(hemisphereIndices);
        for (let i = 0; i < capIndices.length; i++) {
            totalIndices[hemisphereIndices.length + i] = capIndices[i] + hemisphereVertexCount;
        }

        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(totalPositions, 3));
        mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(totalNormals, 3));
        mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(totalUvs, 2));
        mergedGeometry.setIndex(new THREE.BufferAttribute(totalIndices, 1));

        return mergedGeometry;
    }, []);

    // Create lava material with animated effect
    const lavaMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: '#ff4500',
            emissive: '#ff2200',
            emissiveIntensity: 0.5,
            roughness: 0.8,
            metalness: 0.2,
        });
    }, []);

    const globeTexture = useMemo(() => new THREE.TextureLoader().load(earthTexture), []);

    return (
        <>
            {!isSplit ? (
                // Regular globe
                <Sphere ref={globeRef} args={[2, 64, 64]}>
                    <meshStandardMaterial
                        map={globeTexture}
                        roughness={0.8}
                        metalness={0.1}
                    />
                </Sphere>
            ) : (
                // Split globe halves (bottom and top) with lava core halves
                <>

                    {/* Lava core halves - only visible when split */}
                    <mesh ref={bottomLavaRef} geometry={bottomLavaGeometry}>
                        <primitive object={lavaMaterial} attach="material" />
                    </mesh>
                    <mesh ref={topLavaRef} geometry={topLavaGeometry}>
                        <primitive object={lavaMaterial} attach="material" />
                    </mesh>

                    {/* Bottom half */}
                    <mesh ref={bottomHalfRef} geometry={bottomHalfGeometry}>
                        <meshStandardMaterial
                            map={globeTexture}
                            roughness={0.8}
                            metalness={0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Top half */}
                    <mesh ref={topHalfRef} geometry={topHalfGeometry}>
                        <meshStandardMaterial
                            map={globeTexture}
                            roughness={0.8}
                            metalness={0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </>
            )}

            {(!isSplit || splitProgress < 0.5) && <Atmosphere />}

            {/* Pins - only show when not split or split progress is minimal */}
            {(!isSplit || splitProgress < 0) && locations.map((loc, i) => {
                const pos = latLonToVec3(loc.lat, loc.lon, 2.05);
                return (
                    <mesh
                        ref={(el) => (meshRefs.current[i] = el)}
                        key={i}
                        position={pos}
                        onClick={() => handlePinClick(loc)}
                    >
                        <Html position={[0, 0.15, 0]} center>
                            <img style={{ cursor: "pointer", width: "40px" }} onClick={() => handlePinClick(loc)} src="Pin.png" alt="pin" />
                        </Html>
                    </mesh>
                );
            })}

            <CameraAnimator targetPos={targetPos} />
            <SplitEffects splitProgress={splitProgress} isSplit={isSplit} isReassembling={isReassembling} />
        </>
    );
}

function RotationSpeedTracker({ onSpeedChange, controlsRef }) {
    const prevRotation = useRef({ x: 0, y: 0 });
    const speedHistory = useRef([]);
    const isInitialized = useRef(false); // Add initialization flag
    const maxHistorySize = 10;

    useFrame(() => {
        if (controlsRef.current) {
            const currentRotation = {
                x: controlsRef.current.getAzimuthalAngle(),
                y: controlsRef.current.getPolarAngle()
            };

            // Initialize on first frame to avoid large initial delta
            if (!isInitialized.current) {
                prevRotation.current = currentRotation;
                isInitialized.current = true;
                return; // Skip speed calculation on first frame
            }

            // Calculate angular velocity
            const deltaX = currentRotation.x - prevRotation.current.x;
            const deltaY = currentRotation.y - prevRotation.current.y;

            // Handle angle wrapping for azimuthal angle
            let normalizedDeltaX = deltaX;
            if (Math.abs(deltaX) > Math.PI) {
                normalizedDeltaX = deltaX > 0 ? deltaX - 2 * Math.PI : deltaX + 2 * Math.PI;
            }

            const speed = Math.sqrt(normalizedDeltaX * normalizedDeltaX + deltaY * deltaY);

            // Maintain speed history for smoothing
            speedHistory.current.push(speed);
            if (speedHistory.current.length > maxHistorySize) {
                speedHistory.current.shift();
            }

            // Calculate average speed
            const avgSpeed = speedHistory.current.reduce((sum, s) => sum + s, 0) / speedHistory.current.length;

            onSpeedChange(avgSpeed);

            prevRotation.current = currentRotation;
        }
    });

    return null;
}

export default function Globe({ onShowInfo }) {
    const controlsRef = useRef();
    const [isSplit, setIsSplit] = useState(false);
    const [splitProgress, setSplitProgress] = useState(0);
    const [isReassembling, setIsReassembling] = useState(false);

    // Speed threshold for triggering split (lowered for easier testing)
    const SPEED_THRESHOLD = 0.15;

    const triggerSplit = () => {
        setIsSplit(true);
        setIsReassembling(false);

        // Animate split progress
        gsap.to({ progress: 0 }, {
            progress: 1,
            duration: 5,
            ease: "power2.out",
            onUpdate: function () {
                setSplitProgress(this.targets()[0].progress);
            }
        });
    };

    const triggerReassemble = () => {
        if (!isSplit || isReassembling) return;

        setIsReassembling(true);

        // Animate reassemble progress (reverse split)
        gsap.to({ progress: splitProgress }, {
            progress: 0,
            duration: 3,
            ease: "power2.inOut",
            onUpdate: function () {
                setSplitProgress(this.targets()[0].progress);
            },
            onComplete: () => {
                setIsSplit(false);
                setSplitProgress(0);
                setIsReassembling(false);
            }
        });
    };

    const handleSpeedChange = (speed) => {
        if (speed > SPEED_THRESHOLD && !isSplit) {
            triggerSplit();
        }
    };

    return (
        <>
            {isSplit && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 1000
                }}>
                    <button
                        onClick={() => { triggerReassemble(); }}
                        disabled={isReassembling}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: 'white',
                            background: isReassembling
                                ? 'linear-gradient(45deg, #666, #888)'
                                : 'linear-gradient(45deg, #ff4500, #ff6600)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isReassembling ? 'not-allowed' : 'pointer',
                            boxShadow: isReassembling
                                ? '0 2px 8px rgba(102, 102, 102, 0.3)'
                                : '0 4px 15px rgba(255, 69, 0, 0.3)',
                            transition: 'all 0.3s ease',
                            transform: isReassembling ? 'scale(0.95)' : 'scale(1)',
                            opacity: isReassembling ? 0.7 : 1,
                            animation: isReassembling ? 'pulse 1.5s infinite' : 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (!isReassembling) {
                                e.target.style.transform = 'scale(1.05)';
                                e.target.style.boxShadow = '0 6px 20px rgba(255, 69, 0, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isReassembling) {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 4px 15px rgba(255, 69, 0, 0.3)';
                            }
                        }}
                    >
                        {isReassembling ? '🔄 Reassembling...' : '🔧 Reassemble Globe'}
                    </button>
                </div>
            )}

            <Canvas
                camera={{ position: [0, 0, 6], fov: 50 }}
                style={{ background: '#000000' }}
            >
                {/* Space background with stars */}
                <Stars
                    radius={100}
                    depth={10}
                    count={10000}
                    factor={5}
                    saturation={0}
                    fade={true}
                    speed={0.5}
                />

                {/* Enhanced lighting for better atmosphere */}
                <ambientLight intensity={0.4} color="#ffffff" />
                <directionalLight
                    position={[5, 3, 5]}
                    intensity={1.2}
                    color="#ffffff"

                />
                <pointLight
                    position={[-5, -3, -5]}
                    intensity={0.5}
                    color="#4466bb"
                />

                <GlobeMesh onShowInfo={onShowInfo} isSplit={isSplit} splitProgress={splitProgress} isReassembling={isReassembling} />

                {/* Additional red lighting when split for lava effect */}
                {isSplit && (
                    <pointLight
                        position={[0, 0, 0]}
                        intensity={splitProgress * 4}
                        color="#ff2a00ff"
                        distance={20}
                    />
                )}

                <OrbitControls
                    ref={controlsRef}
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={3}
                    maxDistance={15}
                />

                <RotationSpeedTracker onSpeedChange={handleSpeedChange} controlsRef={controlsRef} />
            </Canvas>
        </>
    );
}