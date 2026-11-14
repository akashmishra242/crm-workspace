/** Forms with unsaved edits, so app-wide actions (like switching to a new version) can wait. */
const unsavedForms = new Set<string>()

export function setUnsavedChanges(formId: string, unsaved: boolean) {
  if (unsaved) unsavedForms.add(formId)
  else unsavedForms.delete(formId)
}

export const hasUnsavedChanges = () => unsavedForms.size > 0
