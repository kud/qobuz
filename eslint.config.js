import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  // spike.js and smoke.js are local, interactive scratch scripts, not shipped
  { ignores: ["dist/", "node_modules/", "spike.js", "smoke.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
)
