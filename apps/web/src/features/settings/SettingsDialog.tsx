import type { ReactNode } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { ModalBody } from '../../components/ui/Modal'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Switch } from '../../components/ui/Switch'
import {
  useDetailViewPreferences,
  type DetailLayout,
} from '../contacts/detail/useDetailViewPreferences'
import { useAppSettings } from './useAppSettings'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Each control saves the moment it changes, like system settings, so there is nothing to
 * confirm and no Save button. Everything here is per teammate and synced across devices.
 */
export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, setPreloadOnHover } = useAppSettings()
  const detailView = useDetailViewPreferences()

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Changes save as you make them and follow you to your other devices."
    >
      <ModalBody>
        <div className="space-y-6">
          <Group title="Speed">
            <Switch
              label="Preload contacts on hover"
              description="Starts loading a contact when you rest the pointer on its row, and the next page when you point at Next, so they open instantly. Off by default because it sends extra requests."
              checked={settings.preloadOnHover}
              onCheckedChange={setPreloadOnHover}
            />
          </Group>

          <Group title="Contact page">
            <Row label="Layout">
              <SegmentedControl<DetailLayout>
                label="Contact page layout"
                value={detailView.preferences.layout}
                onChange={(layout) => detailView.save({ ...detailView.preferences, layout })}
                options={[
                  { value: 'three-panel', label: 'Three panels' },
                  { value: 'two-column', label: 'Two columns' },
                ]}
              />
            </Row>
            <p className="mt-2 text-xs text-gray-500">
              Panels, the contact card and empty fields are set from “Customize view” on any
              contact.
            </p>
          </Group>
        </div>
      </ModalBody>
    </Dialog>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      {children}
    </div>
  )
}
