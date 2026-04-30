import { defineMarkdocConfig, nodes, component } from "@astrojs/markdoc/config";

export default defineMarkdocConfig({
  nodes: {
    image: {
      ...nodes.image,
      render: component("./src/components/MarkdocImage.astro"),
    },
  },
});
