/* eslint-disable no-console */

import {Patch as EditorPatch} from '@sanity/portable-text-editor'
import {Path} from '@sanity/types'
import {useCallback, useMemo} from 'react'
import {Subject} from 'rxjs'
import {PatchArg, PatchEvent} from '../../../patch'

// This hook will forward patches to the root onChange from the forms of the embedded objects.
export function useObjectEditFormBuilderChange(
  onChange: (...patches: PatchArg[]) => void,
  patches$: Subject<EditorPatch>
) {
  const onObjectEditFormBuilderChange = useCallback(
    (patchEvent: PatchEvent, path: Path): void => {
      let prefixedEvent = patchEvent
      path
        .slice(0)
        .reverse()
        .forEach((segment) => {
          prefixedEvent = prefixedEvent.prefixAll(segment)
        })
      prefixedEvent.patches.map((patch) => patches$.next({...patch, origin: 'internal'}))
      onChange(prefixedEvent.patches)
    },
    [onChange, patches$]
  )

  return useMemo(() => ({onObjectEditFormBuilderChange}), [onObjectEditFormBuilderChange])
}
