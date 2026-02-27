import { useCallback, useMemo, useState } from 'react'
import moment from 'moment'

type DroppedFile = {
  id: string
  name: string
  path: string
  size: number
  modified: number
}

type FolderNode = {
  name: string
  path: string
  children: FolderNode[]
  files: DroppedFile[]
  size: number
  modified: number
}

type SortKey = 'name' | 'size' | 'modified' | 'relative'

type SortConfig = {
  key: SortKey
  direction: 'asc' | 'desc'
}

type FileSystemEntry =
  | FileSystemFileEntry
  | FileSystemDirectoryEntry
  | null

type FileSystemFileEntry = {
  isFile: true
  isDirectory: false
  name: string
  file: (callback: (file: File) => void) => void
}

type FileSystemDirectoryEntry = {
  isFile: false
  isDirectory: true
  name: string
  createReader: () => FileSystemDirectoryReader
}

type FileSystemDirectoryReader = {
  readEntries: (callback: (entries: FileSystemEntry[]) => void) => void
}

type WebkitDataTransferItem = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry
}

function formatBytes(size: number) {
  if (size === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(size) / Math.log(1024)),
  )
  const value = size / 1024 ** exponent

  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${
    units[exponent]
  }`
}

function formatDate(timestamp: number) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString()
}

function formatRelativeDate(timestamp: number) {
  if (!timestamp) return '—'
  return moment(timestamp).fromNow()
}

function createEntryLabel(basePath: string, entryName: string) {
  return basePath ? `${basePath}/${entryName}` : entryName
}

function buildFolderTree(files: DroppedFile[]) {
  const root: FolderNode = {
    name: '',
    path: '',
    children: [],
    files: [],
    size: 0,
    modified: 0,
  }
  const nodeByPath = new Map<string, FolderNode>()
  nodeByPath.set('', root)

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean)
    const fileName = parts.pop()
    let current = root

    for (const part of parts) {
      const nextPath = current.path ? `${current.path}/${part}` : part
      let next = nodeByPath.get(nextPath)
      if (!next) {
        next = {
          name: part,
          path: nextPath,
          children: [],
          files: [],
          size: 0,
          modified: 0,
        }
        current.children.push(next)
        nodeByPath.set(nextPath, next)
      }
      current = next
    }

    if (fileName) {
      current.files.push(file)
    }
  }

  const calculateMetadata = (node: FolderNode): number => {
    const fileTotal = node.files.reduce((sum, file) => sum + file.size, 0)
    const fileModified = node.files.reduce(
      (latest, file) => Math.max(latest, file.modified),
      0,
    )
    const childTotal = node.children.reduce(
      (sum, child) => sum + calculateMetadata(child),
      0,
    )
    const childModified = node.children.reduce(
      (latest, child) => Math.max(latest, child.modified),
      0,
    )
    const total = fileTotal + childTotal
    node.size = total
    node.modified = Math.max(fileModified, childModified)
    return total
  }

  calculateMetadata(root)

  return root
}

function Browse() {
  const [files, setFiles] = useState<DroppedFile[]>([])
  const [status, setStatus] = useState('Drop a folder to list files.')
  const [isDragging, setIsDragging] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(),
  )
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'size',
    direction: 'desc',
  })

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (!isDragging) setIsDragging(true)
    },
    [isDragging],
  )

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
    },
    [],
  )

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)

    const items = Array.from(event.dataTransfer.items).filter(
      (item) => item.kind === 'file',
    ) as WebkitDataTransferItem[]

    if (items.length === 0) {
      setStatus('No folder detected. Drop a directory from your file explorer.')
      setFiles([])
      return
    }

    const entries = items
      .map((item) => item.webkitGetAsEntry?.())
      .filter(Boolean) as FileSystemEntry[]

    const directoryEntry = entries.find((entry) => entry?.isDirectory)

    if (!directoryEntry || !directoryEntry.isDirectory) {
      setStatus('Drop a folder to list files.')
      setFiles([])
      return
    }

    setStatus(`Reading ${directoryEntry.name}...`)

    const collected: DroppedFile[] = []
    let idCounter = 0

    const walkEntry = (
      entry: FileSystemEntry,
      parentPath: string,
    ): Promise<void> => {
      if (!entry) return Promise.resolve()

      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => {
            const relativePath = createEntryLabel(parentPath, file.name)
            collected.push({
              id: `${idCounter++}`,
              name: file.name,
              path: relativePath,
              size: file.size,
              modified: file.lastModified,
            })
            resolve()
          })
        })
      }

      if (entry.isDirectory) {
        const reader = entry.createReader()
        const directoryPath = createEntryLabel(parentPath, entry.name)

        return new Promise((resolve) => {
          const readBatch = () => {
            reader.readEntries((batch) => {
              if (batch.length === 0) {
                resolve()
                return
              }

              Promise.all(batch.map((child) => walkEntry(child, directoryPath)))
                .then(readBatch)
                .catch(() => resolve())
            })
          }

          readBatch()
        })
      }

      return Promise.resolve()
    }

    await walkEntry(directoryEntry, '')
    setFiles(collected)
    const nextExpanded = new Set<string>()
    collected.forEach((file) => {
      const [topLevel] = file.path.split('/')
      if (topLevel && file.path.includes('/')) {
        nextExpanded.add(topLevel)
      }
    })
    setExpandedFolders(nextExpanded)
    setSortConfig((prev) => ({ ...prev, key: 'size', direction: 'desc' }))
    setStatus(
      collected.length === 0
        ? 'No files found in that folder.'
        : `Found ${collected.length} file${collected.length === 1 ? '' : 's'}.`,
    )
  }, [])

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  )

  const folderTree = useMemo(() => buildFolderTree(files), [files])

  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleSortChange = useCallback((key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { key, direction: 'asc' }
    })
  }, [])

  const compareBy = useCallback(
    (a: { name: string; size: number; modified: number }, b: typeof a) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1

      if (sortConfig.key === 'name') {
        return a.name.localeCompare(b.name) * direction
      }

      if (sortConfig.key === 'size') {
        return (a.size - b.size) * direction
      }

      return (a.modified - b.modified) * direction
    },
    [sortConfig],
  )

  const rows = useMemo(() => {
    const rendered: React.ReactNode[] = []

    const renderFolderRow = (node: FolderNode, depth: number) => {
      const isExpanded = expandedFolders.has(node.path)
      rendered.push(
        <tr className="file-table__row file-table__row--folder" key={node.path}>
          <td
            className="file-table__cell file-table__cell--name"
            style={{ paddingLeft: `${depth * 1.25}rem` }}
          >
            <button
              className="file-table__toggle"
              type="button"
              onClick={() => handleToggleFolder(node.path)}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
            <span className="file-table__name">{node.name}</span>
          </td>
          <td className="file-table__cell file-table__cell--size">
            {formatBytes(node.size)}
          </td>
          <td className="file-table__cell file-table__cell--date">
            {formatDate(node.modified)}
          </td>
          <td className="file-table__cell file-table__cell--relative">
            {formatRelativeDate(node.modified)}
          </td>
        </tr>,
      )
    }

    const renderFileRow = (file: DroppedFile, depth: number) => {
      rendered.push(
        <tr className="file-table__row" key={file.id}>
          <td
            className="file-table__cell file-table__cell--name"
            style={{ paddingLeft: `${depth * 1.25}rem` }}
          >
            <span className="file-table__name">{file.name}</span>
          </td>
          <td className="file-table__cell file-table__cell--size">
            {formatBytes(file.size)}
          </td>
          <td className="file-table__cell file-table__cell--date">
            {formatDate(file.modified)}
          </td>
          <td className="file-table__cell file-table__cell--relative">
            {formatRelativeDate(file.modified)}
          </td>
        </tr>,
      )
    }

    const walk = (node: FolderNode, depth: number) => {
      if (node.path) {
        renderFolderRow(node, depth)
      }

      const nextDepth = node.path ? depth + 1 : depth
      const isExpanded = node.path ? expandedFolders.has(node.path) : true

      if (!isExpanded) return

      const sortedChildren = [...node.children].sort(compareBy)
      const sortedFiles = [...node.files].sort(compareBy)
      sortedChildren.forEach((child) => walk(child, nextDepth))
      sortedFiles.forEach((file) => renderFileRow(file, nextDepth))
    }

    walk(folderTree, 0)
    return rendered
  }, [compareBy, expandedFolders, folderTree, handleToggleFolder])

  const sortLabel = (key: SortKey) => {
    if (sortConfig.key !== key) return ''
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <section className="card">
      <p>{status}</p>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: '2px dashed',
          borderColor: isDragging ? '#646cff' : '#9aa0a6',
          borderRadius: 12,
          padding: '2rem',
          margin: '1.5rem 0',
          backgroundColor: isDragging ? 'rgba(100, 108, 255, 0.08)' : 'inherit',
          textAlign: 'center',
        }}
      >
        <strong>Drop a folder here</strong>
        <p style={{ margin: '0.5rem 0 0' }}>
          We will list file names and sizes.
        </p>
      </div>
      <div>
        {files.length > 0 ? (
          <>
            <p>Total size: {formatBytes(totalSize)}</p>
            <table className="file-table">
              <thead>
                <tr>
                  <th className="file-table__header file-table__header--name">
                    <button
                      type="button"
                      className="file-table__sort"
                      onClick={() => handleSortChange('name')}
                    >
                      Name{sortLabel('name')}
                    </button>
                  </th>
                  <th className="file-table__header file-table__header--size">
                    <button
                      type="button"
                      className="file-table__sort"
                      onClick={() => handleSortChange('size')}
                    >
                      Size{sortLabel('size')}
                    </button>
                  </th>
                  <th className="file-table__header file-table__header--date">
                    <button
                      type="button"
                      className="file-table__sort"
                      onClick={() => handleSortChange('modified')}
                    >
                      Modified Time{sortLabel('modified')}
                    </button>
                  </th>
                  <th className="file-table__header file-table__header--relative">
                    <button
                      type="button"
                      className="file-table__sort"
                      onClick={() => handleSortChange('relative')}
                    >
                      Relative Time{sortLabel('relative')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </>
        ) : (
          <p>No files loaded yet.</p>
        )}
      </div>
    </section>
  )
}

export default Browse
