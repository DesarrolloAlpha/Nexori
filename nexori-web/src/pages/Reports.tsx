import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Bike, AlertTriangle, FileText, Users,
  RefreshCw, Calendar, Clock, Activity,
  Shield, BarChart3, Target,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type { Bike as BikeType, PanicEvent, User } from '@/types';
import type { Minute } from '@/types/minute';
import Loading from '@/components/common/Loading';
import ToastContainer from '@/components/common/ToastContainer';
import { useToast } from '@/hooks/useToast';
import './Reports.css';

// ── Constantes ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'month',     label: 'Este mes'        },
  { value: 'lastMonth', label: 'Mes anterior'    },
  { value: 'quarter',   label: 'Últimos 3 meses' },
  { value: 'year',      label: 'Este año'        },
] as const;

type Period = typeof PERIOD_OPTIONS[number]['value'];

const CAT_COLORS: Record<string, string> = {
  anotacion:           '#8B5CF6',
  hurto:               '#EF4444',
  novedad_vehiculo:    '#F59E0B',
  objetos_abandonados: '#6366F1',
  novedad:             '#3B82F6',
  observacion:         '#10B981',
  recomendacion:       '#14B8A6',
  nueva_marca:         '#EC4899',
  incidente:           '#F97316',
  emergencia:          '#DC2626',
  mantenimiento:       '#64748B',
  persona_sospechosa:  '#7C3AED',
};

const CAT_LABELS: Record<string, string> = {
  anotacion:           'Anotación',
  hurto:               'Hurto',
  novedad_vehiculo:    'Nov. Vehículo',
  objetos_abandonados: 'Obj. Abandonados',
  novedad:             'Novedad',
  observacion:         'Observación',
  recomendacion:       'Recomendación',
  nueva_marca:         'Nueva Marca',
  incidente:           'Incidente',
  emergencia:          'Emergencia',
  mantenimiento:       'Mantenimiento',
  persona_sospechosa:  'Pers. Sospechosa',
};

// ── Helpers de período ────────────────────────────────────────────────────────

const getPeriodRange = (period: Period): { start: Date; end: Date; label: string } => {
  const now = new Date();
  switch (period) {
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now, label: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) };
    }
    case 'lastMonth': {
      const lm   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start: lm, end, label: lm.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) };
    }
    case 'quarter': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return { start, end: now, label: 'Últimos 3 meses' };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now, label: `Año ${now.getFullYear()}` };
    }
  }
};

const isInPeriod = (dateStr: string | undefined, start: Date, end: Date): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
};

const getGranularity = (start: Date, end: Date): 'day' | 'week' | 'month' => {
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days <= 35)  return 'day';
  if (days <= 100) return 'week';
  return 'month';
};

interface TSPoint { label: string; value: number }

const generateTimeSeries = (dates: string[], start: Date, end: Date): TSPoint[] => {
  const g = getGranularity(start, end);
  const result: TSPoint[] = [];

  if (g === 'day') {
    const cur = new Date(start); cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end); endDay.setHours(23, 59, 59, 999);
    while (cur <= endDay) {
      const dayStr = cur.toISOString().slice(0, 10);
      result.push({
        label: cur.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        value: dates.filter(d => d.startsWith(dayStr)).length,
      });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (g === 'week') {
    const cur = new Date(start);
    let w = 1;
    while (cur <= end) {
      const wStart = new Date(cur);
      const wEnd   = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
      if (wEnd > end) wEnd.setTime(end.getTime());
      result.push({
        label: `Sem. ${w}`,
        value: dates.filter(d => { const dt = new Date(d); return dt >= wStart && dt <= wEnd; }).length,
      });
      cur.setDate(cur.getDate() + 7);
      w++;
    }
  } else {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
      result.push({
        label: cur.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        value: dates.filter(d => { const dt = new Date(d); return dt >= cur && dt <= mEnd; }).length,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return result;
};

const getTopN = (arr: string[], n = 5): { name: string; count: number }[] => {
  const counts: Record<string, number> = {};
  arr.forEach(item => { if (item) counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
};

const avgMinsBetween = (pairs: [string | undefined, string][]): number => {
  const diffs = pairs
    .filter(([a]) => !!a)
    .map(([a, b]) => (new Date(a!).getTime() - new Date(b).getTime()) / 60_000)
    .filter(d => d > 0);
  if (!diffs.length) return 0;
  return Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
};

// ── Tooltip personalizado ─────────────────────────────────────────────────────

const ReportTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rpt-tooltip">
      <div className="rpt-tt-label">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="rpt-tt-row">
          <span className="rpt-tt-dot" style={{ background: p.color || p.fill }} />
          <span className="rpt-tt-name">{p.name}:</span>
          <span className="rpt-tt-val">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Sub-componentes reutilizables ─────────────────────────────────────────────

const MiniKpi: React.FC<{ value: string | number; label: string; color?: string }> = ({ value, label, color }) => (
  <div className="rpt-mini-kpi">
    <span className="rpt-mk-val" style={color ? { color } : undefined}>{value}</span>
    <span className="rpt-mk-label">{label}</span>
  </div>
);

interface PieLegendProps { items: { name: string; value: number; color: string }[]; compact?: boolean }
const PieLegend: React.FC<PieLegendProps> = ({ items, compact }) => (
  <div className={`rpt-pie-legend${compact ? ' compact' : ''}`}>
    {items.map((item, i) => (
      <div key={i} className="rpt-pli">
        <span className="rpt-pli-dot" style={{ background: item.color }} />
        <span className="rpt-pli-name">{item.name}</span>
        <span className="rpt-pli-val">{item.value}</span>
      </div>
    ))}
  </div>
);

const NoData: React.FC<{ icon?: React.ReactNode; text?: string }> = ({ icon, text = 'Sin datos en este período' }) => (
  <div className="rpt-no-data">
    {icon ?? <BarChart3 size={28} />}
    <p>{text}</p>
  </div>
);

// ── Componente principal ───────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const [period,      setPeriod]      = useState<Period>('month');
  const [bikes,       setBikes]       = useState<BikeType[]>([]);
  const [panicEvents, setPanicEvents] = useState<PanicEvent[]>([]);
  const [minutes,     setMinutes]     = useState<Minute[]>([]);
  const [users,       setUsers]       = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const { toasts, removeToast } = useToast();

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [b, p, m, u] = await Promise.all([
        apiService.getBikes(),
        apiService.getPanicEvents(),
        apiService.getMinutes(),
        apiService.getUsers(),
      ]);
      setBikes(b); setPanicEvents(p); setMinutes(m); setUsers(u);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Rango del período ──────────────────────────────────────────────────────
  const { start, end, label: periodLabel } = useMemo(() => getPeriodRange(period), [period]);

  // ── Datos de Bicicletas ────────────────────────────────────────────────────
  const bikeReport = useMemo(() => {
    const inPeriod  = bikes.filter(b => isInPeriod(b.createdAt,   start, end));
    const withCIn   = bikes.filter(b => isInPeriod(b.lastCheckIn,  start, end));
    const withCOut  = bikes.filter(b => isInPeriod(b.lastCheckOut, start, end));
    const inside      = bikes.filter(b => b.status === 'inside').length;
    const outside     = bikes.filter(b => b.status === 'outside').length;
    const maintenance = bikes.filter(b => b.status === 'maintenance').length;

    const movDates = [
      ...withCIn.map(b => b.lastCheckIn!),
      ...withCOut.map(b => b.lastCheckOut!),
    ];

    return {
      total: bikes.length,
      inPeriod: inPeriod.length,
      checkIns: withCIn.length,
      checkOuts: withCOut.length,
      inside, outside, maintenance,
      regSeries: generateTimeSeries(inPeriod.map(b => b.createdAt), start, end),
      movSeries: generateTimeSeries(movDates, start, end),
      topOwners: getTopN(bikes.map(b => b.ownerName)),
      statusPie: [
        { name: 'Dentro',  value: inside,   color: '#10B981' },
        { name: 'Fuera',   value: outside,  color: '#3B82F6' },
      ].filter(i => i.value > 0),
    };
  }, [bikes, start, end]);

  // ── Datos de Pánico ────────────────────────────────────────────────────────
  const panicReport = useMemo(() => {
    const inPeriod = panicEvents.filter(p => isInPeriod(p.timestamp, start, end));
    const active   = inPeriod.filter(p => p.status === 'active').length;
    const attended = inPeriod.filter(p => p.status === 'attended').length;
    const resolved = inPeriod.filter(p => p.status === 'resolved').length;
    const avgResp  = avgMinsBetween(inPeriod.map(p => [p.attendedAt, p.timestamp]));

    return {
      total: inPeriod.length,
      active, attended, resolved, avgResp,
      timeSeries: generateTimeSeries(inPeriod.map(p => p.timestamp), start, end),
      topActivators: getTopN(inPeriod.map(p => p.userName)),
      statusPie: [
        { name: 'Activa',    value: active,   color: '#EF4444' },
        { name: 'Atendida',  value: attended, color: '#F59E0B' },
        { name: 'Resuelta',  value: resolved, color: '#10B981' },
      ].filter(i => i.value > 0),
    };
  }, [panicEvents, start, end]);

  // ── Datos de Minutas ───────────────────────────────────────────────────────
  const minuteReport = useMemo(() => {
    const inPeriod = minutes.filter(m => isInPeriod(m.createdAt, start, end));
    const pending  = inPeriod.filter(m => m.status === 'pending').length;
    const reviewed = inPeriod.filter(m => m.status === 'reviewed').length;
    const closed   = inPeriod.filter(m => m.status === 'closed').length;

    const catCounts: Record<string, number> = {};
    inPeriod.forEach(m => { catCounts[m.type] = (catCounts[m.type] || 0) + 1; });

    const byCategory = Object.entries(catCounts)
      .map(([type, value]) => ({
        name: CAT_LABELS[type] || type,
        type, value,
        color: CAT_COLORS[type] || '#64748B',
      }))
      .sort((a, b) => b.value - a.value);

    return {
      total: inPeriod.length,
      pending, reviewed, closed,
      topCategory: byCategory[0] ?? null,
      timeSeries:   generateTimeSeries(inPeriod.map(m => m.createdAt), start, end),
      byCategory,
      topReporters: getTopN(inPeriod.map(m => m.reportedByName)),
      statusPie: [
        { name: 'Pendiente', value: pending,  color: '#F59E0B' },
        { name: 'Revisada',  value: reviewed, color: '#3B82F6' },
        { name: 'Cerrada',   value: closed,   color: '#10B981' },
      ].filter(i => i.value > 0),
      priorityPie: [
        { name: 'Alta',  value: inPeriod.filter(m => m.priority === 'high').length,   color: '#EF4444' },
        { name: 'Media', value: inPeriod.filter(m => m.priority === 'medium').length, color: '#F59E0B' },
        { name: 'Baja',  value: inPeriod.filter(m => m.priority === 'low').length,    color: '#10B981' },
      ].filter(i => i.value > 0),
    };
  }, [minutes, start, end]);

  const userSummary = useMemo(() => ({
    total:  users.length,
    active: users.filter(u => u.isActive).length,
  }), [users]);

  if (loading) return <Loading fullScreen message="Generando reporte..." />;

  // ── Textos narrativos ──────────────────────────────────────────────────────
  const insidePct = bikeReport.total > 0 ? Math.round((bikeReport.inside / bikeReport.total) * 100) : 0;
  const bikeInsight = `Durante ${periodLabel} se registraron ${bikeReport.inPeriod} bicicletas nuevas y se procesaron ${bikeReport.checkIns + bikeReport.checkOuts} movimientos (${bikeReport.checkIns} ingresos · ${bikeReport.checkOuts} salidas). En total hay ${bikeReport.total} bicicletas registradas: ${bikeReport.inside} actualmente dentro (${insidePct}%) y ${bikeReport.outside} fuera del parqueadero.`;

  const panicInsight = panicReport.total === 0
    ? `No se registraron alertas de pánico durante ${periodLabel}.`
    : `Se activaron ${panicReport.total} alertas de pánico durante ${periodLabel}. ${panicReport.resolved} fueron resueltas (${Math.round((panicReport.resolved / panicReport.total) * 100)}%)${panicReport.avgResp > 0 ? ` con un tiempo promedio de respuesta de ${panicReport.avgResp} min` : ''}${panicReport.high > 0 ? `. Se atendieron ${panicReport.high} alertas de alta prioridad` : ''}.`;

  const minuteInsight = minuteReport.total === 0
    ? `No se crearon minutas durante ${periodLabel}.`
    : `Se registraron ${minuteReport.total} minutas durante ${periodLabel}${minuteReport.topCategory ? ` — la categoría más frecuente fue "${minuteReport.topCategory.name}" con ${minuteReport.topCategory.value} registros (${Math.round((minuteReport.topCategory.value / minuteReport.total) * 100)}%)` : ''}. ${minuteReport.pending} permanecen pendientes de revisión.`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rpt-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ── HEADER ── */}
      <div className="rpt-header">
        <div className="rpt-title-group">
          <h1>Centro de Reportes</h1>
          <p>Análisis integral de la operación · {periodLabel}</p>
        </div>
        <div className="rpt-controls">
          <div className="rpt-period-selector">
            <Calendar size={14} />
            <select value={period} onChange={e => setPeriod(e.target.value as Period)}>
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button className="rpt-btn-refresh" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'rpt-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── RESUMEN EJECUTIVO ── */}
      <div className="rpt-exec-grid">
        <div className="rpt-exec-card bikes">
          <div className="rpt-exec-icon"><Bike size={22} /></div>
          <div className="rpt-exec-body">
            <div className="rpt-exec-num">{bikeReport.total}</div>
            <div className="rpt-exec-name">Bicicletas</div>
            <div className="rpt-exec-sub">+{bikeReport.inPeriod} nuevas este período</div>
          </div>
        </div>
        <div className="rpt-exec-card panic">
          <div className="rpt-exec-icon"><Shield size={22} /></div>
          <div className="rpt-exec-body">
            <div className="rpt-exec-num">{panicReport.total}</div>
            <div className="rpt-exec-name">Alertas de Pánico</div>
            <div className="rpt-exec-sub">{panicReport.resolved} resueltas · {panicReport.active} activas</div>
          </div>
        </div>
        <div className="rpt-exec-card minutes">
          <div className="rpt-exec-icon"><FileText size={22} /></div>
          <div className="rpt-exec-body">
            <div className="rpt-exec-num">{minuteReport.total}</div>
            <div className="rpt-exec-name">Minutas Creadas</div>
            <div className="rpt-exec-sub">{minuteReport.pending} pendientes · {minuteReport.closed} cerradas</div>
          </div>
        </div>
        <div className="rpt-exec-card users">
          <div className="rpt-exec-icon"><Users size={22} /></div>
          <div className="rpt-exec-body">
            <div className="rpt-exec-num">{userSummary.active}</div>
            <div className="rpt-exec-name">Usuarios Activos</div>
            <div className="rpt-exec-sub">{userSummary.total} registrados en total</div>
          </div>
        </div>
      </div>

      {/* ════════════════════ BICICLETAS ════════════════════ */}
      <section className="rpt-section">
        <div className="rpt-section-header bikes-header">
          <Bike size={18} />
          <span>Bicicletas</span>
        </div>

        <div className="rpt-insight bikes-insight">
          <Activity size={15} />
          <p>{bikeInsight}</p>
        </div>

        <div className="rpt-mini-row">
          <MiniKpi value={bikeReport.total}    label="Total registradas" />
          <MiniKpi value={bikeReport.inPeriod} label="Nuevas (período)"  />
          <MiniKpi value={bikeReport.checkIns} label="Ingresos"          color="#10B981" />
          <MiniKpi value={bikeReport.checkOuts} label="Salidas"          color="#3B82F6" />
          <MiniKpi value={bikeReport.inside}   label="Dentro ahora"      color="#10B981" />
          <MiniKpi value={bikeReport.outside}  label="Fuera ahora"       color="#F59E0B" />
          <MiniKpi value={`${insidePct}%`}     label="% dentro"          color="#10B981" />
        </div>

        {/* Fila 1: Area chart + Donut */}
        <div className="rpt-charts-2">
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Registros de Bicicletas en el Tiempo</h4>
              <span className="rpt-badge bikes">{bikeReport.inPeriod} registros</span>
            </div>
            <div className="rpt-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bikeReport.regSeries} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gBike" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ReportTooltip />} />
                  <Area type="monotone" dataKey="value" name="Registros" stroke="#2563EB" strokeWidth={2}
                    fill="url(#gBike)" dot={false} activeDot={{ r: 4, fill: '#2563EB' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Estado Actual del Parqueadero</h4>
              <span className="rpt-badge bikes">{bikeReport.total} total</span>
            </div>
            <div className="rpt-chart-body rpt-pie-body">
              {bikeReport.statusPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={195}>
                    <PieChart>
                      <Pie data={bikeReport.statusPie} cx="50%" cy="50%"
                        innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                        {bikeReport.statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ReportTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend items={bikeReport.statusPie} />
                </>
              ) : <NoData icon={<Bike size={28} />} />}
            </div>
          </div>
        </div>

        {/* Fila 2: Movimientos área + Top owners */}
        <div className="rpt-charts-2">
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Movimientos (Ingresos + Salidas)</h4>
              <span className="rpt-badge bikes">{bikeReport.checkIns + bikeReport.checkOuts} mov.</span>
            </div>
            <div className="rpt-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bikeReport.movSeries} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gMov" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0EA5E9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ReportTooltip />} />
                  <Area type="monotone" dataKey="value" name="Movimientos" stroke="#0EA5E9" strokeWidth={2}
                    fill="url(#gMov)" dot={false} activeDot={{ r: 4, fill: '#0EA5E9' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Top Propietarios por Bicicletas</h4>
              <span className="rpt-badge bikes">Top {bikeReport.topOwners.length}</span>
            </div>
            <div className="rpt-chart-body">
              {bikeReport.topOwners.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bikeReport.topOwners} layout="vertical"
                    margin={{ top: 4, right: 30, left: 10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={115} />
                    <Tooltip content={<ReportTooltip />} />
                    <Bar dataKey="count" name="Bicicletas" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData />}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ PÁNICO ════════════════════ */}
      <section className="rpt-section">
        <div className="rpt-section-header panic-header">
          <Shield size={18} />
          <span>Alertas de Pánico</span>
        </div>

        <div className="rpt-insight panic-insight">
          <AlertTriangle size={15} />
          <p>{panicInsight}</p>
        </div>

        <div className="rpt-mini-row">
          <MiniKpi value={panicReport.total}    label="Total alertas" />
          <MiniKpi value={panicReport.active}   label="Activas"       color="#EF4444" />
          <MiniKpi value={panicReport.attended} label="Atendidas"     color="#F59E0B" />
          <MiniKpi value={panicReport.resolved} label="Resueltas"     color="#10B981" />
          <MiniKpi value={panicReport.avgResp > 0 ? `${panicReport.avgResp} min` : '—'} label="Tiempo resp. prom." />
        </div>

        <div className="rpt-charts-2">
          {/* Bar vertical: activaciones */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Activaciones de Pánico en el Tiempo</h4>
              <span className="rpt-badge panic">{panicReport.total} alertas</span>
            </div>
            <div className="rpt-chart-body">
              {panicReport.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={panicReport.timeSeries} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ReportTooltip />} />
                    <Bar dataKey="value" name="Alertas" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData icon={<Shield size={28} />} text="Sin alertas en este período" />}
            </div>
          </div>

          {/* Donut: estados */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Distribución por Estado</h4>
            </div>
            <div className="rpt-chart-body rpt-pie-body">
              {panicReport.statusPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={195}>
                    <PieChart>
                      <Pie data={panicReport.statusPie} cx="50%" cy="50%"
                        innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                        {panicReport.statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ReportTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend items={panicReport.statusPie} />
                </>
              ) : <NoData icon={<Shield size={28} />} text="Sin alertas" />}
            </div>
          </div>
        </div>

        <div className="rpt-charts-2">
          {/* Top activadores — ocupa todo el ancho */}
          <div className="rpt-card" style={{ gridColumn: '1 / -1' }}>
            <div className="rpt-card-header">
              <h4>Top Usuarios que más Activan</h4>
              <span className="rpt-badge panic">Top {panicReport.topActivators.length || '—'}</span>
            </div>
            <div className="rpt-chart-body">
              {panicReport.topActivators.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={panicReport.topActivators} layout="vertical"
                    margin={{ top: 4, right: 30, left: 10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={115} />
                    <Tooltip content={<ReportTooltip />} />
                    <Bar dataKey="count" name="Activaciones" fill="#EF4444" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData icon={<Shield size={28} />} text="Sin datos" />}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ MINUTAS ════════════════════ */}
      <section className="rpt-section">
        <div className="rpt-section-header minutes-header">
          <FileText size={18} />
          <span>Minutas</span>
        </div>

        <div className="rpt-insight minutes-insight">
          <Target size={15} />
          <p>{minuteInsight}</p>
        </div>

        <div className="rpt-mini-row">
          <MiniKpi value={minuteReport.total}    label="Total minutas" />
          <MiniKpi value={minuteReport.pending}  label="Pendientes"    color="#F59E0B" />
          <MiniKpi value={minuteReport.reviewed} label="Revisadas"     color="#3B82F6" />
          <MiniKpi value={minuteReport.closed}   label="Cerradas"      color="#10B981" />
          <MiniKpi value={minuteReport.byCategory.length} label="Categorías"  />
          <MiniKpi value={minuteReport.topCategory?.name ?? '—'} label="Cat. frecuente" />
        </div>

        {/* Fila 1: área + donut estado */}
        <div className="rpt-charts-2">
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Minutas Registradas en el Tiempo</h4>
              <span className="rpt-badge minutes">{minuteReport.total} minutas</span>
            </div>
            <div className="rpt-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={minuteReport.timeSeries} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gMin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10B981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ReportTooltip />} />
                  <Area type="monotone" dataKey="value" name="Minutas" stroke="#10B981" strokeWidth={2}
                    fill="url(#gMin)" dot={false} activeDot={{ r: 4, fill: '#10B981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Distribución por Estado</h4>
            </div>
            <div className="rpt-chart-body rpt-pie-body">
              {minuteReport.statusPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={195}>
                    <PieChart>
                      <Pie data={minuteReport.statusPie} cx="50%" cy="50%"
                        innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                        {minuteReport.statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ReportTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend items={minuteReport.statusPie} />
                </>
              ) : <NoData icon={<FileText size={28} />} text="Sin minutas" />}
            </div>
          </div>
        </div>

        {/* Fila 2: ranking categorías + donut prioridad */}
        <div className="rpt-charts-2">
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Ranking de Categorías</h4>
              <span className="rpt-badge minutes">Top {Math.min(minuteReport.byCategory.length, 8)}</span>
            </div>
            <div className="rpt-chart-body rpt-chart-body-tall">
              {minuteReport.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={minuteReport.byCategory.slice(0, 8)} layout="vertical"
                    margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={115} />
                    <Tooltip content={<ReportTooltip />} />
                    <Bar dataKey="value" name="Minutas" radius={[0, 6, 6, 0]} barSize={22}>
                      {minuteReport.byCategory.slice(0, 8).map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData icon={<FileText size={28} />} text="Sin minutas" />}
            </div>
          </div>

          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Distribución por Categoría</h4>
              <span className="rpt-badge minutes">{minuteReport.byCategory.length} tipos</span>
            </div>
            <div className="rpt-chart-body rpt-pie-body rpt-pie-body-tall">
              {minuteReport.byCategory.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={195}>
                    <PieChart>
                      <Pie data={minuteReport.byCategory} cx="50%" cy="50%"
                        innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {minuteReport.byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ReportTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend items={minuteReport.byCategory.slice(0, 8)} compact />
                </>
              ) : <NoData icon={<FileText size={28} />} text="Sin minutas" />}
            </div>
          </div>
        </div>

        {/* Fila 3: prioridad + top reportadores */}
        <div className="rpt-charts-2">
          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Minutas por Prioridad</h4>
            </div>
            <div className="rpt-chart-body rpt-pie-body">
              {minuteReport.priorityPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={195}>
                    <PieChart>
                      <Pie data={minuteReport.priorityPie} cx="50%" cy="50%"
                        innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                        {minuteReport.priorityPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ReportTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend items={minuteReport.priorityPie} />
                </>
              ) : <NoData icon={<FileText size={28} />} text="Sin minutas" />}
            </div>
          </div>

          <div className="rpt-card">
            <div className="rpt-card-header">
              <h4>Top Reportadores</h4>
              <span className="rpt-badge minutes">Top {minuteReport.topReporters.length || '—'}</span>
            </div>
            <div className="rpt-chart-body">
              {minuteReport.topReporters.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={minuteReport.topReporters} layout="vertical"
                    margin={{ top: 4, right: 30, left: 10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={130} />
                    <Tooltip content={<ReportTooltip />} />
                    <Bar dataKey="count" name="Minutas" fill="#10B981" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData icon={<FileText size={28} />} text="Sin datos" />}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <div className="rpt-footer">
        <Clock size={13} />
        <span>
          Reporte generado el {new Date().toLocaleString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })} · Período: {periodLabel}
        </span>
      </div>
    </div>
  );
};

export default Reports;
