import React from "react"
import PropTypes from "prop-types"

import guidesCollection from "../../collections/guides"
import Button from "../../components/Button"
import Guides from "../../components/Guides"
import Page from "../Page"

import styles from "./index.css"
import {wrapper} from "../Page/index.css"

const Guide = (props, { collection }) => {
  const guides = guidesCollection(collection)
  const nextGuide = guides.find(g => g.order === (props.head.order + 1));
  let nextButton = null
  if (nextGuide) {
      nextButton = (
          <Button to={ nextGuide.__url } className={ styles.button }>
              <div className={styles.next}>
                  <p>Up next</p>
                  <p>{nextGuide.title}</p>
              </div>
          </Button>
      );
  }
  return (
      <div className={[wrapper, styles.container].join(' ')}>
          <div className={styles.article}>
              <Page { ...props }></Page>
              {nextButton}
          </div>
          <div className={styles.sidebar}>
              <Guides />
          </div>
      </div>
  )
}

Guide.propTypes = {
  head: PropTypes.object.isRequired,
}

Guide.contextTypes = {
  collection: PropTypes.array.isRequired,
}

export default Guide
