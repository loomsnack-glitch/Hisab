import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const AntigravityInner = ({
  pointerRef,
  count = 240,
  magnetRadius = 7,
  ringRadius = 7.5,
  waveSpeed = 0.35,
  waveAmplitude = 0.75,
  particleSize = 0.7,
  lerpSpeed = 0.075,
  color = '#3B82F6',
  particleOpacity = 0.42,
  autoAnimate = true,
  particleVariance = 0.7,
  rotationSpeed = 0,
  depthFactor = 0.8,
  pulseSpeed = 2.2,
  particleShape = 'capsule',
  fieldStrength = 10,
}) => {
  const meshRef = useRef(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lastPointerPos = useRef({ x: 0, y: 0 });
  const lastPointerMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 100;
    const height = viewport.height || 100;

    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;

      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;

      const randomRadiusOffset = (Math.random() - 0.5) * 2;

      temp.push({
        t,
        factor,
        speed,
        xFactor,
        yFactor,
        zFactor,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        vx: 0,
        vy: 0,
        vz: 0,
        randomRadiusOffset,
      });
    }
    return temp;
  }, [count, viewport.width, viewport.height]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { viewport: v } = state;

    const isCoarse =
      typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

    const pointerActive = (pointerRef?.current?.active ?? false) && !isCoarse;
    const pointerX = pointerRef?.current ? pointerRef.current.x : state.pointer.x;
    const pointerY = pointerRef?.current ? pointerRef.current.y : state.pointer.y;

    const now = performance.now();
    const pointerDist = Math.sqrt(
      Math.pow(pointerX - lastPointerPos.current.x, 2) +
        Math.pow(pointerY - lastPointerPos.current.y, 2)
    );

    if (pointerDist > 0.001 && pointerActive) {
      lastPointerMoveTime.current = now;
      lastPointerPos.current = { x: pointerX, y: pointerY };
    }

    let destX = 0;
    let destY = 0;

    if (pointerActive && (now - lastPointerMoveTime.current < 2000 || !autoAnimate)) {
      destX = (pointerX * v.width) / 2;
      destY = (pointerY * v.height) / 2;
    } else if (autoAnimate) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.5) * (v.width / 4);
      destY = Math.cos(time * 0.5 * 2) * (v.height / 4);
    }

    const smoothFactor = 0.08;
    virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;

    const globalRotation = state.clock.getElapsedTime() * rotationSpeed;

    particles.forEach((particle, i) => {
      let { speed, mx, my, mz, cz, randomRadiusOffset } = particle;

      particle.t += speed / 2;
      const t = particle.t;

      const projectionFactor = 1 - cz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;

      const dx = mx - projectedTargetX;
      const dy = my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetPos = { x: mx, y: my, z: mz * depthFactor };

      if (dist < magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRotation;

        const wave = Math.sin(t * waveSpeed + angle) * (0.5 * waveAmplitude);
        const deviation = randomRadiusOffset * (5 / (fieldStrength + 0.1));

        const currentRingRadius = ringRadius + wave + deviation;

        targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
        targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
        targetPos.z = mz * depthFactor + Math.sin(t) * (1 * waveAmplitude * depthFactor);
      }

      particle.cx += (targetPos.x - particle.cx) * lerpSpeed;
      particle.cy += (targetPos.y - particle.cy) * lerpSpeed;
      particle.cz += (targetPos.z - particle.cz) * lerpSpeed;

      dummy.position.set(particle.cx, particle.cy, particle.cz);

      dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
      dummy.rotateX(Math.PI / 2);

      const currentDistToMouse = Math.sqrt(
        Math.pow(particle.cx - projectedTargetX, 2) + Math.pow(particle.cy - projectedTargetY, 2)
      );

      const distFromRing = Math.abs(currentDistToMouse - ringRadius);
      let scaleFactor = 1 - distFromRing / 10;

      scaleFactor = Math.max(0, Math.min(1, scaleFactor));

      const finalScale =
        scaleFactor * (0.8 + Math.sin(t * pulseSpeed) * 0.2 * particleVariance) * particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);

      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === 'capsule' && <capsuleGeometry args={[0.06, 0.32, 4, 8]} />}
      {particleShape === 'sphere' && <sphereGeometry args={[0.15, 12, 12]} />}
      {particleShape === 'box' && <boxGeometry args={[0.2, 0.2, 0.2]} />}
      {particleShape === 'tetrahedron' && <tetrahedronGeometry args={[0.22]} />}
      <meshBasicMaterial
        color={color}
        transparent
        opacity={particleOpacity}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export const Antigravity = (props) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 35 }}
      style={{ pointerEvents: 'none', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <AntigravityInner {...props} />
    </Canvas>
  );
};

export default Antigravity;
