import "./ToggleSwitch.css";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: ToggleSwitchProps) => {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <span className="toggle-slider"></span>
    </label>
  );
};
