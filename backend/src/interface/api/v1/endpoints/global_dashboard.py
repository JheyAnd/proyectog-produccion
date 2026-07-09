import traceback
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.project_model import ProjectModel
from src.infrastructure.database.models.egreso_model import EgresoCategoriaModel, EgresoValorModel

router = APIRouter()

@router.get("/global-cash-flow", response_model=dict)
async def get_global_cash_flow(db: AsyncSession = Depends(get_db_session)):
    try:
        # Fetch all active projects
        stmt_projects = select(ProjectModel)
        res_projects = await db.execute(stmt_projects)
        projects = res_projects.scalars().all()
        
        def get_company_str(company_id):
            if company_id == 2:
                return "PCS"
            elif company_id == 3:
                return "CARSAN"
            return "PCM"

        project_stats = {}
        for p in projects:
            comp_str = get_company_str(p.company_id)
            project_stats[p.id] = {
                "id": str(p.id),
                "name": p.name,
                "client_name": p.client_name,
                "company": comp_str,
                "total_income": Decimal(0),
                "total_expense": Decimal(0),
                "net": Decimal(0)
            }
            
        monthly_stats = {}
        global_income = Decimal(0)
        global_expense = Decimal(0)
        
        category_totals = {
            "todos": {"materiales": Decimal(0), "servicios": Decimal(0), "administracion": Decimal(0), "mano_obra": Decimal(0), "intereses": Decimal(0)},
            "PCM": {"materiales": Decimal(0), "servicios": Decimal(0), "administracion": Decimal(0), "mano_obra": Decimal(0), "intereses": Decimal(0)},
            "PCS": {"materiales": Decimal(0), "servicios": Decimal(0), "administracion": Decimal(0), "mano_obra": Decimal(0), "intereses": Decimal(0)},
            "CARSAN": {"materiales": Decimal(0), "servicios": Decimal(0), "administracion": Decimal(0), "mano_obra": Decimal(0), "intereses": Decimal(0)},
        }

        # Fetch all categorias and join with valores
        stmt_cat = select(EgresoCategoriaModel).options(selectinload(EgresoCategoriaModel.valores))
        res_cat = await db.execute(stmt_cat)
        categorias = res_cat.scalars().all()

        for cat in categorias:
            pid = cat.project_id
            if pid not in project_stats:
                continue
                
            is_income = (cat.grupo == "ingreso")
            comp_str = project_stats[pid]["company"]
            
            # Identify category for pie chart (only expenses)
            cat_key = None
            if not is_income:
                grupo_clean = cat.grupo.lower()
                nombre_clean = cat.nombre.lower()
                
                if "material" in grupo_clean or "material" in nombre_clean:
                    cat_key = "materiales"
                elif "servicio" in grupo_clean or "servicio" in nombre_clean:
                    cat_key = "servicios"
                elif "administra" in grupo_clean or "administra" in nombre_clean:
                    cat_key = "administracion"
                elif "mano" in grupo_clean or "obra" in grupo_clean or "mano" in nombre_clean or "obra" in nombre_clean:
                    cat_key = "mano_obra"
                elif "interes" in grupo_clean or "interés" in grupo_clean or "interes" in nombre_clean or "interés" in nombre_clean:
                    cat_key = "intereses"
            
            for valor_row in cat.valores:
                val = Decimal(str(valor_row.valor))
                m_key = valor_row.mes_key  # 'YYYY-MM'
                
                # split YYYY-MM to get year and month
                try:
                    y_str, m_str = m_key.split('-')
                    year_val = int(y_str)
                    month_val = int(m_str)
                except:
                    continue

                if is_income:
                    project_stats[pid]["total_income"] += val
                    project_stats[pid]["net"] += val
                    global_income += val
                else:
                    project_stats[pid]["total_expense"] += val
                    project_stats[pid]["net"] -= val
                    global_expense += val
                    if cat_key:
                        category_totals["todos"][cat_key] += val
                        category_totals[comp_str][cat_key] += val
                    
                if m_key not in monthly_stats:
                    monthly_stats[m_key] = {
                        "year": year_val,
                        "month": month_val,
                        "periodo": m_key,
                        "ingreso": Decimal(0),
                        "egreso": Decimal(0),
                        "neto": Decimal(0)
                    }
                    
                if is_income:
                    monthly_stats[m_key]["ingreso"] += val
                    monthly_stats[m_key]["neto"] += val
                else:
                    monthly_stats[m_key]["egreso"] += val
                    monthly_stats[m_key]["neto"] -= val

        # Format Monthly Data
        sorted_months = sorted(monthly_stats.values(), key=lambda x: (x["year"], x["month"]))
        formatted_monthly = []
        for m in sorted_months:
            formatted_monthly.append({
                "periodo": m["periodo"],
                "ingreso": float(m["ingreso"]),
                "egreso": float(m["egreso"]),
                "neto": float(m["neto"])
            })
            
        # Format Project Data
        formatted_projects = []
        for pid, stats in project_stats.items():
            formatted_projects.append({
                "id": stats["id"],
                "name": stats["name"],
                "client_name": stats["client_name"],
                "company": stats["company"],
                "total_income": float(stats["total_income"]),
                "total_expense": float(stats["total_expense"]),
                "net": float(stats["net"])
            })
            
        # Sort projects by net descending
        formatted_projects.sort(key=lambda x: x["net"], reverse=True)
        
        # Format Category Totals
        formatted_category_totals = {}
        for comp, totals in category_totals.items():
            formatted_category_totals[comp] = {k: float(v) for k, v in totals.items()}
        
        return {
            "globalStats": {
                "total_income": float(global_income),
                "total_expense": float(global_expense),
                "net": float(global_income - global_expense),
                "active_projects": len(projects)
            },
            "category_totals": formatted_category_totals,
            "monthlyData": formatted_monthly,
            "projects": formatted_projects
        }
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}
