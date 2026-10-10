import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  framework: "@storybook/nextjs",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  // Demo product photos (public/demo) for the storefront stories.
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
};

export default config;
