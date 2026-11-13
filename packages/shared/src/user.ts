/**
 * A teammate in the workspace. There is no login: the client picks a teammate and sends
 * their id in this header, which is enough to attribute changes and sync preferences.
 */
export const USER_ID_HEADER = 'x-user-id'

export type User = {
  id: string
  name: string
  email: string
}
