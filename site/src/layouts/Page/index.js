import React from "react"
import PropTypes from "prop-types"
import Helmet from "react-helmet"
import warning from "warning"
import { BodyContainer, joinUri } from "phenomic"

import Loading from "../../components/Loading"
import metadata from "../../components/Metadata"

import styles from "./index.css"


const Page = (
  {
    isLoading,
    __filename,
    __url,
    head,
    body,
    header,
    footer,
    children,
  },
  {
    metadata: { pkg, favicons },
  }
) => {
  warning(
    typeof head.title === "string",
    `Your page '${ __filename }' needs a title`
  )

  const metaTitle = head.metaTitle ? head.metaTitle : head.title

  const meta = metadata({
      title: metaTitle,
      url: joinUri(process.env.PHENOMIC_USER_URL, __url),
      description: head.description,
      twitter: pkg.twitter,
  });

  return (
    <div className={ styles.page }>
      <Helmet
        title={`${metaTitle} - cssnano`}
        meta={ meta }
        link={ favicons }
      />
      <div className={ styles.wrapper + " " + styles.pageContent }>
        <h1 className={ styles.title }>{ head.title }</h1>
        { header }
        <div className={ styles.body }>
          {
            isLoading
            ? <Loading />
            : <BodyContainer>{ body }</BodyContainer>
          }
        </div>
        { children }
        { footer }
      </div>
    </div>
  )
}

Page.propTypes = {
  children: PropTypes.node,
  isLoading: PropTypes.bool,
  __filename: PropTypes.string,
  __url: PropTypes.string,
  head: PropTypes.object.isRequired,
  body: PropTypes.string,
  header: PropTypes.element,
  footer: PropTypes.element,
}

Page.contextTypes = {
  metadata: PropTypes.object.isRequired,
}

export default Page
