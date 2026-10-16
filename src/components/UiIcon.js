import { defineComponent, h } from "vue";
import { icons } from "../ui/icons.js";

// Reuse the exact local SVG paths, with an SVG root (no layout-changing wrapper).
const parsed = Object.fromEntries(
  Object.entries(icons).map(([name, markup]) => {
    const opening = markup.slice(0, markup.indexOf(">"));
    const attributes = Object.fromEntries(
      [...opening.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [
        match[1],
        match[2],
      ]),
    );
    return [
      name,
      {
        attributes,
        content: markup.slice(
          markup.indexOf(">") + 1,
          markup.lastIndexOf("</svg>"),
        ),
      },
    ];
  }),
);
export default defineComponent({
  inheritAttrs: false,
  props: { name: { type: String, required: true } },
  setup(props, { attrs }) {
    return () => {
      const icon = parsed[props.name] || parsed.spark;
      return h("svg", {
        ...icon.attributes,
        ...attrs,
        innerHTML: icon.content,
      });
    };
  },
});
