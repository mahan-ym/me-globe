
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

function GlobeMesh({ onShowInfo }) {
    const globeRef = useRef();
    const meshRefs = useRef([]);
    const [targetPos, setTargetPos] = useState(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
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

    return (
        <>

            {/* Globe */}
            <Sphere ref={globeRef} args={[2, 64, 64]}>
                <meshStandardMaterial
                    map={new THREE.TextureLoader().load(earthTexture)}
                    roughness={0.8}
                    metalness={0.1}
                />
            </Sphere>

            <Atmosphere />

            {/* Pins */}
            {locations.map((loc, i) => {
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
        </>
    );
}

export default function Globe({ onShowInfo }) {
    return (
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
                castShadow
            />
            <pointLight
                position={[-5, -3, -5]}
                intensity={0.5}
                color="#4466bb"
            />

            <GlobeMesh onShowInfo={onShowInfo} />
            <OrbitControls
                enableDamping
                dampingFactor={0.05}
                minDistance={3}
                maxDistance={15}
            />
        </Canvas>
    );
}