/* Import the small, vertex-colored forest GLB without a network request. */
(() => {
  'use strict';

  function create(THREE) {
    try {
      const asset = window.PojianForestGlb;
      if (!asset?.base64) throw new Error('Embedded forest GLB is missing');
      const encoded = atob(asset.base64);
      const bytes = new Uint8Array(encoded.length);
      for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);
      const view = new DataView(bytes.buffer);
      if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) {
        throw new Error('Invalid forest GLB header');
      }
      let json;
      let binaryOffset;
      for (let offset = 12; offset < bytes.length;) {
        const length = view.getUint32(offset, true);
        const type = view.getUint32(offset + 4, true);
        offset += 8;
        if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(bytes.subarray(offset, offset + length)));
        if (type === 0x004e4942) binaryOffset = offset;
        offset += length;
      }
      if (!json || binaryOffset === undefined) throw new Error('Forest GLB has no geometry chunks');
      const accessor = id => {
        const spec = json.accessors[id];
        const bufferView = json.bufferViews[spec.bufferView];
        if (bufferView.byteStride) throw new Error('Interleaved forest buffers are not supported');
        const offset = binaryOffset + (bufferView.byteOffset || 0) + (spec.byteOffset || 0);
        const components = { SCALAR: 1, VEC3: 3, VEC4: 4 }[spec.type];
        const arrayType = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[spec.componentType];
        if (!arrayType || !components) throw new Error('Unsupported forest GLB accessor');
        return { data: new arrayType(bytes.buffer, offset, spec.count * components), components, normalized: !!spec.normalized };
      };
      const materials = (json.materials || []).map(spec => {
        const pbr = spec.pbrMetallicRoughness || {};
        return new THREE.MeshStandardMaterial({
          name: spec.name || 'forest felt',
          color: 0xffffff,
          roughness: pbr.roughnessFactor ?? 1,
          metalness: pbr.metallicFactor ?? 0,
          vertexColors: true,
          side: spec.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        });
      });
      const meshParts = (json.meshes || []).map(mesh => mesh.primitives.map(primitive => {
        if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('Forest primitive is not triangles');
        if (primitive.attributes.COLOR_0 === undefined) throw new Error('Forest vertex colors are missing');
        const geometry = new THREE.BufferGeometry();
        for (const [source, target] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['COLOR_0', 'color']]) {
          if (primitive.attributes[source] === undefined) continue;
          const value = accessor(primitive.attributes[source]);
          geometry.setAttribute(target, new THREE.BufferAttribute(value.data, value.components, value.normalized));
        }
        const indices = accessor(primitive.indices);
        geometry.setIndex(new THREE.BufferAttribute(indices.data, 1));
        geometry.computeBoundingSphere();
        return { geometry, material: materials[primitive.material] };
      }));
      const makeNode = index => {
        const spec = json.nodes[index];
        const node = new THREE.Group();
        node.name = spec.name || `forest_node_${index}`;
        if (spec.translation) node.position.set(...spec.translation);
        if (spec.rotation) node.quaternion.set(...spec.rotation);
        if (spec.scale) node.scale.set(...spec.scale);
        if (spec.mesh !== undefined) {
          for (const part of meshParts[spec.mesh]) node.add(new THREE.Mesh(part.geometry, part.material));
        }
        for (const child of spec.children || []) node.add(makeNode(child));
        return node;
      };
      const root = new THREE.Group();
      root.name = 'felt-forest-with-mushrooms.glb';
      for (const node of json.scenes[json.scene ?? 0].nodes) root.add(makeNode(node));
      const mushroomPart = meshParts[1]?.[0];
      if (!mushroomPart) throw new Error('Forest GLB mushroom cluster is missing');
      window.PojianForestStatus = 'glb';
      return {
        root,
        makeMushroomCluster() { return new THREE.Mesh(mushroomPart.geometry, mushroomPart.material); },
      };
    } catch (error) {
      console.error('Forest GLB could not be loaded:', error);
      window.PojianForestStatus = 'fallback';
      return null;
    }
  }

  window.PojianForestScene = { create };
})();
