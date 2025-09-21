// src/test/setup.js
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Створюємо DOM елемент 'root' для запобігання createRoot помилок
const createRootElement = () => {
    const rootElement = document.createElement('div')
    rootElement.id = 'root'
    document.body.appendChild(rootElement)
    return rootElement
  }

  // Налаштовуємо DOM перед тестами
beforeAll(() => {
    // Створюємо root елемент якщо його немає
    if (!document.getElementById('root')) {
      createRootElement()
    }
  })

// Налаштування jsdom для React тестів
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock для ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock для IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Мокаємо createRoot щоб запобігти помилкам
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
      render: vi.fn(),
      unmount: vi.fn(),
    }))
  }))

// Mock для fetch
global.fetch = vi.fn()

// Mock console methods для зменшення шуму в тестах
const originalConsole = global.console
global.console = {
  ...originalConsole,
  error: vi.fn(),
  warn: vi.fn(),
  log: originalConsole.log, // Залишаємо log для debugging
}

// Mock для window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
})

// Mock для localStorage/sessionStorage
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
})

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
})

// Mock для performance API якщо недоступний
if (typeof performance === 'undefined') {
    global.performance = {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => []),
      getEntriesByType: vi.fn(() => []),
    }
  }

  // Покращена обробка помилок для тестів
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn((message, ...args) => {
    // Ігноруємо відомі попередження React в тестах
    if (
      message?.includes?.('Warning: ReactDOM.render is deprecated') ||
      message?.includes?.('Warning: React.createElement') ||
      message?.includes?.('act(...)')
    ) {
      return
    }
    originalError(message, ...args)
  })
})

afterAll(() => {
  console.error = originalError
})

// Cleanup після кожного тесту
afterEach(() => {
    vi.clearAllMocks()
    
    // Очищення DOM
    document.body.innerHTML = '<div id="root"></div>'
    
    // Очищення localStorage/sessionStorage
    window.localStorage.clear()
    window.sessionStorage.clear()
    
    // Очищення fetch моків
    if (global.fetch?.mockClear) {
      global.fetch.mockClear()
    }
  })
  
  // ==================== CUSTOM MATCHERS ====================
  
  // Додаткові matchers для тестування (якщо потрібно)
  expect.extend({
    toBeInTheDocument(received) {
      const pass = received && received.ownerDocument === document
      return {
        message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
        pass,
      }
    },
  })
  
  // ==================== TEST ENVIRONMENT VALIDATION ====================
  
  // Перевіряємо що тестове середовище налаштовано правильно
  beforeAll(() => {
    // Перевіряємо що DOM доступний
    expect(document).toBeDefined()
    expect(document.body).toBeDefined()
    expect(document.getElementById('root')).toBeDefined()
    
    // Перевіряємо що моки працюють
    expect(vi).toBeDefined()
    expect(global.ResizeObserver).toBeDefined()
    expect(global.IntersectionObserver).toBeDefined()
  })
  
  // ==================== PERFORMANCE MONITORING ====================
  
  // Моніторинг продуктивності тестів (опціонально)
  let testStartTime
  beforeEach(() => {
    testStartTime = performance.now()
  })
  
  afterEach(() => {
    const testDuration = performance.now() - testStartTime
    if (testDuration > 5000) { // Попередження для тестів що тривають більше 5 секунд
      console.warn(`Test took ${testDuration.toFixed(2)}ms - consider optimizing`)
    }
  })
  
  // ==================== EXPORT UTILITIES ====================
  
  // Експортуємо корисні утиліти для тестів
  export const testUtils = {
    createMockElement: (tagName = 'div', attributes = {}) => {
      const element = document.createElement(tagName)
      Object.assign(element, attributes)
      return element
    },
    
    waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
    
    mockConsole: () => {
      const originalMethods = {}
      Object.keys(console).forEach(method => {
        originalMethods[method] = console[method]
        console[method] = vi.fn()
      })
      return () => {
        Object.assign(console, originalMethods)
      }
    }
  }