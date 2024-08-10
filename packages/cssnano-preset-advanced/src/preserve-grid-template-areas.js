const postcss = require("postcss");

module.exports = postcss.plugin("preserve-grid-template-areas", () => {
  return (root) => {
    root.walkRules((rule) => {
      const gridAreas = rule.nodes.find(
        (node) => node.prop === "grid-template-areas"
      );
      if (gridAreas) {
        const areas = gridAreas.value
          .split('"')
          .filter((_, i) => i % 2 === 1)
          .map((line) => line.trim());

        const preservedAreas = `"${areas.join('" "')}"`;
        gridAreas.value = preservedAreas;
      }
    });
  };
});
