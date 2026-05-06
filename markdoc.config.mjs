import { defineMarkdocConfig, nodes, component } from "@astrojs/markdoc/config";
import { applyFootnotePatch, footnoteTags } from "./src/utils/footnotes.ts";
import { applyTypographyPatch } from "./src/utils/typography.ts";

applyFootnotePatch();
applyTypographyPatch();

export default defineMarkdocConfig({
  nodes: {
    image: {
      ...nodes.image,
      render: component("./src/components/MarkdocImage.astro"),
    },
  },
  tags: {
    ...footnoteTags,
    compare: {
      render: component("./src/components/ImageCompare.astro"),
      attributes: {
        before: { type: String, required: true },
        beforeAlt: { type: String, required: true },
        beforeLabel: { type: String },
        after: { type: String, required: true },
        afterAlt: { type: String, required: true },
        afterLabel: { type: String },
        caption: { type: String },
        start: { type: Number },
      },
    },
  },
});
