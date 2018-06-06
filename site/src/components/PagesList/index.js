import React from "react"
import PropTypes from "prop-types"

import PagePreview from "../PagePreview"

import styles from "./index.css"

const PagesList = ({ pages }) => {
  return (
    <div>
      {
      pages.length
      ? (
        <ul className={ styles.list }>
          {
          pages.map((page) => (
            <li key={ page.title }><PagePreview { ...page } /></li>
          ))
        }
        </ul>
      )
      : "No posts yet."
    }
    </div>
  )
}

PagesList.propTypes = {
  pages: PropTypes.array.isRequired,
}

export default PagesList
