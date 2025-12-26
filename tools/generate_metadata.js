/**
 * AI-Powered Blog Metadata Generator
 * 
 * This script automatically generates or updates the `description` and `tags` fields
 * for blog posts using an OpenAI-compatible API.
 * 
 * Usage:
 *   node tools/generate_metadata.js [--file <filename>] [--all] [--dry-run] [--force]
 * 
 * Options:
 *   --file <filename>  Process a specific post file
 *   --all              Process all posts
 *   --dry-run          Preview changes without writing to files
 *   --force            Overwrite existing description/tags
 * 
 * Environment variables (in .env file):
 *   OPENAI_API_ENDPOINT - The OpenAI-compatible API endpoint (e.g., https://api.openai.com/v1)
 *   OPENAI_API_KEY      - Your API key
 *   OPENAI_MODEL        - The model ID to use (e.g., gpt-4, gpt-3.5-turbo)
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found at', envPath);
    console.error('Please create a .env file with the following variables:');
    console.error('  OPENAI_API_ENDPOINT=<your-api-endpoint>');
    console.error('  OPENAI_API_KEY=<your-api-key>');
    console.error('  OPENAI_MODEL=<model-id>');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });

  return env;
}

// Parse existing tags from _config.yml
function getExistingTags(configPath) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(configContent);
  
  const tagMap = config.tag_map || {};
  return Object.keys(tagMap);
}

// Parse blog post frontmatter
function parsePost(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = yaml.load(frontmatterMatch[1]);
  const bodyStart = frontmatterMatch[0].length;
  const body = content.slice(bodyStart).trim();

  return {
    frontmatter,
    body,
    rawContent: content,
    frontmatterStart: 0,
    frontmatterEnd: bodyStart
  };
}

// Save updated post
function savePost(filePath, frontmatter, body, originalContent) {
  // Detect line ending style
  const lineEnding = originalContent.includes('\r\n') ? '\r\n' : '\n';
  
  // Build new frontmatter
  const newFrontmatter = yaml.dump(frontmatter, {
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: false,
    noRefs: true
  }).trim();

  const newContent = `---${lineEnding}${newFrontmatter.replace(/\n/g, lineEnding)}${lineEnding}---${lineEnding}${body.replace(/\n/g, lineEnding)}`;
  
  fs.writeFileSync(filePath, newContent, 'utf8');
}

// Call OpenAI API to generate metadata
async function generateMetadata(env, postContent, existingTags, needDescription, needTags) {
  const endpoint = env.OPENAI_API_ENDPOINT.replace(/\/$/, '');
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL;

  const existingTagsList = existingTags.join(', ');
  
  let prompt = `你是一个专业的博客SEO专家。请分析以下博客文章内容，并提供元数据。

现有的可用标签列表：
${existingTagsList}

博客文章内容：
${postContent.slice(0, 6000)}  <!-- 截断以避免token过多 -->

请以JSON格式返回结果，包含以下字段：
`;

  if (needDescription) {
    prompt += `
- "description": 一个简洁的SEO友好描述（50-150字），准确概括文章主题和核心内容，吸引用户点击。`;
  }

  if (needTags) {
    prompt += `
- "matchedTags": 从现有标签列表中选择最相关的标签（数组形式）
- "suggestedNewTags": 如果现有标签不够描述文章内容，建议的新标签（数组形式，仅在必要时添加，尽量控制在1-3个）`;
  }

  prompt += `

注意事项：
1. 标签应该精确反映文章的技术栈、主题和关键概念
2. 优先使用现有标签，只有在现有标签明显不够时才建议新标签
3. 新建议的标签应该是有价值的、可复用的，避免过于具体或一次性的标签
4. description 应该包含文章的关键词，便于搜索引擎优化

请只返回JSON对象，不要包含其他文字说明。`;

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的博客SEO专家，专注于技术博客的元数据优化。请只返回JSON格式的结果。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const resultText = data.choices[0].message.content.trim();
  
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = resultText;
  const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr);
}

// Process a single post
async function processPost(filePath, env, existingTags, options) {
  const fileName = path.basename(filePath);
  console.log(`\nProcessing: ${fileName}`);

  const post = parsePost(filePath);
  if (!post) {
    console.log(`  Skipping: Invalid frontmatter`);
    return { status: 'skipped', reason: 'invalid frontmatter' };
  }

  const needDescription = !post.frontmatter.description || options.force;
  const needTags = !post.frontmatter.tags || post.frontmatter.tags.length === 0 || options.force;

  if (!needDescription && !needTags) {
    console.log(`  Skipping: Already has description and tags`);
    return { status: 'skipped', reason: 'already complete' };
  }

  console.log(`  Need description: ${needDescription}, Need tags: ${needTags}`);

  // Build content for analysis
  const contentForAnalysis = `
标题: ${post.frontmatter.title || fileName}
分类: ${post.frontmatter.categories ? (Array.isArray(post.frontmatter.categories) ? post.frontmatter.categories.join(', ') : post.frontmatter.categories) : '无'}
现有标签: ${post.frontmatter.tags ? (Array.isArray(post.frontmatter.tags) ? post.frontmatter.tags.join(', ') : post.frontmatter.tags) : '无'}

正文:
${post.body}
`.trim();

  try {
    const result = await generateMetadata(env, contentForAnalysis, existingTags, needDescription, needTags);
    console.log(`  AI Response:`, JSON.stringify(result, null, 2));

    // Apply changes
    const newFrontmatter = { ...post.frontmatter };
    const changes = [];

    if (needDescription && result.description) {
      newFrontmatter.description = result.description;
      changes.push(`description: "${result.description}"`);
    }

    if (needTags) {
      const allTags = [
        ...(result.matchedTags || []),
        ...(result.suggestedNewTags || [])
      ];
      
      if (allTags.length > 0) {
        // Merge with existing tags if not forcing
        if (!options.force && post.frontmatter.tags) {
          const existingPostTags = Array.isArray(post.frontmatter.tags) 
            ? post.frontmatter.tags 
            : [post.frontmatter.tags];
          const mergedTags = [...new Set([...existingPostTags, ...allTags])];
          newFrontmatter.tags = mergedTags;
        } else {
          newFrontmatter.tags = allTags;
        }
        changes.push(`tags: [${newFrontmatter.tags.join(', ')}]`);
        
        if (result.suggestedNewTags && result.suggestedNewTags.length > 0) {
          console.log(`  New tags suggested: ${result.suggestedNewTags.join(', ')}`);
          console.log(`  (These will be added to tag_map when sync_tags runs)`);
        }
      }
    }

    if (changes.length === 0) {
      console.log(`  No changes needed`);
      return { status: 'unchanged' };
    }

    console.log(`  Changes:`);
    changes.forEach(c => console.log(`    - ${c}`));

    if (!options.dryRun) {
      savePost(filePath, newFrontmatter, post.body, post.rawContent);
      console.log(`  Saved!`);
    } else {
      console.log(`  (Dry run - not saved)`);
    }

    return { 
      status: 'updated', 
      changes,
      newTags: result.suggestedNewTags || []
    };

  } catch (error) {
    console.error(`  Error processing:`, error.message);
    return { status: 'error', error: error.message };
  }
}

// Get all post files
function getAllPosts(postsDir) {
  const files = fs.readdirSync(postsDir);
  return files
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(postsDir, f));
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    all: false,
    dryRun: false,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
        options.file = args[++i];
        break;
      case '--all':
        options.all = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
    }
  }

  return options;
}

// Main function
async function main() {
  const options = parseArgs();
  
  if (!options.file && !options.all) {
    console.log('Usage: node scripts/generate_metadata.js [--file <filename>] [--all] [--dry-run] [--force]');
    console.log('');
    console.log('Options:');
    console.log('  --file <filename>  Process a specific post file');
    console.log('  --all              Process all posts');
    console.log('  --dry-run          Preview changes without writing to files');
    console.log('  --force            Overwrite existing description/tags');
    process.exit(1);
  }

  console.log('=== AI Blog Metadata Generator ===');
  if (options.dryRun) {
    console.log('Mode: DRY RUN (no files will be modified)');
  }
  if (options.force) {
    console.log('Mode: FORCE (will overwrite existing metadata)');
  }

  // Load environment
  const env = loadEnv();
  console.log(`API Endpoint: ${env.OPENAI_API_ENDPOINT}`);
  console.log(`Model: ${env.OPENAI_MODEL}`);

  // Load existing tags from config
  const configPath = path.join(__dirname, '..', '_config.yml');
  const existingTags = getExistingTags(configPath);
  console.log(`Existing tags: ${existingTags.length} tags found`);

  // Determine which files to process
  const postsDir = path.join(__dirname, '..', 'source', '_posts');
  let filesToProcess = [];

  if (options.file) {
    const filePath = path.isAbsolute(options.file) 
      ? options.file 
      : path.join(postsDir, options.file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    filesToProcess.push(filePath);
  } else if (options.all) {
    filesToProcess = getAllPosts(postsDir);
  }

  console.log(`Files to process: ${filesToProcess.length}`);

  // Process files
  const results = {
    updated: 0,
    skipped: 0,
    errors: 0,
    newTags: new Set()
  };

  for (const filePath of filesToProcess) {
    const result = await processPost(filePath, env, existingTags, options);
    
    if (result.status === 'updated') {
      results.updated++;
      if (result.newTags) {
        result.newTags.forEach(t => results.newTags.add(t));
      }
    } else if (result.status === 'error') {
      results.errors++;
    } else {
      results.skipped++;
    }

    // Add a small delay between API calls to avoid rate limiting
    if (filesToProcess.indexOf(filePath) < filesToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Updated: ${results.updated}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);
  
  if (results.newTags.size > 0) {
    console.log(`\nNew tags added: ${[...results.newTags].join(', ')}`);
    console.log('\nDon\'t forget to run sync_tags to add new tags to tag_map:');
    console.log('  npx hexo sync-tags');
  }
}

main().catch(console.error);
