# Uso: en Blender, pestaña "Scripts" -> abrir este archivo -> "Ejecutar script".
# Antes, en la escena, pon un objeto Empty (Agregar > Vacío > Ejes simples) sobre cada
# casilla de parqueo y nómbralos lugar_01, lugar_02, ... lugar_20.
# El script genera:
#   - lugares.json  (posiciones en coordenadas glTF: X, Y arriba, Z)
#   - modelo.glb    (el modelo exportado)
# ambos junto al archivo .blend (guarda el .blend antes de ejecutar).
import bpy, json, os, math

carpeta = os.path.dirname(bpy.data.filepath) or os.path.expanduser("~")
lugares = {}
for n in range(1, 21):
    obj = bpy.data.objects.get("lugar_%02d" % n)
    if obj is None:
        raise RuntimeError("Falta el objeto lugar_%02d" % n)
    p = obj.matrix_world.translation
    # Blender (Z arriba) -> glTF (Y arriba): x = X, y = Z, z = -Y
    lugares[str(n)] = {
        "x": round(p.x, 3),
        "y": round(p.z + 0.02, 3),
        "z": round(-p.y, 3),
        "rot": round(math.degrees(obj.matrix_world.to_euler().z), 1),
    }

with open(os.path.join(carpeta, "lugares.json"), "w", encoding="utf-8") as f:
    json.dump(lugares, f, indent=2)

# Oculta los empties para que no salgan en el modelo.
for n in range(1, 21):
    bpy.data.objects["lugar_%02d" % n].hide_set(True)

bpy.ops.export_scene.gltf(
    filepath=os.path.join(carpeta, "modelo.glb"),
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    use_visible=True,
)
print("Listo:", carpeta)
