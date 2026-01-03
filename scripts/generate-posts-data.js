/**
 * 生成文章数据 JSON 文件
 * 用于推荐阅读功能
 * 包含文章内容的 MD5 和 Embedding
 * 并计算 Top 5 相关文章
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// 读取环境变量
function getEnv(key) {
  if (process.env[key]) {
    return process.env[key];
  }
  const envPath = path.join(hexo.base_dir, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

// 移除 Front Matter
function stripFrontMatter(content) {
  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) {
      return content.substring(end + 3).trim();
    }
  }
  return content;
}

// 计算 MD5
function calculateMD5(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

// 计算余弦相似度
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 调用 OpenAI API 获取 Embedding
function getEmbedding(text, apiKey, endpoint, model) {
  return new Promise((resolve, reject) => {
    const baseUrl = endpoint ? endpoint.replace(/\/+$/, '') : 'https://api.openai.com/v1';
    const url = new URL(`${baseUrl}/embeddings`);
    
    const postData = JSON.stringify({
      input: text,
      model: model
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const requestModule = url.protocol === 'http:' ? require('http') : https;

    const req = requestModule.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.data && parsed.data.length > 0) {
              resolve(parsed.data[0].embedding);
            } else {
              reject(new Error('Invalid API response: missing embedding data'));
            }
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else {
          // 不要在错误信息中包含完整响应，可能包含敏感信息
          reject(new Error(`API request failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

hexo.extend.generator.register('posts-data', async function(locals) {
  const log = hexo.log || console;
  const apiKey = getEnv('OPENAI_API_KEY');
  const endpoint = getEnv('OPENAI_BASE_URL') || getEnv('OPENAI_API_ENDPOINT');
  const model = getEnv('OPENAI_EMBEDDING_MODEL');

  if (apiKey && !model) {
    throw new Error('Generate Posts Data: OPENAI_EMBEDDING_MODEL environment variable is required.');
  }

  if (!apiKey) {
    log.warn('Generate Posts Data: OPENAI_API_KEY usually required for embeddings, but not found. Recommendations will be random.');
  }

  // 确保存储目录存在
  const storeDir = path.join(hexo.base_dir, 'embeddings_store');
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir);
  }

  // 加载缓存
  const cachePath = path.join(storeDir, 'cache.json');
  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch (e) {
      log.error('Generate Posts Data: Failed to load cache.', e);
    }
  }

  const posts = locals.posts.sort('-date').toArray();
  const processedPosts = [];
  let cacheUpdated = false;

  // 1. 获取/更新 Embeddings
  for (const post of posts) {
    const rawContent = post.raw || '';
    const body = stripFrontMatter(rawContent);
    const title = post.title || '(无标题)';
    // 组合 Title 和 Body
    const contentForEmbedding = `Title: ${title}\n\n${body}`;
    // 截断内容
    const truncatedContent = contentForEmbedding.slice(0, 30000); 
    const hash = calculateMD5(truncatedContent);
    
    let embedding = null;

    if (cache[post.path] && cache[post.path].hash === hash) {
      embedding = cache[post.path].embedding;
    } else if (apiKey) {
      try {
        log.info(`Generating embedding for: ${title}`);
        embedding = await getEmbedding(truncatedContent, apiKey, endpoint, model);
        cache[post.path] = {
          hash: hash,
          embedding: embedding
        };
        cacheUpdated = true;
      } catch (e) {
        log.error(`Failed to generate embedding for ${title}:`, e.message);
      }
    }

    processedPosts.push({
      post: post,
      embedding: embedding
    });
  }

  // 保存缓存
  if (cacheUpdated) {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }

  // 2. 计算相似度并生成最终数据
  const generatedFiles = [];
  
  // 用于存储所有文章的基本信息（用于回退/随机推荐）
  const indexData = [];

  for (const item of processedPosts) {
    const currentPost = item.post;
    const currentEmbedding = item.embedding;
    let recommendations = [];

    if (currentEmbedding) {
      // 计算与所有其他文章的相似度
      const candidates = processedPosts
        .filter(p => p.post.path !== currentPost.path && p.embedding) // 排除自己且必须有embedding
        .map(p => ({
          title: p.post.title,
          path: p.post.path,
          date: p.post.date.toISOString(),
          similarity: cosineSimilarity(currentEmbedding, p.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity) // 降序
        .slice(0, 5); // 取前5
      
      recommendations = candidates;
    }

    // 构建单篇文章的数据对象
    const postData = {
      title: currentPost.title || '(无标题)',
      path: currentPost.path,
      date: currentPost.date.toISOString(),
      categories: currentPost.categories?.map(cat => cat.name) || [],
      tags: currentPost.tags?.map(tag => tag.name) || [],
      recommendations: recommendations // 包含 Top 5
    };

    // 生成文件路径：将 path 转换为安全的文件名
    // 例如 "2024/01/01/my-post/" -> "2024-01-01-my-post.json"
    const safeFileName = currentPost.path
      .replace(/^\/+|\/+$/g, '') // 移除首尾斜杠
      .replace(/\//g, '-') // 替换斜杠为连字符
      .replace(/\.html?$/, '') // 移除 .html 后缀
      + '.json';

    // 添加到生成文件列表
    generatedFiles.push({
      path: `js/posts-data/${safeFileName}`,
      data: JSON.stringify(postData)
    });

    // 添加到索引（简化版，用于回退和随机推荐）
    indexData.push({
      title: postData.title,
      path: postData.path,
      date: postData.date,
      dataFile: safeFileName // 指向单独的数据文件
    });
  }

  // 添加索引文件
  generatedFiles.push({
    path: 'js/posts-data/index.json',
    data: JSON.stringify(indexData)
  });

  return generatedFiles;
});
