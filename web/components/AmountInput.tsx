"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

/** Поле ввода суммы: пропускает только цифры и точку. */
export function AmountInput({ value, onChange, placeholder, disabled }: Props) {
  return (
    <input
      inputMode="decimal"
      value={value}
      disabled={disabled}
      placeholder={placeholder ?? "0.0"}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-lg outline-none transition focus:border-neon-cyan/50 disabled:opacity-60"
    />
  );
}
