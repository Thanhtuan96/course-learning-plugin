/**
 * LecturePanel.jsx - Markdown rendering with syntax highlighting
 */

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { fetchCourseFile } from '../api/client.js';
import { sanitizeMarkdown } from '../utils/markdown.js';
import './LecturePanel.css';

/**
 * LecturePanel component - displays markdown lecture content
 * @param {Object} props
 * @param {string|null} props.courseSlug - Current course slug
 * @param {string} [props.content] - Optional pre-loaded content
 * @param {Function} [props.onLectureUpdate] - Callback when lecture updates
 */
export default function LecturePanel({ courseSlug, content: initialContent, onLectureUpdate }) {
  const [content, setContent] = useState(initialContent || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load lecture content
  const loadLecture = useCallback(async () => {
    if (!courseSlug) {
      setContent('');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCourseFile(courseSlug, 'LECTURE.md');
      setContent(data?.content || '');
    } catch (err) {
      console.error('Failed to load lecture:', err);
      setError('Failed to load lecture');
      setContent('');
    } finally {
      setLoading(false);
    }
  }, [courseSlug]);

  // Load on mount or course change
  useEffect(() => {
    loadLecture();
  }, [loadLecture]);

  // Expose reload function for WebSocket events
  useEffect(() => {
    // Store reference for external calls (e.g., WebSocket)
    window.__refreshLecture?.();

    // Also expose via custom event for decoupling
    const handleRefresh = () => loadLecture();
    window.addEventListener('refresh-lecture', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-lecture', handleRefresh);
    };
  }, [loadLecture]);

  // Handle lecture update from WebSocket
  useEffect(() => {
    if (onLectureUpdate) {
      onLectureUpdate(content);
    }
  }, [content, onLectureUpdate]);

  // Render empty state
  if (!courseSlug) {
    return (
      <div className="lecture-panel-empty">
        <div className="lecture-panel-empty-content">
          <span className="lecture-panel-icon">📖</span>
          <p>Select a course to see the current lecture.</p>
        </div>
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div className="lecture-panel-loading">
        <div className="lecture-panel-loading-spinner" />
        <p>Loading lecture...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="lecture-panel-error">
        <p>{error}</p>
        <button onClick={loadLecture}>Retry</button>
      </div>
    );
  }

  // Render empty content state
  if (!content) {
    return (
      <div className="lecture-panel-empty">
        <div className="lecture-panel-empty-content">
          <span className="lecture-panel-icon">✨</span>
          <p>No lecture loaded yet.</p>
          <p className="lecture-panel-hint">
            Type <code>professor:next</code> in chat to start your first section.
          </p>
        </div>
      </div>
    );
  }

  // Sanitize markdown for security (defense in depth)
  const sanitizedContent = sanitizeMarkdown(content);

  return (
    <div className="lecture-panel">
      <div className="lecture-panel-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
