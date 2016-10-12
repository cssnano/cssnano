import remark from "remark";
import slug from "remark-slug";
import autoLinkHeadings from "remark-autolink-headings";
import highlight from "remark-highlight.js";
import html from "remark-html";
import remarkReact from "remark-react";

const renderer = () => (
    remark
      // https://github.com/wooorm/remark-slug
      .use(slug)

      // https://github.com/ben-eb/remark-autolink-headings
      .use(autoLinkHeadings, {
          attributes: {
              class: "phenomic-HeadingAnchor",
          },
          behaviour: 'append',
          template: "#",
      })

      // https://github.com/wooorm/remark-html
      .use(html, {entities: "escape"})

      // https://github.com/ben-eb/remark-highlight.js
      .use(highlight)
);

export default ({result}) => {
    return {
        ...result,
        body: renderer()
            .process(result.body, {
                commonmark: true,
            }),
    };
};

export const react = text => (
    renderer()
    .use(remarkReact)
    // render
    .process(text, {
        commonmark: true,
    })
);
