import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import type { SelectChangeEvent } from '@mui/material/Select'
import { Eraser, Highlighter, Type, Table2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

const toolbarId = `lesson-editor-toolbar`
const formats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'color', 'background']
const textColorOptions = ['#0f172a', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed']
const highlightColorOptions = ['#fef08a', '#fde68a', '#fecaca', '#fed7aa', '#bfdbfe', '#bbf7d0', '#ddd6fe', '#fbcfe8']
const headingOptions = [
  { value: '', label: 'Normal' },
  { value: '1', label: 'Heading 1' },
  { value: '2', label: 'Heading 2' },
  { value: '3', label: 'Heading 3' },
]

const toolbarSelectSx = {
  minWidth: 142,
  '& .MuiOutlinedInput-root': {
    height: 40,
    borderRadius: '0.95rem',
    background: 'rgba(240,249,255,0.82)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.95rem',
    color: '#183b5b',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(191, 219, 254, 0.95)',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(125, 211, 252, 0.95)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#38bdf8',
    boxShadow: '0 0 0 4px rgba(186, 230, 253, 0.35)',
  },
  '& .MuiSelect-select': {
    py: '0.55rem',
    px: '0.85rem',
  },
  '& .MuiSvgIcon-root': {
    color: '#2468a0',
  },
}

const toolbarMenuProps = {
  PaperProps: {
    sx: {
      mt: 1,
      borderRadius: '1rem',
      border: '1px solid rgba(191, 219, 254, 0.9)',
      background: 'rgba(255,255,255,0.98)',
      boxShadow: '0 18px 40px rgba(36, 104, 160, 0.16)',
      overflow: 'hidden',
    },
  },
  MenuListProps: {
    sx: {
      py: 1,
      '& .MuiMenuItem-root': {
        mx: 1,
        my: 0.25,
        borderRadius: '0.85rem',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.95rem',
        color: '#0f172a',
      },
      '& .MuiMenuItem-root:hover': {
        backgroundColor: 'rgba(236, 254, 255, 0.95)',
      },
      '& .MuiMenuItem-root.Mui-selected': {
        background: 'linear-gradient(90deg, rgba(36,104,160,0.16), rgba(15,139,141,0.18))',
        color: '#0f3f61',
        fontWeight: 700,
      },
      '& .MuiMenuItem-root.Mui-selected:hover': {
        background: 'linear-gradient(90deg, rgba(36,104,160,0.18), rgba(15,139,141,0.22))',
      },
    },
  },
} as const

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [openMenu, setOpenMenu] = useState<'text' | 'highlight' | null>(null)
  const [headerValue, setHeaderValue] = useState('')

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

  useEffect(() => {
    const editor = quillRef.current?.getEditor()
    if (!editor) {
      return undefined
    }

    const syncHeader = () => {
      const range = editor.getSelection()
      const formats = range ? editor.getFormat(range) : editor.getFormat()
      const nextValue =
        typeof formats.header === 'number' || typeof formats.header === 'string'
          ? String(formats.header)
          : ''

      setHeaderValue(nextValue)
    }

    syncHeader()
    editor.on('selection-change', syncHeader)
    editor.on('text-change', syncHeader)

    return () => {
      editor.off('selection-change', syncHeader)
      editor.off('text-change', syncHeader)
    }
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
          <FormControl size="small" sx={toolbarSelectSx}>
            <Select
              displayEmpty
              value={headerValue}
              MenuProps={toolbarMenuProps}
              onChange={(event: SelectChangeEvent) => {
                const editor = quillRef.current?.getEditor()
                if (!editor) {
                  return
                }

                const nextValue = event.target.value
                editor.focus()
                editor.format('header', nextValue ? Number(nextValue) : false, 'user')
                setHeaderValue(nextValue)
              }}
            >
              {headingOptions.map((option) => (
                <MenuItem key={option.label} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
