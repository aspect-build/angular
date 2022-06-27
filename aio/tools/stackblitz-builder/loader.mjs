import path from "path";
import fs from "fs";

export async function resolve(specifier, context, defaultResolve) {
    // console.error("==============")

    const nodeModules = path.join(path.dirname(process.env.FOOBAR), "node_modules");

    let resolved;

    console.error(specifier)
    console.error(context);

    if (!specifier.startsWith("./") && !specifier.startsWith("../") && !specifier.startsWith("node:") && !specifier.startsWith("file:") && specifier !== "url") {
        const nodeModulesPath = `${process.cwd()}/${nodeModules}/${specifier}`;
        const packageJson = JSON.parse(fs.readFileSync(path.join(nodeModulesPath, "package.json")));
        const main = packageJson.main ? path.join(nodeModulesPath, packageJson.main) : path.join(nodeModulesPath, "index.js"); 
        resolved = {url: `file://${main}`};
    } else {
      resolved = defaultResolve(specifier, context, defaultResolve);
    }
    // console.error("==============")

    return resolved;
  }
  