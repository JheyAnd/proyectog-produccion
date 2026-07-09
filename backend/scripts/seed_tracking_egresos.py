"""
Seed script: migra datos JSON → MySQL

Ejecutar UNA SOLA VEZ después de correr la migración de Alembic:
  alembic upgrade head
  python scripts/seed_tracking_egresos.py

Idempotente: usa bulk-upsert, por lo que se puede volver a ejecutar sin duplicar datos.
"""
import asyncio
import json
import sys
from pathlib import Path

# Añadir raíz del proyecto al path para imports
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from src.infrastructure.database.session import AsyncSessionLocal
from src.infrastructure.database.models.project_tracking_model import ProjectTrackingModel
from src.infrastructure.database.models.egreso_model import EgresoCategoriaModel, EgresoValorModel
import uuid
from datetime import datetime, timezone

# ── Rutas a los archivos JSON del frontend ────────────────────────
FRONTEND_DATA = ROOT.parent / "frontend" / "src" / "data"

TRACKING_PCM_FILE = FRONTEND_DATA / "projectsTrackingData.json"
TRACKING_PCS_FILE = FRONTEND_DATA / "projectsSolarData.json"

# ── Datos de categorías de egresos extraídos del TS ──────────────
# (espejo de INITIAL_EGRESOS_CATEGORIAS en excelCategoriasEgresos.ts)
INITIAL_EGRESOS_CATEGORIAS = [
    # ── MATERIALES ──
    {"id": "mat-accesorios", "grupo": "materiales", "nombre": "ACCESORIOS GENERALES", "sort_order": 0, "valores": {"2026-02": 63396800, "2026-03": 792375502, "2026-04": 840100702, "2026-05": 3325500, "2026-06": 425984127, "2026-07": 196432280, "2026-08": 224707778, "2026-09": 113929620}},
    {"id": "mat-aparatos", "grupo": "materiales", "nombre": "APARATOS", "sort_order": 1, "valores": {"2025-12": 1521565, "2026-02": 19805040, "2026-03": 174870247, "2026-04": 192660747, "2026-05": 993962963, "2026-06": 243433426, "2026-07": 243433426, "2026-08": 150635865}},
    {"id": "mat-cables", "grupo": "materiales", "nombre": "CABLES ELECTRICOS", "sort_order": 2, "valores": {"2025-12": 10000000, "2026-02": 2565000, "2026-03": 16470748, "2026-04": 260091668, "2026-05": 243433426, "2026-06": 83673667, "2026-07": 83673667, "2026-08": 368295250}},
    {"id": "mat-dotacion", "grupo": "materiales", "nombre": "DOTACION", "sort_order": 3, "valores": {"2026-02": 441904855, "2026-04": 251021000, "2026-05": 83673667, "2026-06": 19960920, "2026-07": 19960920, "2026-08": 221666667}},
    {"id": "mat-ductos", "grupo": "materiales", "nombre": "DUCTOS Y CANASTILLAS", "sort_order": 4, "valores": {"2026-02": 810246566, "2026-04": 128329280, "2026-05": 19960920, "2026-06": 200847820, "2026-07": 368295250, "2026-08": 324853135}},
    {"id": "mat-generico", "grupo": "materiales", "nombre": "GENERICO", "sort_order": 5, "valores": {"2026-02": 254236471, "2026-04": 301271730, "2026-05": 69485535, "2026-06": 221666667, "2026-07": 221666667, "2026-08": 83333333}},
    {"id": "mat-herramienta", "grupo": "materiales", "nombre": "HERRAMIENTA", "sort_order": 6, "valores": {"2026-02": 59910600, "2026-04": 9673821, "2026-05": 368295250, "2026-06": 91906651, "2026-07": 324853135, "2026-08": 232892249}},
    {"id": "mat-luminarias", "grupo": "materiales", "nombre": "LUMINARIAS", "sort_order": 7, "valores": {"2026-02": 69485534, "2026-04": 18896223, "2026-05": 193817128, "2026-06": 83333333, "2026-07": 83333333}},
    {"id": "mat-papeleria", "grupo": "materiales", "nombre": "PAPELERIA Y ASEO", "sort_order": 8, "valores": {"2026-02": 351483685, "2026-04": 91177540, "2026-05": 68383155, "2026-06": 68383155}},
    {"id": "mat-redes", "grupo": "materiales", "nombre": "REDES Y/O EQUIPOS ESPECIALES", "sort_order": 9, "valores": {"2026-02": 368295250, "2026-04": 105935679, "2026-05": 79451759, "2026-06": 79451759}},
    {"id": "mat-seguridad", "grupo": "materiales", "nombre": "SEGURIDAD INDUSTRIAL", "sort_order": 10, "valores": {"2026-02": 4231824600, "2026-04": 74549956, "2026-05": 55912467, "2026-06": 55912467}},
    {"id": "mat-servicios", "grupo": "materiales", "nombre": "SERVICIOS", "sort_order": 11, "valores": {"2026-02": 288497730, "2026-04": 34075000}},
    {"id": "mat-subestaciones", "grupo": "materiales", "nombre": "SUBESTACIONES", "sort_order": 12, "valores": {"2026-02": 115848782, "2026-04": 17785000}},
    {"id": "mat-tableros", "grupo": "materiales", "nombre": "TABLEROS Y GABINETES", "sort_order": 13, "valores": {"2026-02": 42855065, "2026-04": 3600000}},
    {"id": "mat-tuberia", "grupo": "materiales", "nombre": "TUBERIA", "sort_order": 14, "valores": {"2026-02": 39401866, "2026-04": 5000000}},
    {"id": "mat-vozdatos", "grupo": "materiales", "nombre": "VOZ Y DATOS", "sort_order": 15, "valores": {}},
    # ── MANO DE OBRA ──
    {"id": "mo-operativa", "grupo": "mano_obra", "nombre": "Mano de Obra Operativa", "sort_order": 16, "valores": {"2026-01": 3144103, "2026-02": 10040371, "2026-03": 23803102, "2026-04": 66555966, "2026-05": 163541294, "2026-06": 204426618, "2026-07": 204426618, "2026-08": 204426618, "2026-09": 102213309, "2026-10": 54513765}},
    {"id": "mo-he-operativa", "grupo": "mano_obra", "nombre": "Horas extras Personal Operativo", "sort_order": 17, "valores": {"2026-05": 24855473, "2026-06": 31069342, "2026-07": 31069342, "2026-08": 31069342}},
    {"id": "mo-administrativa", "grupo": "mano_obra", "nombre": "Mano de Obra Administrativa", "sort_order": 18, "valores": {"2026-01": 16028936, "2026-02": 28373549, "2026-03": 50730454, "2026-04": 51317648, "2026-05": 55974543, "2026-06": 65536356, "2026-07": 65536356, "2026-08": 65536356, "2026-09": 59217557, "2026-10": 51354348}},
    {"id": "mo-he-administrativa", "grupo": "mano_obra", "nombre": "Horas extras Personal Administrativo", "sort_order": 19, "valores": {"2026-05": 3803870, "2026-06": 4292882, "2026-07": 4292882, "2026-08": 4292882}},
    {"id": "mo-coordinadores", "grupo": "mano_obra", "nombre": "Coordinadores", "sort_order": 20, "valores": {}},
    # ── ADMINISTRATIVOS DIRECTIVOS ──
    {"id": "adm-arrendamientos", "grupo": "administracion", "nombre": "Arrendamientos", "sort_order": 21, "valores": {"2025-11": 25360, "2025-12": 2343348, "2026-01": 1952790, "2026-02": 2052750, "2026-03": 2364054, "2026-04": 4000000, "2026-05": 10000000, "2026-06": 4000000, "2026-07": 10000000, "2026-08": 10000000, "2026-09": 4000000, "2026-10": 2000000}},
    {"id": "adm-cajas", "grupo": "administracion", "nombre": "Cajas menores", "sort_order": 22, "valores": {"2026-01": 250570, "2026-02": 1187730, "2026-03": 3838866, "2026-04": 3000000, "2026-05": 3000000, "2026-06": 3000000, "2026-07": 3000000, "2026-08": 3000000, "2026-09": 3000000, "2026-10": 3000000}},
    {"id": "adm-examenes", "grupo": "administracion", "nombre": "Examenes Medicos Y Procesos De Afiliacion", "sort_order": 23, "valores": {"2025-12": 476200, "2026-01": 162000, "2026-04": 2500000, "2026-05": 5000000, "2026-06": 2500000, "2026-09": 8000000}},
    {"id": "adm-polizas", "grupo": "administracion", "nombre": "Polizas De Obras", "sort_order": 24, "valores": {"2026-02": 235139267}},
    {"id": "adm-serv-publicos", "grupo": "administracion", "nombre": "Servicios Publicos", "sort_order": 25, "valores": {"2025-11": 202300, "2025-12": 81741212, "2026-01": 27137950, "2026-02": 84539210, "2026-03": 500000, "2026-04": 500000, "2026-05": 500000, "2026-06": 500000, "2026-07": 500000, "2026-08": 500000, "2026-09": 500000, "2026-10": 500000}},
    {"id": "adm-tiquetes", "grupo": "administracion", "nombre": "Tiquetes Aereos", "sort_order": 26, "valores": {"2025-11": 752684, "2025-12": 8768588, "2026-01": 7751387, "2026-02": 2684360, "2026-03": 7000000, "2026-04": 7000000, "2026-05": 7000000, "2026-06": 7000000, "2026-07": 7000000, "2026-08": 7000000, "2026-09": 7000000, "2026-10": 7000000}},
    {"id": "adm-transportes", "grupo": "administracion", "nombre": "Transportes", "sort_order": 27, "valores": {"2025-12": 12905849, "2026-01": 1847448, "2026-02": 31485269, "2026-03": 1200000, "2026-04": 2000000, "2026-05": 5000000, "2026-06": 5000000, "2026-07": 2000000, "2026-08": 2000000, "2026-09": 2000000, "2026-10": 2000000}},
    {"id": "adm-viaticos", "grupo": "administracion", "nombre": "Viaticos", "sort_order": 28, "valores": {"2026-02": 4500000, "2026-03": 4500000, "2026-04": 4500000, "2026-05": 4500000, "2026-06": 4500000, "2026-07": 4500000, "2026-08": 4500000, "2026-09": 4500000, "2026-10": 4500000}},
    # ── INGRESOS ──
    {"id": "ing-anticipo", "grupo": "ingreso", "nombre": "Anticipo", "sort_order": 29, "valores": {}},
    {"id": "ing-cortes", "grupo": "ingreso", "nombre": "Cortes de obra", "sort_order": 30, "valores": {"2026-02": 16745324701, "2026-04": 1760762365, "2026-05": 2646124246, "2026-06": 976658824, "2026-07": 855247557, "2026-08": 856740893, "2026-11": 17839203647}},
    {"id": "ing-aiu", "grupo": "ingreso", "nombre": "AIU", "sort_order": 31, "valores": {}},
    {"id": "ing-deducciones", "grupo": "ingreso", "nombre": "Deducciones", "sort_order": 32, "valores": {}},
    {"id": "ing-amortizacion", "grupo": "ingreso", "nombre": "Amortización", "sort_order": 33, "valores": {}},
    {"id": "ing-garantia", "grupo": "ingreso", "nombre": "Retención Garantía", "sort_order": 34, "valores": {}},
    {"id": "ing-devolucion", "grupo": "ingreso", "nombre": "Devolución ingreso retenido (garantía)", "sort_order": 35, "valores": {}},
    {"id": "ing-iva", "grupo": "ingreso", "nombre": "IVA descontable", "sort_order": 36, "valores": {}},
]

PROJECT_KEY = "patio-sur-oe1035"


FLOAT_FIELDS = {
    "valor_original_contrato", "porcentaje_anticipo", "retencion_garantia",
    "utilidad_proyectada", "avance_programado", "avance_real", "valor_ordenes",
    "valor_otros_adiciones", "valor_actual_contrato", "valor_anticipo_recibido",
    "valor_facturado", "retenido", "amortizacion_anticipo", "valor_total_ingreso",
    "valor_descuentos", "valor_pagado", "valor_por_amortizar", "costos_materiales",
    "costos_mano_obra", "costos_administrativos", "costos_ejecutados_total",
    "utilidad_actual", "utilidad_proyectada_fc",
}


def clean_float(v) -> float | None:
    """Convierte strings con formato de moneda ($, puntos, comas) a float, o None."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        # Remover todo excepto dígitos, punto y signo negativo
        cleaned = ""
        for ch in v:
            if ch.isdigit() or ch in ".-":
                cleaned += ch
        if cleaned in ("", "."):
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def sanitize_project(p: dict) -> dict:
    """
    Limpia los campos float (strings con formato moneda) y trunca strings
    que excedan el limite definido en el modelo SQLAlchemy.
    """
    # Mapa de longitud máxima por columna (extraído del modelo)
    col_max_len: dict[str, int] = {
        col.name: col.type.length
        for col in ProjectTrackingModel.__table__.columns
        if hasattr(col.type, "length") and col.type.length is not None
    }

    result = {}
    for k, v in p.items():
        if k in FLOAT_FIELDS:
            result[k] = clean_float(v)
        elif isinstance(v, str) and k in col_max_len:
            max_len = col_max_len[k]
            result[k] = v[:max_len] if len(v) > max_len else v
        else:
            result[k] = v
    return result


def slugify(sheet_name: str, group: str) -> str:
    """Genera ID estable desde sheet_name + group para preservar URLs."""
    return f"{group.lower()}-{sheet_name.lower().replace(' ', '-')[:40]}"


async def seed_project_tracking(session) -> int:
    """Inserta proyectos PCM + PCS en project_tracking."""
    all_projects: list[dict] = []

    if TRACKING_PCM_FILE.exists():
        data = json.loads(TRACKING_PCM_FILE.read_text(encoding="utf-8"))
        for p in data:
            p.setdefault("group", "PCM")
            if "id" not in p or not p["id"]:
                p["id"] = slugify(p.get("sheet_name", "proyecto"), "pcm")
            all_projects.append(p)
        print(f"  OK PCM: {len(data)} proyectos leidos de {TRACKING_PCM_FILE.name}")
    else:
        print(f"  WARN Archivo no encontrado: {TRACKING_PCM_FILE}")

    if TRACKING_PCS_FILE.exists():
        data = json.loads(TRACKING_PCS_FILE.read_text(encoding="utf-8"))
        for p in data:
            p.setdefault("group", "PCS")
            if "id" not in p or not p["id"]:
                p["id"] = slugify(p.get("sheet_name", "proyecto"), "pcs")
            all_projects.append(p)
        print(f"  OK PCS: {len(data)} proyectos leidos de {TRACKING_PCS_FILE.name}")
    else:
        print(f"  WARN Archivo no encontrado: {TRACKING_PCS_FILE}")

    if not all_projects:
        print("  ERROR Sin proyectos para migrar.")
        return 0

    # Cargar existentes
    result = await session.execute(select(ProjectTrackingModel))
    existing_ids = {r.id for r in result.scalars().all()}

    upserted = 0
    for p in all_projects:
        pid = p.get("id")
        if not pid:
            continue

        # Limpiar valores de moneda y mapear campos al modelo
        p = sanitize_project(p)
        allowed = {c.key for c in ProjectTrackingModel.__table__.columns}
        filtered = {k: v for k, v in p.items() if k in allowed}

        if pid in existing_ids:
            result = await session.execute(
                select(ProjectTrackingModel).where(ProjectTrackingModel.id == pid)
            )
            row = result.scalar_one()
            for k, v in filtered.items():
                if k != "id":
                    setattr(row, k, v)
        else:
            row = ProjectTrackingModel(**filtered)
            session.add(row)

        upserted += 1

    await session.flush()
    return upserted


async def seed_egresos(session) -> int:
    """Inserta categorías de egresos en egreso_categorias + egreso_valores."""
    # Cargar existentes
    result = await session.execute(
        select(EgresoCategoriaModel).where(
            EgresoCategoriaModel.project_id == PROJECT_KEY
        )
    )
    existing_map = {r.id: r for r in result.scalars().all()}

    upserted = 0
    for cat_data in INITIAL_EGRESOS_CATEGORIAS:
        cat_id = cat_data["id"]
        valores: dict[str, float] = cat_data.get("valores", {})

        if cat_id in existing_map:
            cat = existing_map[cat_id]
            cat.nombre = cat_data["nombre"]
            cat.grupo = cat_data["grupo"]
            cat.sort_order = cat_data.get("sort_order", 0)
        else:
            cat = EgresoCategoriaModel(
                id=cat_id,
                project_id=PROJECT_KEY,
                nombre=cat_data["nombre"],
                grupo=cat_data["grupo"],
                incluir_en_grafico=True,
                sort_order=cat_data.get("sort_order", 0),
            )
            session.add(cat)
            await session.flush()  # para obtener cat.id antes de los valores

        # Upsert valores mensuales
        v_result = await session.execute(
            select(EgresoValorModel).where(EgresoValorModel.categoria_id == cat_id)
        )
        existing_valores = {v.mes_key: v for v in v_result.scalars().all()}

        for mes_key, valor in valores.items():
            if mes_key in existing_valores:
                existing_valores[mes_key].valor = valor
            else:
                session.add(EgresoValorModel(
                    id=str(uuid.uuid4()),
                    categoria_id=cat_id,
                    mes_key=mes_key,
                    valor=valor,
                ))

        upserted += 1

    await session.flush()
    return upserted


async def main():
    print("\n=======================================================")
    print("  SEED: Migracion JSON -> MySQL")
    print("=======================================================\n")

    async with AsyncSessionLocal() as session:
        async with session.begin():
            print(">> Migrando project_tracking...")
            n_tracking = await seed_project_tracking(session)
            print(f"  -> {n_tracking} proyectos procesados\n")

            print(">> Migrando egreso_categorias + egreso_valores...")
            n_egresos = await seed_egresos(session)
            print(f"  -> {n_egresos} categorias procesadas\n")

    print("=======================================================")
    print(f"  OK Seed completado: {n_tracking} proyectos, {n_egresos} categorias de egresos")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(main())
