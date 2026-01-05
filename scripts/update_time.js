const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 需要排除的自动提交信息模式（这些提交不应该影响 updated 时间）
// 只排除 "chore:" 开头的提交，这是自动更新时间戳脚本使用的格式
const EXCLUDED_COMMIT_PATTERN = 'chore:';

/**
 * 获取文件的 git commit 历史（排除自动提交）
 * @param {string} filePath - 文件路径
 * @param {string} baseDir - git 仓库根目录
 * @returns {string[]} - commit 列表 (ISO 格式时间戳)
 */
function getGitCommitHistory(filePath, baseDir) {
  try {
    // 使用 --invert-grep 和 --fixed-strings 来精确排除 chore: 开头的提交
    // 这样可以避免正则表达式匹配问题
    const result = execSync(
      `git log --follow --format="%aI" --invert-grep --fixed-strings --grep="${EXCLUDED_COMMIT_PATTERN}" -- "${filePath}"`,
      { cwd: baseDir, encoding: 'utf-8' }
    );
    return result.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * 解析 front-matter
 * @param {string} content - 文件内容
 * @returns {{ frontMatter: string, body: string, startIndex: number, endIndex: number } | null}
 */
function parseFrontMatter(content) {
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(frontMatterRegex);
  if (!match) {
    return null;
  }
  return {
    frontMatter: match[1],
    body: content.slice(match[0].length),
    startIndex: 0,
    endIndex: match[0].length,
    fullMatch: match[0]
  };
}

/**
 * 格式化时间为 ISO 格式（中国时区 UTC+8）
 * @param {string} isoTime - ISO 时间字符串
 * @returns {string}
 */
function formatTime(isoTime) {
  const date = new Date(isoTime);
  
  // 转换为中国时区 (UTC+8)
  const offset = 8 * 60; // 中国时区偏移量（分钟）
  const localTime = new Date(date.getTime() + offset * 60 * 1000);
  
  // 格式化为与原格式一致的 .000Z 风格
  return localTime.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

/**
 * 更新或添加 update 字段到 front-matter
 * @param {string} frontMatter - front-matter 内容
 * @param {string} updateTime - 更新时间
 * @param {string} lineEnding - 行结束符
 * @returns {string}
 */
function updateFrontMatterWithTime(frontMatter, updateTime, lineEnding) {
  const lines = frontMatter.split(/\r?\n/);
  let updatedIndex = -1;
  
  // 查找现有的 updated 字段
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^updated:/)) {
      updatedIndex = i;
      break;
    }
  }
  
  const formattedTime = formatTime(updateTime);
  
  if (updatedIndex !== -1) {
    // 更新现有的 updated 字段
    lines[updatedIndex] = `updated: ${formattedTime}`;
  } else {
    // 在 date 字段后添加 updated 字段
    let dateIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^date:/)) {
        dateIndex = i;
        break;
      }
    }
    
    if (dateIndex !== -1) {
      // 在 date 后插入
      lines.splice(dateIndex + 1, 0, `updated: ${formattedTime}`);
    } else {
      // 如果没有 date 字段，在第一行（通常是 title）后插入
      lines.splice(1, 0, `updated: ${formattedTime}`);
    }
  }
  
  return lines.join(lineEnding);
}

/**
 * 移除 front-matter 中的 updated 字段
 * @param {string} frontMatter - front-matter 内容
 * @param {string} lineEnding - 行结束符
 * @returns {string}
 */
function removeFrontMatterUpdated(frontMatter, lineEnding) {
  const lines = frontMatter.split(/\r?\n/);
  const filteredLines = lines.filter(line => !line.match(/^updated:/));
  return filteredLines.join(lineEnding);
}

/**
 * 处理单个文件
 * @param {string} filePath - 文件路径
 * @param {string} baseDir - git 仓库根目录
 * @param {object} log - 日志对象
 * @returns {boolean} - 是否有修改
 */
function processFile(filePath, baseDir, log) {
  const commits = getGitCommitHistory(filePath, baseDir);
  
  if (commits.length === 0) {
    log.debug(`[Update Time] 跳过 ${path.basename(filePath)}: 未找到 git 历史`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
  
  const parsed = parseFrontMatter(content);
  if (!parsed) {
    log.warn(`[Update Time] 跳过 ${path.basename(filePath)}: 无法解析 front-matter`);
    return false;
  }
  
  const hasExistingUpdated = /^updated:/m.test(parsed.frontMatter);
  
  if (commits.length === 1) {
    // 只有一个 commit，不需要 update
    if (hasExistingUpdated) {
      // 但如果已存在 updated 字段，应该移除它
      const newFrontMatter = removeFrontMatterUpdated(parsed.frontMatter, lineEnding);
      const newContent = `---${lineEnding}${newFrontMatter}${lineEnding}---${parsed.body}`;
      fs.writeFileSync(filePath, newContent, 'utf-8');
      log.info(`[Update Time] ${path.basename(filePath)}: 移除了 updated 字段（只有一次提交）`);
      return true;
    }
    log.debug(`[Update Time] 跳过 ${path.basename(filePath)}: 只有一次提交，无需 updated`);
    return false;
  }
  
  // 多个 commit，取最新的 commit 时间作为 updated
  const latestCommitTime = commits[0];
  
  // 更新 front-matter
  const newFrontMatter = updateFrontMatterWithTime(parsed.frontMatter, latestCommitTime, lineEnding);
  const newContent = `---${lineEnding}${newFrontMatter}${lineEnding}---${parsed.body}`;
  
  // 只有内容不同时才写入
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    const action = hasExistingUpdated ? '更新' : '添加';
    log.info(`[Update Time] ${path.basename(filePath)}: ${action} updated 为 ${formatTime(latestCommitTime)}`);
    return true;
  }
  
  return false;
}

/**
 * 同步所有文章的 update 时间
 * @param {object} hexoInstance - Hexo 实例
 */
async function syncUpdateTime(hexoInstance) {
  const postsDir = path.join(hexoInstance.source_dir, '_posts');
  const baseDir = hexoInstance.base_dir;
  
  if (!fs.existsSync(postsDir)) {
    hexoInstance.log.warn('[Update Time] _posts 目录不存在');
    return;
  }
  
  const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
  let modifiedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(postsDir, file);
    if (processFile(filePath, baseDir, hexoInstance.log)) {
      modifiedCount++;
    }
  }
  
  if (modifiedCount > 0) {
    hexoInstance.log.info(`[Update Time] 共更新 ${modifiedCount} 个文件`);
  } else {
    hexoInstance.log.debug('[Update Time] 没有文件需要更新');
  }
}

// 注册 Hexo 命令：hexo update-time
hexo.extend.console.register('update-time', '根据 git 历史同步文章的 update 时间', async function(args) {
  await this.load();
  await syncUpdateTime(this);
});
