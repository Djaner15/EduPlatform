import { Eraser, Highlighter, Type, Table2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

const toolbarId = `lesson-editor-toolbar`
const formats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'color', 'background']
const textColorOptions = ['#0f172a', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed']
const highlightColorOptions = ['#fef08a', '#fde68a', '#fecaca', '#fed7aa', '#bfdbfe', '#bbf7d0', '#ddd6fe', '#fbcfe8']

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [openMenu, setOpenMenu] = useState<'text' | 'highlight' | null>(null)

  const toggleInlineFormat = (format: 'bold' | 'italic' | 'underline') => {
    const editor = quillRef.current?.getEditor()
    if (!editor) {
      return
    }

    editor.focus()
    const range = editor.getSelection(true)
    if (!range) {
      return
    }

    const currentFormats = editor.getFormat(range)
    const isEnabled = Boolean(currentFormats[format])

    if (range.length > 0) {
      editor.formatText(range.index, range.length, format, !isEnabled, 'user')
      editor.setSelection(range.index + range.length, 0)
      return
    }

    editor.format(format, !isEnabled, 'user')
  }

  const applyInlineFormat = (format: 'color' | 'background', nextValue: string | false) => {
    const editor = quillRef.current?.getEditor()
    if (!editor) {
      return
    }

    editor.focus()
    const range = editor.getSelection(true)
    if (!range) {
      return
    }

    if (range.length > 0) {
      editor.formatText(range.index, range.length, format, nextValue, 'user')
      editor.setSelection(range.index + range.length, 0)
      return
    }

    editor.format(format, nextValue, 'user')
  }

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
        toolbarRef.current
          ?.querySelectorAll('.ql-picker.ql-expanded')
          .forEach((picker) => picker.classList.remove('ql-expanded'))
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          bold: () => toggleInlineFormat('bold'),
          italic: () => toggleInlineFormat('italic'),
          underline: () => toggleInlineFormat('underline'),
          insertTable: () => {
            const editor = quillRef.current?.getEditor()
            if (!editor) {
              return
            }

            const range = editor.getSelection(true)
            const index = range?.index ?? editor.getLength()
            const tableMarkup =
              '<table><tbody><tr><th>Column 1</th><th>Column 2</th></tr><tr><td>Value</td><td>Value</td></tr><tr><td>Value</td><td>Value</td></tr></tbody></table><p><br></p>'

            editor.clipboard.dangerouslyPasteHTML(index, tableMarkup, 'user')
            editor.setSelection(index + 1, 0)
            setOpenMenu(null)
          },
        },
      },
    }),
    [],
  )

  return (
    <div className="rich-editor rounded-2xl border border-sky-200 bg-white">
      <div className="ql-toolbar ql-snow" id={toolbarId} ref={toolbarRef}>
        <span className="ql-formats">
          <select className="ql-header" defaultValue="">
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="">Normal</option>
          </select>
        </span>
        <span className="ql-formats">
          <button aria-label="Bold" className="ql-bold" type="button" />
          <button aria-label="Italic" className="ql-italic" type="button" />
          <button aria-label="Underline" className="ql-underline" type="button" />
        </span>
        <span className="ql-formats">
          <div className="toolbar-menu">
            <button
              aria-expanded={openMenu === 'text'}
              aria-label="Text color"
              className="toolbar-menu-trigger"
              type="button"
              onClick={() => setOpenMenu((current) => (current === 'text' ? null : 'text'))}
            >
              <Type className="h-4 w-4" />
            </button>
            {openMenu === 'text' ? (
              <div className="toolbar-color-popover">
                <div className="toolbar-color-grid">
                  {textColorOptions.map((color) => (
                    <button
                      aria-label={`Text color ${color}`}
                      className="toolbar-color-swatch"
                      key={color}
                      style={{ backgroundColor: color }}
                      type="button"
                      onClick={() => {
                        applyInlineFormat('color', color)
                        setOpenMenu(null)
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="toolbar-menu">
            <button
              aria-expanded={openMenu === 'highlight'}
              aria-label="Highlight color"
              className="toolbar-menu-trigger"
              type="button"
              onClick={() => setOpenMenu((current) => (current === 'highlight' ? null : 'highlight'))}
            >
              <Highlighter className="h-4 w-4" />
            </button>
            {openMenu === 'highlight' ? (
              <div className="toolbar-color-popover">
                <div className="toolbar-color-grid">
                  <button
                    aria-label="Remove highlight"
                    className="toolbar-color-swatch toolbar-color-swatch-clear"
                    type="button"
                    onClick={() => {
                      applyInlineFormat('background', false)
                      setOpenMenu(null)
                    }}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </button>
                  {highlightColorOptions.map((color) => (
                    <button
                      aria-label={`Highlight color ${color}`}
                      className="toolbar-color-swatch"
                      key={color}
                      style={{ backgroundColor: color }}
                      type="button"
                      onClick={() => {
                        applyInlineFormat('background', color)
                        setOpenMenu(null)
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

        </span>
        <span className="ql-formats">
          <button aria-label="Ordered list" className="ql-list" type="button" value="ordered" />
          <button aria-label="Bullet list" className="ql-list" type="button" value="bullet" />
        </span>
        <span className="ql-formats">
          <button aria-label="Link" className="ql-link" type="button" />
          <button aria-label="Insert table" className="ql-insertTable" type="button">
            <Table2 className="h-4 w-4" />
          </button>
          <button aria-label="Clear formatting" className="ql-clean" type="button" />
        </span>
      </div>
      <ReactQuill
        formats={formats}
        modules={modules}
        placeholder={placeholder}
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
