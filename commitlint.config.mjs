export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Co-Authored-By / Claude-Session trailers are long lines in the footer.
    "footer-max-line-length": [0],
    "body-max-line-length": [0],
  },
};
