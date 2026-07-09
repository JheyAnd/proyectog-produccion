import openpyxl
from datetime import date, timedelta
from typing import List, Dict


def parse_cronograma_excel(filepath: str) -> dict:
    """
    Parsea el Excel del cronograma de MS Project.
    Soporta pesos RELATIVOS al padre (jerárquicos).
    Columnas: Nº Esquema | Nombre | PESO | Comienzo | Fin | Duración
    """
    wb = openpyxl.load_workbook(filepath, data_only=True)
    ws = wb.active

    actividades = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or all(v is None for v in row):
            continue

        wbs_code     = row[0]
        nombre       = row[1]
        peso         = row[2]
        fecha_inicio = row[3]
        fecha_fin    = row[4]

        if nombre is None or peso is None or not fecha_inicio or not fecha_fin:
            continue

        # Normalizar fechas (pueden ser datetime o date)
        if hasattr(fecha_inicio, 'date'):
            fecha_inicio = fecha_inicio.date()
        if hasattr(fecha_fin, 'date'):
            fecha_fin = fecha_fin.date()

        # Convertir peso a float
        try:
            peso_float = float(peso)
        except (ValueError, TypeError):
            continue

        actividades.append({
            "wbs_code":    str(wbs_code).strip() if wbs_code else "",
            "nombre":      str(nombre).strip(),
            "peso":        peso_float,
            "fecha_inicio": fecha_inicio,
            "fecha_fin":   fecha_fin,
            "duracion":    (fecha_fin - fecha_inicio).days + 1,
        })

    if not actividades:
        raise ValueError("El Excel no contiene actividades válidas.")

    # ═══════════════════════════════════════════════════════════════════
    # CÁLCULO DE PESOS JERÁRQUICOS → PESOS ABSOLUTOS NORMALIZADOS
    #
    # El PESO en el Excel es RELATIVO al padre (MS Project).
    # Peso absoluto de una hoja = producto de pesos desde la raíz.
    # Al final se normalizan para que sumen exactamente 1.0 (100%).
    # ═══════════════════════════════════════════════════════════════════
    mapa = {a['wbs_code']: a for a in actividades}
    todos_los_codes = set(mapa.keys())

    def peso_absoluto(wbs_code: str) -> float:
        """Calcula el peso absoluto multiplicando la cadena de padres."""
        partes = str(wbs_code).split('.')
        peso = mapa[wbs_code]['peso']
        for i in range(len(partes) - 1, 0, -1):
            padre = '.'.join(partes[:i])
            if padre in mapa:
                peso *= mapa[padre]['peso']
        return peso

    # Identificar tareas HOJA: actividades sin hijos directos
    # Excluir la tarea raíz (wbs_code == '0' o nivel 0)
    hojas = []
    for act in actividades:
        wbs = act['wbs_code']
        # Saltar tarea raíz del proyecto
        if wbs == '0' or '.' not in wbs and len(wbs) <= 1:
            tiene_hijos = any(
                str(c).startswith(str(wbs) + '.')
                for c in todos_los_codes if c != wbs
            )
            if tiene_hijos:
                continue  # Es raíz con hijos — saltar

        tiene_hijos = any(
            str(c).startswith(str(wbs) + '.')
            for c in todos_los_codes if c != wbs
        )
        if not tiene_hijos:
            try:
                peso_abs = peso_absoluto(wbs)
            except Exception:
                peso_abs = act['peso']
            if peso_abs > 0:
                hojas.append({**act, 'peso_abs': peso_abs})

    # Si no hay jerarquía (todas son hojas planas), usar pesos directos
    if not hojas:
        # Fallback: usar todas las actividades con peso > 0
        hojas = [{**a, 'peso_abs': a['peso']} for a in actividades if a['peso'] > 0]

    if not hojas:
        raise ValueError("No se encontraron tareas hoja con peso válido en el Excel.")

    # Normalizar para que sumen exactamente 1.0 (100%)
    total_abs = sum(h['peso_abs'] for h in hojas)
    if total_abs <= 0:
        raise ValueError("La suma de pesos es 0. Verificar el Excel.")

    for h in hojas:
        h['peso_normalizado'] = h['peso_abs'] / total_abs

    # Construir lista final para insertar en BD
    actividades_finales = [{
        "wbs_code":    h['wbs_code'],
        "nombre":      h['nombre'],
        "peso":        h['peso_normalizado'],
        "fecha_inicio": h['fecha_inicio'],
        "fecha_fin":   h['fecha_fin'],
        "duracion":    h['duracion'],
    } for h in hojas]

    # Calcular Curva S proyectada
    proyectado = calcular_curva_s(actividades_finales)

    total_peso_check = sum(a['peso'] for a in actividades_finales)

    return {
        "actividades":       actividades_finales,
        "proyectado":        proyectado,
        "total_peso":        total_peso_check,
        "total_actividades": len(actividades_finales),
        "total_semanas":     len(proyectado),
    }


def calcular_curva_s(actividades: List[dict]) -> List[dict]:
    """
    Distribuye el peso de cada actividad linealmente entre sus semanas.
    Retorna lista de semanas con avance_planeado acumulado (0-100%).
    """
    if not actividades:
        return []

    inicio = min(a['fecha_inicio'] for a in actividades)
    fin    = max(a['fecha_fin']    for a in actividades)

    # Ajustar inicio al lunes más cercano (semanas comienzan en lunes)
    inicio -= timedelta(days=inicio.weekday())

    semanas = []
    s = inicio
    while s <= fin:
        semanas.append(s)
        s += timedelta(weeks=1)

    peso_semanal: Dict[date, float] = {s: 0.0 for s in semanas}

    for act in actividades:
        semanas_act = [
            s for s in semanas
            if act['fecha_inicio'] <= s + timedelta(days=6)
            and act['fecha_fin']   >= s
        ]
        if not semanas_act:
            continue
        ppw = act['peso'] / len(semanas_act)
        for s in semanas_act:
            peso_semanal[s] += ppw

    resultado = []
    acumulado = 0.0
    for i, semana in enumerate(semanas):
        acumulado += peso_semanal[semana]
        resultado.append({
            "semana":          i,
            "fecha_semana":    semana,
            "avance_planeado": round(min(acumulado * 100, 100.0), 6),
        })

    return resultado
