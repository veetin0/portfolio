"""
Signal Module — the portfolio's hero object.

A palm-sized compute module (projects on the site are "modules") in the site's
palette: graphite body, black glass screen with a lime terminal prompt, a lime
status strip, and a tilted orbit of nodes standing in for the work
constellation.

Rebuild (headless):
  /Applications/Blender.app/Contents/MacOS/Blender -b -P assets-src/signal-module/build.py -- --out assets/signal-module
Flags: --no-render to skip the preview renders.

Run inside a live Blender (exec the file) and it builds into its own scene,
leaving the user's scenes alone.

Scale is real: the body is 12 cm wide. Blender is Z-up; the glTF export is Y-up.
"""
import bpy, bmesh, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[argv.index("--out") + 1] if "--out" in argv else os.path.join(os.getcwd(), "assets", "signal-module")
RENDER = "--no-render" not in argv
os.makedirs(OUT, exist_ok=True)

# Site palette (app/globals.css), sRGB 0-255.
BG = (8, 9, 10)
RAISED = (15, 17, 18)
LINE = (30, 34, 36)
TEXT = (236, 238, 234)
MUTED = (122, 128, 133)
SIGNAL = (198, 242, 78)


def lin(c):
    """sRGB 0-255 -> linear RGBA."""
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (ch(c[0]), ch(c[1]), ch(c[2]), 1.0)


# --- scene -------------------------------------------------------------------
if bpy.app.background:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
else:
    old = bpy.data.scenes.get("SignalModule")
    if old:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.scenes.remove(old)
    scene = bpy.data.scenes.new("SignalModule")
    bpy.context.window.scene = scene
scene.name = "SignalModule"
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
col = scene.collection


def link(obj, parent=None):
    col.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


# --- materials ---------------------------------------------------------------
def material(name, color, rough=0.5, metal=0.0, emit=None, strength=0.0, coat=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = lin(color)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if coat and "Coat Weight" in p.inputs:
        p.inputs["Coat Weight"].default_value = coat
    if emit:
        p.inputs["Emission Color"].default_value = lin(emit)
        p.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = lin(emit or color)
    return m


M_BODY = material("Graphite", (34, 38, 41), rough=0.58, metal=0.35)
M_TRIM = material("Trim", (20, 22, 24), rough=0.4, metal=0.6)
M_GLASS = material("ScreenGlass", BG, rough=0.08, coat=1.0)
M_SIGNAL = material("Signal", SIGNAL, rough=0.3, emit=SIGNAL, strength=4.0)
M_TEXT = material("ScreenText", SIGNAL, rough=0.3, emit=SIGNAL, strength=2.0)
M_DIM = material("ScreenDim", MUTED, rough=0.3, emit=MUTED, strength=1.2)
M_NODE = material("Node", TEXT, rough=0.35, emit=TEXT, strength=0.6)
M_ORBIT = material("Orbit", MUTED, rough=0.4, metal=0.8)
M_HOLE = material("Port", BG, rough=0.9)


# --- helpers -----------------------------------------------------------------
def box(name, size, loc, mat, bevel=0.0, segs=3, parent=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me), parent)
    o.location = loc
    me.materials.append(mat)
    if bevel:
        b = o.modifiers.new("Bevel", "BEVEL")
        b.width, b.segments, b.limit_method = bevel, segs, "ANGLE"
        b.harden_normals = True
    for p in me.polygons:
        p.use_smooth = True
    return o


def cylinder(name, r, depth, loc, mat, verts=24, rot=(0, 0, 0), parent=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=depth)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me), parent)
    o.location, o.rotation_euler = loc, rot
    me.materials.append(mat)
    return o


def sphere(name, r, loc, mat, parent=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = link(bpy.data.objects.new(name, me), parent)
    o.location = loc
    me.materials.append(mat)
    return o


def text(name, body, size, loc, mat, parent=None, align="LEFT"):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body, cu.size, cu.align_x, cu.align_y = body, size, align, "CENTER"
    cu.extrude = 0.0002
    o = bpy.data.objects.new(name + "_curve", cu)
    col.objects.link(o)
    # Fonts don't survive glTF: bake to a mesh.
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o, do_unlink=True)
    me.materials.clear()
    me.materials.append(mat)
    m = link(bpy.data.objects.new(name, me), parent)
    m.location = loc
    m.rotation_euler = (math.radians(90), 0, 0)  # face -Y (the front)
    return m


# --- geometry ----------------------------------------------------------------
W, D, H = 0.12, 0.12, 0.10      # body, metres
FOOT = 0.006
root = link(bpy.data.objects.new("SignalModule", None))
root.empty_display_size = 0.05

body = box("Body", (W, D, H), (0, 0, FOOT + H / 2), M_BODY, bevel=0.012, segs=4, parent=root)
front = -D / 2

# Screen: a trim bezel with black glass set into the front face.
SW, SH = 0.088, 0.052
SZ = FOOT + H * 0.56
box("Bezel", (SW + 0.008, 0.004, SH + 0.008), (0, front - 0.0005, SZ), M_TRIM, bevel=0.003, parent=root)
box("Screen", (SW, 0.002, SH), (0, front - 0.0026, SZ), M_GLASS, bevel=0.0012, segs=2, parent=root)

face = front - 0.0039
left = -SW / 2 + 0.007
text("PromptGlyph", "$", 0.0085, (left, face, SZ + 0.012), M_DIM, parent=root)
text("PromptName", "veeti", 0.0115, (left + 0.008, face, SZ + 0.0115), M_TEXT, parent=root)
box("Cursor", (0.0045, 0.0004, 0.0085), (left + 0.0395, face, SZ + 0.0115), M_TEXT, parent=root)
text("PromptLine2", "full-stack · ml · tools", 0.0052, (left, face, SZ - 0.004), M_DIM, parent=root)
# Little status bars along the bottom of the screen, like the stack sector's bars.
for i, w in enumerate((0.034, 0.024, 0.029)):
    z = SZ - 0.0135 - i * 0.0042
    box(f"Bar{i}Track", (0.05, 0.0003, 0.0016), (left + 0.025, face + 0.0002, z), M_HOLE, parent=root)
    box(f"Bar{i}", (w, 0.0004, 0.0016), (left + w / 2, face, z), M_TEXT if i == 0 else M_DIM, parent=root)

# Status strip: the lime line under the screen.
box("SignalStrip", (0.05, 0.002, 0.0022), (0, front - 0.0004, FOOT + 0.013), M_SIGNAL, bevel=0.0009, segs=2, parent=root)
cylinder("PowerLED", 0.0019, 0.002, (W / 2 - 0.016, front - 0.0004, FOOT + 0.013), M_SIGNAL,
         rot=(math.radians(90), 0, 0), parent=root)

# Top vents: recessed slots.
vents = link(bpy.data.objects.new("Vents", None), root)
for i in range(9):
    x = -0.036 + i * 0.009
    box(f"Vent{i}", (0.0034, 0.07, 0.0016), (x, 0.004, FOOT + H - 0.0003), M_HOLE, bevel=0.0012, segs=2, parent=vents)

# Side ports (right side).
ports = link(bpy.data.objects.new("Ports", None), root)
for i, (w, h) in enumerate(((0.011, 0.0045), (0.009, 0.0035), (0.0035, 0.0035))):
    z = FOOT + 0.065 - i * 0.012
    box(f"Port{i}", (0.002, w, h), (W / 2 + 0.0002, -0.02, z), M_HOLE, bevel=0.0012, segs=2, parent=ports)

# Feet.
for i, (sx, sy) in enumerate(((1, 1), (-1, 1), (1, -1), (-1, -1))):
    cylinder(f"Foot{i}", 0.007, FOOT, (sx * 0.04, sy * 0.04, FOOT / 2), M_TRIM, verts=20, parent=root)

# Orbit: a tilted ring with nodes — the work constellation, in miniature.
orbit = link(bpy.data.objects.new("Orbit", None), root)
orbit.location = (0, 0, FOOT + H / 2)
orbit.rotation_euler = (math.radians(16), math.radians(-9), 0)
R = 0.122
ring_me = bpy.data.meshes.new("OrbitRing")
bm = bmesh.new()
RS, rs, rr = 96, 6, 0.0007
for i in range(RS):
    a = 2 * math.pi * i / RS
    for j in range(rs):
        b = 2 * math.pi * j / rs
        bm.verts.new(((R + rr * math.cos(b)) * math.cos(a), (R + rr * math.cos(b)) * math.sin(a), rr * math.sin(b)))
bm.verts.ensure_lookup_table()
for i in range(RS):
    for j in range(rs):
        v = lambda a, b: bm.verts[(a % RS) * rs + (b % rs)]
        bm.faces.new((v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)))
bm.to_mesh(ring_me)
bm.free()
ring = link(bpy.data.objects.new("OrbitRing", ring_me), orbit)
ring_me.materials.append(M_ORBIT)
for p in ring_me.polygons:
    p.use_smooth = True

nodes = link(bpy.data.objects.new("Nodes", None), orbit)
for i, ang in enumerate((10, 62, 128, 185, 238, 300)):
    a = math.radians(ang)
    lit = i in (0, 3)
    sphere(f"Node{i}", 0.0052 if lit else 0.0032, (R * math.cos(a), R * math.sin(a), 0),
           M_SIGNAL if lit else M_NODE, parent=nodes)

for o in scene.objects:
    o.select_set(False)

# --- look --------------------------------------------------------------------
world = bpy.data.worlds.new("SignalWorld")
scene.world = world
world.use_nodes = True
bgn = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bgn.inputs["Color"].default_value = lin(BG)
bgn.inputs["Strength"].default_value = 1.0


def light(name, kind, energy, loc, color=(255, 255, 255), size=0.3):
    ld = bpy.data.lights.new(name, kind)
    ld.energy, ld.color = energy, lin(color)[:3]
    if kind == "AREA":
        ld.size = size
    o = link(bpy.data.objects.new(name, ld))
    o.location = loc
    o.rotation_euler = (Vector((0, 0, FOOT + H / 2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


light("Key", "AREA", 40, (-0.35, -0.45, 0.45), size=0.35)
light("Fill", "AREA", 10, (0.5, -0.3, 0.15), color=(200, 215, 230), size=0.5)
light("Rim", "AREA", 14, (0.05, 0.5, 0.25), color=SIGNAL, size=0.2)
light("Top", "AREA", 6, (0.0, 0.05, 0.5), size=0.4)

cam_d = bpy.data.cameras.new("Camera")
cam_d.lens = 70
cam = link(bpy.data.objects.new("Camera", cam_d))
cam.location = (0.36, -0.62, 0.30)
cam.rotation_euler = (Vector((0, 0, FOOT + H * 0.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        pass
# PBR Neutral keeps the lime's hue where AgX washes it towards cream.
for vt in ("Khronos PBR Neutral", "Standard"):
    try:
        scene.view_settings.view_transform = vt
        break
    except TypeError:
        pass
try:
    scene.eevee.use_bloom = True  # pre-4.2 only; newer EEVEE blooms via compositor
except AttributeError:
    pass

# --- output ------------------------------------------------------------------
if RENDER:
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1200
    scene.render.film_transparent = False
    scene.render.filepath = os.path.join(OUT, "hero.png")
    bpy.ops.render.render(write_still=True)
    # Transparent cut-out for dropping onto the dark page.
    scene.render.film_transparent = True
    scene.render.filepath = os.path.join(OUT, "hero-transparent.png")
    bpy.ops.render.render(write_still=True)
    scene.render.film_transparent = False

# Export only the model, not the camera/lights.
def descendants(o):
    out = [o]
    for c in o.children:
        out += descendants(c)
    return out


for o in scene.objects:
    o.select_set(False)
for o in descendants(root):
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "signal-module.glb"),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_lights=False,
    export_cameras=False,
)
for o in scene.objects:
    o.select_set(False)
if bpy.app.background:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "signal-module.blend"))
print("SIGNAL_MODULE_OK", OUT)
