import {useEffect, useMemo, useState} from 'react'
import {concat, EMPTY, Observable, of, Subject, timer} from 'rxjs'
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mergeMapTo,
  share,
  switchMap,
} from 'rxjs/operators'
import {useSource} from '../studio'
import {isNonNullable} from '../util'
import {createSearch} from './search'
import {WeightedHit} from './weighted/types'

export interface DocumentSearchParams {
  options: {includeDrafts: boolean; limit: number}
  query: string
}

export interface DocumentSearchResultsState {
  loading: boolean
  error: Error | null
  value: WeightedHit[]
}

const EMPTY_STATE: DocumentSearchResultsState = {
  loading: false,
  error: null,
  value: [],
}

const LOADING_STATE: DocumentSearchResultsState = {
  loading: true,
  error: null,
  value: [],
}

// This value is used to improve performance by minimizing the number
// of API requests, as well as improving the user experience by waiting
// to display the search results until the user has finished typing.
const DEBOUNCE_VALUE = 400

export function useDocumentSearchResults(props: {
  includeDrafts?: boolean
  limit?: number
  query: string
}): DocumentSearchResultsState {
  const {client, schema} = useSource()
  const {includeDrafts = false, limit = 1000, query: queryProp} = props
  const [state, setState] = useState<DocumentSearchResultsState>(EMPTY_STATE)
  const paramsSubject = useMemo(() => new Subject<DocumentSearchParams>(), [])

  const search = useMemo(() => createSearch(client, schema), [client, schema])

  const state$ = useMemo(
    () =>
      paramsSubject.asObservable().pipe(
        share(),
        distinctUntilChanged(),
        filter(isNonNullable),
        switchMap(
          ({query, options}): Observable<DocumentSearchResultsState> =>
            query
              ? concat(
                  of(LOADING_STATE),
                  timer(DEBOUNCE_VALUE).pipe(mergeMapTo(EMPTY)),
                  search(query, options).pipe(
                    map((results) => ({loading: false, error: null, value: results})),
                    catchError((error) => {
                      return of({loading: false, error, value: []})
                    })
                  )
                )
              : of(EMPTY_STATE)
        )
      ),
    [paramsSubject, search]
  )

  useEffect(() => {
    paramsSubject.next({
      options: {includeDrafts, limit},
      query: queryProp,
    })
  }, [includeDrafts, limit, queryProp, paramsSubject])

  useEffect(() => {
    const sub = state$.subscribe(setState)

    return () => {
      sub.unsubscribe()
    }
  }, [state$])

  return state
}
