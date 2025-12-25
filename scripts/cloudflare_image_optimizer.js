'use strict';

/**
 * Cloudflare Image Optimization Script for Hexo
 * 
 * Transforms image URLs to use Cloudflare's Image Resizing service:
 * /cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>
 * 
 * Features:
 * - Only applies in production mode (not during local development)
 * - Converts both absolute and relative image URLs
 * - Supports img tags and background images in inline styles
 * - Preserves original URLs for external images (optional)
 * - Configurable via _config.yml
 * 
 * Configuration in _config.yml:
 * cloudflare_image:
 *   enable: true
 *   zone: your-domain.com
 *   options:
 *     format: auto
 *     quality: 85
 *     fit: scale-down
 *   allowed_domains:
 *     - your-domain.com
 *   exclude_paths:
 *     - /favicon
 *     - .ico
 *     - .svg
 */

/**
 * Check if we're in local development mode
 * Returns true if running `hexo server`
 */
function isLocalDevelopment() {
  // During `hexo server`, process.argv usually contains 'server' or 's'
  const args = process.argv.slice(2);
  const isServer = args.some(arg => 
    arg === 'server' || 
    arg === 's' || 
    arg.startsWith('server')
  );
  
  // Also check for explicit development environment
  const env = process.env.NODE_ENV || '';
  const isDev = env === 'development';
  
  return isServer || isDev;
}

/**
 * Convert options object to Cloudflare format string
 */
function buildOptionsString(options) {
  return Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

/**
 * Create the image processor with the given configuration
 */
function createImageProcessor(hexoConfig) {
  const config = hexoConfig.cloudflare_image || {};
  
  // Default configuration
  const zone = config.zone || hexoConfig.url?.replace(/^https?:\/\//, '').split('/')[0] || '';
  const options = config.options || {
    format: 'auto',
    quality: 85,
    fit: 'scale-down',
  };
  const allowedDomains = config.allowed_domains || [zone];
  const excludePaths = config.exclude_paths || ['/favicon', '.ico', '.svg'];

  /**
   * Check if the URL should be excluded from transformation
   */
  function shouldExclude(url) {
    if (!url) return true;
    
    // Exclude data URIs
    if (url.startsWith('data:')) return true;
    
    // Exclude already transformed URLs
    if (url.includes('/cdn-cgi/image/')) return true;
    
    // Exclude blob URLs
    if (url.startsWith('blob:')) return true;
    
    // Check excluded paths
    return excludePaths.some(path => url.toLowerCase().includes(path.toLowerCase()));
  }

  /**
   * Check if the URL is from an allowed domain
   */
  function isAllowedDomain(url) {
    // If no domains specified, allow all
    if (allowedDomains.length === 0) return true;
    
    // Relative URLs are from our own domain
    if (url.startsWith('/') && !url.startsWith('//')) return true;
    
    // Check if URL matches any allowed domain
    return allowedDomains.some(domain => url.includes(domain));
  }

  /**
   * Transform an image URL to use Cloudflare's image optimization
   */
  function transformImageUrl(originalUrl, customOptions = {}) {
    if (shouldExclude(originalUrl) || !isAllowedDomain(originalUrl)) {
      return originalUrl;
    }
    
    // Merge default options with custom options
    const mergedOptions = { ...options, ...customOptions };
    const optionsString = buildOptionsString(mergedOptions);
    
    let sourceImage = originalUrl;
    
    // Handle absolute URLs from our domain
    if (originalUrl.includes(zone)) {
      // Extract the path from the full URL
      try {
        const url = new URL(originalUrl);
        sourceImage = url.pathname;
      } catch {
        // If URL parsing fails, use the original
        sourceImage = originalUrl;
      }
    }
    
    // Handle relative URLs (starting with /)
    if (sourceImage.startsWith('/')) {
      // Build the Cloudflare optimized URL (relative path)
      return `/cdn-cgi/image/${optionsString}${sourceImage}`;
    }
    
    // Handle full URLs - extract just the path portion
    try {
      const url = new URL(sourceImage);
      const path = url.pathname + (url.search || '');
      return `/cdn-cgi/image/${optionsString}${path}`;
    } catch {
      // If it's not a valid URL, try to use it as a path
      const cleanPath = sourceImage.startsWith('/') ? sourceImage : `/${sourceImage}`;
      return `/cdn-cgi/image/${optionsString}${cleanPath}`;
    }
  }

  /**
   * Process HTML content and transform image URLs
   */
  function processHtmlContent(content) {
    if (!content || typeof content !== 'string') return content;
    
    let result = content;
    
    // Transform <img> tag src attributes
    // Matches: <img ... src="..." ...>
    result = result.replace(
      /(<img\s+[^>]*\bsrc\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
      (match, before, url, after) => {
        const transformedUrl = transformImageUrl(url.trim());
        return before + transformedUrl + after;
      }
    );
    
    // Transform <link> tag href attributes for image resources (favicon, apple-touch-icon, etc.)
    // Matches: <link ... href="....(png|jpg|jpeg|gif|webp|avif|ico)" ...>
    result = result.replace(
      /(<link\s+[^>]*\bhref\s*=\s*["'])([^"']+\.(png|jpg|jpeg|gif|webp|avif))([^"']*["'][^>]*>)/gi,
      (match, before, url, ext, after) => {
        const transformedUrl = transformImageUrl(url.trim());
        return before + transformedUrl + after;
      }
    );
    
    // Transform <img> tag srcset attributes
    // Matches srcset with multiple sources
    result = result.replace(
      /(<img\s+[^>]*\bsrcset\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
      (match, before, srcset, after) => {
        // Transform each URL in srcset
        const transformedSrcset = srcset.split(',').map(source => {
          const parts = source.trim().split(/\s+/);
          if (parts.length >= 1) {
            parts[0] = transformImageUrl(parts[0]);
          }
          return parts.join(' ');
        }).join(', ');
        return before + transformedSrcset + after;
      }
    );
    
    // Transform <source> tag srcset attributes (for <picture> elements)
    result = result.replace(
      /(<source\s+[^>]*\bsrcset\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
      (match, before, srcset, after) => {
        const transformedSrcset = srcset.split(',').map(source => {
          const parts = source.trim().split(/\s+/);
          if (parts.length >= 1) {
            parts[0] = transformImageUrl(parts[0]);
          }
          return parts.join(' ');
        }).join(', ');
        return before + transformedSrcset + after;
      }
    );
    
    // Transform background-image in inline styles
    // Matches: style="... background-image: url(...) ..."
    result = result.replace(
      /(style\s*=\s*["'][^"']*background(?:-image)?\s*:[^;]*url\s*\(\s*["']?)([^"')]+)(["']?\s*\)[^"']*["'])/gi,
      (match, before, url, after) => {
        const transformedUrl = transformImageUrl(url.trim());
        return before + transformedUrl + after;
      }
    );
    
    // Transform <a> tag href attributes that point to images
    // Only transform if the href clearly points to an image file
    result = result.replace(
      /(<a\s+[^>]*\bhref\s*=\s*["'])([^"']+\.(jpg|jpeg|png|gif|webp|avif))([^"']*["'][^>]*>)/gi,
      (match, before, url, ext, after) => {
        const transformedUrl = transformImageUrl(url.trim());
        return before + transformedUrl + after;
      }
    );
    
    // Transform CSS url() in <style> tags
    result = result.replace(
      /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (match, openTag, cssContent, closeTag) => {
        const transformedCss = cssContent.replace(
          /url\s*\(\s*["']?([^)"']+\.(jpg|jpeg|png|gif|webp|avif))["']?\s*\)/gi,
          (urlMatch, url) => {
            const transformedUrl = transformImageUrl(url.trim());
            return `url("${transformedUrl}")`;
          }
        );
        return openTag + transformedCss + closeTag;
      }
    );
    
    return result;
  }

  return {
    transformImageUrl,
    processHtmlContent,
  };
}

// Main execution
const config = hexo.config.cloudflare_image || {};
const isEnabled = config.enable !== false; // Default to enabled if not specified

if (!isEnabled) {
  hexo.log.info('[Cloudflare Image] Disabled in configuration');
} else if (isLocalDevelopment()) {
  hexo.log.info('[Cloudflare Image] Local development mode - image optimization disabled');
} else {
  const zone = config.zone || hexo.config.url?.replace(/^https?:\/\//, '').split('/')[0] || 'unknown';
  hexo.log.info(`[Cloudflare Image] Production mode - optimizing images via ${zone}`);
  
  const processor = createImageProcessor(hexo.config);
  
  // Register after_render filter for HTML content
  hexo.extend.filter.register('after_render:html', function(content, data) {
    return processor.processHtmlContent(content);
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createImageProcessor,
    isLocalDevelopment,
    buildOptionsString,
  };
}
