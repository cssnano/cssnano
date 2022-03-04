---
pagination:
  data: optimisations
  size: 1
  alias: optimisation
permalink: '/docs/optimisations/{{ optimisation.shortName | lower }}/'
layout: 'layouts/NoSidebar.njk'
eleventyComputed:
  title: '{{ optimisation.shortName }}'
---


{{ optimisation.longDescription }}

## Example

### Input

```css
{{ optimisation.inputExample }}
```

### Output
```css
{{ optimisation.outputExample }}
```
