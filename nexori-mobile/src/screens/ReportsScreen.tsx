import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { designTokens, getColorWithOpacity } from '../utils/tw';
import { AnimatedTabScreen } from '../components/AnimatedTabScreen';
import minuteService from '../services/minute.service';
import bikeService from '../services/bike.service';
import panicService from '../services/panic.service';

const { colors, shadows } = designTokens;

// ── Period helpers ─────────────────────────────────────────────────────────────

type Period = 'month' | 'lastMonth' | 'quarter' | 'year';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month',     label: 'Este mes'     },
  { value: 'lastMonth', label: 'Mes anterior'  },
  { value: 'quarter',   label: 'Últimos 3 m.'  },
  { value: 'year',      label: 'Este año'      },
];

const getPeriodRange = (period: Period): { start: Date; end: Date; label: string } => {
  const now = new Date();
  switch (period) {
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
        label: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      };
    case 'lastMonth': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start: lm,
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        label: lm.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      };
    }
    case 'quarter': {
      const s = new Date(now);
      s.setMonth(s.getMonth() - 3);
      return { start: s, end: now, label: 'Últimos 3 meses' };
    }
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
        label: `Año ${now.getFullYear()}`,
      };
  }
};

const isInPeriod = (dateStr: string | undefined, start: Date, end: Date): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
};

const getTopN = (arr: string[], n = 5): { name: string; count: number }[] => {
  const counts: Record<string, number> = {};
  arr.forEach(item => { if (item) counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
};

// ── Category maps ──────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  anotacion: '#8B5CF6',      hurto: '#EF4444',
  novedad_vehiculo: '#F59E0B', objetos_abandonados: '#6366F1',
  novedad: '#3B82F6',        observacion: '#10B981',
  recomendacion: '#14B8A6',  nueva_marca: '#EC4899',
  incidente: '#F97316',      emergencia: '#DC2626',
  mantenimiento: '#64748B',  persona_sospechosa: '#7C3AED',
};
const CAT_LABELS: Record<string, string> = {
  anotacion: 'Anotación',        hurto: 'Hurto',
  novedad_vehiculo: 'Nov. Vehículo', objetos_abandonados: 'Obj. Abandonados',
  novedad: 'Novedad',            observacion: 'Observación',
  recomendacion: 'Recomendación', nueva_marca: 'Nueva Marca',
  incidente: 'Incidente',        emergencia: 'Emergencia',
  mantenimiento: 'Mantenimiento', persona_sospechosa: 'Pers. Sospechosa',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const HBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={{ height: 7, borderRadius: 4, backgroundColor: getColorWithOpacity(color, 0.15), overflow: 'hidden' }}>
      <View style={{ height: 7, borderRadius: 4, backgroundColor: color, width: `${pct}%` }} />
    </View>
  );
};

const KpiCard: React.FC<{ icon: any; label: string; value: string | number; color: string; sub?: string }> = ({ icon, label, value, color, sub }) => (
  <View style={[{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginHorizontal: 4, overflow: 'hidden' }, shadows.sm]}>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: color }} />
    <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: getColorWithOpacity(color, 0.12) }}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.8, lineHeight: 28 }}>{value}</Text>
    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary, marginTop: 3 }}>{label}</Text>
    {sub ? <Text style={{ fontSize: 10, color: colors.text.disabled, marginTop: 2 }}>{sub}</Text> : null}
  </View>
);

const SectionHeader: React.FC<{ icon: any; title: string; color: string; badge?: number }> = ({ icon, title, color, badge }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
    <View style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: getColorWithOpacity(color, 0.15), marginRight: 10 }}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1 }}>{title}</Text>
    {badge !== undefined && (
      <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, backgroundColor: getColorWithOpacity(color, 0.12) }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color }}>{badge}</Text>
      </View>
    )}
  </View>
);

const InsightText: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: getColorWithOpacity(color, 0.07), borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: color }}>
    <Ionicons name="analytics-outline" size={14} color={color} style={{ marginTop: 1, marginRight: 8 }} />
    <Text style={{ flex: 1, fontSize: 12.5, color: colors.text.secondary, lineHeight: 18 }}>{text}</Text>
  </View>
);

const DividerLabel: React.FC<{ label: string }> = ({ label }) => (
  <View style={{ marginTop: 16, marginBottom: 10 }}>
    <View style={{ height: 1, backgroundColor: colors.border.light, marginBottom: 12 }} />
    <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.text.secondary, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</Text>
  </View>
);

const StatRow: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => (
  <View style={{ marginBottom: 10 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
      <Text style={{ fontSize: 13, color: colors.text.primary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color }}>{value}</Text>
    </View>
    <HBar value={value} max={total} color={color} />
  </View>
);

const RankedRow: React.FC<{ index: number; name: string; count: number; max: number; color: string }> = ({ index, name, count, max, color }) => (
  <View style={{ marginBottom: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: getColorWithOpacity(color, 0.15) }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color }}>{index + 1}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color }}>{count}</Text>
    </View>
    <HBar value={count} max={max} color={color} />
  </View>
);

const StatusStrip: React.FC<{ items: { label: string; value: number; color: string }[] }> = ({ items }) => (
  <View style={{ flexDirection: 'row', marginBottom: 14, gap: 8 }}>
    {items.map((s, i) => (
      <View key={i} style={{ flex: 1, backgroundColor: getColorWithOpacity(s.color, 0.1), borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: s.color, letterSpacing: -0.5 }}>{s.value}</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: s.color, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
      </View>
    ))}
  </View>
);

const CatChip: React.FC<{ name: string; count: number; color: string }> = ({ name, count, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 6, marginBottom: 6, backgroundColor: getColorWithOpacity(color, 0.12) }}>
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 5 }} />
    <Text style={{ fontSize: 11, fontWeight: '600', color }}>{name}</Text>
    <Text style={{ fontSize: 11, fontWeight: '800', color, marginLeft: 4 }}>{count}</Text>
  </View>
);

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const [period, setPeriod]           = useState<Period>('month');
  const [bikes, setBikes]             = useState<any[]>([]);
  const [minutes, setMinutes]         = useState<any[]>([]);
  const [panicEvents, setPanicEvents] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [bikeRes, minuteRes, panicRes] = await Promise.all([
        bikeService.getAll({}),
        minuteService.getAll({ limit: 10000 }),
        panicService.getAllEvents(),
      ]);
      if (bikeRes)                              setBikes(bikeRes);
      if (minuteRes?.success && minuteRes.data) setMinutes(minuteRes.data.minutes ?? []);
      if (panicRes?.success && panicRes.data)   setPanicEvents(panicRes.data);
    } catch (e) {
      console.error('Reports load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const { start, end, label: periodLabel } = useMemo(() => getPeriodRange(period), [period]);

  // ── Bikes analysis ───────────────────────────────────────────────────────────
  const bikeReport = useMemo(() => {
    const inside      = bikes.filter(b => b.status === 'inside').length;
    const outside     = bikes.filter(b => b.status === 'outside').length;
    const insidePct   = bikes.length > 0 ? Math.round((inside / bikes.length) * 100) : 0;
    const newInPeriod = bikes.filter(b => isInPeriod(b.createdAt, start, end)).length;
    const checkIns    = bikes.filter(b => isInPeriod(b.lastCheckIn, start, end)).length;
    const checkOuts   = bikes.filter(b => isInPeriod(b.lastCheckOut, start, end)).length;
    const topOwners   = getTopN(bikes.map(b => b.ownerName));
    const topBrands   = getTopN(bikes.map(b => b.brand));
    return { total: bikes.length, inside, outside, insidePct, newInPeriod, checkIns, checkOuts, topOwners, topBrands };
  }, [bikes, start, end]);

  // ── Panic analysis ───────────────────────────────────────────────────────────
  const panicReport = useMemo(() => {
    const inPeriod = panicEvents.filter(p => isInPeriod(p.timestamp, start, end));
    const active   = inPeriod.filter(p => p.status === 'active').length;
    const attended = inPeriod.filter(p => p.status === 'attended').length;
    const resolved = inPeriod.filter(p => p.status === 'resolved').length;

    const withResp = inPeriod.filter(p => p.attendedAt && p.timestamp);
    let avgResp = '--';
    if (withResp.length > 0) {
      const totalMs = withResp.reduce((s, p) =>
        s + (new Date(p.attendedAt).getTime() - new Date(p.timestamp).getTime()), 0);
      const mins = Math.round(totalMs / withResp.length / 60000);
      avgResp = mins > 0 ? `${mins} min` : '< 1 min';
    }

    const topActivators = getTopN(inPeriod.map(p => p.userName));
    const resolvedPct   = inPeriod.length > 0 ? Math.round((resolved / inPeriod.length) * 100) : 0;
    return { total: inPeriod.length, active, attended, resolved, resolvedPct, avgResp, topActivators };
  }, [panicEvents, start, end]);

  // ── Minutes analysis ─────────────────────────────────────────────────────────
  const minuteReport = useMemo(() => {
    const inPeriod = minutes.filter(m => isInPeriod(m.createdAt ?? m.date, start, end));
    const pending  = inPeriod.filter(m => m.status === 'pending').length;
    const reviewed = inPeriod.filter(m => m.status === 'reviewed').length;
    const closed   = inPeriod.filter(m => m.status === 'closed').length;
    const high     = inPeriod.filter(m => m.priority === 'high').length;
    const medium   = inPeriod.filter(m => m.priority === 'medium').length;
    const low      = inPeriod.filter(m => m.priority === 'low').length;

    const catCounts: Record<string, number> = {};
    inPeriod.forEach(m => {
      const key = m.category ?? m.type ?? 'otro';
      catCounts[key] = (catCounts[key] || 0) + 1;
    });
    const byCategory = Object.entries(catCounts)
      .map(([key, count]) => ({ key, name: CAT_LABELS[key] ?? key, count, color: CAT_COLORS[key] ?? '#64748B' }))
      .sort((a, b) => b.count - a.count);

    const topReporters = getTopN(inPeriod.map(m => m.reportedByName ?? m.createdBy ?? ''));
    return { total: inPeriod.length, pending, reviewed, closed, high, medium, low, byCategory, topReporters };
  }, [minutes, start, end]);

  // ── Narrative insights ───────────────────────────────────────────────────────
  const bikeInsight = bikeReport.total === 0
    ? 'Sin bicicletas registradas aún.'
    : `${bikeReport.total} bicicletas registradas · ${bikeReport.inside} dentro actualmente (${bikeReport.insidePct}%) · ${bikeReport.outside} fuera. En ${periodLabel}: ${bikeReport.checkIns} ingresos y ${bikeReport.checkOuts} salidas.`;

  const panicInsight = panicReport.total === 0
    ? `Sin alertas de pánico en ${periodLabel}.`
    : `${panicReport.total} alertas · ${panicReport.resolved} resueltas (${panicReport.resolvedPct}%)${panicReport.avgResp !== '--' ? ` · T. respuesta: ${panicReport.avgResp}` : ''}.`;

  const minuteInsight = minuteReport.total === 0
    ? `Sin minutas registradas en ${periodLabel}.`
    : `${minuteReport.total} minutas · categoría principal: "${minuteReport.byCategory[0]?.name ?? '—'}" (${minuteReport.byCategory[0]?.count ?? 0}) · ${minuteReport.pending} pendientes.`;

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AnimatedTabScreen>
        <>
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }} edges={['top']}>
            <View style={{ flex: 1, backgroundColor: '#F1F3F8', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={{ marginTop: 14, fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>
                Generando reporte…
              </Text>
            </View>
          </SafeAreaView>
        </>
      </AnimatedTabScreen>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <AnimatedTabScreen>
      <>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }} edges={['top']}>
          <View style={{ flex: 1, backgroundColor: '#F1F3F8' }}>

            {/* ── HEADER ── */}
            <View style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 20,
              paddingTop: Platform.OS === 'android' ? 12 : 6,
              paddingBottom: 18,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Ionicons name="bar-chart" size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: colors.surface, letterSpacing: -0.5 }}>
                  Centro de Reportes
                </Text>
                <TouchableOpacity
                  onPress={() => loadData(true)}
                  disabled={refreshing}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: getColorWithOpacity(colors.surface, 0.12),
                  }}
                  activeOpacity={0.7}
                >
                  {refreshing
                    ? <ActivityIndicator size="small" color={colors.surface} />
                    : <Ionicons name="refresh" size={18} color={colors.surface} />}
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: getColorWithOpacity(colors.surface, 0.55), marginBottom: 14 }}>
                {periodLabel}
              </Text>

              {/* Period pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
                {PERIODS.map(p => {
                  const active = period === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setPeriod(p.value)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: active ? colors.accent : getColorWithOpacity(colors.surface, 0.12),
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: active ? colors.primary : getColorWithOpacity(colors.surface, 0.75),
                      }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── CONTENT ── */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadData(true)}
                  tintColor={colors.accent}
                  colors={[colors.accent]}
                />
              }
            >
              {/* ── EXEC SUMMARY KPIs ── */}
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <KpiCard
                  icon="bicycle"
                  label="Bicicletas"
                  value={bikeReport.total}
                  color={colors.accent}
                  sub={`${bikeReport.inside} dentro · ${bikeReport.insidePct}%`}
                />
                <KpiCard
                  icon="alert-circle"
                  label="Alertas Pánico"
                  value={panicReport.total}
                  color={colors.status.error}
                  sub={`${panicReport.resolved} resueltas`}
                />
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <KpiCard
                  icon="document-text"
                  label="Minutas"
                  value={minuteReport.total}
                  color={colors.status.success}
                  sub={`${minuteReport.pending} pendientes`}
                />
                <KpiCard
                  icon="time"
                  label="T. Respuesta"
                  value={panicReport.avgResp}
                  color={colors.status.info}
                  sub="promedio pánico"
                />
              </View>

              {/* ══════════════ BICICLETAS ══════════════ */}
              <View style={[{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 14 }, shadows.md]}>
                <SectionHeader icon="bicycle" title="Bicicletas" color={colors.accent} badge={bikeReport.total} />
                <InsightText text={bikeInsight} color={colors.accent} />

                {/* Estado actual */}
                <StatusStrip items={[
                  { label: 'Total',        value: bikeReport.total,   color: colors.accent          },
                  { label: 'Dentro',       value: bikeReport.inside,  color: colors.status.success  },
                  { label: 'Fuera',        value: bikeReport.outside, color: colors.status.warning  },
                ]} />

                {/* Movimientos */}
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.text.secondary, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
                  Movimientos · {periodLabel}
                </Text>
                <StatRow label="Ingresos" value={bikeReport.checkIns}  total={Math.max(bikeReport.checkIns, bikeReport.checkOuts, 1)} color={colors.status.success} />
                <StatRow label="Salidas"  value={bikeReport.checkOuts} total={Math.max(bikeReport.checkIns, bikeReport.checkOuts, 1)} color={colors.status.info}    />

                {/* Top propietarios */}
                {bikeReport.topOwners.length > 0 && (
                  <>
                    <DividerLabel label="Top Propietarios" />
                    {bikeReport.topOwners.map((o, i) => (
                      <RankedRow key={i} index={i} name={o.name} count={o.count} max={bikeReport.topOwners[0].count} color={colors.accent} />
                    ))}
                  </>
                )}

                {/* Marcas populares */}
                {bikeReport.topBrands.length > 0 && (
                  <>
                    <DividerLabel label="Marcas Populares" />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {bikeReport.topBrands.map((b, i) => (
                        <CatChip key={i} name={b.name} count={b.count} color={getColorWithOpacity(colors.accent, 1)} />
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* ══════════════ PÁNICO ══════════════ */}
              <View style={[{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 14 }, shadows.md]}>
                <SectionHeader icon="shield" title="Alertas de Pánico" color={colors.status.error} badge={panicReport.total} />
                <InsightText text={panicInsight} color={colors.status.error} />

                {/* Estado */}
                <StatusStrip items={[
                  { label: 'Activas',   value: panicReport.active,   color: colors.status.error   },
                  { label: 'Atendidas', value: panicReport.attended, color: colors.status.warning  },
                  { label: 'Resueltas', value: panicReport.resolved, color: colors.status.success  },
                ]} />

                {/* Tasa de resolución */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <View style={{ flex: 1, backgroundColor: getColorWithOpacity(colors.status.success, 0.08), borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tasa resolución</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: colors.status.success, marginTop: 4 }}>{panicReport.resolvedPct}%</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: getColorWithOpacity(colors.status.info, 0.08), borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>T. respuesta</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: colors.status.info, marginTop: 4 }}>{panicReport.avgResp}</Text>
                  </View>
                </View>

                {/* Top activadores */}
                {panicReport.topActivators.length > 0 && (
                  <>
                    <DividerLabel label="Top Activadores" />
                    {panicReport.topActivators.map((a, i) => (
                      <RankedRow key={i} index={i} name={a.name} count={a.count} max={panicReport.topActivators[0].count} color={colors.status.error} />
                    ))}
                  </>
                )}
              </View>

              {/* ══════════════ MINUTAS ══════════════ */}
              <View style={[{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 14 }, shadows.md]}>
                <SectionHeader icon="document-text" title="Minutas" color={colors.status.success} badge={minuteReport.total} />
                <InsightText text={minuteInsight} color={colors.status.success} />

                {/* Estado */}
                <StatusStrip items={[
                  { label: 'Pendientes', value: minuteReport.pending,  color: colors.status.warning },
                  { label: 'Revisadas',  value: minuteReport.reviewed, color: colors.status.info    },
                  { label: 'Cerradas',   value: minuteReport.closed,   color: colors.status.success  },
                ]} />

                {/* Prioridades */}
                <DividerLabel label="Distribución por Prioridad" />
                <StatRow label="Alta prioridad"  value={minuteReport.high}   total={Math.max(minuteReport.total, 1)} color={colors.status.error}   />
                <StatRow label="Media prioridad" value={minuteReport.medium} total={Math.max(minuteReport.total, 1)} color={colors.status.warning} />
                <StatRow label="Baja prioridad"  value={minuteReport.low}    total={Math.max(minuteReport.total, 1)} color={colors.status.success} />

                {/* Categorías */}
                {minuteReport.byCategory.length > 0 && (
                  <>
                    <DividerLabel label="Por Categoría" />
                    {minuteReport.byCategory.slice(0, 6).map((c, i) => (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color, marginRight: 8 }} />
                          <Text style={{ flex: 1, fontSize: 13, color: colors.text.primary }}>{c.name}</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: c.color }}>{c.count}</Text>
                        </View>
                        <HBar value={c.count} max={minuteReport.byCategory[0].count} color={c.color} />
                      </View>
                    ))}
                    {minuteReport.byCategory.length > 6 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                        {minuteReport.byCategory.slice(6).map((c, i) => (
                          <CatChip key={i} name={c.name} count={c.count} color={c.color} />
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* Top reportadores */}
                {minuteReport.topReporters.length > 0 && (
                  <>
                    <DividerLabel label="Top Reportadores" />
                    {minuteReport.topReporters.map((r, i) => (
                      <RankedRow key={i} index={i} name={r.name} count={r.count} max={minuteReport.topReporters[0].count} color={colors.status.success} />
                    ))}
                  </>
                )}
              </View>

              {/* ── FOOTER ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                <Ionicons name="time-outline" size={12} color={colors.text.disabled} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 11, color: colors.text.disabled }}>
                  {new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

            </ScrollView>
          </View>
        </SafeAreaView>
      </>
    </AnimatedTabScreen>
  );
}
