// scripts/build.js
const { execSync } = require('child_process');
const glob = require('glob');
const fs = require('fs').promises;
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('terser');
const archiver = require('archiver');
const Client = require('ssh2').Client;
require('dotenv').config();

// 远程部署目录
const REMOTE_DEPLOY_PATH = '/www/wwwroot/account-bot-backend';

// 远程服务器配置
const sshConfig = {
  host: process.env.SSH_HOST,
  port: 22,
  username: 'root',
  // privateKey: require('fs').readFileSync('C:/Users/Administrator/.ssh/id_rsa')
  privateKey: require('fs').readFileSync('/root/.ssh/id_rsa')
};

// 清理并编译
execSync('rimraf dist && tsc -p tsconfig.json');

// 混淆和压缩
async function processFiles() {
  const files = glob.sync('dist/**/*.js');
  for (const file of files) {
    let code = await fs.readFile(file, 'utf8');
    
    // 混淆
    code = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      stringArrayEncoding: ['rc4']
    }).getObfuscatedCode();

    // 压缩
    const result = await minify(code, {
      compress: true,
      mangle: true
    });
    if (result.error) throw result.error;

    await fs.writeFile(file, result.code);
  }

  // 创建 build 目录
  await fs.mkdir('build', { recursive: true });

  // 创建 zip 文件流
  const output = require('fs').createWriteStream('build/dist.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // 最大压缩级别
  });

  // 监听压缩完成事件
  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory('dist/', false);
    archive.finalize();
  });

  // 上传并解压文件到远程服务器
  await uploadAndExtract();
}

// 上传并解压文件到远程服务器
async function uploadAndExtract() {
  const conn = new Client();
  
  await new Promise((resolve, reject) => {
    conn.on('ready', async () => {
      try {
        // 上传文件
        await new Promise((res, rej) => {
          conn.sftp((err, sftp) => {
            if (err) rej(err);
            const uploads = [
              { src: 'build/dist.zip', dest: `${REMOTE_DEPLOY_PATH}/dist.zip` },
              { src: 'package.json', dest: `${REMOTE_DEPLOY_PATH}/package.json` },
              { src: 'pnpm-lock.yaml', dest: `${REMOTE_DEPLOY_PATH}/pnpm-lock.yaml` }
            ];
            
            // 串行上传所有文件
            const uploadSequentially = async () => {
              for (const file of uploads) {
                await new Promise((resolve, reject) => {
                  sftp.fastPut(file.src, file.dest, (err) => {
                    if (err) reject(err);
                    resolve();
                  });
                });
              }
            };
            
            uploadSequentially()
              .then(res)
              .catch(rej);
          });
        });

        // 解压文件并安装依赖
        await new Promise((res, rej) => {
          conn.exec(
            `cd ${REMOTE_DEPLOY_PATH} && mkdir -p dist && unzip -o dist.zip -d dist && rm dist.zip`,
            (err, stream) => {
              if (err) rej(err);
              stream.on('close', res);
              stream.on('data', (data) => console.log('STDOUT: ' + data));
            }
          );
        });

        resolve();
      } catch (error) {
        reject(error);
      } finally {
        conn.end();
      }
    }).connect(sshConfig);
  });
}

processFiles().catch(console.error);