// src/test/__mocks__/index.js

import { vi } from 'vitest'

// ==================== HOOKS MOCKS ====================

export const createMockUseFetch = (overrides = {}) => {
  const defaultValues = {
    data: null,
    status: 'Idle',
    error: null,
    retryFetch: vi.fn()
  }
  
  return vi.fn().mockReturnValue({
    ...defaultValues,
    ...overrides
  })
}

export const createMockUseNotification = () => {
  return vi.fn().mockReturnValue(vi.fn())
}

export const createMockUseNavigate = () => {
  return vi.fn()
}

// ==================== COMPONENT MOCKS ====================

export const mockTable = vi.fn(({ columns, data, loading, onRow }) => (
  <div data-testid="table">
    {loading ? (
      <div data-testid="table-loading">Loading...</div>
    ) : (
      <div data-testid="table-content">
        <div data-testid="table-columns">
          {columns.map((col, index) => (
            <span key={index} data-testid={`column-${col.dataIndex}`}>
              {col.title}
            </span>
          ))}
        </div>
        <div data-testid="table-data">
          {data?.map((item, index) => (
            <div key={index} data-testid={`row-${item.id}`}>
              {item.name} - {item.total_debt}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
))

export const mockPagination = vi.fn(({ current, total, pageSize, onChange }) => (
  <div data-testid="pagination">
    <button 
      data-testid="prev-page" 
      onClick={() => onChange(Math.max(1, current - 1))}
    >
      Prev
    </button>
    <span data-testid="page-info">{current} of {Math.ceil(total / pageSize)}</span>
    <button 
      data-testid="next-page" 
      onClick={() => onChange(current + 1)}
    >
      Next
    </button>
  </div>
))

export const mockButton = vi.fn(({ onClick, children, title, icon, size, ...props }) => (
  <button 
    onClick={onClick} 
    title={title}
    data-testid={`button-${title?.toLowerCase().replace(/\s+/g, '-') || 'button'}`}
    {...props}
  >
    {icon && <span data-testid="button-icon">{icon}</span>}
    {children}
  </button>
))

export const mockDropdown = vi.fn(({ children, trigger, ...props }) => (
  <div data-testid="dropdown" {...props}>
    <div data-testid="dropdown-trigger">{trigger}</div>
    <div data-testid="dropdown-content">{children}</div>
  </div>
))

export const mockModal = vi.fn(({ children, isOpen, onClose, title }) => 
  isOpen ? (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-content">{children}</div>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
    </div>
  ) : null
)

export const mockFilterDropdown = vi.fn(({ children, ...props }) => (
  <div data-testid="filter-dropdown" {...props}>
    {children}
  </div>
))

// ==================== TEST DATA GENERATORS ====================

export const createMockDebtorRecord = (overrides = {}) => ({
  id: 1,
  name: 'Тест Тестович Тестовський',
  date: '2024-01-15',
  identification: '1234567890',
  non_residential_debt: 0,
  residential_debt: 0,
  land_debt: 0,
  orenda_debt: 0,
  mpz: 0,
  ...overrides
})

export const createMockDebtorData = (itemsOverrides = [], dataOverrides = {}) => ({
  items: itemsOverrides.length > 0 ? itemsOverrides : [
    createMockDebtorRecord({
      id: 1,
      name: 'Іванов Іван Іванович',
      non_residential_debt: 1500.50,
      residential_debt: 2000.00,
      land_debt: 500.25,
      orenda_debt: 1000.75,
      mpz: 300.00
    }),
    createMockDebtorRecord({
      id: 2,
      name: 'Петров Петро Петрович',
      residential_debt: 1500.00
    }),
    createMockDebtorRecord({
      id: 3,
      name: 'Сидоров Сидір Сидорович'
    })
  ],
  totalItems: 3,
  currentPage: 1,
  totalPages: 1,
  ...dataOverrides
})

export const createMockContextValue = (overrides = {}) => ({
  store: {
    user: { id: 1, name: 'Test User' },
    isAuth: true,
    ...overrides.store
  },
  ...overrides
})

// ==================== TEST SCENARIOS ====================

export const testScenarios = {
  // Сценарій з успішним завантаженням
  successfulLoad: {
    useFetch: {
      data: createMockDebtorData(),
      status: 'Success',
      error: null,
      retryFetch: vi.fn()
    }
  },

  // Сценарій завантаження
  loading: {
    useFetch: {
      data: null,
      status: 'Pending',
      error: null,
      retryFetch: vi.fn()
    }
  },

  // Сценарій помилки
  error: {
    useFetch: {
      data: null,
      status: 'Error',
      error: 'Помилка завантаження даних',
      retryFetch: vi.fn()
    }
  },

  // Сценарій з порожніми даними
  emptyData: {
    useFetch: {
      data: { items: [], totalItems: 0, currentPage: 1, totalPages: 0 },
      status: 'Success',
      error: null,
      retryFetch: vi.fn()
    }
  },

  // Сценарій з великою кількістю даних
  largeDataset: {
    useFetch: {
      data: createMockDebtorData(
        Array.from({ length: 100 }, (_, index) => 
          createMockDebtorRecord({
            id: index + 1,
            name: `Користувач ${index + 1}`,
            identification: String(1000000000 + index),
            residential_debt: Math.random() * 5000
          })
        ),
        { totalItems: 100, totalPages: 7 }
      ),
      status: 'Success',
      error: null,
      retryFetch: vi.fn()
    }
  }
}

// ==================== UTILITY FUNCTIONS ====================

export const waitForLoadingToFinish = async () => {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => {
    expect(screen.queryByTestId('table-loading')).not.toBeInTheDocument()
  })
}

export const expectTableToHaveData = (data) => {
  const { screen } = require('@testing-library/react')
  data.items.forEach(item => {
    expect(screen.getByTestId(`row-${item.id}`)).toBeInTheDocument()
  })
}

export const expectColumnsToBeVisible = (columnDataIndexes) => {
  const { screen } = require('@testing-library/react')
  columnDataIndexes.forEach(dataIndex => {
    expect(screen.getByTestId(`column-${dataIndex}`)).toBeInTheDocument()
  })
}

// ==================== SETUP HELPERS ====================

export const setupMocks = () => {
  // Очищення всіх моків
  vi.clearAllMocks()
  
  // Встановлення дефолтних моків
  vi.doMock('../../../hooks/useFetch', () => ({
    default: createMockUseFetch(testScenarios.successfulLoad.useFetch)
  }))
  
  vi.doMock('../../../hooks/useNotification', () => ({
    useNotification: createMockUseNotification()
  }))
  
  vi.doMock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useNavigate: createMockUseNavigate()
    }
  })
  
  // Мокання компонентів
  vi.doMock('../../../components/common/Table/Table', () => ({
    default: mockTable
  }))
  
  vi.doMock('../../../components/common/Pagination/Pagination', () => ({
    default: mockPagination
  }))
  
  vi.doMock('../../../components/common/Button/Button', () => ({
    default: mockButton
  }))
  
  vi.doMock('../../../components/common/Dropdown/Dropdown', () => ({
    default: mockDropdown
  }))
  
  vi.doMock('../../../components/common/Modal/Modal', () => ({
    default: mockModal
  }))
  
  vi.doMock('../../../components/common/Dropdown/FilterDropdown', () => ({
    default: mockFilterDropdown
  }))
}

export const teardownMocks = () => {
  vi.restoreAllMocks()
}

// ==================== CUSTOM MATCHERS ====================

export const customMatchers = {
  toHaveCorrectColumns: (received, expectedColumns) => {
    const pass = expectedColumns.every(col => 
      received.find(c => c.dataIndex === col.dataIndex && c.title === col.title)
    )
    
    return {
      pass,
      message: () => pass 
        ? `Expected columns not to match ${expectedColumns.map(c => c.title).join(', ')}`
        : `Expected columns to include ${expectedColumns.map(c => c.title).join(', ')}`
    }
  },

  toHaveCorrectTotalDebt: (received, expectedTotal) => {
    const calculatedTotal = (Number(received.non_residential_debt) || 0) + 
                           (Number(received.residential_debt) || 0) + 
                           (Number(received.land_debt) || 0) + 
                           (Number(received.orenda_debt) || 0) + 
                           (Number(received.mpz) || 0)
    
    const pass = Math.abs(calculatedTotal - expectedTotal) < 0.01
    
    return {
      pass,
      message: () => pass
        ? `Expected total debt not to be ${expectedTotal}`
        : `Expected total debt ${calculatedTotal} to equal ${expectedTotal}`
    }
  }
}

// ==================== ACCESSIBILITY HELPERS ====================

export const checkAccessibility = async (container) => {
  // Перевірка основних accessibility вимог
  const buttons = container.querySelectorAll('button')
  buttons.forEach(button => {
    expect(button).toHaveAttribute('title')
  })
  
  const tables = container.querySelectorAll('[data-testid="table"]')
  tables.forEach(table => {
    expect(table).toBeInTheDocument()
  })
}

// ==================== EXPORT ====================

export default {
  createMockUseFetch,
  createMockUseNotification,
  createMockUseNavigate,
  createMockDebtorRecord,
  createMockDebtorData,
  createMockContextValue,
  testScenarios,
  setupMocks,
  teardownMocks,
  customMatchers,
  checkAccessibility
}