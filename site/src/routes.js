import React from "react"
import { Route } from "react-router"
import { PageContainer as PhenomicPageContainer } from "phenomic"

import AppContainer from "./AppContainer"
import * as layouts from "./layouts"

const PageContainer = (props) => (
  <PhenomicPageContainer
    { ...props }
    layouts={layouts}
  />
)

export default (
  <Route component={ AppContainer }>
    <Route path="*" component={ PageContainer } />
  </Route>
)
