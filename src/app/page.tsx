'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { upload } from '@vercel/blob/client';

type InputMode = 'audio' | 'transcript';
type AppState = 'login' | 'input' | 'result';
type ResultViewMode = 'preview' | 'edit' | 'split' | 'transcript';
type DropdownOpen = 'none' | 'copy' | 'download';
type ToolkitVersionSource = 'generated' | 'regenerated' | 'ai-edit' | 'manual';

type ToolkitVersion = {
  id: string;
  name: string;
  toolkit: string;
  source: ToolkitVersionSource;
  createdAt: string;
  parentId?: string;
  note?: string;
};

type DiffLine = {
  type: 'equal' | 'added' | 'removed';
  text: string;
};

const AUTH_STORAGE_KEY = 'sermon-toolkit-authenticated';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('login');
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>('preview');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('audio');
  const [transcript, setTranscript] = useState('');
  const [preacherName, setPreacherName] = useState('');
  const [versions, setVersions] = useState<ToolkitVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<string>('');
  const [toolkitDraft, setToolkitDraft] = useState('');
  const [aiEditInstructions, setAiEditInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<DropdownOpen>('none');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPanelRef = useRef<HTMLTextAreaElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeVersion =
    versions.find((version) => version.id === activeVersionId) ?? null;
  const compareVersion =
    versions.find((version) => version.id === compareVersionId) ?? null;
  const hasUnsavedDraft =
    activeVersion !== null && toolkitDraft !== activeVersion.toolkit;

  // Check for existing authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY);
    if (isAuthenticated === 'true') {
      setAppState('input');
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createVersionId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const buildVersionName = (source: ToolkitVersionSource) => {
    const count = versions.filter((version) => version.source === source).length + 1;
    const labels: Record<ToolkitVersionSource, string> = {
      generated: 'Initial',
      regenerated: 'Regenerated',
      'ai-edit': 'AI Edit',
      manual: 'Manual Save',
    };

    return `${labels[source]} ${count}`;
  };

  const createVersion = (
    toolkit: string,
    source: ToolkitVersionSource,
    options?: { parentId?: string; note?: string }
  ): ToolkitVersion => ({
    id: createVersionId(),
    name: buildVersionName(source),
    toolkit,
    source,
    createdAt: new Date().toISOString(),
    parentId: options?.parentId,
    note: options?.note,
  });

  const selectVersion = (versionId: string, nextDraft?: string) => {
    const version = versions.find((item) => item.id === versionId);
    if (!version) return;

    setActiveVersionId(versionId);
    setToolkitDraft(nextDraft ?? version.toolkit);
    if (compareVersionId === versionId) {
      setCompareVersionId('');
    }
  };

  const saveVersionAndSelect = (
    toolkit: string,
    source: ToolkitVersionSource,
    options?: { parentId?: string; note?: string }
  ) => {
    const version = createVersion(toolkit, source, options);
    setVersions((current) => [...current, version]);
    setActiveVersionId(version.id);
    setToolkitDraft(toolkit);
    return version;
  };

  const confirmDiscardUnsavedDraft = () => {
    if (!hasUnsavedDraft) return true;
    return window.confirm('You have unsaved draft changes. Discard them?');
  };

  const formatVersionTime = (isoString: string) =>
    new Date(isoString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const buildDiffLines = (beforeText: string, afterText: string): DiffLine[] => {
    const beforeLines = beforeText.split('\n');
    const afterLines = afterText.split('\n');
    const dp = Array.from({ length: beforeLines.length + 1 }, () =>
      Array(afterLines.length + 1).fill(0)
    );

    for (let i = beforeLines.length - 1; i >= 0; i--) {
      for (let j = afterLines.length - 1; j >= 0; j--) {
        dp[i][j] =
          beforeLines[i] === afterLines[j]
            ? dp[i + 1][j + 1] + 1
            : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const lines: DiffLine[] = [];
    let i = 0;
    let j = 0;

    while (i < beforeLines.length && j < afterLines.length) {
      if (beforeLines[i] === afterLines[j]) {
        lines.push({ type: 'equal', text: beforeLines[i] });
        i++;
        j++;
        continue;
      }

      if (dp[i + 1][j] >= dp[i][j + 1]) {
        lines.push({ type: 'removed', text: beforeLines[i] });
        i++;
        continue;
      }

      lines.push({ type: 'added', text: afterLines[j] });
      j++;
    }

    while (i < beforeLines.length) {
      lines.push({ type: 'removed', text: beforeLines[i] });
      i++;
    }

    while (j < afterLines.length) {
      lines.push({ type: 'added', text: afterLines[j] });
      j++;
    }

    return lines;
  };

  const handleEditScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (!editPanelRef.current || !previewPanelRef.current) return;
    
    isScrollingSyncRef.current = true;
    const editPanel = editPanelRef.current;
    const previewPanel = previewPanelRef.current;
    
    const scrollPercentage = editPanel.scrollTop / (editPanel.scrollHeight - editPanel.clientHeight);
    previewPanel.scrollTop = scrollPercentage * (previewPanel.scrollHeight - previewPanel.clientHeight);
    
    requestAnimationFrame(() => {
      isScrollingSyncRef.current = false;
    });
  }, []);

  const handlePreviewScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (!editPanelRef.current || !previewPanelRef.current) return;
    
    isScrollingSyncRef.current = true;
    const editPanel = editPanelRef.current;
    const previewPanel = previewPanelRef.current;
    
    const scrollPercentage = previewPanel.scrollTop / (previewPanel.scrollHeight - previewPanel.clientHeight);
    editPanel.scrollTop = scrollPercentage * (editPanel.scrollHeight - editPanel.clientHeight);
    
    requestAnimationFrame(() => {
      isScrollingSyncRef.current = false;
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        setAppState('input');
        setPasswordError('');
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } catch {
      setPasswordError('Authentication failed. Please try again.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);

    // Check file size on client side too (25MB limit - Groq's limit)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`File too large (${fileSizeMB}MB). Maximum file size is 25MB. Please compress your audio (try converting to 64kbps mono MP3).`);
      setAudioFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Uploading audio file...');

    try {
      // Step 1: Upload to Vercel Blob (bypasses serverless function body limits)
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      setLoadingMessage('Transcribing audio... This may take a few minutes for longer recordings.');

      // Step 2: Call transcribe API with the blob URL
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobUrl: blob.url, fileName: file.name }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      setTranscript(data.transcript);
    } catch (error) {
      console.error('Transcription error:', error);
      const message = error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.';
      alert(message);
      setAudioFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const requestToolkitGeneration = async (): Promise<string> => {
    if (!transcript.trim() || !preacherName.trim()) {
      throw new Error('Transcript and preacher name are required');
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, preacherName }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(text || `Server error: ${response.status}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate toolkit');
    }

    return data.toolkit as string;
  };

  const handleGenerateToolkit = async () => {
    if (!transcript.trim() || !preacherName.trim()) return;

    setIsLoading(true);
    setLoadingMessage('Generating toolkit with AI...');

    try {
      const generatedToolkit = await requestToolkitGeneration();
      saveVersionAndSelect(generatedToolkit, 'generated');
      setAppState('result');
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate toolkit. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRegenerateToolkit = async () => {
    if (!confirmDiscardUnsavedDraft()) return;

    setIsLoading(true);
    setLoadingMessage('Regenerating toolkit...');

    try {
      const generatedToolkit = await requestToolkitGeneration();
      saveVersionAndSelect(generatedToolkit, 'regenerated', {
        parentId: activeVersionId ?? undefined,
      });
      setAiEditInstructions('');
    } catch (error) {
      console.error('Regeneration error:', error);
      alert('Failed to regenerate toolkit. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleAiEditToolkit = async () => {
    if (!transcript.trim() || !preacherName.trim() || !toolkitDraft.trim()) return;
    if (!aiEditInstructions.trim()) {
      alert('Add edit instructions first.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Applying AI edits...');

    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          preacherName,
          currentToolkit: toolkitDraft,
          editInstructions: aiEditInstructions,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit toolkit');
      }

      saveVersionAndSelect(data.toolkit, 'ai-edit', {
        parentId: activeVersionId ?? undefined,
        note: aiEditInstructions.trim(),
      });
      setAiEditInstructions('');
    } catch (error) {
      console.error('AI edit error:', error);
      alert('Failed to edit toolkit with AI. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSaveDraftAsVersion = () => {
    if (!activeVersion || !hasUnsavedDraft) return;

    saveVersionAndSelect(toolkitDraft, 'manual', {
      parentId: activeVersion.id,
    });
  };

  const handleDiscardDraftChanges = () => {
    if (!activeVersion) return;
    setToolkitDraft(activeVersion.toolkit);
  };

  const handleVersionSelect = (versionId: string) => {
    if (versionId === activeVersionId) return;
    if (!confirmDiscardUnsavedDraft()) return;
    selectVersion(versionId);
  };

  const handleReset = () => {
    if (!confirmDiscardUnsavedDraft()) return;
    setTranscript('');
    setVersions([]);
    setActiveVersionId(null);
    setCompareVersionId('');
    setToolkitDraft('');
    setAiEditInstructions('');
    setPreacherName('');
    setAudioFile(null);
    setAppState('input');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const { default: ReactDOMServer } = await import('react-dom/server');
    const { default: MarkdownComponent } = await import('react-markdown');
    const React = await import('react');
    
    // Create a temporary container with styled content
    const container = document.createElement('div');
    
    // If preview panel exists, use its content; otherwise render markdown
    if (previewPanelRef.current) {
      container.innerHTML = previewPanelRef.current.innerHTML;
    } else {
      // Render markdown to HTML for edit-only mode
      const markdownHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MarkdownComponent, null, toolkitDraft)
      );
      container.innerHTML = markdownHtml;
    }
    
    container.style.padding = '40px';
    container.style.fontFamily = 'Georgia, serif';
    container.style.fontSize = '12pt';
    container.style.lineHeight = '1.6';
    container.style.color = '#1a1a1a';
    container.style.textAlign = 'left';
    
    // Add logo at top center - extends to left edge
    const logoContainer = document.createElement('div');
    logoContainer.style.textAlign = 'center';
    logoContainer.style.marginBottom = '0';
    logoContainer.style.marginLeft = '-40px';
    logoContainer.style.marginRight = '-40px';
    logoContainer.style.marginTop = '-20px';
    const logo = document.createElement('img');
    logo.src = `${window.location.origin}/Toolkit logo.png`;
    logo.style.maxWidth = '400px';
    logo.style.height = 'auto';
    logo.crossOrigin = 'anonymous';
    logoContainer.appendChild(logo);
    container.insertBefore(logoContainer, container.firstChild);
    
    // Wait for logo to load before generating PDF
    await new Promise<void>((resolve) => {
      if (logo.complete) {
        resolve();
      } else {
        logo.onload = () => resolve();
        logo.onerror = () => resolve(); // Continue even if logo fails to load
      }
    });
    
    // Fix bold/strong elements - ensure no extra spacing
    container.querySelectorAll('strong, b').forEach((el) => {
      const elem = el as HTMLElement;
      elem.style.fontWeight = '700';
      elem.style.letterSpacing = '0';
      elem.style.wordSpacing = '0';
      elem.style.display = 'inline';
      elem.style.textAlign = 'left';
    });
    
    // Convert lists to use manual bullets/numbers for better alignment
    container.querySelectorAll('ul').forEach((ul) => {
      const elem = ul as HTMLElement;
      elem.style.listStyle = 'none';
      elem.style.margin = '0 0 1em 0';
      elem.style.padding = '0';
    });
    
    container.querySelectorAll('ol').forEach((ol) => {
      const elem = ol as HTMLElement;
      elem.style.listStyle = 'none';
      elem.style.margin = '0 0 1em 0';
      elem.style.padding = '0';
      elem.style.counterReset = 'list-counter';
    });
    
    container.querySelectorAll('ul > li').forEach((li) => {
      const elem = li as HTMLElement;
      elem.style.display = 'block';
      elem.style.position = 'relative';
      elem.style.marginBottom = '0.5em';
      elem.style.paddingLeft = '1.25em';
      elem.style.textAlign = 'left';
      elem.style.breakInside = 'avoid';
      elem.style.pageBreakInside = 'avoid';
      // Wrap content in a div to prevent flex from affecting inline elements
      const content = document.createElement('div');
      content.innerHTML = elem.innerHTML;
      content.style.textAlign = 'left';
      elem.innerHTML = '';
      // Add bullet as pseudo-content via a span
      const bullet = document.createElement('span');
      bullet.textContent = '•';
      bullet.style.position = 'absolute';
      bullet.style.left = '0';
      bullet.style.top = '0';
      bullet.style.width = '1em';
      bullet.style.color = '#8b1a32';
      elem.appendChild(bullet);
      elem.appendChild(content);
    });
    
    container.querySelectorAll('ol > li').forEach((li, index) => {
      const elem = li as HTMLElement;
      elem.style.display = 'block';
      elem.style.position = 'relative';
      elem.style.marginBottom = '0.5em';
      elem.style.paddingLeft = '1.6em';
      elem.style.textAlign = 'left';
      elem.style.breakInside = 'avoid';
      elem.style.pageBreakInside = 'avoid';
      // Wrap content in a div to prevent flex from affecting inline elements
      const content = document.createElement('div');
      content.innerHTML = elem.innerHTML;
      content.style.textAlign = 'left';
      elem.innerHTML = '';
      // Add number as pseudo-content via a span
      const number = document.createElement('span');
      number.textContent = `${index + 1}.`;
      number.style.position = 'absolute';
      number.style.left = '0';
      number.style.top = '0';
      number.style.width = '1.35em';
      number.style.color = '#8b1a32';
      elem.appendChild(number);
      elem.appendChild(content);
    });
    
    // Handle nested lists - reset numbering for each ol
    container.querySelectorAll('ol').forEach((ol) => {
      let counter = 0;
      ol.querySelectorAll(':scope > li').forEach((li) => {
        counter++;
        const numberSpan = li.querySelector('span');
        if (numberSpan) {
          numberSpan.textContent = `${counter}.`;
        }
      });
    });
    
    // Style headings - all with underlines
    container.querySelectorAll('h1, h2, h3').forEach((el) => {
      const elem = el as HTMLElement;
      elem.style.fontFamily = 'Georgia, serif';
      elem.style.marginTop = '1em';
      elem.style.marginBottom = '0.9em';
      elem.style.borderBottom = '1px solid #ccc';
      elem.style.paddingBottom = '0.5em';
      elem.style.color = '#1a1a1a';
    });
    container.querySelectorAll('blockquote').forEach((el) => {
      const elem = el as HTMLElement;
      elem.style.borderLeft = '3px solid #8b1a32';
      elem.style.paddingLeft = '1em';
      elem.style.marginLeft = '0';
      elem.style.color = '#666';
      elem.style.fontStyle = 'italic';
      elem.style.textAlign = 'left';
    });
    container.querySelectorAll('p').forEach((el) => {
      const elem = el as HTMLElement;
      elem.style.marginBottom = '1em';
      elem.style.textAlign = 'left';
    });

    const proseContainer = (container.querySelector('.prose') || container) as HTMLElement;
    const looksLikeScriptureReference = (text: string | null | undefined) =>
      Boolean(
        text?.trim().match(
          /^(?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*\s+\d+:\d+(?:[-–]\d+)?$/
        )
      );

    const applyAppendixPdfStyles = (root: HTMLElement) => {
      const nodes = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];

      nodes.forEach((node) => {
        const tagName = node.tagName.toLowerCase();

        if (tagName === 'h2') {
          node.style.fontSize = '1.05em';
          node.style.marginTop = '0.25em';
          node.style.marginBottom = '0.7em';
          node.style.paddingBottom = '0.3em';
          node.style.color = '#1a1a1a';
        } else if (['h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          node.style.fontSize = '0.95em';
          node.style.marginTop = '0.4em';
          node.style.marginBottom = '0.5em';
          node.style.paddingBottom = '0';
          node.style.borderBottom = 'none';
          node.style.color = '#1a1a1a';
        } else if (tagName === 'blockquote') {
          node.style.fontSize = '0.88em';
          node.style.lineHeight = '1.35';
          node.style.paddingLeft = '0.7em';
          node.style.paddingTop = '0.25em';
          node.style.paddingBottom = '0.35em';
          node.style.marginTop = '0';
          node.style.marginBottom = '0.55em';
          node.style.breakInside = 'auto';
          node.style.pageBreakInside = 'auto';
        } else if (tagName === 'p') {
          if (
            looksLikeScriptureReference(node.textContent) &&
            node.nextElementSibling?.tagName.toLowerCase() === 'blockquote'
          ) {
            node.style.fontSize = '0.95em';
            node.style.fontWeight = '700';
            node.style.lineHeight = '1.25';
            node.style.marginTop = '0.4em';
            node.style.marginBottom = '0.5em';
            node.style.color = '#1a1a1a';
          } else if (node.closest('blockquote')) {
            node.style.fontSize = '0.9em';
            node.style.lineHeight = '1.35';
            node.style.marginTop = '0';
            node.style.marginBottom = '0.15em';
          } else {
            node.style.fontSize = '0.9em';
            node.style.lineHeight = '1.35';
            node.style.marginBottom = '0.55em';
          }
        } else if (tagName === 'li' || tagName === 'ul' || tagName === 'ol') {
          node.style.fontSize = '0.9em';
          node.style.lineHeight = '1.35';
          node.style.marginBottom = '0.35em';
        }
      });
    };

    let isInAppendix = false;
    Array.from(proseContainer.children).forEach((child) => {
      const element = child as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (
        ['h1', 'h2', 'h3'].includes(tagName) &&
        element.textContent?.toLowerCase().includes('appendix')
      ) {
        isInAppendix = true;
      }

      if (isInAppendix) {
        applyAppendixPdfStyles(element);
      }
    });

    // Ensure all text is left-aligned
    container.querySelectorAll('*').forEach((el) => {
      const elem = el as HTMLElement;
      if (elem.style) {
        elem.style.textAlign = 'left';
      }
    });
    
    // Wrap headings with minimum following content to keep them together
    // but allow longer content (like scriptures) to break naturally
    const wrapHeadingsWithMinContent = (parent: HTMLElement) => {
      const children = Array.from(parent.children);
      const newChildren: Element[] = [];
      let isInAppendix = false;
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const tagName = child.tagName.toLowerCase();
        const isHeading = ['h1', 'h2', 'h3'].includes(tagName);
        const isAppendixHeading = isHeading && child.textContent?.toLowerCase().includes('appendix');
        
        if (isAppendixHeading) {
          const appendixHeading = child.cloneNode(true) as HTMLElement;
          appendixHeading.style.breakBefore = 'page';
          appendixHeading.style.pageBreakBefore = 'always';
          appendixHeading.style.marginTop = '0';
          newChildren.push(appendixHeading);
          isInAppendix = true;
        } else if (isInAppendix) {
          const nextChild = children[i + 1];
          const isScriptureSectionHeading =
            (tagName === 'p' && looksLikeScriptureReference(child.textContent)) ||
            (['h3', 'h4', 'h5', 'h6'].includes(tagName) &&
              nextChild?.tagName.toLowerCase() === 'blockquote');
          const nextIsBlockquote =
            nextChild?.tagName.toLowerCase() === 'blockquote';

          if (isScriptureSectionHeading && nextIsBlockquote) {
            const sectionWrapper = document.createElement('div');
            const blockquoteTextLength = nextChild.textContent?.trim().length || 0;
            const shouldKeepTogether = blockquoteTextLength < 700;

            sectionWrapper.className = 'appendix-section';
            sectionWrapper.style.display = 'block';
            sectionWrapper.style.breakInside = shouldKeepTogether ? 'avoid' : 'auto';
            sectionWrapper.style.pageBreakInside = shouldKeepTogether
              ? 'avoid'
              : 'auto';

            if (!shouldKeepTogether) {
              sectionWrapper.style.minHeight = '7.2em';
            }

            sectionWrapper.appendChild(child.cloneNode(true));
            sectionWrapper.appendChild(nextChild.cloneNode(true));
            newChildren.push(sectionWrapper);
            i += 1;
          } else {
            newChildren.push(child.cloneNode(true) as Element);
          }
        } else if (isHeading) {
          // Create a wrapper for heading + first following element only
          // This keeps heading with start of content but allows rest to flow
          const wrapper = document.createElement('div');
          wrapper.style.pageBreakInside = 'avoid';
          wrapper.style.breakInside = 'avoid';
          wrapper.appendChild(child.cloneNode(true));
          
          // Add the next element if it exists (first paragraph/list after heading)
          if (i + 1 < children.length) {
            const nextChild = children[i + 1];
            const nextTagName = nextChild.tagName.toLowerCase();
            if (!['h1', 'h2', 'h3'].includes(nextTagName)) {
              wrapper.appendChild(nextChild.cloneNode(true));
              i++; // Skip the next element since we included it
            }
          }
          
          newChildren.push(wrapper);
        } else {
          newChildren.push(child.cloneNode(true) as Element);
        }
      }
      
      // Replace children
      parent.innerHTML = '';
      newChildren.forEach((child) => parent.appendChild(child));
    };
    
    // Find the prose container and process sections
    wrapHeadingsWithMinContent(proseContainer);
    
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: 'toolkit.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] as const, before: '.html2pdf__page-break' }
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (html2pdf() as any).set(opt).from(container).save();
  };

  const stripMarkdown = (md: string): string => {
    return md
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/>\s+/g, '')
      .replace(/---/g, '')
      .replace(/\n{3,}/g, '\n\n');
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
      setDropdownOpen('none');
    } catch {
      console.error('Failed to copy');
    }
  };

  const diffLines = compareVersion
    ? buildDiffLines(compareVersion.toolkit, toolkitDraft)
    : [];

  const viewModeControls = (
    <div className="flex gap-1 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm">
      <button
        onClick={() => setResultViewMode('preview')}
        title="Preview only"
        className={`p-2.5 rounded-lg transition-all duration-200 ${
          resultViewMode === 'preview'
            ? 'bg-[var(--color-accent)] text-white shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      <button
        onClick={() => setResultViewMode('split')}
        title="Side by side"
        className={`p-2.5 rounded-lg transition-all duration-200 ${
          resultViewMode === 'split'
            ? 'bg-[var(--color-accent)] text-white shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      </button>
      <button
        onClick={() => setResultViewMode('edit')}
        title="Edit only"
        className={`p-2.5 rounded-lg transition-all duration-200 ${
          resultViewMode === 'edit'
            ? 'bg-[var(--color-accent)] text-white shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={() => setResultViewMode('transcript')}
        title="Transcript"
        className={`p-2.5 rounded-lg transition-all duration-200 ${
          resultViewMode === 'transcript'
            ? 'bg-[var(--color-accent)] text-white shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
    </div>
  );
  const addedDiffCount = diffLines.filter((line) => line.type === 'added').length;
  const removedDiffCount = diffLines.filter((line) => line.type === 'removed').length;
  const currentToolkitLabel =
    hasUnsavedDraft && activeVersion ? `${activeVersion.name} Draft` : activeVersion?.name;
  const loadingHint = loadingMessage === 'Regenerating toolkit...'
    ? 'Rebuilding the toolkit from the transcript and refreshing the scripture appendix.'
    : 'This may take a moment...';

  // Login Screen
  if (appState === 'login') {
  return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-accent)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--color-accent)]/3 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-sm opacity-0 animate-fade-in relative z-10">
          {/* Icon */}
          <div className="text-center mb-10">
            <div className="relative inline-block">
              <div className="relative w-20 h-20 mx-auto mb-8 rounded-3xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3 text-[var(--color-text)]">
              Small Group Toolkit
          </h1>
            <p className="text-[var(--color-text-muted)] text-lg">
              Transform sermons into meaningful discussions
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-5 py-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all text-lg shadow-sm"
              />
            </div>
            
            {passwordError && (
              <p className="text-[var(--color-danger)] text-sm px-1 animate-fade-in">{passwordError}</p>
            )}
            
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-lg hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-[var(--color-accent)]/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              Enter
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Result Screen
  if (appState === 'result' && activeVersion && toolkitDraft) {
    return (
      <main className="min-h-screen p-4 md:p-6 lg:p-8 relative">
        {isLoading && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-2 border-[var(--color-accent)]/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-xl text-[var(--color-text)]">{loadingMessage}</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">{loadingHint}</p>
            </div>
          </div>
        )}

        <div className={`mx-auto flex flex-col gap-4 ${resultViewMode === 'split' ? 'max-w-[1600px]' : 'max-w-6xl'}`}>
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 opacity-0 animate-fade-in shrink-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">Generated Toolkit</h1>
              <p className="text-[var(--color-text-muted)] text-sm md:text-base mt-1">
                Review, revise, and compare toolkit versions
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]/30 transition-all shadow-sm text-sm"
              >
                Start Over
              </button>
            </div>
          </header>

          <section className="opacity-0 animate-fade-in stagger-1 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">Versions</h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Saved snapshots of the toolkit. Select one to load it into the editor.
                  </p>
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                  {versions.length} version{versions.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {[...versions].reverse().map((version) => {
                  const isActive = version.id === activeVersionId;
                  return (
                    <button
                      key={version.id}
                      onClick={() => handleVersionSelect(version.id)}
                      className={`min-w-52 text-left rounded-2xl border px-4 py-3 transition-all ${
                        isActive
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/8 shadow-sm'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[var(--color-text)]">{version.name}</span>
                        <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                          {version.source}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)] mt-2">
                        {formatVersionTime(version.createdAt)}
                      </p>
                      {version.note && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">
                          {version.note}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">Version Compare</h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Compare another saved version against the current draft.
                  </p>
                </div>
              </div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Compare against
              </label>
              <select
                value={compareVersionId}
                onChange={(e) => setCompareVersionId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all"
              >
                <option value="">No comparison</option>
                {versions
                  .filter((version) => version.id !== activeVersionId)
                  .slice()
                  .reverse()
                  .map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.name} ({formatVersionTime(version.createdAt)})
                    </option>
                  ))}
              </select>
              <div className="mt-4 text-sm text-[var(--color-text-muted)]">
                {compareVersion ? (
                  <>
                    Comparing <span className="font-semibold text-[var(--color-text)]">{compareVersion.name}</span> to{' '}
                    <span className="font-semibold text-[var(--color-text)]">{currentToolkitLabel}</span>
                  </>
                ) : (
                  'Select a version to see a line-by-line diff.'
                )}
              </div>
            </div>
          </section>

          <section className="opacity-0 animate-fade-in stagger-2 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">AI Revision Tools</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Regenerate from the transcript, or ask AI to revise the current draft into a new saved version.
                </p>
              </div>
              <div className="text-sm text-[var(--color-text-muted)]">
                Current: <span className="font-semibold text-[var(--color-text)]">{currentToolkitLabel}</span>
              </div>
            </div>

            <textarea
              value={aiEditInstructions}
              onChange={(e) => setAiEditInstructions(e.target.value)}
              rows={3}
              placeholder="Example: Tighten the summary, make the discussion questions more practical, and shorten the appendix headings."
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all resize-none"
            />

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleAiEditToolkit}
                disabled={isLoading || !aiEditInstructions.trim()}
                className="px-4 py-3 rounded-xl bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-[var(--color-accent)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit With AI
              </button>
              <button
                onClick={handleRegenerateToolkit}
                disabled={isLoading}
                className="px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Regenerate Completely
              </button>
              <button
                onClick={handleSaveDraftAsVersion}
                disabled={!hasUnsavedDraft}
                className="px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Draft As Version
              </button>
              <button
                onClick={handleDiscardDraftChanges}
                disabled={!hasUnsavedDraft}
                className="px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revert Draft
              </button>
            </div>
          </section>

          <div
            className={`opacity-0 animate-fade-in stagger-3 min-h-[48vh] ${
              resultViewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''
            }`}
          >
            {resultViewMode === 'transcript' && (
              <div className="flex flex-col min-h-[48vh] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg overflow-hidden h-full">
                <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] shrink-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Transcript
                  </div>
                  {viewModeControls}
                </div>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="flex-1 w-full px-5 py-4 bg-transparent text-[var(--color-text)] focus:outline-none resize-none leading-relaxed overflow-auto"
                  placeholder="Transcript will appear here..."
                />
              </div>
            )}

            {(resultViewMode === 'edit' || resultViewMode === 'split') && (
              <div className="flex flex-col min-h-[48vh] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg overflow-hidden h-full">
                <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] shrink-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Markdown
                  </div>
                  <div className="flex items-center gap-3">
                    {hasUnsavedDraft && (
                      <span className="text-xs font-semibold text-[var(--color-accent)]">
                        Unsaved draft changes
                      </span>
                    )}
                    {resultViewMode !== 'split' && viewModeControls}
                  </div>
                </div>
                <textarea
                  ref={editPanelRef}
                  value={toolkitDraft}
                  onChange={(e) => setToolkitDraft(e.target.value)}
                  onScroll={resultViewMode === 'split' ? handleEditScroll : undefined}
                  className="flex-1 w-full px-5 py-4 bg-transparent text-[var(--color-text)] focus:outline-none resize-none font-mono text-sm leading-relaxed overflow-auto"
                  placeholder="Edit your toolkit content here..."
                />
              </div>
            )}

            {(resultViewMode === 'preview' || resultViewMode === 'split') && (
              <div className="flex flex-col min-h-[48vh] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg overflow-hidden h-full">
                <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] shrink-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </div>
                  {viewModeControls}
                </div>
                <div
                  ref={previewPanelRef}
                  onScroll={resultViewMode === 'split' ? handlePreviewScroll : undefined}
                  className="flex-1 px-5 py-4 overflow-auto"
                >
                  <div className="prose max-w-none">
                    <ReactMarkdown>{toolkitDraft}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>

          {compareVersion && (
            <section className="opacity-0 animate-fade-in stagger-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">Diff View</h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Comparing {compareVersion.name} with {currentToolkitLabel}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-700 font-semibold">+{addedDiffCount} added</span>
                  <span className="text-rose-700 font-semibold">-{removedDiffCount} removed</span>
                </div>
              </div>
              <div className="max-h-[32rem] overflow-auto bg-[#faf8f5] font-mono text-sm">
                {diffLines.map((line, index) => (
                  <div
                    key={`${line.type}-${index}-${line.text}`}
                    className={`px-5 py-1.5 whitespace-pre-wrap border-l-4 ${
                      line.type === 'added'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                        : line.type === 'removed'
                          ? 'bg-rose-50 border-rose-400 text-rose-950'
                          : 'bg-transparent border-transparent text-[var(--color-text-muted)]'
                    }`}
                  >
                    <span className="inline-block w-5">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    {line.text || ' '}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div ref={dropdownRef} className="flex gap-3 opacity-0 animate-fade-in stagger-5 shrink-0">
            <div className="relative flex-1">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'copy' ? 'none' : 'copy')}
                className="w-full py-3.5 px-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)]/30 transition-all duration-300 shadow-sm text-sm md:text-base font-semibold flex items-center justify-center gap-2"
              >
                {copySuccess ? (
                  <>
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                    <svg className={`w-4 h-4 transition-transform ${dropdownOpen === 'copy' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
              {dropdownOpen === 'copy' && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden z-10">
                  <button
                    onClick={() => copyToClipboard(toolkitDraft, 'markdown')}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Markdown</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(stripMarkdown(toolkitDraft), 'plain')}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-3 border-t border-[var(--color-border)]"
                  >
                    <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Plain Text</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative flex-1">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'download' ? 'none' : 'download')}
                className="w-full py-3.5 px-5 rounded-xl bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-[var(--color-accent)]/20 transition-all duration-300 text-sm md:text-base flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen === 'download' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dropdownOpen === 'download' && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden z-10">
                  <button
                    onClick={() => {
                      downloadPdf();
                      setDropdownOpen('none');
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-3 text-[var(--color-text)]"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                      <path d="M8.5 13.5v3h1v-1h.5a1.5 1.5 0 0 0 0-3h-1.5zm1 1v1h.5a.5.5 0 0 0 0-1h-.5zM12 13.5v3h1a1.5 1.5 0 0 0 0-3h-1zm1 1v1a.5.5 0 0 0 0-1zM15 13.5v3h1v-1.5h1v-1h-1v-.5h1v-1h-2z"/>
                    </svg>
                    <span>PDF Document</span>
                  </button>
                  <button
                    onClick={() => {
                      downloadFile(toolkitDraft, 'toolkit.md', 'text/markdown');
                      setDropdownOpen('none');
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-3 border-t border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => {
                      downloadFile(stripMarkdown(toolkitDraft), 'toolkit.txt', 'text/plain');
                      setDropdownOpen('none');
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-3 border-t border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Plain Text (.txt)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Input Screen
  return (
    <main className="min-h-screen flex flex-col p-6 md:p-10 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--color-accent)]/3 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--color-accent)]/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/3" />
      
      <div className={`max-w-3xl mx-auto w-full flex-1 flex flex-col ${!transcript ? 'justify-center' : ''} relative z-10`}>
        {/* Header */}
        <header className={`text-center opacity-0 animate-fade-in ${transcript ? 'mb-10' : 'mb-14'}`}>
          <div className="relative inline-block mb-6">
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3 text-[var(--color-text)]">Small Group Toolkit Generator</h1>
          <p className="text-[var(--color-text-muted)] text-lg max-w-lg mx-auto">
            Upload a sermon recording or paste a transcript to generate discussion materials
          </p>
        </header>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-2 border-[var(--color-accent)]/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-xl text-[var(--color-text)]">{loadingMessage}</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">This may take a moment...</p>
            </div>
          </div>
        )}

        {/* Input Mode Toggle - only show when no transcript yet */}
        {!transcript && (
          <div className="flex gap-1.5 p-1.5 bg-[var(--color-surface)] rounded-2xl mb-10 opacity-0 animate-fade-in stagger-1 border border-[var(--color-border)] shadow-sm">
            <button
              onClick={() => setInputMode('audio')}
              className={`flex-1 py-4 px-5 rounded-xl font-medium transition-all duration-300 ${
                inputMode === 'audio'
                  ? 'bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/20'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <span className="flex items-center justify-center gap-2.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Audio File
              </span>
            </button>
            <button
              onClick={() => setInputMode('transcript')}
              className={`flex-1 py-4 px-5 rounded-xl font-medium transition-all duration-300 ${
                inputMode === 'transcript'
                  ? 'bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/20'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <span className="flex items-center justify-center gap-2.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Existing Transcript
              </span>
            </button>
          </div>
        )}

        {/* Audio Upload */}
        {inputMode === 'audio' && !transcript && (
          <div className="opacity-0 animate-fade-in stagger-2">
            <label
              htmlFor="audio-upload"
              className="block p-12 border-2 border-dashed border-[var(--color-border)] rounded-3xl text-center cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all duration-300 group bg-[var(--color-surface)] shadow-sm"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center group-hover:bg-[var(--color-accent-subtle)] group-hover:border-[var(--color-accent)]/30 transition-all duration-300">
                <svg
                  className="w-8 h-8 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              {audioFile ? (
                <div>
                  <p className="text-[var(--color-accent)] font-semibold text-lg">{audioFile.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    Click to choose a different file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[var(--color-text)] text-lg font-medium">
                    Drop your audio file here or click to browse
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    Supports FLAC, MP3, MP4, MPEG, MPGA, M4A, OGG, WAV, WEBM (max 25MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="audio-upload"
                type="file"
                accept=".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Transcript Input */}
        {inputMode === 'transcript' && !transcript && (
          <div className="opacity-0 animate-fade-in stagger-2">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the sermon transcript here..."
              rows={12}
              className="w-full px-5 py-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all resize-none text-lg leading-relaxed shadow-sm"
            />
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="opacity-0 animate-fade-in stagger-2 mb-8">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
              Transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              className="w-full px-5 py-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all resize-none leading-relaxed shadow-sm"
            />
        </div>
        )}

        {/* Preacher Name */}
        {transcript && (
          <div className="opacity-0 animate-fade-in stagger-3 mb-10">
            <label
              htmlFor="preacher-name"
              className="block text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider"
            >
              Preacher&apos;s Name <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              id="preacher-name"
              type="text"
              value={preacherName}
              onChange={(e) => setPreacherName(e.target.value)}
              placeholder="Enter the preacher's name"
              className="w-full px-5 py-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all text-lg shadow-sm"
            />
          </div>
        )}

        {/* Action Buttons */}
        {transcript && (
          <div className="opacity-0 animate-fade-in stagger-4 space-y-4">
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="px-8 py-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)]/50 hover:text-[var(--color-danger)] transition-all duration-300 shadow-sm"
              >
                Reset
              </button>
              <button
                onClick={handleGenerateToolkit}
                disabled={!preacherName.trim() || isLoading}
                className="flex-1 py-4 px-6 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-lg hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-[var(--color-accent)]/20 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Generate Toolkit
              </button>
            </div>
            
            <button
              onClick={() =>
                downloadFile(
                  transcript,
                  `${audioFile?.name?.replace(/\.[^.]+$/, '') || 'sermon'}_transcript.txt`,
                  'text/plain'
                )
              }
              className="w-full py-3.5 px-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all duration-300 shadow-sm"
            >
              Download Transcript
            </button>
          </div>
        )}
        </div>
      </main>
  );
}
