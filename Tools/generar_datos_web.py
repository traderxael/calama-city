# -*- coding: utf-8 -*-
"""
Preprocesador cartográfico de alta precisión para Calama City Web (Three.js).

Lee Assets/Data/OSM/calama_centro.osm (XML de OpenStreetMap) y produce
web/data/calama_map.json con:
  - Proyección métrica sin espejado: origen Plaza 23 de Marzo (-22.4624, -68.9272),
    +X = Este (m), -Z = Norte (m).
  - Resolución de relaciones multipolygon (Estadio Zorros del Desierto, patios, etc.).
  - Red vial con nombres reales, sentidos oneway, superficies y grafo conectado en esquinas.
  - 209 semáforos reales y 651 pasos de cebra con orientación vial exacta.
  - Relleno urbano inteligente (infill) de cuadras vacías respetando calzadas, veredas,
    plazas, parques, Río Loa, ferrocarril y edificios OSM reales.
"""
from __future__ import annotations

import json
import math
import random
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OSM_PATH = ROOT / "Assets" / "Data" / "OSM" / "calama_centro.osm"
OUT_PATH = ROOT / "web" / "data" / "calama_map.json"

ORIGIN_LAT = -22.4624
ORIGIN_LON = -68.9272
M_PER_DEG_LAT = 110574.0
M_PER_DEG_LON = 111320.0 * math.cos(math.radians(ORIGIN_LAT))

ROAD_WIDTHS = {
    "motorway": 20.0,
    "motorway_link": 10.0,
    "trunk": 18.0,
    "trunk_link": 9.5,
    "primary": 15.0,
    "primary_link": 8.5,
    "secondary": 12.5,
    "secondary_link": 8.0,
    "tertiary": 10.5,
    "tertiary_link": 7.5,
    "residential": 8.0,
    "living_street": 6.8,
    "unclassified": 7.5,
    "service": 5.2,
    "pedestrian": 7.5,
    "footway": 2.4,
    "path": 2.0,
    "cycleway": 2.2,
    "steps": 2.4,
    "track": 4.0,
}

EXCLUDED_HIGHWAYS = {
    "construction", "proposed", "platform", "corridor",
    "elevator", "bus_stop", "raceway", "abandoned", "disused",
}

DRIVABLE_HIGHWAYS = {
    "motorway", "motorway_link", "trunk", "trunk_link",
    "primary", "primary_link", "secondary", "secondary_link",
    "tertiary", "tertiary_link", "residential", "living_street", "unclassified",
}

INFILL_HIGHWAYS = {
    "primary", "secondary", "tertiary", "residential", "living_street", "pedestrian",
}

HEIGHT_BY_BUILDING = {
    "residential": 6.2,
    "house": 5.6,
    "detached": 5.8,
    "apartments": 13.5,
    "commercial": 9.5,
    "retail": 8.2,
    "office": 14.5,
    "industrial": 8.8,
    "warehouse": 8.0,
    "school": 8.5,
    "university": 11.0,
    "hospital": 15.0,
    "hotel": 16.5,
    "church": 13.0,
    "cathedral": 24.0,
    "stadium": 19.0,
    "garage": 3.6,
    "garages": 3.6,
    "roof": 3.8,
    "yes": 6.4,
}

COMMERCIAL_STREETS = (
    "eleuterio ram", "ramírez", "ramirez", "vivar", "latorre", "sotomayor",
    "vargas", "balmaceda", "granaderos", "vicuña mackenna", "mackenna",
    "arturo prat", "prat", "antofagasta", "ecuador", "cobija", " Hurtado",
)


def lat_lon_to_xz(lat: float, lon: float) -> tuple[float, float]:
    """Convierte (lat, lon) a metros locales: +X = Este, -Z = Norte."""
    x = (lon - ORIGIN_LON) * M_PER_DEG_LON
    z = -(lat - ORIGIN_LAT) * M_PER_DEG_LAT
    return round(x, 2), round(z, 2)


def parse_float(val: str | None, default: float = 0.0) -> float:
    if not val:
        return default
    txt = str(val).strip().lower().replace(",", ".")
    buf = ""
    for ch in txt:
        if ch.isdigit() or ch in ".-":
            buf += ch
        elif buf:
            break
    try:
        return float(buf)
    except ValueError:
        return default


def poly_area_signed(pts: list[tuple[float, float]]) -> float:
    s = 0.0
    n = len(pts)
    for i in range(n):
        x1, z1 = pts[i]
        x2, z2 = pts[(i + 1) % n]
        s += x1 * z2 - x2 * z1
    return 0.5 * s


def poly_centroid(pts: list[tuple[float, float]]) -> tuple[float, float]:
    if not pts:
        return (0.0, 0.0)
    a = poly_area_signed(pts)
    if abs(a) < 1e-5:
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[1] for p in pts) / len(pts)
        return round(cx, 1), round(cz, 1)
    cx = 0.0
    cz = 0.0
    n = len(pts)
    for i in range(n):
        x1, z1 = pts[i]
        x2, z2 = pts[(i + 1) % n]
        cross = x1 * z2 - x2 * z1
        cx += (x1 + x2) * cross
        cz += (z1 + z2) * cross
    factor = 1.0 / (6.0 * a)
    return round(cx * factor, 1), round(cz * factor, 1)


def dominant_angle(pts: list[tuple[float, float]]) -> float:
    best_len = -1.0
    best_ang = 0.0
    n = len(pts)
    for i in range(n):
        x1, z1 = pts[i]
        x2, z2 = pts[(i + 1) % n]
        dx, dz = x2 - x1, z2 - z1
        d = dx * dx + dz * dz
        if d > best_len:
            best_len = d
            best_ang = math.atan2(dz, dx)
    return round(best_ang, 3)


def clean_ring(pts: list[tuple[float, float]], ccw: bool = True) -> list[tuple[float, float]] | None:
    out: list[tuple[float, float]] = []
    for x, z in pts:
        q = (round(x, 1), round(z, 1))
        if not out or q != out[-1]:
            out.append(q)
    if len(out) > 1 and out[0] == out[-1]:
        out.pop()
    if len(out) < 3:
        return None
    # Simplificar vértices casi colineales
    simp: list[tuple[float, float]] = []
    n = len(out)
    for i in range(n):
        ax, az = out[i - 1]
        bx, bz = out[i]
        cx, cz = out[(i + 1) % n]
        cross = abs((bx - ax) * (cz - bz) - (bz - az) * (cx - bx))
        if cross > 0.04:
            simp.append((bx, bz))
    if len(simp) < 3:
        simp = out
    area = poly_area_signed(simp)
    if abs(area) < 2.5:
        return None
    # En plano (x, z) con +X derecha y +Z abajo, CCW matemático en (x,z) tiene area > 0
    if ccw and area < 0:
        simp.reverse()
    elif not ccw and area > 0:
        simp.reverse()
    return simp


def flatten_pts(pts: list[tuple[float, float]]) -> list[float]:
    flat: list[float] = []
    for x, z in pts:
        flat.append(round(x, 1))
        flat.append(round(z, 1))
    return flat


def assemble_rings(way_segments: list[list[tuple[float, float]]]) -> list[list[tuple[float, float]]]:
    """Une segmentos abiertos o cerrados de una relación multipolígono en anillos cerrados."""
    rings: list[list[tuple[float, float]]] = []
    open_segs: list[list[tuple[float, float]]] = []

    for seg in way_segments:
        if len(seg) < 2:
            continue
        if math.hypot(seg[0][0] - seg[-1][0], seg[0][1] - seg[-1][1]) < 0.5 and len(seg) >= 4:
            rings.append(seg[:-1])
        else:
            open_segs.append(list(seg))

    while open_segs:
        cur = open_segs.pop(0)
        changed = True
        while changed:
            changed = False
            if math.hypot(cur[0][0] - cur[-1][0], cur[0][1] - cur[-1][1]) < 0.8 and len(cur) >= 4:
                rings.append(cur[:-1])
                cur = []
                break
            for idx, other in enumerate(open_segs):
                if math.hypot(cur[-1][0] - other[0][0], cur[-1][1] - other[0][1]) < 0.8:
                    cur.extend(other[1:])
                    open_segs.pop(idx)
                    changed = True
                    break
                if math.hypot(cur[-1][0] - other[-1][0], cur[-1][1] - other[-1][1]) < 0.8:
                    cur.extend(reversed(other[:-1]))
                    open_segs.pop(idx)
                    changed = True
                    break
                if math.hypot(cur[0][0] - other[-1][0], cur[0][1] - other[-1][1]) < 0.8:
                    cur = other[:-1] + cur
                    open_segs.pop(idx)
                    changed = True
                    break
                if math.hypot(cur[0][0] - other[0][0], cur[0][1] - other[0][1]) < 0.8:
                    cur = list(reversed(other[1:])) + cur
                    open_segs.pop(idx)
                    changed = True
                    break
        if len(cur) >= 3:
            rings.append(cur)

    return rings


def classify_building_kind(tags: dict[str, str]) -> int:
    b = (tags.get("building") or "yes").lower()
    amenity = (tags.get("amenity") or "").lower()
    shop = tags.get("shop")
    office = tags.get("office")
    if shop or b in ("commercial", "retail", "hotel", "supermarket"):
        return 1
    if office or b in ("office", "industrial", "warehouse"):
        return 2
    if amenity in ("school", "hospital", "townhall", "university", "college", "police", "place_of_worship") or b in ("school", "hospital", "church", "cathedral", "public", "civic"):
        return 3
    return 0


def compute_building_height(osm_id: str, tags: dict[str, str]) -> float:
    h = parse_float(tags.get("height"), 0.0)
    if h > 1.5:
        return round(max(2.8, min(65.0, h)), 1)
    levels = parse_float(tags.get("building:levels"), 0.0)
    if levels > 0:
        return round(max(2.8, min(65.0, levels * 3.1 + 0.8)), 1)
    btype = (tags.get("building") or "yes").lower()
    base = HEIGHT_BY_BUILDING.get(btype, 6.4)
    rng = random.Random(hash(osm_id) & 0xFFFFFFFF)
    return round(max(3.0, min(42.0, base + rng.uniform(-1.1, 1.9))), 1)


def parse_oneway(tags: dict[str, str], htype: str) -> int:
    ow = (tags.get("oneway") or "").strip().lower()
    if ow in ("yes", "true", "1"):
        return 1
    if ow in ("-1", "reverse"):
        return -1
    if htype in ("motorway", "motorway_link") or tags.get("junction") == "roundabout":
        return 1
    return 0


def point_seg_dist(px: float, pz: float, ax: float, az: float, bx: float, bz: float) -> float:
    dx, dz = bx - ax, bz - az
    l2 = dx * dx + dz * dz
    if l2 < 1e-9:
        return math.hypot(px - ax, pz - az)
    t = max(0.0, min(1.0, ((px - ax) * dx + (pz - az) * dz) / l2))
    return math.hypot(px - (ax + t * dx), pz - (az + t * dz))


def generate_urban_infill(
    roads: list[dict],
    real_buildings: list[dict],
    forbidden_polys: list[list[float]],
    water_lines: list[dict],
    railways: list[dict],
) -> list[dict]:
    """
    Genera edificaciones realistas en las cuadras donde OSM no tiene polígonos de edificios,
    garantizando cero invasión de calles, veredas, plazas, parques, Río Loa y vía férrea.
    """
    min_x, max_x = -2300.0, 2100.0
    min_z, max_z = -2100.0, 2100.0
    scale = 1.0  # 1 píxel = 1 metro
    w_px = int((max_x - min_x) * scale) + 1
    h_px = int((max_z - min_z) * scale) + 1

    mask_img = Image.new("L", (w_px, h_px), 0)
    draw = ImageDraw.Draw(mask_img)

    def to_px(x: float, z: float) -> tuple[int, int]:
        return int(round((x - min_x) * scale)), int(round((z - min_z) * scale))

    def flat_to_px_list(flat: list[float]) -> list[tuple[int, int]]:
        return [to_px(flat[i], flat[i + 1]) for i in range(0, len(flat), 2)]

    # 1. Pintar polígonos prohibidos (plazas, parques, estadio, campus, agua, estacionamientos)
    for fp in forbidden_polys:
        if len(fp) >= 6:
            pts_px = flat_to_px_list(fp)
            draw.polygon(pts_px, fill=255, outline=255)
            draw.line(pts_px + [pts_px[0]], fill=255, width=6)

    # 2. Pintar edificios reales con margen de separación
    for b in real_buildings:
        pts_px = flat_to_px_list(b["p"])
        if len(pts_px) >= 3:
            draw.polygon(pts_px, fill=255, outline=255)
            draw.line(pts_px + [pts_px[0]], fill=255, width=5)

    # 3. Pintar ríos y ferrocarriles con su faja de protección
    for wl in water_lines:
        pts_px = flat_to_px_list(wl["p"])
        if len(pts_px) >= 2:
            draw.line(pts_px, fill=255, width=int(math.ceil(wl["w"] + 16)))

    for rw in railways:
        pts_px = flat_to_px_list(rw["p"])
        if len(pts_px) >= 2:
            draw.line(pts_px, fill=255, width=18)

    # 4. Pintar todas las calles + margen de vereda + radio en vértices
    # Y construir índice espacial de segmentos viales para verificación exacta de distancia.
    cell_size = 40.0
    road_grid: dict[tuple[int, int], list[tuple[float, float, float, float, float]]] = defaultdict(list)

    for rd in roads:
        pts = rd["p"]
        rw = rd["w"]
        pts_px = flat_to_px_list(pts)
        clear_px = int(math.ceil(rw + 5.6))
        if len(pts_px) >= 2:
            draw.line(pts_px, fill=255, width=clear_px)
        rad_px = max(2, clear_px // 2)
        for px, pz in pts_px:
            draw.ellipse((px - rad_px, pz - rad_px, px + rad_px, pz + rad_px), fill=255)

        for j in range(0, len(pts) - 2, 2):
            ax, az, bx, bz = pts[j], pts[j + 1], pts[j + 2], pts[j + 3]
            if max(ax, bx) < min_x - 30 or min(ax, bx) > max_x + 30:
                continue
            if max(az, bz) < min_z - 30 or min(az, bz) > max_z + 30:
                continue
            gx0 = int(math.floor((min(ax, bx) - rw) / cell_size))
            gx1 = int(math.floor((max(ax, bx) + rw) / cell_size))
            gz0 = int(math.floor((min(az, bz) - rw) / cell_size))
            gz1 = int(math.floor((max(az, bz) + rw) / cell_size))
            seg_tuple = (ax, az, bx, bz, rw)
            for gx in range(gx0, gx1 + 1):
                for gz in range(gz0, gz1 + 1):
                    road_grid[(gx, gz)].append(seg_tuple)

    buf = bytearray(mask_img.tobytes())

    def is_free_point(x: float, z: float) -> bool:
        ix = int(round((x - min_x) * scale))
        iz = int(round((z - min_z) * scale))
        if ix < 2 or ix >= w_px - 2 or iz < 2 or iz >= h_px - 2:
            return False
        return buf[iz * w_px + ix] == 0

    def respects_road_clearance(corners: list[tuple[float, float]]) -> bool:
        checked_segs: set[tuple[float, float, float, float, float]] = set()
        for cx, cz in corners:
            gx = int(math.floor(cx / cell_size))
            gz = int(math.floor(cz / cell_size))
            for seg in road_grid.get((gx, gz), ()):
                checked_segs.add(seg)
        for ax, az, bx, bz, rw in checked_segs:
            min_d = rw * 0.5 + 1.6
            for vx, vz in corners:
                if point_seg_dist(vx, vz, ax, az, bx, bz) < min_d:
                    return False
        return True

    def mark_occupied_poly(corners: list[tuple[float, float]]) -> None:
        xs = [to_px(x, z)[0] for x, z in corners]
        zs = [to_px(x, z)[1] for x, z in corners]
        x0 = max(0, min(xs) - 2)
        x1 = min(w_px - 1, max(xs) + 2)
        z0 = max(0, min(zs) - 2)
        z1 = min(h_px - 1, max(zs) + 2)
        for zz in range(z0, z1 + 1):
            row_off = zz * w_px
            for xx in range(x0, x1 + 1):
                buf[row_off + xx] = 255

    rng = random.Random(20261111)
    infill: list[dict] = []

    for rd in roads:
        htype = rd["t"]
        if htype not in INFILL_HIGHWAYS:
            continue
        pts = rd["p"]
        rw = rd["w"]
        sname = (rd["n"] or "").lower()
        dist_center = math.hypot(pts[0], pts[1])
        # Limitar el relleno al casco consolidado de Calama para peso JSON óptimo y realismo
        if dist_center > 1950.0:
            continue

        is_commercial_axis = (
            htype in ("pedestrian", "primary", "secondary")
            or dist_center < 380.0
            or any(k in sname for k in COMMERCIAL_STREETS)
        )

        for j in range(0, len(pts) - 2, 2):
            ax, az, bx, bz = pts[j], pts[j + 1], pts[j + 2], pts[j + 3]
            seg_len = math.hypot(bx - ax, bz - az)
            if seg_len < 14.0:
                continue
            ux = (bx - ax) / seg_len
            uz = (bz - az) / seg_len
            nx, nz = -uz, ux  # normal perpendicular

            for side in (-1.0, 1.0):
                cursor = 4.5
                while cursor + 9.0 < seg_len - 4.0:
                    lot_w = round(rng.uniform(8.5, 13.5) if is_commercial_axis else rng.uniform(7.8, 11.8), 1)
                    if cursor + lot_w > seg_len - 3.5:
                        break
                    lot_d = round(rng.uniform(12.0, 17.5) if is_commercial_axis else rng.uniform(10.5, 15.0), 1)
                    setback = rw * 0.5 + 3.0

                    # Muestras en el interior y bordes del lote candidato
                    ok = True
                    for su in (0.0, 0.33, 0.67, 1.0):
                        if not ok:
                            break
                        along = cursor + su * lot_w
                        for sv in (0.0, 0.35, 0.7, 1.0):
                            off = setback + sv * lot_d
                            px = ax + ux * along + nx * side * off
                            pz = az + uz * along + nz * side * off
                            if not is_free_point(px, pz):
                                ok = False
                                break

                    if not ok:
                        cursor += 4.5
                        continue

                    # 4 esquinas orientadas en orden CCW sobre (x, z)
                    p0 = (ax + ux * cursor + nx * side * setback, az + uz * cursor + nz * side * setback)
                    p1 = (ax + ux * (cursor + lot_w) + nx * side * setback, az + uz * (cursor + lot_w) + nz * side * setback)
                    p2 = (ax + ux * (cursor + lot_w) + nx * side * (setback + lot_d), az + uz * (cursor + lot_w) + nz * side * (setback + lot_d))
                    p3 = (ax + ux * cursor + nx * side * (setback + lot_d), az + uz * cursor + nz * side * (setback + lot_d))
                    corners = [p0, p1, p2, p3]
                    if poly_area_signed(corners) < 0:
                        corners.reverse()

                    if not respects_road_clearance(corners):
                        cursor += 4.5
                        continue

                    mark_occupied_poly(corners)

                    if is_commercial_axis:
                        if dist_center < 280.0:
                            floors = rng.choices([2, 3, 4, 5], weights=[30, 38, 22, 10])[0]
                        else:
                            floors = rng.choices([1, 2, 3], weights=[35, 45, 20])[0]
                        height = round(floors * 3.2 + rng.uniform(0.3, 1.1), 1)
                        bkind = 1 if floors <= 3 else 2
                    else:
                        floors = rng.choices([1, 2], weights=[72, 28])[0]
                        height = round(floors * 2.95 + rng.uniform(0.2, 0.8), 1)
                        bkind = 0

                    infill.append({
                        "h": height,
                        "k": bkind,
                        "r": 0,
                        "p": flatten_pts(corners),
                    })
                    cursor += lot_w + rng.uniform(0.8, 2.2)

    return infill


def build_web_dataset() -> dict:
    if not OSM_PATH.exists():
        raise FileNotFoundError(f"No existe el archivo OSM fuente: {OSM_PATH}")

    tree = ET.parse(OSM_PATH)
    root = tree.getroot()

    nodes_xz: dict[str, tuple[float, float]] = {}
    node_tags: dict[str, dict[str, str]] = {}
    for n in root.findall("node"):
        nid = n.attrib["id"]
        lat = float(n.attrib["lat"])
        lon = float(n.attrib["lon"])
        nodes_xz[nid] = lat_lon_to_xz(lat, lon)
        t = {tag.attrib["k"]: tag.attrib["v"] for tag in n.findall("tag")}
        if t:
            node_tags[nid] = t

    ways_refs: dict[str, list[str]] = {}
    ways_pts: dict[str, list[tuple[float, float]]] = {}
    ways_tags: dict[str, dict[str, str]] = {}

    for w in root.findall("way"):
        wid = w.attrib["id"]
        refs = [nd.attrib["ref"] for nd in w.findall("nd") if nd.attrib["ref"] in nodes_xz]
        if len(refs) < 2:
            continue
        ways_refs[wid] = refs
        ways_pts[wid] = [nodes_xz[r] for r in refs]
        ways_tags[wid] = {tag.attrib["k"]: tag.attrib["v"] for tag in w.findall("tag")}

    roads: list[dict] = []
    buildings_real: list[dict] = []
    landmarks: list[dict] = []
    parks: list[dict] = []
    plazas: list[dict] = []
    water_lines: list[dict] = []
    water_polys: list[dict] = []
    railways: list[dict] = []
    forbidden_polys: list[list[float]] = []

    # IDs cuyos modelos 3D a medida reemplazan el bloque extruido genérico
    custom_3d_way_ids: set[str] = {"556152482", "723681400", "1057773844"}
    rel_member_ways_used: set[str] = set()

    # 1. Procesar relaciones multipolygon primero (Estadio Zorros del Desierto, edificios con patio, etc.)
    for rel in root.findall("relation"):
        rtags = {tag.attrib["k"]: tag.attrib["v"] for tag in rel.findall("tag")}
        if rtags.get("type") != "multipolygon":
            continue
        outer_segs: list[list[tuple[float, float]]] = []
        inner_segs: list[list[tuple[float, float]]] = []
        member_wids: list[str] = []

        for m in rel.findall("member"):
            if m.attrib.get("type") != "way":
                continue
            ref = m.attrib.get("ref", "")
            role = m.attrib.get("role", "outer")
            if ref not in ways_pts:
                continue
            member_wids.append(ref)
            if role == "inner":
                inner_segs.append(ways_pts[ref])
            else:
                outer_segs.append(ways_pts[ref])

        outer_rings = [clean_ring(r, ccw=True) for r in assemble_rings(outer_segs)]
        outer_rings = [r for r in outer_rings if r is not None]
        inner_rings = [clean_ring(r, ccw=False) for r in assemble_rings(inner_segs)]
        inner_rings = [r for r in inner_rings if r is not None]

        if not outer_rings:
            continue

        # Heredar nombre si está en el way exterior (ej. Estadio Zorros del Desierto way 1057773844)
        merged_tags = dict(rtags)
        for wid in member_wids:
            wt = ways_tags.get(wid, {})
            if "name" in wt and "name" not in merged_tags:
                merged_tags["name"] = wt["name"]
            if wt.get("leisure") == "stadium":
                merged_tags["leisure"] = "stadium"

        main_outer = max(outer_rings, key=lambda r: abs(poly_area_signed(r)))
        flat_outer = flatten_pts(main_outer)
        holes_flat = [flatten_pts(ir) for ir in inner_rings]

        is_stadium = merged_tags.get("building") == "stadium" or merged_tags.get("leisure") == "stadium"
        if is_stadium:
            rel_member_ways_used.update(member_wids)
            cx, cz = poly_centroid(main_outer)
            lm_entry = {
                "id": f"rel_{rel.attrib['id']}",
                "kind": "estadio",
                "name": merged_tags.get("name", "Estadio Zorros del Desierto"),
                "cx": cx,
                "cz": cz,
                "angle": dominant_angle(main_outer),
                "h": 21.0,
                "p": flat_outer,
            }
            if holes_flat:
                lm_entry["holes"] = holes_flat
            landmarks.append(lm_entry)
            forbidden_polys.append(flat_outer)
        elif "building" in merged_tags:
            rel_member_ways_used.update(member_wids)
            b_entry = {
                "h": compute_building_height(rel.attrib["id"], merged_tags),
                "k": classify_building_kind(merged_tags),
                "r": 1,
                "p": flat_outer,
            }
            if holes_flat:
                b_entry["holes"] = holes_flat
            buildings_real.append(b_entry)
            forbidden_polys.append(flat_outer)

    # 2. Procesar ways individuales
    node_road_tangents: dict[str, float] = {}
    drivable_way_records: list[tuple[int, list[str], int]] = []
    paseo_ramirez_pts: list[tuple[float, float]] = []

    for wid, pts in ways_pts.items():
        tags = ways_tags[wid]
        refs = ways_refs[wid]
        name = tags.get("name", "")
        lname = name.lower()

        # Vías y calles
        if "highway" in tags:
            htype = tags["highway"].lower()
            if htype in EXCLUDED_HIGHWAYS:
                continue
            w_val = parse_float(tags.get("width"), 0.0)
            if w_val <= 0:
                lanes = parse_float(tags.get("lanes"), 0.0)
                w_val = max(6.0, lanes * 3.4) if lanes > 0 else ROAD_WIDTHS.get(htype, 7.5)
            oneway = parse_oneway(tags, htype)
            surface = tags.get("surface", "paving_stones" if htype == "pedestrian" else "asphalt")

            clean_line: list[tuple[float, float]] = []
            clean_refs: list[str] = []
            for idx_pt, pt in enumerate(pts):
                q = (round(pt[0], 1), round(pt[1], 1))
                if not clean_line or q != clean_line[-1]:
                    clean_line.append(q)
                    clean_refs.append(refs[idx_pt])
            if len(clean_line) < 2:
                continue

            road_idx = len(roads)
            roads.append({
                "id": road_idx,
                "n": name,
                "t": htype,
                "w": round(w_val, 1),
                "o": oneway,
                "s": surface,
                "p": flatten_pts(clean_line),
            })

            if htype == "pedestrian" and "ram" in lname:
                paseo_ramirez_pts.extend(clean_line)

            # Guardar tangente por nodo para orientar pasos de cebra reales
            for i_ref in range(len(clean_refs)):
                i0 = max(0, i_ref - 1)
                i1 = min(len(clean_line) - 1, i_ref + 1)
                dx = clean_line[i1][0] - clean_line[i0][0]
                dz = clean_line[i1][1] - clean_line[i0][1]
                if dx * dx + dz * dz > 1e-4:
                    node_road_tangents[clean_refs[i_ref]] = math.atan2(dz, dx)

            if htype in DRIVABLE_HIGHWAYS:
                drivable_way_records.append((road_idx, clean_refs, oneway))
            continue

        # Hitos explícitos en ways
        if wid == "567103798" or ("23 de marzo" in lname and tags.get("leisure") == "park"):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                plazas.append({"name": "Plaza 23 de Marzo", "p": flat})
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "plaza23",
                    "name": "Plaza 23 de Marzo",
                    "cx": cx,
                    "cz": cz,
                    "angle": dominant_angle(ring),
                    "h": 0.2,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid == "556152482" or ("san juan bautista" in lname):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                # Orientar fachada hacia el centro de Plaza 23 de Marzo (aprox +X)
                ang_to_plaza = math.atan2(-2.0 - cz, -17.0 - cx)
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "catedral",
                    "name": "Catedral San Juan Bautista",
                    "cx": cx,
                    "cz": cz,
                    "angle": round(ang_to_plaza, 3),
                    "h": 26.0,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid == "723681400" or ("municipalidad de calama" in lname):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "municipalidad",
                    "name": "Ilustre Municipalidad de Calama",
                    "cx": cx,
                    "cz": cz,
                    "angle": dominant_angle(ring),
                    "h": 14.5,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid == "1057773844" and not any(lm["kind"] == "estadio" for lm in landmarks):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "estadio",
                    "name": "Estadio Zorros del Desierto",
                    "cx": cx,
                    "cz": cz,
                    "angle": dominant_angle(ring),
                    "h": 21.0,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid == "144758470" or (lname == "codelco"):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "codelco",
                    "name": "Edificio Corporativo Codelco Norte",
                    "cx": cx,
                    "cz": cz,
                    "angle": dominant_angle(ring),
                    "h": 24.0,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid == "113657392" or ("mall plaza calama" in lname and "estacionamiento" not in lname):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "mall",
                    "name": "Mall Plaza Calama",
                    "cx": cx,
                    "cz": cz,
                    "angle": dominant_angle(ring),
                    "h": 14.0,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid == "144751716" or ("terminal de buses calama" in lname):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "terminal",
                    "name": "Terminal de Buses Calama",
                    "cx": cx,
                    "cz": cz,
                    "angle": dominant_angle(ring),
                    "h": 10.5,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid in ("498671067", "196905278") or "cobreloa" in lname:
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                cx, cz = poly_centroid(ring)
                landmarks.append({
                    "id": f"way_{wid}",
                    "kind": "cobreloa",
                    "name": name or "Club Cobreloa",
                    "cx": cx,
                    "cz": cz,
                    "angle": dominant_angle(ring),
                    "h": 9.5,
                    "p": flat,
                })
                forbidden_polys.append(flat)
            continue

        if wid in rel_member_ways_used or wid in custom_3d_way_ids:
            continue

        # Edificios generales de OSM
        if "building" in tags or "building:part" in tags:
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                buildings_real.append({
                    "h": compute_building_height(wid, tags),
                    "k": classify_building_kind(tags),
                    "r": 1,
                    "p": flat,
                })
            continue

        # Parques, canchas y áreas verdes
        if tags.get("leisure") in ("park", "garden", "recreation_ground", "playground", "sports_centre", "pitch", "water_park", "stadium"):
            ring = clean_ring(pts, ccw=True)
            if ring:
                flat = flatten_pts(ring)
                parks.append({"name": name, "p": flat})
                forbidden_polys.append(flat)
                if wid == "145475982" or lname == "parque el loa":
                    cx, cz = poly_centroid(ring)
                    landmarks.append({
                        "id": f"way_{wid}",
                        "kind": "parque_loa",
                        "name": "Parque El Loa",
                        "cx": cx,
                        "cz": cz,
                        "angle": 0.0,
                        "h": 0.1,
                        "p": flat,
                    })
            continue

        # Cursos y espejos de agua (Río Loa, canales, lagunas)
        if "waterway" in tags or tags.get("natural") in ("water", "river", "stream", "wetland"):
            wtype = (tags.get("waterway") or tags.get("natural") or "water").lower()
            if ("natural" in tags or tags.get("water") is not None) and math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) < 1.0:
                ring = clean_ring(pts, ccw=True)
                if ring:
                    flat = flatten_pts(ring)
                    water_polys.append({"p": flat})
                    forbidden_polys.append(flat)
            else:
                ww = {"river": 18.0, "canal": 8.0, "stream": 5.5, "ditch": 3.5, "drain": 3.0}.get(wtype, 7.0)
                water_lines.append({"w": ww, "p": flatten_pts(pts)})
            continue

        # Ferrocarril FCAB
        if tags.get("railway") in ("rail", "narrow_gauge", "light_rail", "siding", "spur"):
            railways.append({"p": flatten_pts(pts)})
            continue

        # Estacionamientos, cementerios y predios institucionales (no rellenar con casas encima)
        if tags.get("amenity") in ("parking", "school", "hospital", "marketplace", "bus_station") or tags.get("landuse") in ("cemetery", "industrial", "military", "quarry"):
            ring = clean_ring(pts, ccw=True)
            if ring:
                forbidden_polys.append(flatten_pts(ring))

    # Registrar Paseo Peatonal Eleuterio Ramírez como hito
    if paseo_ramirez_pts:
        cx = round(sum(p[0] for p in paseo_ramirez_pts) / len(paseo_ramirez_pts), 1)
        cz = round(sum(p[1] for p in paseo_ramirez_pts) / len(paseo_ramirez_pts), 1)
        landmarks.append({
            "id": "paseo_ramirez",
            "kind": "paseo_ramirez",
            "name": "Paseo Peatonal Eleuterio Ramírez",
            "cx": cx,
            "cz": cz,
            "angle": round(math.pi * 0.5, 3),
            "h": 4.5,
            "p": [round(cx - 6, 1), round(cz - 30, 1), round(cx + 6, 1), round(cz - 30, 1),
                  round(cx + 6, 1), round(cz + 30, 1), round(cx - 6, 1), round(cz + 30, 1)],
        })

    # 3. Semáforos reales, pasos de cebra reales y POIs
    signals: list[float] = []
    crossings: list[float] = []
    pois: list[dict] = []

    for nid, ntags in node_tags.items():
        x, z = nodes_xz[nid]
        hw = ntags.get("highway")
        if hw == "traffic_signals":
            signals.extend((round(x, 1), round(z, 1)))
        elif hw == "crossing":
            ang = node_road_tangents.get(nid, 0.0)
            crossings.extend((round(x, 1), round(z, 1), round(ang, 3)))

        pname = ntags.get("name", "").strip()
        if pname:
            cat = (
                ntags.get("amenity")
                or ntags.get("shop")
                or ntags.get("tourism")
                or ntags.get("historic")
                or ntags.get("leisure")
                or ntags.get("office")
            )
            if cat:
                pois.append({
                    "n": pname,
                    "c": cat,
                    "x": round(x, 1),
                    "z": round(z, 1),
                })
                if "dinosaurio" in pname.lower():
                    landmarks.append({
                        "id": f"node_{nid}",
                        "kind": "dinosaurio_loa",
                        "name": pname,
                        "cx": round(x, 1),
                        "cz": round(z, 1),
                        "angle": 0.4,
                        "h": 8.0,
                        "p": [round(x - 4, 1), round(z - 4, 1), round(x + 4, 1), round(z - 4, 1),
                              round(x + 4, 1), round(z + 4, 1), round(x - 4, 1), round(z + 4, 1)],
                    })

    # 4. Construir grafo vial conectado partiendo ways en nodos compartidos (intersecciones reales)
    ref_counts: dict[str, int] = defaultdict(int)
    for _, crefs, _ in drivable_way_records:
        for r in crefs:
            ref_counts[r] += 1

    graph_node_index: dict[str, int] = {}
    graph_nodes_flat: list[float] = []
    graph_edges: list[list[int]] = []

    def get_gnode(ref_id: str) -> int:
        if ref_id in graph_node_index:
            return graph_node_index[ref_id]
        idx = len(graph_nodes_flat) // 2
        graph_node_index[ref_id] = idx
        nx_val, nz_val = nodes_xz[ref_id]
        graph_nodes_flat.extend((round(nx_val, 1), round(nz_val, 1)))
        return idx

    for road_idx, crefs, oneway in drivable_way_records:
        split_indices = [0]
        for i in range(1, len(crefs) - 1):
            if ref_counts[crefs[i]] > 1:
                split_indices.append(i)
        split_indices.append(len(crefs) - 1)

        for k in range(len(split_indices) - 1):
            r_a = crefs[split_indices[k]]
            r_b = crefs[split_indices[k + 1]]
            if r_a == r_b:
                continue
            u = get_gnode(r_a)
            v = get_gnode(r_b)
            if oneway == 1:
                graph_edges.append([u, v, road_idx, 1])
            elif oneway == -1:
                graph_edges.append([v, u, road_idx, 1])
            else:
                graph_edges.append([u, v, road_idx, 0])
                graph_edges.append([v, u, road_idx, 0])

    # 5. Generar relleno urbano inteligente de cuadras vacías
    infill_buildings = generate_urban_infill(
        roads=roads,
        real_buildings=buildings_real,
        forbidden_polys=forbidden_polys,
        water_lines=water_lines,
        railways=railways,
    )
    all_buildings = buildings_real + infill_buildings

    all_xs = [roads[0]["p"][0]] if roads else [0.0]
    all_zs = [roads[0]["p"][1]] if roads else [0.0]
    for rd in roads:
        all_xs.extend(rd["p"][0::2])
        all_zs.extend(rd["p"][1::2])

    dataset = {
        "meta": {
            "version": 1,
            "origin": {"lat": ORIGIN_LAT, "lon": ORIGIN_LON, "name": "Plaza 23 de Marzo, Calama"},
            "bounds": [round(min(all_xs), 1), round(min(all_zs), 1), round(max(all_xs), 1), round(max(all_zs), 1)],
        },
        "roads": roads,
        "graph": {
            "nodes": graph_nodes_flat,
            "edges": graph_edges,
        },
        "buildings": all_buildings,
        "landmarks": landmarks,
        "parks": parks,
        "plazas": plazas,
        "waterLines": water_lines,
        "waterPolys": water_polys,
        "railways": railways,
        "signals": signals,
        "crossings": crossings,
        "pois": pois,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(f"[OK] Generado {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB)")
    print(f"  Calles:         {len(roads)}")
    print(f"  Nodos grafo:    {len(graph_nodes_flat) // 2} | Aristas: {len(graph_edges)}")
    print(f"  Edificios OSM:  {len(buildings_real)} | Infill urbano: {len(infill_buildings)} | Total: {len(all_buildings)}")
    print(f"  Hitos 3D:       {len(landmarks)} ({', '.join(sorted({l['kind'] for l in landmarks}))})")
    print(f"  Semáforos:      {len(signals) // 2} | Pasos de cebra: {len(crossings) // 3}")
    print(f"  Parques:        {len(parks)} | POIs: {len(pois)}")
    return dataset


if __name__ == "__main__":
    build_web_dataset()
