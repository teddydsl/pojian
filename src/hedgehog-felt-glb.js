/* Synchronous GLB importer for file:// reviews and the local game build. */
(() => {
  'use strict';
  const oldHedgehog = window.PojianHedgehog;
  const asset = window.PojianHedgehogGlb || window.PojianFeltGlb;

  function decodeBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function importGlb(THREE) {
    if (!asset?.base64) throw new Error('Embedded hedgehog GLB is missing');
    const bytes = decodeBase64(asset.base64);
    const view = new DataView(bytes.buffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) {
      throw new Error('Invalid GLB header');
    }
    let json, binaryOffset;
    for (let offset = 12; offset < bytes.length;) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      offset += 8;
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(bytes.subarray(offset, offset + length)));
      if (type === 0x004e4942) binaryOffset = offset;
      offset += length;
    }
    if (!json || binaryOffset === undefined) throw new Error('GLB data chunks are missing');
    const accessor = id => {
      const spec = json.accessors[id];
      const bufferView = json.bufferViews[spec.bufferView];
      if (bufferView.byteStride) throw new Error('Interleaved GLB buffers are not supported by this preview');
      const offset = binaryOffset + (bufferView.byteOffset || 0) + (spec.byteOffset || 0);
      const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[spec.type];
      const arrayType = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[spec.componentType];
      if (!arrayType || !components) throw new Error('Unsupported GLB accessor');
      return { data: new arrayType(bytes.buffer, offset, spec.count * components), components, normalized: !!spec.normalized };
    };
    const root = new THREE.Group();
    root.name = 'hedgehog.glb';
    let minY = Infinity;
    let maxY = -Infinity;
    for (const mesh of json.meshes || []) {
      for (const primitive of mesh.primitives || []) {
        if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('Only triangle GLB primitives are supported');
        const geometry = new THREE.BufferGeometry();
        const positionSpec = json.accessors[primitive.attributes.POSITION];
        if (positionSpec?.min && positionSpec?.max) {
          minY = Math.min(minY, positionSpec.min[1]);
          maxY = Math.max(maxY, positionSpec.max[1]);
        }
        for (const [source, target] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['COLOR_0', 'color']]) {
          if (primitive.attributes[source] === undefined) continue;
          const value = accessor(primitive.attributes[source]);
          geometry.setAttribute(target, new THREE.BufferAttribute(value.data, value.components, value.normalized));
        }
        const indices = accessor(primitive.indices);
        geometry.setIndex(new THREE.BufferAttribute(indices.data, 1));
        geometry.computeBoundingSphere();
        const materialSpec = json.materials?.[primitive.material] || {};
        const pbr = materialSpec.pbrMetallicRoughness || {};
        const material = new THREE.MeshStandardMaterial({
          name: materialSpec.name || 'felt',
          color: 0xffffff,
          vertexColors: primitive.attributes.COLOR_0 !== undefined,
          roughness: pbr.roughnessFactor ?? 1,
          metalness: pbr.metallicFactor ?? 0,
          side: materialSpec.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        });
        root.add(new THREE.Mesh(geometry, material));
      }
    }
    if (!root.children.length || !Number.isFinite(maxY - minY) || maxY <= minY) {
      throw new Error('GLB character has no valid height');
    }
    // Both the older felt mesh and the new single-figure source use different
    // units. Keep their displayed avatar height consistent in the game.
    root.scale.setScalar(2.2 / (maxY - minY));
    root.position.y = -minY * root.scale.y;
    return root;
  }

  window.PojianHedgehog = {
    create(THREE) {
      try {
        const root = importGlb(THREE);
        window.PojianModelStatus = 'glb';
        return root;
      } catch (error) {
        console.error('The preview GLB could not be loaded:', error);
        window.PojianModelStatus = 'fallback';
        if (!oldHedgehog) throw error;
        return oldHedgehog.create(THREE);
      }
    },
  };
})();
