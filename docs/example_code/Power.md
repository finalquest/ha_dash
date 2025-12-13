```import { useEffect, useState } from 'react'
import { LightningIcon, StarIcon } from './Icons'

function normalizeHistory(list = []) {
  return list
    .map((point) => {
      const timestamp = point?.timestamp || point?.last_changed
      return {
        ...point,
        value: parseNumber(point?.value),
        timestamp,
        date: parseTimestamp(timestamp)
      }
    })
    .filter((point) => typeof point.value === 'number' && Number.isFinite(point.value))
    .sort((a, b) => {
      const aTime = a.date instanceof Date ? a.date.getTime() : 0
      const bTime = b.date instanceof Date ? b.date.getTime() : 0
      return aTime - bTime
    })
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function parseTimestamp(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getEntityNumericValue(entity) {
  if (!entity) return null
  if (typeof entity.state_value === 'number' && Number.isFinite(entity.state_value)) {
    return entity.state_value
  }
  return parseNumber(entity.state)
}

function formatMetricValue(entity, precision, suffix) {
  const numeric = getEntityNumericValue(entity)
  if (numeric === null || Number.isNaN(numeric)) return '—'
  const rounded = numeric.toFixed(precision)
  return suffix ? `${rounded} ${suffix}` : rounded
}

function buildLinePoints(values) {
  if (!values || values.length === 0) return null
  if (values.length === 1) {
    values = [values[0], values[0]]
  }

  const containerWidth = 400
  const leftMarginPx = 40
  const rightMarginPx = 20
  const availableWidth = containerWidth - leftMarginPx - rightMarginPx
  const graphTop = 20
  const graphBottom = 100
  const graphHeight = graphBottom - graphTop

  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)
  const range = Math.max(maxValue - minValue, 1)
  const denominator = Math.max(values.length - 1, 1)

  return values
    .map((height, index) => {
      const x = leftMarginPx + (index / denominator) * availableWidth
      const normalized = (height - minValue) / range
      const y = graphBottom - normalized * graphHeight
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function buildYAxisValues(values) {
  if (!values || values.length === 0) {
    return Array(5).fill(0)
  }

  const min = Math.min(...values) * 0.9
  const max = Math.max(...values) * 1.1
  const range = max - min

  if (range <= 0) {
    return Array(5).fill(min)
  }

  return [0, 1, 2, 3, 4].map((index) => min + range * (1 - index / 4))
}

function defaultTimeAxis() {
  return [
    { label: '-3h', ratio: 0 },
    { label: '-2h', ratio: 0.33 },
    { label: '-1h', ratio: 0.66 },
    { label: 'Ahora', ratio: 1 }
  ]
}

function formatAxisValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.round(value)
}

function formatTimeTick(date, { isEnd = false } = {}) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  if (isEnd) {
    const diffMinutes = Math.abs((Date.now() - date.getTime()) / 60000)
    if (diffMinutes < 15) {
      return 'Ahora'
    }
  }

  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (_err) {
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${hours}:${minutes}`
  }
}

function buildTimeLabels(history) {
  if (!history || history.length === 0) {
    return defaultTimeAxis()
  }

  const dated = history.filter((point) => point.date instanceof Date)
  if (dated.length < 2) {
    const label = dated[0] ? formatTimeTick(dated[0].date) : '-3h'
    return [
      { label, ratio: 0 },
      { label: 'Ahora', ratio: 1 }
    ]
  }

  const start = dated[0].date
  const end = dated[dated.length - 1].date
  const duration = end.getTime() - start.getTime()

  if (!Number.isFinite(duration) || duration <= 0) {
    return defaultTimeAxis()
  }

  const ratios = [0, 0.33, 0.66, 1]
  return ratios.map((ratio, index) => {
    const tickTime = new Date(start.getTime() + duration * ratio)
    return {
      label: formatTimeTick(tickTime, { isEnd: index === ratios.length - 1 }),
      ratio
    }
  })
}

export default function PowerCard({
  group,
  apiBase,
  onToggleEnergy,
  onToggleDashboard,
  actionsEnabled = true
}) {
  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function fetchHistory() {
      setHistoryError(null)
      setHistoryLoading(true)
      try {
        const response = await fetch(
          `${apiBase}/api/energy/power/${encodeURIComponent(group.sensor_base)}/history`,
          { signal: controller.signal }
        )
        if (!response.ok) throw new Error('history_failed')
        const payload = await response.json()
        if (!active) return
        setHistory(normalizeHistory(payload?.data?.history))
      } catch (err) {
        if (!active || err.name === 'AbortError') return
        setHistory([])
        setHistoryError('Sin datos históricos')
      } finally {
        if (active) setHistoryLoading(false)
      }
    }

    fetchHistory()
    return () => {
      active = false
      controller.abort()
    }
  }, [group.sensor_base, apiBase])

  const powerEntity = group.entities?.find((e) => e.device_class === 'power')
  const voltageEntity = group.entities?.find((e) => e.device_class === 'voltage')
  const currentEntity = group.entities?.find((e) => e.device_class === 'current')
  const fallbackValue = getEntityNumericValue(powerEntity)
  const energyEnabled = Boolean(group.is_energy_dashboard)
  const dashboardEnabled = group.dashboard_card_type === 'power'

  const handleEnergyToggle = () => {
    if (!actionsEnabled || !onToggleEnergy) return
    onToggleEnergy(group.sensor_base, energyEnabled)
  }

  const handleDashboardToggle = () => {
    if (!actionsEnabled || !onToggleDashboard) return
    onToggleDashboard()
  }

  const historyValues = history.map((point) => point.value)
  const chartValues = historyValues.length > 0 ? historyValues : fallbackValue > 0 ? [fallbackValue] : []
  const yAxisValues = buildYAxisValues(historyValues)
  const timeLabels = buildTimeLabels(history)

  const powerValue = formatMetricValue(powerEntity, 1, 'W')
  const voltageValue = formatMetricValue(voltageEntity, 1, 'V')
  const currentValue = formatMetricValue(currentEntity, 2, 'A')

  return (
    <article className="energy-card energy-card--power">
      <div className="power-card__header">
        <div>
          <h3>{group.base_name || group.sensor_base}</h3>
          <p>Potencia</p>
        </div>
        {actionsEnabled && (
          <div className="energy-card__actions">
            <button
              className={`dashboard-toggle ${dashboardEnabled ? 'active' : ''}`}
              onClick={handleDashboardToggle}
              aria-label="Toggle dashboard general"
              type="button"
            >
              <StarIcon filled={dashboardEnabled} />
            </button>
            <button
              className={`energy-toggle energy-toggle--icon ${energyEnabled ? 'active' : ''}`}
              onClick={handleEnergyToggle}
              aria-label="Toggle energy dashboard"
              type="button"
            >
              <LightningIcon filled={energyEnabled} />
            </button>
          </div>
        )}
      </div>

      <div className="power-metrics">
        <Metric label="Potencia" value={powerValue} />
        <Metric label="Voltaje" value={voltageValue} />
        <Metric label="Corriente" value={currentValue} />
      </div>

      {historyLoading ? (
        <div className="power-chart power-chart--loading">
          <p>Cargando datos históricos...</p>
        </div>
      ) : chartValues.length > 0 ? (
        <PowerTrendChart chartValues={chartValues} yAxisValues={yAxisValues} timeLabels={timeLabels} />
      ) : (
        <p className="history-error">{historyError || 'Sin datos históricos'}</p>
      )}
    </article>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  )
}

function PowerTrendChart({ chartValues, yAxisValues, timeLabels }) {
  if (!chartValues || chartValues.length === 0) {
    return <div className="power-chart power-chart--empty">Sin datos históricos</div>
  }

  const linePoints = buildLinePoints(chartValues)
  const axisValues = yAxisValues.length === 5 ? yAxisValues : Array(5).fill(0)
  const timeAxis = timeLabels && timeLabels.length > 0 ? timeLabels : defaultTimeAxis()

  const containerWidth = 400
  const leftMarginPx = 40
  const rightMarginPx = 20
  const availableWidth = containerWidth - leftMarginPx - rightMarginPx

  return (
    <div className="power-chart">
      <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
        {[0, 1, 2, 3, 4].map((i) => {
          const yPos = 20 + i * 20
          const value = axisValues[i] || 0
          return (
            <g key={`axis-${i}`}>
              <line x1="40" y1={yPos} x2="380" y2={yPos} stroke="#374151" strokeWidth="0.5" />
              <text x="35" y={yPos + 3} fill="#9CA3AF" fontSize="9" textAnchor="end">
                {formatAxisValue(value)}W
              </text>
            </g>
          )
        })}

        {linePoints && (
          <polyline points={linePoints} fill="none" stroke="#3B82F6" strokeWidth="2" />
        )}

        {timeAxis.map(({ label, ratio }, index) => {
          const x = leftMarginPx + Math.min(Math.max(ratio, 0), 1) * availableWidth
          return (
            <text key={`time-${index}`} x={x} y={115} fill="#9CA3AF" fontSize="9" textAnchor="middle">
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

```