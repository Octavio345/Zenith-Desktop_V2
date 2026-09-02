import { createContext, useContext } from "react"

const InstallAppContext = createContext({
  isInstalled: false,
  canInstall: false,
  requestInstall: () => {},
})

export const InstallAppProvider = InstallAppContext.Provider

export const useInstallApp = () => useContext(InstallAppContext)

