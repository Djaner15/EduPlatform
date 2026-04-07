import Papa from 'papaparse'
import axios from 'axios'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { AlertCircle, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { useNotification } from '../../../app/NotificationContext'
import apiClient from '../../../shared/api/axiosInstance'
import { sectionOptions } from '../../../shared/classOptions'

type BulkUploadModalProps = {
  isOpen: boolean
  onClose: () => void
  onImported: () => Promise<void> | void
}

type CsvRow = {
  fullName: string
  username: string
  email: string
  password: string
  grade: string
  section: string
}

type PreviewRow = CsvRow & {
  rowNumber: number
  normalizedGrade: number | null
  normalizedSection: string
  errors: string[]
}

const csvHeaders = ['fullName', 'username', 'email', 'password', 'grade', 'section']

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalizeCell = (value: unknown) => String(value ?? '').trim()

const validatePassword = (password: string) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.'
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.'
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.'
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one symbol.'
  }

  return null
}

const buildPreviewRows = (rows: CsvRow[]) => {
  const normalizedRows = rows.map((row) => ({
    fullName: normalizeCell(row.fullName),
    username: normalizeCell(row.username),
    email: normalizeCell(row.email),
    password: normalizeCell(row.password),
    grade: normalizeCell(row.grade),
    section: normalizeCell(row.section).toUpperCase(),
  }))

  const usernameCounts = normalizedRows.reduce<Record<string, number>>((accumulator, row) => {
    const key = row.username.toLowerCase()
    if (key) {
      accumulator[key] = (accumulator[key] ?? 0) + 1
    }
    return accumulator
  }, {})

  const emailCounts = normalizedRows.reduce<Record<string, number>>((accumulator, row) => {
    const key = row.email.toLowerCase()
    if (key) {
      accumulator[key] = (accumulator[key] ?? 0) + 1
    }
    return accumulator
  }, {})

  return normalizedRows.map<PreviewRow>((row, index) => {
    const username = normalizeCell(row.username)
    const fullName = normalizeCell(row.fullName)
    const email = normalizeCell(row.email)
    const password = normalizeCell(row.password)
    const gradeText = normalizeCell(row.grade)
    const section = normalizeCell(row.section).toUpperCase()
    const grade = Number.parseInt(gradeText, 10)
    const errors: string[] = []

    if (!fullName) {
      errors.push('Full name is required.')
    }

    if (!username) {
      errors.push('Username is required.')
    }

    if (!email) {
      errors.push('Email is required.')
    } else if (!emailPattern.test(email)) {
      errors.push('Email address is invalid.')
    } else if (emailCounts[email.toLowerCase()] > 1) {
      errors.push('Duplicate email found in the CSV file.')
    }

    if (!password) {
      errors.push('Password is required.')
    } else {
      const passwordError = validatePassword(password)
      if (passwordError) {
        errors.push(passwordError)
      }
    }

    if (!Number.isInteger(grade) || grade < 8 || grade > 12) {
      errors.push('Grade must be a number between 8 and 12.')
    }

    if (!sectionOptions.includes(section as (typeof sectionOptions)[number])) {
      errors.push('Section must be one of: А, Б, В, Г, Д, Е, Ж, З (Cyrillic).')
    }

    if (usernameCounts[username.toLowerCase()] > 1) {
      errors.push('Duplicate username found in the CSV file.')
    }

    return {
      username,
      fullName,
      email,
      password,
      grade: gradeText,
      section,
      rowNumber: index + 2,
      normalizedGrade: Number.isInteger(grade) ? grade : null,
      normalizedSection: section,
      errors,
    }
  })
}

export function BulkUploadModal({ isOpen, onClose, onImported }: BulkUploadModalProps) {
  const { showNotification } = useNotification()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsDragging(false)
      setFileName('')
      setRows([])
      setParseError(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  const hasValidationErrors = useMemo(() => rows.some((row) => row.errors.length > 0), [rows])

  const downloadTemplate = () => {
    const csvContent = `${csvHeaders.join(',')}\nPetar Ivanov,primer8a,student@example.com,StrongPass1!,8,А\n`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'students-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const processFile = (file: File) => {
    setParseError(null)
    setFileName(file.name)

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (result) => {
        if (result.errors.length > 0) {
          setRows([])
          setParseError('Файлът не можа да бъде прочетен коректно.')
          return
        }

        const parsedRows = result.data
          .map((row) => ({
            username: normalizeCell(row.username),
            fullName: normalizeCell(row.fullName),
            email: normalizeCell(row.email),
            password: normalizeCell(row.password),
            grade: normalizeCell(row.grade),
            section: normalizeCell(row.section),
          }))
          .filter((row) => Object.values(row).some((value) => value.length > 0))

        const missingHeaders = csvHeaders.filter((header) => !(header in (result.meta.fields ?? []).reduce<Record<string, true>>((acc, field) => {
          acc[field] = true
          return acc
        }, {})))

        if (missingHeaders.length > 0) {
          setRows([])
          setParseError(`Липсват колони: ${missingHeaders.join(', ')}.`)
          return
        }

        if (!parsedRows.length) {
          setRows([])
          setParseError('CSV файлът е празен.')
          return
        }

        const previewRows = buildPreviewRows(parsedRows)
        setRows(previewRows)
      },
      error: () => {
        setRows([])
        setParseError('Възникна грешка при обработката на CSV файла.')
      },
    })
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    processFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) {
      return
    }

    processFile(file)
  }

  const confirmImport = async () => {
    if (!rows.length || hasValidationErrors) {
      return
    }

    setIsSubmitting(true)

    try {
      await apiClient.post('/users/bulk-students', {
        students: rows.map((row) => ({
          fullName: row.fullName,
          username: row.username,
          email: row.email,
          password: row.password,
          grade: row.normalizedGrade,
          section: row.normalizedSection,
        })),
      })

      showNotification('Учениците бяха импортирани успешно.', 'success')
      await onImported()
      onClose()
    } catch (error) {
      let message = 'Import failed. Please review the data and try again.'

      if (axios.isAxiosError(error)) {
        if (typeof error.response?.data === 'string') {
          message = error.response.data
        } else if (typeof error.message === 'string' && error.message) {
          message = error.message
        }
      } else if (error instanceof Error && error.message) {
        message = error.message
      }

      showNotification(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose()
        }
      }}
    >
      <div className="glass-panel flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-blue-100/80 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Bulk import</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Bulk Student Import</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Upload a CSV file with columns: <span className="font-semibold">fullName, username, email, password, grade, section</span>. You will see a preview before confirming.
            </p>
          </div>
          <button
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6 xl:grid-cols-[0.38fr_0.62fr]">
          <div className="space-y-4">
            <button className="button-primary inline-flex items-center gap-2" type="button" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download CSV Template
            </button>

            <div
              className={`rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-50/80'
                  : 'border-sky-200 bg-sky-50/55'
              }`}
              onDragEnter={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                if (event.currentTarget === event.target) {
                  setIsDragging(false)
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#2468a0] shadow-sm">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Drag & Drop CSV file here or click to browse</h3>
              <p className="mt-2 text-sm text-slate-600">CSV files should be saved with UTF-8 encoding.</p>
              <button
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Choose File
              </button>
              <input accept=".csv,text/csv" className="hidden" ref={inputRef} type="file" onChange={handleFileChange} />
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white/75 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Data requirements</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Grade must be a number between 8 and 12.</li>
                <li>Section must be one of: А, Б, В, Г, Д, Е, Ж, З (Cyrillic).</li>
                <li>Password must be strong: uppercase, lowercase, number, and symbol.</li>
                <li>The CSV file must be saved in UTF-8 for correct Cyrillic support.</li>
              </ul>
            </div>

            {fileName ? (
              <div className="rounded-3xl border border-sky-100 bg-white/75 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Selected file</p>
                <p className="mt-2 break-all">{fileName}</p>
              </div>
            ) : null}

            {parseError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl border border-sky-100 bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Preview before import</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {rows.length
                    ? `Rows: ${rows.length}${hasValidationErrors ? ' · Invalid entries detected' : ' · All entries are valid'}`
                    : 'No CSV file loaded yet.'}
                </p>
              </div>
              <button
                className="button-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!rows.length || hasValidationErrors || isSubmitting}
                type="button"
                onClick={() => void confirmImport()}
              >
                <Upload className="h-4 w-4" />
                {isSubmitting ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200">
              {rows.length ? (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Row</th>
                      <th className="px-4 py-3 font-semibold">Full Name</th>
                      <th className="px-4 py-3 font-semibold">Username</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Grade</th>
                      <th className="px-4 py-3 font-semibold">Section</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr
                        key={`${row.rowNumber}-${row.email}-${row.username}`}
                        className={row.errors.length ? 'bg-rose-50/90' : 'bg-emerald-50/40'}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-slate-700">{row.fullName || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{row.username || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{row.email || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{row.grade || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{row.section || '—'}</td>
                        <td className="px-4 py-3">
                          {row.errors.length ? (
                            <div className="space-y-1 text-xs text-rose-700">
                              {row.errors.map((error) => (
                                <div key={error} className="flex items-start gap-1">
                                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span>{error}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              <Upload className="h-3.5 w-3.5" />
                              Ready to import
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center px-6 text-center text-sm text-slate-500">
                  No CSV file loaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
