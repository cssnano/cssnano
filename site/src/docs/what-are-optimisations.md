---
id: what-are-optimisations
title: Optimisations
layout: layouts/MainLayout.njk
order: 3
---

## What are optimisations?

An optimisation is a module that performs a transform on some CSS code in order
to reduce its size, or failing this, the final gzip size of the CSS. Each
optimisation is performed by either one module or a few modules working
together.

Due to the nature of dividing cssnano's responsibilities across several modules,
there will be some cases where using a transform standalone will not produce
the most optimal output. For example, postcss-colormin will not trim whitespace
inside color functions as this is handled by postcss-normalize-whitespace.


## What optimisations do you support?

The optimisations are different depending on which preset cssnano is configured with; with the default preset, we offer safe transforms only.

<table>
<thead>
 <tr>
 <th>Optimisation</th>
 {% for preset in presets %}
 <th>{{ preset }}</th>
 {% endfor %}
 </tr>
</thead>

<tbody>
{% for opt in optimisations %}
<tr>
<td><a href="/docs/optimisations/{{ opt.shortName | lower }}">{{ opt.shortName }}</a></td>
{% for preset in presets %}
<td>{% if opt[preset] === 'disabled' %}disabled{% elif opt[preset] === 'enabled' %}✅{% else %}❌{% endif %}</td>
{%     endfor                  %}
</tr>
{% endfor %}
</tbody>
</table>

You can read more about presets in our [presets guide](/docs/presets).
