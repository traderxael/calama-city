# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import math
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "Tools"))

import generar_datos_web as gen  # noqa: E402


def point_in_poly(px: float, pz: float, flat: list[float]) -> bool:
    inside = False
    n = len(flat) // 2
    j = n - 1
    for i in range(n):
        xi, zi = flat[2 * i], flat[2 * i + 1]
        xj, zj = flat[2 * j], flat[2 * j + 1]
        if ((zi > pz) != (zj > pz)) and (px < (xj - xi) * (pz - zi) / ((zj - zi) or 1e-12) + xi):
            inside = not inside
        j = i
    return inside


def polygon_area_abs(flat: list[float]) -> float:
    n = len(flat) // 2
    s = 0.0
    for i in range(n):
        x1, z1 = flat[2 * i], flat[2 * i + 1]
        x2, z2 = flat[2 * ((i + 1) % n)], flat[2 * ((i + 1) % n) + 1]
        s += x1 * z2 - x2 * z1
    return abs(s) * 0.5


def point_seg_dist(px: float, pz: float, ax: float, az: float, bx: float, bz: float) -> float:
    dx, dz = bx - ax, bz - az
    l2 = dx * dx + dz * dz
    if l2 < 1e-9:
        return math.hypot(px - ax, pz - az)
    t = max(0.0, min(1.0, ((px - ax) * dx + (pz - az) * dz) / l2))
    return math.hypot(px - (ax + t * dx), pz - (az + t * dz))


class TestGenerarDatosWeb(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.out_path = ROOT / "web" / "data" / "calama_map.json"
        if not cls.out_path.exists():
            gen.build_web_dataset()
        cls.data = json.loads(cls.out_path.read_text(encoding="utf-8"))

    def test_proyeccion_sin_espejado(self) -> None:
        # Un punto 0.001 grados al Norte (lat mayor, menos negativa) y 0.001 al Este (lon mayor):
        # +X = Este (> 0), -Z = Norte (< 0).
        x, z = gen.lat_lon_to_xz(-22.4614, -68.9262)
        self.assertGreater(x, 95.0)
        self.assertLess(x, 110.0)
        self.assertLess(z, -105.0)
        self.assertGreater(z, -118.0)

        x0, z0 = gen.lat_lon_to_xz(gen.ORIGIN_LAT, gen.ORIGIN_LON)
        self.assertEqual((x0, z0), (0.0, 0.0))

    def test_ensamblaje_multipoligono_estadio_y_landmarks(self) -> None:
        landmarks = self.data["landmarks"]
        by_kind = {}
        for lm in landmarks:
            by_kind.setdefault(lm["kind"], []).append(lm)

        for required in ("plaza23", "catedral", "municipalidad", "codelco", "estadio", "mall", "terminal", "paseo_ramirez", "parque_loa"):
            self.assertIn(required, by_kind, f"Falta hito requerido: {required}")

        estadio = by_kind["estadio"][0]
        self.assertGreater(polygon_area_abs(estadio["p"]), 8000.0)

        catedral = by_kind["catedral"][0]
        # Catedral San Juan Bautista queda frente al costado oeste de Plaza 23 de Marzo (< 90 m del origen).
        self.assertLess(math.hypot(catedral["cx"], catedral["cz"]), 90.0)

    def test_semaforos_cruces_y_grafo(self) -> None:
        signals = self.data["signals"]
        crossings = self.data["crossings"]
        graph = self.data["graph"]

        self.assertEqual(len(signals) % 2, 0)
        self.assertGreaterEqual(len(signals) // 2, 180)

        self.assertEqual(len(crossings) % 3, 0)
        self.assertGreaterEqual(len(crossings) // 3, 500)

        self.assertGreaterEqual(len(graph["nodes"]) // 2, 1200)
        self.assertGreaterEqual(len(graph["edges"]), 2500)

    def test_infill_llena_cuadras_sin_pisar_calles_ni_plaza(self) -> None:
        buildings = self.data["buildings"]
        real_b = [b for b in buildings if b["r"] == 1]
        infill_b = [b for b in buildings if b["r"] == 0]

        self.assertGreaterEqual(len(real_b), 1000)
        self.assertGreaterEqual(len(infill_b), 1500)

        plaza = next(lm for lm in self.data["landmarks"] if lm["kind"] == "plaza23")
        plaza_poly = plaza["p"]

        # Calles en un radio de 400 m del centro para verificación geométrica estricta
        central_roads = []
        for rd in self.data["roads"]:
            pts = rd["p"]
            if any(abs(pts[i]) < 450 and abs(pts[i + 1]) < 450 for i in range(0, len(pts), 2)):
                central_roads.append(rd)

        checked_central_infill = 0
        for b in infill_b:
            pts = b["p"]
            for i in range(0, len(pts), 2):
                vx, vz = pts[i], pts[i + 1]
                self.assertFalse(
                    point_in_poly(vx, vz, plaza_poly),
                    f"Vértice infill ({vx}, {vz}) invade Plaza 23 de Marzo",
                )
            if abs(pts[0]) < 350 and abs(pts[1]) < 350:
                checked_central_infill += 1
                for rd in central_roads:
                    rp = rd["p"]
                    min_clear = rd["w"] * 0.5 + 0.8
                    for j in range(0, len(rp) - 2, 2):
                        ax, az, bx, bz = rp[j], rp[j + 1], rp[j + 2], rp[j + 3]
                        if max(ax, bx) + min_clear < pts[0] or min(ax, bx) - min_clear > pts[0]:
                            continue
                        if max(az, bz) + min_clear < pts[1] or min(az, bz) - min_clear > pts[1]:
                            continue
                        d = point_seg_dist(pts[0], pts[1], ax, az, bx, bz)
                        self.assertGreaterEqual(
                            d,
                            min_clear,
                            f"Lote infill demasiado cerca ({d:.2f}m < {min_clear:.2f}m) de calle {rd['n'] or rd['t']}",
                        )

        self.assertGreaterEqual(checked_central_infill, 80, "Debe haber relleno urbano en el centro de Calama")
        self.assertLess(self.out_path.stat().st_size, 4_500_000)


if __name__ == "__main__":
    unittest.main()
