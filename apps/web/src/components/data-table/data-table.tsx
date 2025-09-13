"use client"

import { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { SearchFilters } from "@/components/search-filters/search-filters"
import { UseSearchFiltersReturn, FilterConfig } from "@/hooks/use-search-filters"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ColumnDef<T> {
  key: string
  header: string | ReactNode
  cell?: (item: T) => ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchFilters: UseSearchFiltersReturn
  filterConfigs?: FilterConfig[]
  sortOptions?: { key: string; label: string }[]
  loading?: boolean
  emptyMessage?: string
  className?: string
  showSearch?: boolean
  showFilters?: boolean
  showPagination?: boolean
  pageSizeOptions?: number[]
  onRowClick?: (item: T) => void
  rowClassName?: (item: T) => string
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchFilters,
  filterConfigs = [],
  sortOptions = [],
  loading = false,
  emptyMessage = "Nenhum resultado encontrado.",
  className,
  showSearch = true,
  showFilters = true,
  showPagination = true,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onRowClick,
  rowClassName
}: DataTableProps<T>) {
  const { state, setSort, setPage, setPageSize, processData } = searchFilters

  // Processar dados com filtros, ordenação e paginação
  const { data: processedData, totalPages, totalItems } = processData(data)

  // Gerar opções de ordenação automaticamente se não fornecidas
  const autoSortOptions = sortOptions.length > 0 ? sortOptions : 
    columns
      .filter(col => col.sortable !== false)
      .map(col => ({ key: col.key, label: typeof col.header === 'string' ? col.header : col.key }))

  // Renderizar cabeçalho da coluna com ordenação
  const renderColumnHeader = (column: ColumnDef<T>) => {
    if (column.sortable === false) {
      return column.header
    }

    const isCurrentSort = state.sort?.key === column.key
    const direction = isCurrentSort ? state.sort?.direction : null

    return (
      <Button
        variant="ghost"
        className="h-auto p-0 font-medium hover:bg-transparent"
        onClick={() => {
          if (isCurrentSort) {
            // Alternar direção ou remover ordenação
            if (direction === 'asc') {
              setSort({ key: column.key, direction: 'desc' })
            } else if (direction === 'desc') {
              setSort(null)
            } else {
              setSort({ key: column.key, direction: 'asc' })
            }
          } else {
            setSort({ key: column.key, direction: 'asc' })
          }
        }}
      >
        <span className="flex items-center gap-2">
          {column.header}
          {isCurrentSort ? (
            direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </span>
      </Button>
    )
  }

  // Renderizar célula
  const renderCell = (item: T, column: ColumnDef<T>) => {
    if (column.cell) {
      return column.cell(item)
    }
    return item[column.key]
  }

  // Gerar números de página para paginação
  const generatePageNumbers = () => {
    const pages = []
    const currentPage = state.page
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filtros e busca */}
      {(showSearch || showFilters) && (
        <SearchFilters
          searchFilters={searchFilters}
          filterConfigs={filterConfigs}
          sortOptions={autoSortOptions}
          showSearch={showSearch}
          showSort={!showFilters} // Mostrar sort no SearchFilters apenas se filtros estiverem desabilitados
        />
        )}

      {/* Informações e controles */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {loading ? (
            "Carregando..."
          ) : (
            `Mostrando ${processedData.length} de ${totalItems} resultado${totalItems !== 1 ? 's' : ''}`
          )}
        </div>
        
        {showPagination && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select
              value={state.pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={cn(column.headerClassName)}
                >
                  {renderColumnHeader(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : processedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((item, index) => (
                <TableRow
                  key={item.id || index}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    rowClassName?.(item)
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.key} 
                      className={cn(column.className)}
                    >
                      {renderCell(item, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => state.page > 1 && setPage(state.page - 1)}
                  className={cn(
                    state.page <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              
              {generatePageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setPage(page as number)}
                      isActive={state.page === page}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => state.page < totalPages && setPage(state.page + 1)}
                  className={cn(
                    state.page >= totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}