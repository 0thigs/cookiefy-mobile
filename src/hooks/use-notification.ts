import { useEffect } from 'react'
import { LogLevel, OneSignal } from 'react-native-onesignal'


export function useNotification() {
  function login(accountId: string) {
    OneSignal.login(accountId)
  }

  useEffect(() => {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose)
    OneSignal.initialize('561d9775-45a7-44d8-9324-5cf459f669ad')
    OneSignal.Notifications.requestPermission(true)
  }, [])

  return {
    login,
  }
}
