import fs from 'fs'
import * as path from 'path'

const rootPath = path.resolve(__dirname, '../../')
const modulesBasePath = 'src/modules'
const tsJsonPath = './tsconfig.json'

function registerModulesAlias() {
  const modulesAlias = {}
  const pattern = path.resolve(rootPath, modulesBasePath)
  const folders = fs.readdirSync(pattern)

  for (const name of folders || []) {
    const configPath = path.resolve(rootPath, modulesBasePath, `${name}/config.json`)

    if (!fs.existsSync(configPath)) continue

    try {
      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (content.aliasName) {
        modulesAlias[content.aliasName] = path.resolve(modulesBasePath, name)
      }
    } catch (err) {
      console.warn(`读取或解析 ${configPath} 时出错:`, err)
    }
  }
  return modulesAlias
}

function generateTsconfigPaths() {
  // 读取 tsconfig.json
  const tsconfigPath = path.resolve(rootPath, tsJsonPath)
  const modulesDir = path.resolve(rootPath, modulesBasePath)
  let tsconfig;

  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading tsconfig.json at ${tsconfigPath}:`, e);
    // 如果文件不存在或格式不正确，则创建一个新的基本结构
    tsconfig = {
      compilerOptions: {
        baseUrl: ".",
        paths: {}
      }
    };
  }

  // 确保 compilerOptions 和 paths 存在
  tsconfig.compilerOptions = tsconfig.compilerOptions || {};
  tsconfig.compilerOptions.paths = tsconfig.compilerOptions.paths || {};

  const newPaths = {};

  if (fs.existsSync(modulesDir)) {
    const moduleNames = fs.readdirSync(modulesDir);
    moduleNames.forEach(moduleName => {
      const modulePath = path.join(modulesDir, moduleName);
      const configPath = path.join(modulePath, 'config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (config.alias) {
            // 示例： "@my-module/*": ["src/modules/my-module/*"]
            newPaths[`@${config.alias}/*`] = [`src/modules/${moduleName}/*`];
            // 如果你还需要一个指向模块根目录的直接别名，可以添加：
            // newPaths[`@${config.alias}`] = [`src/modules/${moduleName}`];
          }
        } catch (e) {
          console.error(`Error parsing config.json in ${modulePath}:`, e);
        }
      }
    });
  }

  // 合并现有路径和新路径，新路径优先
  // 这样可以保留 tsconfig.json 中手动添加的其他 paths
  Object.assign(tsconfig.compilerOptions.paths, newPaths);

  // 写回 tsconfig.json，保持格式美观
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf-8');
  console.log('tsconfig.json paths updated successfully.');
}

export { registerModulesAlias, generateTsconfigPaths }
