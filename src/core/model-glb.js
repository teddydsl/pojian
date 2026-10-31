/* Textured local forest assets; meshes share geometry and materials. */
(() => {
  'use strict';

  function read(THREE, asset, name) {
    if (!asset?.base64) throw new Error(`${name} embedded GLB is missing`);
    const encoded = atob(asset.base64);
    const bytes = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) throw new Error(`${name} GLB header is invalid`);
    let json, binaryOffset;
    for (let offset = 12; offset < bytes.length;) {
      const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
      offset += 8;
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(bytes.subarray(offset, offset + length)));
      if (type === 0x004e4942) binaryOffset = offset;
      offset += length;
    }
    if (!json || binaryOffset === undefined) throw new Error(`${name} GLB mesh is missing`);
    const accessor = id => {
      const spec = json.accessors[id], bufferView = json.bufferViews[spec.bufferView];
      const offset = binaryOffset + (bufferView.byteOffset || 0) + (spec.byteOffset || 0);
      const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[spec.type];
      const ArrayType = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[spec.componentType];
      if (!ArrayType || !components) throw new Error(`${name} accessor is unsupported`);
      const width = ArrayType.BYTES_PER_ELEMENT, stride = bufferView.byteStride || components * width;
      if (stride === components * width && offset % width === 0) return new ArrayType(bytes.buffer, offset, spec.count * components);
      const result = new ArrayType(spec.count * components);
      const readComponent = { 5121: 'getUint8', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[spec.componentType];
      for (let i = 0; i < spec.count; i++) {
        for (let component = 0; component < components; component++) {
          result[i * components + component] = view[readComponent](offset + i * stride + component * width, true);
        }
      }
      return result;
    };
    const primitive = json.meshes[0].primitives[0];
    const geometry = new THREE.BufferGeometry();
    for (const [source, target, size] of [['POSITION', 'position', 3], ['NORMAL', 'normal', 3], ['TEXCOORD_0', 'uv', 2], ['TANGENT', 'tangent', 4]]) {
      if (primitive.attributes[source] !== undefined) {
        const id=primitive.attributes[source];
        geometry.setAttribute(target,new THREE.BufferAttribute(accessor(id),size,!!json.accessors[id].normalized));
      }
    }
    geometry.setIndex(new THREE.BufferAttribute(accessor(primitive.indices), 1));
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    // Preserve the supplied bark colors. Only the upper crown receives green
    // vertex tint, multiplied with the original fiber texture and normal map.
    if(name==='stylized-tree-game') {
      geometry.computeBoundingBox();
      const positions=geometry.getAttribute('position'),box=geometry.boundingBox,height=box.max.y-box.min.y;
      const colors=new Float32Array(positions.count*3);
      for(let i=0;i<positions.count;i++) {
        const y=(positions.getY(i)-box.min.y)/height;
        const crown=THREE.MathUtils.smoothstep(y,.56,.70);
        colors[i*3]=1-.56*crown;colors[i*3+1]=1+.18*crown;colors[i*3+2]=1-.59*crown;
      }
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    }
    const spec = json.materials[primitive.material], pbr = spec.pbrMetallicRoughness || {};
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: pbr.roughnessFactor ?? 1, metalness: pbr.metallicFactor ?? 0, side: THREE.DoubleSide });
    material.vertexColors=Boolean(geometry.getAttribute('color'));
    const texture = (index, colorSpace) => {
      const image = json.images[json.textures[index].source], bufferView = json.bufferViews[image.bufferView];
      const start = binaryOffset + (bufferView.byteOffset || 0);
      const blobUrl = URL.createObjectURL(new Blob([bytes.subarray(start, start + bufferView.byteLength)], { type: image.mimeType }));
      const result = new THREE.Texture();
      result.colorSpace = colorSpace; result.flipY = false; result.wrapS = result.wrapT = THREE.RepeatWrapping;
      const bitmap = new Image();
      bitmap.onload = () => { result.image = bitmap; result.needsUpdate = true; URL.revokeObjectURL(blobUrl); };
      bitmap.onerror = () => { URL.revokeObjectURL(blobUrl); console.error(`${name} texture failed to decode`); };
      bitmap.src = blobUrl;
      return result;
    };
    if (pbr.baseColorTexture) material.map = texture(pbr.baseColorTexture.index, THREE.SRGBColorSpace);
    if (spec.normalTexture) material.normalMap = texture(spec.normalTexture.index, THREE.NoColorSpace);
    if (pbr.metallicRoughnessTexture) {
      const packed = texture(pbr.metallicRoughnessTexture.index, THREE.NoColorSpace);
      material.roughnessMap = packed; material.metalnessMap = packed;
    }
    const mesh = new THREE.Mesh(geometry, material);
    if (json.nodes[0]?.translation) mesh.position.set(...json.nodes[0].translation);
    mesh.name = `${name}.glb`;
    return mesh;
  }

  const cache = new Map();
  window.PojianModels = { get(THREE, name) {
    if (!cache.has(name)) cache.set(name, read(THREE, window.PojianWorldModels?.[name], name));
    return cache.get(name);
  }};
})();
