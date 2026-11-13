import { RadioGroup } from 'radix-ui'

type SegmentedControlProps<Value extends string> = {
  label: string
  value: Value
  options: ReadonlyArray<{ value: Value; label: string }>
  onChange: (value: Value) => void
}

export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as Value)}
      orientation="horizontal"
      className="inline-flex rounded-md bg-gray-100 p-0.5"
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className="h-7 rounded px-3 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 data-[state=checked]:bg-white data-[state=checked]:text-gray-900 data-[state=checked]:shadow-xs"
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
