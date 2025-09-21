import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Отримуємо поточну директорію для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Кольори для консолі
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m'
};

// Функції для кольорового виводу
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.blue}${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.purple}${msg}${colors.reset}`)
};

// Функція для виконання команд з обробкою помилок
function runCommand(command, description, options = {}) {
  log.info(`Виконуємо: ${command}`);
  
  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      cwd: process.cwd(),
      ...options
    });
    
    if (!options.silent) {
      log.success(`${description} - завершено`);
    }
    
    return { success: true, output: result };
  } catch (error) {
    log.error(`${description} - провалилось!`);
    
    if (error.stdout) {
      console.log('📄 Вивід команди:');
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log('📄 Помилки:');
      console.log(error.stderr);
    }
    
    return { success: false, error: error.message, code: error.status };
  }
}

// Функція для перевірки існування файлу
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Функція для отримання розміру директорії
function getDirectorySize(dirPath) {
  try {
    if (os.platform() === 'win32') {
      // Windows: використовуємо PowerShell
      const result = execSync(`powershell "(Get-ChildItem '${dirPath}' -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB"`, { encoding: 'utf8' });
      const sizeMB = parseFloat(result.trim());
      return sizeMB > 1 ? `${sizeMB.toFixed(1)}MB` : `${(sizeMB * 1024).toFixed(0)}KB`;
    } else {
      // Linux/Mac
      const result = execSync(`du -sh "${dirPath}" 2>/dev/null || echo "невідомо"`, { encoding: 'utf8' });
      return result.trim().split('\t')[0];
    }
  } catch {
    return 'невідомо';
  }
}

// Функція для підрахунку файлів
function countFiles(dirPath, extension) {
  try {
    const files = fs.readdirSync(dirPath, { recursive: true });
    return files.filter(file => file.endsWith(extension)).length;
  } catch {
    return 0;
  }
}

// Функція для відкриття директорії
function openDirectory(dirPath) {
  const platform = os.platform();
  let command;
  
  switch (platform) {
    case 'win32':
      command = `explorer "${dirPath}"`;
      break;
    case 'darwin':
      command = `open "${dirPath}"`;
      break;
    case 'linux':
      command = `xdg-open "${dirPath}"`;
      break;
    default:
      log.warning('Не вдалося визначити команду для відкриття директорії');
      return;
  }
  
  try {
    execSync(command);
    log.info('Директорія dist/ відкрита');
  } catch {
    log.warning('Не вдалося відкрити директорію автоматично');
  }
}

// Функція для очікування введення користувача
function askUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Головна функція
async function smartBuild() {
  const startTime = Date.now();
  
  console.clear();
  log.title('🚀 Smart Build - ES Modules версія');
  log.title('=====================================');
  console.log(`📍 Платформа: ${os.platform()}`);
  console.log(`📍 Node.js: ${process.version}`);
  console.log(`📍 Директорія: ${process.cwd()}`);
  
  // Крок 1: Перевірка середовища
  log.step('1️⃣ Перевірка середовища...');
  
  if (!fileExists('package.json')) {
    log.error('package.json не знайдено!');
    log.warning('Переконайтесь що ви в директорії front/');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  log.success('package.json знайдено');
  
  // Перевірка типу модулів
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.type === 'module') {
      log.success('ES Modules підтримка активна');
    } else {
      log.info('CommonJS модулі (це теж нормально)');
    }
  } catch {
    log.warning('Не вдалося прочитати package.json');
  }
  
  // Перевірка Node.js та npm
  const nodeCheck = runCommand('node --version', 'Перевірка Node.js', { silent: true });
  const npmCheck = runCommand('npm --version', 'Перевірка npm', { silent: true });
  
  if (!nodeCheck.success || !npmCheck.success) {
    log.error('Node.js або npm не встановлені!');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  
  log.success(`Node.js: ${nodeCheck.output.trim()}`);
  log.success(`npm: ${npmCheck.output.trim()}`);
  
  // Крок 2: Перевірка залежностей
  log.step('2️⃣ Перевірка залежностей...');
  
  if (!fileExists('node_modules')) {
    log.warning('node_modules не знайдено, встановлюємо...');
    const installResult = runCommand('npm install', 'Встановлення залежностей');
    if (!installResult.success) {
      log.error('Не вдалося встановити залежності');
      await askUser('Натисніть Enter щоб закрити...');
      process.exit(1);
    }
  } else {
    log.success('node_modules знайдено');
  }
  
  // Крок 3: Перевірка структури тестів
  log.step('3️⃣ Перевірка тестів...');
  
  const testFiles = [
    'src/test/setup.js',
    'src/test/__mocks__/index.js'
  ];
  
  let testsFound = false;
  testFiles.forEach(file => {
    if (fileExists(file)) {
      log.success(`Знайдено: ${file}`);
      testsFound = true;
    } else {
      log.warning(`Не знайдено: ${file}`);
    }
  });
  
  // Підрахунок тестових файлів (Windows сумісна версія)
  try {
    let testCount = 0;
    
    // Рекурсивний пошук тестових файлів
    function findTestFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
            findTestFiles(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.test.js') || entry.name.endsWith('.test.jsx'))) {
            testCount++;
          }
        }
      } catch {
        // Ігноруємо помилки доступу
      }
    }
    
    if (fileExists('src')) {
      findTestFiles('src');
    }
    
    log.info(`Знайдено ${testCount} тестових файлів`);
    
    if (testCount > 0) {
      testsFound = true;
    }
  } catch {
    log.warning('Не вдалося підрахувати тестові файли');
  }
  
  // Крок 4: ESLint (опціонально)
  log.step('4️⃣ Перевірка ESLint...');
  
  const eslintConfigExists = fileExists('eslint.config.js') || fileExists('.eslintrc.js') || fileExists('.eslintrc.json');
  
  if (eslintConfigExists) {
    log.info('ESLint конфігурацію знайдено, запускаємо перевірку...');
    
    const lintResult = runCommand('npm run lint', 'ESLint перевірка');
    
    if (!lintResult.success) {
      log.error('ESLint знайшов проблеми в коді!');
      console.log('\n💡 Щоб виправити автоматично: npm run lint:fix');
      console.log('💡 Щоб пропустити ESLint та продовжити: натисніть Enter');
      
      const answer = await askUser('\nПродовжити попри помилки ESLint? (y/n): ');
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        log.error('Build скасовано через помилки ESLint');
        await askUser('Натисніть Enter щоб закрити...');
        process.exit(1);
      }
    } else {
      log.success('Код відповідає стандартам ESLint');
    }
  } else {
    log.info('ESLint не налаштований (це нормально)');
  }
  
  // Крок 5: Запуск тестів
  if (testsFound) {
    log.step('5️⃣ Запуск unit тестів...');
    
    // Спробуємо різні команди тестування
    const testCommands = [
      'npm run test:run',
      'npm run test -- --run',
      'npx vitest run',
      'npm test -- --run'
    ];
    
    let testResult = null;
    for (const command of testCommands) {
      log.info(`Пробуємо: ${command}`);
      testResult = runCommand(command, 'Unit тести');
      
      if (testResult.success) {
        break;
      }
    }
    
    if (!testResult || !testResult.success) {
      log.error('UNIT ТЕСТИ ПРОВАЛИЛИСЬ!');
      console.log('\n🚫 ЧОМУ BUILD ЗАБЛОКОВАНО:');
      console.log('   • У вашому коді є помилки які виявили тести');
      console.log('   • Завантаження поламаного коду на сервер = проблеми');
      console.log('   • Smart-build захищає production від багів');
      console.log('\n🛠️ ЩО РОБИТИ:');
      console.log('   1. Подивіться ВИЩЕ які саме тести провалились');
      console.log('   2. Запустіть: npm run test:watch для debugging');
      console.log('   3. Виправте код щоб тести проходили');
      console.log('   4. Запустіть цей скрипт знову');
      console.log('\n❌ BUILD СКАСОВАНО ДЛЯ БЕЗПЕКИ PRODUCTION');
      
      await askUser('Натисніть Enter щоб закрити...');
      process.exit(1);
    }
    
    log.success('Всі unit тести пройшли успішно! 🎉');
  } else {
    log.step('5️⃣ Тести...');
    log.warning('Тестові файли не знайдені, пропускаємо');
  }
  
  // Крок 6: Очищення dist
  log.step('6️⃣ Очищення попереднього build...');
  
  if (fileExists('dist')) {
    try {
      fs.rmSync('dist', { recursive: true, force: true });
      log.success('Попередній build очищено');
    } catch (error) {
      log.warning(`Не вдалося очистити dist: ${error.message}`);
    }
  }
  
  // Створюємо нову директорію dist
  try {
    fs.mkdirSync('dist', { recursive: true });
    log.success('Директорія dist створена');
  } catch (error) {
    log.warning(`Попередження при створенні dist: ${error.message}`);
  }
  
  // Крок 7: Build проекту
  log.step('7️⃣ Збірка проекту...');
  
  const buildResult = runCommand('npm run build', 'Збірка проекту');
  
  if (!buildResult.success) {
    log.error('BUILD ПРОВАЛИВСЯ!');
    console.log('\n🚫 МОЖЛИВІ ПРИЧИНИ:');
    console.log('   • Синтаксичні помилки в коді');
    console.log('   • Відсутні залежності (import/require)');
    console.log('   • Проблеми з конфігурацією Vite');
    console.log('\n🛠️ ДЕБАГІНГ:');
    console.log('   • Перевірте ВИЩЕ повідомлення про помилки');
    console.log('   • Запустіть: npm run dev - чи працює dev режим?');
    
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  
  log.success('Build завершено успішно');
  
  // Крок 8: Перевірка результату
  log.step('8️⃣ Перевірка результату...');
  
  if (!fileExists('dist/index.html')) {
    log.error('index.html не створився - поламаний build');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  
  if (!fileExists('dist/assets')) {
    log.error('Директорія assets не створилась');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  
  log.success('Build структура перевірена');
  
  // Статистика
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  const distSize = getDirectorySize('dist');
  const jsFiles = countFiles('dist', '.js');
  const cssFiles = countFiles('dist', '.css');
  const htmlFiles = countFiles('dist', '.html');
  
  // Фінальний звіт
  console.log('\n🎉 SMART BUILD ЗАВЕРШЕНО УСПІШНО!');
  console.log('=============================================');
  console.log('\n📊 СТАТИСТИКА BUILD:');
  console.log(`  ⏱️  Час виконання: ${duration}с`);
  console.log(`  📦 Загальний розмір: ${distSize}`);
  console.log(`  🟨 JavaScript файлів: ${jsFiles}`);
  console.log(`  🟦 CSS файлів: ${cssFiles}`);
  console.log(`  🟩 HTML файлів: ${htmlFiles}`);
  console.log('\n📁 РЕЗУЛЬТАТ:');
  console.log('  📂 Директорія: ./dist/');
  console.log('  📋 Вміст готовий для FileZilla upload');
  console.log('\n✅ Тести пройшли - код якісний');
  console.log('✅ Build успішний - файли готові');
  console.log('🌐 Можна завантажувати на сервер!');
  
  // Відкриваємо директорію dist
  console.log('\n💡 Відкриваємо папку dist для FileZilla...');
  openDirectory('dist');
  
  await askUser('\nНатисніть Enter щоб закрити...');
}

// Обробка помилок
process.on('uncaughtException', async (error) => {
  log.error(`Непередбачена помилка: ${error.message}`);
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  log.error(`Unhandled Rejection: ${reason}`);
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(1);
});

// Запуск
smartBuild().catch(async (error) => {
  log.error(`Помилка виконання: ${error.message}`);
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(1);
});