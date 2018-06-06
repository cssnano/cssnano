import { combineReducers } from "redux"
import createStore from "phenomic/lib/redux/createStore"
// eslint-disable-next-line import/no-namespace
import * as phenomicReducers from "phenomic/lib/redux/modules"

const store = createStore(
  combineReducers(phenomicReducers),
  { ...(typeof window !== "undefined") && window.__INITIAL_STATE__ },
)

export default store
