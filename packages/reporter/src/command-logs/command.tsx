import _ from 'lodash'
import cs from 'classnames'
import Markdown from 'markdown-it'
import { action, observable } from 'mobx'
import { observer } from 'mobx-react'
import React, { useState, Component, MouseEvent, useEffect } from 'react'
// @ts-ignore
import Tooltip from '@cypress/react-tooltip'

import { AppState } from '../lib/app-state'
// import appState, { AppState } from '../lib/app-state'
import events, { Events } from '../lib/events'
import FlashOnClick from '../lib/flash-on-click'
import { TimeoutID } from '../lib/types'
import runnablesStore, { RunnablesStore } from '../runnables/runnables-store'
import { Alias, AliasObject } from '../instruments/instrument-model'

import CommandModel from './command-model'
import TestError from '../errors/test-error'

import ChevronIcon from '-!react-svg-loader!@packages/frontend-shared/src/assets/icons/chevron-down-small_x16.svg'
import DeleteIcon from '-!react-svg-loader!@packages/frontend-shared/src/assets/icons/action-delete-circle_x16.svg'
import HiddenIcon from '-!react-svg-loader!@packages/frontend-shared/src/assets/icons/general-eye-closed_x16.svg'
import PinIcon from '-!react-svg-loader!@packages/frontend-shared/src/assets/icons/object-pin_x16.svg'
import RunningIcon from '-!react-svg-loader!@packages/frontend-shared/src/assets/icons/status-running_x16.svg'
import StateIcon from '../lib/state-icon'

const md = new Markdown()

const WrapWithTooltip = () => (
  <Tooltip placement='top' title={visibleMessage(model)} className='cy-tooltip'>
    <span>
      <HiddenIcon className="command-invisible" />
    </span>
  </Tooltip>
)

const CommandColumn = observer(({ model, isPinned }) => {
  const toggleGroup = () => {
    model.toggleOpen()
  }

  return (
    <div className='cmd-column'>
      <div className='cmd-number'>
        {isPinned ?
          <PinIcon /> : (
            <>
              {model._isPending() && <RunningIcon className='fa-spin' />}
              {!model._isPending() && <span>{model.number + 100 || ''}</span>}
            </>
          )}
      </div>
      <span className='cmd-expander'>
        <ChevronIcon className={cs({ 'cmd-expander-is-open': model.isOpen })} onClick={toggleGroup} />
        {model.hasChildren && <ChevronIcon className={cs({ 'is-open': model.isOpen })} onClick={toggleGroup} />}
      </span>
    </div>
  )
})

const AliasReference = observer(({ aliasObj, model, aliasesWithDuplicates }) => {
  const showCount = shouldShowCount(aliasesWithDuplicates, aliasObj.name, model)

  const message = `Found ${showCount ? aliasObj.ordinal : 'an'} alias for: '${aliasObj.name}'`

  return (
    <span className="command-alias-container" key={aliasObj.name + aliasObj.cardinal}>
      <Tooltip placement='top' title={message} className='cy-tooltip'>
        <span>
          <span className={cs('command-alias', model.aliasType, { 'show-count': showCount })}>@{aliasObj.name}</span>
          {showCount && <span className={'command-alias-count'}>{aliasObj.cardinal}</span>}
        </span>
      </Tooltip>
    </span>
  )
})

const AliasesReferences = observer(({ model, aliasesWithDuplicates }) => (
  <span>
    {model.referencesAlias.map((aliasObj) => (
      <AliasReference aliasObj={aliasObj} model={model} aliasesWithDuplicates={aliasesWithDuplicates} />
    ))}
  </span>
))

const Message = observer(({ model }) => (
  <>
    {!!model.renderProps.indicator && <i className={cs(
      model.renderProps.wentToOrigin ? 'fas' : 'far',
      'fa-circle',
      model.renderProps.indicator,
    )} />
    }
    {model.displayMessage}
  </>
))

interface Props {
  model: CommandModel
  aliasesWithDuplicates: Array<Alias> | null
  appState: AppState
  events: Events
  runnablesStore: RunnablesStore
  groupId?: number
}

const Command = (props) => {
  const {
    model,
    aliasesWithDuplicates,
    appState,
    runnablesStore,
    groupId,
    children,
  } = props

  const displayName = model.displayName || model.name
  const [isPinned, setIsPinned] = useState(appState.pinnedSnapshotId === model.id)
  const [isDisabled, setIsDisabled] = useState(!appState.isRunning)

  useEffect(() => {
    console.log('model update', appState.isRunning, model.id)
  }, [model])

  useEffect(() => {
    const shouldBePinned = appState.pinnedSnapshotId === model.id

    console.log('appStateUpdate.pinnedSnapshotId update', appState.pinnedSnapshotId, model.id, shouldBePinned)

    if (shouldBePinned && !isPinned) {
      setIsPinned(true)
    } else if (!shouldBePinned && isPinned) {
      setIsPinned(false)
    }
  }, [appState.pinnedSnapshotId])

  useEffect(() => {
    const shouldBeDisabled = appState.isRunning || appState.studioActive

    if (shouldBeDisabled !== isDisabled) {
      setIsDisabled(shouldBeDisabled)
    }
  }, [appState.isRunning, appState.studioActive])

  const {
    id,
    isOpen,
  } = model

  const onClick = () => {
    const shouldBePinned = appState.pinnedSnapshotId === model.id

    if (shouldBePinned) {
      appState.pinnedSnapshotId = null
      events.emit('unpin:snapshot', id)
      // this._snapshot(true)
    } else {
      appState.pinnedSnapshotId = model.id as number
      events.emit('pin:snapshot', id)
    }
  }

  const shouldShowClickMessage = () => {
    if (model.hasChildren) {
      return false
    }

    return !appState.isRunning && !!model.hasConsoleProps
  }

  const modelName = model.name ? model.name.replace(/(\s+)/g, '-') : ''

  const classNames = cs(
    'cmd',
      `cmd-name-${modelName}`,
      // `command-state-${model.state}`,
      // `command-type-${model.type}`,
      {
        //   'command-is-studio': model.isStudio,
        //   'command-is-event': !!model.event,
        //   'command-is-invisible': model.visible != null && !model.visible,
        //   'command-has-num-elements': model.state !== 'pending' && model.numElements != null,
        'command-is-pinned': isPinned,
        //   'command-with-indicator': !!model.renderProps.indicator,
        //   'command-scaled': model.displayMessage && model.displayMessage.length > 100,
        //   'no-elements': !model.numElements,
        //   'command-has-snapshot': model.hasSnapshot,
        //   'command-has-console-props': model.hasConsoleProps,
        //   'multiple-elements': model.numElements > 1,
        //   'command-has-children': model.hasChildren,
        //   'command-is-child': model.isChild,
        //   'command-is-open': isOpen,
      },
  )

  return (
    <li className={classNames}>
      <div className='cmd-wrapper'>
        <CommandColumn model={model} isPinned={isPinned} />
        <FlashOnClick
          message='Printed output to your console'
          onClick={onClick}
          shouldShowMessage={shouldShowClickMessage}
        >
          <div className="cmd-details">
            <span className='cmd-method'>
              <span>{model.event && model.type !== 'system' ? `(${displayName})` : displayName}</span>
            </span>
            <span className='cmd-message'>
              {model.referencesAlias ?
                <AliasesReferences model={model} aliasesWithDuplicates={aliasesWithDuplicates} />
                :
                <Message model={model} />
              }
            </span>
          </div>
        </FlashOnClick>
      </div>
      {isOpen && children}
    </li>
  )
}

export default observer(Command)