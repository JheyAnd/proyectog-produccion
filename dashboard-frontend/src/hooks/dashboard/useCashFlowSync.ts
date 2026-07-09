import { useState, useMemo, useEffect } from 'react';
import { useEgresosCategorias, monthLabelToKey, REAL_PAGOS_MENSUALES } from '@/data/excelCategoriasEgresos';

// ── Datos base de fallback (cuando CashFlowPage aún no ha guardado datos) ──
const cashFlowEntries_PATIO_SUR = [
  { id: '1',  period_label: 'Oct 2025', projected_income: 0,            projected_expense: 0,            actual_income: 0,            actual_expense: 0 },
  { id: '2',  period_label: 'Nov 2025', projected_income: 0,            projected_expense: 0,            actual_income: 0,            actual_expense: 0 },
  { id: '3',  period_label: 'Dic 2025', projected_income: 0,            projected_expense: 117756762,    actual_income: 0,            actual_expense: 117756762 },
  { id: '4',  period_label: 'Ene 2026', projected_income: 0,            projected_expense: 0,            actual_income: 0,            actual_expense: 0 },
  { id: '5',  period_label: 'Feb 2026', projected_income: 16745324700,  projected_expense: 7551845375,   actual_income: 16745324700,  actual_expense: 7551845375 },
  { id: '6',  period_label: 'Mar 2026', projected_income: 0,            projected_expense: 1654214247,   actual_income: 0,            actual_expense: 1654214247 },
  { id: '7',  period_label: 'Abr 2026', projected_income: 0,            projected_expense: 2089492704,   actual_income: 0,            actual_expense: 393226447 },
  { id: '8',  period_label: 'May 2026', projected_income: 0,            projected_expense: 2291365898,   actual_income: 0,            actual_expense: 0 },
  { id: '9',  period_label: 'Jun 2026', projected_income: 0,            projected_expense: 2255074670,   actual_income: 0,            actual_expense: 0 },
  { id: '10', period_label: 'Jul 2026', projected_income: 0,            projected_expense: 1653312805,   actual_income: 0,            actual_expense: 0 },
  { id: '11', period_label: 'Ago 2026', projected_income: 0,            projected_expense: 1718048404,   actual_income: 0,            actual_expense: 0 },
  { id: '12', period_label: 'Sep 2026', projected_income: 41012884481,  projected_expense: 25030151475,  actual_income: 0,            actual_expense: 0 },
  { id: '13', period_label: 'Oct 2026', projected_income: 0,            projected_expense: 0,            actual_income: 0,            actual_expense: 0 },
];

export type ChartDataPoint = {
  period: string;
  income: number;
  expense: number;
  net: number;
  accumulated: number;
  paid?: number;
};

// ── Estrategia: leer chartData pre-calculado por CashFlowPage (fuente única de verdad).
// Si CashFlowPage todavía no ha guardado datos, calcular localmente como fallback.
export function useCashFlowSync(projectId: string = 'patio-sur-oe1035') {
  const LS_CHARTDATA_KEY = `${projectId}_cashflow_chartdata`;

  // Estado: chartData pre-computado por CashFlowPage
  const [savedChartData, setSavedChartData] = useState<ChartDataPoint[] | null>(() => {
    try {
      const raw = localStorage.getItem(LS_CHARTDATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  // ── Fallback: variables para el cálculo propio cuando no hay datos guardados ──
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loanScenarios, setLoanScenarios] = useState<any[]>([]);
  const [creditParams, setCreditParams] = useState<any>({
    desembolso: 0, // ✅ CORREGIDO: 0 por defecto para proyectos genéricos; se carga desde prefs
    tasaIbr: 10.531,
    spreadPorcentaje: 2.85,
    gmfPorcentaje: 0.395,
    comisionPorcentaje: 1.1,
    mesesCredito: 12,
  });
  const [egresosCategorias] = useEgresosCategorias(projectId);

  const LS_INCOMES_KEY       = `${projectId}_cashflow_incomes`;
  const LS_CREDIT_KEY        = `${projectId}_cashflow_credit`;
  const LS_LOAN_SCENARIOS_KEY = `${projectId}_loan_scenarios`;

  useEffect(() => {
    const loadAll = async () => {
      try {
        // ── PRIORIDAD 1: chartData publicado por CashFlowPage ──
        const rawChart = localStorage.getItem(LS_CHARTDATA_KEY);
        if (rawChart) {
          setSavedChartData(JSON.parse(rawChart));
          return; // Ya tenemos los datos exactos, no necesitamos recalcular
        }

        // ── PRIORIDAD 2: Fallback — cargar parámetros y recalcular ──
        setSavedChartData(null);

        const loadKey = async (key: string) => {
          const prefKey = `${projectId}_${key}`;
          const res = await fetch(`/api/v1/preferences/${prefKey}`).then(r => r.ok ? r.json() : null).catch(() => null);
          if (res) return res;
          // Legacy fallback
          return fetch(`/api/v1/preferences/${key}`).then(r => r.ok ? r.json() : null).catch(() => null);
        };

        const incomesData = await loadKey('incomes') || (() => {
          try {
            const s = localStorage.getItem(LS_INCOMES_KEY)
              || (projectId === 'patio-sur-oe1035' ? localStorage.getItem('patio_sur_cashflow_incomes') : null);
            return s ? JSON.parse(s) : [];
          } catch { return []; }
        })();
        setIncomes(incomesData);

        const scenariosData = await loadKey('loan_scenarios') || (() => {
          try {
            const s = localStorage.getItem(LS_LOAN_SCENARIOS_KEY)
              || (projectId === 'patio-sur-oe1035' ? localStorage.getItem('patio_sur_cashflow_loan_scenarios') : null);
            return s ? JSON.parse(s) : [];
          } catch { return []; }
        })();
        setLoanScenarios(scenariosData.map((s: any) => ({ ...s, es_proyectado: s.es_proyectado ?? false })));

        const creditData = await loadKey('credit_params') || (() => {
          try {
            const s = localStorage.getItem(LS_CREDIT_KEY)
              || (projectId === 'patio-sur-oe1035' ? localStorage.getItem('patio_sur_cashflow_credit') : null);
            return s ? JSON.parse(s) : null;
          } catch { return null; }
        })();
        if (creditData) setCreditParams({ ...creditParams, ...creditData });

      } catch (e) {
        console.error('useCashFlowSync: error loading data', e);
      }
    };

    loadAll();

    // Escuchar cambios desde localStorage (otra pestaña) y evento personalizado (misma pestaña)
    window.addEventListener('storage', loadAll);
    window.addEventListener('cashflow_chartdata_updated', loadAll);
    return () => {
      window.removeEventListener('storage', loadAll);
      window.removeEventListener('cashflow_chartdata_updated', loadAll);
    };
  }, [LS_CHARTDATA_KEY, LS_INCOMES_KEY, LS_CREDIT_KEY, LS_LOAN_SCENARIOS_KEY, projectId]);

  // ── FALLBACK: calcScenario idéntico a CashFlowPage.tsx ──
  const calcScenario = (s: any) => {
    const tasaFinal = (s.tasaIbr !== undefined ? s.tasaIbr : 10.531) + (s.spreadPorcentaje !== undefined ? s.spreadPorcentaje : 2.85);
    const gmf = s.desembolso * (s.gmfPorcentaje / 100);
    const comision = s.desembolso * (s.comisionPorcentaje / 100);
    const ingresoNeto = s.desembolso - gmf - comision;
    const tasaMensual = Math.pow(1 + tasaFinal / 100, 1 / 12) - 1;
    const interesesTrimestral = s.desembolso * (Math.pow(1 + tasaMensual, 3) - 1);
    const totalIntereses = interesesTrimestral * Math.floor(s.mesesCredito / 3);
    return { gmf, comision, ingresoNeto, interesesTrimestral, totalIntereses };
  };

  const ingresoRealCalculado = useMemo(() => {
    const gmf = creditParams.desembolso * (creditParams.gmfPorcentaje / 100);
    const comision = creditParams.desembolso * (creditParams.comisionPorcentaje / 100);
    const ingresoNeto = creditParams.desembolso - gmf - comision;
    const tasaFinal = (creditParams.tasaIbr || 10.531) + (creditParams.spreadPorcentaje || 2.85);
    const tasaMensual = Math.pow(1 + tasaFinal / 100, 1 / 12) - 1;
    const interesesTrimestral = creditParams.desembolso * (Math.pow(1 + tasaMensual, 3) - 1);
    const totalIntereses = interesesTrimestral * Math.floor((creditParams.mesesCredito || 12) / 3);
    return { ingresoReal: ingresoNeto, totalIntereses };
  }, [creditParams]);

  const mainIncomeMonth = useMemo(() => {
    const feb = incomes.find(i => i.id === 'ING-FEB');
    return feb?.incomeMonth || 'Feb 2026';
  }, [incomes]);

  // ── FALLBACK: cálculo propio (idéntico a CashFlowPage) ──
  const fallbackChartData = useMemo((): ChartDataPoint[] => {
    let cumulativeOperational = 0;
    const fallbackEntries = projectId === 'patio-sur-oe1035' ? cashFlowEntries_PATIO_SUR : [];

    return fallbackEntries.map((e) => {
      const key = monthLabelToKey(e.period_label);

      const expenseMaterials = egresosCategorias.filter(c => c.grupo === 'materiales').reduce((s, c) => s + (c.valores[key] || 0), 0);
      const expenseLabor     = egresosCategorias.filter(c => c.grupo === 'mano_obra').reduce((s, c) => s + (c.valores[key] || 0), 0);
      const expenseAdmin     = egresosCategorias.filter(c => c.grupo === 'administracion').reduce((s, c) => s + (c.valores[key] || 0), 0);
      const projExpense      = expenseMaterials + expenseLabor + expenseAdmin;

      const tableIncome = egresosCategorias.filter(c => (c.grupo as string) === 'ingreso' || (c.grupo as string) === 'INGRESO').reduce((s, c) => s + (c.valores[key] || 0), 0);
      const isMatrixIncomeActive = egresosCategorias.filter(c => (c.grupo as string) === 'ingreso' || (c.grupo as string) === 'INGRESO').some(c => Object.values(c.valores).some(v => v > 0));
      const realExpense = REAL_PAGOS_MENSUALES[key] || 0;

      const clientIncome = isMatrixIncomeActive
        ? tableIncome
        : (e.actual_income > 0 ? e.actual_income : (e.projected_income || 0));

      const isMainBankMonth = e.period_label === mainIncomeMonth;
      const bankIncomeBase = (isMainBankMonth && !creditParams.es_proyectado) ? ingresoRealCalculado.ingresoReal : 0;
      const bankIncomeScenarios = loanScenarios
        .filter(sc => sc.fechaDesembolso === e.period_label && !sc.es_proyectado)
        .reduce((s, sc) => s + calcScenario(sc).ingresoNeto, 0);
      const bankIncome = bankIncomeBase + bankIncomeScenarios;

      const capitalIncome = incomes
        .filter(inc => {
          if (!inc.scenarioDate || inc.monto <= 0) return false;
          const [, mm, yyyy] = inc.scenarioDate.split('/').map(Number);
          const abbr = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
          return `${abbr[mm-1]} ${yyyy}` === e.period_label;
        })
        .reduce((s, inc) => s + inc.monto, 0);

      const INTEREST_MONTHS = ['Mar 2026', 'Jun 2026', 'Sep 2026'];
      const baseInterest = (INTEREST_MONTHS.includes(e.period_label) && !creditParams.es_proyectado) 
        ? ingresoRealCalculado.totalIntereses / 3 
        : 0;
      const scenarioInterests = loanScenarios.reduce((sum, sc) => {
        if (sc.es_proyectado) return sum;
        const calc = calcScenario(sc);
        return sum + (INTEREST_MONTHS.includes(e.period_label) ? calc.totalIntereses / 3 : 0);
      }, 0);
      const totalBankInterests = baseInterest + scenarioInterests;

      const opIncome  = clientIncome;
      const opExpense = expenseMaterials + expenseLabor + expenseAdmin;
      const opNet     = opIncome - opExpense;
      cumulativeOperational += opNet;

      const effectiveExpense = (projExpense || e.projected_expense) + totalBankInterests;
      const effectiveIncome  = clientIncome + bankIncome + capitalIncome;
      void realExpense; // usado en otros contextos

      return {
        period:      e.period_label,
        income:      opIncome,
        expense:     opExpense,
        net:         opNet,
        accumulated: cumulativeOperational,
        paid:        realExpense,
      };
    });
  }, [egresosCategorias, incomes, loanScenarios, ingresoRealCalculado, mainIncomeMonth]);

  // ── Resultado final: datos de CashFlowPage si existen, fallback si no ──
  const baseChartData = savedChartData ?? fallbackChartData;
  const chartData = useMemo(() => {
    return baseChartData.map(d => {
       const key = monthLabelToKey(d.period);
       const paid = REAL_PAGOS_MENSUALES[key] || 0;
       return { ...d, paid };
    });
  }, [baseChartData]);

  return { chartData };
}
