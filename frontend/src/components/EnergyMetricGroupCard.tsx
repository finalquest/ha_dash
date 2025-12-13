import { useEffect, useMemo, useRef, useState } from 'react';
import type { EntityHistoryPoint, MetricGroup, MetricType } from '../api/types';
import { useMetricGroupState } from '../hooks/useMetricGroups';
import { useEntityHistory } from '../hooks/useEntityHistory';

const METRIC_ORDER: MetricType[] = ['power', 'voltage', 'current'];
const metricLabels: Record<MetricType, string> = {
  power: 'Potencia',
  voltage: 'Voltaje',
  current: 'Corriente',
};

interface NormalizedHistoryPoint {
  timestamp: number;
  value: number;
  date: Date;
  unit?: string;
}

const parseNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeHistory = (points: EntityHistoryPoint[] = []): NormalizedHistoryPoint[] =>
  points
    .map((point) => {
      const numericValue = typeof point.value === 'number' ? point.value : parseNumber(point.state);
      const timestamp = typeof point.timestamp === 'number' ? point.timestamp : Number(point.timestamp);
      const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date(point.timestamp);
      return {
        timestamp: date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : Number.NaN,
        value: typeof numericValue === 'number' ? numericValue : Number.NaN,
        date,
        unit: point.unit,
      };
    })
    .filter((entry) => Number.isFinite(entry.timestamp) && Number.isFinite(entry.value))
    .sort((a, b) => a.timestamp - b.timestamp);

const LEFT_MARGIN = 40;
const RIGHT_MARGIN = 20;
const TOP_MARGIN = 30;
const BOTTOM_MARGIN = 30;
const CHART_HEIGHT = 160;

const buildLinePoints = (values: number[], width: number) => {
  if (!values.length) return null;
  const chartValues = values.length === 1 ? [values[0], values[0]] : values;

  const availableWidth = Math.max(width - LEFT_MARGIN - RIGHT_MARGIN, 1);
  const graphTop = TOP_MARGIN;
  const graphBottom = CHART_HEIGHT - BOTTOM_MARGIN;
  const graphHeight = graphBottom - graphTop;

  const maxValue = Math.max(...chartValues);
  const minValue = Math.min(...chartValues);
  const range = Math.max(maxValue - minValue, 1);
  const denominator = Math.max(chartValues.length - 1, 1);

  return chartValues
    .map((value, index) => {
      const x = LEFT_MARGIN + (index / denominator) * availableWidth;
      const normalized = (value - minValue) / range;
      const y = graphBottom - normalized * graphHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
};

const buildYAxisValues = (values: number[]) => {
  if (!values.length) {
    return Array(5).fill(0);
  }

  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.1;
  const range = max - min;
  if (range <= 0) {
    return Array(5).fill(min);
  }

  return [0, 1, 2, 3, 4].map((index) => min + range * (1 - index / 4));
};

const defaultTimeAxis = () => [
  { label: '-3h', ratio: 0 },
  { label: '-2h', ratio: 0.33 },
  { label: '-1h', ratio: 0.66 },
  { label: 'Ahora', ratio: 1 },
];

const formatTimeTick = (date: Date, opts: { isEnd?: boolean } = {}) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  if (opts.isEnd) {
    const diffMinutes = Math.abs((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 15) {
      return 'Ahora';
    }
  }

  try {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

const buildTimeLabels = (history: NormalizedHistoryPoint[]) => {
  if (!history.length) {
    return defaultTimeAxis();
  }

  const dated = history.filter((point) => point.date instanceof Date && !Number.isNaN(point.date.getTime()));
  if (dated.length < 2) {
    const label = dated[0] ? formatTimeTick(dated[0].date) : '-3h';
    return [
      { label, ratio: 0 },
      { label: 'Ahora', ratio: 1 },
    ];
  }

  const start = dated[0].date;
  const end = dated[dated.length - 1].date;
  const duration = end.getTime() - start.getTime();

  if (!Number.isFinite(duration) || duration <= 0) {
    return defaultTimeAxis();
  }

  const ratios = [0, 0.33, 0.66, 1];
  return ratios.map((ratio, index) => ({
    label: formatTimeTick(new Date(start.getTime() + duration * ratio), { isEnd: index === ratios.length - 1 }),
    ratio,
  }));
};

const formatMetricValue = (metric?: { value: string | null; unit?: string }) => {
  if (!metric || metric.value === null || metric.value === undefined) {
    return '—';
  }
  const numeric = Number(metric.value);
  const formatted = Number.isFinite(numeric) ? numeric.toFixed(metric.unit === 'A' ? 2 : 1) : metric.value;
  return metric.unit ? `${formatted} ${metric.unit}` : formatted;
};

const formatAxisValue = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

interface PowerChartProps {
  values: number[];
  unit?: string;
  labels: { label: string; ratio: number }[];
  yAxis: number[];
}

const PowerTrendChart = ({ values, unit, labels, yAxis }: PowerChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(400);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width) {
        setChartWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!values.length) {
    return <div className="power-chart power-chart--empty">Sin datos históricos</div>;
  }

  const axisValues = yAxis.length === 5 ? yAxis : Array(5).fill(0);
  const timeAxis = labels.length ? labels : defaultTimeAxis();
  const availableWidth = Math.max(chartWidth - LEFT_MARGIN - RIGHT_MARGIN, 1);
  const linePoints = buildLinePoints(values, chartWidth);

  return (
    <div className="power-chart" ref={containerRef}>
      <svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const verticalSpacing = (CHART_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN) / 4;
          const yPos = TOP_MARGIN + index * verticalSpacing;
          const value = axisValues[index] || 0;
          return (
            <g key={`axis-${index}`}>
              <line
                x1={LEFT_MARGIN}
                y1={yPos}
                x2={chartWidth - RIGHT_MARGIN}
                y2={yPos}
                stroke="#374151"
                strokeWidth="0.5"
              />
              <text x={LEFT_MARGIN - 5} y={yPos + 4} fill="#9CA3AF" fontSize="9" textAnchor="end">
                {formatAxisValue(value)}{unit ? unit : ''}
              </text>
            </g>
          );
        })}

        {linePoints && <polyline points={linePoints} fill="none" stroke="#3B82F6" strokeWidth="2" />}

        {timeAxis.map(({ label, ratio }, index) => {
          const x = LEFT_MARGIN + Math.min(Math.max(ratio, 0), 1) * availableWidth;
          return (
            <text key={`time-${index}`} x={x} y={CHART_HEIGHT - 10} fill="#9CA3AF" fontSize="9" textAnchor="middle">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

interface Props {
  group: MetricGroup;
  isFavorite?: boolean;
  onToggleFavorite?: (group: MetricGroup) => void;
  favoriteDisabled?: boolean;
}

export const EnergyMetricGroupCard = ({
  group,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled,
}: Props) => {
  const { data, isLoading, isError, error } = useMetricGroupState(group.id);
  const powerEntityId = group.metrics.power?.entityId;

  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErrorMessage,
  } = useEntityHistory(powerEntityId, { hours: 6, intervalMinutes: 5 }, { enabled: Boolean(powerEntityId) });

  const energyMetrics = useMemo(() => data?.metrics ?? {}, [data]);
  const historySeries = useMemo(
    () => normalizeHistory(historyData?.points ?? []),
    [historyData?.points],
  );

  const fallbackValue = parseNumber(data?.metrics.power?.value ?? null);
  const chartValues = historySeries.length
    ? historySeries.map((point) => point.value)
    : typeof fallbackValue === 'number'
      ? [fallbackValue]
      : [];

  const yAxisValues = useMemo(() => buildYAxisValues(chartValues), [chartValues]);
  const timeLabels = useMemo(() => buildTimeLabels(historySeries), [historySeries]);
  const historyUnit = historySeries.find((point) => point.unit)?.unit ?? data?.metrics.power?.unit;

  return (
    <article className="energy-metric-card energy-card energy-card--power">
      <div className="power-card__header">
        <div>
          <h3>{group.name}</h3>
          {group.areaId && <p className="energy-metric-card__area">Área: {group.areaId}</p>}
        </div>
        <div className="energy-card__actions">
          {isLoading && <span className="tag">Actualizando…</span>}
          {onToggleFavorite && (
            <button
              className={`favorite-btn${isFavorite ? ' favorite-btn--active' : ''}`}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              type="button"
              onClick={() => onToggleFavorite(group)}
              aria-pressed={isFavorite}
              disabled={favoriteDisabled}
            >
              {isFavorite ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      {isError && (
        <p className="energy-metric-card__error">
          {(error as Error | undefined)?.message || 'No pudimos obtener el estado del grupo.'}
        </p>
      )}

      {!isError && (
        <div className="power-metrics">
          {METRIC_ORDER.map((metricType) => {
            const metric = energyMetrics[metricType];
            const updatedAt = formatTimestamp(metric?.lastChanged);
            return (
              <div key={metricType} className="metric-value-block">
                <p className="metric-label">{metricLabels[metricType]}</p>
                <p className="metric-value">{formatMetricValue(metric)}</p>
                {updatedAt && <p className="metric-updated">Actualizado {updatedAt}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="power-chart__wrapper">
        {historyLoading ? (
          <div className="power-chart power-chart--loading">
            <p>Cargando datos históricos...</p>
          </div>
        ) : historyError ? (
          <p className="history-error">
            {(historyErrorMessage as Error | undefined)?.message || 'Sin datos históricos'}
          </p>
        ) : (
          <PowerTrendChart values={chartValues} unit={historyUnit} labels={timeLabels} yAxis={yAxisValues} />
        )}
      </div>
    </article>
  );
};
