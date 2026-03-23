import type { SegmentedControlProps } from '@mantine/core'
import { SegmentedControl as MantineSegmentedControl } from '@mantine/core'

export default function SegmentedControl({
  value,
  onChange,
  data,
  ...props
}: {
  value: string
  onChange: (value: string) => void
  data: { label: string; value: string }[]
} & Omit<SegmentedControlProps, 'value' | 'onChange' | 'data'>) {
  return (
    <MantineSegmentedControl
      value={value}
      onChange={onChange}
      data={data}
      fullWidth
      transitionDuration={200}
      transitionTimingFunction="ease"
      color="chatbox-brand"
      {...props}
      styles={{
        root: {
          padding: 0,
        },
        indicator: {
          borderRadius: 0,
        },
      }}
    />
  )
}
