/* Load the optimized textured cocoon from an embedded local GLB. */
(() => {
  'use strict';

  function create(THREE) {
    try {
      const asset = window.PojianEggGlb;
      if (!asset?.base64) throw new Error('Embedded cocoon GLB is missing');
      const encoded = atob(asset.base64);
      const bytes = new Uint8Array(encoded.length);
      for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);
      const view = new DataView(bytes.buffer);
      if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) throw new Error('Invalid cocoon GLB header');
      let json, binaryOffset;
      for (let offset = 12; offset < bytes.length;) {
        const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
        offset += 8;
        if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(bytes.subarray(offset, offset + length)));
        if (type === 0x004e4942) binaryOffset = offset;
        offset += length;
      }
      if (!json || binaryOffset === undefined) throw new Error('Cocoon GLB has no mesh chunks');
      const accessor = id => {
        const spec = json.accessors[id], bufferView = json.bufferViews[spec.bufferView];
        const offset = binaryOffset + (bufferView.byteOffset || 0) + (spec.byteOffset || 0);
        const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[spec.type];
        const ArrayType = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[spec.componentType];
        if (!ArrayType || !components) throw new Error('Unsupported cocoon accessor');
        const width = ArrayType.BYTES_PER_ELEMENT;
        const stride = bufferView.byteStride || components * width;
        if (stride === components * width && offset % width === 0) {
          return new ArrayType(bytes.buffer, offset, spec.count * components);
        }
        const result = new ArrayType(spec.count * components);
        const read = { 5121: 'getUint8', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[spec.componentType];
        for (let i = 0; i < spec.count; i++) {
          for (let component = 0; component < components; component++) {
            result[i * components + component] = view[read](offset + i * stride + component * width, true);
          }
        }
        return result;
      };
      const primitive = json.meshes[0].primitives[0];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(accessor(primitive.attributes.POSITION), 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(accessor(primitive.attributes.TEXCOORD_0), 2));
      if (primitive.attributes.NORMAL !== undefined) geometry.setAttribute('normal', new THREE.BufferAttribute(accessor(primitive.attributes.NORMAL), 3));
      if (primitive.attributes.TANGENT !== undefined) geometry.setAttribute('tangent', new THREE.BufferAttribute(accessor(primitive.attributes.TANGENT), 4));
      geometry.setIndex(new THREE.BufferAttribute(accessor(primitive.indices), 1));
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const sourceMaterial = json.materials[primitive.material];
      const pbr = sourceMaterial.pbrMetallicRoughness || {};
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: pbr.roughnessFactor ?? 1,
        metalness: pbr.metallicFactor ?? 1,
        side: sourceMaterial.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      });
      const texture = (index, colorSpace) => {
        const imageSpec = json.images[json.textures[index].source];
        const imageView = json.bufferViews[imageSpec.bufferView];
        const start = binaryOffset + (imageView.byteOffset || 0);
        const blob = new Blob([bytes.subarray(start, start + imageView.byteLength)], { type: imageSpec.mimeType });
        const imageUrl = URL.createObjectURL(blob);
        const result = new THREE.Texture();
        result.colorSpace = colorSpace;
        result.flipY = false;
        result.wrapS = result.wrapT = THREE.RepeatWrapping;
        const image = new Image();
        image.onload = () => { result.image = image; result.needsUpdate = true; URL.revokeObjectURL(imageUrl); };
        image.onerror = () => { URL.revokeObjectURL(imageUrl); console.error('Cocoon texture could not be decoded'); };
        image.src = imageUrl;
        return result;
      };
      if (pbr.baseColorTexture) material.map = texture(pbr.baseColorTexture.index, THREE.SRGBColorSpace);
      if (sourceMaterial.normalTexture) material.normalMap = texture(sourceMaterial.normalTexture.index, THREE.NoColorSpace);
      if (pbr.metallicRoughnessTexture) {
        const packed = texture(pbr.metallicRoughnessTexture.index, THREE.NoColorSpace);
        material.roughnessMap = packed;
        material.metalnessMap = packed;
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'fuzzy-egg-game.glb';
      window.PojianEggStatus = 'glb';
      return mesh;
    } catch (error) {
      console.error('Cocoon GLB could not be loaded:', error);
      window.PojianEggStatus = 'fallback';
      return null;
    }
  }

  window.PojianEggScene = { create };
})();
