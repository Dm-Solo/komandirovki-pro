const { spawnSync } = require("child_process");

const port = process.env.PORT || "3000";
const result = spawnSync("npx", ["next", "start", "-p", port], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
