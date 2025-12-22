const ACTIVE_COLOR = '#facc15';
const INACTIVE_COLOR = 'rgba(148, 163, 184, 0.7)';

interface SensorStatusIconProps {
  kind: 'door' | 'window' | 'motion' | 'occupancy' | 'battery' | 'temperature' | 'default';
  active?: boolean;
}

const DoorIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 32 32" className="sensor-icon" aria-hidden>
    <rect
      x="8"
      y="4"
      width="16"
      height="24"
      rx="2"
      fill={active ? ACTIVE_COLOR : 'none'}
      stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      strokeWidth="2"
    />
    <circle cx="20" cy="16" r="2" fill={active ? '#0f172a' : INACTIVE_COLOR} />
  </svg>
);

const MotionIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 32 32" className="sensor-icon" aria-hidden>
    <circle cx="16" cy="9" r="4" fill={active ? ACTIVE_COLOR : 'none'} stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR} strokeWidth="2" />
    <path
      d="M10 28l3-8-4-3 5-3"
      fill="none"
      stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 28l-3-8 4-3-5-3"
      fill="none"
      stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const OccupancyIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 32 32" className="sensor-icon" aria-hidden>
    <circle cx="11" cy="12" r="4" fill={active ? ACTIVE_COLOR : 'none'} stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR} strokeWidth="2" />
    <circle cx="21" cy="12" r="4" fill={active ? ACTIVE_COLOR : 'none'} stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR} strokeWidth="2" />
    <path
      d="M6 28c1-4 3-7 5-7s3 2 5 2 4-2 6-2 4 3 5 7"
      fill="none"
      stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const BatteryIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 32 32" className="sensor-icon" aria-hidden>
    <rect
      x="6"
      y="10"
      width="18"
      height="12"
      rx="2"
      fill={active ? ACTIVE_COLOR : 'none'}
      stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      strokeWidth="2"
    />
    <rect x="24" y="13" width="3" height="6" rx="1" fill={active ? ACTIVE_COLOR : INACTIVE_COLOR} />
  </svg>
);

const TemperatureIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 32 32" className="sensor-icon" aria-hidden>
    <path
      d="M18 6a3 3 0 0 0-6 0v9.17a6 6 0 1 0 6 0Z"
      fill={active ? ACTIVE_COLOR : 'none'}
      stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="15" cy="23" r="2" fill={active ? '#0f172a' : INACTIVE_COLOR} />
  </svg>
);

const DefaultIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 32 32" className="sensor-icon" aria-hidden>
    <circle
      cx="16"
      cy="16"
      r="10"
      fill={active ? ACTIVE_COLOR : 'none'}
      stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      strokeWidth="2"
    />
  </svg>
);

export const SensorStatusIcon = ({ kind, active }: SensorStatusIconProps) => {
  switch (kind) {
    case 'door':
    case 'window':
      return <DoorIcon active={active} />;
    case 'motion':
      return <MotionIcon active={active} />;
    case 'occupancy':
      return <OccupancyIcon active={active} />;
    case 'battery':
      return <BatteryIcon active={active} />;
    case 'temperature':
      return <TemperatureIcon active={active} />;
    default:
      return <DefaultIcon active={active} />;
  }
};
