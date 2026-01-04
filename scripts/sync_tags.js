const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml');

// Check if a string contains Chinese characters
function containsChinese(str) {
  return /[\u4e00-\u9fff]/.test(str);
}

// Make HTTPS request (promisified)
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    }).on('error', reject);
  });
}

// Translate Chinese text to English using MyMemory API
async function translateToEnglish(text, hexoLog) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|en`;
    const data = await httpsGet(url);
    
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      // Convert to lowercase and replace spaces with hyphens
      return translated.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    } else {
      hexoLog.warn(`[Sync Tags] Translation failed for "${text}": ${data.responseDetails || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    hexoLog.warn(`[Sync Tags] Translation request failed for "${text}": ${error.message}`);
    return null;
  }
}

// Generate slug for a tag (translate if Chinese, otherwise just format)
async function generateSlug(tag, hexoLog) {
  if (containsChinese(tag)) {
    const translated = await translateToEnglish(tag, hexoLog);
    if (translated && translated.length > 0) {
      hexoLog.debug(`[Sync Tags] Translated "${tag}" to "${translated}"`);
      return translated;
    }
    // Fallback: use pinyin-style slug or just lowercase
    return tag.toLowerCase().replace(/\s+/g, '-');
  }
  // For non-Chinese tags, just lowercase and hyphenate
  return tag.toLowerCase().replace(/\s+/g, '-');
}

async function syncTags(hexoInstance) {
  const posts = hexoInstance.locals.get('posts');
  const tags = new Set();

  posts.forEach(post => {
    post.tags.forEach(tag => {
      tags.add(tag.name);
    });
  });

  const configPath = path.join(hexoInstance.base_dir, '_config.yml');
  const configContent = fs.readFileSync(configPath, 'utf8');

  // Detect line ending style (CRLF or LF)
  const lineEnding = configContent.includes('\r\n') ? '\r\n' : '\n';

  // Parse YAML to get existing tag_map
  let config;
  try {
    config = yaml.load(configContent);
  } catch (e) {
    hexoInstance.log.error(`[Sync Tags] Failed to parse _config.yml: ${e.message}`);
    return;
  }

  const existingTagMap = config.tag_map || {};
  const newTags = [];

  // Find tags that don't exist in tag_map
  tags.forEach(tag => {
    if (!(tag in existingTagMap)) {
      newTags.push(tag);
    }
  });

  if (newTags.length === 0) {
    return; // No new tags to add
  }

  // Generate slugs for new tags (with translation for Chinese tags)
  const tagSlugPairs = [];
  for (const tag of newTags) {
    const slug = await generateSlug(tag, hexoInstance.log);
    tagSlugPairs.push({ tag, slug });
  }

  // Build updated tag_map
  const updatedTagMap = { ...existingTagMap };
  tagSlugPairs.forEach(({ tag, slug }) => {
    updatedTagMap[tag] = slug;
  });

  // Update config object
  config.tag_map = updatedTagMap;

  // Normalize content to LF for easier processing
  const normalizedContent = configContent.replace(/\r\n/g, '\n');

  // Find and replace the tag_map section using regex
  // This regex matches from "tag_map:" to the next unindented non-empty line or end of file
  const tagMapRegex = /^tag_map:[ \t]*(?:\n(?:[ \t]+[^\n]*)?)*\n?/m;
  const match = normalizedContent.match(tagMapRegex);

  let updatedContent;

  if (match) {
    // Build new tag_map section
    const tagMapLines = ['tag_map:'];
    Object.entries(updatedTagMap).forEach(([key, value]) => {
      tagMapLines.push(`  ${key}: ${value}`);
    });
    const newTagMapSection = tagMapLines.join('\n') + '\n';

    // Replace the old tag_map section
    updatedContent = normalizedContent.slice(0, match.index) + 
                     newTagMapSection + 
                     normalizedContent.slice(match.index + match[0].length);
  } else {
    // tag_map doesn't exist, find a good place to insert it
    // Try to insert after category_map or at the end of Category & Tag section
    const categoryTagSection = /# Category & Tag\n/;
    const sectionMatch = normalizedContent.match(categoryTagSection);
    
    if (sectionMatch) {
      // Find the end of this section (next # comment or end of file)
      const afterSection = normalizedContent.slice(sectionMatch.index + sectionMatch[0].length);
      const nextSectionMatch = afterSection.match(/\n# /);
      const insertPoint = nextSectionMatch 
        ? sectionMatch.index + sectionMatch[0].length + nextSectionMatch.index
        : normalizedContent.length;
      
      const tagMapLines = ['tag_map:'];
      Object.entries(updatedTagMap).forEach(([key, value]) => {
        tagMapLines.push(`  ${key}: ${value}`);
      });
      const newTagMapSection = tagMapLines.join('\n') + '\n';
      
      updatedContent = normalizedContent.slice(0, insertPoint) + 
                       newTagMapSection + 
                       normalizedContent.slice(insertPoint);
    } else {
      // Fallback: append at the end
      const tagMapLines = ['tag_map:'];
      Object.entries(updatedTagMap).forEach(([key, value]) => {
        tagMapLines.push(`  ${key}: ${value}`);
      });
      updatedContent = normalizedContent + '\n' + tagMapLines.join('\n') + '\n';
    }
  }

  // Convert back to original line ending style if needed
  if (lineEnding === '\r\n') {
    updatedContent = updatedContent.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(configPath, updatedContent, 'utf8');
  hexoInstance.log.info(`[Sync Tags] Added ${newTags.length} new tags to _config.yml: ${newTags.join(', ')}`);

  // Update in-memory config so it applies to the current build
  if (!hexoInstance.config.tag_map) hexoInstance.config.tag_map = {};
  tagSlugPairs.forEach(({ tag, slug }) => {
    hexoInstance.config.tag_map[tag] = slug;
  });
}

hexo.extend.console.register('sync-tags', 'Sync tags from posts to _config.yml tag_map', async function(args) {
  await this.load();
  await syncTags(this);
});

hexo.extend.filter.register('before_generate', async function() {
  await syncTags(this);
});
