/**
 * Utility functions for copying content and exporting to different formats.
 */

/**
 * Copy text to clipboard
 * @param text The text content to copy
 * @returns Promise that resolves when the copy is complete
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

/**
 * Extract plain text from HTML content
 * @param html HTML content
 * @returns Plain text without HTML tags
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return '';
  
  // Create a temporary element to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Replace br tags with newlines
  const brElements = temp.querySelectorAll('br');
  for (let i = 0; i < brElements.length; i++) {
    brElements[i].replaceWith('\n');
  }
  
  // Replace p, div, h1-h6 tags with text + newline
  const blockElements = temp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
  for (let i = 0; i < blockElements.length; i++) {
    const el = blockElements[i];
    if (el.textContent && !el.textContent.endsWith('\n')) {
      el.textContent = el.textContent + '\n';
    }
  }
  
  return temp.textContent || '';
}

/**
 * Extract image URLs from HTML content
 * @param html HTML content
 * @returns Array of image URLs found in the HTML
 */
export function extractImagesFromHtml(html: string): string[] {
  if (!html) return [];
  
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  const imgUrls: string[] = [];
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) {
      imgUrls.push(match[1]);
    }
  }
  
  console.log("Extracted image from HTML:", imgUrls.length ? imgUrls[0] : "none found", "from HTML:", html.substring(0, 2));
  return imgUrls;
}

/**
 * Copy HTML content to clipboard with formatting
 * @param html The HTML content to copy
 * @returns Promise that resolves when the copy is complete
 */
export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  try {
    // Enhanced HTML formatting to preserve styles
    const enhancedHtml = html.trim();
    
    if (navigator.clipboard && navigator.clipboard.write) {
      // Create HTML blob with complete HTML structure to ensure formatting is preserved
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            img { max-width: 100%; }
            a { color: #0066cc; text-decoration: none; }
            b, strong { font-weight: bold; }
            i, em { font-style: italic; }
            u { text-decoration: underline; }
          </style>
        </head>
        <body>${enhancedHtml}</body>
        </html>
      `;
      
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const plainText = extractTextFromHtml(enhancedHtml);
      const plainTextBlob = new Blob([plainText], { type: 'text/plain' });
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainTextBlob
        })
      ]);
      return true;
    } else {
      // Fallback to plain text copy
      return copyToClipboard(extractTextFromHtml(enhancedHtml));
    }
  } catch (err) {
    console.error('Failed to copy HTML: ', err);
    // Fallback to plain text copy
    return copyToClipboard(extractTextFromHtml(html));
  }
}

/**
 * Extract image data from HTML content
 * @param html The HTML content containing images
 * @returns An array of image data objects with base64 content if available
 */
export function extractImagesWithData(html: string): { src: string; alt: string; isBase64: boolean }[] {
  const images: { src: string; alt: string; isBase64: boolean }[] = [];
  
  if (!html) return images;
  
  // Create a temporary DOM element to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = doc.querySelectorAll('img');
  
  imgElements.forEach(img => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    const isBase64 = src.startsWith('data:image');
    
    images.push({ src, alt, isBase64 });
  });
  
  return images;
}

/**
 * Extracts videos from HTML content
 * @param html The HTML content containing videos
 * @returns An array of video data objects with URLs
 */
export function extractVideosFromHtml(html: string): { src: string; type: string }[] {
  const videos: { src: string; type: string }[] = [];
  
  if (!html) return videos;
  
  // Parse HTML to extract video elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Extract video elements
  const videoElements = doc.querySelectorAll('video');
  videoElements.forEach(video => {
    const sources = video.querySelectorAll('source');
    if (sources.length > 0) {
      sources.forEach(source => {
        const src = source.getAttribute('src') || '';
        const type = source.getAttribute('type') || 'video/mp4';
        if (src) {
          videos.push({ src, type });
        }
      });
    } else {
      const src = video.getAttribute('src') || '';
      if (src) {
        videos.push({ src, type: 'video/mp4' });
      }
    }
  });
  
  // Extract iframe elements (for embedded videos like YouTube)
  const iframeElements = doc.querySelectorAll('iframe');
  iframeElements.forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    if (src && (src.includes('youtube') || src.includes('vimeo'))) {
      videos.push({ src, type: 'embed' });
    }
  });
  
  return videos;
}

/**
 * Copy only the text content from a post, preserving formatting
 * @param post The post object from which to copy text content only
 * @returns Promise that resolves when the text copy is complete
 */
export async function copyPostTextOnly(post: any): Promise<boolean> {
  try {
    // If we have formatted content, extract only text without media
    if (post.formattedContent?.html) {
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = post.formattedContent.html;
      
      // Remove all images and videos but keep their alt text
      const images = tempContainer.querySelectorAll('img');
      images.forEach(img => {
        const altText = img.getAttribute('alt');
        if (altText) {
          const textNode = document.createTextNode(`[Image: ${altText}]`);
          img.parentNode?.replaceChild(textNode, img);
        } else {
          img.parentNode?.removeChild(img);
        }
      });
      
      // Remove videos and iframes
      const videos = tempContainer.querySelectorAll('video, iframe');
      videos.forEach(video => {
        video.parentNode?.removeChild(video);
      });
      
      // Get the cleaned HTML with text formatting preserved but no media
      const textOnlyHtml = tempContainer.innerHTML;
      
      // Just copy the text content directly without any headers or platform references
      // Copy text with formatting preserved
      return await copyHtmlToClipboard(textOnlyHtml);
    }
    
    // Fallback to plain text if no HTML content
    return copyToClipboard(post.content || '');
  } catch (error) {
    console.error('Error copying text content:', error);
    return copyToClipboard(post.content || '');
  }
}

/**
 * Copy only the media content (images, videos) from a post
 * @param post The post object from which to copy media content only
 * @returns Promise that resolves when the media copy is complete
 */
export async function copyPostMediaOnly(post: any): Promise<boolean> {
  try {
    // Extract media from post
    const mediaSources: string[] = [];
    
    // Extract images if HTML content is available
    if (post.formattedContent?.html) {
      const images = extractImagesWithData(post.formattedContent.html);
      images.forEach(img => {
        if (img.src) {
          mediaSources.push(img.src);
        }
      });
      
      // Extract videos if any
      const videos = extractVideosFromHtml(post.formattedContent.html);
      videos.forEach(video => {
        if (video.src) {
          mediaSources.push(video.src);
        }
      });
    }
    
    // Add media URLs if any
    if (post.mediaUrls && Array.isArray(post.mediaUrls)) {
      post.mediaUrls.forEach((url: string) => {
        if (url && !mediaSources.includes(url)) {
          mediaSources.push(url);
        }
      });
    }
    
    // Special case for YouTube posts
    if (post.platform === 'youtube' && post.formattedContent?.videoUrl) {
      mediaSources.push(post.formattedContent.videoUrl);
    }
    
    // If we have media to copy
    if (mediaSources.length > 0) {
      // Create HTML with all media sources
      let mediaHtml = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">';
      
      // No platform header for cleaner copy
      
      // Add media to HTML
      mediaHtml += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
      
      mediaSources.forEach((src, index) => {
        if (src.match(/\.(jpeg|jpg|gif|png)$/i) || src.startsWith('data:image')) {
          // Image content
          mediaHtml += `<div style="margin-bottom: 10px;">
            <img src="${src}" alt="Media ${index + 1}" style="max-width: 300px; max-height: 300px; border-radius: 4px;" />
          </div>`;
        } else if (src.includes('youtube') || src.includes('vimeo')) {
          // Video embed content
          mediaHtml += `<div style="margin-bottom: 10px;">
            <a href="${src}" target="_blank" style="color: #0066cc; text-decoration: none; display: block; margin-bottom: 5px;">
              <div style="display: flex; align-items: center; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                <span style="font-weight: bold; margin-right: 5px;">Video Link:</span>
                ${src}
              </div>
            </a>
          </div>`;
        } else {
          // Other media links
          mediaHtml += `<div style="margin-bottom: 10px;">
            <a href="${src}" target="_blank" style="color: #0066cc; text-decoration: none;">
              <div style="display: flex; align-items: center; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                <span style="font-weight: bold; margin-right: 5px;">Media Link:</span>
                ${src}
              </div>
            </a>
          </div>`;
        }
      });
      
      mediaHtml += '</div>'; // Close flex container
      
      // No platform attribution for cleaner copy
      
      mediaHtml += '</div>'; // Close main container
      
      // Copy the media HTML
      return await copyHtmlToClipboard(mediaHtml);
    }
    
    // If no media found
    return copyToClipboard('No media content found in this post.');
  } catch (error) {
    console.error('Error copying media content:', error);
    return copyToClipboard('Error copying media content.');
  }
}

/**
 * Copy a post object to clipboard with platform-specific formatting
 * @param post The post object to copy
 * @returns Promise that resolves when the copy is complete
 */
/**
 * Copy formatted content with HTML formatting preserved
 * @param formattedContent The HTML content to copy with formatting
 * @param fallbackText Plain text fallback if HTML copy fails
 * @returns Promise that resolves when the copy is complete
 */
export async function copyFormattedContent(formattedContent: string | null, fallbackText: string = ''): Promise<boolean> {
  try {
    if (formattedContent) {
      // Create a temporary element to handle HTML content
      const el = document.createElement('div');
      el.innerHTML = formattedContent;
      document.body.appendChild(el);
      
      // Select the content
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Copy the selected content
      const successful = document.execCommand('copy');
      document.body.removeChild(el);
      
      if (successful) {
        return true;
      }
      
      // Fall back to HTML clipboard API if execCommand fails
      return copyHtmlToClipboard(formattedContent);
    } else {
      // Fallback to plain text
      return copyToClipboard(fallbackText);
    }
  } catch (err) {
    console.error('Error copying formatted content:', err);
    // Fallback to plain text
    return copyToClipboard(fallbackText);
  }
}

export async function copyPostToClipboard(post: any): Promise<boolean> {
  try {
    // Always prioritize HTML content for richer copy experience
    if (post.formattedContent?.html) {
      // Just use the post HTML content directly without any additions
      let enhancedHtml = post.formattedContent.html;
      const formattedContent = post.formattedContent;
      
      // Create a wrapper div to hold all content with styling
      let contentWrapper = document.createElement('div');
      contentWrapper.innerHTML = enhancedHtml;
      
      // Copy the HTML content with all formatting preserved but no platform references
      return await copyHtmlToClipboard(contentWrapper.innerHTML);
    }
    
    // Fallback to plain text version
    const formattedContent = post.formattedContent;
    
    // Extract clean text content without HTML tags
    const cleanContent = extractTextFromHtml(formattedContent?.html || '').trim();
    const finalContent = cleanContent || post.content || '';
    
    // Copy as plain text without any platform info
    return copyToClipboard(finalContent);
  } catch (error) {
    console.error('Error copying post content:', error);
    // In case of any error, try basic text copy as fallback
    return copyToClipboard(post.content || '');
  }
}