import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AIAssistantAction, FormData } from '../../types';
import { StreamingText } from '../ui/StreamingText';
import { AIAssistantToolbar } from './AIAssistantToolbar';
import { sanitizeRichText } from '../../utils/sanitizeHTML';

// Import ikon dla paska narzędzi formatowania
// ... (rest of imports)
import { BoldIcon } from '../icons/BoldIcon';
import { ItalicIcon } from '../icons/ItalicIcon';
import { ListOlIcon } from '../icons/ListOlIcon';
import { ListUlIcon } from '../icons/ListUlIcon';
import { LinkIcon } from '../icons/LinkIcon';
import { BlockquoteIcon } from '../icons/BlockquoteIcon';
import { Heading1Icon } from '../icons/Heading1Icon';
import { Heading2Icon } from '../icons/Heading2Icon';
import { UnderlineIcon } from '../icons/UnderlineIcon';
import { StrikethroughIcon } from '../icons/StrikethroughIcon';
import { CodeIcon } from '../icons/CodeIcon';

interface InteractiveEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  onAction: (action: AIAssistantAction, selectedText: string, fullText: string, contextFormData: FormData | null) => void;
  isLoading: boolean;
  formData: FormData | null;
  lite?: boolean;
  inline?: boolean;
  className?: string;
  streaming?: boolean;
}

// Sub-komponent dla przycisku paska narzędzi
interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  label: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive, label, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }} // onMouseDown, aby uniknąć utraty focusa
    className={`p-2 rounded-md transition-colors ${isActive
      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
      }`}
    aria-label={label}
    title={label}
    aria-pressed={isActive}
  >
    {children}
  </button>
);

export const InteractiveEditor: React.FC<InteractiveEditorProps> = ({
  value,
  onChange,
  onAction,
  isLoading,
  formData,
  lite = false,
  inline = false,
  className = '',
  streaming = false,
}) => {
  const editorRef = useRef<HTMLElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarState, setToolbarState] = useState<{ top: number; left: number; selectedText: string } | null>(null);
  const lastSelection = useRef<{ text: string, range: Range } | null>(null);
  const [isMac, setIsMac] = useState(false);

  // Stan dla statycznego paska narzędzi formatowania
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // This check ensures navigator is available and runs only on the client-side.
    setIsMac(typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform));
  }, []);

  const modifierKey = isMac ? '⌘' : 'Ctrl';

  const getSelectionParent = (tagName: string): Node | null => {
    if (typeof window === 'undefined') return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return null;
    let node = selection.getRangeAt(0).startContainer;
    // Handle text node selection by starting from its parent element
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode!;
    }
    while (node && node !== editorRef.current) {
      if (node.nodeName === tagName.toUpperCase()) {
        return node;
      }
      node = node.parentNode!;
    }
    return null;
  };

  // Callback do aktualizacji stanu aktywnego paska narzędzi formatowania
  const updateFormattingToolbar = useCallback(() => {
    if (!editorRef.current || typeof document === 'undefined') return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current.contains(selection.anchorNode)) {
      setActiveFormats({});
      return;
    }
    const formats: Record<string, boolean> = {};
    formats.bold = document.queryCommandState('bold');
    formats.italic = document.queryCommandState('italic');
    formats.underline = document.queryCommandState('underline');
    formats.strikeThrough = document.queryCommandState('strikeThrough');
    formats.insertUnorderedList = document.queryCommandState('insertUnorderedList');
    formats.insertOrderedList = document.queryCommandState('insertOrderedList');
    formats.link = !!getSelectionParent('A');

    const blockType = document.queryCommandValue('formatBlock').toLowerCase();
    formats.blockquote = blockType === 'blockquote';
    formats.pre = blockType === 'pre';
    formats.h1 = blockType === 'h1';
    formats.h2 = blockType === 'h2';

    setActiveFormats(formats);
  }, []);

  // Efekt do synchronizacji zawartości edytora z propem `value`
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Callback do pokazywania/ukrywania pływającego paska narzędzi AI
  const handleSelection = useCallback(() => {
    if (isLoading || typeof window === 'undefined') return;

    const selection = window.getSelection();

    if (!editorRef.current || !selection || selection.isCollapsed || !editorRef.current.contains(selection.anchorNode)) {
      if (toolbarState !== null) setToolbarState(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (selectedText.trim().length > 0) {
      lastSelection.current = { text: selectedText, range };
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      let top, left;

      if (inline) {
        // For inline elements, position relative to viewport and adjust later
        top = rect.top - 50;
        left = rect.left + rect.width / 2;
      } else {
        // For block elements, position relative to the editor container
        top = rect.top - editorRect.top - 50;
        left = rect.left - editorRect.left + rect.width / 2;
      }

      setToolbarState({
        top: Math.max(0, top),
        left,
        selectedText,
      });
    } else {
      if (toolbarState !== null) setToolbarState(null);
    }
  }, [isLoading, toolbarState, inline]);

  // Efekt do dołączania i czyszczenia nasłuchiwaczy zdarzeń
  useEffect(() => {
    const editorNode = editorRef.current;

    const handleAllUpdates = () => {
      handleSelection();
      if (!lite) {
        updateFormattingToolbar();
      }
    };

    document.addEventListener('selectionchange', handleAllUpdates);
    document.addEventListener('mouseup', handleSelection);

    if (editorNode) {
      editorNode.addEventListener('keyup', handleAllUpdates);
      editorNode.addEventListener('click', handleAllUpdates);
      editorNode.addEventListener('focus', handleAllUpdates);
    }

    return () => {
      document.removeEventListener('selectionchange', handleAllUpdates);
      document.removeEventListener('mouseup', handleSelection);
      if (editorNode) {
        editorNode.removeEventListener('keyup', handleAllUpdates);
        editorNode.removeEventListener('click', handleAllUpdates);
        editorNode.removeEventListener('focus', handleAllUpdates);
      }
    };
  }, [handleSelection, updateFormattingToolbar, lite]);

  // Efekt do obsługi kliknięć na zewnątrz w celu ukrycia pływającego paska narzędzi
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLoading) return;

      if (
        toolbarState &&
        editorRef.current && !editorRef.current.contains(event.target as Node) &&
        toolbarRef.current && !toolbarRef.current.contains(event.target as Node)
      ) {
        setToolbarState(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [toolbarState, isLoading]);


  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  const handleAIAction = (action: AIAssistantAction, customPrompt?: string) => {
    if (!lastSelection.current) return;
    const { text, range } = lastSelection.current;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    onAction(action, text, editorRef.current?.innerHTML || value, formData);
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateFormattingToolbar();
  };

  const handleHeading = (tag: 'h1' | 'h2') => {
    const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
    handleFormat('formatBlock', currentBlock === tag ? 'p' : tag);
  }

  const handleLink = () => {
    const linkNode = getSelectionParent('A');
    if (linkNode) {
      document.execCommand('unlink', false);
    } else {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }
      // Link creation requires proper UI component - disabled for now
      return;
    }
    editorRef.current?.focus();
    updateFormattingToolbar();
  };

  const handleBlockquote = () => {
    const isQuote = document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote';
    handleFormat('formatBlock', isQuote ? 'p' : 'blockquote');
  };

  const handleCodeBlock = () => {
    const isCode = document.queryCommandValue('formatBlock').toLowerCase() === 'pre';
    handleFormat('formatBlock', isCode ? 'p' : 'pre');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.metaKey || e.ctrlKey) {
      let command: string | null = null;
      let value: string | undefined = undefined;

      switch (e.key.toLowerCase()) {
        case 'b':
          command = 'bold';
          break;
        case 'i':
          command = 'italic';
          break;
        case 'u':
          command = 'underline';
          break;
        case 'x':
          if (e.shiftKey) {
            command = 'strikeThrough';
          }
          break;
        case 'c':
          if (e.shiftKey) {
            e.preventDefault();
            handleCodeBlock();
            return;
          }
          break;
        case 'k': // Common shortcut for link
          e.preventDefault();
          handleLink();
          return;
        // Ctrl+Shift+7 for Numbered List
        // Ctrl+Shift+8 for Bulleted List
        case '7':
          if (e.shiftKey) {
            command = 'insertOrderedList';
          }
          break;
        case '8':
          if (e.shiftKey) {
            command = 'insertUnorderedList';
          }
          break;
        case '1':
          command = 'formatBlock';
          value = 'h1';
          break;
        case '2':
          command = 'formatBlock';
          value = 'h2';
          break;
      }

      if (command) {
        e.preventDefault();
        if (command === 'formatBlock' && value) {
          handleHeading(value as 'h1' | 'h2');
        } else {
          handleFormat(command);
        }
      }
    }
  };

  const EditableElement = inline ? 'span' : 'div';
  const WrapperElement = inline ? 'span' : 'div';

  const editableContent = streaming ? (
    <StreamingText
      text={value.replace(/<[^>]*>/g, '')} // Remove HTML tags for streaming display
      className={className}
      speed={30}
    />
  ) : (
    <EditableElement
      ref={editorRef as any}
      contentEditable={!isLoading}
      suppressContentEditableWarning
      onInput={handleEditorChange}
      onKeyDown={handleKeyDown}
      className={`focus:outline-none intesanitizeRichText(racti)ve-editor ${className} ${!inline && !lite ? 'prose dark:prose-invert max-w-none w-full' : ''}`}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );

  return (
    <WrapperElement className={`relative ${inline ? 'inline' : 'block'}`}>
      {toolbarState && (
        <div
          ref={toolbarRef}
          className="absolute z-10 transition-opacity animate-fade-in"
          style={{
            animationDuration: '150ms',
            position: inline ? 'fixed' : 'absolute',
            top: `${toolbarState.top}px`,
            left: `${toolbarState.left}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <AIAssistantToolbar onAction={handleAIAction} isLoading={isLoading} />
        </div>
      )}

      <style>{`
            .interactive-editor h1 { font-size: 1.5em; font-weight: bold; margin: 0.67em 0; }
            .interactive-editor h2 { font-size: 1.25em; font-weight: bold; margin: 0.83em 0; }
            .interactive-editor ul, .interactive-editor ol {
                padding-left: 1.5rem;
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
            }
            .interactive-editor ul {
                list-style-type: disc;
            }
            .interactive-editor ol {
                list-style-type: decimal;
            }
            .interactive-editor a {
                color: #2563eb; /* blue-600 */
                text-decoration: underline;
                text-decoration-thickness: 1px;
                text-underline-offset: 2px;
            }
            .dark .interactive-editor a {
                color: #60a5fa; /* blue-400 */
            }
            .interactive-editor blockquote {
                border-left: 3px solid #e2e8f0; /* gray-200 */
                padding-left: 1rem;
                margin-left: 0.25rem;
                color: #64748b; /* gray-500 */
                font-style: italic;
            }
            .dark .interactive-editor blockquote {
                border-left-color: #475569; /* gray-600 */
                color: #94a3b8; /* gray-400 */
            }
            .interactive-editor pre {
                background-color: #f3f4f6; /* gray-100 */
                border-radius: 0.375rem; /* rounded-md */
                padding: 0.75rem; /* p-3 */
                font-family: monospace;
                font-size: 0.875rem; /* text-sm */
                overflow-x: auto;
                white-space: pre-wrap;
                border: 1px solid #e5e7eb; /* gray-200 */
            }
            .dark .interactive-editor pre {
                background-color: #1f2937; /* gray-800 */
                color: #d1d5db; /* gray-300 */
                border-color: #374151; /* gray-700 */
            }
            .interactive-editor u {
                text-decoration: underline;
                text-underline-offset: 2px;
            }
            .interactive-editor s {
                text-decoration: line-through;
            }
        `}</style>

      {lite ? (
        editableContent
      ) : (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1 flex-wrap">
            <ToolbarButton onClick={() => handleFormat('bold')} isActive={activeFormats.bold} label={`Pogrubienie (${modifierKey}+B)`}>
              <BoldIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleFormat('italic')} isActive={activeFormats.italic} label={`Kursywa (${modifierKey}+I)`}>
              <ItalicIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleFormat('underline')} isActive={activeFormats.underline} label={`Podkreślenie (${modifierKey}+U)`}>
              <UnderlineIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleFormat('strikeThrough')} isActive={activeFormats.strikeThrough} label={`Przekreślenie (${modifierKey}+Shift+X)`}>
              <StrikethroughIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={handleLink} isActive={!!activeFormats.link} label={`Wstaw link (${modifierKey}+K)`}>
              <LinkIcon className="w-5 h-5" />
            </ToolbarButton>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <ToolbarButton onClick={() => handleHeading('h1')} isActive={activeFormats.h1} label={`Nagłówek 1 (${modifierKey}+1)`}>
              <Heading1Icon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleHeading('h2')} isActive={activeFormats.h2} label={`Nagłówek 2 (${modifierKey}+2)`}>
              <Heading2Icon className="w-5 h-5" />
            </ToolbarButton>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <ToolbarButton onClick={() => handleFormat('insertUnorderedList')} isActive={activeFormats.insertUnorderedList} label={`Lista punktowana (${modifierKey}+Shift+8)`}>
              <ListUlIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleFormat('insertOrderedList')} isActive={activeFormats.insertOrderedList} label={`Lista numerowana (${modifierKey}+Shift+7)`}>
              <ListOlIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={handleBlockquote} isActive={!!activeFormats.blockquote} label="Cytat blokowy">
              <BlockquoteIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={handleCodeBlock} isActive={!!activeFormats.pre} label={`Blok kodu (${modifierKey}+Shift+C)`}>
              <CodeIcon className="w-5 h-5" />
            </ToolbarButton>
          </div>
          <div className="p-3 min-h-[8rem]">
            {editableContent}
          </div>
        </div>
      )}
    </WrapperElement>
  );
};
