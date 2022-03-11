import $Log from '../../cypress/log'
import { preprocessForSerialization } from '../../util/serialization'

export const handleLogs = (Cypress: Cypress.Cypress) => {
  const onLogAdded = (attrs) => {
    // TODO:
    // - handle printing console props (need to add to runner)
    //     this.runner.addLog(args[0], this.config('isInteractive'))

    //  Cypress.specBridgeCommunicator.toPrimary('log:added', $Log.getDisplayProps(attrs))

    Cypress.specBridgeCommunicator.toPrimary('log:added', preprocessForSerialization(attrs))
  }

  const onLogChanged = (attrs) => {
    // TODO:
    // - add invocation stack if error:
    //     let parsedError = correctStackForCrossDomainError(log.get('err'), this.userInvocationStack)
    // - notify runner? maybe not
    //     this.runner.addLog(args[0], this.config('isInteractive'))

    // debugger
    Cypress.specBridgeCommunicator.toPrimary('log:changed', preprocessForSerialization(attrs))
    // attrs?.snapshots?.forEach((snapshot) => {
    //   snapshot.primaryProcessed = true
    // })
  }

  Cypress.on('log:added', onLogAdded)
  Cypress.on('log:changed', onLogChanged)
}
