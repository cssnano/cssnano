import React from "react"
import PropTypes from "prop-types"
import cx from "classnames"
import { Link } from "phenomic"

import styles from "./index.css"

const Button = ({ to, className, secondary, dark, big, ...otherProps }) => (
  <Link
      to={to}
      { ...otherProps }
      className={ cx({
        [className]: className,
        [styles.button]: true,
        [styles.secondary]: secondary,
        [styles.dark]: dark,
        [styles.big]: big,
      }) }
  />
)

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  secondary: PropTypes.bool,
  dark: PropTypes.bool,
  big: PropTypes.bool,
  to: PropTypes.string,
}

Button.displayName = "Button"

export default Button
