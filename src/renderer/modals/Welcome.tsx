import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Button, Image, List, Paper, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { AdaptiveModal } from '@/components/common/AdaptiveModal'
import icon from '../static/icon.png'
import { navigateToSettings } from './Settings'
import platform from '@/platform'
import { Link } from '@mui/material'

const Welcome = NiceModal.create(() => {
  const { t } = useTranslation()
  const modal = useModal()

  const onClose = () => {
    modal.resolve()
    modal.hide()
  }

  return (
    <AdaptiveModal
      opened={modal.visible}
      onClose={onClose}
      withCloseButton={false}
      centered={true}
      radius="lg"
      classNames={{
        body: 'pt-xxl px-xl pb-md',
      }}
    >
      <Stack gap="xl">
        <Stack gap="md" align="center">
          <Stack gap="sm" align="center">
            <Image src={icon} w={86} h={86} />
            <Stack gap="3xs" align="center">
              <Title order={3}>OAK</Title>
              <Text size="md">{t('AI with deep roots')}</Text>
            </Stack>
          </Stack>

          <List size="sm" c="chatbox-secondary" className="flex flex-col items-left">
            <List.Item>{t('Connects to TAMUS Models')}</List.Item>
            <List.Item>{t('Incorporates NRI knowledge sources')}</List.Item>
          </List>
        </Stack>

        <Paper shadow="none" radius="md" withBorder p="lg">
          <Stack gap="sm">
            <Text className="text-center">{t('Please provide your AgriLife Chat API key')}</Text>
            <Link className="text-center" sx={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault()
                platform.openLink('https://chat.ag.tamus.ai')
              }}
            >
              Open AgriLife Chat
            </Link>
            <Button
              size="lg"
              h={54}
              radius="md"
              classNames={{ root: '!outline-none', label: 'flex flex-col items-center justify-center' }}
              onClick={() => {
                navigateToSettings('/provider/agrilife')
                modal.resolve('setup')
                modal.hide()
              }}
            >
              {t('Setup Provider')}
            </Button>
          </Stack>
        </Paper>

       
      </Stack>
    </AdaptiveModal>
  )
})

export default Welcome
