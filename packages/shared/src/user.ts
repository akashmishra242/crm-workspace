/**
 * A teammate in the workspace. There is no login: the client picks a teammate and sends
 * their id in this header, which is enough to attribute changes and sync preferences.
 */
export const USER_ID_HEADER = 'x-user-id'

/**
 * The web app sends its build id (the build time in base 36). After a breaking API change,
 * setting MIN_CLIENT_BUILD on the API makes older open tabs reload into the new version.
 */
export const CLIENT_BUILD_HEADER = 'x-client-build'

export const buildTime = (buildId: string) => Number.parseInt(buildId, 36)

export type User = {
  id: string
  name: string
  email: string
}
