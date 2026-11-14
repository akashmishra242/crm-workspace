import type { Contact } from '@crm/shared'
import { useQuery } from '@tanstack/react-query'
import { UserX } from 'lucide-react'
import { Suspense, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { t } from '../../../i18n'
import { timeZoneLabel } from '../../../lib/format'
import { isApiError } from '../../../lib/http'
import { lazyWithPreload } from '../../../lib/lazyWithPreload'
import { ActivityTimeline } from '../../activity/components/ActivityTimeline'
import { ContactTagsEditor } from '../../tags/components/ContactTagsEditor'
import { contactDetailQuery } from '../api/contactQueries'
import { serializeContactListParams, useContactListParams } from '../list/useContactListParams'
import { ContactCard } from './ContactCard'
import { ContactDetailHeader } from './ContactDetailHeader'
import { ContactForm } from './ContactForm'
import { ModuleSwitcher } from './ModuleSwitcher'
import { contactDisplayName } from '../utils/contactDisplayName'
import { RecordInfo } from './RecordInfo'
import {
  MODULE_LABELS,
  useDetailViewPreferences,
  visibleModulesOf,
  type DetailModule,
  type DetailViewPreferences,
} from './useDetailViewPreferences'

const CustomizeViewDrawer = lazyWithPreload(() => import('./CustomizeViewDrawer'))

export function ContactDetailPage() {
  const { contactId = '' } = useParams()
  const contact = useQuery(contactDetailQuery(contactId))

  if (contact.isPending) return <DetailSkeleton contactId={contactId} />

  // No data, or the contact was deleted (here or in another tab) since it was loaded.
  if (!contact.data || isApiError(contact.error, 'NOT_FOUND')) {
    return (
      <div className="flex h-full flex-col">
        <ContactDetailHeader contactId={contactId} />
        {isApiError(contact.error, 'NOT_FOUND') || isApiError(contact.error, 'VALIDATION_ERROR') ? (
          <NotFound />
        ) : (
          <ErrorState
            title={t.contacts.detail.loadFailed}
            message={contact.error?.message ?? t.common.pleaseTryAgain}
            onRetry={() => void contact.refetch()}
            retrying={contact.isFetching}
          />
        )}
      </div>
    )
  }

  // A failed background refresh keeps the workspace (and any unsaved edits) on screen.
  return (
    <ContactWorkspace
      key={contactId}
      latest={contact.data}
      refreshFailed={contact.isError}
      onRetry={() => void contact.refetch()}
    />
  )
}

type ContactWorkspaceProps = {
  latest: Contact
  refreshFailed: boolean
  onRetry: () => void
}

function ContactWorkspace({ latest, refreshFailed, onRetry }: ContactWorkspaceProps) {
  const [base, setBase] = useState(latest)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const view = useDetailViewPreferences()
  /** The Customize view draft, shown live while the drawer is open. */
  const [preview, setPreview] = useState<DetailViewPreferences | null>(null)
  const preferences = preview ?? view.preferences
  const visibleModules = visibleModulesOf(preferences)
  const isXlUp = useMediaQuery('(min-width: 1280px)')
  const isLgUp = useMediaQuery('(min-width: 1024px)')

  const renderModule = (module: DetailModule): ReactNode => {
    switch (module) {
      case 'activity':
        return <ActivityTimeline contactId={latest.id} />
      case 'tags':
        return (
          <div className="p-4">
            <ContactTagsEditor
              contactId={latest.id}
              contactName={contactDisplayName(latest)}
              tags={latest.tags}
            />
          </div>
        )
      case 'record':
        return (
          <div className="p-4">
            <RecordInfo contact={latest} />
          </div>
        )
    }
  }

  const threePanel = isXlUp && preferences.layout === 'three-panel'
  const sideModules = visibleModules.filter((module) => module !== 'activity')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <title>{t.contacts.detail.documentTitle(contactDisplayName(latest))}</title>
      <ContactDetailHeader
        contactId={latest.id}
        onCustomize={() => setCustomizeOpen(true)}
        onCustomizeIntent={CustomizeViewDrawer.preload}
        contactName={contactDisplayName(latest)}
      />
      {refreshFailed && (
        <p role="alert" className="bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-6">
          {t.contacts.detail.refreshFailed}{' '}
          <button type="button" className="font-medium underline" onClick={onRetry}>
            {t.common.tryAgain}
          </button>
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className="shrink-0 border-gray-200 bg-white lg:w-[400px] lg:overflow-y-auto lg:border-r">
          <div className="space-y-6 p-4">
            <ContactCard
              contact={latest}
              fields={preferences.cardFields}
              showPlaceholders={preview !== null}
            />
            <ContactForm
              key={base.version}
              base={base}
              latest={latest}
              hideEmptyFields={preferences.hideEmptyFields}
              onHideEmptyFieldsChange={view.setHideEmptyFields}
              onRebase={setBase}
            />
          </div>
        </aside>

        {threePanel ? (
          <>
            <section
              aria-label={MODULE_LABELS.activity}
              className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white"
            >
              <PanelHeading aside={timeZoneLabel}>{MODULE_LABELS.activity}</PanelHeading>
              <ActivityTimeline contactId={latest.id} />
            </section>
            {sideModules.length > 0 && (
              <aside className="w-80 shrink-0 space-y-px overflow-y-auto border-l border-gray-200 bg-gray-50">
                {sideModules.map((module) => (
                  <section key={module} aria-label={MODULE_LABELS[module]} className="bg-white">
                    <PanelHeading>{MODULE_LABELS[module]}</PanelHeading>
                    {renderModule(module)}
                  </section>
                ))}
              </aside>
            )}
          </>
        ) : (
          <section className="flex min-h-[28rem] min-w-0 flex-1 flex-col border-t border-gray-200 bg-white lg:border-t-0">
            <ModuleSwitcher
              modules={visibleModules}
              display={isLgUp ? preferences.moduleDisplay : 'tabs'}
              renderModule={renderModule}
            />
          </section>
        )}
      </div>

      <Suspense>
        {customizeOpen && (
          <CustomizeViewDrawer
            open
            onOpenChange={(open) => {
              setCustomizeOpen(open)
              if (!open) setPreview(null)
            }}
            view={view}
            onPreview={setPreview}
          />
        )}
      </Suspense>
    </div>
  )
}

function PanelHeading({ children, aside }: { children: ReactNode; aside?: string }) {
  return (
    <h2 className="flex items-baseline gap-2 border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
      {children}
      {aside && <span className="text-xs font-normal text-gray-500">({aside})</span>}
    </h2>
  )
}

function NotFound() {
  const { params } = useContactListParams()
  return (
    <EmptyState
      icon={<UserX className="size-5" aria-hidden />}
      title={t.contacts.detail.notFound}
      description={t.contacts.detail.notFoundDescription}
      action={
        <Link
          to={serializeContactListParams('/contacts', params)}
          className="font-medium text-primary-700 hover:underline"
        >
          {t.contacts.detail.backToContacts}
        </Link>
      }
    />
  )
}

function DetailSkeleton({ contactId }: { contactId: string }) {
  return (
    <div className="flex h-full flex-col">
      <ContactDetailHeader contactId={contactId} />
      <div
        role="status"
        aria-label={t.contacts.detail.loading}
        className="space-y-4 p-6 lg:w-[400px]"
      >
        <div className="flex gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  )
}
