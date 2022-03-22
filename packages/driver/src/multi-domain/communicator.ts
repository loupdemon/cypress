import debugFn from 'debug'
import { EventEmitter } from 'events'
import { preprocessConfig, preprocessEnv } from '../util/config'
import { preprocessForSerialization, reifyCrossDomainError } from '../util/serialization'

const debug = debugFn('cypress:driver:multi-domain')

const CROSS_DOMAIN_PREFIX = 'cross:domain:'

/**
 * Primary domain communicator. Responsible for sending/receiving events throughout
 * the driver responsible for multi-domain communication, as well as sending/receiving events to/from the
 * spec bridge communicator, respectively.
 *
 * The 'postMessage' method is used to send events to the spec bridge communicator, while
 * the 'message' event is used to receive messages from the spec bridge communicator.
 * All events communicating across domains are prefixed with 'cross:domain:' under the hood.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage for more details.
 * @extends EventEmitter
 */
export class PrimaryDomainCommunicator extends EventEmitter {
  private crossDomainDriverWindows: {[key: string]: Window} = {}
  userInvocationStack?: string

  /**
   * The callback handler that receives messages from secondary domains.
   * @param {MessageEvent.data} data - a reference to the MessageEvent.data sent through the postMessage event. See https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/data
   * @param {MessageEvent.source} source - a reference to the MessageEvent.source sent through the postMessage event. See https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/source
   * @returns {Void}
   */
  onMessage ({ data, source }) {
    // check if message is cross domain and if so, feed the message into
    // the cross domain bus with args and strip prefix
    if (data?.event?.includes(CROSS_DOMAIN_PREFIX)) {
      const messageName = data.event.replace(CROSS_DOMAIN_PREFIX, '')

      // NOTE: need a special case here for 'bridge:ready'
      // where we need to set the crossDomainDriverWindow to source to
      // communicate back to the iframe
      if (messageName === 'bridge:ready' && source) {
        this.crossDomainDriverWindows[data.domain] = source as Window
      }

      if (data?.data?.err) {
        data.data.err = reifyCrossDomainError(data.data.err, this.userInvocationStack as string)
      }

      this.emit(messageName, data.data, data.domain)

      return
    }

    debug('Unexpected postMessage:', data)
  }

  /**
   * Events to be sent to the spec bridge communicator instance.
   * @param {string} event - the name of the event to be sent.
   * @param {any} data - any meta data to be sent with the event.
   */
  toAllSpecBridges (event: string, data?: any) {
    debug('=> to all spec bridges', event, data)

    const preprocessedData = preprocessForSerialization<any>(data)

    // if user defined data is passed in, do NOT sanitize it.
    if (data?.data) {
      preprocessedData.data = data.data
    }

    // If there is no crossDomainDriverWindow, there is no need to send the message.
    Object.values(this.crossDomainDriverWindows).forEach((win: Window) => {
      win.postMessage({
        event,
        data: preprocessedData,
      }, '*')
    })
  }

  toSpecBridge (domain: string, event: string, data?: any) {
    debug('=> to spec bridge', domain, event, data)

    const preprocessedData = preprocessForSerialization<any>(data)

    // if user defined data is passed in, do NOT sanitize it.
    if (data?.data) {
      preprocessedData.data = data.data
    }

    // If there is no crossDomainDriverWindow, there is no need to send the message.
    this.crossDomainDriverWindows[domain]?.postMessage({
      event,
      data: preprocessedData,
    }, '*')
  }
}

/**
 * Spec bridge domain communicator. Responsible for sending/receiving events to/from the
 * primary domain communicator, respectively.
 *
 * The 'postMessage' method is used to send events to the primary communicator, while
 * the 'message' event is used to receive messages from the primary communicator.
 * All events communicating across domains are prefixed with 'cross:domain:' under the hood.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage for more details.
 * @extends EventEmitter
 */
export class SpecBridgeDomainCommunicator extends EventEmitter {
  private handleSubjectAndErr = (data: Cypress.ObjectLike = {}, send: (data: Cypress.ObjectLike) => void) => {
    let { subject, err, ...rest } = data

    // check to see if the 'err' key is defined, and if it is, we have an error of any type
    const hasMultiDomainError = !!Object.getOwnPropertyDescriptor(data, 'err')

    if (!subject && !hasMultiDomainError) {
      return send(rest)
    }

    try {
      if (hasMultiDomainError) {
        try {
          // give the `err` truthiness if it's a falsey value like undefined/null/false
          if (!err) {
            err = new Error(`${err}`)
          }

          err = preprocessForSerialization(err)
        } catch (e) {
          err = e
        }
      }

      // We always want to make sure errors are posted, so clean it up to send.
      send({ ...rest, subject, err })
    } catch (err: any) {
      if (subject && err.name === 'DataCloneError') {
        // Send the type of object that failed to serialize.
        // If the subject threw the 'DataCloneError', the subject cannot be
        // serialized, at which point try again with an undefined subject.
        return this.handleSubjectAndErr({ ...rest, unserializableSubjectType: typeof subject }, send)
      }

      // Try to send the message again, with the new error.
      this.handleSubjectAndErr({ ...rest, err }, send)
    }
  }

  private syncGlobalsToPrimary = () => {
    this.toPrimary('sync:globals', {
      config: preprocessConfig(Cypress.config()),
      env: preprocessEnv(Cypress.env()),
    })
  }

  /**
   * The callback handler that receives messages from the primary domain.
   * @param {MessageEvent.data} data - a reference to the MessageEvent.data sent through the postMessage event. See https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/data
   * @returns {Void}
   */
  onMessage ({ data }) {
    if (!data) return

    this.emit(data.event, data.data)
  }

  /**
   * Events to be sent to the primary communicator instance.
   * @param {string} event - the name of the event to be sent.
   * @param {Cypress.ObjectLike} data - any meta data to be sent with the event.
   */
  toPrimary (event: string, data?: Cypress.ObjectLike, options: { syncGlobals: boolean } = { syncGlobals: false }) {
    debug('<= to Primary ', event, data, document.domain)
    if (options.syncGlobals) this.syncGlobalsToPrimary()

    this.handleSubjectAndErr(data, (data: Cypress.ObjectLike) => {
      window.top?.postMessage({
        event: `${CROSS_DOMAIN_PREFIX}${event}`,
        data,
        domain: document.domain,
      }, '*')
    })
  }
}