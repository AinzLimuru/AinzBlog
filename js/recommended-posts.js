/**
 * 推荐阅读功能
 * 在文章页面随机展示推荐文章
 */
(function() {
  'use strict';

  // 配置项
  const CONFIG = {
    numRecommended: 5,           // 推荐文章数量
    containerSelector: '.post-navigation', // 插入位置（在导航后面）
    fallbackSelector: '.kratos-entry-footer', // 备用插入位置
    dataPath: '/js/posts-data.json' // 文章数据路径
  };

  // 注入样式
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .recommended-posts {
        background: var(--kr-theme-card-bg, #ffffffcc);
        border-radius: 8px;
        padding: 20px 25px;
        margin: 20px 0;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        transition: all 0.3s ease;
      }
      
      .recommended-posts:hover {
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        transform: translateY(-2px);
      }
      
      .recommended-posts-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--kr-theme-text, #000);
        margin-bottom: 15px;
        padding-bottom: 12px;
        border-bottom: 2px solid var(--kr-theme-link, #1e8cdb);
      }
      
      .recommended-posts-title i {
        color: var(--kr-theme-link, #1e8cdb);
        font-size: 1.2rem;
      }
      
      .recommended-posts-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 10px;
      }
      
      .recommended-posts-item {
        position: relative;
        padding-left: 0;
        transition: all 0.2s ease;
      }
      
      .recommended-posts-item a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 15px;
        background: var(--kr-theme-info-bg, #e0e0e0aa);
        border-radius: 6px;
        color: var(--kr-theme-text, #000);
        text-decoration: none;
        transition: all 0.25s ease;
        border-left: 3px solid transparent;
      }
      
      .recommended-posts-item a:hover {
        background: var(--kr-theme-link, #1e8cdb);
        color: #fff;
        border-left-color: var(--kr-theme-link-hover, #6ec3f5);
        transform: translateX(5px);
      }
      
      .recommended-posts-item a i {
        font-size: 0.9rem;
        opacity: 0.8;
        flex-shrink: 0;
      }
      
      .recommended-posts-item a:hover i {
        opacity: 1;
      }
      
      .recommended-posts-item .post-title-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .recommended-posts-item .post-date {
        font-size: 0.8rem;
        opacity: 0.7;
        flex-shrink: 0;
      }
      
      .recommended-posts-loading {
        text-align: center;
        padding: 20px;
        color: var(--kr-theme-text-alt, #666);
      }
      
      .recommended-posts-empty {
        text-align: center;
        padding: 15px;
        color: var(--kr-theme-text-alt, #666);
        font-style: italic;
      }
      
      /* 响应式适配 */
      @media (max-width: 768px) {
        .recommended-posts {
          padding: 15px 18px;
          margin: 15px 0;
        }
        
        .recommended-posts-item a {
          padding: 10px 12px;
        }
        
        .recommended-posts-item .post-date {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 获取当前页面路径
  function getCurrentPath() {
    return window.location.pathname;
  }

  // Fisher-Yates 洗牌算法
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 格式化日期
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 创建推荐阅读容器
  function createContainer() {
    const container = document.createElement('div');
    container.className = 'recommended-posts';
    container.innerHTML = `
      <div class="recommended-posts-title">
        <i class="fa fa-star"></i>
        <span>推荐阅读</span>
      </div>
      <div class="recommended-posts-loading">
        <i class="fa fa-spinner fa-spin"></i> 加载中...
      </div>
    `;
    return container;
  }

  // 渲染推荐文章列表
  function renderPosts(container, posts) {
    const currentPath = getCurrentPath();
    
    // 过滤掉当前文章
    const filteredPosts = posts.filter(post => {
      const postPath = post.path.startsWith('/') ? post.path : '/' + post.path;
      return postPath !== currentPath && !currentPath.endsWith(post.path);
    });
    
    // 随机抽取
    const shuffled = shuffleArray(filteredPosts);
    const recommended = shuffled.slice(0, CONFIG.numRecommended);
    
    // 清除加载状态
    const loading = container.querySelector('.recommended-posts-loading');
    if (loading) loading.remove();
    
    // 如果没有推荐文章
    if (recommended.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'recommended-posts-empty';
      empty.textContent = '暂无推荐文章';
      container.appendChild(empty);
      return;
    }
    
    // 创建列表
    const list = document.createElement('ul');
    list.className = 'recommended-posts-list';
    
    recommended.forEach(post => {
      const item = document.createElement('li');
      item.className = 'recommended-posts-item';
      
      const link = document.createElement('a');
      link.href = post.path.startsWith('/') ? post.path : '/' + post.path;
      link.title = post.title;
      
      link.innerHTML = `
        <i class="fa fa-bookmark-o"></i>
        <span class="post-title-text">${post.title}</span>
        <span class="post-date">${formatDate(post.date)}</span>
      `;
      
      item.appendChild(link);
      list.appendChild(item);
    });
    
    container.appendChild(list);
  }

  // 插入到页面
  function insertContainer(container) {
    // 优先尝试在 post-navigation 后面插入
    let target = document.querySelector(CONFIG.containerSelector);
    if (target) {
      target.after(container);
      return true;
    }
    
    // 备用：在 footer 后面插入
    target = document.querySelector(CONFIG.fallbackSelector);
    if (target) {
      target.after(container);
      return true;
    }
    
    // 最后尝试：在 article 结尾插入
    const article = document.querySelector('article');
    if (article) {
      article.appendChild(container);
      return true;
    }
    
    return false;
  }

  // 加载文章数据
  async function loadPostsData() {
    try {
      const siteRoot = window.kr?.siteRoot || '/';
      const dataUrl = siteRoot.replace(/\/$/, '') + CONFIG.dataPath;
      
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('[推荐阅读] 无法加载文章数据:', error);
      return null;
    }
  }

  // 检查是否为文章页面（非首页、非列表页）
  function isPostPage() {
    const path = window.location.pathname;
    
    // 排除首页
    if (path === '/' || path === '/index.html') {
      return false;
    }
    
    // 排除分页页面 (如 /page/2/)
    if (/^\/page\/\d+\/?$/.test(path)) {
      return false;
    }
    
    // 排除分类页面
    if (path.startsWith('/categories') || path.startsWith('/category')) {
      return false;
    }
    
    // 排除标签页面
    if (path.startsWith('/tags') || path.startsWith('/tag')) {
      return false;
    }
    
    // 排除归档页面
    if (path.startsWith('/archives')) {
      return false;
    }
    
    // 排除关于页面等独立页面（可根据需要调整）
    if (path === '/about/' || path === '/about') {
      return false;
    }
    
    // 检查是否存在文章特有元素
    const hasArticle = document.querySelector('article[itemtype*="Article"]') !== null;
    const hasPostClass = document.querySelector('.kratos-page-inner.kr-post') !== null;
    const hasPostContent = document.querySelector('.kratos-hentry') !== null;
    
    return hasArticle || hasPostClass || hasPostContent;
  }

  // 主初始化函数
  async function init() {
    // 仅在文章页面执行
    if (!isPostPage()) {
      return;
    }
    
    // 注入样式
    injectStyles();
    
    // 创建容器并插入
    const container = createContainer();
    if (!insertContainer(container)) {
      console.warn('[推荐阅读] 无法找到合适的插入位置');
      return;
    }
    
    // 加载数据并渲染
    const posts = await loadPostsData();
    if (posts && posts.length > 0) {
      renderPosts(container, posts);
    } else {
      const loading = container.querySelector('.recommended-posts-loading');
      if (loading) {
        loading.innerHTML = '<span class="recommended-posts-empty">暂无推荐文章</span>';
      }
    }
  }

  // PJAX 支持：页面更新后重新初始化
  function setupPjaxSupport() {
    window.addEventListener('pjax:complete', () => {
      // 移除旧的推荐阅读区块
      const existing = document.querySelector('.recommended-posts');
      if (existing) existing.remove();
      
      // 重新初始化
      init();
    });
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      setupPjaxSupport();
    });
  } else {
    init();
    setupPjaxSupport();
  }
})();
