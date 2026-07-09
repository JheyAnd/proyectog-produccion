"""
Simulation and Forecasting Engine for Project Schedules (EVM methodology).
Agnostic to the project, runs in memory (Sandbox environment).
"""

from typing import Dict, List, Optional
from datetime import date as dt_date
from pydantic import BaseModel, Field

# --- Pydantic Schemas for Input JSON ---

class ProjectMetadata(BaseModel):
    project_id: str
    name: str
    start_date: dt_date
    end_date: dt_date
    control_unit: str
    total_value_cop: Optional[float] = None

class Period(BaseModel):
    index: int
    label: str
    date: dt_date

class BaselineProgress(BaseModel):
    period_index: int
    planned_progress: float = Field(..., ge=0.0, le=1.0)  # Cumulative planned progress (0.0 to 1.0)

class ActivityInput(BaseModel):
    activity_id: str
    name: str
    weight: float = Field(..., gt=0.0, le=1.0)  # Relative weight (Wi)
    start_date: dt_date
    end_date: dt_date
    actual_progress: float = Field(..., ge=0.0, le=1.0)  # Actual progress today (0.0 to 1.0)
    baseline_progress_distribution: List[BaselineProgress]

class UniversalScheduleInput(BaseModel):
    project_metadata: ProjectMetadata
    periods: List[Period]
    activities: List[ActivityInput]

# --- Pydantic Schemas for Simulation Output ---

class PeriodCalculation(BaseModel):
    period_index: int
    label: str
    date: dt_date
    planned_progress_cum: float  # AP_T (Cumulative Planned Progress of project)
    real_progress_cum: float     # AR_T (Cumulative Real/Projected Progress of project)
    spi: float                   # SPI at this period

class SimulationResult(BaseModel):
    project_id: str
    current_period_index: int
    spi_global: float
    periods: List[PeriodCalculation]

# --- Core Simulation Engine Class ---

class SimulationEngine:
    """
    Simulation Engine that runs EVM calculations and S-Curve projections.
    Fully sandbox-based, runs calculations in memory.
    """
    def __init__(self, schedule_data: UniversalScheduleInput):
        self.metadata = schedule_data.project_metadata
        self.periods = sorted(schedule_data.periods, key=lambda p: p.index)
        self.original_activities = schedule_data.activities
        
        # Verify and normalize weights to guarantee they sum to 1.0 (clamping float inaccuracies)
        total_weight = sum(act.weight for act in self.original_activities)
        if not (0.99 <= total_weight <= 1.01):
            raise ValueError(f"La suma de los pesos de las actividades debe ser 1.0 (actual: {total_weight})")
        
        # Internal normalized dictionary of activities for faster lookup
        self.activities_map = {act.activity_id: act for act in self.original_activities}
        self.total_weight_scale = total_weight

    def run_simulation(
        self, 
        current_period_index: int, 
        custom_progress: Optional[Dict[str, float]] = None
    ) -> SimulationResult:
        """
        Runs the S-curve calculation and projections for the project.
        
        :param current_period_index: The period index of the cut-off date (T_corte).
        :param custom_progress: Optional dictionary of delta modifications (sandbox) e.g., {"act-001": 0.85}.
        :return: SimulationResult containing the planned and real/projected curves.
        """
        # Step 1: Apply sandbox overrides in memory
        simulated_activities = []
        for act in self.original_activities:
            override_progress = act.actual_progress
            if custom_progress and act.activity_id in custom_progress:
                override_progress = custom_progress[act.activity_id]
                # Clamp override progress between 0.0 and 1.0
                override_progress = max(0.0, min(override_progress, 1.0))
            
            simulated_activities.append({
                "activity_id": act.activity_id,
                "weight": act.weight / self.total_weight_scale,  # Ensure perfect normalization
                "actual_progress": override_progress,
                "baseline_map": {bp.period_index: bp.planned_progress for bp in act.baseline_progress_distribution}
            })

        # Step 2: Calculate baseline planned progress for each period (AP_T)
        ap_by_period = {}
        for p in self.periods:
            ap_sum = 0.0
            for act in simulated_activities:
                planned = act["baseline_map"].get(p.index, 0.0)
                ap_sum += act["weight"] * planned
            ap_by_period[p.index] = ap_sum

        # Step 3: Compute SPI at current cut-off period
        ap_corte = ap_by_period.get(current_period_index, 0.0)
        ar_corte = sum(act["weight"] * act["actual_progress"] for act in simulated_activities)
        
        spi_global = 1.0
        if ap_corte > 0:
            spi_global = ar_corte / ap_corte
            # Reasonable clamping for SPI values to avoid division by zero or infinite trends
            spi_global = max(0.0, min(spi_global, 5.0))

        # Step 4: Compute S-curve values for all periods (History + Future Projection)
        period_calculations = []
        for p in self.periods:
            ap_t = ap_by_period[p.index]
            ar_t_sum = 0.0

            for act in simulated_activities:
                planned_t = act["baseline_map"].get(p.index, 0.0)
                planned_corte = act["baseline_map"].get(current_period_index, 0.0)
                actual_prog = act["actual_progress"]

                if p.index < current_period_index:
                    # Historical Period (T < T_corte) -> Proportional distribution
                    if planned_corte > 0:
                        real_t = actual_prog * (planned_t / planned_corte)
                    else:
                        real_t = 0.0
                    # Clamp real historical progress between 0.0 and actual_progress
                    real_t = max(0.0, min(real_t, actual_prog))
                
                elif p.index == current_period_index:
                    # Cut-off Period (T == T_corte) -> Real actual progress
                    real_t = actual_prog
                
                else:
                    # Future Period (T > T_corte) -> Forecasting with SPI and Clamping
                    projected = actual_prog + (planned_t - planned_corte) * spi_global
                    # Apply clamping: upper limit 1.0 (saturate) and lower limit actual_progress (monotonicity)
                    real_t = max(actual_prog, min(projected, 1.0))

                ar_t_sum += act["weight"] * real_t

            # Calculate SPI at period T
            spi_t = 1.0
            if ap_t > 0:
                spi_t = ar_t_sum / ap_t
                spi_t = max(0.0, min(spi_t, 5.0))

            period_calculations.append(
                PeriodCalculation(
                    period_index=p.index,
                    label=p.label,
                    date=p.date,
                    planned_progress_cum=round(ap_t, 4),
                    real_progress_cum=round(ar_t_sum, 4),
                    spi=round(spi_t, 4)
                )
            )

        return SimulationResult(
            project_id=self.metadata.project_id,
            current_period_index=current_period_index,
            spi_global=round(spi_global, 4),
            periods=period_calculations
        )
