// src/pages/DebtorList/__tests__/DebtorList.helpers.test.js
import { describe, it, expect } from 'vitest'

// ==================== HELPER FUNCTIONS FOR TESTING ====================

// Функція для обчислення загального боргу (виділена з компонента)
const calculateTotalDebt = (record) => {
  return (Number(record.non_residential_debt) || 0) + 
         (Number(record.residential_debt) || 0) + 
         (Number(record.land_debt) || 0) + 
         (Number(record.orenda_debt) || 0) + 
         (Number(record.mpz) || 0)
}

// Функція для перевірки наявності боргу
const hasDebt = (record) => {
  return ['mpz', 'orenda_debt', 'land_debt', 'residential_debt', 'non_residential_debt']
    .some(field => Number(record[field]) > 0)
}

// Функція для маппінгу типів податків
const getTaxTypeMapping = () => ({
  'non_residential_debt': { title: 'Нежитлова', width: '100px' },
  'residential_debt': { title: 'Житлова', width: '100px' },
  'land_debt': { title: 'Земельна', width: '100px' },
  'orenda_debt': { title: 'Орендна', width: '100px' },
  'mpz': { title: 'МПЗ', width: '100px' }
})

// Функція для створення колонок таблиці
const createColumns = (selectedTaxType = null) => {
  const baseColumns = [
    { title: 'ІПН', dataIndex: 'identification', width: '65px' },
    { title: 'П.І.Б', dataIndex: 'name', width: '130px' },
    { title: 'Дата', dataIndex: 'date', width: '80px' }
  ]

  let taxColumns = []
  
  if (!selectedTaxType || selectedTaxType === '') {
    // Всі колонки податків
    taxColumns = [
      { title: 'Нежитл', dataIndex: 'non_residential_debt', width: '70px' },
      { title: 'Житл', dataIndex: 'residential_debt', width: '65px' },
      { title: 'Земля', dataIndex: 'land_debt', width: '65px' },
      { title: 'Оренда', dataIndex: 'orenda_debt', width: '70px' },
      { title: 'МПЗ', dataIndex: 'mpz', width: '60px' }
    ]
  } else {
    const taxTypeMapping = getTaxTypeMapping()
    if (taxTypeMapping[selectedTaxType]) {
      taxColumns = [{
        title: taxTypeMapping[selectedTaxType].title,
        dataIndex: selectedTaxType,
        width: taxTypeMapping[selectedTaxType].width
      }]
    }
  }

  const totalColumn = { title: 'Всього', dataIndex: 'total_debt', width: '80px' }
  const actionColumn = { title: 'Дія', dataIndex: 'action', width: '95px' }

  return [...baseColumns, ...taxColumns, totalColumn, actionColumn]
}

// ==================== TESTS ====================

describe('DebtorList Helper Functions', () => {
  
  describe('calculateTotalDebt', () => {
    it('правильно обчислює загальний борг з валідними числами', () => {
      const record = {
        non_residential_debt: 1000.50,
        residential_debt: 2000.25,
        land_debt: 500.75,
        orenda_debt: 1500.00,
        mpz: 300.50
      }
      
      // ВИПРАВЛЕНА МАТЕМАТИКА: 1000.50 + 2000.25 + 500.75 + 1500.00 + 300.50 = 5302.00
      expect(calculateTotalDebt(record)).toBe(5302.00)
    })

    it('обробляє нульові та undefined значення', () => {
      const record = {
        non_residential_debt: null,
        residential_debt: undefined,
        land_debt: 0,
        orenda_debt: 1000,
        mpz: '500'
      }
      
      expect(calculateTotalDebt(record)).toBe(1500)
    })

    it('обробляє строкові значення', () => {
      const record = {
        non_residential_debt: '1000.50',
        residential_debt: '2000.25',
        land_debt: '500.75',
        orenda_debt: '1500.00',
        mpz: '300.50'
      }
      
      // ВИПРАВЛЕНА МАТЕМАТИКА: 1000.50 + 2000.25 + 500.75 + 1500.00 + 300.50 = 5302.00
      expect(calculateTotalDebt(record)).toBe(5302.00)
    })

    it('обробляє некоректні значення', () => {
      const record = {
        non_residential_debt: 'abc',
        residential_debt: NaN,
        land_debt: '',
        orenda_debt: 1000,
        mpz: 500
      }
      
      expect(calculateTotalDebt(record)).toBe(1500)
    })

    it('обробляє порожній об\'єкт', () => {
      const record = {}
      
      expect(calculateTotalDebt(record)).toBe(0)
    })
  })

  describe('hasDebt', () => {
    it('повертає true якщо є борг', () => {
      const recordWithDebt = {
        non_residential_debt: 1000,
        residential_debt: 0,
        land_debt: 0,
        orenda_debt: 0,
        mpz: 0
      }
      
      expect(hasDebt(recordWithDebt)).toBe(true)
    })

    it('повертає false якщо немає боргу', () => {
      const recordWithoutDebt = {
        non_residential_debt: 0,
        residential_debt: 0,
        land_debt: 0,
        orenda_debt: 0,
        mpz: 0
      }
      
      expect(hasDebt(recordWithoutDebt)).toBe(false)
    })

    it('правильно обробляє строкові нулі', () => {
      const record = {
        non_residential_debt: '0',
        residential_debt: '0.00',
        land_debt: 0,
        orenda_debt: null,
        mpz: undefined
      }
      
      expect(hasDebt(record)).toBe(false)
    })

    it('правильно визначає наявність боргу з різними типами даних', () => {
      const record = {
        non_residential_debt: '0',
        residential_debt: null,
        land_debt: undefined,
        orenda_debt: '',
        mpz: '100.50'
      }
      
      expect(hasDebt(record)).toBe(true)
    })
  })

  describe('getTaxTypeMapping', () => {
    it('повертає правильний маппінг типів податків', () => {
      const mapping = getTaxTypeMapping()
      
      expect(mapping).toEqual({
        'non_residential_debt': { title: 'Нежитлова', width: '100px' },
        'residential_debt': { title: 'Житлова', width: '100px' },
        'land_debt': { title: 'Земельна', width: '100px' },
        'orenda_debt': { title: 'Орендна', width: '100px' },
        'mpz': { title: 'МПЗ', width: '100px' }
      })
    })

    it('містить всі необхідні типи податків', () => {
      const mapping = getTaxTypeMapping()
      const requiredTypes = ['non_residential_debt', 'residential_debt', 'land_debt', 'orenda_debt', 'mpz']
      
      requiredTypes.forEach(type => {
        expect(mapping).toHaveProperty(type)
        expect(mapping[type]).toHaveProperty('title')
        expect(mapping[type]).toHaveProperty('width')
      })
    })
  })

  describe('createColumns', () => {
    it('створює всі колонки коли тип податку не вибраний', () => {
      const columns = createColumns()
      
      // ВИПРАВЛЕНА КІЛЬКІСТЬ: 3 базові + 5 податкових + 1 всього + 1 дія = 10
      expect(columns).toHaveLength(10)
      
      // Перевіряємо базові колонки
      expect(columns[0]).toMatchObject({ title: 'ІПН', dataIndex: 'identification' })
      expect(columns[1]).toMatchObject({ title: 'П.І.Б', dataIndex: 'name' })
      expect(columns[2]).toMatchObject({ title: 'Дата', dataIndex: 'date' })
      
      // Перевіряємо податкові колонки
      expect(columns[3]).toMatchObject({ title: 'Нежитл', dataIndex: 'non_residential_debt' })
      expect(columns[4]).toMatchObject({ title: 'Житл', dataIndex: 'residential_debt' })
      expect(columns[5]).toMatchObject({ title: 'Земля', dataIndex: 'land_debt' })
      expect(columns[6]).toMatchObject({ title: 'Оренда', dataIndex: 'orenda_debt' })
      expect(columns[7]).toMatchObject({ title: 'МПЗ', dataIndex: 'mpz' })
      
      // Перевіряємо колонку всього та дій
      expect(columns[8]).toMatchObject({ title: 'Всього', dataIndex: 'total_debt' })
      expect(columns[9]).toMatchObject({ title: 'Дія', dataIndex: 'action' })
    })

    it('створює колонки для конкретного типу податку', () => {
      const columns = createColumns('residential_debt')
      
      expect(columns).toHaveLength(6) // 3 базові + 1 вибраний податок + 1 всього + 1 дія
      
      // Перевіряємо базові колонки
      expect(columns[0]).toMatchObject({ title: 'ІПН', dataIndex: 'identification' })
      expect(columns[1]).toMatchObject({ title: 'П.І.Б', dataIndex: 'name' })
      expect(columns[2]).toMatchObject({ title: 'Дата', dataIndex: 'date' })
      
      // Перевіряємо вибрану податкову колонку
      expect(columns[3]).toMatchObject({ 
        title: 'Житлова', 
        dataIndex: 'residential_debt',
        width: '100px'
      })
      
      // Перевіряємо колонку всього та дій
      expect(columns[4]).toMatchObject({ title: 'Всього', dataIndex: 'total_debt' })
      expect(columns[5]).toMatchObject({ title: 'Дія', dataIndex: 'action' })
    })

    it('обробляє некоректний тип податку', () => {
      const columns = createColumns('invalid_tax_type')
      
      expect(columns).toHaveLength(5) // 3 базові + 0 податкових + 1 всього + 1 дія
      
      // Повинні бути тільки базові колонки, всього та дії
      expect(columns[0]).toMatchObject({ title: 'ІПН', dataIndex: 'identification' })
      expect(columns[1]).toMatchObject({ title: 'П.І.Б', dataIndex: 'name' })
      expect(columns[2]).toMatchObject({ title: 'Дата', dataIndex: 'date' })
      expect(columns[3]).toMatchObject({ title: 'Всього', dataIndex: 'total_debt' })
      expect(columns[4]).toMatchObject({ title: 'Дія', dataIndex: 'action' })
    })

    it('обробляє порожній рядок як тип податку', () => {
      const columns = createColumns('')
      
      // ВИПРАВЛЕНА КІЛЬКІСТЬ: Повинно працювати як відсутність типу - показувати всі колонки
      expect(columns).toHaveLength(10)
    })
  })
})

// ==================== PERFORMANCE TESTS ====================

describe('DebtorList Performance Tests', () => {
  
  describe('calculateTotalDebt performance', () => {
    it('швидко обробляє великі набори даних', () => {
      const start = performance.now()
      
      // Симулюємо 1000 записів
      for (let i = 0; i < 1000; i++) {
        calculateTotalDebt({
          non_residential_debt: Math.random() * 1000,
          residential_debt: Math.random() * 1000,
          land_debt: Math.random() * 1000,
          orenda_debt: Math.random() * 1000,
          mpz: Math.random() * 1000
        })
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Функція повинна обробити 1000 записів менш ніж за 100мс
      expect(duration).toBeLessThan(100)
    })
  })

  describe('hasDebt performance', () => {
    it('швидко перевіряє наявність боргу для великої кількості записів', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        hasDebt({
          non_residential_debt: i % 2 === 0 ? 0 : 100,
          residential_debt: 0,
          land_debt: 0,
          orenda_debt: 0,
          mpz: 0
        })
      }
      
      const end = performance.now()
      const duration = end - start
      
      expect(duration).toBeLessThan(50)
    })
  })
})

// ==================== EDGE CASES ====================

describe('DebtorList Edge Cases', () => {
  
  it('обробляє дуже великі числа', () => {
    const record = {
      non_residential_debt: Number.MAX_SAFE_INTEGER,
      residential_debt: 0,
      land_debt: 0,
      orenda_debt: 0,
      mpz: 0
    }
    
    expect(calculateTotalDebt(record)).toBe(Number.MAX_SAFE_INTEGER)
    expect(hasDebt(record)).toBe(true)
  })

  it('обробляє негативні числа', () => {
    const record = {
      non_residential_debt: -1000,
      residential_debt: 2000,
      land_debt: 0,
      orenda_debt: 0,
      mpz: 0
    }
    
    expect(calculateTotalDebt(record)).toBe(1000)
    expect(hasDebt(record)).toBe(true) // -1000 > 0 is false, but 2000 > 0 is true
  })

  it('обробляє десяткові числа з високою точністю', () => {
    const record = {
      non_residential_debt: 1000.123456789,
      residential_debt: 2000.987654321,
      land_debt: 0,
      orenda_debt: 0,
      mpz: 0
    }
    
    const total = calculateTotalDebt(record)
    expect(total).toBeCloseTo(3001.11111111, 8)
  })
})