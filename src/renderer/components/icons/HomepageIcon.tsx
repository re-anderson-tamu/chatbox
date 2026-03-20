import { useComputedColorScheme } from '@mantine/core'
import * as React from 'react'
import icon from '../../static/icon.png'

function HomepageIcon(props: React.SVGProps<SVGSVGElement>) {
  const colorScheme = useComputedColorScheme()
  const isDark = colorScheme === 'dark'
  const fillColor = isDark ? '#7D90A1' : '#EDF0F2'
  const strokeColor = isDark ? '#45525F' : '#899AA9'

  return <img src={icon} width={34} />
}

const MemoHomepageIcon = React.memo(HomepageIcon)
export default MemoHomepageIcon
