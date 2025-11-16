import React, { useRef, useEffect, useState } from 'react';
import { BoldIcon } from './icons/BoldIcon';
import { ItalicIcon } from './icons/ItalicIcon';
import { ListOlIcon } from './icons/ListOlIcon';
import { ListUlIcon } from './icons/ListUlIcon';
import { Heading1Icon } from './icons/Heading1Icon';
import { Heading2Icon } from './icons/Heading2Icon';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  label: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive, label, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }} // use onMouseDown to prevent blur
    className={`p-2 rounded-md transition-colors ${
      isActive
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

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  const updateToolbar = () => {
    if(!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current.contains(selection.anchorNode)) {
        setActiveFormats({});
        return;
    }
    const formats: Record<string, boolean> = {};
    formats.bold = document.queryCommandState('bold');
    formats.italic = document.queryCommandState('italic');
    formats.insertUnorderedList = document.queryCommandState('insertUnorderedList');
    formats.insertOrderedList = document.queryCommandState('insertOrderedList');
    const blockType = document.queryCommandValue('formatBlock').toLowerCase();
    formats.h1 = blockType === 'h1';
    formats.h2 = blockType === 'h2';
    setActiveFormats(formats);
  };

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbar);
    return () => document.removeEventListener('selectionchange', updateToolbar);
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbar();
  };
  
  const handleHeading = (tag: 'h1' | 'h2') => {
    const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
    handleFormat('formatBlock', currentBlock === tag ? 'p' : tag);
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all transform ease-out duration-200 focus-within:scale-[1.01]">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1 flex-wrap">
        <ToolbarButton onClick={() => handleFormat('bold')} isActive={activeFormats.bold} label="Pogrubienie">
          <BoldIcon className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => handleFormat('italic')} isActive={activeFormats.italic} label="Kursywa">
          <ItalicIcon className="w-5 h-5" />
        </ToolbarButton>
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <ToolbarButton onClick={() => handleHeading('h1')} isActive={activeFormats.h1} label="Nagłówek 1">
            <Heading1Icon className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => handleHeading('h2')} isActive={activeFormats.h2} label="Nagłówek 2">
            <Heading2Icon className="w-5 h-5" />
        </ToolbarButton>
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <ToolbarButton onClick={() => handleFormat('insertUnorderedList')} isActive={activeFormats.insertUnorderedList} label="Lista punktowana">
          <ListUlIcon className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => handleFormat('insertOrderedList')} isActive={activeFormats.insertOrderedList} label="Lista numerowana">
          <ListOlIcon className="w-5 h-5" />
        </ToolbarButton>
      </div>
      <style>{`
        .rich-text-editor:empty:before {
          content: attr(data-placeholder);
          color: #6b7280; /* gray-500 */
          pointer-events: none;
          display: block;
        }
        .dark .rich-text-editor:empty:before {
            color: #4b5563; /* gray-600 */
        }
        .rich-text-editor ul, .rich-text-editor ol {
            padding-left: 1.5rem;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .rich-text-editor ul {
            list-style-type: disc;
        }
        .rich-text-editor ol {
            list-style-type: decimal;
        }
        .rich-text-editor h1 { font-size: 1.5em; font-weight: bold; margin: 0.67em 0; }
        .rich-text-editor h2 { font-size: 1.25em; font-weight: bold; margin: 0.83em 0; }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={updateToolbar}
        onBlur={() => setActiveFormats({})}
        onClick={updateToolbar}
        onKeyUp={updateToolbar}
        className="rich-text-editor w-full p-3 min-h-[7rem] focus:outline-none overflow-y-auto"
        data-placeholder={placeholder}
      />
    </div>
  );
};
