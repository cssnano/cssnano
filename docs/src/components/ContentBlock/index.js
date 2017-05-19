import React from "react"
import PropTypes from "prop-types"
import cx from "classnames"

import styles from "./index.css"

const ContentBlock = ({ className, children, ...otherProps }) => (
  <div
      { ...otherProps }
      className={ cx({
        [className]: className,
        [styles.outer]: true,
      }) }
  >
      <div className={styles.inner}>
          {children}
      </div>
  </div>
)

ContentBlock.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
}

export default ContentBlock
