// src/test/testUtils.js
import { vi } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

/**
 * 🔧 УНІВЕРСАЛЬНІ УТИЛІТИ ДЛЯ ТЕСТУВАННЯ
 * 
 * Цей файл містить універсальні функції та патерни для написання тестів,
 * які запобігають проблемам з hoisting'ом та забезпечують стабільність тестів.
 */

// ==================== UNIVERSAL MOCK CREATORS ====================

/**
 * Створює універсальний mock для React компонента
 * 🟢 БЕЗПЕЧНО - не використовує змінні на top level
 */
export const createComponentMock = (componentName, mockImplementation) => {
  return vi.fn((props) => {
    const testId = componentName.toLowerCase().replace(/([A-Z])/g, '-$1')
    return (
      <div data-testid={testId} {...props}>
        {mockImplementation ? mockImplementation(props) : `Mock ${componentName}`}
      </div>
    )
  })
}

/**
 * Створює mock для хука з дефолтними значеннями
 * 🟢 БЕЗПЕЧНО - функція повертає конфігурацію, а не використовує змінні
 */
export const createHookMock = (defaultReturnValue = {}) => {
  return () => ({
    default: vi.fn(() => defaultReturnValue)
  })
}

/**
 * Створює mock для API модуля
 */
export const createApiMock = (methods = []) => {
  const mockObject = {}
  methods.forEach(method => {
    mockObject[method] = vi.fn()
  })
  return () => mockObject
}

// ==================== MOCK CONFIGURATIONS ====================

/**
 * Конфігурації моків для різних типів компонентів
 */
export const MOCK_CONFIGS = {
  // Конфігурація для Table компонента
  table: {
    mockPath: '../../../components/common/Table/Table',
    implementation: ({ columns, data, loading, onRow }) => (
      <div data-testid="table">
        {loading ? (
          <div data-testid="table-loading">Loading...</div>
        ) : (
          <>
            <div data-testid="table-headers">
              {columns?.map((col, index) => (
                <span 
                  key={index} 
                  data-testid={`column-${col.dataIndex}`}
                  data-title={col.title}
                >
                  {col.title}
                </span>
              ))}
            </div>
            <div data-testid="table-data">
              {data?.map((item, index) => (
                <div 
                  key={index} 
                  data-testid={`row-${item.id}`}
                  onClick={() => onRow?.(item)}
                >
                  {Object.entries(item).map(([key, value]) => (
                    <span key={key} data-testid={`row-${item.id}-${key}`}>
                      {value}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  },

  // Конфігурація для Pagination компонента
  pagination: {
    mockPath: '../../../components/common/Pagination/Pagination',
    implementation: ({ current, total, pageSize, onChange }) => (
      <div data-testid="pagination">
        <button 
          data-testid="prev-page" 
          onClick={() => onChange(Math.max(1, current - 1))}
          disabled={current <= 1}
        >
          Prev
        </button>
        <span data-testid="page-info">
          {current} of {Math.ceil(total / pageSize)}
        </span>
        <button 
          data-testid="next-page" 
          onClick={() => onChange(Math.min(Math.ceil(total / pageSize), current + 1))}
          disabled={current >= Math.ceil(total / pageSize)}
        >
          Next
        </button>
        <span data-testid="total-items">Total: {total}</span>
      </div>
    )
  },

  // Конфігурація для Button компонента
  button: {
    mockPath: '../../../components/common/Button/Button',
    implementation: ({ onClick, children, title, icon, disabled, ...props }) => (
      <button 
        onClick={onClick} 
        title={title}
        disabled={disabled}
        data-testid={`button-${title?.toLowerCase().replace(/\s+/g, '-') || 'button'}`}
        {...props}
      >
        {icon && <span data-testid="button-icon">{icon}</span>}
        {children}
      </button>
    )
  },

  // Конфігурація для Modal компонента
  modal: {
    mockPath: '../../../components/common/Modal/Modal',
    implementation: ({ children, isOpen, onClose, title }) => 
      isOpen ? (
        <div data-testid="modal">
          <div data-testid="modal-title">{title}</div>
          <div data-testid="modal-content">{children}</div>
          <button data-testid="modal-close" onClick={onClose}>Close</button>
        </div>
      ) : null
  },

  // Конфігурація для Dropdown компонента
  dropdown: {
    mockPath: '../../../components/common/Dropdown/Dropdown',
    implementation: ({ children, trigger, onChange, value, ...props }) => (
      <div data-testid="dropdown" {...props}>
        <div data-testid="dropdown-trigger" onClick={() => onChange?.(value)}>
          {trigger}
        </div>
        <div data-testid="dropdown-content">{children}</div>
      </div>
    )
  },

  // Конфігурація для FilterDropdown компонента
  filterDropdown: {
    mockPath: '../../../components/common/Dropdown/FilterDropdown',
    implementation: ({ children, onFilter, selectedValue, options = [], ...props }) => (
      <div data-testid="filter-dropdown" {...props}>
        <select 
          data-testid="filter-select"
          value={selectedValue || ''}
          onChange={(e) => onFilter?.(e.target.value)}
        >
          <option value="">Всі варіанти</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {children}
      </div>
    )
  }
}

// ==================== MOCK SETUP UTILITIES ====================

/**
 * Автоматично створює моки на основі конфігурації
 * 🟢 БЕЗПЕЧНО - не використовує змінні на top level
 */
export const setupComponentMocks = (configs) => {
  const mockMap = new Map()
  
  configs.forEach((configKey) => {
    const config = MOCK_CONFIGS[configKey]
    if (config) {
      vi.mock(config.mockPath, () => ({
        default: vi.fn(config.implementation)
      }))
      mockMap.set(configKey, config)
    }
  })
  
  return mockMap
}

/**
 * Налаштовує моки для хуків
 */
export const setupHookMocks = (hookConfigs) => {
  hookConfigs.forEach(({ path, defaultValue }) => {
    vi.mock(path, createHookMock(defaultValue))
  })
}

/**
 * Налаштовує моки для React Router
 */
export const setupRouterMocks = () => {
  const mockNavigate = vi.fn()
  const mockLocation = { pathname: '/', search: '', hash: '', state: null }
  const mockParams = {}

  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useNavigate: vi.fn(() => mockNavigate),
      useLocation: vi.fn(() => mockLocation),
      useParams: vi.fn(() => mockParams),
    }
  })

  // Повертаємо функцію для налаштування моків після імпорту
  return {
    configureRouterMocks: (reactRouterModule) => {
      if (reactRouterModule) {
        const mocked = vi.mocked(reactRouterModule)
        mocked.useNavigate.mockReturnValue(mockNavigate)
        mocked.useLocation.mockReturnValue(mockLocation)
        mocked.useParams.mockReturnValue(mockParams)
      }
      return { mockNavigate, mockLocation, mockParams }
    }
  }
}

// ==================== RENDER UTILITIES ====================

/**
 * Універсальна функція для рендерингу з провайдерами
 */
export const renderWithProviders = (
  component, 
  {
    contextValue = null,
    routerProps = {},
    wrappers = [],
    ...renderOptions
  } = {}
) => {
  // Створюємо масив wrapper'ів
  const allWrappers = [BrowserRouter, ...wrappers]
  
  // Додаємо Context Provider якщо передано
  if (contextValue && contextValue.Provider) {
    allWrappers.push(({ children }) => (
      <contextValue.Provider value={contextValue.value}>
        {children}
      </contextValue.Provider>
    ))
  }

  // Створюємо комбінований wrapper
  const CombinedWrapper = ({ children }) => {
    return allWrappers.reduceRight(
      (acc, Wrapper) => <Wrapper {...routerProps}>{acc}</Wrapper>,
      children
    )
  }

  return render(component, {
    wrapper: CombinedWrapper,
    ...renderOptions
  })
}

// ==================== DATA GENERATORS ====================

/**
 * Генератори тестових даних
 */
export const createTestData = {
  /**
   * Створює дані для боржника
   */
  debtor: (overrides = {}) => ({
    id: 1,
    name: 'Test User',
    date: '2024-01-15',
    identification: '1234567890',
    non_residential_debt: 1000,
    residential_debt: 2000,
    land_debt: 500,
    orenda_debt: 1000,
    mpz: 300,
    total_debt: 4800,
    ...overrides
  }),

  /**
   * Створює список боржників
   */
  debtorList: (count = 3, customItems = null) => ({
    items: customItems || Array.from({ length: count }, (_, index) => 
      createTestData.debtor({
        id: index + 1,
        name: `Test User ${index + 1}`,
        identification: `123456789${index}`,
        total_debt: (index + 1) * 1000
      })
    ),
    totalItems: customItems?.length || count,
    currentPage: 1,
    totalPages: Math.ceil((customItems?.length || count) / 16)
  }),

  /**
   * Створює дані користувача
   */
  user: (overrides = {}) => ({
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    ...overrides
  }),

  /**
   * Створює context value
   */
  contextValue: (overrides = {}) => ({
    store: {
      user: createTestData.user(),
      isAuth: true,
      ...overrides.store
    },
    ...overrides
  })
}

// ==================== ASSERTION HELPERS ====================

/**
 * Допоміжні функції для assertions
 */
export const testHelpers = {
  /**
   * Перевіряє чи компонент має правильні test-id
   */
  expectTestIds: (container, testIds) => {
    testIds.forEach(testId => {
      expect(container.getByTestId(testId)).toBeInTheDocument()
    })
  },

  /**
   * Перевіряє чи таблиця містить правильні дані
   */
  expectTableData: (container, expectedData) => {
    expectedData.forEach((item, index) => {
      Object.entries(item).forEach(([key, value]) => {
        const element = container.getByTestId(`row-${item.id}-${key}`)
        expect(element).toHaveTextContent(String(value))
      })
    })
  },

  /**
   * Перевіряє чи API було викликано з правильними параметрами
   */
  expectApiCall: (mockFn, expectedCall) => {
    expect(mockFn).toHaveBeenCalledWith(
      expectedCall.url,
      expect.objectContaining(expectedCall.options || {})
    )
  },

  /**
   * Перевіряє кнопки пагінації
   */
  expectPaginationState: (container, { current, total, pageSize, hasNext, hasPrev }) => {
    expect(container.getByTestId('page-info'))
      .toHaveTextContent(`${current} of ${Math.ceil(total / pageSize)}`)
    
    if (hasPrev) {
      expect(container.getByTestId('prev-page')).not.toBeDisabled()
    } else {
      expect(container.getByTestId('prev-page')).toBeDisabled()
    }

    if (hasNext) {
      expect(container.getByTestId('next-page')).not.toBeDisabled()
    } else {
      expect(container.getByTestId('next-page')).toBeDisabled()
    }
  }
}

// ==================== MOCK RESET UTILITIES ====================

/**
 * Утиліти для очищення моків
 */
export const mockUtils = {
  /**
   * Очищає всі моки та встановлює дефолтні значення
   */
  resetAllMocks: () => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  },

  /**
   * Встановлює дефолтні значення для конкретного mock'а
   */
  setupMockDefaults: (mockFn, defaultReturnValue) => {
    mockFn.mockReturnValue(defaultReturnValue)
    return mockFn
  },

  /**
   * Створює mock function з историею викликів
   */
  createTrackedMock: (implementation) => {
    const calls = []
    const mockFn = vi.fn((...args) => {
      calls.push(args)
      return implementation ? implementation(...args) : undefined
    })
    
    mockFn.getCalls = () => calls
    mockFn.getLastCall = () => calls[calls.length - 1]
    mockFn.getCallCount = () => calls.length
    
    return mockFn
  }
}

// ==================== WAIT UTILITIES ====================

/**
 * Утиліти для асинхронних тестів
 */
export const waitUtils = {
  /**
   * Чекає поки елемент з'явиться
   */
  waitForElement: async (getByTestId, testId, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Element with testId "${testId}" not found within ${timeout}ms`))
      }, timeout)

      const checkElement = () => {
        try {
          const element = getByTestId(testId)
          clearTimeout(timer)
          resolve(element)
        } catch {
          setTimeout(checkElement, 100)
        }
      }

      checkElement()
    })
  },

  /**
   * Чекає поки API виклик завершиться
   */
  waitForApiCall: async (mockFn, expectedCallCount = 1) => {
    return new Promise((resolve) => {
      const checkCalls = () => {
        if (mockFn.mock.calls.length >= expectedCallCount) {
          resolve(mockFn.mock.calls)
        } else {
          setTimeout(checkCalls, 50)
        }
      }
      checkCalls()
    })
  }
}

// ==================== EXAMPLE USAGE ====================

/**
 * Приклад використання:
 * 
 * // В тесті:
 * import { setupComponentMocks, renderWithProviders, createTestData } from './testUtils'
 * 
 * // Налаштування моків
 * setupComponentMocks(['table', 'pagination', 'button'])
 * 
 * // Динамічні імпорти в beforeAll
 * let Component, reactRouterDom
 * beforeAll(async () => {
 *   Component = (await import('../Component')).default
 *   reactRouterDom = await import('react-router-dom')
 * })
 * 
 * // В beforeEach або тесті:
 * const testData = createTestData.debtorList(5)
 * const { configureRouterMocks } = setupRouterMocks()
 * const { mockNavigate } = configureRouterMocks(reactRouterDom)
 * 
 * // Рендеринг з провайдерами
 * const { getByTestId } = renderWithProviders(
 *   <Component />,
 *   { contextValue: { Provider: Context, value: createTestData.contextValue() } }
 * )
 */

export default {
  createComponentMock,
  createHookMock,
  createApiMock,
  MOCK_CONFIGS,
  setupComponentMocks,
  setupHookMocks,
  setupRouterMocks,
  renderWithProviders,
  createTestData,
  testHelpers,
  mockUtils,
  waitUtils
}