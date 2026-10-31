#!/usr/bin/env python3
import sys, json, struct, math, io
from pathlib import Path
from array import array
from PIL import Image

if len(sys.argv) < 3:
    raise SystemExit('usage: optimize-stylized-tree.py SOURCE.glb OUTPUT.glb [TARGET_VERTEX_CLUSTERS] [TEXTURE_SIZE]')
src = Path(sys.argv[1]); out = Path(sys.argv[2])
target_clusters = int(sys.argv[3]) if len(sys.argv) > 3 else 160000
tex_size = int(sys.argv[4]) if len(sys.argv) > 4 else 768

b = src.read_bytes(); off = 12; doc = None; blob = None
while off < len(b):
    n, typ = struct.unpack_from('<I4s', b, off)
    chunk = b[off+8:off+8+n]; off += 8+n
    if typ == b'JSON': doc = json.loads(chunk.decode('utf-8'))
    elif typ == b'BIN\0': blob = chunk
if doc is None or blob is None: raise RuntimeError('invalid GLB')
mesh = doc['meshes'][0]['primitives'][0]
acc = doc['accessors']; bvs = doc['bufferViews']
def raw_accessor(ai):
    a = acc[ai]; v = bvs[a['bufferView']]
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    end = start + v['byteLength']
    return a, v, blob[start:end]

def read_float(ai, comps):
    a,v,raw = raw_accessor(ai)
    if a['componentType'] != 5126 or a['type'] not in ('VEC2','VEC3'): raise RuntimeError('unexpected float accessor')
    return array('f', raw), a['count']

def read_index(ai):
    a,v,raw = raw_accessor(ai)
    if a['componentType'] != 5125: raise RuntimeError('expected uint indices')
    return array('I', raw), a['count']

pos, n = read_float(mesh['attributes']['POSITION'], 3)
nrm, n2 = read_float(mesh['attributes']['NORMAL'], 3)
uv, n3 = read_float(mesh['attributes']['TEXCOORD_0'], 2)
ind, ni = read_index(mesh['indices'])
assert n == n2 == n3 and ni % 3 == 0

# Use an anisotropic grid. It preserves the tall trunk shape better than a cubic grid.
mins = [min(pos[i*3+k] for i in range(n)) for k in range(3)]
maxs = [max(pos[i*3+k] for i in range(n)) for k in range(3)]
ext = [maxs[k]-mins[k] for k in range(3)]
base = max(1, int(round(target_clusters ** (1/3))))
# Allocate cells proportional to dimensions, then tune upward slightly.
scale = (target_clusters / max(1e-9, ext[0]*ext[1]*ext[2])) ** (1/3)
res = [max(2, int(round(ext[k]*scale))) for k in range(3)]
# cap cell product to avoid excessive empty keys
while res[0]*res[1]*res[2] > target_clusters * 3:
    k = max(range(3), key=lambda j: res[j]); res[k] -= 1
print('source vertices',n,'triangles',ni//3,'bounds',mins,maxs,'grid',res)

def q(v,k):
    if ext[k] <= 0: return 0
    x = int((v-mins[k]) / ext[k] * (res[k]-1))
    return max(0, min(res[k]-1, x))

clusters = []
lookup = {}
remap = array('I', [0]) * n
for i in range(n):
    px,py,pz = pos[3*i:3*i+3]
    # Include a very coarse UV bucket to avoid collapsing major texture islands.
    ux = int(max(0,min(15,uv[2*i]*16)))
    uy = int(max(0,min(15,uv[2*i+1]*16)))
    key = (q(px,0), q(py,1), q(pz,2), ux, uy)
    ci = lookup.get(key)
    if ci is None:
        ci = len(clusters); lookup[key] = ci
        clusters.append([px,py,pz,nrm[3*i],nrm[3*i+1],nrm[3*i+2],uv[2*i],uv[2*i+1],1])
    else:
        c = clusters[ci]
        c[0]+=px; c[1]+=py; c[2]+=pz; c[3]+=nrm[3*i]; c[4]+=nrm[3*i+1]; c[5]+=nrm[3*i+2]; c[6]+=uv[2*i]; c[7]+=uv[2*i+1]; c[8]+=1
    remap[i] = ci
print('clusters',len(clusters))

# Average clusters and drop degenerate triangles.
vertices=[]
for c in clusters:
    inv=1.0/c[8]; x,y,z=c[0]*inv,c[1]*inv,c[2]*inv
    nx,ny,nz=c[3]*inv,c[4]*inv,c[5]*inv; mag=math.sqrt(nx*nx+ny*ny+nz*nz) or 1
    vertices.append((x,y,z,nx/mag,ny/mag,nz/mag,c[6]*inv,c[7]*inv))
tri=[]; seen=set()
for j in range(0,ni,3):
    a,b2,c = remap[ind[j]], remap[ind[j+1]], remap[ind[j+2]]
    if a==b2 or a==c or b2==c: continue
    key=tuple(sorted((int(a),int(b2),int(c))))
    if key in seen: continue
    seen.add(key); tri.extend((int(a),int(b2),int(c)))
print('output vertices',len(vertices),'triangles',len(tri)//3)

# If still too large, deterministically retain a subset of triangles while keeping coverage.
max_tris = max(1000, int(target_clusters * 1.55))
if len(tri)//3 > max_tris:
    stride = len(tri) / (max_tris*3)
    kept=[]
    for t in range(max_tris):
        j = int(t*stride)*3
        kept.extend(tri[j:j+3])
    tri=kept
    print('triangle cap',len(tri)//3)

# Binary helpers
binbuf=bytearray(); views=[]
def add_bytes(data, target=None):
    while len(binbuf)%4: binbuf.append(0)
    off=len(binbuf); binbuf.extend(data)
    v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
    if target is not None: v['target']=target
    views.append(v); return len(views)-1

# Positions and normals use float32 for compatibility with the project's lightweight GLB readers; UVs and indices are compact.
pos_bytes=bytearray();
for x,y,z,*_ in vertices: pos_bytes.extend(struct.pack('<3f',x,y,z))
nrm_bytes=bytearray();
for *_,nx,ny,nz,uvx,uvy in vertices:
    nrm_bytes.extend(struct.pack('<3f',nx,ny,nz))
uv_bytes=bytearray();
for *_,uvx,uvy in vertices:
    uv_bytes.extend(struct.pack('<2H', max(0,min(65535,round(uvx*65535))), max(0,min(65535,round(uvy*65535)))))
idx_bytes=bytearray();
for i in tri: idx_bytes.extend(struct.pack('<H',i))
bv_pos=add_bytes(pos_bytes,34962); bv_nrm=add_bytes(nrm_bytes,34962); bv_uv=add_bytes(uv_bytes,34962); bv_idx=add_bytes(idx_bytes,34963)

# Resize and embed source images.
for image in doc['images']:
    v=bvs[image['bufferView']]; raw=blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
    im=Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((tex_size,tex_size), Image.Resampling.LANCZOS)
    bio=io.BytesIO(); im.save(bio,'JPEG',quality=76,optimize=True,progressive=True)
    image['_newView']=add_bytes(bio.getvalue()); image['_newMime']='image/jpeg'; print('texture',image.get('name'),im.size,len(bio.getvalue()))

# Build minimal glTF.
materials=[{
 'name':'stylized_tree_optimized_material',
 'normalTexture':{'index':0},
 'pbrMetallicRoughness':{
   'baseColorTexture':{'index':1},
   'metallicRoughnessTexture':{'index':2}
 }
}]
new={
 'asset':{'version':'2.0','generator':'Codex tree optimizer'},
 'scene':0,'scenes':[{'nodes':[0]}],
 'nodes':[{'name':'stylized_tree_optimized','mesh':0}],
 'meshes':[{'name':'stylized_tree_optimized_mesh','primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0}]}],
 'materials':materials,
 'textures':[{'sampler':0,'source':0},{'sampler':0,'source':1},{'sampler':0,'source':2}],
 'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],
 'images':[],
 'buffers':[{'byteLength':len(binbuf)}],
 'bufferViews':views,
 'accessors':[
  {'bufferView':bv_pos,'componentType':5126,'count':len(vertices),'type':'VEC3','min':mins,'max':maxs},
  {'bufferView':bv_nrm,'componentType':5126,'count':len(vertices),'type':'VEC3'},
  {'bufferView':bv_uv,'componentType':5123,'count':len(vertices),'type':'VEC2','normalized':True},
  {'bufferView':bv_idx,'componentType':5123,'count':len(tri),'type':'SCALAR','min':[0],'max':[len(vertices)-1]}
 ]
}
for image in doc['images']:
    new['images'].append({'bufferView':image['_newView'],'mimeType':image['_newMime'],'name':image.get('name','texture')})
# Remove temporary keys and compact JSON.
j=json.dumps(new,separators=(',',':'),ensure_ascii=False).encode('utf-8')
while len(j)%4: j+=b' '
while len(binbuf)%4: binbuf.append(0)
out_bytes=bytearray(struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(binbuf)))
out_bytes.extend(struct.pack('<I4s',len(j),b'JSON')); out_bytes.extend(j)
out_bytes.extend(struct.pack('<I4s',len(binbuf),b'BIN\0')); out_bytes.extend(binbuf)
out.parent.mkdir(parents=True,exist_ok=True); out.write_bytes(out_bytes)
print('wrote',out,'bytes',len(out_bytes), 'KB',len(out_bytes)/1024)
